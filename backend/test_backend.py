import os
os.environ["TEST_MODE"] = "1"
import unittest
import json
import time
from starlette.testclient import TestClient
from backend.main import app
from backend.data.mock_data import reset_db
from backend.services.captcha_service import get_captcha_answer_for_test, _captcha_store
from backend.services.totp_service import get_current_totp

class TestFastApiBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        reset_db()
        cls.client = TestClient(app)

    def setUp(self):
        # Fresh db reset before each test if needed
        pass

    def get_valid_captcha(self):
        """
        Helper to fetch a fresh server-side challenge and retrieve the expected answer
        via the test-only helper. Plain answer is never in the public API response.
        """
        res = self.client.get("/api/auth/captcha")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("captchaId", data)
        self.assertIn("captchaImage", data)
        self.assertTrue(data["captchaImage"].startswith("data:image/svg+xml;base64,"))
        self.assertNotIn("code", data)
        self.assertNotIn("answer", data)
        answer = get_captcha_answer_for_test(data["captchaId"])
        return data["captchaId"], answer

    def login_token(self, role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026", two_factor=""):
        """
        Helper to obtain an authenticated JWT token using a fresh server CAPTCHA
        """
        cid, ans = self.get_valid_captcha()
        payload = {
            "role": role,
            "identifier": identifier,
            "password": password,
            "captchaId": cid,
            "captchaAnswer": ans
        }
        if role == "regulator" and not two_factor:
            payload["twoFactorCode"] = get_current_totp("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP")
        elif two_factor:
            payload["twoFactorCode"] = two_factor
        res = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(res.status_code, 200, f"Login failed for {role}: {res.json()}")
        return res.json()["token"]

    def create_paid_application(self, merch_token, payload):
        """
        Helper for test suites to initiate and confirm simulated payment before submitting an application.
        """
        init_res = self.client.post("/api/payments/initiate", json={
            "instrumentId": payload.get("instrumentId"),
            "instrumentCategory": payload.get("instrumentCategory"),
            "maxCapacityKg": payload.get("maxCapacityKg"),
            "accuracyClass": payload.get("accuracyClass"),
            "applicationType": payload.get("applicationType")
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(init_res.status_code, 201, f"Payment initiation failed: {init_res.json()}")
        payment_id = init_res.json()["id"]

        conf_res = self.client.post(
            f"/api/payments/{payment_id}/confirm",
            json={"simulateSuccess": True},
            headers={"Authorization": f"Bearer {merch_token}"}
        )
        self.assertEqual(conf_res.status_code, 200, f"Payment confirmation failed: {conf_res.json()}")

        app_body = {**payload, "paymentId": payment_id}
        app_res = self.client.post("/api/applications", json=app_body, headers={"Authorization": f"Bearer {merch_token}"})
        return app_res

    # ---------------- 1. Health & Public Directories ----------------
    def test_01_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ONLINE")
        self.assertIn("metrics", data)

    def test_02_jurisdictions(self):
        res = self.client.get("/api/jurisdictions")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(len(res.json()) > 0)

    def test_03_officers_sanitized(self):
        res = self.client.get("/api/officers")
        self.assertEqual(res.status_code, 200)
        officers = res.json()
        self.assertTrue(len(officers) > 0)
        for o in officers:
            self.assertNotIn("passwordHash", o)

    def test_04_gatc_centers_sanitized(self):
        res = self.client.get("/api/gatc-centers")
        self.assertEqual(res.status_code, 200)
        centers = res.json()
        self.assertTrue(len(centers) > 0)
        for g in centers:
            self.assertNotIn("passwordHash", g)

    def test_05_merchants_sanitized(self):
        res = self.client.get("/api/merchants")
        self.assertEqual(res.status_code, 200)
        merchants = res.json()
        self.assertTrue(len(merchants) > 0)
        for m in merchants:
            self.assertNotIn("passwordHash", m)

    # ---------------- 2. Server-Side CAPTCHA Security Suite ----------------
    def test_06_captcha_challenge_generation(self):
        res = self.client.get("/api/auth/captcha")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("captchaId", data)
        self.assertIn("captchaImage", data)
        self.assertTrue(data["captchaImage"].startswith("data:image/svg+xml;base64,"))
        # Crucial security check: answer must never be returned in API response
        self.assertNotIn("code", data)
        self.assertNotIn("answer", data)

    def test_07_login_missing_captcha_rejected_400(self):
        res = self.client.post("/api/auth/login", json={
            "role": "merchant",
            "identifier": "27AABCO1234F1Z8",
            "password": "Admin@1234"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("CAPTCHA", res.json().get("error", ""))

    def test_08_login_wrong_captcha_rejected_400(self):
        cid, _ = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "merchant",
            "identifier": "27AABCO1234F1Z8",
            "password": "Admin@1234",
            "captchaId": cid,
            "captchaAnswer": "WRONG"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid CAPTCHA", res.json().get("error", ""))

    def test_09_captcha_replay_prevention_fails_400(self):
        cid, ans = self.get_valid_captcha()
        # First login succeeds
        res1 = self.client.post("/api/auth/login", json={
            "role": "merchant",
            "identifier": "27AABCO1234F1Z8",
            "password": "Admin@1234",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res1.status_code, 200)

        # Second attempt using identical captchaId MUST fail (prevent reuse/replay)
        res2 = self.client.post("/api/auth/login", json={
            "role": "merchant",
            "identifier": "27AABCO1234F1Z8",
            "password": "Admin@1234",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn("consumed", res2.json().get("error", "").lower())

    def test_10_captcha_expired_fails_400(self):
        cid, ans = self.get_valid_captcha()
        # Artificially expire the challenge
        if cid in _captcha_store:
            _captcha_store[cid]["expiresAt"] = time.time() - 10

        res = self.client.post("/api/auth/login", json={
            "role": "merchant",
            "identifier": "27AABCO1234F1Z8",
            "password": "Admin@1234",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("expired", res.json().get("error", "").lower())

    def test_11_captcha_verify_endpoint(self):
        cid, ans = self.get_valid_captcha()
        # Verify endpoint success
        res = self.client.post("/api/auth/captcha/verify", json={
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

        # Re-verifying same challenge fails
        res_fail = self.client.post("/api/auth/captcha/verify", json={
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res_fail.status_code, 400)

    # ---------------- 3. Zero-Fallback & Bcrypt Authentication ----------------
    def test_12_merchant_unknown_identifier_rejected_401(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "merchant",
            "identifier": "FAKE-GSTIN-000",
            "password": "Admin@1234",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 401)
        data = res.json()
        self.assertIn("error", data)
        self.assertNotIn("token", data)

    def test_13_merchant_wrong_password_rejected_401(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "merchant",
            "identifier": "27AABCO1234F1Z8",
            "password": "WrongPassword#999",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 401)
        data = res.json()
        self.assertIn("error", data)
        self.assertNotIn("token", data)

    def test_14_merchant_valid_login_success(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "merchant",
            "identifier": "27AABCO1234F1Z8",
            "password": "Admin@1234",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertIn("token", data)
        self.assertEqual(data["user"]["role"], "merchant")
        self.assertNotIn("passwordHash", data.get("entity", {}))

    def test_15_inspector_unknown_badge_rejected_401(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "inspector",
            "identifier": "LMO-FAKE-999",
            "password": "GovOfficer#2026",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 401)

    def test_16_inspector_wrong_password_rejected_401(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "inspector",
            "identifier": "LMO-MH-042",
            "password": "BadOfficerPassword",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 401)

    def test_17_inspector_valid_login_success(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "inspector",
            "identifier": "LMO-MH-042",
            "password": "GovOfficer#2026",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["user"]["role"], "inspector")

    def test_18_gatc_unknown_recognition_rejected_401(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "gatc",
            "identifier": "FAKE-GATC-LAB",
            "password": "GatcSecure@Lab",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 401)

    def test_19_gatc_wrong_password_rejected_401(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "gatc",
            "identifier": "GOI-GATC-W-2021-009",
            "password": "WrongPassword",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 401)

    def test_20_gatc_valid_login_success(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "gatc",
            "identifier": "GOI-GATC-W-2021-009",
            "password": "GatcSecure@Lab",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["user"]["role"], "gatc")

    def test_21_regulator_unknown_id_rejected_401(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "regulator",
            "identifier": "FAKE-ADMIN",
            "password": "SuperGov#Admin2026",
            "twoFactorCode": "123456",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 401)

    def test_22_regulator_wrong_password_rejected_401(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "regulator",
            "identifier": "GOI-ADM-001",
            "password": "WrongPassword",
            "twoFactorCode": "123456",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 401)

    def test_23_regulator_wrong_2fa_rejected_401(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "regulator",
            "identifier": "GOI-ADM-001",
            "password": "SuperGov#Admin2026",
            "twoFactorCode": "000000",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 401)
        self.assertIn("Invalid 2FA security code", res.json().get("error", ""))

    def test_24_regulator_valid_direct_totp_success(self):
        totp = get_current_totp("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP")
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "regulator",
            "identifier": "GOI-ADM-001",
            "password": "SuperGov#Admin2026",
            "twoFactorCode": totp,
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["user"]["role"], "regulator")
        self.assertIn("token", data)
        # Ensure totpSecret is stripped
        self.assertNotIn("totpSecret", data.get("user", {}))
        self.assertNotIn("totpSecret", data.get("entity", {}))

    def test_24b_regulator_two_step_verification_flow(self):
        # Step 1: Login without 2FA code -> must require 2FA, return sessionToken, and withhold JWT
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "regulator",
            "identifier": "GOI-ADM-001",
            "password": "SuperGov#Admin2026",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("requires2FA"))
        self.assertIn("sessionToken", data)
        self.assertNotIn("token", data)
        session_token = data["sessionToken"]

        # Step 2 with incorrect code -> 401
        fail_res = self.client.post("/api/auth/2fa/verify", json={
            "sessionToken": session_token,
            "totpCode": "999999"
        })
        self.assertEqual(fail_res.status_code, 401)

        # Step 2 with valid TOTP code -> 200 with JWT
        totp = get_current_totp("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP")
        ok_res = self.client.post("/api/auth/2fa/verify", json={
            "sessionToken": session_token,
            "totpCode": totp
        })
        self.assertEqual(ok_res.status_code, 200)
        ok_data = ok_res.json()
        self.assertTrue(ok_data.get("success"))
        self.assertIn("token", ok_data)
        self.assertEqual(ok_data["user"]["role"], "regulator")
        self.assertNotIn("totpSecret", ok_data.get("user", {}))

        # Replay / reuse of sessionToken must fail
        replay_res = self.client.post("/api/auth/2fa/verify", json={
            "sessionToken": session_token,
            "totpCode": totp
        })
        self.assertEqual(replay_res.status_code, 401)

    def test_24c_regulator_demo_code_endpoint(self):
        # Fetch live demo code for regulator
        res = self.client.get("/api/auth/2fa/demo-code?identifier=GOI-ADM-001")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("mode"), "Demo 2FA")
        self.assertRegex(data.get("totpCode", ""), r"^\d{6}$")
        self.assertGreaterEqual(data.get("remainingSeconds", 0), 1)
        self.assertIn("label", data)

        # Unknown identifier -> 404
        bad_res = self.client.get("/api/auth/2fa/demo-code?identifier=NONEXISTENT")
        self.assertEqual(bad_res.status_code, 404)

    # ---------------- 4. OTP Generation, Expiry, and Replay Prevention ----------------
    def test_25_otp_lifecycle(self):
        phone = "+91 98888 77777"
        send_res = self.client.post("/api/auth/send-otp", json={"identifier": phone})
        self.assertEqual(send_res.status_code, 200)
        otp = send_res.json()["otp"]
        self.assertRegex(otp, r"^\d{6}$")

        # Wrong OTP fails (with valid CAPTCHA)
        cid1, ans1 = self.get_valid_captcha()
        fail_res = self.client.post("/api/auth/login", json={
            "role": "consumer",
            "identifier": phone,
            "otp": "000000",
            "captchaId": cid1,
            "captchaAnswer": ans1
        })
        self.assertEqual(fail_res.status_code, 401)

        # Correct OTP succeeds (with fresh valid CAPTCHA)
        cid2, ans2 = self.get_valid_captcha()
        ok_res = self.client.post("/api/auth/login", json={
            "role": "consumer",
            "identifier": phone,
            "otp": otp,
            "captchaId": cid2,
            "captchaAnswer": ans2
        })
        self.assertEqual(ok_res.status_code, 200)
        self.assertEqual(ok_res.json()["user"]["role"], "consumer")

        # Replay attack prevention: same OTP must fail
        cid3, ans3 = self.get_valid_captcha()
        replay_res = self.client.post("/api/auth/login", json={
            "role": "consumer",
            "identifier": phone,
            "otp": otp,
            "captchaId": cid3,
            "captchaAnswer": ans3
        })
        self.assertEqual(replay_res.status_code, 401)

    # ---------------- 5. Token Verification & /api/auth/me ----------------
    def test_26_auth_me_unauthorized(self):
        res = self.client.get("/api/auth/me")
        self.assertEqual(res.status_code, 401)

        res_bad = self.client.get("/api/auth/me", headers={"Authorization": "Bearer badtoken"})
        self.assertEqual(res_bad.status_code, 401)

    def test_27_auth_me_authorized(self):
        token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["user"]["role"], "merchant")

    # ---------------- 6. Strict Role-Based Access Control (RBAC) ----------------
    def test_28_rbac_protections(self):
        reg_token = self.login_token(role="regulator", identifier="GOI-ADM-001", password="SuperGov#Admin2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # 1. Regulator can access audit logs & stats
        self.assertEqual(self.client.get("/api/audit-logs", headers={"Authorization": f"Bearer {reg_token}"}).status_code, 200)
        self.assertEqual(self.client.get("/api/stats/regulator", headers={"Authorization": f"Bearer {reg_token}"}).status_code, 200)

        # 2. Merchant & Inspector CANNOT access audit logs or stats
        self.assertEqual(self.client.get("/api/audit-logs", headers={"Authorization": f"Bearer {merch_token}"}).status_code, 403)
        self.assertEqual(self.client.get("/api/stats/regulator", headers={"Authorization": f"Bearer {merch_token}"}).status_code, 403)
        self.assertEqual(self.client.get("/api/audit-logs", headers={"Authorization": f"Bearer {insp_token}"}).status_code, 403)

        # 3. Merchant cannot inspect application
        self.assertEqual(self.client.post("/api/applications/APP-2026-0901/inspect", json={"passedAllTests": True}, headers={"Authorization": f"Bearer {merch_token}"}).status_code, 403)

        # 4. Merchant only sees own instruments
        inst_res = self.client.get("/api/instruments", headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(inst_res.status_code, 200)
        for inst in inst_res.json():
            self.assertEqual(inst["merchantId"], "m-01")

        # 5. Merchant cannot access other merchant's instruments
        self.assertEqual(self.client.get("/api/instruments?merchantId=m-02", headers={"Authorization": f"Bearer {merch_token}"}).status_code, 403)
        self.assertEqual(self.client.get("/api/instruments/inst-004", headers={"Authorization": f"Bearer {merch_token}"}).status_code, 403)

    # ---------------- 7. Inspections & Digital Certificates ----------------
    def test_29_inspect_and_issue_certificate(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        inspect_res = self.client.post("/api/applications/APP-2026-0901/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.001
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "10% Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True},
                {"name": "50% Half Capacity", "loadKg": 15.0, "observedKg": 15.002, "mpeGrams": 4.0, "passed": True},
                {"name": "100% Max Capacity", "loadKg": 30.0, "observedKg": 30.003, "mpeGrams": 5.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO42-LS-1024",
            "hologramNo": "HOL-GOI-2026-902142",
            "remarks": "Tested with standard Class M1 calibrated test weights."
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "PASSED")
        self.assertIn("certificate", data)
        cert = data["certificate"]
        self.assertTrue(len(cert["cryptographicHash"]) > 16)
        self.assertIn("visualCheck", cert["inspectionObservations"])
        self.assertTrue(cert["inspectionObservations"]["visualCheck"]["enclosureIntact"])
        self.assertIn("repeatability", cert["inspectionObservations"])
        self.assertEqual(cert["inspectionObservations"]["repeatability"]["verdict"], "PASSED")
        self.assertEqual(cert["inspectionObservations"]["repeatability"]["readings"], [15.0, 15.001, 15.0])
        self.assertEqual(cert["inspectionObservations"]["repeatability"]["maxDifferenceGrams"], 1.0)
        self.assertIn("eccentricity", cert["inspectionObservations"])
        self.assertEqual(cert["inspectionObservations"]["eccentricity"]["verdict"], "PASSED")
        self.assertEqual(cert["inspectionObservations"]["eccentricity"]["readings"]["cornerA"], 10.0)
        self.assertEqual(cert["inspectionObservations"]["eccentricity"]["maxErrorGrams"], 1.0)

        # Public lookup by certificate number
        pub_res = self.client.get(f"/api/certificates/{cert['certificateNumber']}")
        self.assertEqual(pub_res.status_code, 200)
        self.assertTrue(pub_res.json()["valid"])

        # QR verification
        qr_res = self.client.post("/api/certificates/verify-qr", json={"qrPayload": cert["certificateNumber"]})
        self.assertEqual(qr_res.status_code, 200)
        self.assertTrue(qr_res.json()["verified"])

    def test_29b_inspect_rejected_when_visual_check_fails(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # Client sends visualCheck with enclosureIntact: False
        inspect_res = self.client.post("/api/applications/APP-2026-0899/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": False,
            "visualCheck": {
                "enclosureIntact": False,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.001
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111",
            "remarks": "Housing damaged"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        self.assertTrue(any("visual" in r.lower() or "enclosure" in r.lower() for r in data["reasons"]))

    def test_29c_inspect_rejected_when_repeatability_fails(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # Create fresh application within inspector's jurisdiction
        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-REP-FAIL-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        # Client sends repeatability readings with variance (30g) exceeding statutory MPE limit (4g)
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.030, 15.000],
                "maxDifferenceGrams": 30.0,
                "mpeGrams": 4.0,
                "passed": False
            },
            "repeatabilityPassed": False,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.001
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        self.assertTrue(any("repeatability" in r.lower() for r in data["reasons"]))
        self.assertTrue(any("exceeded statutory mpe" in r.lower() for r in data["reasons"]))

    def test_29d_inspect_rejected_when_eccentricity_fails(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # Create a fresh application for this test
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")
        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-ECC-FAIL-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        # Client sends eccentricity corner readings with error (35g on Corner B) exceeding statutory MPE limit (4g)
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.035,
                    "cornerC": 10.000,
                    "cornerD": 10.000
                },
                "maxErrorGrams": 35.0,
                "mpeGrams": 4.0,
                "passed": False
            },
            "eccentricityPassed": False,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        self.assertTrue(any("eccentricity" in r.lower() for r in data["reasons"]))
        self.assertTrue(any("corner bias error" in r.lower() for r in data["reasons"]))

    def test_29e_inspect_rejected_when_test_load_exceeds_mpe(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")
        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-MPE-FAIL-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        # Client claims passedAllTests: True and passed: True, but observedKg has error 25g exceeding MPE of 5g
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.001
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True},
                {"name": "Max Load", "loadKg": 30.0, "observedKg": 30.025, "mpeGrams": 5.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        self.assertTrue(any("exceeded statutory tolerance" in r.lower() for r in data["reasons"]))

    def test_29f_inspect_explicit_officer_rejection(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")
        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-REJECT-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": False,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.001
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "remarks": "Fraudulent seal detected on load cell."
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")

    def test_29g_prevent_direct_put_application_bypass(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # Attempt to bypass inspection and mark VERIFIED_STAMPED directly
        put_res = self.client.put("/api/applications/APP-2026-0901", json={
            "status": "VERIFIED_STAMPED"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(put_res.status_code, 400)
        err_msg = put_res.json().get("error") or put_res.json().get("detail", "")
        self.assertIn("cannot be assigned via direct update", err_msg)

    def test_29h_inspect_rejected_when_visual_check_missing(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")
        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-VIS-MISSING",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        # Crafted API request tries to claim passedAllTests: True and visualInspectionPassed: True without sending visualCheck
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            # visualCheck is omitted!
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.001
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        self.assertTrue(any("visual inspection checklist data is missing" in r.lower() for r in data["reasons"]))

    def test_29i_inspect_rejected_when_visual_check_incomplete(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")
        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-VIS-INCOMPLETE",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        # Crafted request sends incomplete visualCheck (missing modelApprovalPlatePresent and environmentalCheckPassed)
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.001
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        self.assertTrue(any("mandatory visual check missing" in r.lower() for r in data["reasons"]))

    def test_29j_inspect_rejected_when_any_mandatory_visual_check_fails(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # Test each mandatory visual check failing individually
        visual_checks_to_test = [
            ("levelingCentered", "spirit level"),
            ("modelApprovalPlatePresent", "central model approval plate"),
            ("environmentalCheckPassed", "environmental")
        ]

        for check_key, expected_substring in visual_checks_to_test:
            app_res = self.create_paid_application(merch_token, {
                "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
                "brand": "Essae",
                "model": "DS-252",
                "serialNumber": f"SN-VIS-{check_key}",
                "maxCapacityKg": 30,
                "accuracyClass": "Class III"
            })
            app_id = app_res.json()["id"]

            v_check = {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            }
            v_check[check_key] = False

            inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
                "passedAllTests": True,
                "visualInspectionPassed": True,  # Attacking by claiming True
                "visualCheck": v_check,
                "repeatability": {
                    "loadKg": 15.0,
                    "readings": [15.000, 15.001, 15.000],
                    "maxDifferenceGrams": 1.0,
                    "mpeGrams": 4.0,
                    "passed": True
                },
                "repeatabilityPassed": True,
                "eccentricity": {
                    "loadKg": 10.0,
                    "readings": {
                        "cornerA": 10.000,
                        "cornerB": 10.001,
                        "cornerC": 10.000,
                        "cornerD": 10.001
                    },
                    "maxErrorGrams": 1.0,
                    "mpeGrams": 4.0,
                    "passed": True
                },
                "eccentricityPassed": True,
                "testLoads": [
                    {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
                ],
                "leadSealNo": "MH-LMO-LS-1111",
                "hologramNo": "HOL-GOI-2026-111111"
            }, headers={"Authorization": f"Bearer {insp_token}"})

            self.assertEqual(inspect_res.status_code, 200)
            data = inspect_res.json()
            self.assertEqual(data["verdict"], "FAILED")
            self.assertNotIn("certificate", data)
            self.assertEqual(data["application"]["status"], "REJECTED")
            self.assertTrue(any(expected_substring in r.lower() for r in data["reasons"]))

    def test_29k_inspect_rejected_when_repeatability_readings_missing_on_approval(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-REP-MISSING-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        # Attacker sends passedAllTests: True and repeatabilityPassed: True without repeatability measurements object
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            # repeatability object omitted!
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.001
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        self.assertTrue(any("mandatory" in r.lower() and "repeatability" in r.lower() for r in data["reasons"]))

    def test_29l_inspect_rejected_repeatability_tamper_attempt(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-REP-TAMPER-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        # Attacker crafts client payload claiming passed: True and maxDifferenceGrams: 0.5,
        # but readings show actual difference of 50 grams (15.050 - 15.000 = 50g), which exceeds MPE (4g)
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.050, 15.000],
                "maxDifferenceGrams": 0.5,  # Faked client value
                "mpeGrams": 4.0,
                "passed": True  # Faked client value
            },
            "repeatabilityPassed": True,  # Faked client value
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.001
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        # Server must have caught the 50g variance and overridden the client's false PASS
        self.assertTrue(any("exceeded statutory mpe" in r.lower() for r in data["reasons"]))
        self.assertEqual(data["application"]["inspectionObservations"]["repeatability"]["verdict"], "FAILED")
        self.assertEqual(data["application"]["inspectionObservations"]["repeatability"]["maxDifferenceGrams"], 50.0)

    def test_29m_inspect_rejected_when_repeatability_reading_count_invalid(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-REP-COUNT-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        # Only 2 readings provided instead of required 3
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001],
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.001
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertTrue(any("exactly 3 recorded measurements" in r.lower() for r in data["reasons"]))

    def test_29n_inspect_rejected_when_repeatability_readings_non_numeric(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-REP-NONNUM-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, "corrupted_reading", 15.000],
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.001
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertTrue(any("invalid numeric values" in r.lower() for r in data["reasons"]))

    def test_29o_inspect_rejected_when_eccentricity_readings_missing_on_approval(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-ECC-MISSING-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        # Attacker sends passedAllTests: True and eccentricityPassed: True without eccentricity measurements object
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            # eccentricity object omitted!
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        self.assertTrue(any("mandatory" in r.lower() and "eccentricity" in r.lower() for r in data["reasons"]))

    def test_29p_inspect_rejected_eccentricity_tamper_attempt(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-ECC-TAMPER-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        # Attacker crafts client payload claiming passed: True and maxErrorGrams: 0.5,
        # but Corner B has reading 10.050 kg for a 10 kg load (error = 50g), which exceeds MPE (4g)
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.050,  # 50g error
                    "cornerC": 10.000,
                    "cornerD": 10.000
                },
                "maxErrorGrams": 0.5,  # Faked client value
                "mpeGrams": 4.0,
                "passed": True  # Faked client value
            },
            "eccentricityPassed": True,  # Faked client value
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        # Server must have caught the 50g corner bias and overridden the client's false PASS
        self.assertTrue(any("corner bias error" in r.lower() for r in data["reasons"]))
        self.assertEqual(data["application"]["inspectionObservations"]["eccentricity"]["verdict"], "FAILED")
        self.assertEqual(data["application"]["inspectionObservations"]["eccentricity"]["maxErrorGrams"], 50.0)

    def test_29q_inspect_rejected_when_eccentricity_corners_incomplete(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-ECC-INCOMPLETE-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        # Only corners A, B, C provided, corner D missing
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000
                    # cornerD missing!
                },
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertTrue(any("exactly 4 recorded corner measurements" in r.lower() for r in data["reasons"]))

    def test_29r_inspect_rejected_when_eccentricity_readings_non_numeric(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-ECC-NONNUM-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        app_id = app_res.json()["id"]

        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": "invalid_reading",
                    "cornerC": 10.000,
                    "cornerD": 10.000
                },
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertTrue(any("invalid numeric values" in r.lower() for r in data["reasons"]))

    # ---------------- 8. Statutory Calculators ----------------
    def test_30_fee_and_mpe_calculators(self):
        fee_res = self.client.post("/api/calculate-fee", json={
            "category": "Electronic Weighing Scale (Counter/Tabletop)",
            "capacityKg": 30
        })
        self.assertEqual(fee_res.status_code, 200)
        self.assertEqual(fee_res.json()["totalFee"], 300)

        mpe_res = self.client.post("/api/calculate-mpe", json={
            "accuracyClass": "Class III",
            "verificationInterval_e": 5,
            "testLoad": 5000,
            "observedReading": 5002
        })
        self.assertEqual(mpe_res.status_code, 200)
        self.assertTrue(mpe_res.json()["passed"])

    # ---------------- 9. Complete Multi-Role Workflows ----------------
    def test_31_create_instrument_and_application(self):
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # Create instrument
        inst_res = self.client.post("/api/instruments", json={
            "category": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Avery Weigh-Tronix",
            "model": "ZK830",
            "serialNumber": "SN-E2E-TEST-001",
            "maxCapacityKg": 15,
            "accuracyClass": "Class III"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(inst_res.status_code, 201)
        inst_data = inst_res.json()
        self.assertEqual(inst_data["status"], "PENDING_INSPECTION")

        # Create application for instrument
        app_res = self.create_paid_application(merch_token, {
            "instrumentId": inst_data["id"],
            "instrumentCategory": inst_data["category"],
            "brand": inst_data["brand"],
            "model": inst_data["model"],
            "serialNumber": inst_data["serialNumber"],
            "maxCapacityKg": inst_data["maxCapacityKg"],
            "accuracyClass": inst_data["accuracyClass"]
        })
        self.assertEqual(app_res.status_code, 201)
        app_data = app_res.json()
        self.assertEqual(app_data["status"], "UNDER_REVIEW")
        self.assertEqual(app_data["paymentStatus"], "PAID")

    def test_32_grievance_workflow(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # Public citizen files grievance
        grv_res = self.client.post("/api/grievances", json={
            "complainantName": "Concerned Citizen",
            "complainantPhone": "+91 99999 88888",
            "merchantName": "Local Grocery Store",
            "district": "Mumbai Suburban",
            "state": "Maharashtra",
            "complaintType": "Short Measure / Underweight",
            "description": "Observed 100g shortfall on 1kg rice purchase."
        })
        self.assertEqual(grv_res.status_code, 201)
        grv = grv_res.json()
        self.assertEqual(grv["status"], "INSPECTOR_ASSIGNED")

        # Inspector updates grievance
        upd_res = self.client.put(f"/api/grievances/{grv['id']}", json={
            "status": "INVESTIGATING",
            "officerRemarks": "Notice issued under section 24. Premise inspection scheduled."
        }, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(upd_res.status_code, 200)
        self.assertEqual(upd_res.json()["status"], "INVESTIGATING")

    def test_33_consumer_missing_otp_error(self):
        cid, ans = self.get_valid_captcha()
        res = self.client.post("/api/auth/login", json={
            "role": "consumer",
            "identifier": "+91 98200 99881",
            "otp": "",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_34_qr_verification_with_json_payload(self):
        json_payload = json.dumps({"cert": "MH/LM/2025/08492"})
        res = self.client.post("/api/certificates/verify-qr", json={"qrPayload": json_payload})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["verified"])

    # ---------------- 10. Government SSO (MeriPehchan / Jan Parichay) ----------------
    def test_35_sso_config_endpoint(self):
        res = self.client.get("/api/auth/sso/config")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("mode"), "Demo Simulation")
        self.assertEqual(data.get("label"), "SSO Integration — Demo Simulation")
        self.assertFalse(data.get("isLive"))
        self.assertIn("MeriPehchan", data.get("provider", ""))
        self.assertIn("endpoints", data)

    def test_36_sso_demo_simulation_inspector(self):
        res = self.client.post("/api/auth/sso/simulate", json={
            "role": "inspector",
            "identifier": "LMO-MH-042"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("mode"), "Demo Simulation")
        self.assertEqual(data.get("label"), "SSO Integration — Demo Simulation")
        self.assertIn("token", data)
        self.assertEqual(data["user"]["role"], "inspector")
        self.assertIn("simulatedOidcPayload", data)
        self.assertTrue(data["simulatedOidcPayload"].get("simulated"))

        # Issued JWT token must be valid for platform requests
        sso_token = data["token"]
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {sso_token}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["user"]["role"], "inspector")

        # RBAC is strictly maintained - inspector cannot access regulator stats
        stats_res = self.client.get("/api/stats/regulator", headers={"Authorization": f"Bearer {sso_token}"})
        self.assertEqual(stats_res.status_code, 403)

    def test_37_sso_demo_simulation_regulator_and_audit(self):
        res = self.client.post("/api/auth/sso/simulate", json={
            "role": "regulator",
            "identifier": "GOI-ADM-001"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["user"]["role"], "regulator")

        # Regulator can access audit logs
        reg_token = data["token"]
        audit_res = self.client.get("/api/audit-logs", headers={"Authorization": f"Bearer {reg_token}"})
        self.assertEqual(audit_res.status_code, 200)
        logs = audit_res.json()
        self.assertTrue(any(l.get("action") == "SSO_DEMO_AUTHENTICATION_EXCHANGE" for l in logs))

    def test_38_sso_authorize_unconfigured_501(self):
        res = self.client.get("/api/auth/sso/authorize")
        self.assertEqual(res.status_code, 501)
        self.assertIn("Demo Simulation", res.json().get("error", ""))

    # ---------------- 11. Session Management, Refresh Tokens & Revocation ----------------
    def test_39_refresh_token_lifecycle(self):
        cid, ans = self.get_valid_captcha()
        login_res = self.client.post("/api/auth/login", json={
            "role": "merchant",
            "identifier": "27AABCO1234F1Z8",
            "password": "Admin@1234",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(login_res.status_code, 200)
        login_data = login_res.json()
        self.assertIn("token", login_data)
        self.assertIn("refreshToken", login_data)
        refresh_token = login_data["refreshToken"]

        # Call refresh endpoint with valid refresh token
        ref_res = self.client.post("/api/auth/refresh", json={"refreshToken": refresh_token})
        self.assertEqual(ref_res.status_code, 200)
        ref_data = ref_res.json()
        self.assertTrue(ref_data.get("success"))
        self.assertIn("token", ref_data)
        self.assertEqual(ref_data["user"]["role"], "merchant")

        # Newly issued access token must work on authenticated endpoints
        new_token = ref_data["token"]
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_token}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["user"]["role"], "merchant")

        # Invalid refresh token fails with 401
        bad_ref = self.client.post("/api/auth/refresh", json={"refreshToken": "bad.refresh.token"})
        self.assertEqual(bad_ref.status_code, 401)

    def test_40_session_logout_and_revocation(self):
        cid, ans = self.get_valid_captcha()
        login_res = self.client.post("/api/auth/login", json={
            "role": "inspector",
            "identifier": "LMO-MH-042",
            "password": "GovOfficer#2026",
            "captchaId": cid,
            "captchaAnswer": ans
        })
        self.assertEqual(login_res.status_code, 200)
        token = login_res.json()["token"]
        refresh_token = login_res.json()["refreshToken"]

        # Token is valid initially
        me_ok = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_ok.status_code, 200)

        # Logout revokes session on server
        logout_res = self.client.post("/api/auth/logout", json={"refreshToken": refresh_token}, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(logout_res.status_code, 200)
        self.assertTrue(logout_res.json().get("success"))

        # Access token is now revoked and rejected with 401
        me_revoked = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_revoked.status_code, 401)

        # Refresh token is also revoked
        ref_revoked = self.client.post("/api/auth/refresh", json={"refreshToken": refresh_token})
        self.assertEqual(ref_revoked.status_code, 401)

    def test_41_guest_login_session(self):
        res = self.client.post("/api/auth/guest")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertIn("token", data)
        self.assertIn("refreshToken", data)
        self.assertEqual(data["user"]["role"], "consumer")

        # Guest token works on public authenticated routes
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {data['token']}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["user"]["role"], "consumer")

    def test_29r_inspect_rejects_when_test_loads_unmeasured_or_not_tested(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-UNMEASURED-LOADS",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        self.assertEqual(app_res.status_code, 201)
        app_id = app_res.json()["id"]

        # Attacker tries to approve verification with testLoads initialized as NOT_TESTED / empty readings
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.000
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min / 10% Load", "loadKg": 3.0, "observedKg": "", "mpeGrams": 2.0, "passed": None, "status": "NOT_TESTED"},
                {"name": "50% Half Load", "loadKg": 15.0, "observedKg": "", "mpeGrams": 4.0, "passed": None, "status": "NOT_TESTED"},
                {"name": "100% Max Load", "loadKg": 30.0, "observedKg": "", "mpeGrams": 5.0, "passed": None, "status": "NOT_TESTED"}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        self.assertTrue(any("not tested" in r.lower() for r in data["reasons"]))

    def test_29s_inspect_rejects_when_test_loads_has_passed_true_with_none_reading(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-FAKED-PASS-NULL-OBS",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        self.assertEqual(app_res.status_code, 201)
        app_id = app_res.json()["id"]

        # Client sends passed: True but observedKg: None
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.000
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": None, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        self.assertTrue(any("not tested" in r.lower() or "actual observed measurement" in r.lower() for r in data["reasons"]))

    def test_29t_inspect_rejects_when_repeatability_or_eccentricity_unmeasured(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-UNMEASURED-REP-ECC",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        self.assertEqual(app_res.status_code, 201)
        app_id = app_res.json()["id"]

        # Submits empty repeatability readings ["", "", ""]
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": ["", "", ""],
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": "",
                    "cornerB": "",
                    "cornerC": "",
                    "cornerD": ""
                },
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertNotIn("certificate", data)
        self.assertEqual(data["application"]["status"], "REJECTED")
        self.assertTrue(any("repeatability" in r.lower() and "not tested" in r.lower() for r in data["reasons"]))
        self.assertTrue(any("eccentricity" in r.lower() and "not tested" in r.lower() for r in data["reasons"]))

    def test_29u_inspect_succeeds_when_all_measurements_properly_entered_and_within_mpe(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-FULL-VALID-INSPECTION",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        self.assertEqual(app_res.status_code, 201)
        app_id = app_res.json()["id"]

        # All tests genuinely conducted, observed readings entered, all within statutory MPE
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.001, 15.000],
                "maxDifferenceGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.001,
                    "cornerC": 10.000,
                    "cornerD": 10.000
                },
                "maxErrorGrams": 1.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min / 10% Load", "loadKg": 3.0, "observedKg": 3.001, "mpeGrams": 2.0, "passed": True, "status": "PASSED"},
                {"name": "50% Half Load", "loadKg": 15.0, "observedKg": 15.001, "mpeGrams": 4.0, "passed": True, "status": "PASSED"},
                {"name": "100% Max Load", "loadKg": 30.0, "observedKg": 30.002, "mpeGrams": 6.0, "passed": True, "status": "PASSED"}
            ],
            "leadSealNo": "MH-LMO-LS-9999",
            "hologramNo": "HOL-GOI-2026-999999",
            "remarks": "Standard verification conducted in accordance with Legal Metrology General Rules 2011."
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        self.assertEqual(data["verdict"], "PASSED")
        self.assertIn("certificate", data)
        self.assertEqual(data["application"]["status"], "VERIFIED_STAMPED")
        cert = data["certificate"]
        self.assertIn("/LM/", cert["certificateNumber"])
        self.assertEqual(len(cert["inspectionObservations"]["testLoadObservations"]), 3)
        self.assertIn("cryptographicHash", cert)

    # ---------------- 15. Physical Seal Inventory & Security Assignment ----------------
    def test_56_seal_inventory_endpoint(self):
        insp_token = self.login_token("inspector", "LMO-MH-042", "GovOfficer#2026")
        merch_token = self.login_token("merchant", "27AABCO1234F1Z8", "Admin@1234")

        # Merchants cannot view official seal inventory
        merch_res = self.client.get("/api/seals/inventory", headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(merch_res.status_code, 403)

        # Inspector can view official seal inventory
        insp_res = self.client.get("/api/seals/inventory", headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(insp_res.status_code, 200)
        data = insp_res.json()
        self.assertIn("total", data)
        self.assertIn("seals", data)
        self.assertGreater(data["total"], 0)

        # Filter by sealType
        lead_res = self.client.get("/api/seals/inventory?sealType=LEAD_WIRE_SEAL", headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(lead_res.status_code, 200)
        lead_data = lead_res.json()
        self.assertTrue(all(s["sealType"] == "LEAD_WIRE_SEAL" for s in lead_data["seals"]))

        # Filter by status
        avail_res = self.client.get("/api/seals/inventory?status=AVAILABLE", headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(avail_res.status_code, 200)
        avail_data = avail_res.json()
        self.assertTrue(all(s["status"] == "AVAILABLE" for s in avail_data["seals"]))

    def test_57_seal_validation_endpoint(self):
        insp_token = self.login_token("inspector", "LMO-MH-042", "GovOfficer#2026")

        # Valid lead wire seal in inventory
        v1 = self.client.post("/api/seals/validate", json={
            "sealNumber": "MH-LMO-LS-4201",
            "sealType": "LEAD_WIRE_SEAL"
        }, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(v1.status_code, 200)
        self.assertTrue(v1.json()["valid"])
        self.assertIn("seal", v1.json())

        # Valid hologram in inventory
        v2 = self.client.post("/api/seals/validate", json={
            "sealNumber": "HOL-GOI-2026-4201",
            "sealType": "HOLOGRAM_STICKER"
        }, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(v2.status_code, 200)
        self.assertTrue(v2.json()["valid"])

        # Fabricated seal not in inventory
        v3 = self.client.post("/api/seals/validate", json={
            "sealNumber": "FABRICATED-SEAL-9999",
            "sealType": "LEAD_WIRE_SEAL"
        }, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(v3.status_code, 200)
        self.assertFalse(v3.json()["valid"])
        self.assertIn("not recognized", v3.json()["error"])

        # Mismatched seal type
        v4 = self.client.post("/api/seals/validate", json={
            "sealNumber": "MH-LMO-LS-4201",
            "sealType": "HOLOGRAM_STICKER"
        }, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(v4.status_code, 200)
        self.assertFalse(v4.json()["valid"])
        self.assertIn("not HOLOGRAM_STICKER", v4.json()["error"])

        # Already assigned seal
        v5 = self.client.post("/api/seals/validate", json={
            "sealNumber": "MH-LMO42-LS-8921",
            "sealType": "LEAD_WIRE_SEAL"
        }, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(v5.status_code, 200)
        self.assertFalse(v5.json()["valid"])
        self.assertIn("already been affixed", v5.json()["error"])

        # Defective seal
        v6 = self.client.post("/api/seals/validate", json={
            "sealNumber": "MH-LMO-LS-DEFECT-01",
            "sealType": "LEAD_WIRE_SEAL"
        }, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(v6.status_code, 200)
        self.assertFalse(v6.json()["valid"])
        self.assertIn("DEFECTIVE", v6.json()["error"])

        # Revoked seal
        v7 = self.client.post("/api/seals/validate", json={
            "sealNumber": "MH-LMO-LS-REVOKED-01",
            "sealType": "LEAD_WIRE_SEAL"
        }, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(v7.status_code, 200)
        self.assertFalse(v7.json()["valid"])
        self.assertIn("REVOKED", v7.json()["error"])

    def test_58_inspect_rejects_unregistered_or_invalid_seals(self):
        merch_token = self.login_token("merchant", "27AABCO1234F1Z8", "Admin@1234")
        insp_token = self.login_token("inspector", "LMO-MH-042", "GovOfficer#2026")

        # Create application
        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-SEAL-VALIDATION-TEST",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        self.assertEqual(app_res.status_code, 201)
        app_id = app_res.json()["id"]

        base_valid_inspection = {
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.000, 15.000],
                "maxDifferenceGrams": 0.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.000,
                    "cornerC": 10.000,
                    "cornerD": 10.000
                },
                "maxErrorGrams": 0.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min / 10% Load", "loadKg": 3.0, "observedKg": 3.000, "mpeGrams": 2.0, "passed": True, "status": "PASSED"},
                {"name": "50% Half Load", "loadKg": 15.0, "observedKg": 15.000, "mpeGrams": 4.0, "passed": True, "status": "PASSED"},
                {"name": "100% Max Load", "loadKg": 30.0, "observedKg": 30.000, "mpeGrams": 6.0, "passed": True, "status": "PASSED"}
            ]
        }

        # Case 1: Fabricated lead seal
        p1 = dict(base_valid_inspection, leadSealNo="FAKE-LEAD-SEAL-001", hologramNo="HOL-GOI-2026-4203")
        r1 = self.client.post(f"/api/applications/{app_id}/inspect", json=p1, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.json()["verdict"], "FAILED")
        self.assertNotIn("certificate", r1.json())
        self.assertTrue(any("not recognized" in reason.lower() for reason in r1.json()["reasons"]))

        # Case 2: Already assigned seal
        p2 = dict(base_valid_inspection, leadSealNo="MH-LMO42-LS-8921", hologramNo="HOL-GOI-2026-4203")
        r2 = self.client.post(f"/api/applications/{app_id}/inspect", json=p2, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["verdict"], "FAILED")
        self.assertNotIn("certificate", r2.json())
        self.assertTrue(any("already been affixed" in reason.lower() for reason in r2.json()["reasons"]))

        # Case 3: Defective seal
        p3 = dict(base_valid_inspection, leadSealNo="MH-LMO-LS-DEFECT-01", hologramNo="HOL-GOI-2026-4203")
        r3 = self.client.post(f"/api/applications/{app_id}/inspect", json=p3, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(r3.status_code, 200)
        self.assertEqual(r3.json()["verdict"], "FAILED")
        self.assertNotIn("certificate", r3.json())
        self.assertTrue(any("defective" in reason.lower() for reason in r3.json()["reasons"]))

        # Case 4: Fabricated hologram
        p4 = dict(base_valid_inspection, leadSealNo="MH-LMO-LS-4203", hologramNo="FAKE-HOLOGRAM-999")
        r4 = self.client.post(f"/api/applications/{app_id}/inspect", json=p4, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(r4.status_code, 200)
        self.assertEqual(r4.json()["verdict"], "FAILED")
        self.assertNotIn("certificate", r4.json())
        self.assertTrue(any("not recognized" in reason.lower() for reason in r4.json()["reasons"]))

    def test_59_inspect_assigns_and_locks_seals(self):
        merch_token = self.login_token("merchant", "27AABCO1234F1Z8", "Admin@1234")
        insp_token = self.login_token("inspector", "LMO-MH-042", "GovOfficer#2026")

        # Create application
        app_res = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-SEAL-LOCKING-SUCCESS",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })
        self.assertEqual(app_res.status_code, 201)
        app_id = app_res.json()["id"]

        lead_num = "MH-LMO-LS-4205"
        holo_num = "HOL-GOI-2026-4205"

        # Verify initial available status
        v_pre = self.client.post("/api/seals/validate", json={"sealNumber": lead_num, "sealType": "LEAD_WIRE_SEAL"}, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertTrue(v_pre.json()["valid"])

        # Successful inspection with available seals
        inspect_res = self.client.post(f"/api/applications/{app_id}/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 15.0,
                "readings": [15.000, 15.000, 15.000],
                "maxDifferenceGrams": 0.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 10.0,
                "readings": {
                    "cornerA": 10.000,
                    "cornerB": 10.000,
                    "cornerC": 10.000,
                    "cornerD": 10.000
                },
                "maxErrorGrams": 0.0,
                "mpeGrams": 4.0,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min / 10% Load", "loadKg": 3.0, "observedKg": 3.000, "mpeGrams": 2.0, "passed": True, "status": "PASSED"},
                {"name": "50% Half Load", "loadKg": 15.0, "observedKg": 15.000, "mpeGrams": 4.0, "passed": True, "status": "PASSED"},
                {"name": "100% Max Load", "loadKg": 30.0, "observedKg": 30.000, "mpeGrams": 6.0, "passed": True, "status": "PASSED"}
            ],
            "leadSealNo": lead_num,
            "hologramNo": holo_num,
            "remarks": "Assigned official physical seals."
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(inspect_res.status_code, 200)
        data = inspect_res.json()
        cert = data["certificate"]
        self.assertEqual(cert["leadSealNo"], lead_num)
        self.assertEqual(cert["hologramNo"], holo_num)
        self.assertIn("assignedSeals", cert)
        self.assertEqual(cert["assignedSeals"]["leadSeal"]["sealNumber"], lead_num)
        self.assertEqual(cert["assignedSeals"]["hologram"]["sealNumber"], holo_num)

        # After approval, seals must be locked as ASSIGNED
        v_post = self.client.post("/api/seals/validate", json={"sealNumber": lead_num, "sealType": "LEAD_WIRE_SEAL"}, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertFalse(v_post.json()["valid"])
        self.assertIn("already been affixed", v_post.json()["error"])

        v_holo_post = self.client.post("/api/seals/validate", json={"sealNumber": holo_num, "sealType": "HOLOGRAM_STICKER"}, headers={"Authorization": f"Bearer {insp_token}"})
        self.assertFalse(v_holo_post.json()["valid"])
        self.assertIn("already been affixed", v_holo_post.json()["error"])

    # ---------------- 16. GATC Verification Workflow & Center Authorization ----------------
    def test_60_gatc_unauthorized_center_rejected(self):
        # Technician from GATC-01 (Apex Metrology, gatc-01) logs in
        gatc1_token = self.login_token("gatc", "GOI-GATC-W-2021-009", "GatcSecure@Lab")

        # Attempt to submit calibration report claiming to be from GATC-02 (gatc-02)
        res = self.client.post("/api/gatc/test-report", json={
            "gatcCenterId": "gatc-02",
            "instrumentId": "inst-007",
            "serialNumber": "ESH-2022-00412",
            "technicianName": "Er. Imposter",
            "loadTrials": [
                {"name": "10T Nominal", "loadTonnes": 10, "observedTonnes": 10.005, "status": "PASSED"},
                {"name": "30T Half", "loadTonnes": 30, "observedTonnes": 30.010, "status": "PASSED"},
                {"name": "60T Max", "loadTonnes": 60, "observedTonnes": 60.015, "status": "PASSED"}
            ],
            "repeatability": {
                "loadTonnes": 30,
                "readings": [30.000, 30.005, 30.002]
            },
            "eccentricity": {
                "loadTonnes": 20,
                "readings": {"cornerA": 20.005, "cornerB": 20.003, "cornerC": 20.006, "cornerD": 20.004}
            },
            "passedAllTests": True
        }, headers={"Authorization": f"Bearer {gatc1_token}"})

        # Must reject with 403 Forbidden
        self.assertEqual(res.status_code, 403)
        self.assertIn("Unauthorized", res.json().get("error", ""))

    def test_61_gatc_incomplete_or_not_tested_rejected(self):
        gatc1_token = self.login_token("gatc", "GOI-GATC-W-2021-009", "GatcSecure@Lab")

        # Missing observed value in load stage 2
        res1 = self.client.post("/api/gatc/test-report", json={
            "instrumentId": "inst-007",
            "loadTrials": [
                {"name": "10T Nominal", "loadTonnes": 10, "observedTonnes": 10.005, "status": "PASSED"},
                {"name": "30T Half", "loadTonnes": 30, "observedTonnes": "", "status": "NOT_TESTED"},
                {"name": "60T Max", "loadTonnes": 60, "observedTonnes": 60.015, "status": "PASSED"}
            ],
            "repeatability": {
                "loadTonnes": 30,
                "readings": [30.000, 30.005, 30.002]
            },
            "eccentricity": {
                "loadTonnes": 20,
                "readings": {"cornerA": 20.005, "cornerB": 20.003, "cornerC": 20.006, "cornerD": 20.004}
            },
            "passedAllTests": True
        }, headers={"Authorization": f"Bearer {gatc1_token}"})
        self.assertEqual(res1.status_code, 400)
        self.assertIn("Not Tested", res1.json().get("error", ""))

        # Missing corner reading in eccentricity
        res2 = self.client.post("/api/gatc/test-report", json={
            "instrumentId": "inst-007",
            "loadTrials": [
                {"name": "10T Nominal", "loadTonnes": 10, "observedTonnes": 10.005, "status": "PASSED"},
                {"name": "30T Half", "loadTonnes": 30, "observedTonnes": 30.010, "status": "PASSED"}
            ],
            "repeatability": {
                "loadTonnes": 30,
                "readings": [30.000, 30.005, 30.002]
            },
            "eccentricity": {
                "loadTonnes": 20,
                "readings": {"cornerA": 20.005, "cornerB": "", "cornerC": 20.006, "cornerD": 20.004}
            },
            "passedAllTests": True
        }, headers={"Authorization": f"Bearer {gatc1_token}"})
        self.assertEqual(res2.status_code, 400)
        self.assertIn("Not Tested", res2.json().get("error", ""))

    def test_62_gatc_failed_measurement_recalculated_server_side(self):
        gatc1_token = self.login_token("gatc", "GOI-GATC-W-2021-009", "GatcSecure@Lab")

        # Error on 10T is +80kg (observed 10.080T vs standard 10.000T, statutory MPE is 20kg)
        # Client tries to claim passedAllTests: True
        bad_res = self.client.post("/api/gatc/test-report", json={
            "instrumentId": "inst-007",
            "loadTrials": [
                {"name": "10T Nominal", "loadTonnes": 10, "observedTonnes": 10.080, "status": "PASSED"},
                {"name": "30T Half", "loadTonnes": 30, "observedTonnes": 30.010, "status": "PASSED"},
                {"name": "60T Max", "loadTonnes": 60, "observedTonnes": 60.015, "status": "PASSED"}
            ],
            "repeatability": {
                "loadTonnes": 30,
                "readings": [30.000, 30.005, 30.002]
            },
            "eccentricity": {
                "loadTonnes": 20,
                "readings": {"cornerA": 20.005, "cornerB": 20.003, "cornerC": 20.006, "cornerD": 20.004}
            },
            "passedAllTests": True
        }, headers={"Authorization": f"Bearer {gatc1_token}"})

        # Server recalculation detects error > tolerance, rejects false PASS with 400
        self.assertEqual(bad_res.status_code, 400)
        self.assertIn("failed statutory recalculation", bad_res.json().get("error", "").lower())

        # Submitting failure as a non-conformance notice succeeds with overallVerdict FAILED
        fail_res = self.client.post("/api/gatc/test-report", json={
            "instrumentId": "inst-007",
            "loadTrials": [
                {"name": "10T Nominal", "loadTonnes": 10, "observedTonnes": 10.080, "status": "FAILED"},
                {"name": "30T Half", "loadTonnes": 30, "observedTonnes": 30.010, "status": "PASSED"},
                {"name": "60T Max", "loadTonnes": 60, "observedTonnes": 60.015, "status": "PASSED"}
            ],
            "repeatability": {
                "loadTonnes": 30,
                "readings": [30.000, 30.005, 30.002]
            },
            "eccentricity": {
                "loadTonnes": 20,
                "readings": {"cornerA": 20.005, "cornerB": 20.003, "cornerC": 20.006, "cornerD": 20.004}
            },
            "passedAllTests": False
        }, headers={"Authorization": f"Bearer {gatc1_token}"})

        self.assertEqual(fail_res.status_code, 200)
        data = fail_res.json()
        self.assertEqual(data["verdict"], "FAILED")
        self.assertFalse(data["passedAllTests"])
        self.assertEqual(data["instrument"]["gatcStatus"], "CALIBRATION_FAILED")

    def test_63_gatc_passed_measurement_succeeds_and_stores_record(self):
        gatc1_token = self.login_token("gatc", "GOI-GATC-W-2021-009", "GatcSecure@Lab")

        # Legitimate passing measurements within statutory MPE
        res = self.client.post("/api/gatc/test-report", json={
            "instrumentId": "inst-007",
            "technicianName": "Er. Sandeep Deshmukh",
            "secondaryStandardsRef": "NPL/RRSL-MH/2026/0411-SEC",
            "temperatureC": 27.8,
            "relativeHumidityPercent": 52,
            "loadTrials": [
                {"name": "10T Nominal", "loadTonnes": 10, "observedTonnes": 10.005, "status": "PASSED"},
                {"name": "30T Half", "loadTonnes": 30, "observedTonnes": 30.010, "status": "PASSED"},
                {"name": "60T Max", "loadTonnes": 60, "observedTonnes": 60.015, "status": "PASSED"}
            ],
            "repeatability": {
                "loadTonnes": 30,
                "readings": [30.000, 30.005, 30.002]
            },
            "eccentricity": {
                "loadTonnes": 20,
                "readings": {"cornerA": 20.005, "cornerB": 20.003, "cornerC": 20.006, "cornerD": 20.004}
            },
            "passedAllTests": True,
            "remarks": "Weighbridge fully compliant with Legal Metrology General Rules 2011 Table 2."
        }, headers={"Authorization": f"Bearer {gatc1_token}"})

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["verdict"], "PASSED")
        self.assertTrue(data["passedAllTests"])
        self.assertIn("reportNumber", data)
        self.assertTrue(data["reportNumber"].startswith("GATC-TR-2026-"))

        # Verify stored report
        rep = data["report"]
        self.assertEqual(rep["gatcCenterId"], "gatc-01")
        self.assertEqual(rep["technicianName"], "Er. Sandeep Deshmukh")
        self.assertEqual(rep["overallVerdict"], "PASSED")
        self.assertIn("cryptographicHash", rep)
        self.assertEqual(len(rep["cryptographicHash"]), 64)

        # Verify instrument updated
        inst = data["instrument"]
        self.assertEqual(inst["gatcStatus"], "CALIBRATED_PASSED")
        self.assertEqual(inst["lastGatcReportNumber"], data["reportNumber"])

    def test_64_gatc_center_isolation_on_reports(self):
        gatc1_token = self.login_token("gatc", "GOI-GATC-W-2021-009", "GatcSecure@Lab")
        gatc2_token = self.login_token("gatc", "GOI-GATC-F-2023-018", "GatcSecure@Lab")

        # GATC-01 can view reports for gatc-01
        res1 = self.client.get("/api/gatc/reports", headers={"Authorization": f"Bearer {gatc1_token}"})
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertTrue(all(r["gatcCenterId"] == "gatc-01" for r in data1["reports"]))

        # GATC-02 cannot see GATC-01's reports
        res2 = self.client.get("/api/gatc/reports", headers={"Authorization": f"Bearer {gatc2_token}"})
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertTrue(all(r["gatcCenterId"] == "gatc-02" for r in data2["reports"]))

    # ---------------- 16. Authenticated Identity & Ownership Enforcement Suite ----------------
    def test_65_merchant_cannot_spoof_merchant_id_in_application(self):
        merch1_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # Merchant m-01 tries to create application specifying merchantId = m-02
        res = self.create_paid_application(merch1_token, {
            "merchantId": "m-02",
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-SPOOF-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })

        self.assertEqual(res.status_code, 403)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("Cannot submit verification application for another merchant", err)

    def test_66_application_derives_authoritative_merchant_details_from_db(self):
        merch1_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # Merchant m-01 sends fake merchantName, district, and state in body
        res = self.create_paid_application(merch1_token, {
            "merchantName": "Hacker Bogus Traders",
            "district": "Kolkata Central",
            "state": "West Bengal",
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-AUTH-DERIVE-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        })

        self.assertEqual(res.status_code, 201)
        app_data = res.json()
        # Verify authoritative database values were used, completely ignoring the spoofed fields
        self.assertEqual(app_data["merchantId"], "m-01")
        self.assertEqual(app_data["merchantName"], "Om Sai Supermarket & Provision Stores")
        self.assertEqual(app_data["district"], "Mumbai Suburban")
        self.assertEqual(app_data["state"], "Maharashtra")

    def test_67_merchant_cannot_apply_for_another_merchants_instrument(self):
        merch1_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # Merchant m-01 acquires a valid payment, then attempts to create application for inst-004 (belonging to m-02)
        init_res = self.client.post("/api/payments/initiate", json={
            "instrumentCategory": "Precision Analytical Balance (Jeweler/Lab)",
            "maxCapacityKg": 0.22,
            "accuracyClass": "Class I"
        }, headers={"Authorization": f"Bearer {merch1_token}"})
        self.assertEqual(init_res.status_code, 201)
        pid = init_res.json()["id"]
        self.client.post(f"/api/payments/{pid}/confirm", json={"simulateSuccess": True}, headers={"Authorization": f"Bearer {merch1_token}"})

        res = self.client.post("/api/applications", json={
            "paymentId": pid,
            "instrumentId": "inst-004",
            "instrumentCategory": "Precision Analytical Balance (Jeweler/Lab)",
            "brand": "Mettler Toledo",
            "model": "ME204",
            "serialNumber": "MT-2022-77182",
            "maxCapacityKg": 0.22,
            "accuracyClass": "Class I"
        }, headers={"Authorization": f"Bearer {merch1_token}"})

        self.assertEqual(res.status_code, 403)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("belonging to another merchant", err)

    def test_68_merchant_cannot_register_instrument_for_another_merchant(self):
        merch1_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # Merchant m-01 tries to register an instrument specifying merchantId = m-02
        res = self.client.post("/api/instruments", json={
            "merchantId": "m-02",
            "category": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-INST-SPOOF-01",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        }, headers={"Authorization": f"Bearer {merch1_token}"})

        self.assertEqual(res.status_code, 403)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("Cannot register an instrument on behalf of another merchant", err)

    def test_69_instrument_registration_derives_location_from_db(self):
        merch1_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # Merchant m-01 attempts to set district and state to arbitrary external locations
        res = self.client.post("/api/instruments", json={
            "category": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": "SN-LOC-DERIVE-01",
            "district": "Varanasi",
            "state": "Uttar Pradesh",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III"
        }, headers={"Authorization": f"Bearer {merch1_token}"})

        self.assertEqual(res.status_code, 201)
        inst_data = res.json()
        self.assertEqual(inst_data["merchantId"], "m-01")
        self.assertEqual(inst_data["merchantName"], "Om Sai Supermarket & Provision Stores")
        self.assertEqual(inst_data["district"], "Mumbai Suburban")
        self.assertEqual(inst_data["state"], "Maharashtra")

    def test_70_merchant_cannot_access_another_merchants_instrument_by_id(self):
        merch1_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # inst-004 belongs to m-02
        res = self.client.get("/api/instruments/inst-004", headers={"Authorization": f"Bearer {merch1_token}"})
        self.assertEqual(res.status_code, 403)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("Cannot access an instrument belonging to another merchant", err)

    def test_71_inspector_cannot_inspect_application_outside_jurisdiction(self):
        # LMO-MH-042 has jurisdiction in Mumbai Suburban
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # APP-2026-0905 is located in Bengaluru Urban and assigned to lmo-02
        res = self.client.post("/api/applications/APP-2026-0905/inspect", json={
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "loadKg": 0.1,
                "readings": [0.100, 0.100, 0.100],
                "maxDifferenceGrams": 0.0,
                "mpeGrams": 0.001,
                "passed": True
            },
            "repeatabilityPassed": True,
            "eccentricity": {
                "loadKg": 0.07,
                "readings": {"cornerA": 0.070, "cornerB": 0.070, "cornerC": 0.070, "cornerD": 0.070},
                "maxErrorGrams": 0.0,
                "mpeGrams": 0.001,
                "passed": True
            },
            "eccentricityPassed": True,
            "testLoads": [
                {"name": "Min", "loadKg": 0.01, "observedKg": 0.01, "mpeGrams": 0.001, "passed": True}
            ],
            "leadSealNo": "MH-LMO-LS-1111",
            "hologramNo": "HOL-GOI-2026-111111"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(res.status_code, 403)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("does not have jurisdiction", err)

    def test_72_inspector_cannot_spoof_officer_id_in_inspection(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # LMO-MH-042 inspects APP-2026-0901 (Mumbai Suburban) but specifies officerId = lmo-02
        res = self.client.post("/api/applications/APP-2026-0901/inspect", json={
            "officerId": "lmo-02",
            "officerName": "Dr. Ananya Sundaram",
            "passedAllTests": True,
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            }
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(res.status_code, 403)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("cannot operate or submit inspections as another officer", err)

    def test_73_inspector_cannot_view_applications_assigned_to_another_officer(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # Attempt to filter by officerId = lmo-02
        res = self.client.get("/api/applications?officerId=lmo-02", headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(res.status_code, 403)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("cannot view applications assigned to another officer", err)

    def test_74_inspector_cannot_query_applications_outside_jurisdiction(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # Attempt to query applications in Bengaluru Urban
        res = self.client.get("/api/applications?district=Bengaluru+Urban", headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(res.status_code, 403)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("cannot query applications outside assigned jurisdiction", err)

    def test_75_inspector_cannot_view_seal_inventory_of_another_officer(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # Attempt to query seals allocated to lmo-02
        res = self.client.get("/api/seals/inventory?officerId=lmo-02", headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(res.status_code, 403)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("Cannot view seal inventory allocated to another officer", err)

    def test_76_inspector_cannot_validate_seal_under_another_officer(self):
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # Attempt to validate a seal specifying officerId = lmo-02
        res = self.client.post("/api/seals/validate", json={
            "sealNumber": "KA-LMO-LS-2222",
            "sealType": "LEAD_WIRE_SEAL",
            "officerId": "lmo-02"
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(res.status_code, 403)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("Cannot validate seal under another officer's identity", err)

    def test_77_auth_me_returns_authoritative_database_entity(self):
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # Merchant me check
        res_m = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res_m.status_code, 200)
        data_m = res_m.json()
        self.assertTrue(data_m["success"])
        self.assertEqual(data_m["user"]["role"], "merchant")
        self.assertIn("entity", data_m)
        self.assertEqual(data_m["entity"]["tradeName"], "Om Sai Supermarket & Provision Stores")
        self.assertEqual(data_m["entity"]["gstin"], "27AABCO1234F1Z8")
        self.assertEqual(data_m["entity"]["district"], "Mumbai Suburban")
        self.assertNotIn("passwordHash", data_m["entity"])

        # Inspector me check
        res_i = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {insp_token}"})
        self.assertEqual(res_i.status_code, 200)
        data_i = res_i.json()
        self.assertTrue(data_i["success"])
        self.assertEqual(data_i["user"]["role"], "inspector")
        self.assertIn("entity", data_i)
        self.assertEqual(data_i["entity"]["name"], "Shri Rajesh K. Sharma")
        self.assertEqual(data_i["entity"]["badgeNumber"], "LMO-MH-042")
        self.assertEqual(data_i["entity"]["jurisdictionDistrict"], "Mumbai Suburban")
        self.assertNotIn("passwordHash", data_i["entity"])

    # ---------------- 17. Statutory Fee Calculation & Simulated Payment Security Suite ----------------
    def test_76_quote_fee_from_registered_instrument(self):
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # inst-002: Berkel FX-120 Retail Scale, Counter scale, 15kg, Class III
        res = self.client.post("/api/payments/quote-fee", json={
            "instrumentId": "inst-002"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["instrumentId"], "inst-002")
        self.assertEqual(data["baseFee"], 300)
        self.assertEqual(data["penalty"], 0)
        self.assertEqual(data["totalFee"], 300)
        self.assertFalse(data["isLatePenaltyApplied"])
        self.assertIn("Schedule XII", data["statutoryRuleRef"])

    def test_77_quote_fee_applies_surcharge_for_expired_instrument(self):
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # inst-003: Platform Scale 300kg, status = EXPIRED
        res = self.client.post("/api/payments/quote-fee", json={
            "instrumentId": "inst-003",
            "applicationType": "Overdue Periodic Verification (Post Expiry)"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["baseFee"], 600)
        self.assertEqual(data["penalty"], 600)
        self.assertEqual(data["totalFee"], 1200)
        self.assertTrue(data["isLatePenaltyApplied"])

    def test_78_fee_tampering_rejected_capacity_manipulation(self):
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # inst-002 has registered capacity 15kg (fee 300). Applicant attempts to claim 5kg (fee 200)
        res = self.client.post("/api/payments/initiate", json={
            "instrumentId": "inst-002",
            "maxCapacityKg": 5.0
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res.status_code, 400)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("Tampering detected", err)
        self.assertIn("capacity 5.0kg does not match", err)

    def test_79_fee_tampering_rejected_category_manipulation(self):
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # inst-003 is registered as Platform Scale. Applicant claims Counter scale to lower fee
        res = self.client.post("/api/payments/initiate", json={
            "instrumentId": "inst-003",
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res.status_code, 400)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("Tampering detected", err)
        self.assertIn("category", err.lower())

    def test_80_fee_tampering_rejected_accuracy_class_manipulation(self):
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # inst-002 is Class III. Applicant claims Class I
        res = self.client.post("/api/payments/initiate", json={
            "instrumentId": "inst-002",
            "accuracyClass": "Class I"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res.status_code, 400)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("Tampering detected", err)
        self.assertIn("accuracy class", err.lower())

    def test_81_application_submission_rejected_without_payment(self):
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # Applicant submits application with no paymentId
        res = self.client.post("/api/applications", json={
            "instrumentId": "inst-002",
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Avery Weigh-Tronix",
            "model": "Berkel FX-120",
            "serialNumber": "AV-2022-44109",
            "maxCapacityKg": 15,
            "accuracyClass": "Class III"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res.status_code, 402)
        err = res.json().get("error") or res.json().get("detail", "")
        self.assertIn("Payment confirmation required", err)

    def test_82_application_submission_rejected_with_unconfirmed_initiated_payment(self):
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # Initiate payment but do NOT confirm it
        init_res = self.client.post("/api/payments/initiate", json={
            "instrumentId": "inst-002"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(init_res.status_code, 201)
        pid = init_res.json()["id"]
        self.assertEqual(init_res.json()["status"], "INITIATED")

        # Attempt to submit application with unconfirmed payment
        app_res = self.client.post("/api/applications", json={
            "paymentId": pid,
            "instrumentId": "inst-002",
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Avery Weigh-Tronix",
            "model": "Berkel FX-120",
            "serialNumber": "AV-2022-44109",
            "maxCapacityKg": 15,
            "accuracyClass": "Class III"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(app_res.status_code, 402)
        err = app_res.json().get("error") or app_res.json().get("detail", "")
        self.assertIn("Payment not confirmed", err)

    def test_83_application_submission_rejected_with_failed_payment(self):
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # Initiate payment
        init_res = self.client.post("/api/payments/initiate", json={
            "instrumentId": "inst-002"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(init_res.status_code, 201)
        pid = init_res.json()["id"]

        # Confirm with simulateSuccess: False (simulated gateway timeout/decline)
        conf_res = self.client.post(f"/api/payments/{pid}/confirm", json={
            "simulateSuccess": False,
            "failureReason": "Sandbox demo card declined"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(conf_res.status_code, 200)
        self.assertEqual(conf_res.json()["status"], "FAILED")

        # Application submission must be rejected
        app_res = self.client.post("/api/applications", json={
            "paymentId": pid,
            "instrumentId": "inst-002",
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Avery Weigh-Tronix",
            "model": "Berkel FX-120",
            "serialNumber": "AV-2022-44109",
            "maxCapacityKg": 15,
            "accuracyClass": "Class III"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(app_res.status_code, 402)

    def test_84_application_submission_rejected_with_fee_amount_mismatch(self):
        from backend.data.mock_data import db
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        init_res = self.client.post("/api/payments/initiate", json={
            "instrumentId": "inst-002"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(init_res.status_code, 201)
        pid = init_res.json()["id"]

        self.client.post(f"/api/payments/{pid}/confirm", json={"simulateSuccess": True}, headers={"Authorization": f"Bearer {merch_token}"})

        # Manually tamper with payment amount in record to simulate manipulated order
        pay_rec = next(p for p in db["payments"] if p["id"] == pid)
        pay_rec["amount"] = 50  # Less than required statutory fee (300)

        app_res = self.client.post("/api/applications", json={
            "paymentId": pid,
            "instrumentId": "inst-002",
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Avery Weigh-Tronix",
            "model": "Berkel FX-120",
            "serialNumber": "AV-2022-44109",
            "maxCapacityKg": 15,
            "accuracyClass": "Class III"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(app_res.status_code, 400)
        err = app_res.json().get("error") or app_res.json().get("detail", "")
        self.assertIn("Payment amount mismatch", err)

    def test_85_payment_replay_rejected_for_second_application(self):
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # 1. Initiate and confirm payment
        init_res = self.client.post("/api/payments/initiate", json={
            "instrumentId": "inst-002"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        pid = init_res.json()["id"]
        self.client.post(f"/api/payments/{pid}/confirm", json={"simulateSuccess": True}, headers={"Authorization": f"Bearer {merch_token}"})

        # 2. First application succeeds
        app_res1 = self.client.post("/api/applications", json={
            "paymentId": pid,
            "instrumentId": "inst-002",
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Avery Weigh-Tronix",
            "model": "Berkel FX-120",
            "serialNumber": "AV-2022-44109",
            "maxCapacityKg": 15,
            "accuracyClass": "Class III"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(app_res1.status_code, 201)

        # 3. Second application reusing same paymentId is rejected
        app_res2 = self.client.post("/api/applications", json={
            "paymentId": pid,
            "instrumentId": "inst-002",
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Avery Weigh-Tronix",
            "model": "Berkel FX-120",
            "serialNumber": "AV-2022-44109",
            "maxCapacityKg": 15,
            "accuracyClass": "Class III"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(app_res2.status_code, 400)
        err = app_res2.json().get("error") or app_res2.json().get("detail", "")
        self.assertIn("Payment already utilized", err)

    def test_86_complete_successful_simulated_payment_and_application_workflow(self):
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # 1. Quote fee authoritatively
        quote_res = self.client.post("/api/payments/quote-fee", json={
            "instrumentId": "inst-002"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(quote_res.status_code, 200)
        quote = quote_res.json()
        self.assertEqual(quote["totalFee"], 300)

        # 2. Initiate payment order
        init_res = self.client.post("/api/payments/initiate", json={
            "instrumentId": "inst-002",
            "gateway": "BHARATKOSH (Simulated Demo)"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(init_res.status_code, 201)
        payment = init_res.json()
        pid = payment["id"]
        self.assertEqual(payment["status"], "INITIATED")
        self.assertTrue(payment["isSimulated"])
        self.assertIn("Simulated Demo", payment["gateway"])

        # 3. Confirm simulated payment
        conf_res = self.client.post(f"/api/payments/{pid}/confirm", json={
            "simulateSuccess": True
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(conf_res.status_code, 200)
        conf_data = conf_res.json()
        self.assertEqual(conf_data["status"], "SUCCESS")
        self.assertTrue(conf_data["receiptNumber"].startswith("RCPT-GOI-2026-"))
        self.assertTrue(conf_data["transactionReference"].startswith("TXN-SIM-"))

        # 4. Fetch receipt
        rcpt_res = self.client.get(f"/api/payments/{pid}/receipt", headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(rcpt_res.status_code, 200)
        rcpt = rcpt_res.json()
        self.assertEqual(rcpt["receiptNumber"], conf_data["receiptNumber"])
        self.assertEqual(rcpt["amount"], 300)
        self.assertTrue(rcpt["gstExempt"])

        # 5. Submit application
        app_res = self.client.post("/api/applications", json={
            "paymentId": pid,
            "instrumentId": "inst-002",
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Avery Weigh-Tronix",
            "model": "Berkel FX-120",
            "serialNumber": "AV-2022-44109",
            "maxCapacityKg": 15,
            "accuracyClass": "Class III"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(app_res.status_code, 201)
        app = app_res.json()
        self.assertEqual(app["paymentStatus"], "PAID")
        self.assertEqual(app["statutoryFee"], 300)
        self.assertEqual(app["paymentReceiptNumber"], conf_data["receiptNumber"])
        self.assertEqual(app["paymentReference"], conf_data["transactionReference"])
        self.assertTrue(app["isSimulatedPayment"])

    # =========================================================================
    # SUITE 18: INSTRUMENT REGISTRATION & APPLICATION LIFECYCLE (User Request 10)
    # =========================================================================

    def test_88_approved_models_search_and_spec_derivation(self):
        """Test approved models search and server-side spec derivation."""
        # 1. Search approved models by query
        res = self.client.get("/api/instruments/approved-models?query=DS-252")
        self.assertEqual(res.status_code, 200)
        models = res.json()
        self.assertTrue(len(models) > 0)
        self.assertEqual(models[0]["modelApprovalNumber"], "IND/09/2021/412")
        self.assertEqual(models[0]["accuracyClass"], "Class III")

        # 2. Derive specs for approved model
        derive_res = self.client.post("/api/instruments/derive-specs", json={
            "instrumentType": "Precision Analytical Balance (Jeweler/Lab)",
            "capacityKg": 0.22,
            "manufacturer": "Shimadzu",
            "model": "AP225W Analytical Balance"
        })
        self.assertEqual(derive_res.status_code, 200)
        specs = derive_res.json()
        self.assertTrue(specs["isApprovedModel"])
        self.assertEqual(specs["accuracyClass"], "Class I")
        self.assertEqual(specs["verificationInterval_e"], 0.0001)
        self.assertEqual(specs["modelApprovalNumber"], "IND/09/2021/118")
        self.assertIn("Schedule VI", specs["applicableRules"])

        # 3. Derive specs for uncataloged model using statutory rule heuristics
        derive_res2 = self.client.post("/api/instruments/derive-specs", json={
            "instrumentType": "Electronic Weighing Scale (Counter/Tabletop)",
            "capacityKg": 10.0,
            "manufacturer": "Custom Mfg",
            "model": "CM-100"
        })
        self.assertEqual(derive_res2.status_code, 200)
        specs2 = derive_res2.json()
        self.assertFalse(specs2["isApprovedModel"])
        self.assertEqual(specs2["accuracyClass"], "Class III")
        self.assertEqual(specs2["verificationInterval_e"], 2.0)

    def test_89_simplified_instrument_registration_and_duplicate_prevention(self):
        """Test simplified 6-field registration, spec derivation, and duplicate serial prevention."""
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")
        unique_serial = f"TEST-SN-{int(time.time())}"

        # 1. Register with simplified 6 fields + supporting documents
        reg_res = self.client.post("/api/instruments", json={
            "instrumentType": "Electronic Weighing Scale (Counter/Tabletop)",
            "manufacturer": "Essae-Teraoka",
            "model": "DS-252 Electronic Counter Scale",
            "serialNumber": unique_serial,
            "capacity": 30.0,
            "installationLocation": "Counter #1, Billing Section, Bandra West, Mumbai",
            "documents": [
                {
                    "name": "Purchase Invoice & Warranty",
                    "type": "INVOICE",
                    "url": "https://gov.in/docs/inv-9921.pdf"
                }
            ]
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(reg_res.status_code, 201)
        inst = reg_res.json()
        self.assertEqual(inst["serialNumber"], unique_serial)
        self.assertEqual(inst["accuracyClass"], "Class III")
        self.assertEqual(inst["verificationInterval_e"], 5.0)
        self.assertEqual(inst["modelApprovalNumber"], "IND/09/2021/412")
        self.assertEqual(inst["installationLocation"], "Counter #1, Billing Section, Bandra West, Mumbai")
        self.assertEqual(len(inst["documents"]), 1)

        # 2. Attempt duplicate serial registration -> must be rejected with 400
        dup_res = self.client.post("/api/instruments", json={
            "instrumentType": "Electronic Weighing Scale (Counter/Tabletop)",
            "manufacturer": "Essae-Teraoka",
            "model": "DS-252 Electronic Counter Scale",
            "serialNumber": unique_serial.lower(),  # test case insensitivity
            "capacity": 30.0,
            "installationLocation": "Counter #2"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(dup_res.status_code, 400)
        self.assertIn("already registered", dup_res.json()["detail"].lower())

    def test_90_failed_inspection_records_parameters_and_timeline(self):
        """Test that failed inspection records failedParameters and timeline event."""
        insp_token = self.login_token(role="inspector", identifier="LMO-MH-042", password="GovOfficer#2026")

        # Submit failing inspection for APP-2026-0899 (repeatability difference 500g exceeds statutory tolerance)
        res = self.client.post("/api/applications/APP-2026-0899/inspect", json={
            "passedAllTests": False,
            "remarks": "Repeatability difference out of statutory tolerance",
            "leadSealNo": "MH-LMO-LS-4201",
            "hologramNo": "HOL-MH-2026-4401",
            "visualInspectionPassed": True,
            "visualCheck": {
                "enclosureIntact": True,
                "levelingCentered": True,
                "modelApprovalPlatePresent": True,
                "environmentalCheckPassed": True
            },
            "repeatability": {
                "readings": [150.000, 150.500, 150.000],  # diff = 500g > MPE (150g / 300g)
                "loadKg": 150.0
            },
            "eccentricity": {
                "readings": {"cornerA": 100.002, "cornerB": 100.004, "cornerC": 100.001, "cornerD": 100.003},
                "loadKg": 100.0
            },
            "testLoads": [
                {"name": "Half Load", "loadKg": 150.0, "observedKg": 150.010, "mpeGrams": 50.0, "status": "PASS", "passed": True}
            ]
        }, headers={"Authorization": f"Bearer {insp_token}"})

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["verdict"], "FAILED")
        app = data["application"]
        self.assertEqual(app["status"], "REJECTED")
        self.assertTrue(app.get("reVerificationEligible"))
        self.assertTrue(len(app.get("failedParameters", [])) > 0)
        self.assertIn("Repeatability", app["failedParameters"][0]["parameter"])

        # Verify timeline event
        timeline_events = [e["status"] for e in app.get("timeline", [])]
        self.assertIn("VERIFICATION_FAILED", timeline_events)

    def test_91_reverification_requires_failed_original_and_repair_declaration(self):
        """Test re-verification after repair constraints and repair declaration."""
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        # Step 1: Create confirmed payment for re-verification statutory fee
        init_res = self.client.post("/api/payments/initiate", json={
            "applicationType": "Re-verification After Repair / Recalibration",
            "category": "Electronic Weighing Scale (Counter/Tabletop)",
            "capacityKg": 30,
            "accuracyClass": "Class III"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(init_res.status_code, 201)
        pid = init_res.json()["id"]

        conf_res = self.client.post(f"/api/payments/{pid}/confirm", json={
            "simulateSuccess": True,
            "paymentMethod": "UPI / QR Code"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(conf_res.status_code, 200)

        # 1. Missing originalApplicationId -> 400
        res1 = self.client.post("/api/applications", json={
            "paymentId": pid,
            "applicationType": "Re-verification After Repair / Recalibration"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res1.status_code, 400)
        self.assertIn("originalapplicationid", (res1.json().get("detail") or res1.json().get("error", "")).lower())

        # 2. Non-existent originalApplicationId -> 404
        res2 = self.client.post("/api/applications", json={
            "paymentId": pid,
            "applicationType": "Re-verification After Repair / Recalibration",
            "originalApplicationId": "APP-NONEXISTENT-9999"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res2.status_code, 404)

        # 3. Not rejected original application (APP-2026-0901 is UNDER_REVIEW or VERIFIED) -> 400
        res3 = self.client.post("/api/applications", json={
            "paymentId": pid,
            "applicationType": "Re-verification After Repair / Recalibration",
            "originalApplicationId": "APP-2026-0901"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res3.status_code, 400)
        self.assertIn("only permitted for rejected/failed", (res3.json().get("detail") or res3.json().get("error", "")).lower())

        # 4. Missing repairDeclaration -> 400
        res4 = self.client.post("/api/applications", json={
            "paymentId": pid,
            "applicationType": "Re-verification After Repair / Recalibration",
            "originalApplicationId": "APP-2026-0850"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res4.status_code, 400)
        self.assertIn("repair declaration is mandatory", (res4.json().get("detail") or res4.json().get("error", "")).lower())

        # 5. Incomplete repairDeclaration -> 400
        res5 = self.client.post("/api/applications", json={
            "paymentId": pid,
            "applicationType": "Re-verification After Repair / Recalibration",
            "originalApplicationId": "APP-2026-0850",
            "repairDeclaration": {
                "repairDetails": "Load cell recalibration"
                # missing repairedBy, repairAgency, repairDate
            }
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res5.status_code, 400)
        self.assertIn("mandatory", (res5.json().get("detail") or res5.json().get("error", "")).lower())

        # 6. Valid re-verification submission linked to failed APP-2026-0850
        res6 = self.client.post("/api/applications", json={
            "paymentId": pid,
            "applicationType": "Re-verification After Repair / Recalibration",
            "originalApplicationId": "APP-2026-0850",
            "repairDeclaration": {
                "repairDetails": "Load cell recalibration, corner load adjustment, zero balance alignment",
                "repairedBy": "Ramesh K. (Licensed Metrology Technician #KA-REP-409)",
                "repairAgency": "Essae Authorized Service Center",
                "repairDate": "2026-09-26",
                "evidence": "https://gov.in/docs/repair-job-card-992.pdf"
            },
            "preferredInspectionDate": "2026-10-02"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res6.status_code, 201)
        rever_app = res6.json()
        self.assertEqual(rever_app["originalApplicationId"], "APP-2026-0850")
        self.assertIn("Essae Authorized Service Center", rever_app["repairDeclaration"]["repairAgency"])
        
        # Verify timeline contains REPAIR_DECLARED
        statuses = [e["status"] for e in rever_app["timeline"]]
        self.assertIn("SUBMITTED", statuses)
        self.assertIn("REPAIR_DECLARED", statuses)
        self.assertIn("PAYMENT_CONFIRMED", statuses)

    def test_92_application_reschedule_workflow(self):
        """Test application rescheduling workflow with timeline update."""
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_created = self.create_paid_application(merch_token, {
            "instrumentCategory": "Electronic Weighing Scale (Counter/Tabletop)",
            "brand": "Essae",
            "model": "DS-252",
            "serialNumber": f"SN-RESCHED-{int(time.time())}",
            "maxCapacityKg": 30,
            "accuracyClass": "Class III",
            "applicationType": "Initial Verification of New Instrument",
            "preferredInspectionDate": "2026-09-30"
        })
        self.assertEqual(app_created.status_code, 201)
        app_id = app_created.json()["id"]

        # Reschedule application
        res = self.client.post(f"/api/applications/{app_id}/reschedule", json={
            "rescheduledDate": "2026-10-05 11:30 AM",
            "reason": "Annual stock audit in progress, request Monday inspection slot",
            "officerRemarks": "Rescheduled as requested by merchant"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res.status_code, 200)
        updated_app = res.json()["application"]
        self.assertEqual(updated_app["scheduledDateTime"], "2026-10-05 11:30 AM")
        self.assertEqual(updated_app["status"], "INSPECTION_SCHEDULED")

        # Verify timeline event
        timeline_statuses = [e["status"] for e in updated_app["timeline"]]
        self.assertIn("INSPECTION_RESCHEDULED", timeline_statuses)

        # Attempt to reschedule by an unauthorized merchant -> 403
        m02_token = self.login_token(role="merchant", identifier="29AAACK5521M1Z4", password="Admin@1234")
        unauth_res = self.client.post(f"/api/applications/{app_id}/reschedule", json={
            "rescheduledDate": "2026-10-06 10:00 AM"
        }, headers={"Authorization": f"Bearer {m02_token}"})
        self.assertEqual(unauth_res.status_code, 403)

    def test_93_application_cancel_workflow(self):
        """Test application cancellation workflow, timeline update, and instrument status reversion."""
        merch_token = self.login_token(role="merchant", identifier="27AABCO1234F1Z8", password="Admin@1234")

        app_created = self.create_paid_application(merch_token, {
            "instrumentCategory": "Platform Scale / Heavy Bench Scale",
            "brand": "Phoenix",
            "model": "HeavyDuty-300",
            "serialNumber": f"SN-CANCEL-{int(time.time())}",
            "maxCapacityKg": 300,
            "accuracyClass": "Class III",
            "applicationType": "Initial Verification of New Instrument"
        })
        self.assertEqual(app_created.status_code, 201)
        app_id = app_created.json()["id"]

        # Cancel application
        res = self.client.post(f"/api/applications/{app_id}/cancel", json={
            "reason": "Platform scale relocated to godown, cancelled on-site inspection"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res.status_code, 200)
        app = res.json()["application"]
        self.assertEqual(app["status"], "CANCELLED")
        self.assertIn("relocated", app["cancellationReason"])

        # Timeline should record APPLICATION_CANCELLED
        statuses = [e["status"] for e in app["timeline"]]
        self.assertIn("APPLICATION_CANCELLED", statuses)

        # Cannot cancel again
        again_res = self.client.post(f"/api/applications/{app_id}/cancel", json={
            "reason": "Attempting second cancellation"
        }, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(again_res.status_code, 400)

if __name__ == "__main__":
    unittest.main()


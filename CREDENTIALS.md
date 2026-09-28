# Statutory Authentication Registry & Pre-Seeded Evaluator Credentials
**Project:** National Legal Metrology Online Verification System (Maanak / NLMVS - SIH 26036)  
**Security Standard:** Bcrypt Salted Password Hashing • HMAC-SHA256 Signed JWTs • Server-Side Zero-Trust RBAC

> [!IMPORTANT]
> In compliance with strict security standards, **no passwords, 2FA tokens, or OTP secrets are stored in the frontend client bundle**. All credentials and password hashes are seeded and verified exclusively on the server (`backend/data/mockData.json`).

---

## 1. Pre-Seeded Test Accounts for Demonstration & Evaluation

Use these credentials to manually log into each stakeholder portal via the **Portal Login Gateway** (`http://localhost:3000`).

### 1. Merchant / Establishment Portal
*Authorized under Rule 14, Legal Metrology (General) Rules, 2011 for instrument verification & renewal filing.*

| Field | Value |
| :--- | :--- |
| **Role Tab** | `Merchant / Trader` |
| **Login Identifier (GSTIN)** | `27AABCO1234F1Z8` *(Om Sai Supermarket)* or `29AAACK5521M1Z4` *(Kalyan Jewellers)* |
| **Alternate Identifier (Email)** | `contact@omsaimart.com` |
| **Password** | `Admin@1234` |
| **2FA Token** | *None required* |

---

### 2. Legal Metrology Officer (LMO Inspector)
*Authorized under Section 15 of The Legal Metrology Act, 2009 for Stamping, Seizure, and Tolerances.*

| Field | Value |
| :--- | :--- |
| **Role Tab** | `LMO Inspector` |
| **Login Identifier (Badge ID)** | `LMO-MH-042` *(Shri Rajesh K. Sharma - Mumbai Suburban)* |
| **Alternate Identifier (Govt Email)** | `rajesh.sharma@legalmetrology.gov.in` |
| **Password** | `GovOfficer#2026` |
| **2FA Token** | *None required* |

---

### 3. Government Approved Test Centre (GATC) Calibration Lab
*Notified under Section 14 for heavy industrial weighbridges & flow meters.*

| Field | Value |
| :--- | :--- |
| **Role Tab** | `GATC Lab` |
| **Login Identifier (Recognition No)** | `GOI-GATC-W-2021-009` *(Apex Metrology & Heavy Calibration Lab)* |
| **Alternate Identifier (Lab Email)** | `info@ncl-gatc.gov.in` |
| **Password** | `GatcSecure@Lab` |
| **2FA Token** | *None required* |

---

### 4. Apex Directorate & National Regulator Command Center
*Super Administrator oversight across all 36 States & UTs with immutable SHA-256 audit ledger.*

| Field | Value |
| :--- | :--- |
| **Role Tab** | `Regulator` |
| **Login Identifier (Govt ID)** | `GOI-ADM-001` *(Dr. Suresh Chandra, Controller General)* |
| **Alternate Identifier (Govt Email)** | `suresh.chandra@legalmetrology.gov.in` |
| **Password** | `SuperGov#Admin2026` |
| **Two-Factor Authentication (2FA)** | **Real RFC 6238 TOTP Enforced Server-Side** |
| **Authenticator App Secret** | `JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP` *(Google Authenticator / Authy / iOS)* |
| **SIH Evaluator Demo 2FA** | On the Step 2 2FA screen, click **"Get Live Demo Code"** or call `GET /api/auth/2fa/demo-code` to fetch the real-time server TOTP code. |

---

### 5. Citizen / Consumer (Jago Grahak Jago)
*Public citizen grievance filing and QR verification.*

| Field | Value |
| :--- | :--- |
| **Role Tab** | `Citizen / Consumer` |
| **Mobile Number** | `+91 98200 99881` *(or any valid 10-digit Indian mobile)* |
| **OTP Mechanism** | Click **"Request / Send OTP"** |
| **OTP Retrieval** | Check the backend server terminal output for: `[STATUTORY SMS GATEWAY] 📱 OTP dispatched for +91 98200 99881: <6-digit code>`. Enter the 6-digit code and click **"Sign In with OTP"**. |
| **Guest Access** | Instant QR verification without logging in: use certificate `MH/LM/2025/08492` on the landing page. |

---

## 2. Server Environment Variables & Configuration

Backend settings can be configured via environment variables or a `.env` file in `backend/`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `JWT_SECRET` | `nlmvs-prod-super-secret-key-2026-legal-metrology-goi` | 256-bit secret key used to sign and verify HMAC-SHA256 JWT bearer tokens |
| `PORT` | `5000` | FastAPI server listening port |
| `HOST` | `0.0.0.0` | Bind host address |
| `OTP_VALIDITY_SECONDS` | `300` | One-time password expiration time (5 minutes) |
| `TEST_MODE` | `0` | Set to `1` during automated unit testing suites |
| `MERIPEHCHAN_CLIENT_ID` | `""` *(Unset)* | NIC MeriPehchan production OpenID Connect Client ID (when onboarding) |
| `MERIPEHCHAN_CLIENT_SECRET` | `""` *(Unset)* | NIC MeriPehchan production Client Secret |
| `MERIPEHCHAN_REDIRECT_URI` | `http://localhost:5173/auth/sso/callback` | Authorized redirect URI for production MeriPehchan IdP |

---

## 3. Government SSO Integration (MeriPehchan / Jan Parichay)

- **Active Operational Mode:** `SSO Integration — Demo Simulation`
- **Notice & Disclosure:** Live MeriPehchan production connectivity requires official NIC / MeitY client onboarding. This project includes a production-ready OpenID Connect provider abstraction (`backend/services/sso_service.py`), with an interactive simulation sandbox for Smart India Hackathon evaluation.
- **Security Isolation:** The Demo Simulation is completely isolated from mock fallback shortcuts. It executes a simulated OIDC token exchange against registered database entities via `POST /api/auth/sso/simulate`, issues a cryptographically signed HMAC-SHA256 platform JWT, and records immutable audit records (`SSO_DEMO_AUTHENTICATION_EXCHANGE`). Backend RBAC is strictly enforced for all subsequent requests.
- **Production Switch:** Setting `MERIPEHCHAN_CLIENT_ID` and `MERIPEHCHAN_CLIENT_SECRET` activates live OAuth 2.0 / OIDC code exchange with `https://janparichay.meripehchan.gov.in/v1/token` without any modifications to core RBAC or JWT models.


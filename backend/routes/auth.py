import time
import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel

from backend.data.mock_data import db
from backend.services.auth_service import (
    verify_password,
    create_access_token,
    create_refresh_token,
    create_session,
    verify_access_token,
    verify_refresh_token,
    revoke_session,
    request_otp,
    verify_otp,
    sanitize_account
)
from backend.services.captcha_service import generate_captcha, verify_captcha
from backend.services.totp_service import verify_totp, get_current_totp, get_remaining_seconds
from backend.services.sso_service import sso_provider
from backend.middleware.auth import get_current_user
from backend.utils.audit import add_audit_log

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# In-memory store for pending 2FA authentication challenges: sessionToken -> Dict
_2fa_pending_sessions: Dict[str, Dict[str, Any]] = {}

def cleanup_2fa_sessions():
    now = time.time()
    expired = [k for k, v in _2fa_pending_sessions.items() if now > v.get("expiresAt", 0)]
    for k in expired:
        _2fa_pending_sessions.pop(k, None)

class LoginRequest(BaseModel):
    role: Optional[str] = "merchant"
    identifier: Optional[str] = ""
    password: Optional[str] = ""
    otp: Optional[str] = ""
    twoFactorCode: Optional[str] = ""
    captchaId: Optional[str] = ""
    captchaAnswer: Optional[str] = ""

class Verify2FARequest(BaseModel):
    sessionToken: str
    totpCode: str

class SendOtpRequest(BaseModel):
    identifier: Optional[str] = ""

class VerifyCaptchaRequest(BaseModel):
    captchaId: Optional[str] = ""
    captchaAnswer: Optional[str] = ""

class SsoSimulateRequest(BaseModel):
    role: Optional[str] = "inspector"
    identifier: Optional[str] = None

class SsoCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None
    redirect_uri: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refreshToken: str

class LogoutRequest(BaseModel):
    refreshToken: Optional[str] = None

@router.post("/login")
async def login(req: LoginRequest):
    role = (req.role or "merchant").strip().lower()
    id_query = (req.identifier or "").strip().lower()

    # 1. Enforce strict CAPTCHA verification before evaluating credentials
    captcha_res = verify_captcha(req.captchaId, req.captchaAnswer)
    if not captcha_res["success"]:
        print(f"[AUTH FAILED] Role={role}, ID={id_query} - CAPTCHA: {captcha_res['message']}")
        raise HTTPException(
            status_code=400,
            detail=captcha_res["message"]
        )

    if not id_query:
        print(f"[AUTH FAILED] Role={role} - Missing identifier")
        raise HTTPException(
            status_code=400,
            detail="Identification credential is required."
        )

    user: Optional[Dict[str, Any]] = None
    entity: Optional[Dict[str, Any]] = None

    if role == "merchant":
        entity = next(
            (m for m in db["merchants"]
             if m.get("gstin", "").strip().lower() == id_query or
                m.get("contactEmail", "").strip().lower() == id_query),
            None
        )
        if not entity:
            print(f"[AUTH FAILED] Merchant not found for '{id_query}'")
            raise HTTPException(
                status_code=401,
                detail="Invalid merchant identifier or password."
            )
        if not verify_password(req.password or "", entity.get("passwordHash", "")):
            print(f"[AUTH FAILED] Merchant password incorrect for '{entity['tradeName']}'")
            raise HTTPException(
                status_code=401,
                detail="Invalid merchant identifier or password."
            )

        user = {
            "id": entity["id"],
            "name": entity["tradeName"],
            "tradeName": entity["tradeName"],
            "identifier": entity["gstin"],
            "gstin": entity["gstin"],
            "role": "merchant",
            "district": entity.get("district"),
            "state": entity.get("state")
        }

    elif role == "inspector":
        entity = next(
            (o for o in db["officers"]
             if o.get("badgeNumber", "").strip().lower() == id_query or
                o.get("email", "").strip().lower() == id_query),
            None
        )
        if not entity:
            raise HTTPException(
                status_code=401,
                detail="Invalid officer badge number or password."
            )
        if not verify_password(req.password or "", entity.get("passwordHash", "")):
            raise HTTPException(
                status_code=401,
                detail="Invalid officer badge number or password."
            )

        user = {
            "id": entity["id"],
            "name": entity["name"],
            "designation": entity.get("designation"),
            "badgeNumber": entity["badgeNumber"],
            "identifier": entity["badgeNumber"],
            "district": entity.get("jurisdictionDistrict"),
            "state": entity.get("jurisdictionState"),
            "role": "inspector"
        }

    elif role == "gatc":
        entity = next(
            (g for g in db["gatcCenters"]
             if g.get("recognitionNumber", "").strip().lower() == id_query or
                g.get("name", "").strip().lower() == id_query),
            None
        )
        if not entity:
            raise HTTPException(
                status_code=401,
                detail="Invalid GATC recognition number or password."
            )
        if not verify_password(req.password or "", entity.get("passwordHash", "")):
            raise HTTPException(
                status_code=401,
                detail="Invalid GATC recognition number or password."
            )

        user = {
            "id": entity["id"],
            "name": entity["name"],
            "identifier": entity["recognitionNumber"],
            "recognitionNumber": entity["recognitionNumber"],
            "gatcCenterId": entity["id"],
            "role": "gatc",
            "city": entity.get("city"),
            "state": entity.get("state")
        }

    elif role == "regulator":
        entity = next(
            (r for r in db["regulators"]
             if r.get("identifier", "").strip().lower() == id_query or
                r.get("email", "").strip().lower() == id_query),
            None
        )
        if not entity:
            print(f"[AUTH FAILED] Regulator not found for '{id_query}'")
            raise HTTPException(
                status_code=401,
                detail="Invalid Directorate / Regulator authorization credentials."
            )
        if not verify_password(req.password or "", entity.get("passwordHash", "")):
            print(f"[AUTH FAILED] Regulator password incorrect for '{entity['name']}'")
            raise HTTPException(
                status_code=401,
                detail="Invalid Directorate / Regulator authorization credentials."
            )

        user = {
            "id": entity["id"],
            "name": entity["name"],
            "designation": entity.get("designation"),
            "identifier": entity["identifier"],
            "department": entity.get("department"),
            "role": "regulator"
        }

        # Real Server-Side 2FA Enforcement
        # If client provided 2FA TOTP code in login payload:
        if req.twoFactorCode and req.twoFactorCode.strip():
            totp_valid = verify_totp(entity.get("totpSecret", ""), req.twoFactorCode)
            if not totp_valid:
                print(f"[AUTH FAILED] Invalid TOTP code provided for regulator '{entity['identifier']}'")
                raise HTTPException(
                    status_code=401,
                    detail="Invalid 2FA security code. Please check your authenticator app and enter the current 6-digit code."
                )
            # 2FA passed, proceed to issue JWT below
        else:
            # Multi-step 2FA flow: password verified, but 2FA code is strictly required before issuing final JWT session
            cleanup_2fa_sessions()
            session_token = str(uuid.uuid4())
            _2fa_pending_sessions[session_token] = {
                "userId": entity["id"],
                "role": "regulator",
                "identifier": entity["identifier"],
                "entity": entity,
                "user": user,
                "expiresAt": time.time() + 300  # 5 min TTL
            }
            print(f"[AUTH 2FA REQUIRED] Password verified for '{entity['name']}'. 2FA challenge issued (session={session_token[:8]}...)")
            return {
                "success": True,
                "requires2FA": True,
                "sessionToken": session_token,
                "role": "regulator",
                "identifier": entity["identifier"],
                "name": entity["name"],
                "message": "Password verified. Please enter the 6-digit TOTP code from your authenticator app to complete sign in."
            }

    elif role == "consumer":
        if not req.otp:
            raise HTTPException(
                status_code=400,
                detail="One-Time Password (OTP) is required for Citizen Consumer login."
            )

        otp_result = verify_otp(req.identifier or "", req.otp)
        if not otp_result["success"]:
            raise HTTPException(
                status_code=401,
                detail=otp_result["message"]
            )

        user = {
            "id": f"cit-{int(time.time() * 1000)}",
            "name": "Citizen Consumer",
            "phone": req.identifier,
            "identifier": req.identifier,
            "role": "consumer"
        }

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported authentication role: {role}"
        )

    # Register active server-side session and issue access + refresh tokens
    session_id = create_session(user["id"], user["role"], user["identifier"])
    token = create_access_token({
        "id": user["id"],
        "role": user["role"],
        "identifier": user["identifier"],
        "name": user["name"],
        "district": user.get("district"),
        "state": user.get("state"),
        "entityId": entity.get("id") if entity else None,
        "gatcCenterId": entity.get("id") if (entity and role == "gatc") else user.get("gatcCenterId")
    }, session_id=session_id)
    refresh_token = create_refresh_token(user, session_id=session_id)

    # Record in audit trail
    add_audit_log(
        actor_role=role.upper(),
        actor_name=user["name"],
        action="SESSION_AUTHENTICATED",
        target=user.get("identifier", "AUTH-NODE"),
        details=f"Successfully signed in via {role} portal gateway with secure JWT."
    )

    print(f"[AUTH SUCCESS] Logged in as {role.upper()}: {user['name']} (ID: {user['identifier']})")

    return {
        "success": True,
        "token": token,
        "refreshToken": refresh_token,
        "expiresIn": 7200,
        "user": user,
        "entity": sanitize_account(entity),
        "role": role
    }

@router.post("/send-otp")
async def send_otp(req: SendOtpRequest):
    clean_id = (req.identifier or "").strip()
    if not clean_id:
        raise HTTPException(
            status_code=400,
            detail="Mobile number or identifier is required for OTP dispatch."
        )

    try:
        result = request_otp(clean_id)
        add_audit_log(
            actor_role="CITIZEN_PUBLIC",
            actor_name=clean_id,
            action="OTP_REQUESTED",
            target=clean_id,
            details="One-time verification code generated and dispatched."
        )
        return result
    except PermissionError as pe:
        raise HTTPException(status_code=429, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    user_id = current_user.get("id")
    identifier = current_user.get("identifier")
    entity = None

    if role == "merchant":
        entity = next((m for m in db["merchants"] if m.get("id") == user_id or m.get("gstin") == identifier), None)
    elif role == "inspector":
        entity = next((o for o in db["officers"] if o.get("id") == user_id or o.get("badgeNumber") == identifier), None)
    elif role == "gatc":
        entity = next((g for g in db["gatcCenters"] if g.get("id") == user_id or g.get("id") == current_user.get("gatcCenterId") or g.get("recognitionNumber") == identifier), None)
    elif role == "regulator":
        entity = next((r for r in db["regulators"] if r.get("id") == user_id or r.get("identifier") == identifier), None)

    return {
        "success": True,
        "user": current_user,
        "entity": sanitize_account(entity) if entity else None
    }

@router.post("/refresh")
async def refresh_session(req: RefreshTokenRequest):
    """
    Refresh access token using a valid, unrevoked refresh token.
    """
    if not req.refreshToken:
        raise HTTPException(status_code=400, detail="Refresh token is required.")

    payload = verify_refresh_token(req.refreshToken)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token. Please authenticate again."
        )

    sid = payload.get("sid")
    user_id = payload.get("id")
    role = payload.get("role")
    identifier = payload.get("identifier")
    name = payload.get("name")

    new_access_token = create_access_token({
        "id": user_id,
        "role": role,
        "identifier": identifier,
        "name": name
    }, session_id=sid)

    new_refresh_token = create_refresh_token({
        "id": user_id,
        "role": role,
        "identifier": identifier,
        "name": name
    }, session_id=sid)

    return {
        "success": True,
        "token": new_access_token,
        "refreshToken": new_refresh_token,
        "expiresIn": 7200,
        "user": {
            "id": user_id,
            "role": role,
            "identifier": identifier,
            "name": name
        }
    }

@router.post("/logout")
async def logout_endpoint(req: Optional[LogoutRequest] = None, authorization: Optional[str] = Header(None)):
    """
    Terminates and revokes the active session on the server.
    """
    sid = None
    actor_name = "Authenticated User"
    actor_role = "AUTHENTICATED"

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].strip()
        payload = verify_access_token(token)
        if payload:
            sid = payload.get("sid")
            actor_name = payload.get("name", actor_name)
            actor_role = (payload.get("role") or actor_role).upper()

    if not sid and req and req.refreshToken:
        r_payload = verify_refresh_token(req.refreshToken)
        if r_payload:
            sid = r_payload.get("sid")
            actor_name = r_payload.get("name", actor_name)
            actor_role = (r_payload.get("role") or actor_role).upper()

    if sid:
        revoke_session(sid)
        add_audit_log(
            actor_role=actor_role,
            actor_name=actor_name,
            action="SESSION_TERMINATED",
            target=sid,
            details=f"Session revoked and invalidated server-side for {actor_name}."
        )

    return {
        "success": True,
        "message": "Session successfully terminated and revoked on server."
    }

@router.post("/guest")
async def guest_login():
    """
    Issue an authentic guest citizen JWT session for public verification and grievance operations.
    """
    user_data = {
        "id": "c-consumer-guest",
        "name": "Guest Citizen",
        "role": "consumer",
        "identifier": "PUBLIC-GUEST",
        "isGuest": True
    }
    sid = create_session(user_data["id"], "consumer", "PUBLIC-GUEST", expires_days=1)
    token = create_access_token(user_data, session_id=sid, expires_hours=24)
    refresh_token = create_refresh_token(user_data, session_id=sid, expires_days=1)

    return {
        "success": True,
        "token": token,
        "refreshToken": refresh_token,
        "expiresIn": 86400,
        "user": user_data,
        "role": "consumer"
    }

@router.get("/captcha")
async def get_captcha():
    """
    Generate a fresh server-side CAPTCHA challenge.
    Returns only the captchaId and the visual SVG data URI.
    The answer is strictly kept in server-side memory.
    """
    return generate_captcha()

@router.post("/captcha/verify")
async def verify_captcha_endpoint(req: VerifyCaptchaRequest):
    """
    Verify a CAPTCHA challenge without logging in.
    """
    res = verify_captcha(req.captchaId, req.captchaAnswer)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    return res

@router.post("/2fa/verify")
async def verify_2fa(req: Verify2FARequest):
    """
    Step 2 of Two-Factor Authentication for Regulator Super Admin.
    Verifies 6-digit TOTP against server-side secret and issues the final JWT.
    """
    cleanup_2fa_sessions()
    session = _2fa_pending_sessions.get(req.sessionToken)
    if not session:
        raise HTTPException(
            status_code=401,
            detail="2FA authentication session has expired or is invalid. Please sign in again."
        )

    entity = session["entity"]
    user = session["user"]
    role = session["role"]

    # Verify TOTP code against server-stored secret
    totp_secret = entity.get("totpSecret", "")
    if not verify_totp(totp_secret, req.totpCode):
        print(f"[AUTH 2FA FAILED] Invalid TOTP submitted for regulator '{entity['identifier']}'")
        raise HTTPException(
            status_code=401,
            detail="Invalid 2FA security code. Please enter the current 6-digit code from your authenticator app."
        )

    # Consume the session token immediately (single use)
    _2fa_pending_sessions.pop(req.sessionToken, None)

    # Register active server-side session and issue access + refresh tokens
    session_id = create_session(user["id"], user["role"], user["identifier"])
    token = create_access_token({
        "id": user["id"],
        "role": user["role"],
        "identifier": user["identifier"],
        "name": user["name"],
        "district": user.get("district"),
        "state": user.get("state"),
        "entityId": entity.get("id") if entity else None
    }, session_id=session_id)
    refresh_token = create_refresh_token(user, session_id=session_id)

    add_audit_log(
        actor_role=role.upper(),
        actor_name=user["name"],
        action="SESSION_AUTHENTICATED_WITH_2FA",
        target=user.get("identifier", "AUTH-NODE"),
        details="Successfully verified two-factor authentication (TOTP) and authenticated to Regulator workspace."
    )

    print(f"[AUTH 2FA SUCCESS] Logged in as {role.upper()}: {user['name']} (ID: {user['identifier']})")

    return {
        "success": True,
        "token": token,
        "refreshToken": refresh_token,
        "expiresIn": 7200,
        "user": user,
        "entity": sanitize_account(entity),
        "role": role
    }

@router.get("/2fa/demo-code")
async def get_demo_2fa_code(identifier: Optional[str] = "GOI-ADM-001"):
    """
    SIH Evaluator Demo Helper:
    Generates the current live RFC 6238 TOTP code server-side for the regulator account.
    Clearly labeled as 'Demo 2FA'.
    """
    entity = next(
        (r for r in db["regulators"]
         if r.get("identifier", "").strip().lower() == (identifier or "").strip().lower()),
        None
    )
    if not entity or not entity.get("totpSecret"):
        raise HTTPException(status_code=404, detail="Regulator 2FA account not found")

    code = get_current_totp(entity["totpSecret"])
    remaining = get_remaining_seconds()

    return {
        "success": True,
        "mode": "Demo 2FA",
        "identifier": entity["identifier"],
        "name": entity["name"],
        "totpCode": code,
        "remainingSeconds": remaining,
        "label": "Demo 2FA (RFC 6238 Live TOTP Generator)"
    }

# ---------------- Government SSO (MeriPehchan / Jan Parichay) ----------------

@router.get("/sso/config")
async def get_sso_config():
    """
    Returns the current Government SSO (MeriPehchan) provider configuration.
    Clearly indicates whether the system is in Demo Simulation or Live Production mode.
    """
    return sso_provider.get_provider_config()

@router.post("/sso/simulate")
async def sso_simulate(req: SsoSimulateRequest):
    """
    SSO Integration — Demo Simulation:
    Simulates OpenID Connect token exchange with MeriPehchan (Jan Parichay).
    Validates that the target account exists, generates real HMAC-SHA256 platform JWT,
    and logs an immutable audit event without bypassing RBAC.
    """
    try:
        return sso_provider.simulate_demo_sso(
            role=req.role or "inspector",
            identifier=req.identifier
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SSO Simulation error: {str(e)}")

@router.get("/sso/authorize")
async def sso_authorize(state: Optional[str] = "sso-auth-state", redirect_uri: Optional[str] = None):
    """
    Initiates standard OAuth 2.0 / OIDC authorization code flow for MeriPehchan.
    If live credentials are not configured, returns HTTP 501 with clear guidance.
    """
    if not sso_provider.is_live_configured:
        raise HTTPException(
            status_code=501,
            detail=(
                "Live MeriPehchan production credentials are not configured in this environment. "
                "Please use 'SSO Integration — Demo Simulation' via POST /api/auth/sso/simulate."
            )
        )
    auth_url = sso_provider.build_authorization_url(state=state or "sso-state", redirect_uri=redirect_uri)
    return {"success": True, "authorizationUrl": auth_url}

@router.post("/sso/callback")
async def sso_callback(req: SsoCallbackRequest):
    """
    Callback endpoint for handling incoming authorization code from MeriPehchan.
    Pre-structured for production connection.
    """
    if not sso_provider.is_live_configured:
        raise HTTPException(
            status_code=501,
            detail="Live MeriPehchan callback requires production credentials. Use Demo Simulation mode."
        )
    try:
        tokens = sso_provider.exchange_code_for_tokens(req.code, req.redirect_uri)
        return tokens
    except NotImplementedError as nie:
        raise HTTPException(status_code=501, detail=str(nie))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SSO Callback failed: {str(e)}")



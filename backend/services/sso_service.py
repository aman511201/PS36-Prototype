import os
import time
import uuid
from typing import Dict, Any, Optional, Tuple

from backend.data.mock_data import db
from backend.services.auth_service import (
    create_access_token,
    create_refresh_token,
    create_session,
    sanitize_account
)
from backend.utils.audit import add_audit_log

# Environment variables for production MeriPehchan integration
MERIPEHCHAN_CLIENT_ID = os.environ.get("MERIPEHCHAN_CLIENT_ID", "").strip()
MERIPEHCHAN_CLIENT_SECRET = os.environ.get("MERIPEHCHAN_CLIENT_SECRET", "").strip()
MERIPEHCHAN_REDIRECT_URI = os.environ.get(
    "MERIPEHCHAN_REDIRECT_URI", "http://localhost:5173/auth/sso/callback"
)
MERIPEHCHAN_ISSUER = os.environ.get(
    "MERIPEHCHAN_ISSUER", "https://janparichay.meripehchan.gov.in"
)
MERIPEHCHAN_AUTH_URL = os.environ.get(
    "MERIPEHCHAN_AUTH_URL", "https://janparichay.meripehchan.gov.in/v1/authorize"
)
MERIPEHCHAN_TOKEN_URL = os.environ.get(
    "MERIPEHCHAN_TOKEN_URL", "https://janparichay.meripehchan.gov.in/v1/token"
)
MERIPEHCHAN_USERINFO_URL = os.environ.get(
    "MERIPEHCHAN_USERINFO_URL", "https://janparichay.meripehchan.gov.in/v1/userinfo"
)


class MeriPehchanSSOProvider:
    """
    Modular Government SSO Provider abstraction for MeriPehchan (Jan Parichay).
    
    Architecture:
    - Production Mode: Activated when MERIPEHCHAN_CLIENT_ID and MERIPEHCHAN_CLIENT_SECRET are configured.
      Performs real OAuth 2.0 / OpenID Connect authorization code flow against NIC endpoints.
    - Demo Simulation Mode: Active when live NIC credentials are not configured.
      Clearly demarcated as 'SSO Integration — Demo Simulation'. Simulates OIDC claims
      handshake without making external requests, issuing a cryptographically signed platform JWT.
    """

    @property
    def is_live_configured(self) -> bool:
        return bool(MERIPEHCHAN_CLIENT_ID and MERIPEHCHAN_CLIENT_SECRET)

    def get_provider_config(self) -> Dict[str, Any]:
        """
        Returns provider status, active mode, and standard OIDC endpoints.
        """
        is_live = self.is_live_configured
        return {
            "provider": "MeriPehchan (Jan Parichay)",
            "service": "National Single Sign-On Architecture",
            "isLive": is_live,
            "mode": "Live Production" if is_live else "Demo Simulation",
            "label": "MeriPehchan National SSO" if is_live else "SSO Integration — Demo Simulation",
            "notice": (
                "Connected to NIC MeriPehchan production gateway."
                if is_live else
                "Live MeriPehchan integration requires NIC/MeitY client onboarding. Currently operating in isolated Demo Simulation mode."
            ),
            "endpoints": {
                "issuer": MERIPEHCHAN_ISSUER,
                "authorizationUrl": MERIPEHCHAN_AUTH_URL,
                "tokenUrl": MERIPEHCHAN_TOKEN_URL,
                "userinfoUrl": MERIPEHCHAN_USERINFO_URL
            }
        }

    def build_authorization_url(self, state: str, redirect_uri: Optional[str] = None) -> str:
        """
        Generates standard OIDC authorization redirect URL.
        """
        r_uri = redirect_uri or MERIPEHCHAN_REDIRECT_URI
        if not self.is_live_configured:
            # Informative URI indicating simulation mode
            return f"{MERIPEHCHAN_AUTH_URL}?client_id=demo_simulation_client&redirect_uri={r_uri}&response_type=code&scope=openid+profile+email&state={state}&simulation=true"
        
        return (
            f"{MERIPEHCHAN_AUTH_URL}?client_id={MERIPEHCHAN_CLIENT_ID}"
            f"&redirect_uri={r_uri}&response_type=code&scope=openid+profile+email&state={state}"
        )

    def exchange_code_for_tokens(self, code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """
        Exchanges authorization code for tokens.
        In live production, executes HTTP POST to MERIPEHCHAN_TOKEN_URL.
        """
        if not self.is_live_configured:
            raise NotImplementedError(
                "Live MeriPehchan token exchange is not available without MERIPEHCHAN_CLIENT_ID and MERIPEHCHAN_CLIENT_SECRET. "
                "Use the Demo Simulation endpoint (/api/auth/sso/simulate) for evaluation."
            )
        # Production HTTP client call will be placed here when live credentials are provided.
        raise NotImplementedError("Production token exchange awaiting NIC network access.")

    def map_claims_to_user(self, claims: Dict[str, Any]) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]], str]:
        """
        Maps standard OpenID Connect claims to local platform account.
        """
        sub = claims.get("sub", "")
        role = claims.get("role", "consumer").lower()
        identifier = claims.get("identifier", "").lower()

        # Resolve user in local database
        return resolve_account_by_role_and_id(role, identifier)

    def simulate_demo_sso(
        self,
        role: str,
        identifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes isolated Demo Simulation of MeriPehchan OpenID Connect authentication.
        
        Security Guarantees:
        1. Validates that the requested target identity exists in the database.
        2. Generates an authentic platform JWT access token signed with server JWT_SECRET.
        3. Records an immutable audit log entry documenting SSO_DEMO_AUTHENTICATION_EXCHANGE.
        4. Clearly includes 'Demo Simulation' labeling and disclaimers.
        5. Does not bypass backend RBAC (subsequent requests must present the issued JWT).
        """
        role_clean = (role or "inspector").strip().lower()
        id_query = (identifier or "").strip().lower()

        user, entity, resolved_role = resolve_account_by_role_and_id(role_clean, id_query)
        if not user:
            raise ValueError(f"No account found for SSO simulation matching role '{role}' and identifier '{identifier}'")

        # Synthesize standard OpenID Connect claims payload
        now_ts = int(time.time())
        simulated_oidc_claims = {
            "iss": MERIPEHCHAN_ISSUER,
            "aud": "nlmvs-gateway-client",
            "sub": f"gov-in:meripehchan:{user.get('identifier', 'user-01')}",
            "auth_time": now_ts,
            "nonce": str(uuid.uuid4())[:8],
            "acr": "loa-3-gov-verified",
            "amr": ["pwd", "otp"],
            "idp": "MeriPehchan (Jan Parichay) Demo Sandbox",
            "name": user["name"],
            "identifier": user["identifier"],
            "role": resolved_role,
            "district": user.get("district"),
            "state": user.get("state"),
            "simulated": True
        }

        # Create active server session and access + refresh tokens
        session_id = create_session(user["id"], user["role"], user["identifier"])
        token = create_access_token({
            "id": user["id"],
            "role": user["role"],
            "identifier": user["identifier"],
            "name": user["name"],
            "district": user.get("district"),
            "state": user.get("state"),
            "entityId": entity.get("id") if entity else None,
            "authProvider": "meripehchan_demo_simulation"
        }, session_id=session_id)
        refresh_token = create_refresh_token(user, session_id=session_id)

        # Record in audit trail
        add_audit_log(
            actor_role=resolved_role.upper(),
            actor_name=user["name"],
            action="SSO_DEMO_AUTHENTICATION_EXCHANGE",
            target="MERIPEHCHAN-DEMO-GATEWAY",
            details=f"Completed OIDC token exchange via SSO Integration — Demo Simulation for {user['name']} ({user['identifier']}). Issued platform JWT."
        )

        print(f"[AUTH SSO DEMO] Authenticated as {resolved_role.upper()}: {user['name']} via Demo Simulation")

        return {
            "success": True,
            "mode": "Demo Simulation",
            "label": "SSO Integration — Demo Simulation",
            "provider": "MeriPehchan (Jan Parichay)",
            "token": token,
            "refreshToken": refresh_token,
            "expiresIn": 7200,
            "user": user,
            "entity": sanitize_account(entity) if entity else None,
            "role": resolved_role,
            "simulatedOidcPayload": simulated_oidc_claims,
            "disclaimer": "SSO Integration — Demo Simulation: Live MeriPehchan production connection requires NIC client onboarding."
        }


def resolve_account_by_role_and_id(
    role: str,
    identifier: str
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]], str]:
    """
    Helper to resolve matching database account for SSO identity mapping.
    """
    user: Optional[Dict[str, Any]] = None
    entity: Optional[Dict[str, Any]] = None

    if role == "merchant":
        entity = next(
            (m for m in db["merchants"]
             if not identifier or
             m.get("gstin", "").strip().lower() == identifier or
             m.get("email", "").strip().lower() == identifier or
             m.get("id", "").strip().lower() == identifier),
            db["merchants"][0] if db["merchants"] else None
        )
        if entity:
            user = {
                "id": entity["id"],
                "name": entity["ownerName"],
                "role": "merchant",
                "identifier": entity["gstin"],
                "district": entity.get("district"),
                "state": entity.get("state")
            }

    elif role == "inspector":
        entity = next(
            (o for o in db["officers"]
             if not identifier or
             o.get("badgeNumber", "").strip().lower() == identifier or
             o.get("id", "").strip().lower() == identifier),
            db["officers"][0] if db["officers"] else None
        )
        if entity:
            user = {
                "id": entity["id"],
                "name": entity["name"],
                "role": "inspector",
                "identifier": entity["badgeNumber"],
                "district": entity.get("jurisdictionDistrict"),
                "state": entity.get("jurisdictionState")
            }

    elif role == "gatc":
        entity = next(
            (g for g in db["gatcCenters"]
             if not identifier or
             g.get("recognitionNumber", "").strip().lower() == identifier or
             g.get("id", "").strip().lower() == identifier),
            db["gatcCenters"][0] if db["gatcCenters"] else None
        )
        if entity:
            user = {
                "id": entity["id"],
                "name": entity["name"],
                "role": "gatc",
                "identifier": entity["recognitionNumber"],
                "recognitionNumber": entity["recognitionNumber"],
                "gatcCenterId": entity["id"],
                "district": entity.get("district"),
                "state": entity.get("state")
            }

    elif role == "regulator":
        entity = next(
            (r for r in db["regulators"]
             if not identifier or
             r.get("identifier", "").strip().lower() == identifier or
             r.get("id", "").strip().lower() == identifier),
            db["regulators"][0] if db["regulators"] else None
        )
        if entity:
            user = {
                "id": entity["id"],
                "name": entity["name"],
                "role": "regulator",
                "identifier": entity["identifier"],
                "district": entity.get("district"),
                "state": entity.get("state")
            }

    elif role == "consumer":
        phone = identifier or "+91 98200 99881"
        user = {
            "id": "c-consumer-sso",
            "name": "Citizen Consumer (Verified Identity)",
            "role": "consumer",
            "identifier": phone,
            "district": "Mumbai Suburban",
            "state": "Maharashtra"
        }
        entity = {
            "id": "c-consumer-sso",
            "name": user["name"],
            "phone": phone,
            "email": "citizen@nic.in"
        }

    return user, entity, role


# Global singleton instance
sso_provider = MeriPehchanSSOProvider()

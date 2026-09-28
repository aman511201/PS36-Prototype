from typing import Optional, List, Callable
from fastapi import Header, HTTPException, Depends
from backend.services.auth_service import verify_access_token

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Authenticate Bearer JWT token from Authorization header.
    Returns decoded user payload or raises 401.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication token required. Please sign in."
        )

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0] != "Bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format. Expected 'Bearer <token>'."
        )

    token = parts[1].strip()
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Session expired or invalid token. Please authenticate again."
        )

    return payload

def require_role(*allowed_roles: str) -> Callable:
    """
    Dependency factory ensuring authenticated identity holds an authorized statutory role.
    Returns 403 Forbidden on authorization violation.
    """
    lower_roles = [r.lower() for r in allowed_roles]

    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = (current_user.get("role") or "").lower()
        if user_role not in lower_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access forbidden: Statutory role '{user_role.upper()}' is not permitted to access this resource."
            )
        return current_user

    return role_checker

async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """
    Extract user from Bearer token if present and valid; otherwise returns None without error.
    Used for public routes that benefit from user identity (e.g. consumer grievances).
    """
    if not authorization:
        return None

    parts = authorization.split(" ")
    if len(parts) == 2 and parts[0] == "Bearer":
        token = parts[1].strip()
        return verify_access_token(token)
    return None

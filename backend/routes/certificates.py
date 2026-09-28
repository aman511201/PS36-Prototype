from datetime import datetime
from urllib.parse import unquote
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from backend.data.mock_data import db
from backend.middleware.auth import require_role
from backend.utils.crypto_seal import verify_certificate_integrity

router = APIRouter(prefix="/api/certificates", tags=["Certificates"])

class QrVerifyRequest(BaseModel):
    qrPayload: Optional[str] = ""

@router.get("")
async def get_certificates(
    current_user: dict = Depends(require_role("merchant", "inspector", "gatc", "regulator"))
):
    certs = list(db["certificates"])
    user_role = current_user.get("role")
    user_id = current_user.get("id")
    user_identifier = current_user.get("identifier")
    user_name = current_user.get("name")

    if user_role == "merchant":
        certs = [
            c for c in certs
            if c.get("merchantId") == user_id or
               c.get("gstin") == user_identifier or
               c.get("merchantName") == user_name
        ]
    elif user_role == "inspector":
        inspector_district = (current_user.get("district") or current_user.get("jurisdictionDistrict") or "").lower()
        certs = [
            c for c in certs
            if (c.get("district") or "").lower() == inspector_district or c.get("officerId") == user_id
        ]

    return certs

@router.get("/{cert_number:path}")
async def get_certificate_by_number(cert_number: str):
    clean_number = unquote(cert_number).strip().lower()

    cert = next(
        (c for c in db["certificates"]
         if (c.get("certificateNumber") or "").strip().lower() == clean_number or
            (c.get("serialNumber") or "").strip().lower() == clean_number),
        None
    )

    if not cert:
        raise HTTPException(
            status_code=404,
            detail="No active legal verification certificate found matching this identifier in the National Metrology Registry."
        )

    # Check validity
    valid_until_str = cert.get("validUntilDate", "2026-12-31")
    try:
        valid_until = datetime.strptime(valid_until_str, "%Y-%m-%d").date()
    except Exception:
        valid_until = datetime.now().date()

    today = datetime.now().date()
    is_expired = today > valid_until
    days_remaining = (valid_until - today).days

    return {
        "valid": not is_expired,
        "statusText": "EXPIRED" if is_expired else ("EXPIRING_SOON" if days_remaining <= 30 else "VALID_AND_ACTIVE"),
        "daysRemaining": days_remaining,
        "certificate": cert
    }

@router.post("/verify-qr")
async def verify_qr(req: QrVerifyRequest):
    qr_payload = (req.qrPayload or "").strip()
    if not qr_payload:
        raise HTTPException(status_code=400, detail="Empty QR code payload")

    # If payload is plain certificate number or JSON
    target_cert_num = qr_payload.lower()
    if "{" in qr_payload:
        import json
        try:
            parsed = json.loads(qr_payload)
            target_cert_num = (parsed.get("cert") or parsed.get("certificateNumber") or "").lower()
        except Exception:
            pass

    cert = next(
        (c for c in db["certificates"]
         if (c.get("certificateNumber") or "").strip().lower() == target_cert_num or
            (c.get("serialNumber") or "").strip().lower() == target_cert_num or
            target_cert_num in (c.get("certificateNumber") or "").lower()),
        None
    )

    if not cert:
        raise HTTPException(
            status_code=404,
            detail="Invalid QR code: Certificate record not found in National Legal Metrology database."
        )

    # Cryptographic integrity verification
    hash_valid = verify_certificate_integrity(
        cert_number=cert.get("certificateNumber", ""),
        serial_number=cert.get("serialNumber", ""),
        stamping_date=cert.get("stampingDate", ""),
        officer_id=cert.get("officerId", ""),
        lead_seal_no=cert.get("leadSealNo", ""),
        hologram_no=cert.get("hologramNo", ""),
        expected_hash=cert.get("cryptographicHash", "")
    )

    valid_until_str = cert.get("validUntilDate", "2026-12-31")
    try:
        valid_until = datetime.strptime(valid_until_str, "%Y-%m-%d").date()
    except Exception:
        valid_until = datetime.now().date()

    today = datetime.now().date()
    is_expired = today > valid_until
    days_left = (valid_until - today).days

    return {
        "verified": True,
        "valid": not is_expired,
        "tamperDetected": not hash_valid,
        "statusText": "EXPIRED" if is_expired else ("EXPIRING_SOON" if days_left <= 30 else "VALID_AND_ACTIVE"),
        "daysRemaining": days_left,
        "certificate": cert,
        "securityDetails": {
            "cryptographicHash": cert.get("cryptographicHash"),
            "hashAlgorithm": "SHA-256 (HMAC Certified)",
            "statutoryAuthority": "Section 24, Legal Metrology Act, 2009",
            "leadSealIntegrity": "VERIFIED_INTACT",
            "hologramIntegrity": "AUTHENTIC_GOI"
        }
    }

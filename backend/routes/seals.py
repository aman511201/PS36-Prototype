from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, Optional, List
from datetime import datetime

from backend.data.mock_data import db
from backend.middleware.auth import require_role, get_current_user
from backend.utils.audit import add_audit_log

router = APIRouter(prefix="/api/seals", tags=["seals"])

def verify_seal_in_inventory(seal_number: str, expected_type: Optional[str] = None, officer_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Validates a physical seal or hologram barcode against the official government inventory.
    Returns a dict with 'valid': bool, and either 'seal' or 'reason'.
    """
    if not seal_number or not str(seal_number).strip():
        return {
            "valid": False,
            "reason": "Seal number is mandatory and cannot be empty"
        }

    s_clean = str(seal_number).strip()
    s_norm = s_clean.upper()

    # Search in seal inventory
    inventory = db.get("sealInventory", [])
    seal = next((s for s in inventory if str(s.get("sealNumber", "")).strip().upper() == s_norm), None)

    if not seal:
        return {
            "valid": False,
            "reason": f"Seal '{s_clean}' is not recognized in official government seal inventory"
        }

    # Verify type
    if expected_type:
        s_type = seal.get("sealType", "")
        if s_type.upper() != expected_type.upper():
            return {
                "valid": False,
                "reason": f"Security artifact '{s_clean}' is registered as {s_type}, not {expected_type}",
                "seal": seal
            }

    # Verify status
    s_status = seal.get("status", "AVAILABLE")
    if s_status == "ASSIGNED":
        cert_ref = seal.get("assignedToCertificateId") or seal.get("assignedToApplicationId") or "another instrument"
        return {
            "valid": False,
            "reason": f"Seal '{s_clean}' has already been affixed/assigned to certificate {cert_ref}",
            "seal": seal
        }
    elif s_status == "DEFECTIVE":
        defect = seal.get("defectReason") or "Flagged as defective in physical inventory"
        return {
            "valid": False,
            "reason": f"Seal '{s_clean}' is marked as DEFECTIVE ({defect}) and cannot be used",
            "seal": seal
        }
    elif s_status == "REVOKED":
        defect = seal.get("defectReason") or "Revoked by Central Directorate"
        return {
            "valid": False,
            "reason": f"Seal '{s_clean}' has been REVOKED by Central Directorate and cannot be affixed",
            "seal": seal
        }
    elif s_status != "AVAILABLE":
        return {
            "valid": False,
            "reason": f"Seal '{s_clean}' is unavailable for assignment (current status: {s_status})",
            "seal": seal
        }

    # Verify no previous certificate in db has already recorded this seal
    for c in db.get("certificates", []):
        c_lead = str(c.get("leadSealNo", "")).strip().upper()
        c_holo = str(c.get("hologramNo", "")).strip().upper()
        if s_norm == c_lead or s_norm == c_holo:
            return {
                "valid": False,
                "reason": f"Seal '{s_clean}' is already recorded on certificate {c.get('certificateNumber')}",
                "seal": seal
            }

    # Verify officer allocation if provided
    if officer_id and seal.get("officerId"):
        alloc_officer = str(seal.get("officerId")).lower()
        alloc_badge = str(seal.get("officerBadge", "")).lower()
        req_officer = str(officer_id).lower()
        # Allow standard matching or general pool
        if alloc_officer != "all" and req_officer not in [alloc_officer, alloc_badge]:
            return {
                "valid": False,
                "reason": f"Seal '{s_clean}' is allocated to officer '{seal.get('officerBadge') or alloc_officer}', not authorized for your officer credential",
                "seal": seal
            }

    return {
        "valid": True,
        "message": f"Seal verified authentic and available in government inventory (Batch: {seal.get('batchNumber')})",
        "seal": seal
    }

@router.get("/inventory")
async def get_seal_inventory(
    sealType: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    officerId: Optional[str] = Query(None),
    current_user: dict = Depends(require_role("inspector", "regulator"))
):
    inventory = db.get("sealInventory", [])
    results = inventory

    if current_user.get("role") == "inspector":
        if officerId and officerId != current_user.get("id"):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Cannot view seal inventory allocated to another officer."
            )
        target_officer = current_user.get("id")
    else:
        target_officer = officerId

    if sealType:
        results = [s for s in results if s.get("sealType", "").upper() == sealType.upper()]
    if status:
        results = [s for s in results if s.get("status", "").upper() == status.upper()]
    if current_user.get("role") == "inspector":
        results = [
            s for s in results 
            if s.get("officerId") in [target_officer, "ALL"] or 
               s.get("officerBadge") == current_user.get("badgeNumber")
        ]
    elif target_officer and target_officer.lower() != "all" and current_user.get("role") != "regulator":
        results = [
            s for s in results 
            if s.get("officerId") in [target_officer, "ALL"]
        ]

    return {
        "total": len(results),
        "seals": results
    }

@router.post("/validate")
async def validate_seal_endpoint(
    body: Dict[str, Any],
    current_user: dict = Depends(require_role("inspector", "regulator"))
):
    seal_number = body.get("sealNumber")
    seal_type = body.get("sealType")
    
    if current_user.get("role") == "inspector":
        if body.get("officerId") and body["officerId"] != current_user.get("id"):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Cannot validate seal under another officer's identity."
            )
        officer_id = current_user.get("id")
    else:
        officer_id = body.get("officerId") or current_user.get("id")

    res = verify_seal_in_inventory(
        seal_number=seal_number,
        expected_type=seal_type,
        officer_id=officer_id
    )

    if not res.get("valid"):
        return {
            "valid": False,
            "sealNumber": seal_number,
            "error": res.get("reason"),
            "seal": res.get("seal")
        }

    return {
        "valid": True,
        "sealNumber": seal_number,
        "sealType": res["seal"].get("sealType"),
        "message": res.get("message"),
        "seal": res.get("seal")
    }

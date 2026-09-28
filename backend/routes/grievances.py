import random
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status

from backend.data.mock_data import db
from backend.middleware.auth import require_role, get_optional_user
from backend.utils.audit import add_audit_log

router = APIRouter(prefix="/api/grievances", tags=["Consumer Grievances"])

@router.get("")
async def get_grievances(
    current_user: dict = Depends(require_role("inspector", "regulator"))
):
    if current_user.get("role") == "inspector":
        inspector_district = (current_user.get("district") or current_user.get("jurisdictionDistrict") or "").lower()
        return [
            g for g in db["grievances"]
            if (g.get("district") or "").lower() == inspector_district or g.get("assignedOfficerId") == current_user.get("id")
        ]
    return db["grievances"]

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_grievance(
    b: Dict[str, Any],
    current_user: Optional[dict] = Depends(get_optional_user)
):
    grv_id = f"GRV-2026-{random.randint(1000, 9999)}"

    # Match nearest LMO if district provided
    target_dist = (b.get("district") or "").lower()
    matched_officer = next(
        (o for o in db["officers"] if (o.get("jurisdictionDistrict") or "").lower() == target_dist),
        None
    )

    complainant_name = b.get("complainantName") or (current_user.get("name") if current_user else "Anonymous Consumer")
    complainant_phone = b.get("complainantPhone") or (current_user.get("phone") or current_user.get("identifier") if current_user else "Confidential")

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    new_grievance = {
        "id": grv_id,
        "complainantName": complainant_name,
        "complainantPhone": complainant_phone,
        "merchantName": b.get("merchantName"),
        "merchantAddress": b.get("merchantAddress") or f"{b.get('district', 'District')}, {b.get('state', 'State')}",
        "district": b.get("district") or "Mumbai Suburban",
        "state": b.get("state") or "Maharashtra",
        "instrumentSerialOrDetails": b.get("instrumentSerialOrDetails") or "Scale at premise",
        "complaintType": b.get("complaintType") or "Short Measure / Underweight",
        "description": b.get("description"),
        "evidencePhotoUrl": b.get("evidencePhotoUrl") or None,
        "submittedAt": now_str,
        "status": "INSPECTOR_ASSIGNED",
        "assignedOfficerId": matched_officer["id"] if matched_officer else None,
        "assignedOfficerName": matched_officer["name"] if matched_officer else "Unassigned (Pending District Routing)",
        "officerRemarks": "Grievance assigned automatically. Inspection order initiated." if matched_officer else "Grievance queued for regional controller officer assignment."
    }

    db["grievances"].insert(0, new_grievance)

    actor_role = current_user.get("role", "CITIZEN_PUBLIC").upper() if current_user else "CITIZEN_PUBLIC"
    add_audit_log(
        actor_role=actor_role,
        actor_name=new_grievance["complainantName"],
        action="CONSUMER_GRIEVANCE_LODGED",
        target=new_grievance["id"],
        details=f"Filed complaint against {new_grievance['merchantName']} ({new_grievance['complaintType']}) in {new_grievance['district']}."
    )

    return new_grievance

@router.put("/{grv_id}")
async def update_grievance(
    grv_id: str,
    b: Dict[str, Any],
    current_user: dict = Depends(require_role("inspector", "regulator"))
):
    grv_index = next((idx for idx, g in enumerate(db["grievances"]) if g.get("id") == grv_id), -1)
    if grv_index == -1:
        raise HTTPException(status_code=404, detail="Grievance not found")

    target_grv = db["grievances"][grv_index]
    if current_user.get("role") == "inspector":
        inspector_district = (current_user.get("district") or current_user.get("jurisdictionDistrict") or "").lower()
        grv_district = (target_grv.get("district") or "").lower()
        is_assigned = (target_grv.get("assignedOfficerId") == current_user.get("id"))
        if not (is_assigned or (grv_district == inspector_district and bool(inspector_district))):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Cannot update grievance outside your jurisdiction or assignment."
            )

    updated = {**db["grievances"][grv_index], **b}
    db["grievances"][grv_index] = updated

    add_audit_log(
        actor_role=current_user.get("role", "INSPECTOR").upper(),
        actor_name=current_user.get("name") or updated.get("assignedOfficerName") or "LMO Inspector",
        action="GRIEVANCE_STATUS_UPDATED",
        target=updated["id"],
        details=f"Grievance status changed to {updated.get('status')}. Remarks: {updated.get('officerRemarks', 'None')}"
    )

    return updated

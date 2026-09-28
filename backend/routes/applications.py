import time
import random
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, status

from backend.data.mock_data import db
from backend.middleware.auth import require_role
from backend.utils.fee_calculator import calculate_statutory_fee
from backend.utils.mpe_calculator import calculate_mpe
from backend.utils.crypto_seal import generate_certificate_hash
from backend.utils.audit import add_audit_log
from backend.routes.seals import verify_seal_in_inventory

from backend.middleware.auth import get_optional_user

router = APIRouter(prefix="/api/applications", tags=["Applications"])

def add_timeline_event(
    application: Dict[str, Any],
    status: str,
    title: str,
    actor_name: str,
    actor_role: str,
    description: str
):
    if "timeline" not in application or not isinstance(application["timeline"], list):
        application["timeline"] = []
    application["timeline"].append({
        "id": f"evt-{int(time.time() * 1000)}-{random.randint(100, 999)}",
        "status": status,
        "title": title,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "actor": actor_name,
        "actorRole": actor_role,
        "description": description
    })

def ensure_application_timeline(application: Dict[str, Any]) -> Dict[str, Any]:
    if application.get("timeline") and len(application["timeline"]) > 0:
        return application
    
    events = []
    sub_date = application.get("submissionDate") or application.get("submittedDate") or "2026-09-22"
    merchant_name = application.get("merchantName") or "Applicant Merchant"
    cat = application.get("instrumentCategory") or "Instrument"
    sn = application.get("serialNumber") or "N/A"
    fee = application.get("statutoryFee") or 300
    ref = (
        application.get("paymentTransactionRef") or
        application.get("paymentReceiptNumber") or
        application.get("paymentReference") or
        "TXN-CONFIRMED"
    )
    officer_name = application.get("assignedOfficerName") or "Legal Metrology Officer"
    district = application.get("district") or "District Jurisdiction"

    # 1. Submission
    events.append({
        "id": f"evt-seed-1-{application.get('id', 'app')}",
        "status": "SUBMITTED",
        "title": "Application Submitted",
        "timestamp": f"{sub_date} 10:00",
        "actor": merchant_name,
        "actorRole": "MERCHANT",
        "description": f"Statutory verification application filed for {cat} (S/N: {sn})."
    })

    # If linked to repair
    if application.get("originalApplicationId") or application.get("repairDeclaration"):
        rep_decl = application.get("repairDeclaration") or {}
        events.append({
            "id": f"evt-seed-rep-{application.get('id', 'app')}",
            "status": "REPAIR_DECLARED",
            "title": "Statutory Repair Declaration Recorded",
            "timestamp": f"{sub_date} 10:01",
            "actor": rep_decl.get("repairedBy") or merchant_name,
            "actorRole": "REPAIRER",
            "description": f"Repair completed by {rep_decl.get('repairedBy', 'Authorized Technician')} ({rep_decl.get('repairAgency', 'Agency')}). Details: {rep_decl.get('repairDetails', 'Recalibration & servicing')}."
        })

    # 2. Payment
    events.append({
        "id": f"evt-seed-2-{application.get('id', 'app')}",
        "status": "PAYMENT_CONFIRMED",
        "title": "Statutory Fee Confirmed",
        "timestamp": f"{sub_date} 10:05",
        "actor": "BharatKosh / Statutory Treasury",
        "actorRole": "SYSTEM",
        "description": f"Statutory verification fee of ₹{fee} confirmed (Ref: {ref})."
    })

    # 3. Officer assignment
    events.append({
        "id": f"evt-seed-3-{application.get('id', 'app')}",
        "status": "OFFICER_ASSIGNED",
        "title": "Legal Metrology Officer Assigned",
        "timestamp": f"{sub_date} 11:30",
        "actor": officer_name,
        "actorRole": "INSPECTOR",
        "description": f"Assigned to {officer_name} for verification inspection in {district}."
    })

    # 4. Scheduling
    if application.get("scheduledDateTime"):
        events.append({
            "id": f"evt-seed-4-{application.get('id', 'app')}",
            "status": "INSPECTION_SCHEDULED",
            "title": "Inspection Appointment Scheduled",
            "timestamp": f"{sub_date} 14:00",
            "actor": officer_name,
            "actorRole": "INSPECTOR",
            "description": f"On-site verification inspection scheduled for {application.get('scheduledDateTime')}."
        })

    # 5. Outcome
    if application.get("status") == "VERIFIED_STAMPED":
        events.append({
            "id": f"evt-seed-5-{application.get('id', 'app')}",
            "status": "VERIFICATION_PASSED",
            "title": "Statutory Verification Completed",
            "timestamp": application.get("lastVerificationDate") or f"{sub_date} 16:00",
            "actor": officer_name,
            "actorRole": "INSPECTOR",
            "description": "Instrument passed all statutory verification tests within permissible MPE limits."
        })
        events.append({
            "id": f"evt-seed-6-{application.get('id', 'app')}",
            "status": "CERTIFICATE_ISSUED",
            "title": "Certificate of Verification Issued",
            "timestamp": application.get("lastVerificationDate") or f"{sub_date} 16:15",
            "actor": officer_name,
            "actorRole": "INSPECTOR",
            "description": f"Form B Certificate #{application.get('certificateNumber', 'CERT-ISSUED')} issued and security seals affixed."
        })
    elif application.get("status") == "REJECTED":
        events.append({
            "id": f"evt-seed-5-{application.get('id', 'app')}",
            "status": "VERIFICATION_FAILED",
            "title": "Verification Non-Compliant (Notice Issued)",
            "timestamp": f"{sub_date} 16:00",
            "actor": officer_name,
            "actorRole": "INSPECTOR",
            "description": application.get("notes") or "Verification failed. Rectification notice issued under Section 24."
        })
    elif application.get("status") == "CANCELLED":
        events.append({
            "id": f"evt-seed-5-{application.get('id', 'app')}",
            "status": "APPLICATION_CANCELLED",
            "title": "Application Cancelled",
            "timestamp": f"{sub_date} 15:00",
            "actor": merchant_name,
            "actorRole": "MERCHANT",
            "description": application.get("cancellationReason") or "Application cancelled by applicant."
        })

    application["timeline"] = events
    return application

@router.post("/quote-fee")
async def quote_fee_for_application(
    body: Dict[str, Any],
    current_user: Optional[dict] = Depends(get_optional_user)
):
    from backend.routes.payments import quote_statutory_fee
    return await quote_statutory_fee(body, current_user)

@router.get("")
async def get_applications(
    merchantId: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    officerId: Optional[str] = Query(None),
    current_user: dict = Depends(require_role("merchant", "inspector", "regulator"))
):
    user_role = current_user.get("role")
    user_id = current_user.get("id")

    if user_role == "merchant":
        if merchantId and merchantId != user_id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Merchant cannot view applications of another establishment."
            )
        filtered = [a for a in db["applications"] if a.get("merchantId") == user_id]
    elif user_role == "inspector":
        inspector_district = (current_user.get("district") or current_user.get("jurisdictionDistrict") or "").lower()
        if officerId and officerId != user_id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Legal Metrology Officer cannot view applications assigned to another officer."
            )
        if district and district.lower() != inspector_district:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Legal Metrology Officer cannot query applications outside assigned jurisdiction."
            )
        filtered = [
            a for a in db["applications"]
            if (a.get("district") or "").lower() == inspector_district or a.get("assignedOfficerId") == user_id
        ]
    elif merchantId:
        filtered = [a for a in db["applications"] if a.get("merchantId") == merchantId]
    else:
        filtered = list(db["applications"])

    if status:
        filtered = [a for a in filtered if a.get("status") == status]
    if district and user_role != "inspector":
        filtered = [a for a in filtered if (a.get("district") or "").lower() == district.lower()]
    if officerId and user_role != "inspector":
        filtered = [a for a in filtered if a.get("assignedOfficerId") == officerId]

    for app in filtered:
        ensure_application_timeline(app)

    return filtered

@router.get("/{app_id}")
async def get_application_by_id(
    app_id: str,
    current_user: dict = Depends(require_role("merchant", "inspector", "regulator"))
):
    app = next((a for a in db["applications"] if a.get("id") == app_id), None)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    user_role = current_user.get("role")
    user_id = current_user.get("id")

    if user_role == "merchant" and app.get("merchantId") != user_id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Cannot access application belonging to another merchant."
        )
    elif user_role == "inspector":
        inspector_district = (current_user.get("district") or current_user.get("jurisdictionDistrict") or "").lower()
        app_dist = (app.get("district") or "").lower()
        is_assigned = (app.get("assignedOfficerId") == user_id)
        if not (is_assigned or (app_dist == inspector_district and bool(inspector_district))):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Officer cannot access applications outside assigned jurisdiction."
            )

    ensure_application_timeline(app)
    return app

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_application(
    b: Dict[str, Any],
    current_user: dict = Depends(require_role("merchant", "regulator"))
):
    user_role = current_user.get("role")
    user_id = current_user.get("id")

    if user_role == "merchant":
        if b.get("merchantId") and b["merchantId"] != user_id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Cannot submit verification application for another merchant."
            )
        target_merchant_id = user_id
    elif user_role == "regulator":
        target_merchant_id = b.get("merchantId") or user_id
    else:
        raise HTTPException(status_code=403, detail="Unauthorized role for application submission")

    merchant_obj = next(
        (m for m in db["merchants"] if m.get("id") == target_merchant_id or m.get("gstin") == current_user.get("identifier")),
        None
    )
    if not merchant_obj:
        raise HTTPException(
            status_code=404,
            detail=f"Authoritative merchant establishment '{target_merchant_id}' not found in registry."
        )

    # Authoritative merchant details derived strictly from database
    auth_merchant_id = merchant_obj["id"]
    auth_merchant_name = merchant_obj.get("tradeName")
    auth_district = merchant_obj.get("district")
    auth_state = merchant_obj.get("state")

    inst_id = b.get("instrumentId")
    inst = None

    # Determine application type and check for Re-verification After Repair
    application_type = b.get("applicationType") or ("Periodic Renewal Verification" if inst_id else "Initial Verification of New Instrument")
    is_reverification = "re-verification" in application_type.lower() or "repair" in application_type.lower() or bool(b.get("originalApplicationId"))

    orig_app = None
    repair_decl = None
    if is_reverification:
        orig_app_id = b.get("originalApplicationId")
        if not orig_app_id:
            raise HTTPException(
                status_code=400,
                detail="Original failed application ID (originalApplicationId) is mandatory for Re-verification After Repair."
            )
        orig_app = next((a for a in db["applications"] if a.get("id") == orig_app_id), None)
        if not orig_app:
            raise HTTPException(
                status_code=404,
                detail=f"Original application '{orig_app_id}' not found in national registry."
            )
        if user_role == "merchant" and orig_app.get("merchantId") != auth_merchant_id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Cannot request re-verification for another merchant establishment's application."
            )
        if orig_app.get("status") != "REJECTED":
            raise HTTPException(
                status_code=400,
                detail=f"Application '{orig_app_id}' has status '{orig_app.get('status')}'. Re-verification is only permitted for rejected/failed verification records."
            )
        repair_decl = b.get("repairDeclaration")
        if not repair_decl or not isinstance(repair_decl, dict):
            raise HTTPException(
                status_code=400,
                detail="Statutory repair declaration is mandatory for Re-verification After Repair."
            )
        for field in ["repairDetails", "repairedBy", "repairAgency", "repairDate"]:
            if not repair_decl.get(field) or not str(repair_decl.get(field)).strip():
                raise HTTPException(
                    status_code=400,
                    detail=f"Repair declaration field '{field}' is mandatory for Re-verification After Repair."
                )

        if not inst_id and orig_app.get("instrumentId"):
            inst_id = orig_app.get("instrumentId")
            inst = next((i for i in db["instruments"] if i.get("id") == inst_id), None)

    # Check instrument ownership if instrumentId provided
    if inst_id and not inst:
        inst = next((i for i in db["instruments"] if i.get("id") == inst_id), None)
        if not inst:
            raise HTTPException(status_code=404, detail=f"Instrument '{inst_id}' not found in registry.")
        if user_role == "merchant" and inst.get("merchantId") != merchant_obj["id"]:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Cannot submit verification application for an instrument belonging to another merchant."
            )

    if inst:
        # Anti-tampering check: applicants cannot alter fee-driving attributes of a registered instrument
        inst_cat = inst.get("category") or inst.get("instrumentCategory")
        inst_cap = inst.get("maxCapacityKg")
        inst_acc = inst.get("accuracyClass")

        client_cat = b.get("instrumentCategory") or b.get("category")
        client_cap = b.get("maxCapacityKg") if b.get("maxCapacityKg") is not None else b.get("capacityKg")
        client_acc = b.get("accuracyClass")

        if client_cat and client_cat != inst_cat:
            raise HTTPException(
                status_code=400,
                detail=f"Tampering detected: Submitted category '{client_cat}' does not match registered instrument category '{inst_cat}'."
            )
        if client_cap is not None:
            try:
                if float(client_cap) != float(inst_cap):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Tampering detected: Submitted capacity {client_cap}kg does not match registered instrument capacity {inst_cap}kg."
                    )
            except (ValueError, TypeError):
                pass
        if client_acc and client_acc != inst_acc:
            raise HTTPException(
                status_code=400,
                detail=f"Tampering detected: Submitted accuracy class '{client_acc}' does not match registered instrument accuracy class '{inst_acc}'."
            )

        today_str = datetime.now().strftime("%Y-%m-%d")
        valid_until = inst.get("validUntilDate") or ""
        is_late = (
            inst.get("status") == "EXPIRED" or
            (bool(valid_until) and valid_until < today_str) or
            "Overdue" in application_type or
            bool(b.get("isLate"))
        )

        fee_info = calculate_statutory_fee({
            "category": inst_cat,
            "capacityKg": inst_cap,
            "accuracyClass": inst_acc,
            "isLate": is_late
        })
    else:
        # Initial verification for new unregistered instrument
        fee_info = calculate_statutory_fee({
            "category": b.get("instrumentCategory") or b.get("category"),
            "capacityKg": b.get("maxCapacityKg") if b.get("maxCapacityKg") is not None else b.get("capacityKg"),
            "accuracyClass": b.get("accuracyClass"),
            "isLate": bool(b.get("isLate")) or "Overdue" in application_type
        })

    # Payment validation: backend must reject application submission when required payment is not successfully confirmed
    payment_id = b.get("paymentId")
    if not payment_id:
        raise HTTPException(
            status_code=402,
            detail="Payment confirmation required: Verification application cannot be submitted without a confirmed statutory fee payment."
        )

    payment = next((p for p in db.get("payments", []) if p.get("id") == payment_id), None)
    if not payment:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid payment reference: Payment record '{payment_id}' not found."
        )

    if user_role == "merchant" and payment.get("merchantId") != auth_merchant_id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Cannot use a payment receipt belonging to another merchant establishment."
        )

    if payment.get("status") != "SUCCESS":
        raise HTTPException(
            status_code=402,
            detail=f"Payment not confirmed: Current payment status is '{payment.get('status')}'. Statutory fee payment must be confirmed before application submission."
        )

    if payment.get("applicationId"):
        raise HTTPException(
            status_code=400,
            detail=f"Payment already utilized: Payment '{payment_id}' is already attached to application '{payment.get('applicationId')}'."
        )

    if payment.get("amount") != fee_info["totalFee"]:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount mismatch: Required statutory fee is ₹{fee_info['totalFee']}, but payment was ₹{payment.get('amount')}."
        )

    app_id = f"APP-2026-{random.randint(1000, 9999)}"

    # assign officer strictly by merchant's authoritative district
    target_district = (auth_district or "").lower()
    matched_officer = next(
        (o for o in db["officers"] if (o.get("jurisdictionDistrict") or "").lower() == target_district),
        None
    )

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    new_app = {
        "id": app_id,
        "instrumentId": inst_id,
        "merchantId": auth_merchant_id,
        "merchantName": auth_merchant_name,
        "applicationType": application_type,
        "instrumentCategory": (inst.get("category") or inst.get("instrumentCategory")) if inst else (orig_app.get("instrumentCategory") if orig_app else b.get("instrumentCategory")),
        "brand": inst.get("brand") if inst else (orig_app.get("brand") if orig_app else b.get("brand")),
        "model": inst.get("model") if inst else (orig_app.get("model") if orig_app else b.get("model")),
        "serialNumber": inst.get("serialNumber") if inst else (orig_app.get("serialNumber") if orig_app else b.get("serialNumber")),
        "accuracyClass": inst.get("accuracyClass") if inst else (orig_app.get("accuracyClass") if orig_app else b.get("accuracyClass")),
        "maxCapacityKg": inst.get("maxCapacityKg") if inst else (orig_app.get("maxCapacityKg") if orig_app else b.get("maxCapacityKg")),
        "verificationInterval_e": inst.get("verificationInterval_e") if inst else (orig_app.get("verificationInterval_e") if orig_app else b.get("verificationInterval_e")),
        "district": auth_district,
        "state": auth_state,
        "statutoryFee": fee_info["totalFee"],
        "paymentStatus": "PAID",
        "paymentId": payment["id"],
        "paymentReference": payment.get("transactionReference"),
        "paymentReceiptNumber": payment.get("receiptNumber"),
        "paymentMode": payment.get("paymentMode", "SIMULATED_DEMO_PAYMENT"),
        "isSimulatedPayment": True,
        "status": "UNDER_REVIEW",
        "submittedDate": now_str,
        "preferredInspectionDate": b.get("preferredInspectionDate"),
        "scheduledDateTime": None,
        "assignedOfficerId": matched_officer["id"] if matched_officer else None,
        "assignedOfficerName": matched_officer["name"] if matched_officer else "Pending District Officer Allocation",
        "notes": b.get("notes") or f"Statutory fee ₹{fee_info['totalFee']} paid via {payment.get('gateway')} (Receipt: {payment.get('receiptNumber')}).",
        "timeline": []
    }

    if is_reverification and orig_app:
        new_app["originalApplicationId"] = orig_app["id"]
        new_app["repairDeclaration"] = repair_decl
        orig_app["reVerificationApplicationId"] = app_id

    # Populate initial application timeline
    new_app["timeline"].append({
        "id": f"evt-{int(time.time() * 1000)}-1",
        "status": "SUBMITTED",
        "title": "Application Submitted",
        "timestamp": now_str,
        "actor": auth_merchant_name,
        "actorRole": "MERCHANT",
        "description": f"Verification application submitted for {new_app['instrumentCategory']} (S/N: {new_app['serialNumber']})."
    })

    if is_reverification and repair_decl:
        new_app["timeline"].append({
            "id": f"evt-{int(time.time() * 1000)}-decl",
            "status": "REPAIR_DECLARED",
            "title": "Statutory Repair Declaration Recorded",
            "timestamp": now_str,
            "actor": repair_decl.get("repairedBy", auth_merchant_name),
            "actorRole": "REPAIRER",
            "description": f"Serviced by {repair_decl.get('repairedBy')} ({repair_decl.get('repairAgency')}) on {repair_decl.get('repairDate')}. Work details: {repair_decl.get('repairDetails')}."
        })

    new_app["timeline"].append({
        "id": f"evt-{int(time.time() * 1000)}-2",
        "status": "PAYMENT_CONFIRMED",
        "title": "Statutory Fee Confirmed",
        "timestamp": now_str,
        "actor": "BharatKosh / Statutory Treasury",
        "actorRole": "SYSTEM",
        "description": f"Statutory fee ₹{new_app['statutoryFee']} confirmed (Receipt: {payment.get('receiptNumber')})."
    })

    new_app["timeline"].append({
        "id": f"evt-{int(time.time() * 1000)}-3",
        "status": "OFFICER_ASSIGNED",
        "title": "Legal Metrology Officer Assigned",
        "timestamp": now_str,
        "actor": matched_officer["name"] if matched_officer else "Pending District Officer Allocation",
        "actorRole": "INSPECTOR",
        "description": f"Assigned to {matched_officer['name'] if matched_officer else 'District Office'} for {auth_district} district."
    })

    if b.get("preferredInspectionDate"):
        new_app["timeline"].append({
            "id": f"evt-{int(time.time() * 1000)}-4",
            "status": "INSPECTION_PENDING",
            "title": "Preferred Inspection Date Requested",
            "timestamp": now_str,
            "actor": auth_merchant_name,
            "actorRole": "MERCHANT",
            "description": f"Merchant requested preferred on-site inspection for {b.get('preferredInspectionDate')}."
        })

    payment["applicationId"] = app_id
    db["applications"].insert(0, new_app)

    # If instrument exists, set status to PENDING_INSPECTION
    if inst_id and inst:
        inst["status"] = "PENDING_INSPECTION"

    add_audit_log(
        actor_role=user_role.upper(),
        actor_name=new_app["merchantName"],
        action="VERIFICATION_APPLICATION_SUBMITTED",
        target=new_app["id"],
        details=f"Application for {new_app['instrumentCategory']} (S/N: {new_app['serialNumber']}). Statutory fee ₹{new_app['statutoryFee']} paid (Receipt: {payment.get('receiptNumber')})."
    )

    return new_app

@router.post("/{app_id}/reschedule")
async def reschedule_application(
    app_id: str,
    body: Dict[str, Any],
    current_user: dict = Depends(require_role("merchant", "inspector", "regulator"))
):
    application = next((a for a in db["applications"] if a.get("id") == app_id), None)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    user_role = current_user.get("role")
    user_id = current_user.get("id")

    if user_role == "merchant" and application.get("merchantId") != user_id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You cannot reschedule an application belonging to another establishment."
        )
    elif user_role == "inspector":
        inspector_district = (current_user.get("district") or current_user.get("jurisdictionDistrict") or "").lower()
        app_dist = (application.get("district") or "").lower()
        is_assigned = (application.get("assignedOfficerId") == user_id)
        if not (is_assigned or (app_dist == inspector_district and bool(inspector_district))):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Officer cannot reschedule applications outside assigned jurisdiction."
            )

    if application.get("status") in ["VERIFIED_STAMPED", "CANCELLED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reschedule an application with status '{application.get('status')}'."
        )

    rescheduled_date = body.get("rescheduledDate") or body.get("scheduledDateTime") or body.get("preferredInspectionDate")
    if not rescheduled_date or not str(rescheduled_date).strip():
        raise HTTPException(status_code=400, detail="Rescheduled date and time is mandatory.")

    rescheduled_str = str(rescheduled_date).strip()
    reason = body.get("reason") or "Operational convenience / Applicant schedule adjustment"
    officer_response = body.get("officerResponse") or body.get("officerRemarks") or "Rescheduled slot noted by inspection authority."

    application["scheduledDateTime"] = rescheduled_str
    application["preferredInspectionDate"] = rescheduled_str
    application["rescheduleReason"] = reason
    application["officerResponse"] = officer_response
    if application.get("status") in ["UNDER_REVIEW", "SUBMITTED"]:
        application["status"] = "INSPECTION_SCHEDULED"

    actor_name = current_user.get("name") or (application.get("merchantName") if user_role == "merchant" else "Legal Metrology Officer")

    add_timeline_event(
        application=application,
        status="INSPECTION_RESCHEDULED",
        title="Inspection Appointment Rescheduled",
        actor_name=actor_name,
        actor_role=user_role.upper(),
        description=f"Appointment updated to {rescheduled_str}. Reason: {reason}. Officer Note: {officer_response}"
    )

    add_audit_log(
        actor_role=user_role.upper(),
        actor_name=actor_name,
        action="APPLICATION_RESCHEDULED",
        target=application["id"],
        details=f"Appointment updated to {rescheduled_str}. Reason: {reason}"
    )

    return {
        "success": True,
        "message": f"Inspection appointment successfully rescheduled to {rescheduled_str}.",
        "application": application
    }

@router.post("/{app_id}/cancel")
async def cancel_application(
    app_id: str,
    body: Dict[str, Any],
    current_user: dict = Depends(require_role("merchant", "regulator"))
):
    application = next((a for a in db["applications"] if a.get("id") == app_id), None)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    user_role = current_user.get("role")
    user_id = current_user.get("id")

    if user_role == "merchant" and application.get("merchantId") != user_id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You cannot cancel an application belonging to another merchant."
        )

    if application.get("status") == "VERIFIED_STAMPED":
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel an application that has already been verified and stamped."
        )

    if application.get("status") == "CANCELLED":
        raise HTTPException(status_code=400, detail="Application is already cancelled.")

    reason = body.get("reason")
    if not reason or not str(reason).strip():
        raise HTTPException(status_code=400, detail="Cancellation reason is mandatory.")

    actor_name = current_user.get("name") or application.get("merchantName")
    reason_str = str(reason).strip()

    application["status"] = "CANCELLED"
    application["cancellationReason"] = reason_str

    # Revert linked instrument status if it was pending inspection
    if application.get("instrumentId"):
        inst = next((i for i in db["instruments"] if i.get("id") == application.get("instrumentId")), None)
        if inst and inst.get("status") == "PENDING_INSPECTION":
            inst["status"] = "UNVERIFIED"

    add_timeline_event(
        application=application,
        status="APPLICATION_CANCELLED",
        title="Application Cancelled",
        actor_name=actor_name,
        actor_role=user_role.upper(),
        description=f"Application cancelled. Reason: {reason_str}"
    )

    add_audit_log(
        actor_role=user_role.upper(),
        actor_name=actor_name,
        action="APPLICATION_CANCELLED",
        target=application["id"],
        details=f"Application cancelled. Reason: {reason_str}"
    )

    return {
        "success": True,
        "message": "Application has been cancelled.",
        "application": application
    }

@router.put("/{app_id}")
async def update_application(
    app_id: str,
    body: Dict[str, Any],
    current_user: dict = Depends(require_role("inspector", "regulator"))
):
    app_index = next((idx for idx, a in enumerate(db["applications"]) if a.get("id") == app_id), -1)
    if app_index == -1:
        raise HTTPException(status_code=404, detail="Application not found")

    target_app = db["applications"][app_index]
    user_role = current_user.get("role")
    user_id = current_user.get("id")

    if user_role == "inspector":
        inspector_district = (current_user.get("district") or current_user.get("jurisdictionDistrict") or "").lower()
        app_dist = (target_app.get("district") or "").lower()
        is_assigned = (target_app.get("assignedOfficerId") == user_id)
        if not (is_assigned or (app_dist == inspector_district and bool(inspector_district))):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Legal Metrology Officer cannot modify applications outside assigned jurisdiction."
            )

    if body.get("status") == "VERIFIED_STAMPED":
        raise HTTPException(
            status_code=400,
            detail="Status VERIFIED_STAMPED cannot be assigned via direct update. Complete inspection via /inspect endpoint."
        )

    updated = {**db["applications"][app_index], **body}
    db["applications"][app_index] = updated

    add_audit_log(
        actor_role=user_role.upper(),
        actor_name=current_user.get("name") or updated.get("assignedOfficerName") or "Legal Metrology Officer",
        action="APPLICATION_STATUS_UPDATED",
        target=updated["id"],
        details=f"Application status changed to {updated.get('status')}. Slot: {updated.get('scheduledDateTime', 'N/A')}"
    )

    return updated

@router.post("/{app_id}/inspect")
async def inspect_application(
    app_id: str,
    body: Dict[str, Any],
    current_user: dict = Depends(require_role("inspector", "regulator"))
):
    application = next((a for a in db["applications"] if a.get("id") == app_id), None)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    user_role = current_user.get("role")
    user_id = current_user.get("id")
    user_name = current_user.get("name")

    if user_role == "inspector":
        if body.get("officerId") and body["officerId"] != user_id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Legal Metrology Officer cannot operate or submit inspections as another officer."
            )
        
        officer_obj = next((o for o in db["officers"] if o.get("id") == user_id or o.get("badgeNumber") == current_user.get("identifier")), None)
        if not officer_obj:
            raise HTTPException(status_code=404, detail="Officer record not found in national registry.")
        
        officer_id = officer_obj["id"]
        officer_name = officer_obj["name"]
        
        officer_district = (officer_obj.get("jurisdictionDistrict") or current_user.get("district") or "").lower()
        app_district = (application.get("district") or "").lower()
        is_assigned = (application.get("assignedOfficerId") == officer_id)
        has_jurisdiction = (app_district == officer_district and bool(officer_district))

        if not (is_assigned or has_jurisdiction):
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: Officer '{officer_name}' does not have jurisdiction over applications in '{application.get('district')}'."
            )
    else:
        officer_id = body.get("officerId") or user_id
        officer_name = body.get("officerName") or user_name
    passed_all_tests = body.get("passedAllTests", False)
    remarks = body.get("remarks", "")
    lead_seal_no = body.get("leadSealNo")
    hologram_no = body.get("hologramNo")
    visual_check = body.get("visualCheck")
    repeatability_passed = body.get("repeatabilityPassed", False)
    eccentricity_passed = body.get("eccentricityPassed", False)
    test_loads = body.get("testLoads")

    today_str = datetime.now().strftime("%Y-%m-%d")

    # Independent server-side verification of all mandatory statutory inspection data
    failure_reasons = []

    # 1. Mandatory Rule 24 visual inspection checks
    mandatory_visual_keys = [
        ("enclosureIntact", "Enclosure and load receptor intact check"),
        ("levelingCentered", "Spirit level / leveling bubble centering check"),
        ("modelApprovalPlatePresent", "Central Model Approval Plate verification check"),
        ("environmentalCheckPassed", "Environmental and draft protection check")
    ]

    visual_check_passed = True
    if visual_check is None or not isinstance(visual_check, dict):
        failure_reasons.append("Mandatory visual inspection checklist data is missing")
        visual_check_passed = False
    else:
        for key, description in mandatory_visual_keys:
            if key not in visual_check:
                failure_reasons.append(f"Mandatory visual check missing: {description}")
                visual_check_passed = False
            elif not bool(visual_check.get(key)):
                failure_reasons.append(f"Visual check failed: {description} not satisfied")
                visual_check_passed = False

    # visualInspectionPassed is strictly derived from actual visualCheck results
    visual_inspection_passed = visual_check_passed and bool(body.get("visualInspectionPassed", True))
    if not visual_inspection_passed and not any("visual" in r.lower() for r in failure_reasons):
        failure_reasons.append("Visual and environmental checklist failed (Rule 24 non-compliant)")

    # 2. Repeatability test validation and independent server-side recalculation
    repeatability_data = body.get("repeatability")
    repeatability_passed = False
    repeatability_record = None

    if repeatability_data and isinstance(repeatability_data, dict):
        readings = repeatability_data.get("readings")
        if readings is not None and isinstance(readings, (list, tuple)) and len(readings) == 3:
            if any(r is None or str(r).strip() == "" for r in readings):
                failure_reasons.append("Repeatability test is Not Tested (all 3 cycle measurements required)")
                repeatability_passed = False
            else:
                try:
                    r_floats = [float(r) for r in readings]
                    # Maximum difference between consecutive weighings in grams
                    server_diff_g = round((max(r_floats) - min(r_floats)) * 1000.0, 3)

                    try:
                        rep_load_kg = float(repeatability_data.get("loadKg") or float(application.get("maxCapacityKg", 30)) * 0.5)
                    except (ValueError, TypeError):
                        rep_load_kg = float(application.get("maxCapacityKg", 30) * 0.5)

                    acc_class = application.get("accuracyClass") or "Class III"
                    v_interval = float(application.get("verificationInterval_e") or 1.0)

                    mpe_calc = calculate_mpe(
                        accuracy_class=acc_class,
                        verification_interval_e=v_interval,
                        test_load=rep_load_kg * 1000.0,
                        verification_type="periodic"
                    )
                    server_mpe_g = float(mpe_calc["maxPermissibleErrorGrams"])

                    if server_diff_g > (server_mpe_g + 0.001):
                        failure_reasons.append(
                            f"Repeatability test failed: max difference between 3 weighings ({server_diff_g:.3f}g) exceeded statutory MPE (±{server_mpe_g:.2f}g)"
                        )
                        repeatability_passed = False
                    else:
                        repeatability_passed = True

                    repeatability_record = {
                        "verdict": "PASSED" if repeatability_passed else "FAILED",
                        "loadKg": rep_load_kg,
                        "readings": r_floats,
                        "maxDifferenceGrams": server_diff_g,
                        "mpeGrams": server_mpe_g,
                        "passed": repeatability_passed
                    }
                except (ValueError, TypeError):
                    failure_reasons.append("Repeatability test readings contain invalid numeric values")
                    repeatability_passed = False
        else:
            failure_reasons.append("Repeatability test requires exactly 3 recorded measurements (readings)")
            repeatability_passed = False
    elif "repeatabilityPassed" in body:
        if bool(body.get("repeatabilityPassed")):
            failure_reasons.append("Repeatability test measurements (3 consecutive weighings) are mandatory for verification approval")
            repeatability_passed = False
        else:
            failure_reasons.append("Repeatability test failed or unverified (consecutive weighings variance exceeded permissible limit)")
            repeatability_passed = False
    else:
        failure_reasons.append("Mandatory repeatability test measurements data is missing")
        repeatability_passed = False

    # 3. Eccentricity (corner load) test validation and independent server-side recalculation
    eccentricity_data = body.get("eccentricity")
    eccentricity_passed = False
    eccentricity_record = None

    if eccentricity_data and isinstance(eccentricity_data, dict):
        ecc_readings = eccentricity_data.get("readings")
        corner_readings_map = {}

        if isinstance(ecc_readings, dict):
            for key in ["cornerA", "cornerB", "cornerC", "cornerD"]:
                val = ecc_readings.get(key)
                if val is None:
                    alt_key = key.replace("corner", "").lower()
                    val = ecc_readings.get(alt_key)
                if val is not None:
                    corner_readings_map[key] = val
        elif isinstance(ecc_readings, (list, tuple)) and len(ecc_readings) == 4:
            corner_keys = ["cornerA", "cornerB", "cornerC", "cornerD"]
            for idx, val in enumerate(ecc_readings):
                corner_readings_map[corner_keys[idx]] = val

        if len(corner_readings_map) == 4:
            if any(v is None or str(v).strip() == "" for v in corner_readings_map.values()):
                failure_reasons.append("Eccentricity test is Not Tested (all 4 quadrant corner measurements required)")
                eccentricity_passed = False
            else:
                try:
                    numeric_corners = {k: float(v) for k, v in corner_readings_map.items()}

                    try:
                        ecc_load_kg = float(
                            eccentricity_data.get("loadKg") or
                            (float(application.get("maxCapacityKg", 30)) / 3.0)
                        )
                    except (ValueError, TypeError):
                        ecc_load_kg = float(application.get("maxCapacityKg", 30)) / 3.0

                    # Compute corner bias error for each corner in grams: |reading - load| * 1000
                    corner_errors_g = {
                        k: round(abs(v - ecc_load_kg) * 1000.0, 3)
                        for k, v in numeric_corners.items()
                    }
                    server_max_corner_err_g = max(corner_errors_g.values())

                    acc_class = application.get("accuracyClass") or "Class III"
                    v_interval = float(application.get("verificationInterval_e") or 1.0)

                    ecc_mpe_calc = calculate_mpe(
                        accuracy_class=acc_class,
                        verification_interval_e=v_interval,
                        test_load=ecc_load_kg * 1000.0,
                        verification_type="periodic"
                    )
                    server_ecc_mpe_g = float(ecc_mpe_calc["maxPermissibleErrorGrams"])

                    if server_max_corner_err_g > (server_ecc_mpe_g + 0.001):
                        failure_reasons.append(
                            f"Eccentricity test failed: corner bias error ({server_max_corner_err_g:.3f}g) exceeded statutory MPE (±{server_ecc_mpe_g:.2f}g)"
                        )
                        eccentricity_passed = False
                    else:
                        eccentricity_passed = True

                    eccentricity_record = {
                        "verdict": "PASSED" if eccentricity_passed else "FAILED",
                        "loadKg": ecc_load_kg,
                        "readings": numeric_corners,
                        "cornerErrorsGrams": corner_errors_g,
                        "maxErrorGrams": server_max_corner_err_g,
                        "mpeGrams": server_ecc_mpe_g,
                        "passed": eccentricity_passed
                    }
                except (ValueError, TypeError):
                    failure_reasons.append("Eccentricity test readings contain invalid numeric values")
                    eccentricity_passed = False
        else:
            failure_reasons.append("Eccentricity test requires exactly 4 recorded corner measurements (Corners A, B, C, D)")
            eccentricity_passed = False
    elif "eccentricityPassed" in body:
        if bool(body.get("eccentricityPassed")):
            failure_reasons.append("Eccentricity test measurements (Corners A, B, C, D) are mandatory for verification approval")
            eccentricity_passed = False
        else:
            failure_reasons.append("Eccentricity corner load test failed or unverified (quadrant bias exceeded MPE limit)")
            eccentricity_passed = False
    else:
        failure_reasons.append("Mandatory eccentricity test measurements data is missing")
        eccentricity_passed = False

    # 4. Mandatory test loads validation
    if test_loads is None or not isinstance(test_loads, list) or len(test_loads) == 0:
        failure_reasons.append("Mandatory test load observations data is missing")
    else:
        for idx, t in enumerate(test_loads):
            load_name = t.get("name") or f"Load #{idx+1}"
            obs_raw = t.get("observedKg")
            status = t.get("status")
            passed_val = t.get("passed")

            # Check if test load is unmeasured or Not Tested
            if obs_raw is None or str(obs_raw).strip() == "" or status == "NOT_TESTED" or passed_val is None:
                failure_reasons.append(f"Test load '{load_name}' is Not Tested (actual observed measurement required)")
                continue

            try:
                obs_kg = float(obs_raw)
            except (ValueError, TypeError):
                failure_reasons.append(f"Test load '{load_name}' contains invalid numeric reading: {obs_raw}")
                continue

            try:
                load_kg = float(t.get("loadKg", 0))
            except (ValueError, TypeError):
                failure_reasons.append(f"Test load '{load_name}' contains invalid test mass value")
                continue

            if passed_val is not True:
                failure_reasons.append(f"MPE tolerance test failed for {load_name}")

            # Recalculate error in grams: |obs_kg - load_kg| * 1000.0
            error_g = round(abs(obs_kg - load_kg) * 1000.0, 3)

            # Determine statutory MPE server-side from instrument class & interval e
            acc_class = application.get("accuracyClass") or "Class III"
            v_interval = float(application.get("verificationInterval_e") or 1.0)
            try:
                mpe_calc = calculate_mpe(
                    accuracy_class=acc_class,
                    verification_interval_e=v_interval,
                    test_load=load_kg * 1000.0,
                    verification_type="periodic"
                )
                statutory_mpe_g = float(mpe_calc["maxPermissibleErrorGrams"])
            except Exception:
                statutory_mpe_g = float(t.get("mpeGrams", 5.0))

            if error_g > (statutory_mpe_g + 0.001):
                failure_reasons.append(
                    f"{load_name} error ({error_g:.2f}g) exceeded statutory tolerance limit (±{statutory_mpe_g}g)"
                )

    # 5. Security seals assignment check for approved verifications
    lead_seal_inventory_record = None
    holo_inventory_record = None

    if passed_all_tests:
        if not lead_seal_no or not str(lead_seal_no).strip():
            failure_reasons.append("Mandatory physical lead / wire seal serial number is missing")
        else:
            lead_val = verify_seal_in_inventory(
                seal_number=lead_seal_no,
                expected_type="LEAD_WIRE_SEAL",
                officer_id=officer_id
            )
            if not lead_val.get("valid"):
                failure_reasons.append(f"Lead seal validation failed: {lead_val.get('reason')}")
            else:
                lead_seal_inventory_record = lead_val.get("seal")

        if not hologram_no or not str(hologram_no).strip():
            failure_reasons.append("Mandatory tamper-evident hologram identifier is missing")
        else:
            holo_val = verify_seal_in_inventory(
                seal_number=hologram_no,
                expected_type="HOLOGRAM_STICKER",
                officer_id=officer_id
            )
            if not holo_val.get("valid"):
                failure_reasons.append(f"Hologram validation failed: {holo_val.get('reason')}")
            else:
                holo_inventory_record = holo_val.get("seal")

    # 6. Explicit officer verdict
    if not passed_all_tests:
        if not failure_reasons:
            failure_reasons.append("Verification rejected by Legal Metrology Officer")

    # If any required test failed, required data is missing, or officer rejected: withhold certificate
    if failure_reasons:
        rejection_reason = "; ".join(failure_reasons)
        full_remarks = f"{remarks} [{rejection_reason}]" if remarks else rejection_reason
        application["status"] = "REJECTED"
        application["notes"] = f"Rejected during on-site inspection. Reasons: {full_remarks}"
        application["reVerificationEligible"] = True

        # Extract structured failure parameters for merchant inspection report
        failed_params = []
        if not visual_inspection_passed:
            v_check = visual_check or {}
            for k, label in [
                ("enclosureIntact", "Enclosure and load receptor intact"),
                ("levelingCentered", "Spirit level centering bubble"),
                ("modelApprovalPlatePresent", "Central Model Approval Plate (Rule 18)"),
                ("environmentalCheckPassed", "Environmental & draft protection compliance")
            ]:
                if not v_check.get(k):
                    failed_params.append({
                        "parameter": label,
                        "observedValue": "Non-compliant / Failed",
                        "statutoryLimit": "Mandatory pass (Rule 24, Legal Metrology Rules)",
                        "reason": f"Visual inspection check '{label}' was not satisfied.",
                        "evidence": v_check.get("remarks") or "Observed during physical on-site examination"
                    })

        if not repeatability_passed and repeatability_record:
            failed_params.append({
                "parameter": "Repeatability (Δm across 3 cycles)",
                "observedValue": f"{repeatability_record.get('maxDifferenceGrams', 0):.3f} g",
                "statutoryLimit": f"±{repeatability_record.get('mpeGrams', 0):.2f} g",
                "reason": "Maximum difference between 3 consecutive weighings exceeded statutory MPE tolerance.",
                "evidence": f"Readings: {repeatability_record.get('readings')}"
            })

        if not eccentricity_passed and eccentricity_record:
            failed_params.append({
                "parameter": "Eccentricity (Corner Bias across 4 corners)",
                "observedValue": f"{eccentricity_record.get('maxErrorGrams', 0):.3f} g",
                "statutoryLimit": f"±{eccentricity_record.get('mpeGrams', 0):.2f} g",
                "reason": "Quadrant corner load error exceeded statutory MPE tolerance.",
                "evidence": f"Corner readings: {eccentricity_record.get('readings')}"
            })

        if test_loads:
            for t in test_loads:
                if t.get("passed") is False or t.get("status") == "FAIL":
                    failed_params.append({
                        "parameter": f"MPE Load Tolerance ({t.get('name') or t.get('loadKg', '')} kg)",
                        "observedValue": f"{t.get('observedKg')} kg (Error: {t.get('errorGrams')} g)",
                        "statutoryLimit": f"±{t.get('mpeGrams')} g",
                        "reason": "Observed test load error exceeded statutory maximum permissible error.",
                        "evidence": f"Observed reading: {t.get('observedKg')} kg on nominal test mass: {t.get('loadKg')} kg"
                    })

        if not failed_params:
            failed_params.append({
                "parameter": "Statutory On-Site Inspection",
                "observedValue": "Non-compliant",
                "statutoryLimit": "All statutory verification tests must pass",
                "reason": rejection_reason,
                "evidence": remarks or "Legal Metrology Officer field assessment"
            })

        application["failedParameters"] = failed_params
        application["inspectionObservations"] = {
            "visualInspection": "Passed" if visual_inspection_passed else "Failed",
            "visualCheck": visual_check or {},
            "repeatabilityTest": "Passed" if repeatability_passed else "Failed",
            "repeatability": repeatability_record or {
                "verdict": "FAILED",
                "passed": False,
                "readings": repeatability_data.get("readings") if isinstance(repeatability_data, dict) else None
            },
            "eccentricityTest": "Passed" if eccentricity_passed else "Failed",
            "eccentricity": eccentricity_record or {
                "verdict": "FAILED",
                "passed": False,
                "readings": eccentricity_data.get("readings") if isinstance(eccentricity_data, dict) else None
            },
            "testLoadObservations": test_loads or [],
            "overallVerdict": "REJECTED",
            "failureReasons": failure_reasons
        }

        # Record timeline event for verification failure
        add_timeline_event(
            application=application,
            status="VERIFICATION_FAILED",
            title="On-site Verification Failed (Non-Compliant)",
            actor_name=officer_name or "Legal Metrology Officer",
            actor_role="INSPECTOR",
            description=f"Statutory verification tests non-compliant. Reasons: {rejection_reason}. Rectification notice issued under Section 24."
        )

        # Update instrument record if linked
        target_instrument = next(
            (i for i in db["instruments"]
             if i.get("id") == application.get("instrumentId") or
                i.get("serialNumber") == application.get("serialNumber")),
            None
        )
        if target_instrument:
            target_instrument["status"] = "REJECTED"
            target_instrument["notes"] = f"Failed statutory inspection on {today_str}: {rejection_reason}"

        add_audit_log(
            actor_role="LMO_OFFICER",
            actor_name=officer_name or "LMO Inspector",
            action="INSPECTION_REJECTED_NON_COMPLIANT",
            target=application["id"],
            details=f"Instrument {application.get('serialNumber')} failed statutory verification. Reasons: {rejection_reason}"
        )

        return {
            "verdict": "FAILED",
            "message": f"Verification failed. Rectification notice issued to merchant under Section 24 of Legal Metrology Act, 2009. Reasons: {rejection_reason}",
            "reasons": failure_reasons,
            "application": application,
            "instrument": target_instrument
        }

    # Generate Certificate
    state = application.get("state", "Maharashtra")
    state_code_map = {
        "Maharashtra": "MH",
        "Karnataka": "KA",
        "Delhi": "DL",
        "Gujarat": "GJ",
        "Uttar Pradesh": "UP"
    }
    state_code = state_code_map.get(state, "GOI")
    current_year = datetime.now().year
    cert_number = f"{state_code}/LM/{current_year}/{random.randint(10000, 99999)}"

    # Validity: 1 year
    valid_until_dt = datetime.now() + timedelta(days=365)
    valid_until_str = valid_until_dt.strftime("%Y-%m-%d")

    final_lead_seal = str(lead_seal_no).strip()
    final_hologram = str(hologram_no).strip()

    now_iso = datetime.now().isoformat()
    if lead_seal_inventory_record:
        lead_seal_inventory_record["status"] = "ASSIGNED"
        lead_seal_inventory_record["assignedToApplicationId"] = application["id"]
        lead_seal_inventory_record["assignedToCertificateId"] = cert_number
        lead_seal_inventory_record["assignedAt"] = now_iso
        lead_seal_inventory_record["assignedByOfficerId"] = officer_id or "lmo-01"
        lead_seal_inventory_record["assignedByOfficerName"] = officer_name or "Legal Metrology Officer"

    if holo_inventory_record:
        holo_inventory_record["status"] = "ASSIGNED"
        holo_inventory_record["assignedToApplicationId"] = application["id"]
        holo_inventory_record["assignedToCertificateId"] = cert_number
        holo_inventory_record["assignedAt"] = now_iso
        holo_inventory_record["assignedByOfficerId"] = officer_id or "lmo-01"
        holo_inventory_record["assignedByOfficerName"] = officer_name or "Legal Metrology Officer"

    # Find merchant
    merchant = next((m for m in db["merchants"] if m.get("id") == application.get("merchantId")), None)
    if not merchant:
        merchant = {
            "tradeName": application.get("merchantName"),
            "gstin": "27AABCO1234F1Z8",
            "ownerName": "Authorized Trader",
            "address": f"{application.get('district')}, {application.get('state')}"
        }

    # Generate SHA-256 Cryptographic Signature Hash
    crypto_hash = generate_certificate_hash(
        cert_number=cert_number,
        serial_number=application.get("serialNumber", ""),
        stamping_date=today_str,
        officer_id=officer_id or "LMO-OFFICER",
        lead_seal_no=final_lead_seal,
        hologram_no=final_hologram
    )

    certificate = {
        "certificateNumber": cert_number,
        "scheduleForm": "Schedule VIII / Form B (Rule 24)",
        "applicationId": application["id"],
        "instrumentId": application.get("instrumentId"),
        "serialNumber": application.get("serialNumber"),
        "instrumentCategory": application.get("instrumentCategory"),
        "brand": application.get("brand"),
        "model": application.get("model"),
        "modelApprovalNumber": application.get("modelApprovalNumber") or "IND/09/2023/512",
        "accuracyClass": application.get("accuracyClass") or "Class III (Medium Accuracy)",
        "maxCapacityKg": application.get("maxCapacityKg"),
        "minCapacityGrams": application.get("minCapacityGrams") or 50,
        "verificationInterval_e": application.get("verificationInterval_e") or 2,
        "stampingDate": today_str,
        "validUntilDate": valid_until_str,
        "validityPeriod": "12 Months (1 Year)",
        "merchantName": merchant.get("tradeName"),
        "merchantId": application.get("merchantId"),
        "gstin": merchant.get("gstin"),
        "ownerName": merchant.get("ownerName"),
        "premiseAddress": merchant.get("address"),
        "district": application.get("district"),
        "state": application.get("state"),
        "officerId": officer_id or "lmo-01",
        "officerName": officer_name or "Shri Rajesh K. Sharma",
        "officerDesignation": "Legal Metrology Officer",
        "leadSealNo": final_lead_seal,
        "hologramNo": final_hologram,
        "assignedSeals": {
            "leadSeal": {
                "sealNumber": final_lead_seal,
                "sealType": "LEAD_WIRE_SEAL",
                "batchNumber": lead_seal_inventory_record.get("batchNumber") if lead_seal_inventory_record else "MH-2026-B1",
                "assignedAt": now_iso,
                "assignedByOfficerId": officer_id or "lmo-01",
                "assignedByOfficerName": officer_name or "Legal Metrology Officer"
            },
            "hologram": {
                "sealNumber": final_hologram,
                "sealType": "HOLOGRAM_STICKER",
                "batchNumber": holo_inventory_record.get("batchNumber") if holo_inventory_record else "HOL-2026-B1",
                "assignedAt": now_iso,
                "assignedByOfficerId": officer_id or "lmo-01",
                "assignedByOfficerName": officer_name or "Legal Metrology Officer"
            }
        },
        "statutoryFeePaid": application.get("statutoryFee") or 300,
        "feeReceiptNumber": f"{state_code}-TR-{current_year}-{random.randint(10000, 99999)}",
        "cryptographicHash": crypto_hash,
        "inspectionObservations": {
            "visualInspection": "Passed (Enclosure intact, leveling centered, model approval plate present, environmental compliance)",
            "visualCheck": visual_check or {},
            "repeatabilityTest": (
                f"Passed (Δm: {repeatability_record['maxDifferenceGrams']:.2f}g <= MPE: ±{repeatability_record['mpeGrams']:.2f}g across 3 cycles)"
                if repeatability_record else "Passed"
            ),
            "repeatability": repeatability_record,
            "eccentricityTest": (
                f"Passed (Max corner bias: {eccentricity_record['maxErrorGrams']:.2f}g <= MPE: ±{eccentricity_record['mpeGrams']:.2f}g across 4 corners)"
                if eccentricity_record else "Passed"
            ),
            "eccentricity": eccentricity_record,
            "testLoadObservations": test_loads,
            "overallVerdict": "STAMPED & VERIFIED"
        }
    }

    db["certificates"].insert(0, certificate)

    # Update application
    application["status"] = "VERIFIED_STAMPED"
    application["certificateNumber"] = cert_number
    application["inspectionObservations"] = certificate["inspectionObservations"]

    # Record timeline events for successful verification and certificate issuance
    add_timeline_event(
        application=application,
        status="VERIFICATION_PASSED",
        title="Statutory Verification Tests Passed",
        actor_name=officer_name or "Legal Metrology Officer",
        actor_role="INSPECTOR",
        description="Instrument successfully passed visual checks, repeatability test, eccentricity corner bias check, and all MPE test load tolerances."
    )
    add_timeline_event(
        application=application,
        status="CERTIFICATE_ISSUED",
        title=f"Verification Certificate Issued ({cert_number})",
        actor_name=officer_name or "Legal Metrology Officer",
        actor_role="INSPECTOR",
        description=f"Form B certificate issued. Lead seal {final_lead_seal} and hologram {final_hologram} affixed. Verification valid until {valid_until_str}."
    )

    # Update instrument
    target_instrument = next(
        (i for i in db["instruments"]
         if i.get("id") == application.get("instrumentId") or
            i.get("serialNumber") == application.get("serialNumber")),
        None
    )
    if target_instrument:
        target_instrument["status"] = "VERIFIED"
        target_instrument["lastVerificationDate"] = today_str
        target_instrument["validUntilDate"] = valid_until_str
        target_instrument["certificateNumber"] = cert_number
        target_instrument["officerId"] = officer_id
        target_instrument["officerName"] = officer_name
        target_instrument["leadSealNo"] = final_lead_seal
        target_instrument["hologramNo"] = final_hologram
    else:
        target_instrument = {
            "id": f"inst-{int(time.time() * 1000)}",
            "merchantId": application.get("merchantId"),
            "merchantName": application.get("merchantName"),
            "category": application.get("instrumentCategory"),
            "brand": application.get("brand"),
            "model": application.get("model"),
            "serialNumber": application.get("serialNumber"),
            "modelApprovalNumber": certificate["modelApprovalNumber"],
            "accuracyClass": application.get("accuracyClass"),
            "maxCapacityKg": application.get("maxCapacityKg"),
            "minCapacityGrams": application.get("minCapacityGrams") or 50,
            "verificationInterval_e": application.get("verificationInterval_e"),
            "verificationPeriodMonths": 12,
            "status": "VERIFIED",
            "lastVerificationDate": today_str,
            "validUntilDate": valid_until_str,
            "certificateNumber": cert_number,
            "officerId": officer_id,
            "officerName": officer_name,
            "leadSealNo": final_lead_seal,
            "hologramNo": final_hologram,
            "district": application.get("district"),
            "state": application.get("state"),
            "locationAddress": merchant.get("address") or f"{application.get('district')}, {application.get('state')}",
            "geoLocation": {"lat": 19.0760, "lng": 72.8777}
        }
        db["instruments"].append(target_instrument)

    add_audit_log(
        actor_role="LMO_OFFICER",
        actor_name=officer_name or "Legal Metrology Officer",
        action="INSPECTION_COMPLETED_AND_CERTIFIED",
        target=cert_number,
        details=f"Stamping completed for {application.get('serialNumber')} at {merchant.get('tradeName')}. Seal {final_lead_seal} affixed. Cryptographic Hash: {crypto_hash[:16]}..."
    )

    return {
        "verdict": "PASSED",
        "message": "Verification tests successfully passed! Digital certificate and stamping record issued.",
        "certificate": certificate,
        "application": application,
        "instrument": target_instrument
    }

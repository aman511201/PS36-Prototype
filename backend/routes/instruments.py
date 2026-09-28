import time
import random
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import JSONResponse

from backend.data.mock_data import db
from backend.middleware.auth import require_role
from backend.utils.audit import add_audit_log
from backend.utils.instrument_rules import search_approved_models, derive_instrument_specifications

router = APIRouter(prefix="/api/instruments", tags=["Instruments"])

@router.get("/approved-models")
async def get_approved_models(
    query: Optional[str] = Query(None),
    instrumentType: Optional[str] = Query(None)
):
    """
    Search central model approval registry under Legal Metrology Act, 2009.
    """
    return search_approved_models(query=query, instrument_type=instrumentType)

@router.post("/derive-specs")
async def derive_specs(body: Dict[str, Any]):
    """
    Statutory Rule Engine: Derives accuracyClass, e, applicableRules, feeCategory, etc.
    """
    inst_type = body.get("instrumentType") or body.get("category") or ""
    cap_kg = body.get("capacityKg") if body.get("capacityKg") is not None else body.get("maxCapacityKg", 0.0)
    mfg = body.get("manufacturer") or body.get("brand") or ""
    model = body.get("model") or ""
    model_approval_num = body.get("modelApprovalNumber") or ""

    return derive_instrument_specifications(
        instrument_type=inst_type,
        capacity_kg=float(cap_kg) if cap_kg else 0.0,
        manufacturer=mfg,
        model=model,
        model_approval_number=model_approval_num
    )

@router.get("")
async def get_instruments(
    merchantId: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    current_user: dict = Depends(require_role("merchant", "inspector", "gatc", "regulator"))
):
    user_role = current_user.get("role")
    user_id = current_user.get("id")

    if user_role == "merchant":
        if merchantId and merchantId != user_id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Merchants cannot view instruments belonging to another establishment."
            )
        filtered = [i for i in db["instruments"] if i.get("merchantId") == user_id]
    elif user_role == "inspector":
        inspector_district = (current_user.get("district") or current_user.get("jurisdictionDistrict") or "").lower()
        if district and district.lower() != inspector_district:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Legal Metrology Officer cannot view instruments outside assigned jurisdiction."
            )
        filtered = [i for i in db["instruments"] if (i.get("district") or "").lower() == inspector_district]
    elif merchantId:
        filtered = [i for i in db["instruments"] if i.get("merchantId") == merchantId]
    else:
        filtered = list(db["instruments"])

    if status:
        filtered = [i for i in filtered if i.get("status") == status]
    if district and user_role != "inspector":
        filtered = [i for i in filtered if (i.get("district") or "").lower() == district.lower()]
    if state:
        filtered = [i for i in filtered if (i.get("state") or "").lower() == state.lower()]

    return filtered

@router.get("/{inst_id}")
async def get_instrument_by_id(
    inst_id: str,
    current_user: dict = Depends(require_role("merchant", "inspector", "gatc", "regulator"))
):
    inst = next(
        (i for i in db["instruments"] if i.get("id") == inst_id or i.get("serialNumber") == inst_id),
        None
    )
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found")

    if current_user.get("role") == "merchant" and inst.get("merchantId") != current_user.get("id"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Cannot access an instrument belonging to another merchant."
        )

    return inst

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_instrument(
    body: Dict[str, Any],
    current_user: dict = Depends(require_role("merchant", "regulator"))
):
    user_role = current_user.get("role")
    user_id = current_user.get("id")

    if user_role == "merchant":
        if body.get("merchantId") and body["merchantId"] != user_id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Cannot register an instrument on behalf of another merchant."
            )
        target_merchant_id = user_id
    elif user_role == "regulator":
        target_merchant_id = body.get("merchantId") or user_id
    else:
        raise HTTPException(status_code=403, detail="Unauthorized role for instrument registration.")

    merchant_obj = next(
        (m for m in db["merchants"] if m.get("id") == target_merchant_id or m.get("gstin") == current_user.get("identifier")),
        None
    )
    if not merchant_obj:
        raise HTTPException(status_code=404, detail="Merchant record not found in national registry.")

    # 1. Serial Number validation & uniqueness enforcement
    raw_serial = body.get("serialNumber")
    if not raw_serial or not str(raw_serial).strip():
        raise HTTPException(status_code=400, detail="Instrument serial number is mandatory for statutory registration.")

    serial_number = str(raw_serial).strip()

    # Enforce unique instrument serial numbers in backend
    existing_duplicate = next(
        (i for i in db["instruments"] if str(i.get("serialNumber", "")).strip().lower() == serial_number.lower()),
        None
    )
    if existing_duplicate:
        raise HTTPException(
            status_code=400,
            detail=f"Duplicate serial number: An instrument with serial number '{serial_number}' is already registered in the National Registry."
        )

    # 2. Extract 6 simplified registration fields
    instrument_type = body.get("instrumentType") or body.get("category") or "Electronic Weighing Scale (Counter/Tabletop)"
    manufacturer = body.get("manufacturer") or body.get("brand") or "Essae"
    model = body.get("model") or "Standard Digital NAWI"
    
    try:
        raw_cap = body.get("capacity") if body.get("capacity") is not None else body.get("maxCapacityKg", 30.0)
        capacity_kg = float(raw_cap)
    except (ValueError, TypeError):
        capacity_kg = 30.0

    installation_location = (
        body.get("installationLocation") or
        body.get("locationAddress") or
        merchant_obj.get("address") or
        f"{merchant_obj.get('district')}, {merchant_obj.get('state')}"
    )

    # 3. Derive statutory specifications from backend rule engine
    client_model_approval = body.get("modelApprovalNumber")
    derived_specs = derive_instrument_specifications(
        instrument_type=instrument_type,
        capacity_kg=capacity_kg,
        manufacturer=manufacturer,
        model=model,
        model_approval_number=client_model_approval
    )

    # Supporting documents (invoices, photos, calibration certificates)
    documents = body.get("documents") or []
    if isinstance(documents, dict):
        documents = [documents]
    elif not isinstance(documents, list):
        documents = []

    new_inst = {
        "id": f"inst-{int(time.time() * 1000)}",
        "merchantId": merchant_obj["id"],
        "merchantName": merchant_obj.get("tradeName", "Merchant"),
        # 6 core fields
        "category": instrument_type,
        "instrumentType": instrument_type,
        "brand": manufacturer,
        "manufacturer": manufacturer,
        "model": model,
        "serialNumber": serial_number,
        "maxCapacityKg": capacity_kg,
        "capacity": capacity_kg,
        "installationLocation": installation_location,
        "locationAddress": installation_location,
        # Derived authoritative fields from statutory rule engine
        "accuracyClass": derived_specs["accuracyClass"],
        "verificationInterval_e": derived_specs["verificationInterval_e"],
        "minCapacityGrams": derived_specs["minCapacityGrams"],
        "verificationPeriodMonths": derived_specs["verificationPeriodMonths"],
        "applicableRules": derived_specs["applicableRules"],
        "feeCategory": derived_specs["feeCategory"],
        "modelApprovalNumber": derived_specs["modelApprovalNumber"] or "IND/09/2024/PENDING",
        "isApprovedModel": derived_specs["isApprovedModel"],
        "documents": documents,
        # Status & lifecycle
        "status": "PENDING_INSPECTION",
        "lastVerificationDate": None,
        "validUntilDate": None,
        "certificateNumber": None,
        "officerId": None,
        "officerName": None,
        "leadSealNo": None,
        "hologramNo": None,
        "district": merchant_obj.get("district"),
        "state": merchant_obj.get("state"),
        "geoLocation": body.get("geoLocation") or {"lat": 19.0760, "lng": 72.8777}
    }

    db["instruments"].append(new_inst)

    add_audit_log(
        actor_role=user_role.upper(),
        actor_name=merchant_obj.get("tradeName", "Merchant"),
        action="INSTRUMENT_REGISTERED",
        target=new_inst["serialNumber"],
        details=f"Registered {new_inst['category']} ({new_inst['brand']} - {new_inst['model']}). Accuracy: {new_inst['accuracyClass']}, e: {new_inst['verificationInterval_e']}g. Model Approval: {new_inst['modelApprovalNumber']}."
    )

    return new_inst

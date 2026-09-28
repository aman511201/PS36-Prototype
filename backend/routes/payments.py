import uuid
import random
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status

from backend.data.mock_data import db
from backend.utils.fee_calculator import calculate_statutory_fee
from backend.middleware.auth import require_role, get_current_user, get_optional_user

router = APIRouter(prefix="/api/payments", tags=["payments"])

def _normalize_gateway_name(raw_gateway: Optional[str]) -> str:
    gw = (raw_gateway or "BHARATKOSH").strip()
    if "Simulated" in gw or "Demo" in gw:
        return gw
    return f"{gw} (Simulated Demo)"

@router.post("/quote-fee")
async def quote_statutory_fee(
    body: Dict[str, Any],
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Authoritative server-side statutory fee calculation.
    Derives category, capacity, accuracy, and lateness strictly from registered instrument.
    """
    inst_id = body.get("instrumentId")
    application_type = body.get("applicationType") or ""

    if inst_id:
        inst = next((i for i in db["instruments"] if i.get("id") == inst_id), None)
        if not inst:
            raise HTTPException(status_code=404, detail=f"Instrument '{inst_id}' not found in registry.")

        if current_user and current_user.get("role") == "merchant":
            merchant_obj = next(
                (m for m in db["merchants"] if m.get("id") == current_user.get("id") or m.get("gstin") == current_user.get("identifier")),
                None
            )
            if merchant_obj and inst.get("merchantId") != merchant_obj["id"]:
                raise HTTPException(status_code=403, detail="Forbidden: Instrument belongs to another merchant.")

        category = inst.get("category") or inst.get("instrumentCategory")
        cap = inst.get("maxCapacityKg")
        accuracy = inst.get("accuracyClass")

        today_str = datetime.now().strftime("%Y-%m-%d")
        valid_until = inst.get("validUntilDate") or ""
        is_late = (
            inst.get("status") == "EXPIRED" or
            (bool(valid_until) and valid_until < today_str) or
            "Overdue" in application_type or
            bool(body.get("isLate"))
        )

        fee_info = calculate_statutory_fee({
            "category": category,
            "capacityKg": cap,
            "accuracyClass": accuracy,
            "isLate": is_late
        })
        fee_info["instrumentId"] = inst.get("id")
        fee_info["brand"] = inst.get("brand")
        fee_info["model"] = inst.get("model")
        fee_info["serialNumber"] = inst.get("serialNumber")
        fee_info["isRegisteredInstrument"] = True
        return fee_info
    else:
        # Initial verification for new unregistered instrument
        fee_info = calculate_statutory_fee({
            "category": body.get("category") or body.get("instrumentCategory"),
            "capacityKg": body.get("capacityKg") if body.get("capacityKg") is not None else body.get("maxCapacityKg"),
            "accuracyClass": body.get("accuracyClass"),
            "isLate": bool(body.get("isLate")) or "Overdue" in application_type
        })
        fee_info["isRegisteredInstrument"] = False
        return fee_info

@router.post("/initiate", status_code=status.HTTP_201_CREATED)
async def initiate_payment(
    body: Dict[str, Any],
    current_user: dict = Depends(require_role("merchant", "regulator"))
):
    """
    Initiates statutory fee payment order in state 'INITIATED'.
    Authoritatively checks registered instrument attributes to prevent fee tampering.
    """
    user_role = current_user.get("role")
    user_id = current_user.get("id")

    if user_role == "merchant":
        target_merchant_id = user_id
    else:
        target_merchant_id = body.get("merchantId") or user_id

    merchant_obj = next(
        (m for m in db["merchants"] if m.get("id") == target_merchant_id or m.get("gstin") == current_user.get("identifier")),
        None
    )
    if not merchant_obj:
        raise HTTPException(status_code=404, detail="Merchant establishment not found in registry.")

    inst_id = body.get("instrumentId")
    application_type = body.get("applicationType") or ""

    if inst_id:
        inst = next((i for i in db["instruments"] if i.get("id") == inst_id), None)
        if not inst:
            raise HTTPException(status_code=404, detail=f"Instrument '{inst_id}' not found in registry.")
        if user_role == "merchant" and inst.get("merchantId") != merchant_obj["id"]:
            raise HTTPException(status_code=403, detail="Forbidden: Instrument belongs to another merchant.")

        # Tampering check: client cannot override registered instrument attributes
        inst_cat = inst.get("category") or inst.get("instrumentCategory")
        inst_cap = inst.get("maxCapacityKg")
        inst_acc = inst.get("accuracyClass")

        client_cat = body.get("instrumentCategory") or body.get("category")
        client_cap = body.get("maxCapacityKg") if body.get("maxCapacityKg") is not None else body.get("capacityKg")
        client_acc = body.get("accuracyClass")

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
            bool(body.get("isLate"))
        )

        fee_info = calculate_statutory_fee({
            "category": inst_cat,
            "capacityKg": inst_cap,
            "accuracyClass": inst_acc,
            "isLate": is_late
        })
    else:
        fee_info = calculate_statutory_fee({
            "category": body.get("category") or body.get("instrumentCategory"),
            "capacityKg": body.get("capacityKg") if body.get("capacityKg") is not None else body.get("maxCapacityKg"),
            "accuracyClass": body.get("accuracyClass"),
            "isLate": bool(body.get("isLate")) or "Overdue" in application_type
        })

    payment_id = f"PAY-2026-{uuid.uuid4().hex[:8].upper()}"
    gateway_name = _normalize_gateway_name(body.get("gateway") or body.get("paymentMethod"))

    payment_order = {
        "id": payment_id,
        "merchantId": merchant_obj["id"],
        "merchantName": merchant_obj.get("tradeName"),
        "instrumentId": inst_id,
        "applicationId": None,
        "amount": fee_info["totalFee"],
        "baseFee": fee_info["baseFee"],
        "penalty": fee_info["penalty"],
        "currency": "INR",
        "status": "INITIATED",  # Flow: PENDING -> INITIATED -> SUCCESS / FAILED
        "paymentMode": "SIMULATED_DEMO_PAYMENT",
        "isSimulated": True,
        "gateway": gateway_name,
        "transactionReference": f"TXN-SIM-{uuid.uuid4().hex[:10].upper()}",
        "receiptNumber": None,
        "initiatedAt": datetime.now().isoformat(),
        "confirmedAt": None,
        "failureReason": None,
        "statutoryRuleRef": fee_info.get("statutoryRuleRef", "Schedule XII, Legal Metrology (General) Rules, 2011")
    }

    if "payments" not in db:
        db["payments"] = []
    db["payments"].insert(0, payment_order)

    return payment_order

@router.post("/{payment_id}/confirm")
async def confirm_payment(
    payment_id: str,
    body: Dict[str, Any],
    current_user: dict = Depends(require_role("merchant", "regulator"))
):
    """
    Confirms or fails a simulated statutory fee payment.
    Generates server-side receipt number on SUCCESS.
    """
    payment = next((p for p in db.get("payments", []) if p.get("id") == payment_id), None)
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment record '{payment_id}' not found.")

    user_role = current_user.get("role")
    user_id = current_user.get("id")

    if user_role == "merchant":
        merchant_obj = next(
            (m for m in db["merchants"] if m.get("id") == user_id or m.get("gstin") == current_user.get("identifier")),
            None
        )
        if not merchant_obj or payment.get("merchantId") != merchant_obj["id"]:
            raise HTTPException(status_code=403, detail="Forbidden: Cannot confirm payment for another merchant establishment.")

    simulate_success = body.get("simulateSuccess", True)

    if simulate_success:
        payment["status"] = "SUCCESS"
        payment["confirmedAt"] = datetime.now().isoformat()
        if not payment.get("receiptNumber"):
            payment["receiptNumber"] = f"RCPT-GOI-2026-{random.randint(100000, 999999)}"
        payment["failureReason"] = None
    else:
        payment["status"] = "FAILED"
        payment["failureReason"] = body.get("failureReason") or "Simulated payment failure: transaction declined or timed out in demo sandbox."

    return payment

@router.get("/{payment_id}")
async def get_payment(
    payment_id: str,
    current_user: dict = Depends(get_current_user)
):
    payment = next((p for p in db.get("payments", []) if p.get("id") == payment_id), None)
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment record '{payment_id}' not found.")

    user_role = current_user.get("role") if current_user else None
    if user_role == "merchant":
        merchant_obj = next(
            (m for m in db["merchants"] if m.get("id") == current_user.get("id") or m.get("gstin") == current_user.get("identifier")),
            None
        )
        if not merchant_obj or payment.get("merchantId") != merchant_obj["id"]:
            raise HTTPException(status_code=403, detail="Forbidden: Cannot access payment record belonging to another merchant.")

    return payment

@router.get("/{payment_id}/receipt")
async def get_payment_receipt(
    payment_id: str,
    current_user: dict = Depends(get_current_user)
):
    payment = next((p for p in db.get("payments", []) if p.get("id") == payment_id), None)
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment record '{payment_id}' not found.")

    if payment.get("status") != "SUCCESS":
        raise HTTPException(
            status_code=400,
            detail=f"Receipt unavailable: Payment status is '{payment.get('status')}'. Payment must be successfully confirmed to generate receipt."
        )

    return {
        "receiptNumber": payment.get("receiptNumber"),
        "transactionReference": payment.get("transactionReference"),
        "paymentId": payment.get("id"),
        "amount": payment.get("amount"),
        "baseFee": payment.get("baseFee"),
        "penalty": payment.get("penalty"),
        "currency": payment.get("currency", "INR"),
        "gstExempt": True,
        "statutoryRuleRef": payment.get("statutoryRuleRef", "Schedule XII, Legal Metrology (General) Rules, 2011"),
        "merchantId": payment.get("merchantId"),
        "merchantName": payment.get("merchantName"),
        "gateway": payment.get("gateway"),
        "isSimulated": True,
        "paymentMode": payment.get("paymentMode"),
        "confirmedAt": payment.get("confirmedAt")
    }

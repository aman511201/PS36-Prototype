from fastapi import APIRouter, Depends
from backend.data.mock_data import db
from backend.middleware.auth import require_role

router = APIRouter(prefix="/api/stats", tags=["Regulator Analytics"])

@router.get("/regulator")
async def get_regulator_stats(
    current_user: dict = Depends(require_role("regulator"))
):
    total_instruments = len(db["instruments"])
    verified_instruments = sum(1 for i in db["instruments"] if i.get("status") == "VERIFIED")
    expiring_soon = sum(1 for i in db["instruments"] if i.get("status") == "EXPIRING_SOON")
    expired = sum(1 for i in db["instruments"] if i.get("status") == "EXPIRED")
    pending = sum(1 for i in db["instruments"] if i.get("status") == "PENDING_INSPECTION")

    total_fee_collected = sum(
        float(a.get("statutoryFee") or 0)
        for a in db["applications"]
        if a.get("paymentStatus") == "PAID"
    )

    compliance_rate = round((verified_instruments / (total_instruments or 1)) * 100)

    # Group by State
    state_breakdown = []
    for j in db["jurisdictions"]:
        target_state = (j.get("state") or "").lower()
        state_inst = [i for i in db["instruments"] if (i.get("state") or "").lower() == target_state]
        state_ver = sum(1 for i in state_inst if i.get("status") == "VERIFIED")
        state_def = sum(1 for i in state_inst if i.get("status") == "EXPIRED")
        comp_rate = round((state_ver / len(state_inst)) * 100) if state_inst else 100
        state_breakdown.append({
            "state": j.get("state"),
            "totalInstruments": len(state_inst),
            "verified": state_ver,
            "defaulters": state_def,
            "complianceRate": comp_rate
        })

    total_grievances = len(db["grievances"])
    resolved_grievances = sum(1 for g in db["grievances"] if g.get("status") == "RESOLVED")

    return {
        "kpis": {
            "totalInstruments": total_instruments,
            "verifiedInstruments": verified_instruments,
            "expiringSoon": expiring_soon,
            "expired": expired,
            "pending": pending,
            "complianceRate": compliance_rate,
            "totalFeeCollected": total_fee_collected,
            "totalGrievances": total_grievances,
            "resolvedGrievances": resolved_grievances,
            "activeOfficersCount": len(db["officers"]),
            "gatcCentersCount": len(db["gatcCenters"])
        },
        "stateBreakdown": state_breakdown,
        "recentCertificates": db["certificates"][:5],
        "recentApplications": db["applications"][:5],
        "recentGrievances": db["grievances"][:5]
    }

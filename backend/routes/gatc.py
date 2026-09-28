from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, Optional, List
from datetime import datetime
import hashlib
import json
import random

from backend.data.mock_data import db
from backend.middleware.auth import require_role, get_current_user
from backend.utils.audit import add_audit_log
from backend.utils.mpe_calculator import calculate_mpe

router = APIRouter(prefix="/api/gatc", tags=["gatc"])

def get_effective_gatc_center_id(current_user: dict) -> Optional[str]:
    """Retrieve the authorized GATC center ID bound to the current user's token."""
    return current_user.get("gatcCenterId") or current_user.get("entityId") or current_user.get("id")

@router.get("/reports")
async def get_gatc_reports(
    centerId: Optional[str] = Query(None),
    current_user: dict = Depends(require_role("gatc", "inspector", "regulator"))
):
    """
    List GATC calibration test reports.
    GATC technicians can only view reports issued by their authorized center.
    """
    reports = db.get("gatcTestReports", [])
    user_role = current_user.get("role")
    user_center_id = get_effective_gatc_center_id(current_user)

    if user_role == "gatc":
        # Strictly filter to authenticated center
        reports = [r for r in reports if r.get("gatcCenterId") == user_center_id]
    elif centerId:
        reports = [r for r in reports if r.get("gatcCenterId") == centerId]

    return {
        "total": len(reports),
        "reports": reports
    }

@router.get("/instruments")
async def get_gatc_instruments(
    current_user: dict = Depends(require_role("gatc", "inspector", "regulator"))
):
    """
    Returns instruments requiring Government Approved Test Centre (GATC) testing:
    Weighbridges, bulk flow meters, and fuel dispensing units.
    """
    heavy_keywords = ["weighbridge", "flow meter", "fuel", "tank", "bulk"]
    all_insts = db.get("instruments", [])
    
    heavy_insts = [
        i for i in all_insts
        if any(kw in str(i.get("category", "")).lower() for kw in heavy_keywords)
    ]

    return {
        "total": len(heavy_insts),
        "instruments": heavy_insts
    }

@router.post("/test-report")
async def submit_gatc_test_report(
    body: Dict[str, Any],
    current_user: dict = Depends(require_role("gatc", "regulator"))
):
    """
    Statutory GATC Calibration Test Trial Submission.
    - Binds submission to the logged-in user's authorized GATC center.
    - Strictly rejects submissions for unauthorized centers.
    - Recalculates all load errors, repeatability variance, and corner eccentricity server-side.
    - Stores complete calibration test record with cryptographic audit trail.
    """
    user_role = current_user.get("role")
    user_center_id = get_effective_gatc_center_id(current_user)
    requested_center_id = body.get("gatcCenterId")

    # 1. Authorization: Bind technician to currentUser.gatcCenterId and reject unauthorized centers
    if requested_center_id and requested_center_id != user_center_id and user_role != "regulator":
        raise HTTPException(
            status_code=403,
            detail=f"Unauthorized: You are registered to GATC center '{user_center_id}' and cannot submit test reports for '{requested_center_id}'"
        )

    effective_center_id = requested_center_id if (user_role == "regulator" and requested_center_id) else user_center_id
    center = next((g for g in db.get("gatcCenters", []) if g.get("id") == effective_center_id or g.get("recognitionNumber") == current_user.get("identifier")), None)
    if not center:
        raise HTTPException(status_code=404, detail=f"GATC Center '{effective_center_id}' not found in registry")

    # 2. Locate Target Instrument
    instrument_id = body.get("instrumentId")
    serial_number = body.get("serialNumber")
    instrument = next(
        (i for i in db.get("instruments", [])
         if i.get("id") == instrument_id or (serial_number and i.get("serialNumber") == serial_number)),
        None
    )
    if not instrument:
        raise HTTPException(status_code=404, detail="Target heavy instrument not found in national registry")

    # Instrument Metrological Parameters
    max_cap_kg = float(instrument.get("maxCapacityKg", 60000))
    raw_e = float(instrument.get("verificationInterval_e", 10000))
    # If e >= 1000, it was specified in grams (e.g., 10000g = 10kg)
    e_kg = (raw_e / 1000.0) if raw_e >= 500 else raw_e
    acc_class = instrument.get("accuracyClass") or "Class III"

    failure_reasons = []

    # 3. Recalculate Stepwise Standard Weight Load Trials
    raw_load_trials = body.get("loadTrials")
    if not raw_load_trials or not isinstance(raw_load_trials, list) or len(raw_load_trials) < 2:
        raise HTTPException(status_code=400, detail="GATC calibration requires at least 2 stepwise standard load trials")

    calculated_load_trials = []
    for idx, trial in enumerate(raw_load_trials):
        stage_name = trial.get("name") or f"Load Stage {idx + 1}"
        try:
            load_t = float(trial.get("loadTonnes", 0))
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail=f"Invalid standard load value for {stage_name}")

        obs_val = trial.get("observedTonnes")
        if obs_val is None or str(obs_val).strip() == "" or trial.get("status") == "NOT_TESTED":
            raise HTTPException(status_code=400, detail=f"Standard load trial at {load_t}T is Not Tested (actual observed reading required)")

        try:
            obs_t = float(obs_val)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail=f"Invalid observed reading for {stage_name}: {obs_val}")

        # Recalculate error in kg: (observedTonnes - loadTonnes) * 1000
        error_kg = round((obs_t - load_t) * 1000.0, 2)

        # Calculate statutory MPE tolerance for this load
        load_kg = load_t * 1000.0
        n_divs = load_kg / e_kg if e_kg > 0 else 0
        if n_divs <= 500:
            mpe_in_e = 0.5
        elif n_divs <= 2000:
            mpe_in_e = 1.0
        else:
            mpe_in_e = 1.5

        # In-service periodic verification multiplier is 2.0
        statutory_mpe_kg = round(mpe_in_e * e_kg * 2.0, 2)
        trial_passed = abs(error_kg) <= (statutory_mpe_kg + 0.001)

        if not trial_passed:
            failure_reasons.append(
                f"Load trial at {load_t}T failed: observed error ({error_kg:+.1f} kg) exceeded statutory tolerance (±{statutory_mpe_kg} kg)"
            )

        calculated_load_trials.append({
            "name": stage_name,
            "loadTonnes": load_t,
            "observedTonnes": obs_t,
            "errorKg": error_kg,
            "mpeKg": statutory_mpe_kg,
            "passed": trial_passed,
            "status": "PASSED" if trial_passed else "FAILED"
        })

    # 4. Recalculate Repeatability Test (3 cycles on ~50% load)
    raw_rep = body.get("repeatability")
    if not raw_rep or not isinstance(raw_rep, dict):
        raise HTTPException(status_code=400, detail="GATC repeatability test data is mandatory")

    rep_readings = raw_rep.get("readings")
    if not rep_readings or not isinstance(rep_readings, (list, tuple)) or len(rep_readings) != 3:
        raise HTTPException(status_code=400, detail="Repeatability test requires exactly 3 numeric cycle readings")

    if any(r is None or str(r).strip() == "" for r in rep_readings):
        raise HTTPException(status_code=400, detail="Repeatability test is Not Tested (all 3 cycle readings required)")

    try:
        rep_r_floats = [float(r) for r in rep_readings]
        rep_load_t = float(raw_rep.get("loadTonnes", max_cap_kg * 0.0005))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Repeatability readings must contain valid numeric values")

    max_diff_kg = round((max(rep_r_floats) - min(rep_r_floats)) * 1000.0, 2)
    rep_n = (rep_load_t * 1000.0) / e_kg if e_kg > 0 else 0
    rep_mpe_in_e = 0.5 if rep_n <= 500 else (1.0 if rep_n <= 2000 else 1.5)
    rep_mpe_kg = round(rep_mpe_in_e * e_kg * 2.0, 2)
    rep_passed = max_diff_kg <= (rep_mpe_kg + 0.001)

    if not rep_passed:
        failure_reasons.append(
            f"Repeatability test failed: max difference between 3 cycles ({max_diff_kg} kg) exceeded statutory tolerance (±{rep_mpe_kg} kg)"
        )

    calculated_repeatability = {
        "loadTonnes": rep_load_t,
        "readings": rep_r_floats,
        "maxDifferenceKg": max_diff_kg,
        "mpeKg": rep_mpe_kg,
        "passed": rep_passed,
        "verdict": "PASSED" if rep_passed else "FAILED"
    }

    # 5. Recalculate Eccentricity / Corner Bias Test (4 corners at 1/3 capacity)
    raw_ecc = body.get("eccentricity")
    if not raw_ecc or not isinstance(raw_ecc, dict):
        raise HTTPException(status_code=400, detail="GATC eccentricity corner test data is mandatory")

    raw_corners = raw_ecc.get("readings")
    if not raw_corners or not isinstance(raw_corners, dict):
        raise HTTPException(status_code=400, detail="Eccentricity test requires quadrant corner readings (Corner A, B, C, D)")

    required_corners = ["cornerA", "cornerB", "cornerC", "cornerD"]
    for c_key in required_corners:
        val = raw_corners.get(c_key)
        if val is None or str(val).strip() == "":
            raise HTTPException(status_code=400, detail=f"Eccentricity corner {c_key[-1]} is Not Tested (all 4 corners required)")

    try:
        corner_readings = {k: float(raw_corners[k]) for k in required_corners}
        ecc_load_t = float(raw_ecc.get("loadTonnes", max_cap_kg * 0.000333))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Eccentricity corner measurements must be valid numeric values")

    corner_errors_kg = {
        k: round(abs(v - ecc_load_t) * 1000.0, 2)
        for k, v in corner_readings.items()
    }
    max_corner_err_kg = max(corner_errors_kg.values())

    ecc_n = (ecc_load_t * 1000.0) / e_kg if e_kg > 0 else 0
    ecc_mpe_in_e = 0.5 if ecc_n <= 500 else (1.0 if ecc_n <= 2000 else 1.5)
    ecc_mpe_kg = round(ecc_mpe_in_e * e_kg * 2.0, 2)
    ecc_passed = max_corner_err_kg <= (ecc_mpe_kg + 0.001)

    if not ecc_passed:
        failure_reasons.append(
            f"Eccentricity test failed: corner bias error ({max_corner_err_kg} kg) exceeded statutory tolerance (±{ecc_mpe_kg} kg)"
        )

    calculated_eccentricity = {
        "loadTonnes": ecc_load_t,
        "readings": corner_readings,
        "cornerErrorsKg": corner_errors_kg,
        "maxErrorKg": max_corner_err_kg,
        "mpeKg": ecc_mpe_kg,
        "passed": ecc_passed,
        "verdict": "PASSED" if ecc_passed else "FAILED"
    }

    # 6. Overall Metrological Verdict
    all_tests_passed = len(failure_reasons) == 0
    overall_verdict = "PASSED" if all_tests_passed else "FAILED"

    # Reject client attempt to submit a false PASS
    if body.get("passedAllTests") is True and not all_tests_passed:
        raise HTTPException(
            status_code=400,
            detail=f"Verification failed statutory recalculation: {'; '.join(failure_reasons)}"
        )

    # 7. Generate Official GATC Calibration Report Record
    now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    today_str = datetime.now().strftime("%Y-%m-%d")
    report_num = f"GATC-TR-{datetime.now().year}-{random.randint(10000, 99999)}"

    technician_name = str(body.get("technicianName") or current_user.get("name") or center.get("inCharge")).strip()
    sec_standards_ref = str(body.get("secondaryStandardsRef") or "NPL-RRSL/2026/0411-SEC").strip()

    hash_source = f"{report_num}:{instrument.get('serialNumber')}:{effective_center_id}:{overall_verdict}:{now_iso}"
    report_hash = hashlib.sha256(hash_source.encode("utf-8")).hexdigest()

    test_report = {
        "id": f"gatc-rep-{int(datetime.now().timestamp() * 1000)}",
        "reportNumber": report_num,
        "instrumentId": instrument["id"],
        "serialNumber": instrument.get("serialNumber"),
        "brand": instrument.get("brand"),
        "model": instrument.get("model"),
        "category": instrument.get("category"),
        "maxCapacityKg": max_cap_kg,
        "gatcCenterId": center["id"],
        "gatcCenterName": center["name"],
        "recognitionNumber": center.get("recognitionNumber"),
        "technicianId": current_user.get("id"),
        "technicianName": technician_name,
        "submittedByUserId": current_user.get("id"),
        "secondaryStandardsRef": sec_standards_ref,
        "environmentalConditions": {
            "temperatureC": body.get("temperatureC", 28.5),
            "relativeHumidityPercent": body.get("relativeHumidityPercent", 55)
        },
        "loadTrials": calculated_load_trials,
        "repeatability": calculated_repeatability,
        "eccentricity": calculated_eccentricity,
        "overallVerdict": overall_verdict,
        "passedAllTests": all_tests_passed,
        "failureReasons": failure_reasons,
        "remarks": body.get("remarks") or ("Standard calibration conducted with secondary test masses traceable to NPL." if all_tests_passed else "Tolerance exceeded; rectification required."),
        "issuedAt": now_iso,
        "cryptographicHash": report_hash
    }

    # Store in database
    if "gatcTestReports" not in db:
        db["gatcTestReports"] = []
    db["gatcTestReports"].append(test_report)

    # Update instrument record
    instrument["gatcStatus"] = "CALIBRATED_PASSED" if all_tests_passed else "CALIBRATION_FAILED"
    instrument["lastGatcReportNumber"] = report_num
    instrument["lastGatcTestDate"] = today_str
    instrument["lastGatcCenter"] = center["name"]

    # If an application exists for this instrument, link the GATC report
    matching_app = next(
        (a for a in db.get("applications", [])
         if a.get("instrumentId") == instrument["id"] or a.get("serialNumber") == instrument.get("serialNumber")),
        None
    )
    if matching_app:
        matching_app["gatcReport"] = test_report

    # Section 24 Immutable Audit Trail
    add_audit_log(
        actor_role="GATC_TECHNICIAN",
        actor_name=f"{technician_name} ({center.get('recognitionNumber')})",
        action="GATC_CALIBRATION_REPORT_ISSUED" if all_tests_passed else "GATC_CALIBRATION_DEFECT_NOTICED",
        target=f"Instrument {instrument.get('serialNumber')} / Report {report_num}",
        details=f"Heavy instrument statutory calibration trial {overall_verdict}. Center: {center['name']}. Hash: {report_hash[:16]}..."
    )

    return {
        "success": True,
        "verdict": overall_verdict,
        "passedAllTests": all_tests_passed,
        "reportNumber": report_num,
        "report": test_report,
        "instrument": instrument,
        "message": f"GATC Calibration Test Report {report_num} generated with unbroken traceability to NPL/RRSL." if all_tests_passed else f"GATC Non-Conformance Notice {report_num} recorded."
    }

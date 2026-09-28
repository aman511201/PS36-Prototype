from typing import Dict, Any
from fastapi import APIRouter
from backend.utils.fee_calculator import calculate_statutory_fee
from backend.utils.mpe_calculator import calculate_mpe, evaluate_load_test

router = APIRouter(prefix="/api", tags=["Statutory Calculators"])

@router.post("/calculate-fee")
async def calculate_fee_endpoint(body: Dict[str, Any]):
    return calculate_statutory_fee(body)

@router.post("/calculate-mpe")
async def calculate_mpe_endpoint(body: Dict[str, Any]):
    accuracy_class = body.get("accuracyClass", "Class III")
    verification_interval_e = body.get("verificationInterval_e", 5)
    test_load = body.get("testLoad", 5000)
    verification_type = body.get("verificationType", "periodic")
    observed_reading = body.get("observedReading")

    if observed_reading is not None:
        return evaluate_load_test(
            accuracy_class=accuracy_class,
            verification_interval_e=verification_interval_e,
            test_load=test_load,
            observed_reading=observed_reading,
            verification_type=verification_type
        )

    return calculate_mpe(
        accuracy_class=accuracy_class,
        verification_interval_e=verification_interval_e,
        test_load=test_load,
        verification_type=verification_type
    )

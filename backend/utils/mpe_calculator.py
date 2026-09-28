from typing import Dict, Any

def calculate_mpe(
    accuracy_class: str = "Class III",
    verification_interval_e: float = 5.0,
    test_load: float = 5000.0,
    verification_type: str = "periodic"
) -> Dict[str, Any]:
    """
    Legal Metrology (General) Rules, 2011 - Maximum Permissible Error (MPE) Calculation Engine
    Reference: Schedule VI & Table 2 & 3 for Non-Automatic Weighing Instruments
    """
    try:
        e = float(verification_interval_e) if verification_interval_e else 1.0
    except (ValueError, TypeError):
        e = 1.0

    try:
        load = float(test_load) if test_load is not None else 0.0
    except (ValueError, TypeError):
        load = 0.0

    n = load / e if e > 0 else 0.0

    ac = str(accuracy_class).strip()
    if "Class IIII" in ac or "Class IV" in ac:
        norm_class = "Class IIII"
    elif "Class III" in ac:
        norm_class = "Class III"
    elif "Class II" in ac:
        norm_class = "Class II"
    elif "Class I" in ac:
        norm_class = "Class I"
    else:
        norm_class = "Class III"

    mpe_in_e = 1.0

    if norm_class == "Class I":
        if n <= 50000:
            mpe_in_e = 0.5
        elif n <= 200000:
            mpe_in_e = 1.0
        else:
            mpe_in_e = 1.5
    elif norm_class == "Class II":
        if n <= 5000:
            mpe_in_e = 0.5
        elif n <= 20000:
            mpe_in_e = 1.0
        else:
            mpe_in_e = 1.5
    elif norm_class == "Class III":
        if n <= 500:
            mpe_in_e = 0.5
        elif n <= 2000:
            mpe_in_e = 1.0
        else:
            mpe_in_e = 1.5
    else:  # Class IIII
        if n <= 50:
            mpe_in_e = 0.5
        elif n <= 200:
            mpe_in_e = 1.0
        else:
            mpe_in_e = 1.5

    multiplier = 1.0 if verification_type == "initial" else 2.0
    permissible_error_grams = mpe_in_e * e * multiplier

    return {
        "verificationInterval_e": e,
        "testLoadGrams": load,
        "scaleIntervalCount_n": n,
        "permissibleErrorUnits": mpe_in_e * multiplier,
        "maxPermissibleErrorGrams": permissible_error_grams,
        "permissibleRange": {
            "min": load - permissible_error_grams,
            "max": load + permissible_error_grams
        }
    }

def evaluate_load_test(
    accuracy_class: str,
    verification_interval_e: float,
    test_load: float,
    observed_reading: float,
    verification_type: str = "periodic"
) -> Dict[str, Any]:
    mpe_info = calculate_mpe(
        accuracy_class=accuracy_class,
        verification_interval_e=verification_interval_e,
        test_load=test_load,
        verification_type=verification_type
    )

    try:
        obs = float(observed_reading)
    except (ValueError, TypeError):
        obs = 0.0

    try:
        t_load = float(test_load)
    except (ValueError, TypeError):
        t_load = 0.0

    error = obs - t_load
    abs_error = abs(error)
    max_err = mpe_info["maxPermissibleErrorGrams"]
    passed = abs_error <= max_err

    return {
        "testLoad": t_load,
        "observedReading": obs,
        "error": error,
        "absError": abs_error,
        "maxPermissibleErrorGrams": max_err,
        "passed": passed,
        "statusText": f"Within Tolerance (±{max_err}g)" if passed else f"Exceeds Tolerance by {(abs_error - max_err):.2f}g"
    }

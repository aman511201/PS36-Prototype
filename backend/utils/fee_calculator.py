from typing import Dict, Any

def calculate_statutory_fee(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Statutory Verification Fee Calculator per Schedule XII of Legal Metrology (General) Rules, 2011
    """
    category = data.get("category", "")
    capacity_kg = data.get("capacityKg", 10)
    accuracy_class = data.get("accuracyClass", "Class III")
    is_late = data.get("isLate", False)
    late_days = data.get("lateDays", 0)

    base_fee = 200  # in INR
    description = "Standard Non-Automatic Weighing Instrument"

    try:
        cap = float(capacity_kg) if capacity_kg is not None else 10.0
    except (ValueError, TypeError):
        cap = 10.0

    if category == "Electronic Weighing Scale (Counter/Tabletop)":
        if cap <= 10:
            base_fee = 200
            description = "Electronic scale capacity up to 10 kg"
        elif cap <= 50:
            base_fee = 300
            description = "Electronic scale capacity 10 kg to 50 kg"
        else:
            base_fee = 400
            description = "Electronic scale capacity above 50 kg"

    elif category == "Platform Scale / Heavy Bench Scale":
        if cap <= 100:
            base_fee = 400
            description = "Platform scale up to 100 kg"
        elif cap <= 500:
            base_fee = 600
            description = "Platform scale 100 kg to 500 kg"
        else:
            base_fee = 1000
            description = "Platform scale above 500 kg"

    elif category == "Precision Analytical Balance (Jeweler/Lab)":
        if accuracy_class == "Class I":
            base_fee = 1500
            description = "Precision Class I Special Accuracy Balance"
        else:
            base_fee = 1000
            description = "Precision Class II High Accuracy Balance"

    elif category == "Weighbridge (Lorry/Truck)":
        if cap <= 50000:
            base_fee = 3000
            description = "Weighbridge capacity up to 50 Tonnes"
        else:
            base_fee = 5000
            description = "Weighbridge capacity above 50 Tonnes"

    elif category == "Fuel Dispensing Unit (Petrol/Diesel)":
        base_fee = 1000
        description = "Fuel Dispenser Metering Unit (per nozzle)"

    elif category == "Flow Meter / Bulk Liquid Measure":
        base_fee = 2500
        description = "Bulk flow meter / tanker compartment"

    else:
        base_fee = 250
        description = "General commercial weighing instrument"

    # Statutory Late Fee: 100% additional surcharge if past expiration date
    penalty = 0
    if is_late or (isinstance(late_days, (int, float)) and late_days > 0):
        penalty = base_fee

    user_fee = base_fee + penalty
    gst = 0  # Statutory government fees under Legal Metrology are exempt from GST under Indian Law

    return {
        "category": category,
        "capacityKg": cap,
        "accuracyClass": accuracy_class,
        "baseFee": base_fee,
        "description": description,
        "penalty": penalty,
        "totalFee": user_fee + gst,
        "isLatePenaltyApplied": penalty > 0,
        "statutoryRuleRef": "Schedule XII, Legal Metrology (General) Rules, 2011"
    }

"""
Statutory Instrument Rule Engine & Central Model Approval Registry
Under Legal Metrology Act, 2009 & Legal Metrology (General) Rules, 2011
"""

from typing import Dict, Any, List, Optional

APPROVED_MODELS: List[Dict[str, Any]] = [
    {
        "modelApprovalNumber": "IND/09/2021/412",
        "instrumentType": "Electronic Weighing Scale (Counter/Tabletop)",
        "manufacturer": "Essae-Teraoka",
        "model": "DS-252 Electronic Counter Scale",
        "accuracyClass": "Class III",
        "minCapacityKg": 0.1,
        "maxCapacityKg": 30.0,
        "verificationInterval_e": 5.0,  # in grams
        "verificationIntervalMonths": 12,
        "applicableRules": "Schedule VI & XII, Legal Metrology (General) Rules, 2011 (Non-Automatic Weighing Instruments - Class III)",
        "feeCategory": "Electronic Weighing Scale (Counter/Tabletop)"
    },
    {
        "modelApprovalNumber": "IND/09/2020/219",
        "instrumentType": "Electronic Weighing Scale (Counter/Tabletop)",
        "manufacturer": "Avery Weigh-Tronix",
        "model": "Berkel FX-120 Retail Scale",
        "accuracyClass": "Class III",
        "minCapacityKg": 0.04,
        "maxCapacityKg": 15.0,
        "verificationInterval_e": 2.0,
        "verificationIntervalMonths": 12,
        "applicableRules": "Schedule VI & XII, Legal Metrology (General) Rules, 2011 (Non-Automatic Weighing Instruments - Class III)",
        "feeCategory": "Electronic Weighing Scale (Counter/Tabletop)"
    },
    {
        "modelApprovalNumber": "IND/09/2022/339",
        "instrumentType": "Electronic Weighing Scale (Counter/Tabletop)",
        "manufacturer": "Avery Weigh-Tronix",
        "model": "ZK830 Counter Scale",
        "accuracyClass": "Class III",
        "minCapacityKg": 0.1,
        "maxCapacityKg": 35.0,
        "verificationInterval_e": 5.0,
        "verificationIntervalMonths": 12,
        "applicableRules": "Schedule VI & XII, Legal Metrology (General) Rules, 2011 (Non-Automatic Weighing Instruments - Class III)",
        "feeCategory": "Electronic Weighing Scale (Counter/Tabletop)"
    },
    {
        "modelApprovalNumber": "IND/09/2019/180",
        "instrumentType": "Platform Scale / Heavy Bench Scale",
        "manufacturer": "Phoenix",
        "model": "HeavyDuty-300 Platform",
        "accuracyClass": "Class III",
        "minCapacityKg": 1.0,
        "maxCapacityKg": 300.0,
        "verificationInterval_e": 50.0,
        "verificationIntervalMonths": 12,
        "applicableRules": "Schedule VI & XII, Legal Metrology (General) Rules, 2011 (Platform & Heavy Bench Scales)",
        "feeCategory": "Platform Scale / Heavy Bench Scale"
    },
    {
        "modelApprovalNumber": "IND/09/2023/008",
        "instrumentType": "Precision Analytical Balance (Jeweler/Lab)",
        "manufacturer": "Mettler Toledo",
        "model": "ME204T Analytical Precision Balance",
        "accuracyClass": "Class I",
        "minCapacityKg": 0.0001,
        "maxCapacityKg": 0.22,
        "verificationInterval_e": 0.001,  # in grams
        "verificationIntervalMonths": 12,
        "applicableRules": "Schedule VI (Part I), Legal Metrology (General) Rules, 2011 (Special Accuracy Balances - Class I)",
        "feeCategory": "Precision Analytical Balance (Jeweler/Lab)"
    },
    {
        "modelApprovalNumber": "IND/09/2022/604",
        "instrumentType": "Precision Analytical Balance (Jeweler/Lab)",
        "manufacturer": "Sartorius",
        "model": "Entris II Precision Balance",
        "accuracyClass": "Class II",
        "minCapacityKg": 0.005,
        "maxCapacityKg": 6.2,
        "verificationInterval_e": 0.01,
        "verificationIntervalMonths": 12,
        "applicableRules": "Schedule VI (Part I), Legal Metrology (General) Rules, 2011 (High Accuracy Balances - Class II)",
        "feeCategory": "Precision Analytical Balance (Jeweler/Lab)"
    },
    {
        "modelApprovalNumber": "IND/09/2021/118",
        "instrumentType": "Precision Analytical Balance (Jeweler/Lab)",
        "manufacturer": "Shimadzu",
        "model": "AP225W Analytical Balance",
        "accuracyClass": "Class I",
        "minCapacityKg": 0.0001,
        "maxCapacityKg": 0.22,
        "verificationInterval_e": 0.0001,
        "verificationIntervalMonths": 12,
        "applicableRules": "Schedule VI (Part I), Legal Metrology (General) Rules, 2011 (Special Accuracy Analytical Balances)",
        "feeCategory": "Precision Analytical Balance (Jeweler/Lab)"
    },
    {
        "modelApprovalNumber": "IND/09/2021/788",
        "instrumentType": "Fuel Dispensing Unit (Petrol/Diesel)",
        "manufacturer": "Tokheim / Gilbarco Veeder-Root",
        "model": "Frontier MPD High-Flow Dispenser Dual Nozzle",
        "accuracyClass": "Class III",
        "minCapacityKg": 2.0,
        "maxCapacityKg": 50.0,
        "verificationInterval_e": 10.0,
        "verificationIntervalMonths": 12,
        "applicableRules": "Schedule VII & Part V, Legal Metrology (General) Rules, 2011 (Liquid Measuring Units & Flow Dispensers)",
        "feeCategory": "Fuel Dispensing Unit (Petrol/Diesel)"
    },
    {
        "modelApprovalNumber": "IND/09/2020/541",
        "instrumentType": "Weighbridge (Lorry/Truck)",
        "manufacturer": "Essae-Teraoka",
        "model": "Pitless Electronic Lorry Weighbridge 60T",
        "accuracyClass": "Class III",
        "minCapacityKg": 200.0,
        "maxCapacityKg": 60000.0,
        "verificationInterval_e": 10000.0,
        "verificationIntervalMonths": 12,
        "applicableRules": "Schedule VI & Part II, Legal Metrology (General) Rules, 2011 (Automatic & Non-Automatic Road Weighbridges)",
        "feeCategory": "Weighbridge (Lorry/Truck)"
    },
    {
        "modelApprovalNumber": "IND/09/2023/812",
        "instrumentType": "Flow Meter / Bulk Liquid Measure",
        "manufacturer": "Emerson / Micro Motion",
        "model": "Coriolis Elite Bulk Flow Meter",
        "accuracyClass": "Class 0.3",
        "minCapacityKg": 10.0,
        "maxCapacityKg": 5000.0,
        "verificationInterval_e": 20.0,
        "verificationIntervalMonths": 12,
        "applicableRules": "Schedule VII, Legal Metrology (General) Rules, 2011 (Bulk Liquid Measurement & Pipe Flow Meters)",
        "feeCategory": "Flow Meter / Bulk Liquid Measure"
    }
]

def search_approved_models(query: Optional[str] = None, instrument_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Search central model approval registry by manufacturer, model, certificate number, or category.
    """
    results = list(APPROVED_MODELS)
    if instrument_type:
        itype = instrument_type.lower()
        results = [m for m in results if itype in m["instrumentType"].lower()]

    if query:
        q = query.strip().lower()
        results = [
            m for m in results
            if q in m["modelApprovalNumber"].lower()
            or q in m["manufacturer"].lower()
            or q in m["model"].lower()
            or q in m["instrumentType"].lower()
        ]

    return results

def find_approved_model(model_approval_number: Optional[str] = None, manufacturer: Optional[str] = None, model: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Finds a verified central model approval certificate record.
    """
    if model_approval_number:
        clean_num = model_approval_number.strip().upper()
        for m in APPROVED_MODELS:
            if m["modelApprovalNumber"].upper() == clean_num:
                return m

    if manufacturer and model:
        mfg = manufacturer.strip().lower()
        mod = model.strip().lower()
        for m in APPROVED_MODELS:
            m_mfg = m["manufacturer"].lower()
            m_mod = m["model"].lower()
            if (mfg in m_mfg or m_mfg in mfg) and (mod in m_mod or m_mod in mod):
                return m

    return None

def derive_instrument_specifications(
    instrument_type: str,
    capacity_kg: float,
    manufacturer: Optional[str] = None,
    model: Optional[str] = None,
    model_approval_number: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative Statutory Rule Engine:
    Derives accuracyClass, e (interval), applicableRules, verificationIntervalMonths, and feeCategory.
    Validates model against Central Model Approval Registry.
    """
    matched = find_approved_model(model_approval_number, manufacturer, model)

    if matched:
        return {
            "isApprovedModel": True,
            "modelApprovalNumber": matched["modelApprovalNumber"],
            "accuracyClass": matched["accuracyClass"],
            "verificationInterval_e": matched["verificationInterval_e"],
            "minCapacityGrams": matched["minCapacityKg"] * 1000.0,
            "verificationPeriodMonths": matched["verificationIntervalMonths"],
            "applicableRules": matched["applicableRules"],
            "feeCategory": matched["feeCategory"],
            "manufacturer": matched["manufacturer"],
            "model": matched["model"]
        }

    # If not in the pre-compiled approved models catalog, derive using statutory rules
    itype = (instrument_type or "").lower()
    try:
        cap = float(capacity_kg) if capacity_kg is not None else 10.0
    except (ValueError, TypeError):
        cap = 10.0

    if "precision" in itype or "analytical" in itype:
        accuracy_class = "Class I" if cap <= 0.5 else "Class II"
        e = 0.001 if accuracy_class == "Class I" else 0.01
        min_g = 0.01 if accuracy_class == "Class I" else 0.5
        rules = "Schedule VI (Part I), Legal Metrology (General) Rules, 2011 (Precision & Analytical Balances)"
        fee_cat = "Precision Analytical Balance (Jeweler/Lab)"
    elif "weighbridge" in itype:
        accuracy_class = "Class III"
        e = 10000.0  # 10kg
        min_g = 200000.0  # 200kg
        rules = "Schedule VI & Part II, Legal Metrology (General) Rules, 2011 (Heavy Road Weighbridges)"
        fee_cat = "Weighbridge (Lorry/Truck)"
    elif "fuel" in itype:
        accuracy_class = "Class III"
        e = 10.0  # 10ml
        min_g = 2000.0
        rules = "Schedule VII, Legal Metrology (General) Rules, 2011 (Liquid Fuel Metering Units)"
        fee_cat = "Fuel Dispensing Unit (Petrol/Diesel)"
    elif "platform" in itype:
        accuracy_class = "Class III"
        e = 50.0 if cap <= 300 else 100.0
        min_g = 1000.0
        rules = "Schedule VI, Legal Metrology (General) Rules, 2011 (Platform Scales)"
        fee_cat = "Platform Scale / Heavy Bench Scale"
    elif "flow meter" in itype:
        accuracy_class = "Class 0.3"
        e = 20.0
        min_g = 5000.0
        rules = "Schedule VII, Legal Metrology (General) Rules, 2011 (Bulk Flow Meters)"
        fee_cat = "Flow Meter / Bulk Liquid Measure"
    else:
        accuracy_class = "Class III"
        e = 2.0 if cap <= 15 else (5.0 if cap <= 30 else 10.0)
        min_g = 100.0
        rules = "Schedule VI, Legal Metrology (General) Rules, 2011 (Non-Automatic Weighing Instruments)"
        fee_cat = "Electronic Weighing Scale (Counter/Tabletop)"

    return {
        "isApprovedModel": False,
        "modelApprovalNumber": model_approval_number if (model_approval_number and model_approval_number.startswith("IND/")) else None,
        "accuracyClass": accuracy_class,
        "verificationInterval_e": e,
        "minCapacityGrams": min_g,
        "verificationPeriodMonths": 12,
        "applicableRules": rules,
        "feeCategory": fee_cat,
        "manufacturer": manufacturer,
        "model": model
    }

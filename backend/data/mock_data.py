import json
import os
import copy

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(DATA_DIR, "mockData.json")

def get_default_seal_inventory():
    seals = []

    # 1. Lead / Wire Seals allocated to Shri Rajesh K. Sharma (lmo-01, LMO-MH-042)
    # Available for field inspections
    for i in range(4201, 4220):
        seals.append({
            "id": f"SEAL-LS-{i}",
            "sealNumber": f"MH-LMO-LS-{i}",
            "sealType": "LEAD_WIRE_SEAL",
            "state": "Maharashtra",
            "district": "Mumbai Suburban",
            "officerId": "lmo-01",
            "officerBadge": "LMO-MH-042",
            "status": "AVAILABLE",
            "batchNumber": "MH-2026-B1",
            "allocatedDate": "2026-01-10",
            "assignedToApplicationId": None,
            "assignedToCertificateId": None,
            "assignedAt": None,
            "assignedByOfficerId": None
        })

    # Standard testing seals for automated tests
    for s_num in ["MH-LMO-LS-1111", "MH-LMO-LS-9999", "MH-LMO42-LS-1024"]:
        seals.append({
            "id": f"SEAL-LS-TEST-{s_num}",
            "sealNumber": s_num,
            "sealType": "LEAD_WIRE_SEAL",
            "state": "Maharashtra",
            "district": "Mumbai Suburban",
            "officerId": "lmo-01",
            "officerBadge": "LMO-MH-042",
            "status": "AVAILABLE",
            "batchNumber": "MH-2026-TEST",
            "allocatedDate": "2026-01-01",
            "assignedToApplicationId": None,
            "assignedToCertificateId": None,
            "assignedAt": None,
            "assignedByOfficerId": None
        })

    # Lead / Wire Seals allocated to Dr. Ananya Sundaram (lmo-02, LMO-KA-118, Bengaluru Urban)
    for i in range(5201, 5215):
        seals.append({
            "id": f"SEAL-LS-KA-{i}",
            "sealNumber": f"KA-LMO-LS-{i}",
            "sealType": "LEAD_WIRE_SEAL",
            "state": "Karnataka",
            "district": "Bengaluru Urban",
            "officerId": "lmo-02",
            "officerBadge": "LMO-KA-118",
            "status": "AVAILABLE",
            "batchNumber": "KA-2026-B1",
            "allocatedDate": "2026-01-10",
            "assignedToApplicationId": None,
            "assignedToCertificateId": None,
            "assignedAt": None,
            "assignedByOfficerId": None
        })
    seals.append({
        "id": "SEAL-LS-TEST-KA-2222",
        "sealNumber": "KA-LMO-LS-2222",
        "sealType": "LEAD_WIRE_SEAL",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "officerId": "lmo-02",
        "officerBadge": "LMO-KA-118",
        "status": "AVAILABLE",
        "batchNumber": "KA-2026-TEST",
        "allocatedDate": "2026-01-01",
        "assignedToApplicationId": None,
        "assignedToCertificateId": None,
        "assignedAt": None,
        "assignedByOfficerId": None
    })

    # Already ASSIGNED lead seals (attached to initial certificates)
    seals.append({
        "id": "SEAL-LS-8921",
        "sealNumber": "MH-LMO42-LS-8921",
        "sealType": "LEAD_WIRE_SEAL",
        "state": "Maharashtra",
        "district": "Mumbai Suburban",
        "officerId": "lmo-01",
        "officerBadge": "LMO-MH-042",
        "status": "ASSIGNED",
        "batchNumber": "MH-2025-A",
        "allocatedDate": "2025-01-05",
        "assignedToApplicationId": "APP-2025-08492",
        "assignedToCertificateId": "MH/LM/2025/08492",
        "assignedAt": "2025-01-10T14:30:00",
        "assignedByOfficerId": "lmo-01"
    })
    seals.append({
        "id": "SEAL-LS-3391",
        "sealNumber": "KA-LMO118-LS-3391",
        "sealType": "LEAD_WIRE_SEAL",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "officerId": "lmo-02",
        "officerBadge": "LMO-KA-118",
        "status": "ASSIGNED",
        "batchNumber": "KA-2026-A",
        "allocatedDate": "2026-01-02",
        "assignedToApplicationId": "APP-2026-01290",
        "assignedToCertificateId": "KA/LM/2026/01290",
        "assignedAt": "2026-01-08T10:15:00",
        "assignedByOfficerId": "lmo-02"
    })
    seals.append({
        "id": "SEAL-LS-9912",
        "sealNumber": "DL-LMO27-LS-9912",
        "sealType": "LEAD_WIRE_SEAL",
        "state": "Delhi",
        "district": "Central Delhi",
        "officerId": "lmo-03",
        "officerBadge": "LMO-DL-027",
        "status": "ASSIGNED",
        "batchNumber": "DL-2026-A",
        "allocatedDate": "2026-01-02",
        "assignedToApplicationId": "APP-2026-04419",
        "assignedToCertificateId": "DL/LM/2026/04419",
        "assignedAt": "2026-01-12T16:00:00",
        "assignedByOfficerId": "lmo-03"
    })

    # Defective / Revoked lead seals
    seals.append({
        "id": "SEAL-LS-DEFECT-01",
        "sealNumber": "MH-LMO-LS-DEFECT-01",
        "sealType": "LEAD_WIRE_SEAL",
        "state": "Maharashtra",
        "district": "Mumbai Suburban",
        "officerId": "lmo-01",
        "officerBadge": "LMO-MH-042",
        "status": "DEFECTIVE",
        "defectReason": "Broken crimping wire and corroded lead pellet",
        "batchNumber": "MH-2026-B1",
        "allocatedDate": "2026-01-10"
    })
    seals.append({
        "id": "SEAL-LS-REVOKED-01",
        "sealNumber": "MH-LMO-LS-REVOKED-01",
        "sealType": "LEAD_WIRE_SEAL",
        "state": "Maharashtra",
        "district": "Mumbai Suburban",
        "officerId": "lmo-01",
        "officerBadge": "LMO-MH-042",
        "status": "REVOKED",
        "defectReason": "Revoked by Controller of Legal Metrology following batch audit alert",
        "batchNumber": "MH-2026-BAD",
        "allocatedDate": "2026-01-10"
    })

    # 2. Tamper-Evident Holograms
    # Available for field inspections
    for i in range(4201, 4220):
        seals.append({
            "id": f"SEAL-HOL-{i}",
            "sealNumber": f"HOL-GOI-2026-{i}",
            "sealType": "HOLOGRAM_STICKER",
            "state": "Maharashtra",
            "district": "Mumbai Suburban",
            "officerId": "lmo-01",
            "officerBadge": "LMO-MH-042",
            "status": "AVAILABLE",
            "batchNumber": "HOL-2026-B1",
            "allocatedDate": "2026-01-10",
            "assignedToApplicationId": None,
            "assignedToCertificateId": None,
            "assignedAt": None,
            "assignedByOfficerId": None
        })

    # Standard testing holograms for automated tests
    for h_num in ["HOL-GOI-2026-111111", "HOL-GOI-2026-999999", "HOL-GOI-2026-902142"]:
        seals.append({
            "id": f"SEAL-HOL-TEST-{h_num}",
            "sealNumber": h_num,
            "sealType": "HOLOGRAM_STICKER",
            "state": "Maharashtra",
            "district": "Mumbai Suburban",
            "officerId": "lmo-01",
            "officerBadge": "LMO-MH-042",
            "status": "AVAILABLE",
            "batchNumber": "HOL-2026-TEST",
            "allocatedDate": "2026-01-01",
            "assignedToApplicationId": None,
            "assignedToCertificateId": None,
            "assignedAt": None,
            "assignedByOfficerId": None
        })

    # Holograms allocated to Dr. Ananya Sundaram (lmo-02, LMO-KA-118, Bengaluru Urban)
    for i in range(5201, 5215):
        seals.append({
            "id": f"SEAL-HOL-KA-{i}",
            "sealNumber": f"HOL-KA-2026-{i}",
            "sealType": "HOLOGRAM_STICKER",
            "state": "Karnataka",
            "district": "Bengaluru Urban",
            "officerId": "lmo-02",
            "officerBadge": "LMO-KA-118",
            "status": "AVAILABLE",
            "batchNumber": "HOL-KA-2026-B1",
            "allocatedDate": "2026-01-10",
            "assignedToApplicationId": None,
            "assignedToCertificateId": None,
            "assignedAt": None,
            "assignedByOfficerId": None
        })
    seals.append({
        "id": "SEAL-HOL-TEST-KA-222222",
        "sealNumber": "HOL-KA-2026-222222",
        "sealType": "HOLOGRAM_STICKER",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "officerId": "lmo-02",
        "officerBadge": "LMO-KA-118",
        "status": "AVAILABLE",
        "batchNumber": "HOL-KA-2026-TEST",
        "allocatedDate": "2026-01-01",
        "assignedToApplicationId": None,
        "assignedToCertificateId": None,
        "assignedAt": None,
        "assignedByOfficerId": None
    })

    # Already ASSIGNED holograms (attached to initial certificates)
    seals.append({
        "id": "SEAL-HOL-783921",
        "sealNumber": "HOL-GOI-2025-783921",
        "sealType": "HOLOGRAM_STICKER",
        "state": "Maharashtra",
        "district": "Mumbai Suburban",
        "officerId": "lmo-01",
        "officerBadge": "LMO-MH-042",
        "status": "ASSIGNED",
        "batchNumber": "HOL-2025-A",
        "allocatedDate": "2025-01-05",
        "assignedToApplicationId": "APP-2025-08492",
        "assignedToCertificateId": "MH/LM/2025/08492",
        "assignedAt": "2025-01-10T14:30:00",
        "assignedByOfficerId": "lmo-01"
    })
    seals.append({
        "id": "SEAL-HOL-118944",
        "sealNumber": "HOL-GOI-2026-118944",
        "sealType": "HOLOGRAM_STICKER",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "officerId": "lmo-02",
        "officerBadge": "LMO-KA-118",
        "status": "ASSIGNED",
        "batchNumber": "HOL-2026-A",
        "allocatedDate": "2026-01-02",
        "assignedToApplicationId": "APP-2026-01290",
        "assignedToCertificateId": "KA/LM/2026/01290",
        "assignedAt": "2026-01-08T10:15:00",
        "assignedByOfficerId": "lmo-02"
    })
    seals.append({
        "id": "SEAL-HOL-902341",
        "sealNumber": "HOL-GOI-2026-902341",
        "sealType": "HOLOGRAM_STICKER",
        "state": "Delhi",
        "district": "Central Delhi",
        "officerId": "lmo-03",
        "officerBadge": "LMO-DL-027",
        "status": "ASSIGNED",
        "batchNumber": "HOL-2026-A",
        "allocatedDate": "2026-01-02",
        "assignedToApplicationId": "APP-2026-04419",
        "assignedToCertificateId": "DL/LM/2026/04419",
        "assignedAt": "2026-01-12T16:00:00",
        "assignedByOfficerId": "lmo-03"
    })

    # Defective / Revoked holograms
    seals.append({
        "id": "SEAL-HOL-DEFECT-01",
        "sealNumber": "HOL-GOI-DEFECT-01",
        "sealType": "HOLOGRAM_STICKER",
        "state": "Maharashtra",
        "district": "Mumbai Suburban",
        "officerId": "lmo-01",
        "officerBadge": "LMO-MH-042",
        "status": "DEFECTIVE",
        "defectReason": "Void tamper pattern prematurely detached",
        "batchNumber": "HOL-2026-B1",
        "allocatedDate": "2026-01-10"
    })
    seals.append({
        "id": "SEAL-HOL-REVOKED-01",
        "sealNumber": "HOL-GOI-REVOKED-01",
        "sealType": "HOLOGRAM_STICKER",
        "state": "Maharashtra",
        "district": "Mumbai Suburban",
        "officerId": "lmo-01",
        "officerBadge": "LMO-MH-042",
        "status": "REVOKED",
        "defectReason": "Revoked following security printing barcode duplication report",
        "batchNumber": "HOL-2026-BAD",
        "allocatedDate": "2026-01-10"
    })

    return seals

def load_seed_data():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {
        "jurisdictions": copy.deepcopy(data.get("jurisdictions", [])),
        "regulators": copy.deepcopy(data.get("regulators", [])),
        "officers": copy.deepcopy(data.get("officers", [])),
        "gatcCenters": copy.deepcopy(data.get("gatcCenters", [])),
        "merchants": copy.deepcopy(data.get("merchants", [])),
        "instruments": copy.deepcopy(data.get("initialInstruments", [])),
        "applications": copy.deepcopy(data.get("initialApplications", [])),
        "certificates": copy.deepcopy(data.get("initialCertificates", [])),
        "grievances": copy.deepcopy(data.get("initialGrievances", [])),
        "auditLogs": copy.deepcopy(data.get("initialAuditLogs", [])),
        "sealInventory": copy.deepcopy(data.get("sealInventory", get_default_seal_inventory())),
        "gatcTestReports": copy.deepcopy(data.get("gatcTestReports", [])),
        "payments": copy.deepcopy(data.get("payments", []))
    }

# In-memory working database
db = load_seed_data()

def reset_db():
    global db
    new_data = load_seed_data()
    db.clear()
    db.update(new_data)
    return db

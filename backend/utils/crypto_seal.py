import hashlib

def generate_certificate_hash(
    cert_number: str,
    serial_number: str,
    stamping_date: str,
    officer_id: str,
    lead_seal_no: str,
    hologram_no: str
) -> str:
    """
    Generate SHA-256 Tamper-Proof Signature Hash for Legal Metrology Verification Certificate
    """
    payload = f"{cert_number}|{serial_number}|{stamping_date}|{officer_id}|{lead_seal_no}|{hologram_no}|GOI_LEGAL_METROLOGY_ACT_2009"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def verify_certificate_integrity(
    cert_number: str,
    serial_number: str,
    stamping_date: str,
    officer_id: str,
    lead_seal_no: str,
    hologram_no: str,
    expected_hash: str
) -> bool:
    """
    Verify integrity of certificate data against cryptographic hash
    """
    recalculated = generate_certificate_hash(
        cert_number=cert_number,
        serial_number=serial_number,
        stamping_date=stamping_date,
        officer_id=officer_id,
        lead_seal_no=lead_seal_no,
        hologram_no=hologram_no
    )
    return recalculated == expected_hash

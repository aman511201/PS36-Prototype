import time
import random
from datetime import datetime
from typing import Dict, Any, Optional
from backend.data.mock_data import db
from backend.utils.crypto_seal import generate_certificate_hash

def add_audit_log(
    actor_role: str,
    actor_name: str,
    action: str,
    target: str,
    details: str,
    ip_address: str = "127.0.0.1"
) -> Dict[str, Any]:
    """
    Append an immutable, cryptographically sealed entry into the statutory audit log.
    """
    now = datetime.now()
    now_iso = now.isoformat()
    now_str = now_iso.replace("T", " ")[:19]

    signature_hash = generate_certificate_hash(
        cert_number=target or "AUDIT",
        serial_number=action or "ACTION",
        stamping_date=now_iso,
        officer_id=actor_name or "SYSTEM",
        lead_seal_no="AUDIT",
        hologram_no="IMMUTABLE"
    )[:32]

    log_entry = {
        "id": f"aud-{int(time.time() * 1000)}-{random.randint(100, 999)}",
        "timestamp": now_str,
        "actorRole": actor_role.upper() if actor_role else "USER",
        "actorName": actor_name,
        "action": action,
        "target": target,
        "details": details,
        "ipAddress": ip_address,
        "signatureHash": signature_hash
    }

    db["auditLogs"].insert(0, log_entry)
    return log_entry

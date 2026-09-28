from fastapi import APIRouter, Depends
from backend.data.mock_data import db
from backend.middleware.auth import require_role

router = APIRouter(prefix="/api/audit-logs", tags=["Audit Ledger"])

@router.get("")
async def get_audit_logs(
    current_user: dict = Depends(require_role("regulator"))
):
    return db["auditLogs"]

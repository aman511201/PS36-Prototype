from fastapi import APIRouter
from backend.data.mock_data import db
from backend.services.auth_service import sanitize_account

router = APIRouter(prefix="/api", tags=["Public Directories"])

@router.get("/jurisdictions")
async def get_jurisdictions():
    return db["jurisdictions"]

@router.get("/officers")
async def get_officers():
    return [sanitize_account(o) for o in db["officers"]]

@router.get("/gatc-centers")
async def get_gatc_centers():
    return [sanitize_account(g) for g in db["gatcCenters"]]

@router.get("/merchants")
async def get_merchants():
    return [sanitize_account(m) for m in db["merchants"]]

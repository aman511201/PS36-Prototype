import sys
import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
import uvicorn

from backend.config import PORT, HOST
from backend.data.mock_data import db
from backend.routes import (
    auth_router,
    directories_router,
    instruments_router,
    applications_router,
    certificates_router,
    grievances_router,
    audit_logs_router,
    calculators_router,
    stats_router,
    seals_router,
    gatc_router,
    payments_router
)

app = FastAPI(
    title="National Legal Metrology Verification System (Maanak / NLMVS) API",
    description="Statutory Verification, Stamping & Compliance Engine under Legal Metrology Act, 2009",
    version="1.0.0"
)

# CORS configuration - allow all origins for seamless development and proxy interoperability
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom error format handler: ensure API failures return `{"error": "..."}` for frontend compatibility
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    msg = first_error.get("msg", "Invalid request parameters.")
    return JSONResponse(
        status_code=400,
        content={"error": f"Validation Error: {msg}"}
    )

# Health Check Route
@app.get("/api/health")
async def health_check():
    return {
        "status": "ONLINE",
        "system": "National Legal Metrology Verification System (Maanak / NLMVS)",
        "act": "Legal Metrology Act, 2009 & General Rules, 2011",
        "serverTime": datetime.now().isoformat(),
        "metrics": {
            "instruments": len(db["instruments"]),
            "applications": len(db["applications"]),
            "certificates": len(db["certificates"]),
            "grievances": len(db["grievances"])
        }
    }

# Register API Routers
app.include_router(auth_router)
app.include_router(directories_router)
app.include_router(instruments_router)
app.include_router(applications_router)
app.include_router(certificates_router)
app.include_router(grievances_router)
app.include_router(audit_logs_router)
app.include_router(calculators_router)
app.include_router(stats_router)
app.include_router(seals_router)
app.include_router(gatc_router)
app.include_router(payments_router)

if __name__ == "__main__":
    print("================================================================")
    print(" National Legal Metrology Online Verification System (NLMVS) API ")
    print(" Powered by: FastAPI (Python 3.13)                              ")
    print(" Governed by: Legal Metrology Act, 2009 & General Rules, 2011   ")
    print(f" Server active on: http://{HOST}:{PORT}                       ")
    print("================================================================")
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)

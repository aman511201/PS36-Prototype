from .auth import router as auth_router
from .directories import router as directories_router
from .instruments import router as instruments_router
from .applications import router as applications_router
from .certificates import router as certificates_router
from .grievances import router as grievances_router
from .audit_logs import router as audit_logs_router
from .calculators import router as calculators_router
from .stats import router as stats_router
from .seals import router as seals_router, verify_seal_in_inventory
from .gatc import router as gatc_router
from .payments import router as payments_router

__all__ = [
    "auth_router",
    "directories_router",
    "instruments_router",
    "applications_router",
    "certificates_router",
    "grievances_router",
    "audit_logs_router",
    "calculators_router",
    "stats_router",
    "seals_router",
    "verify_seal_in_inventory",
    "gatc_router",
    "payments_router"
]

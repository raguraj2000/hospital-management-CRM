"""Central API v1 router consolidating all modular sub-routers."""

from fastapi import APIRouter
from src.api.v1.endpoints import (
    auth,
    billing,
    branch,
    checkout,
    expenses,
    lab,
    org,
    patients,
    pharmacy,
    platform,
    prescriptions,
    purchases,
    reports,
    staff,
    treatment,
    vendors,
    visits,
)

api_v1_router = APIRouter(prefix="/api")

api_v1_router.include_router(auth.router)
api_v1_router.include_router(platform.router)
api_v1_router.include_router(org.router)
api_v1_router.include_router(branch.router)
api_v1_router.include_router(staff.router)
api_v1_router.include_router(patients.router)
api_v1_router.include_router(visits.router)
api_v1_router.include_router(prescriptions.router)
api_v1_router.include_router(treatment.router)
api_v1_router.include_router(pharmacy.router)
api_v1_router.include_router(lab.router)
api_v1_router.include_router(billing.router)
api_v1_router.include_router(expenses.router)
api_v1_router.include_router(purchases.router)
api_v1_router.include_router(vendors.router)
api_v1_router.include_router(reports.router)
api_v1_router.include_router(checkout.router)

# Compatibility alias for direct client error telemetry (unlisted in business API schema)
api_v1_router.add_api_route("/client-error", branch.log_client_error, methods=["POST"], include_in_schema=False)

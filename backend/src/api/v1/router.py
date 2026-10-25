"""Central API v1 router consolidating all modular sub-routers."""

from fastapi import APIRouter
from src.api.v1.endpoints import auth, billing, checkout, patients, pharmacy, platform, visits

api_v1_router = APIRouter(prefix="/api")

api_v1_router.include_router(auth.router)
api_v1_router.include_router(platform.router)
api_v1_router.include_router(patients.router)
api_v1_router.include_router(visits.router)
api_v1_router.include_router(billing.router)
api_v1_router.include_router(pharmacy.router)
api_v1_router.include_router(checkout.router)


"""FastAPI Application Factory."""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from src.api.v1.router import api_v1_router
from src.constants.errors import ErrorCode
from src.core.config import settings
from src.core.exceptions import AppException, app_exception_handler
from src.core.lifespan import lifespan
from src.dal import db_connection_manager
from src.middleware.correlation_id import CorrelationIdMiddleware


def create_app() -> FastAPI:
    """Builds, configures, and returns a fully initialized FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        version="2.0.0",
        description="Production-Grade Enterprise Hospital Management System (HMS) Backend",
        lifespan=lifespan,
    )

    # 1. Register Middlewares
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Register Exception Handlers
    app.add_exception_handler(AppException, app_exception_handler)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        details = []
        for err in exc.errors():
            loc = [str(x) for x in err.get("loc", []) if str(x) != "body"]
            details.append({
                "field": ".".join(loc) or "request",
                "message": err.get("msg", "Invalid value"),
            })
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "status_code": 422,
                "message": "Request validation failed",
                "data": None,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "details": details,
                },
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status_code": exc.status_code,
                "message": str(exc.detail) if exc.detail else "HTTP error",
                "data": None,
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "details": None,
                },
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status_code": 500,
                "message": "An unexpected server error occurred.",
                "data": None,
                "error": {
                    "code": str(ErrorCode.INTERNAL_SERVER_ERROR),
                    "details": None,
                },
            },
        )

    # 3. Health & Observability Endpoints
    @app.get("/health/liveness", tags=["Observability"])
    async def liveness() -> dict:
        return {"status": "ok"}

    @app.get("/health/readiness", tags=["Observability"])
    async def readiness() -> JSONResponse:
        is_healthy = await db_connection_manager.check_health()
        if is_healthy:
            return JSONResponse(status_code=200, content={"status": "ready", "database": "connected"})
        return JSONResponse(status_code=503, content={"status": "degraded", "database": "disconnected"})

    # 4. Mount API Routers
    app.include_router(api_v1_router)

    return app


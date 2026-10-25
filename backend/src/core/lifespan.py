"""FastAPI application lifespan manager for startup and graceful shutdown."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
import logging
from src.core.logging import configure_logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    configure_logging()
    logger.info("Initializing HMS FastAPI Backend...")

    # Lazy-init database engine on startup via DAL
    from src.dal.connection import db_connection_manager
    await db_connection_manager.initialize()
    logger.info("Database connection pool initialized.")

    yield

    logger.info("Shutting down HMS FastAPI Backend...")
    await db_connection_manager.close()
    logger.info("Database connection pool cleanly closed.")


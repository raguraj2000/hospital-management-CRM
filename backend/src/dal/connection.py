"""Database engine and session factory management."""

import logging
from typing import Optional
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from src.core.config import settings
from src.dal.dialects.postgresql import get_postgresql_engine_args
from src.dal.dialects.sqlite import configure_sqlite_pragmas, get_sqlite_engine_args

logger = logging.getLogger(__name__)


class DatabaseConnectionManager:
    """Manages the lifecycle of database engines and async sessionmakers."""

    def __init__(self) -> None:
        self._engine: Optional[AsyncEngine] = None
        self._sessionmaker: Optional[async_sessionmaker[AsyncSession]] = None
        self._is_sqlite: bool = False

    async def initialize(self) -> None:
        """Initializes the database connection pool."""
        if self._engine is not None:
            return

        db_url = settings.DATABASE_URL
        self._is_sqlite = db_url.startswith("sqlite")

        if self._is_sqlite:
            args = get_sqlite_engine_args()
            self._engine = create_async_engine(db_url, **args)
            event.listen(self._engine.sync_engine, "connect", configure_sqlite_pragmas)
        else:
            args = get_postgresql_engine_args()
            self._engine = create_async_engine(
                db_url,
                pool_size=settings.DATABASE_POOL_SIZE,
                max_overflow=settings.DATABASE_MAX_OVERFLOW,
                pool_timeout=settings.DATABASE_POOL_TIMEOUT,
                **args,
            )

        self._sessionmaker = async_sessionmaker(
            bind=self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
        logger.info("Database engine initialized: %s", "SQLite" if self._is_sqlite else "PostgreSQL")

    async def close(self) -> None:
        """Closes all connections in the pool."""
        if self._engine is not None:
            await self._engine.dispose()
            self._engine = None
            self._sessionmaker = None
            logger.info("Database engine disposed.")

    def get_sessionmaker(self) -> async_sessionmaker[AsyncSession]:
        """Returns the configured sessionmaker."""
        if self._sessionmaker is None:
            raise RuntimeError("DatabaseConnectionManager is not initialized. Call initialize() first.")
        return self._sessionmaker

    @property
    def is_sqlite(self) -> bool:
        return self._is_sqlite

    async def check_health(self) -> bool:
        """Performs a quick connectivity health check."""
        if self._sessionmaker is None:
            return False
        try:
            async with self._sessionmaker() as session:
                await session.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error("Database health check failed: %s", e)
            return False


db_connection_manager = DatabaseConnectionManager()


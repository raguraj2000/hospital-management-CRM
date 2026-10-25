"""Transaction and Unit-of-Work demarcation."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal.connection import db_connection_manager


@asynccontextmanager
async def transaction(session: Optional[AsyncSession] = None) -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager demarcating transaction boundaries.
    Commits automatically upon exit or rolls back if an exception occurs.
    """
    if session is not None:
        # Reusing existing session in nested scope
        yield session
        return

    sessionmaker = db_connection_manager.get_sessionmaker()
    async with sessionmaker() as new_session:
        async with new_session.begin():
            try:
                yield new_session
            except Exception:
                await new_session.rollback()
                raise


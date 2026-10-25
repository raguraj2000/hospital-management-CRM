"""
Data Access Layer (DAL) Statement Execution.
This is the ONLY module permitted to invoke session.execute(), commit(), rollback(),
or communicate directly with the SQLAlchemy AsyncSession.
"""

from typing import Any, List, Optional, Sequence, TypeVar
from sqlalchemy import Executable
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal.connection import db_connection_manager

T = TypeVar("T")


async def execute_all(
    statement: Executable,
    session: Optional[AsyncSession] = None,
) -> Sequence[Any]:
    """Executes a statement and returns all resulting model instances or rows."""
    if session is not None:
        result = await session.execute(statement)
        return result.scalars().all()

    sessionmaker = db_connection_manager.get_sessionmaker()
    async with sessionmaker() as sess:
        result = await sess.execute(statement)
        return result.scalars().all()


async def execute_one_or_none(
    statement: Executable,
    session: Optional[AsyncSession] = None,
) -> Optional[Any]:
    """Executes a statement and returns a single model instance or None."""
    if session is not None:
        result = await session.execute(statement)
        return result.scalars().one_or_none()

    sessionmaker = db_connection_manager.get_sessionmaker()
    async with sessionmaker() as sess:
        result = await sess.execute(statement)
        return result.scalars().one_or_none()


async def execute_scalar(
    statement: Executable,
    session: Optional[AsyncSession] = None,
) -> Any:
    """Executes a statement and returns a scalar value (e.g. COUNT(*), boolean check)."""
    if session is not None:
        result = await session.execute(statement)
        return result.scalar()

    sessionmaker = db_connection_manager.get_sessionmaker()
    async with sessionmaker() as sess:
        result = await sess.execute(statement)
        return result.scalar()


async def execute_dml(
    statement: Executable,
    session: AsyncSession,
) -> Any:
    """Executes an INSERT, UPDATE, or DELETE statement within an active transaction session."""
    return await session.execute(statement)


async def save_entity(
    entity: T,
    session: AsyncSession,
) -> T:
    """Adds an ORM entity to the active session and flushes pending changes."""
    session.add(entity)
    await session.flush()
    return entity


async def refresh_entity(
    entity: T,
    session: AsyncSession,
) -> T:
    """Refreshes an ORM entity from the database within the active session."""
    await session.refresh(entity)
    return entity


async def delete_entity(
    entity: Any,
    session: AsyncSession,
) -> None:
    """Marks an ORM entity for deletion within the active session."""
    await session.delete(entity)
    await session.flush()


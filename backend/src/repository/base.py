"""Base repository providing statement construction and DAL invocation."""

from typing import Any, Generic, List, Optional, Sequence, Type, TypeVar
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal import delete_entity, execute_all, execute_one_or_none, execute_scalar, save_entity
from src.models.base import Base

T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    """Generic repository constructing queries and delegating execution strictly to DAL."""

    def __init__(self, model_class: Type[T]) -> None:
        self.model_class = model_class

    async def get_by_id(
        self,
        entity_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Optional[T]:
        """Builds select query by primary key and delegates execution to DAL."""
        stmt = select(self.model_class).where(self.model_class.id == entity_id)
        return await execute_one_or_none(stmt, session=session)

    async def list_all(
        self,
        limit: int = 50,
        offset: int = 0,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[T]:
        """Builds paginated select query and delegates execution to DAL."""
        stmt = select(self.model_class).limit(limit).offset(offset)
        return await execute_all(stmt, session=session)

    async def save(
        self,
        entity: T,
        session: AsyncSession,
    ) -> T:
        """Saves or updates an entity within the active transaction session via DAL."""
        return await save_entity(entity, session=session)

    async def delete(
        self,
        entity: T,
        session: AsyncSession,
    ) -> None:
        """Deletes an entity within the active transaction session via DAL."""
        await delete_entity(entity, session=session)


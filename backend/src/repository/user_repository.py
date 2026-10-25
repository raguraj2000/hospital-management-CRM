"""User and Session repository."""

from datetime import datetime
from typing import Optional, Sequence
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal import execute_all, execute_one_or_none, save_entity
from src.models.global_schema.users import OrganizationMembership, Session, User
from src.repository.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self) -> None:
        super().__init__(User)

    async def get_by_email(
        self,
        email: str,
        session: Optional[AsyncSession] = None,
    ) -> Optional[User]:
        stmt = select(User).where(User.email == email.strip().lower(), User.deleted_at.is_(None))
        return await execute_one_or_none(stmt, session=session)

    async def get_by_identifier(
        self,
        identifier: str,
        session: Optional[AsyncSession] = None,
    ) -> Optional[User]:
        clean = identifier.strip().lower()
        stmt = select(User).where(
            (User.email == clean) | (User.phone == clean),
            User.deleted_at.is_(None),
        )
        return await execute_one_or_none(stmt, session=session)

    async def get_session_by_token_hash(
        self,
        token_hash: str,
        session: Optional[AsyncSession] = None,
    ) -> Optional[Session]:
        stmt = select(Session).where(
            Session.token_hash == token_hash,
            Session.expires_at > datetime.now(),
        )
        return await execute_one_or_none(stmt, session=session)

    async def create_session(
        self,
        user_id: int,
        token_hash: str,
        expires_at: datetime,
        session: AsyncSession,
    ) -> Session:
        sess = Session(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        return await save_entity(sess, session=session)

    async def delete_session(
        self,
        token_hash: str,
        session: AsyncSession,
    ) -> None:
        stmt = delete(Session).where(Session.token_hash == token_hash)
        from src.dal import execute_dml
        await execute_dml(stmt, session=session)

    async def get_memberships_for_user(
        self,
        user_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[OrganizationMembership]:
        stmt = select(OrganizationMembership).where(
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.is_active == True,
        )
        return await execute_all(stmt, session=session)


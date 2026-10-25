"""User and Session repository."""

from datetime import datetime, timezone
from typing import Optional, Sequence
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal import execute_all, execute_dml, execute_one_or_none, save_entity
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
        clean = email.strip().lower()
        stmt = select(User).where(User.username == clean, User.is_active == True)
        return await execute_one_or_none(stmt, session=session)

    async def get_by_identifier(
        self,
        identifier: str,
        session: Optional[AsyncSession] = None,
    ) -> Optional[User]:
        clean = identifier.strip()
        stmt = select(User).where(
            (User.username == clean.lower()) | (User.mobile == clean),
            User.is_active == True,
        )
        return await execute_one_or_none(stmt, session=session)

    async def get_session_by_token_hash(
        self,
        token_hash: str,
        session: Optional[AsyncSession] = None,
    ) -> Optional[Session]:
        stmt = select(Session).where(
            Session.id == token_hash,
            Session.revoked_at.is_(None),
            Session.expires_at > datetime.now(timezone.utc),
        )
        return await execute_one_or_none(stmt, session=session)

    async def create_session(
        self,
        user_id: int,
        token_hash: str,
        expires_at: datetime,
        session: AsyncSession,
    ) -> Session:
        sess = Session(id=token_hash, user_id=user_id, expires_at=expires_at)
        return await save_entity(sess, session=session)

    async def delete_session(
        self,
        token_hash: str,
        session: AsyncSession,
    ) -> None:
        stmt = delete(Session).where(Session.id == token_hash)
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

    async def update_password(
        self,
        user_id: int,
        password_hash: str,
        session: AsyncSession,
    ) -> None:
        stmt = update(User).where(User.id == user_id).values(password_hash=password_hash)
        await execute_dml(stmt, session=session)

    async def revoke_user_sessions(
        self,
        user_id: int,
        except_token_hash: Optional[str] = None,
        session: Optional[AsyncSession] = None,
    ) -> None:
        stmt = delete(Session).where(Session.user_id == user_id)
        if except_token_hash:
            stmt = stmt.where(Session.id != except_token_hash)
        if session:
            await execute_dml(stmt, session=session)


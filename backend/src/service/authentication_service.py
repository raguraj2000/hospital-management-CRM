"""Authentication business service managing user logins and sessions."""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Tuple
from src.constants.errors import ErrorCode
from src.core.config import settings
from src.core.exceptions import AppException
from src.core.security import generate_session_token, hash_password, hash_session_token, verify_password
from src.dal import transaction
from src.models.global_schema.users import OrganizationMembership, User
from src.repository.user_repository import UserRepository
from src.validation.common import validate_email


class AuthenticationService:
    def __init__(self) -> None:
        self.user_repo = UserRepository()

    async def login(self, identifier: str, password: str) -> Tuple[User, Optional[OrganizationMembership], str]:
        user = await self.user_repo.get_by_identifier(identifier)
        if not user:
            user = await self.user_repo.get_by_email(identifier)

        if not user or not user.is_active:
            raise AppException("Invalid credentials.", code=ErrorCode.UNAUTHORIZED)

        if not verify_password(password, user.password_hash):
            raise AppException("Invalid email or password.", code=ErrorCode.UNAUTHORIZED)

        raw_token = generate_session_token()
        token_hash = hash_session_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.SESSION_MAX_AGE_SECONDS)

        async with transaction() as session:
            await self.user_repo.create_session(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
                session=session,
            )

        memberships = await self.user_repo.get_memberships_for_user(user.id)
        primary_membership = memberships[0] if memberships else None
        return user, primary_membership, raw_token

    async def logout(self, raw_token: str) -> None:
        token_hash = hash_session_token(raw_token)
        async with transaction() as session:
            await self.user_repo.delete_session(token_hash, session=session)

    async def verify_session(self, raw_token: str) -> Optional[User]:
        token_hash = hash_session_token(raw_token)
        sess = await self.user_repo.get_session_by_token_hash(token_hash)
        if not sess:
            return None
        return await self.user_repo.get_by_id(sess.user_id)

    async def change_password(
        self,
        user_id: int,
        current_password: str,
        new_password: str,
        current_token: Optional[str] = None,
    ) -> None:
        user = await self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise AppException("User not found or inactive.", code=ErrorCode.NOT_FOUND, status_code=404)

        if not verify_password(current_password, user.password_hash):
            raise AppException("Current password is wrong", code=ErrorCode.BAD_REQUEST, status_code=400)

        new_hash = hash_password(new_password)
        current_token_hash = hash_session_token(current_token) if current_token else None

        async with transaction() as session:
            await self.user_repo.update_password(user_id, new_hash, session=session)
            await self.user_repo.revoke_user_sessions(user_id, except_token_hash=current_token_hash, session=session)



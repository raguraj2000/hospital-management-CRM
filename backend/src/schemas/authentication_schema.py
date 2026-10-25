"""Authentication request and response schemas."""

from typing import List, Optional
from pydantic import BaseModel, EmailStr
from src.schemas.common import BaseSchema


class LoginRequest(BaseModel):
    mobile: Optional[str] = None
    email: Optional[str] = None
    password: str

    @property
    def identifier(self) -> str:
        return (self.mobile or self.email or "").strip()


class UserDTO(BaseSchema):
    id: int
    name: str
    username: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_platform_admin: bool = False
    is_active: bool


class MembershipDTO(BaseSchema):
    company_id: int
    is_owner: bool
    is_active: bool


class LoginResponse(BaseSchema):
    user: UserDTO
    membership: Optional[MembershipDTO] = None
    token: Optional[str] = None


class CurrentUserContext(BaseSchema):
    user: UserDTO
    memberships: List[MembershipDTO]


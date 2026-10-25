"""Common reusable Pydantic schemas."""

from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PaginationQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseSchema, Generic[T]):
    data: List[T]
    total: int
    page: int
    limit: int


class SuccessResponse(BaseSchema):
    ok: bool = True
    message: Optional[str] = None


class ErrorEnvelope(BaseModel):
    error: str
    code: str
    fields: Optional[Dict[str, List[str]]] = None


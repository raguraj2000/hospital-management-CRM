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


class StandardResponse(BaseModel, Generic[T]):
    status_code: int = 200
    message: str = "Request completed successfully"
    data: Optional[T] = None
    error: Optional[Dict[str, Any]] = None


def api_response(
    data: Any = None,
    message: str = "Request completed successfully",
    status_code: int = 200,
) -> Dict[str, Any]:
    return {
        "status_code": status_code,
        "message": message,
        "data": data,
        "error": None,
    }


def api_error(
    message: str,
    code: str = "ERROR",
    details: Any = None,
    status_code: int = 400,
) -> Dict[str, Any]:
    return {
        "status_code": status_code,
        "message": message,
        "data": None,
        "error": {
            "code": code,
            "details": details,
        },
    }


class ErrorEnvelope(BaseModel):
    error: str
    code: str
    fields: Optional[Dict[str, List[str]]] = None


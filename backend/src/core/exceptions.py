"""Domain exceptions and error formatting matching the frontend contract."""

from typing import Any, Dict, List, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from src.constants.errors import ErrorCode


class AppException(Exception):
    """Base application domain exception translating to standardized JSON responses."""

    def __init__(
        self,
        message: str,
        code: ErrorCode = ErrorCode.BAD_REQUEST,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        fields: Optional[Dict[str, List[str]]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.fields = fields or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status_code": self.status_code,
            "message": self.message,
            "data": None,
            "error": {
                "code": str(self.code),
                "details": self.fields if self.fields else None,
            },
        }


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """FastAPI exception handler for AppException."""
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())


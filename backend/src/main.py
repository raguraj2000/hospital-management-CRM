"""Application entry point for ASGI server."""

import uvicorn
from src.app_factory import create_app
from src.core.config import settings

app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )


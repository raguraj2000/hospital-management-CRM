"""Structured logging configuration."""

import logging
import sys
from src.core.config import settings


def configure_logging() -> None:
    """Configures structured console logging with log level based on settings."""
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )


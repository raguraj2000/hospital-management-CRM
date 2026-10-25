"""PostgreSQL dialect adapter and configuration."""

from typing import Any, Dict


def get_postgresql_engine_args() -> Dict[str, Any]:
    """Returns engine arguments optimized for PostgreSQL."""
    return {
        "pool_pre_ping": True,
        "echo": False,
    }


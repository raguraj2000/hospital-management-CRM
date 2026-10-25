"""SQLite dialect adapter and PRAGMA listeners."""

from typing import Any, Dict
from sqlalchemy import event


def get_sqlite_engine_args() -> Dict[str, Any]:
    """Returns engine arguments optimized for SQLite."""
    return {
        "echo": False,
    }


def configure_sqlite_pragmas(dbapi_con: Any, con_record: Any) -> None:
    """Configures SQLite WAL mode and foreign key enforcement."""
    cursor = dbapi_con.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")
    cursor.execute("PRAGMA journal_mode = WAL;")
    cursor.close()


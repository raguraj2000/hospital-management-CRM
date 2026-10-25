"""SQLAlchemy Declarative Base."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Root base class for all canonical ORM models."""
    pass


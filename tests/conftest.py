"""Pytest test fixtures and configuration."""

import pytest


@pytest.fixture
def sample_company_id() -> int:
    return 1


@pytest.fixture
def sample_branch_id() -> int:
    return 10


@pytest.fixture
def sample_user_id() -> int:
    return 42


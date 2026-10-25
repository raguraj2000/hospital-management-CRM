"""Automated architecture boundary tests executing the AST validator."""

import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


def test_architecture_boundaries() -> None:
    """Runs scripts/verify_boundaries.py to ensure zero layer violations."""
    script_path = ROOT_DIR / "scripts" / "verify_boundaries.py"
    from scripts.verify_boundaries import main
    assert main() == 0, "Architecture boundary verification failed!"


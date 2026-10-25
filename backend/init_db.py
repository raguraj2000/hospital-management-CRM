#!/usr/bin/env python3
"""
Convenience entry point for Database Initialization & Ordered SQL Executor.
Runs scripts/init_db.py.
"""

import sys
from pathlib import Path

# Ensure project root is on sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.init_db import main

if __name__ == "__main__":
    main()


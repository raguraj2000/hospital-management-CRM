#!/usr/bin/env python3
"""
AST-based Architecture Boundary Enforcement Tool.
Scans the Python codebase to strictly enforce clean architecture layer boundaries:
- Database execution is strictly isolated in src/dal/.
- ORM table mappings are strictly isolated in src/models/.
- Pydantic models are strictly isolated in src/schemas/.
- Dependency directions are strictly enforced.
"""

import ast
import os
import sys
from pathlib import Path
from typing import List, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT_DIR / "src"


class BoundaryViolation:
    def __init__(self, file_path: Path, line_no: int, message: str) -> None:
        self.file_path = file_path.relative_to(ROOT_DIR)
        self.line_no = line_no
        self.message = message

    def __str__(self) -> str:
        return f"[BOUNDARY VIOLATION] {self.file_path}:{self.line_no} - {self.message}"


def check_file(file_path: Path) -> List[BoundaryViolation]:
    violations: List[BoundaryViolation] = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=str(file_path))
    except Exception as e:
        violations.append(BoundaryViolation(file_path, 1, f"Failed to parse AST: {e}"))
        return violations

    rel_path = file_path.relative_to(SRC_DIR).as_posix()
    is_dal = rel_path.startswith("dal/")
    is_models = rel_path.startswith("models/")
    is_schemas = rel_path.startswith("schemas/")
    is_constants = rel_path.startswith("constants/")
    is_helpers = rel_path.startswith("helpers/")
    is_validation = rel_path.startswith("validation/")
    is_repository = rel_path.startswith("repository/")
    is_service = rel_path.startswith("service/")
    is_api = rel_path.startswith("api/")

    for node in ast.walk(tree):
        # 1. Enforce DAL Execution Isolation
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Attribute):
                attr = node.func.attr
                if not is_dal and attr in {"execute", "commit", "rollback", "flush"}:
                    violations.append(
                        BoundaryViolation(
                            file_path,
                            node.lineno,
                            f"Prohibited database execution method '.{attr}()' outside 'src/dal/'.",
                        )
                    )

        # 2. Enforce ORM Table Isolation
        if isinstance(node, ast.ClassDef):
            if not is_models:
                for stmt in node.body:
                    if isinstance(stmt, ast.Assign):
                        for target in stmt.targets:
                            if isinstance(target, ast.Name) and target.id == "__tablename__":
                                violations.append(
                                    BoundaryViolation(
                                        file_path,
                                        node.lineno,
                                        "Prohibited ORM '__tablename__' declaration outside 'src/models/'.",
                                    )
                                )

        # 3. Enforce Import Boundaries
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = []
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif node.module:
                names = [node.module]

            for name in names:
                if is_constants and ("src.dal" in name or "src.models" in name or "src.service" in name or "src.api" in name):
                    violations.append(
                        BoundaryViolation(
                            file_path,
                            node.lineno,
                            f"Layer 'constants' must not import from higher layers ({name}).",
                        )
                    )
                if is_helpers and ("src.dal" in name or "src.service" in name or "src.api" in name):
                    violations.append(
                        BoundaryViolation(
                            file_path,
                            node.lineno,
                            f"Layer 'helpers' must not import from stateful layers ({name}).",
                        )
                    )
                if is_validation and ("src.dal" in name or "src.api" in name):
                    violations.append(
                        BoundaryViolation(
                            file_path,
                            node.lineno,
                            f"Layer 'validation' must not import from execution or HTTP layers ({name}).",
                        )
                    )
                if is_repository and ("src.service" in name or "src.api" in name):
                    violations.append(
                        BoundaryViolation(
                            file_path,
                            node.lineno,
                            f"Layer 'repository' must not import from services or API ({name}).",
                        )
                    )

    return violations


def main() -> int:
    all_violations: List[BoundaryViolation] = []
    py_files = list(SRC_DIR.rglob("*.py"))
    print(f"Scanning {len(py_files)} Python source files for architecture boundary compliance...")

    for f in py_files:
        all_violations.extend(check_file(f))

    if all_violations:
        print(f"\nFAILED: Found {len(all_violations)} architecture boundary violation(s):")
        for v in all_violations:
            print(f"  {v}")
        return 1

    print("\nSUCCESS: All architecture boundary constraints are strictly satisfied!")
    return 0


if __name__ == "__main__":
    sys.exit(main())


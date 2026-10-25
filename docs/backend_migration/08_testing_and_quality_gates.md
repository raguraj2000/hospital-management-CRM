# 08. Testing Strategy & Architecture Quality Gates

## 1. Automated Architecture Boundary Enforcement

To prevent architectural decay, an automated AST (Abstract Syntax Tree) test suite (`tests/test_architecture_boundaries.py` and `scripts/verify_boundaries.py`) runs as part of the CI pipeline.

### Prohibited Patterns Enforced by AST:
1. **DAL Execution Isolation**: No calls to `.execute()`, `.commit()`, `.rollback()`, or `sessionmaker` outside `src/dal/`.
2. **Pydantic Model Isolation**: No `pydantic.BaseModel` subclasses outside `src/schemas/`.
3. **ORM Model Isolation**: No `sqlalchemy.orm.DeclarativeBase` mappings outside `src/models/`.
4. **Validation Isolation**: No business validation functions outside `src/validation/`.
5. **No Database Access in Services/Endpoints**: Services and endpoints must not import `session` or raw execution drivers.

---

## 2. Test Suite Architecture

```text
tests/
├── conftest.py                       # Test engines, fixtures, in-memory SQLite/Postgres DBs
├── test_architecture_boundaries.py   # AST static inspection of layer rules
├── unit/
│   ├── test_gst_calculations.py     # Deterministic paise math, Place of Supply
│   ├── test_fefo_allocation.py       # Expiry date sorting and stock deduction
│   ├── test_uhid_generation.py       # UHID formatting & sequential token logic
│   └── test_validation_rules.py      # Domain rules, age boundaries, phone formats
├── integration/
│   ├── test_dal_transactions.py     # Atomic commit, rollback on exception
│   ├── test_authorization_precedence.py # Explicit deny > grant > role checks
│   ├── test_onboarding_hierarchy.py # Company -> Region -> Inventory M:N integrity
│   └── test_atomic_checkout.py       # Combined OPD + pharmacy checkout transaction
└── contract/
    └── test_api_compatibility.py     # Matching legacy Express request/response shapes
```


# 07. PostgreSQL and SQLite Compatibility Strategy

## 1. Challenge & Design Objectives

- **PostgreSQL** is the primary enterprise production engine, providing named schemas (`global`, `master`, `public`, `staging`), native JSONB, `CITEXT`, sequence generators, and composite foreign keys across schemas.
- **SQLite** is used for offline-first local deployments, single-node clinics, and isolated unit test suites. SQLite has no concept of PostgreSQL-style schemas.

---

## 2. Dialect Mapping & Schema Translation

To support both engines without duplicating ORM models:
1. **Canonical SQLAlchemy Models**:
   All models specify their logical PostgreSQL schema:
   ```python
   class Patient(Base):
       __tablename__ = "patients"
       __table_args__ = {"schema": "public"}
   ```
2. **Dynamic Dialect Translation**:
   When connecting to SQLite, the DAL registers an execution hook or schema translation map:
   - In SQLite, table names are flattened to `public_patients`, `global_users`, `master_gst_rates`, etc., or attached databases are mapped.
   - For single-file SQLite deployments, SQLAlchemy's `schema_translate_map` automatically translates:
     ```python
     schema_translate_map = {
         "global": None,
         "master": None,
         "public": None,
         "staging": None,
     }
     ```
     with unified table names, or prefixed table names `global_users`.

3. **Type Compatibility Matrix**:

| PostgreSQL Type | SQLite Equivalent | SQLAlchemy Abstraction |
| :--- | :--- | :--- |
| `BIGINT` | `INTEGER` | `BigInteger` (SQLite auto-widens to 64-bit int) |
| `CITEXT` | `TEXT COLLATE NOCASE` | `String` / custom `CIText` type |
| `JSONB` | `TEXT` | `JSON` (SQLAlchemy serializes transparently) |
| `TIMESTAMPTZ` | `TEXT` (ISO 8601) | `DateTime(timezone=True)` |
| `BOOLEAN` | `INTEGER` (0 or 1) | `Boolean` |

4. **Foreign Key Enforcement**:
   For SQLite connections, the DAL automatically executes:
   ```sql
   PRAGMA foreign_keys = ON;
   PRAGMA journal_mode = WAL;
   ```


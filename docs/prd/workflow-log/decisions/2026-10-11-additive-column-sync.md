# Decision: additive column sync at startup  (2026-10-11)

**Decided by:** project owner (Mr GENIUS) · **Applies to:** P0-D05 onward, until P1 migrations replace it

P0-D05 adds `gender`, `national_id`, `employer_number` and `employment_type` to `staffSchema`. Existing
databases were created with `CREATE TABLE` and never gain new columns, so the SQLite provider gets a
generic, **additive-only** step: on opening a table, any schema column missing from the table is added
with `ALTER TABLE … ADD COLUMN` (nullable). It never drops, renames or retypes columns and never rewrites
rows; it is forwarded to the persistence worker and fails closed like other writes (P0-A01).
Full, versioned migrations are planned in P1 and supersede this step.

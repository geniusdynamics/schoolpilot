# Repository integration harness

A reusable harness for the integration tests of the storage layer. It gives a test a
**real database** - never a double - with the canonical schema applied and the canonical
fixtures seeded, one isolated database per test, and a clean close.

## The rule: no storage mocks

> A source file under a `__tests__` directory of `src/data/` must not mock the storage
> adapter or the repository.

A storage double proves nothing about the SQL the repository actually runs: it cannot
catch a wrong column, a missing foreign key, a bad transaction or a broken row mapping.
This harness exists so a test never has a reason to write one.

The rule is enforced by a guard, not by good intentions:

- `guard.ts` walks every source file under a `__tests__` directory of `src/data` and
  reports every `vi.mock`, `vi.doMock`, `jest.mock` or `jest.doMock` whose module
  resolves into `src/data/adapters/` or `src/data/repository/`. A helper module of a
  test directory is covered as well as a test file.
- A mock whose module is not written as a string literal is reported too: the guard
  cannot clear a call it cannot read.
- `guard.test.ts` runs that guard over the repository, so a mock that sneaks in fails
  the build.
- The guard reads the source as code, not as text: a mock call written inside a string or
  a comment is not reported.

A hand-written double that is passed to the repository instead of a mocked module cannot
be found statically. The review of the diff covers that case.

## Using the harness

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeTestContext, createTestContext, type TestContext } from '@/data/__tests__/harness';

describe('my integration test', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('writes a row', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      context.seed.inputFor('comment_bank_entry', { text: 'Written for real.' })
    );

    expect(await context.queries.count('comment_bank_entry')).toBe(2);
    expect(created.id).toBeTruthy();
  });
});
```

### The context

| Member | What it is |
| --- | --- |
| `repository` | The `Repository` under test. |
| `adapter` | The `SqliteAdapter` the repository runs on. |
| `database` | Where the database lives: `{ kind, filename? }` or `{ kind, schema? }`. |
| `ids` | The id every seeded row got, keyed by the id of the fixture it came from. |
| `seed` | The seeded state: `ids`, `idOf(entity)`, `fixtureOf(entity)`, `inputFor(entity, overrides?)`. |
| `queries` | Typed helpers: `get`, `list`, `count`, `rows`, `columnsOf`, `tableOf`. |
| `close()` | Closes the database and removes what the context created. |

### Isolation

Every context owns its database, so two contexts never see each other's rows:

- `memory` (the default) is an in-memory SQLite database. It belongs to one context.
- `file` is a SQLite database on disk. The harness creates a file with a unique name in
  the temporary directory and removes it when the context closes. A file the caller names
  itself is the caller's to remove.
- `postgres` is a schema of its own on a Postgres server. The harness creates the schema
  and drops it when the context closes.

### Options

```ts
await createTestContext({
  database: { kind: 'memory' },        // 'memory' (default), 'file' or 'postgres'
  actor: '01930000-0000-7000-8000-00000000aa01',
  entities: ['learner', 'household'],  // the entities to seed
  seed: false,                         // an empty database, schema only
});
```

The repository always serves the **whole registry**, because the invariant guards read
the tables they check against: a context that held only some of them would fail on the
first write. `entities` therefore says what the context *seeds*: the entities you name
and every entity they reference, so that every reference of a seeded row resolves.

### The seed order

There is exactly one seed order: `SEED_ORDER` in `seed.ts`. It is derived from the
registry - the hand-written order is the preference, and an entity the registry gains
later is placed after the rows it references - so the order can never fall behind the
registry.

`src/data/repository/__tests__/helpers.ts` re-exports it, together with `TEST_ACTOR`,
`createTestContext`, `closeTestContext`, `fixtureInput` and `seededId`, so the
repository tests and the harness share one implementation.

## The Postgres path (optional)

The harness can run against a Postgres server. It is **optional**: the SQLite path is
the one every test must pass, and the Postgres path runs only when a server is provided.

The connection comes from `DATABASE_URL` (or from `database.connectionString`):

```bash
DATABASE_URL=postgres://schoolpilot:schoolpilot@localhost:5432/schoolpilot_test \
  pnpm -s vitest run src/data/__tests__/harness/postgres.test.ts
```

`postgres.test.ts` is skipped when `DATABASE_URL` is not set, so the suite stays green
without a server.

### What CI does

The `harness` job of `.github/workflows/ci.yml` runs the SQLite self-test, and then the
Postgres self-test against a `postgres:16-alpine` container it starts itself:

```bash
docker run -d --name schoolpilot-harness-postgres \
  -e POSTGRES_USER=schoolpilot -e POSTGRES_PASSWORD=schoolpilot -e POSTGRES_DB=schoolpilot_test \
  -p 5432:5432 postgres:16-alpine \
  -c fsync=off -c synchronous_commit=off -c full_page_writes=off
```

The container is started with `fsync=off` because it holds nothing but a throwaway test
database, and the DDL of the whole registry is otherwise slow on a container filesystem.

The Postgres step is **non-blocking when it cannot run**: when Docker is unavailable, or
the container does not come up, the step reports the skip in the job summary and the
pull request stays green. A self-test that *ran* and failed is a different thing: that
is a red build, and the step exits non-zero for it.

### Follow-ups

- The container is started with a plain `docker run` instead of testcontainers, because
  testcontainers would add a dependency and `package.json` is out of scope for this
  task. Moving the container into a testcontainers fixture is the documented follow-up.
- The `ctid` tiebreaker of the audit trail is a physical locator and is not as stable as
  SQLite's `rowid`; see the table above.

### The dialect differences the driver bridges

The repository speaks the SQLite dialect, because that is the database the product runs
on. The Postgres driver in `postgres.ts` bridges the differences:

| SQLite | Postgres | How |
| --- | --- | --- |
| `?` placeholders | `$1`, `$2` | the driver numbers them, and leaves a `?` inside a string alone |
| `PRAGMA foreign_keys` | foreign keys are always on | the driver answers `SELECT 1 AS foreign_keys` |
| `PRAGMA table_info("t")` | `information_schema.columns` | the driver rewrites the read |
| `BEGIN IMMEDIATE` | `BEGIN` | the driver rewrites the statement |
| `rowid` | `ctid` | the driver rewrites the ordering. `ctid` is a physical row locator: it moves when a row is updated and it is rewritten by `VACUUM`, so it is not as stable as SQLite's `rowid`. The audit trail only appends rows, which is what makes the difference harmless in practice. |
| `COUNT(*)` is a number | `COUNT(*)` is a `bigint` | the driver reads a `bigint` as a number, so the repository's `=== 0` holds |
| `UNIQUE constraint failed: t.c` | `duplicate key value violates ...` | the driver reports the SQLite wording, so the typed repository errors are the same on both |

Two things differ that the driver cannot bridge, and they are properties of the
repository, not of the harness:

- A table may reference a table that does not exist yet in SQLite, but not in Postgres.
  The harness therefore applies the canonical DDL parents first
  (`canonicalSchemaOrder`), and the statements themselves are the canonical ones.
- The adapter core names its drivers `node` and `wasm`. The Postgres driver reports
  `node`, because it is a server-side driver and nothing branches on the name.

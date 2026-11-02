# SQLite storage adapter

One adapter contract, two drivers. Repositories and services (P1-B02 onward) depend on
`SqliteAdapter` only; the Node and browser factories swap the driver underneath.

```ts
const adapter = createNodeSqliteAdapter({ filename: ':memory:' }); // or createWasmSqliteAdapter()
await adapter.open();
await adapter.applySchema([/* DatabaseSchema[] */]);
const rows = await adapter.all<Learner>('SELECT * FROM learner WHERE institution_id = ?', [id]);
await adapter.close();
```

## Contract

| Method | Behaviour |
| --- | --- |
| `open()` | Opens the driver connection. Idempotent. All other methods throw `not_open` before this resolves. |
| `close()` | Flushes and closes. Idempotent; a closed adapter may be opened again. |
| `exec(sql)` | Runs one or more statements with no result rows (DDL, `BEGIN`, `COMMIT`, …). |
| `all(sql, params?)` | Runs a statement and returns decoded rows keyed by column name. |
| `get(sql, params?)` | First row or `null`. |
| `run(sql, params?)` | Returns `{ changes, lastInsertRowid }`. |
| `transaction(work)` | `BEGIN IMMEDIATE` … `COMMIT`; rolls back when `work` throws. The callback receives a `SqliteTransaction` with the same four statement methods and must be used instead of the outer adapter, because the callback holds the statement queue. Nested transactions, and `open`/`close`/outer statement calls made inside the callback, reject with `nested_transaction` rather than deadlocking. |
| `applySchema(schemas)` | Applies generated `CREATE TABLE` / `CREATE INDEX` / `CREATE UNIQUE INDEX` statements in one transaction. Idempotent (`IF NOT EXISTS`). |
| `exportDatabase()` | The whole database as one SQLite file image (`Uint8Array`). Queued like a statement, so it holds every write issued before it and none after. Used by the browser backup (`src/data/backup`). |
| `importDatabase(bytes)` | Replaces the whole database with a file image and re-applies the connection pragmas. Bytes without the SQLite header are refused before anything is touched. Once an import has run (successful or not), `exec`, `run`, `transaction` and `applySchema` reject with `replaced` until the adapter is opened again: what the app read before belongs to the old data. Reads, exports and a further import still work. Node: an in-memory database is swapped, a file is written beside the original and renamed over it. Browser worker: the connection is closed, the file is replaced through the SAH pool's `importDb`, and the file is reopened whatever happens; a write that fails part-way loses the old file inside the pool, which is why the backup restore holds its own snapshot. |

For repositories and migrations, use `canonicalDatabaseSchema(entity)` or
`applyCanonicalSchema(adapter)` for DDL. The domain registry's `databaseSchemaFor(entity)`
does not carry the storage sidecar's unique keys or the strict flag, so it is not a
substitute for the canonical DDL entry point.

Parameters are positional (`?`) and accept `string | number | bigint | boolean | null |
Uint8Array`. Booleans are encoded as `1`/`0`; `undefined` and `Date` are rejected rather than
silently coerced. Rows are plain objects keyed by column name; BLOB values are `Uint8Array`.

Every failure is a `SqliteAdapterError` with `code` (`not_open`, `driver`, `constraint`,
`nested_transaction`, `transaction`) and, for constraint failures, `constraint`
(`unique`, `not_null`, `foreign_key`, `check`). The original error is preserved as `cause`,
and `sql` carries the failing statement where one exists.

## Drivers

- **Node** (`createNodeSqliteAdapter`) — `better-sqlite3`, loaded lazily through
  `createRequire`. Defaults to `:memory:`; pass a filename for a real file. Not bundled for
  the browser.
- **Browser** (`createWasmSqliteAdapter`) — `@sqlite.org/sqlite-wasm` in a dedicated worker
  on the `opfs-sahpool` VFS. `applySchema`, transactions and reads all run in the worker;
  the main thread only posts messages. The worker is separate from
  `src/services/database/sqliteWorker.ts` because that worker's protocol is write-through
  only and deliberately returns no rows; both use the same `opfs-sahpool` VFS.

`createWasmDatabaseDriver(db, image?)` wraps an already-open sqlite-wasm database (used by the
headless contract suite and by the backup's in-memory validation). `image` supplies its export
and import - `inMemoryWasmImage(sqlite3, db)` for an in-memory database; without it both
reject. The worker and OPFS lifecycle remains browser-only.

## DDL

`statementsForSchema` converts a `DatabaseSchema` through `SchemaConverter`. The canonical
registry's storage sidecar supplies primary keys, indexes, unique keys (`{ columns, where }`
becomes a partial `CREATE UNIQUE INDEX`), foreign keys and encrypted columns. Canonical
schemas set `strict: true`: required properties emit `NOT NULL` unless they explicitly allow
null, the resolved primary key emits `NOT NULL` (SQLite's `TEXT PRIMARY KEY` alone does not
imply it), and `ref` columns emit `REFERENCES`. Legacy collections leave `strict` unset and keep
their historical DDL byte for byte, because they contain dangling refs and writers that omit
declared required fields. Enforcement of the emitted foreign keys is a separate connection
option (`foreignKeys: true`) because import and seeding order is caller-controlled.

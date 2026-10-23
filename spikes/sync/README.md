# DR-02 sync engine spike

ABOUTME: What the DR-02 spike is, how to run it, and what it deliberately does not measure.
ABOUTME: The decision and the measured numbers it rests on live in `docs/prd/workflow-log/decisions/DR-02.md`.

This spike answers one question for P4-A01: can the canonical domain layer — one
`repository`, one `entitySchema`, one codec, one guard set, one audit path — sit on
SQLite on the device and either SQLite or Postgres on the server, as it does today,
or does a sync candidate force a second implementation of the domain?

It compares two candidates:

- **Canonical** — the real `@/data` repository on SQLite (device) and on SQLite *or*
  Postgres (server), with an outbox, an HLC clock, an envelope and our own merge
  policies. The server backend is a parameter (`'sqlite' | 'postgres'`).
- **PouchDB** — PouchDB↔PouchDB local replication (`pouchdb-node`, LevelDB in temp
  directories), with the same merge policies run after replication resolution.

## Run it

```sh
npx vitest run spikes/sync                       # offline + merge + byte/latency benches
npx tsc -p spikes/sync/tsconfig.json --noEmit    # typecheck (the root config excludes spikes/**)
```

The Postgres suite needs a server at `postgres://postgres:postgres@localhost:5432/postgres`.
When it is unreachable the suite reports as skipped — `postgresAvailable()` probes
first — so the spike stays green offline; the numbers in DR-02 came from a run where
it answered (PostgreSQL 18.1).

Test and benchmark artifacts are written to `spikes/sync/results/*.json` and committed.

### Configuration

- `spikes/sync/tsconfig.json` exists because the root `tsconfig.json` includes only
  `src/**`; the spike typechecks with its own config, aliasing `@/*` back to `src/*`
  so the spike imports the real repository, schemas, codec and guards.
- No new dependency: the spike uses `pouchdb-node` and `pg`, both already in the lockfile.

## What is here

| File | What it is |
| --- | --- |
| `src/hlc.ts` | Fixed-width hybrid logical clock: `wall(15):counter(6):device`, so a string compare is the total order in JS and in SQL. |
| `src/envelope.ts` | The change envelope (entity, id, op, hlc, device, changed `fields`, per-field `base` clocks, payload) and the snapshot; byte measurement. |
| `src/policies.ts` | The per-entity merge policies as pure functions: append-only, cell-level marks, field-level LWW with a conflict log. |
| `src/syncStore.ts` | The minimal storage the server needs: DDL, upsert, audit `MAX+1`, change log. |
| `src/canonicalSync.ts` | `DeviceNode` (outbox, push, pull) and `ServerNode` (bootstrap in FK-safe `SEED_ORDER`, `applyIntent`, `changesSince`, `conflicts`). |
| `src/pouchSync.ts` | `PouchReplica`, `resolveWithPolicy`, `bulkPut`, `docBytes`. |
| `src/postgres.ts` | The Postgres driver wrapper the existing harness already uses, plus `postgresAvailable` and a round-trip probe. |
| `src/instrument.ts` | `countStatements(adapter)` — counts engine round trips by wrapping the adapter's driver. |
| `src/results.ts` | The `Results` writer behind `results/*.json`. |
| `__tests__/helpers.ts` | `openServer`, `openDevice`, `openRig`, `pinnedClock`. |
| `__tests__/*.test.ts` | The offline, merge, byte and latency suites for both candidates. |

## What this spike does not measure

- The CouchDB side. No Docker on this machine (`docker ps` fails on
  `//./pipe/dockerDesktopLinuxEngine`), so candidate B is measured as
  PouchDB↔PouchDB local replication. CouchDB's HTTP/`_changes` cost, filtered
  replication and server-side validation are unmeasured.
- Two concurrent server *processes* against one Postgres. The concurrent writer is a
  second node in one process.
- Real clock skew, compression, TLS, and a real LAN/3G link.
- Browser storage: SQLite-WASM/OPFS and IndexedDB. The spike runs SQLite on Node.
- Outbox/cursor/change-log growth over time, guard cost at scale, and batched
  `acceptBatch` (the benchmark pushes one change per call).

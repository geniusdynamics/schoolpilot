<!--
ABOUTME: The hub server of topology B: how to run it, what it exposes, and what it leaves to later PRD tasks.
ABOUTME: The B01 skeleton serves the typed repository and the unchanged domain services over Node HTTP.
-->

# The hub server

One Node HTTP server over the canonical SQLite database. It opens the database, applies the
canonical schema through `Repository.setup()`, and serves three APIs:

- **The repository API** under `/api/entities` — list, read, create, patch, remove and the audit
  trail of any registered entity, through the same typed `Repository` the browser uses.
- **The service API** under `/api/services` — admissions, attendance registers and marks, and
  billing-run previews and posts, through the browser's own `AdmissionService`,
  `AttendanceService` and `BillingRunService`. The services are constructed with a repository
  and nothing else; the hub adds a transport, not a second domain layer.
- **The backup API** under `/api/backups` — encrypted daily archives, retention, restore into a
  new instance, the restore drill and the portable export. See `server/backup/README.md` for the
  format, the key handling and the routes.

The composition root is `src/server/LANServer.ts`; the routes live here, in `server/http`, and
the service wiring is `server/services.ts`.

## Run it

```bash
npx tsx src/server/cli.ts --data-dir ./data --port 3000
```

The CLI opens `./data/schoolpilot.db` (or the file under `--data-dir`) and listens. `GET /health`
reports the status. From code:

```ts
import { LANServer } from '@/server/LANServer';

const hub = new LANServer({ dataDir: './data', port: 3000 });
await hub.start();   // creates the data directory, opens the database, applies the schema
console.log(hub.address);
```

`databaseFile` names a different SQLite file and `port: 0` lets the operating system pick one.
`stop()` closes the connections and the database.

## Call it

```bash
# The entity registry
curl http://127.0.0.1:3000/api/entities

# A page of learners, filtered
curl "http://127.0.0.1:3000/api/entities/learner?limit=10&where=%7B%22status%22%3A%22enrolled%22%7D"

# One row, its audit trail
curl http://127.0.0.1:3000/api/entities/learner/<id>
curl http://127.0.0.1:3000/api/entities/learner/<id>/audit

# A write names its actor; that header is trusted until authentication lands
curl -X PATCH "http://127.0.0.1:3000/api/entities/learner/<id>" \
  -H "content-type: application/json" -H "x-actor: <actor-id>" \
  -d '{"expectedVersion":1,"patch":{"family_name":"Njeri"},"reason":"corrected at the desk"}'

# A domain service, unchanged
curl -X POST http://127.0.0.1:3000/api/services/admissions \
  -H "content-type: application/json" -H "x-actor: <actor-id>" \
  -d @admission.json
```

Write bodies:

- `POST /api/entities/:entity` takes the entity's own fields.
- `PATCH` and `PUT /api/entities/:entity/:id` take `{expectedVersion, patch, reason?}`.
- `DELETE /api/entities/:entity/:id?expectedVersion=<n>&reason=<text>` removes a row.
- Reads take `where`, `conditions` and `orderBy` as JSON query parameters, plus `limit`,
  `offset`, `cursor` and `includeDeleted`.
- Service calls take the service's own input; a refusal carries its typed `code`
  (`missing_reference`, `duplicate`, `out_of_period`, …), and a repository refusal keeps its
  own (`validation`, `stale_version`, `reference`, `not_found`, …).

## Prove it

`server/__tests__/hub.test.ts` starts the hub against a seeded SQLite file, admits a learner
through HTTP, reads the rows back over HTTP, then runs the same `AdmissionService` in-process
against an identical copy of the seeded file and compares the results. It also exercises the
repository API, an attendance register and a billing preview, and confirms in `afterAll` that
the admission reached the file on disk.

```bash
npx vitest run server/__tests__/hub.test.ts
```

## Backups

The hub takes an encrypted SQLite snapshot every day, keeps 7 daily, 4 weekly and 12 monthly
archives, restores into a new instance without touching the live database, and reminds the
operator to prove a restore every 30 days. `server/backup/README.md` documents the archive
format, the key sources, the retention union, the restore checks and the `/api/backups` routes.

```bash
# Back up daily; the passphrase comes from the environment, never the command line
SCHOOLPILOT_BACKUP_PASSPHRASE='...' npx tsx src/server/cli.ts --data-dir ./data

# Restore one archive into a fresh directory before the hub opens its database
npx tsx src/server/cli.ts --data-dir ./recovered --backup-passphrase '...' \
  --restore-from ./data/backups/backup-....spbk --restore-to ./recovered
```

`GET /health` reports a `backup` block (`enabled`, `available`, `lastBackupAt`, `drillDue`) and
`GET /api/backups/status` carries the rest, so the health page of P4-D03 has one place to read.

## Deliberately not here yet

- **Authentication and authorisation.** `x-actor` is a trusted header placeholder; P4-C01
  replaces it with sessions and a scoped repository.
- **Real-time sync.** The WebSocket hub of P4-A02; the HTTP surface here is what it extends.
- **mDNS discovery, TLS and pairing.** P4-D02.
- **Request schema validation beyond the repository and service schemas.** The route layer
  checks shapes and query syntax; the entity and service schemas own field validation, which is
  where a 400's `issues` comes from.

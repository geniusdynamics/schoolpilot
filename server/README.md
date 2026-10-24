<!--
ABOUTME: The hub server of topology B: how to run it, what it exposes, and what it leaves to later PRD tasks.
ABOUTME: The B01 skeleton serves the typed repository and the unchanged domain services over Node HTTP.
-->

# The hub server

One Node HTTP server over the canonical SQLite database. It opens the database, applies the
canonical schema through `Repository.setup()`, and serves two APIs:

- **The repository API** under `/api/entities` — list, read, create, patch, remove and the audit
  trail of any registered entity, through the same typed `Repository` the browser uses.
- **The service API** under `/api/services` — admissions, attendance registers and marks, and
  billing-run previews and posts, through the browser's own `AdmissionService`,
  `AttendanceService` and `BillingRunService`. The services are constructed with a repository
  and nothing else; the hub adds a transport, not a second domain layer.

The composition root is `src/server/LANServer.ts`; the routes live here, in `server/http`, and
the service wiring is `server/services.ts`.

## Run it

```bash
npx tsx src/server/cli.ts --data-dir ./data --port 3000
```

The CLI opens `./data/schoolpilot.db` (or the file under `--data-dir`) and listens. It serves HTTPS by
default, issuing and storing a self-signed LAN certificate in `<data-dir>/tls`, and advertises the hub
over mDNS so a client on the same network can find it without being told an address. `--no-tls` and
`--no-mdns` turn those off for a loopback development box, `--print-fingerprint` shows what clients
pin, and `--discover` browses the LAN for hubs. `GET /health` reports the status, including the
protocol, the fingerprint and the advertisement.

[`docs/guides/deployment-hub.md`](../docs/guides/deployment-hub.md) is the operator's guide, and
[`packaging/`](../packaging/README.md) holds the installers for Windows, Ubuntu and Raspberry Pi.
From code:

```ts
import { LANServer } from '@/server/LANServer';

const hub = new LANServer({ dataDir: './data', port: 3000 });
await hub.start();   // creates the data directory, opens the database, applies the schema
console.log(hub.address);
```

`databaseFile` names a different SQLite file and `port: 0` lets the operating system pick one.
`stop()` closes the connections and the database.

## Call it

The examples below are plain HTTP for a loopback box, which is what `--no-tls` is for. Against a hub
that serves TLS, use `https` and the certificate it issued:

```bash
cert=./data/tls/hub-cert.pem
curl --cacert "$cert" https://127.0.0.1:3000/health
```

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

## Deliberately not here yet

- **Authentication and authorisation.** `x-actor` is a trusted header placeholder; P4-C01
  replaces it with sessions and a scoped repository. Until then a hub belongs on a trusted LAN, which
  is why TLS and discovery are on by default rather than optional.
- **Real-time sync.** The WebSocket hub of P4-A02; the HTTP surface here is what it extends.
- **Pairing.** A client finds and trusts the hub (mDNS plus the fingerprint it advertises), but there
  is no enrolment handshake that issues a device its own credential — that follows authentication.
- **Request schema validation beyond the repository and service schemas.** The route layer
  checks shapes and query syntax; the entity and service schemas own field validation, which is
  where a 400's `issues` comes from.

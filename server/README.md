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

## Security

The hub hardens its own surface, and the app hardens its document. What each control answers is
listed in [`docs/security/threat-checklist.md`](../docs/security/threat-checklist.md).

- **Restricted data is encrypted at rest.** The columns the entity registry declares `encrypted`
  (a learner's `medical` and `special_needs`, a health visit's `complaint` and `treatment`, a
  conduct incident's `description` and `action`) are sealed with AES-256-GCM as
  `enc:v1:<iv>:<tag>:<ciphertext>` on the way into SQLite and opened on the way out. A value an
  older hub left in plaintext is read as it stands and sealed by the sweep on the next start.
- **The key** comes from `SCHOOLPILOT_RESTRICTED_KEY` (base64 or hex), or from
  `<dataDir>/keys/restricted-data.key`, which the hub creates on first start with mode `0600` in a
  `0700` directory. A database that holds sealed values with no key to open them **refuses to
  start**: a fresh key would leave those rows unreadable while the hub reported healthy. Pass
  `restrictedKey` or `restrictedKeyFile` to name them explicitly.
- **Access to restricted data is logged.** Every read, list, create, update and removal that
  carries a restricted value appends one JSON line to `<dataDir>/logs/restricted-access.jsonl`
  naming the actor, the action, the row ids and the field names — never a value. The line is
  written before the response is returned, so a read that cannot be recorded is refused rather
  than served unlogged. Pass `accessLog` to send the trail somewhere else.
- **The auth and write surfaces are rate limited.** 10 requests per 5 minutes per client address
  under `/api/auth`, and 120 writes per minute per client address everywhere else, answered with
  `429` and `Retry-After`. Set `rateLimits: false` to turn them off.
- **Every response carries security headers**: a `default-src 'none'` policy, `nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`. Set
  `securityHeaders: false` to turn them off.
- **The app's document carries its own policy.** `src/security/csp.ts` builds it and
  `scripts/security/cspVitePlugin.ts` injects it with a hash of every inline script the build
  produced, so `script-src` stays strict without `'unsafe-eval'`.
- **The repository scans itself.** `node scripts/prd/secret-scan.mjs` and
  `tsx scripts/security/dependency-scan.ts` run in CI and in the task gate; the dependency scan
  ratchets against `scripts/security/dependency-baseline.json` so a *new* high or critical
  advisory fails while the ones already carried do not.

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

## Deliberately not here yet

- **Authentication and authorisation.** `x-actor` is a trusted header placeholder; P4-C01
  replaces it with sessions and a scoped repository. Until then the access log records what a
  caller claimed, and rate limits are keyed by address rather than identity.
- **Real-time sync.** The WebSocket hub of P4-A02; the HTTP surface here is what it extends.
- **mDNS discovery, TLS and pairing.** P4-D02.
- **Field-level permissions on health and conduct records.** A learner's restricted fields are
  stripped for a role without `learner.medical.read`; the restricted fields of `health_visit` and
  `conduct_incident` are gated only by the permission to read the entity.
- **Request schema validation beyond the repository and service schemas.** The route layer
  checks shapes and query syntax; the entity and service schemas own field validation, which is
  where a 400's `issues` comes from.

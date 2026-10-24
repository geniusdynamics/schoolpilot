<!--
ABOUTME: The hub server of topology B: how to run it, what it exposes, and what it leaves to later PRD tasks.
ABOUTME: The hub authenticates every request with a bearer session and serves the typed repository and domain services.
-->

# The hub server

One Node HTTP server over the canonical SQLite database. It opens the database, applies the
canonical schema through `Repository.setup()`, applies its own sync metadata and authentication
tables, and serves four APIs:

- **The authentication API** under `/api/auth` — first run, password sign-in, TOTP, guardian phone
  OTP, password reset, and session and authenticator management. The module is `server/auth`.
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

Every route except `GET /health`, `GET /api/auth/state` and the sign-in endpoints requires
`Authorization: Bearer <token>`. A write is stamped with the user the session belongs to; there is
no header a caller can set to claim another identity.

## Run it

```bash
npx tsx src/server/cli.ts --data-dir ./data --port 3000
```

The CLI opens `./data/schoolpilot.db` (or the file under `--data-dir`), creates `./data/auth.key`
on first start, and listens. It serves HTTPS by default, issuing and storing a self-signed LAN
certificate in `<data-dir>/tls`, and advertises the hub over mDNS so a client on the same network
can find it without being told an address. `--no-tls` and `--no-mdns` turn those off for a loopback
development box, `--print-fingerprint` shows what clients pin, and `--discover` browses the LAN for
hubs. `GET /health` reports the status, including the protocol, the fingerprint and the
advertisement.

[`docs/guides/deployment-hub.md`](../docs/guides/deployment-hub.md) is the operator's guide, and
[`packaging/`](../packaging/README.md) holds the installers for Windows, Ubuntu and Raspberry Pi.
From code:

```ts
import { LANServer } from '@/server/LANServer';

const hub = new LANServer({ dataDir: './data', port: 3000 });
await hub.start();   // creates the data directory, opens the database, applies the schema
console.log(hub.address);
```

`databaseFile` names a different SQLite file, `port: 0` lets the operating system pick one, and
`notifier` fills in the channel that delivers guardian codes and reset links. `stop()` closes the
connections and the database.

## Authentication

### First run

There are no default credentials. `POST /api/auth/setup` creates the administrator and is refused
with `setup_complete` from then on:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/setup \
  -H "content-type: application/json" \
  -d '{"institutionId":"<uuid>","username":"director","password":"at-least-ten-characters"}'
# 201 {"status":"authenticated","token":"sp1_…","sessionId":"…","expiresAt":"…","user":{…}}
```

### Sign-in

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"username":"director","password":"at-least-ten-characters"}' | jq -r .token)

curl http://127.0.0.1:3000/api/entities/learner -H "Authorization: Bearer $TOKEN"
```

An account whose `user.mfa` flag is set answers `mfa_required` with a challenge token instead of a
session; `POST /api/auth/login/totp` with `{challengeToken, code}` finishes the sign-in. A challenge
is single use and a code is accepted once.

### Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/auth/state` | none | whether first-run setup is needed, and whether delivery is configured |
| POST | `/api/auth/setup` | none | create the first administrator |
| POST | `/api/auth/login` | none | password sign-in; a session or a TOTP challenge |
| POST | `/api/auth/login/totp` | none | finish a sign-in with a TOTP code |
| POST | `/api/auth/guardian/otp` | none | send a guardian a code by phone |
| POST | `/api/auth/guardian/otp/verify` | none | sign a guardian in with that code |
| POST | `/api/auth/password/forgot` | none | start a password reset |
| POST | `/api/auth/password/reset` | none | finish a password reset |
| GET | `/api/auth/session` | session | the current session and user |
| POST | `/api/auth/logout` | session | end this session |
| GET | `/api/auth/sessions` | session | the live sessions of this account |
| DELETE | `/api/auth/sessions/:id` | session | sign one device out |
| POST | `/api/auth/sessions/revoke-all` | session | sign every other device out |
| POST | `/api/auth/totp/enrol` | session | start an authenticator enrolment |
| POST | `/api/auth/totp/confirm` | session | confirm it with a code |
| POST | `/api/auth/totp/disable` | session | remove the factor; the password is required |

### Refusals

Every refusal is `{"error":{"code":…,"message":…}}`; a locked account also carries
`retryAfterSeconds` and a `Retry-After` header.

| Code | Status | When |
| --- | --- | --- |
| `unauthenticated` | 401 | no bearer token, or one that is not a live session |
| `invalid_credentials` | 401 | wrong password, unknown username or a disabled account — the same answer for all three |
| `account_locked` | 423 | too many failures, or a `locked` account status |
| `account_disabled` | 403 | a live session whose account was disabled |
| `mfa_not_enrolled` | 403 | the account requires a code but no authenticator is confirmed |
| `invalid_code` | 401 | a wrong, replayed or malformed TOTP or OTP code |
| `invalid_challenge` | 401 | an unknown, consumed or over-guessed challenge |
| `challenge_expired` | 401 | a challenge past its time-to-live |
| `invalid_token` | 400 | a password-reset token that is unknown, expired or already used |
| `weak_password` | 422 | fewer than ten characters, only whitespace, or the username itself |
| `invalid_username` | 422 | not three to one hundred characters |
| `already_enrolled` | 409 | an authenticator is already confirmed |
| `setup_complete` | 409 | a first-run setup after the hub already has an account |
| `institution_required` | 422 | a username or phone held by more than one institution |
| `delivery_unavailable` | 503 | the deployment has no SMS or mail channel at all |

### Policy

- **Passwords** are PBKDF2-SHA256 at 600,000 iterations, stored as
  `pbkdf2-sha256$<iterations>$<salt>$<hash>`; the minimum is ten characters. An unknown username
  costs a real verification against a fixed dummy hash, so the response time does not say whether
  an account exists.
- **Sessions** are opaque `sp1_` tokens. Only `sha256:<hex>` of a token is stored, so a stolen
  database holds no live session. The idle window is 30 minutes and slides on use at most once a
  minute; the absolute life is 12 hours.
- **Lockout** is per username: five failures inside 15 minutes lock it for 15 minutes, and each
  later lock doubles — 30, 60, 120, then 240 minutes. A successful sign-in clears it. A correct
  password does not open a locked account, and an unknown username locks exactly like a known one.
- **TOTP** is RFC 6238 over SHA-1, six digits, a 30-second step and a ±1 step window. The secret is
  stored AES-256-GCM encrypted under `<dataDir>/auth.key`, and a step that was already accepted is
  refused, so a code that was watched cannot be replayed.
- **Guardian OTP** is a six-digit code, five minutes, five attempts, hashed with the challenge token
  as its salt. A guardian signs in by phone only: the identity the hub creates carries a sentinel
  password no password matches.
- **Password reset** is a 32-byte token, only hashed at rest, 30 minutes, single use, and it revokes
  every session of the account. The request answers `202 {"status":"sent"}` whether or not the
  account exists.
- **Delivery** is a seam, `AuthNotifier`. The default notifier reports `available: false` and the two
  endpoints that need it refuse with `delivery_unavailable` before they look anything up, so a hub
  without a gateway cannot be used to probe phone numbers or usernames. A send that fails after a
  recipient was found is recorded as an `auth_event` and still answers the same.
- **The trail** is `auth_event`: sign-ins, refusals, lockouts, factor changes and resets. It holds no
  password, code, token or TOTP secret.

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

The examples below are plain HTTP for a loopback box, which is what `--no-tls` is for. Against a hub
that serves TLS, use `https` and the certificate it issued:

```bash
cert=./data/tls/hub-cert.pem
curl --cacert "$cert" https://127.0.0.1:3000/health
```

```bash
# The entity registry
curl http://127.0.0.1:3000/api/entities -H "Authorization: Bearer $TOKEN"

# A page of learners, filtered
curl "http://127.0.0.1:3000/api/entities/learner?limit=10&where=%7B%22status%22%3A%22enrolled%22%7D" \
  -H "Authorization: Bearer $TOKEN"

# One row, its audit trail
curl http://127.0.0.1:3000/api/entities/learner/<id> -H "Authorization: Bearer $TOKEN"
curl http://127.0.0.1:3000/api/entities/learner/<id>/audit -H "Authorization: Bearer $TOKEN"

# A write is stamped with the user behind the token; no header can claim another identity
curl -X PATCH "http://127.0.0.1:3000/api/entities/learner/<id>" \
  -H "content-type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"expectedVersion":1,"patch":{"family_name":"Njeri"},"reason":"corrected at the desk"}'

# A domain service, unchanged
curl -X POST http://127.0.0.1:3000/api/services/admissions \
  -H "content-type: application/json" -H "Authorization: Bearer $TOKEN" \
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

- `server/__tests__/authPrimitives.test.ts` — PBKDF2 at the spec floor, the RFC 6238 vectors, the
  lockout doubling, token hashing and the encryption of a TOTP secret.
- `server/__tests__/auth.test.ts` — the service against a real database: first run, the identical
  answer for a wrong password and an unknown user, lockout and recovery, idle and absolute session
  expiry, revocation, TOTP enrolment with a replayed code refused, a single-use password reset that
  revokes sessions, and guardian phone OTP.
- `server/__tests__/authHttp.test.ts` — the boundary over HTTP: an unauthenticated caller is
  refused, a bearer session opens the hub, a spoofed `x-actor` header is ignored, and a signed-out
  token is dead.
- `server/__tests__/hub.test.ts` — starts the hub against a seeded SQLite file, signs in, admits a
  learner through HTTP, reads the rows back, then runs the same `AdmissionService` in-process
  against an identical copy of the seeded file and compares the results.

```bash
npx vitest run server/__tests__/authPrimitives.test.ts server/__tests__/auth.test.ts \
  server/__tests__/authHttp.test.ts server/__tests__/hub.test.ts
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

- **Authorisation.** Authentication is done; authorisation is not. Any live session may call any
  route, so the repository API returns whatever an entity row holds — including a `user` row's
  `password_hash` — to any signed-in account, guardian sessions included. P4-C02 adds the RBAC and
  scope model and the maker-checker engine, and it is where per-entity read rules and the
  redaction of sensitive columns belong. Until then the hub belongs on a trusted network.
- **Role-driven TOTP.** The factor follows `user.mfa`, which an account sets by enrolling. Making
  finance and administrator roles *require* it is a role-model decision, so it lands with P4-C02.
- **OIDC SSO** for staff, P4-C03.
- **Real-time sync.** The WebSocket hub of P4-A02; the HTTP surface here is what it extends.
- **Pairing.** A client finds and trusts the hub — the mDNS advertisement and the fingerprint it
  reports are here — but there is no enrolment handshake that issues a device its own credential.
  That follows authorisation, and belongs with it.
- **Field-level permissions on health and conduct records.** A learner's restricted fields are
  stripped for a role without `learner.medical.read`; the restricted fields of `health_visit` and
  `conduct_incident` are gated only by the permission to read the entity.
- **Request schema validation beyond the repository and service schemas.** The route layer
  checks shapes and query syntax; the entity and service schemas own field validation, which is
  where a 400's `issues` comes from.

# Threat checklist — P4-D04 (security hardening)

What this task set out to answer, what answers it, and where the evidence lives. A row is
**closed** only when a test or a repository check enforces it; **partial** and **open** rows name
the gap in plain words rather than leaving it implied.

Scope note: the hub is the surface these controls protect. The app in the browser talks to its own
local SQLite-WASM store, so device-side encryption is a separate concern (see the gaps).

## Controls

| # | Threat | Control | Where | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Injected script runs in the app (XSS, a hostile plugin, a tampered response) | Content-security policy in the document: `script-src 'self'` plus a SHA-256 hash of every inline script the build injects, `object-src 'none'`, no `'unsafe-eval'` | `src/security/csp.ts`, `scripts/security/cspVitePlugin.ts`, `vite.config.ts` | `tests/e2e/csp.spec.ts` (real browser: app boots, injected inline script refused, boot violation-free), `src/security/__tests__/csp.test.ts` | closed |
| 2 | The app is framed and clickjacked | `X-Frame-Options: DENY` and `Referrer-Policy: no-referrer` as response headers (a `<meta>` policy cannot carry `frame-ancestors`) | `vite.config.ts` (dev server), `server/http/securityHeaders.ts` (hub) | `tests/e2e/csp.spec.ts` asserts the header on the document response; `server/__tests__/restrictedAccessLog.test.ts` asserts `frame-ancestors 'none'` on hub responses | partial — the production static host must send the same two headers; nothing in this repo serves the built app |
| 3 | A response is sniffed and executed as another type | `X-Content-Type-Options: nosniff` | `server/http/securityHeaders.ts` | `server/__tests__/restrictedAccessLog.test.ts` | closed |
| 4 | A URL leaks where the user came from (a learner id in a referrer) | `Referrer-Policy: no-referrer` | `vite.config.ts`, `server/http/securityHeaders.ts` | `tests/e2e/csp.spec.ts`, `server/__tests__/restrictedAccessLog.test.ts` | closed |
| 5 | Restricted API responses sit in a browser or proxy cache | `Cache-Control: no-store` on every hub response | `server/http/securityHeaders.ts` | `server/__tests__/restrictedAccessLog.test.ts` | closed |
| 6 | Credential guessing against the sign-in surface | Fixed-window limit of 10 requests per 5 minutes per client address over the whole `/api/auth` prefix, whatever the method, answered `429` with `Retry-After` | `server/http/rateLimit.ts`, `server/http/router.ts` | `server/__tests__/rateLimit.test.ts` | closed |
| 7 | A client floods the write surface | Fixed-window limit of 120 writes per minute per client address; reads are not counted | `server/http/rateLimit.ts` | `server/__tests__/rateLimit.test.ts` | closed |
| 8 | A secret is committed | Secret scan of tracked files, in CI and in the task gate | `scripts/prd/secret-scan.mjs`, `.github/workflows/ci.yml`, `scripts/prd/gate.mjs` (G8) | the gate's `G8` row; the CI step `Secret scan (tracked files)` | closed |
| 9 | A dependency with a known vulnerability is pulled in | `pnpm audit --json` reduced to stable advisory keys, ratcheted against a checked-in baseline of today's high/critical advisories; a new one fails | `scripts/security/dependency-scan.ts`, `scripts/security/dependency-baseline.json`, `.github/workflows/ci.yml`, `scripts/prd/gate.mjs` (G8) | `scripts/security/__tests__/dependencyScan.test.ts`; the CI step fails hard, the gate tolerates an unreachable feed | closed — with 98 high/critical advisories recorded as existing debt (see gaps) |
| 10 | A stolen database file or backup is read | AES-256-GCM field sealing at the row codec: `enc:v1:<iv>:<tag>:<ciphertext>`, applied to every declared encrypted column on every write, wherever it came from | `src/data/repository/columns.ts`, `server/security/aesGcmFieldCipher.ts` | `server/__tests__/encryptionAtRest.test.ts` (raw column is `enc:v1:…` and holds no plaintext while the repository reads the plaintext back), `src/data/security/__tests__/fieldCipher.test.ts` | closed for the hub's database |
| 11 | The key is lost, or leaks | Key is 32 bytes from `SCHOOLPILOT_RESTRICTED_KEY` or `<dataDir>/keys/restricted-data.key` (file `0600`, directory `0700`); a missing key over an already-encrypted database **refuses to start**; a wrong key or an altered value is an error, never a wrong plaintext | `server/security/aesGcmFieldCipher.ts` | `server/__tests__/encryptionAtRest.test.ts` | closed |
| 12 | An older hub left restricted values in plaintext | Startup sweep seals every plaintext restricted value in one transaction per table; idempotent, version-preserving, and silent in the audit trail | `server/security/sealRestrictedData.ts` | `server/__tests__/encryptionAtRest.test.ts` | closed |
| 13 | Restricted values come to rest a second time in the audit trail | Restricted fields are replaced by `[restricted]` before an audit record is serialised; the trail keeps the field names and the actor | `src/data/security/restrictedData.ts`, `src/data/repository/audit.ts` | `src/data/security/__tests__/restrictedData.test.ts`, `server/__tests__/encryptionAtRest.test.ts` | closed |
| 14 | A restricted read happens with no record of who made it | JSONL access log at `<dataDir>/logs/restricted-access.jsonl`: actor, action, entity, row ids, field names, never a value. Written before the response is handed back, so a read that cannot be recorded is refused (`500`) instead of served | `server/http/repositoryRoutes.ts`, `server/security/restrictedAccessLog.ts` | `server/__tests__/restrictedAccessLog.test.ts` | closed |
| 15 | Restricted fields are handed to every role that can read the row | Learner field policy strips `medical` and `special_needs` unless the actor holds `learner.medical.read` | `src/data/auth/scopedRepository.ts` | `src/data/auth/__tests__/scope.test.ts` | partial — `health_visit` and `conduct_incident` restricted fields are still gated only by the entity permission (see gaps) |

## The key's story

- **Where it lives.** `<dataDir>/keys/restricted-data.key`, written on first start with mode
  `0600` inside a `0700` directory, or supplied as `SCHOOLPILOT_RESTRICTED_KEY` (base64 or hex) by
  the deployment. An inline key passed to `LANServer` wins over both, which is how the tests run.
- **If it is lost.** Every sealed value becomes unreadable. The hub says so and refuses to start
  rather than generating a fresh key and reporting healthy over a database it can no longer read.
  Recovery is from a backup of the key file (or of the whole data directory, which holds both), and
  failing that the affected rows cannot be recovered — which is the point of encrypting them.
- **If it leaks.** Only the sealed columns of the three restricted tables are readable, and only by
  someone who also holds a copy of the database. Rotating the key means re-sealing: open each value
  with the old key and write it back with the new one.
- **Backups.** A backup of `schoolpilot.db` without `keys/restricted-data.key` is not a restorable
  backup of restricted data. The signed-backup work of P4-D02 has to carry both.

## Deliberately not fixed here

- **Authorisation, not authentication.** Sessions arrived with P4-C01, so the access log records the
  proven actor and a spoofed `x-actor` header is ignored. What is missing is per-field
  authorisation: every live session may still call every route, so the repository API returns
  whatever an entity row holds — a `user` row's `password_hash` included — to any signed-in
  account, guardian sessions among them. P4-C02 is where the scope model and the per-entity read
  rules belong.
- **`health_visit` and `conduct_incident` restricted fields have no field-level permission.** A
  role that may read the entity reads the clinical narrative or the safeguarding note. Closing this
  needs a permission per restricted field group in `src/data/auth/roles.ts`.
- **The device database is not encrypted.** The browser's SQLite-WASM/OPFS store holds whatever the
  browser holds; SQLCipher on devices is optional in spec 06 §8.2 and is not implemented.
- **Existing dependency debt.** The baseline records 98 high/critical advisories that are already
  in the tree. The scan fails on a *new* one; it does not pretend the old ones are gone.
- **Rate limits are per process and in memory.** A restart forgives a caller, and two hub processes
  would each count separately. That is honest for one hub process on a school LAN and is not
  sufficient for a multi-process deployment.
- **The audit trail is append-only by convention, not by construction.** Nothing in SQLite stops a
  direct `UPDATE`/`DELETE` on `audit_event`; the hub exposes no route that writes to it, and an
  operator with the file can. Spec 06 §8.2's "immutable audit log" is not yet enforced.
- **CORS stays open when enabled.** `enableCors` sends `access-control-allow-origin: *`. On a
  trusted LAN behind TLS that is the current design, and P4-D02 did not narrow it: a browser client
  on the LAN is a first-class caller here.
- **Identity documents.** `identifier.value` (a national registry key) is confidential, not
  classified as restricted here; a scanned document has no entity yet.

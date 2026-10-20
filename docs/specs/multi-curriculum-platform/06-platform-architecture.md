# 06 — Platform Architecture

## 1. Where we are

The audit found one application with **seven database providers** (PouchDB, SQLite-WASM,
SQLite file, LiveStore, backend API, ERPNext, memory), **three data-access styles**
(global `AppDataContext` snapshot, per-module provider contexts, per-page
`useDatabaseCollection`/`useEntityCrud`) plus **mock hooks**, two configuration stores and
fail-open auth. The architecture below reduces the surface to what a school needs and
makes the contracts enforceable by the compiler.

## 2. Data layer

### 2.1 Layers

```
UI (pages, forms, pickers)
  └─ hooks: useQuery(entity, query) / useMutation(service.action) / useLookup(entity)
       └─ Domain services (AdmissionService, EnrolmentService, BillingService, PaymentService,
       │                   ResultsEngine, PromotionService, AttendanceService …)
       └─ Repositories (one per entity, generated from schema)
            └─ Storage adapter (LocalSqliteAdapter | RemoteApiAdapter) + Sync engine
```

- **Pages never touch collections directly.** Reads go through `useQuery`/`useLookup`; writes go through domain services or repositories.
- **Domain services** are plain TypeScript, framework-free, deterministic and unit-tested; they run in the browser (offline) and on the server (API) unchanged.
- `AppDataContext` is retired in Phase 1; during migration it becomes a thin adapter over repositories with an explicit, typed value (no `as any`).

### 2.2 Repository contract (one signature per verb)

```ts
interface Repository<E extends Entity> {
  get(id: Id<E>): Promise<E | null>;
  list(q?: Query<E>): Promise<Page<E>>;
  create(input: CreateInput<E>, ctx: Ctx): Promise<E>;          // id generated (UUIDv7) if absent
  update(id: Id<E>, patch: Patch<E>, ctx: Ctx): Promise<E>;     // optimistic concurrency via `version`
  remove(id: Id<E>, ctx: Ctx & { reason?: string }): Promise<void>; // soft delete
  watch(q?: Query<E>): Observable<E[]>;                          // live query
}
```

- Inputs are validated with the entity schema (zod or JSON Schema → generated TS types).
- Referential integrity checked on write (02 §12); permission checked on every call (`ctx.user`, scopes).
- Every write emits an audit event and a change event (drives live queries and sync).

### 2.3 Live queries and lookups
- A single in-memory **query cache** (e.g. TanStack Query or a small store) keyed by entity + query, invalidated by change events from any writer — this removes stale comboboxes.
- `useLookup('class_group')` returns a memoised `Map<Id, Label>` used by grids and pickers; labels are computed (`"Grade 7 · Blue"`), never stored.

### 2.4 Ids and types — enforced by tooling
- Branded `Id<T>` string type; UUIDv7 generator in one module.
- ESLint rules (custom): forbid `Number(`/`parseInt(`/`+x` on identifiers matching `/(^id$|_id$|Id$)/`; forbid `as any as`; forbid string-literal collection names outside the registry; forbid `useAppData` in new code.
- `tsconfig` `strict: true` for `src/data/**` and `src/domain/**` from day one; the global ratchet is set to the real count and only goes down.

### 2.5 Schema and migrations
- Entity schemas live in `src/domain/schema/*.ts`; storage DDL (SQLite/Postgres) is generated.
- Migrations are numbered, idempotent, reversible where possible, and run at startup with a progress screen and automatic pre-migration backup.
- A data-repair framework runs integrity checks (orphans, invalid FKs, impossible dates) and reports/fixes with consent — needed to clean data created by today's bugs.

### 2.6 Demo data
Demo schools are generated **through the same repositories and services** from fixture packs (`fixtures/ke-cbe-primary`, `fixtures/ke-secondary-transition`, `fixtures/gb-international`), so demo exercises real code paths. No mock hooks, no hard-coded dashboard numbers.

## 3. Persistence, deployment topologies and sync

### 3.1 Topologies

| Topology | For | Storage | Notes |
| --- | --- | --- | --- |
| **A. Single device** | Very small schools, evaluation | SQLite (WASM) in a **Web Worker on OPFS**; `navigator.storage.persist()` | Automatic local + external backups (file/USB/cloud folder). Never silently in-memory. |
| **B. School LAN hub** | Most schools: unreliable internet, several staff PCs/phones | Hub server (Node + SQLite or Postgres) on a school PC/mini-PC; clients are browsers on the LAN with local replicas | Works with no internet; optional encrypted cloud backup; the existing `src/server/LANServer.ts` is the seed. |
| **C. Hosted (SaaS / county / chain)** | Groups of schools, hosting partners | Postgres + object storage, multi-tenant by `institution_id` with row-level security | Devices keep offline replicas; parent portal and payment webhooks live here. |

### 3.2 Sync model
- Server (hub or cloud) is the source of truth; each device holds a replica of the data its user may see (scoped by permissions: a subject teacher syncs their groups' learners and marks, not the ledger).
- Change log with per-row `version` and hybrid logical clock; conflict policy **per entity**:
  - **Append-only** (payments, invoices, journal lines, attendance marks, audit events): no conflicts by construction.
  - **Cell-level merge** (marks: learner × assessment × component).
  - **Last-writer-wins with field-level merge** (profiles, settings) plus a conflict log.
  - **Server-authoritative** (sequences: admission/receipt numbers are allocated by the server; offline devices use provisional numbers `TMP-…` that are replaced on sync, or pre-allocated number blocks per device for receipts).
- Recommended implementation: keep **one** local engine (SQLite) and **one** server engine (Postgres); evaluate a maintained SQLite↔Postgres sync layer (e.g. PowerSync/ElectricSQL) against PouchDB↔CouchDB. Decision record required before Phase 4; whichever is chosen, the other providers (LiveStore, Dexie, RxDB remnants, MySQL/pg/sqlite3/better-sqlite3 in the client bundle) are removed.

### 3.3 Backups
Automatic daily encrypted backups (hub/cloud) with retention (7 daily, 4 weekly, 12 monthly), one-click restore to a new instance, **monthly restore drill reminder**, and portable full export (JSON + CSV per entity, 04 §8).

## 4. Configuration

- **One source of truth** (`ConfigService`), initialised before React renders; layered: build-time env → deployment config (hub/server) → institution settings (database) → user preferences.
- Typed, namespaced settings with defaults and validation; changes audited.
- `dataMode` is an explicit institution property (`demo` | `live`) chosen once; a demo database is visibly watermarked and can never be promoted to live.
- No fallbacks that change mode, provider or authentication silently; failures surface as blocking, actionable errors.

## 5. Identity, authentication and authorisation

### 5.1 Authentication
- First-run creates the administrator (no default credentials). Passwords hashed with argon2id (WASM) or PBKDF2-SHA256 ≥ 600k iterations; minimum length 10; breached-password check optional offline list.
- Session tokens with idle timeout (configurable, default 30 min on shared PCs), device list and remote sign-out; account lockout with back-off.
- Optional TOTP 2FA for finance and admin roles; guardian login by phone + OTP (SMS/WhatsApp); learner login (secondary) by username + PIN set by school.
- SSO for staff (Google Workspace / Microsoft 365) via OIDC on hub/cloud topologies.
- Demo login exists only in demo databases.

### 5.2 Authorisation (RBAC + scopes)
- Permissions are fine-grained (`learner.read`, `learner.medical.read`, `mark.write`, `invoice.post`, `payment.void`, `fee_schedule.approve` …).
- **Role assignments carry scopes**: campus, programme, level, class group, teaching group, learning area. A subject teacher can write marks only for teaching groups they are assigned to; a class teacher can read their class's contacts but not the ledger.
- Checks run in repositories/services (and server API), not only in the UI.
- Seed role catalogue: Super administrator, Head teacher/Principal, Deputy (academics), Deputy (administration), Director of Studies/Exams officer, Head of Department, Class teacher, Subject teacher, Registrar/Secretary, Bursar, Accounts clerk/Cashier, Boarding master/Matron, Nurse, Librarian, Storekeeper, Guidance & counselling, Security/Gate, Auditor (read-only), Guardian, Learner, Board/Proprietor (read-only dashboards).
- Maker-checker workflows for sensitive actions (fee schedules, refunds, write-offs, mark changes after lock, promotion commit).

## 6. Internationalisation and localisation

| Concern | Requirement |
| --- | --- |
| Languages | `en` (KE/GB/NG/GH/ZA variants), `sw`, `fr`, `pt`, `ar` (RTL), `am`; community translation via a hosted platform (Weblate/Crowdin) syncing i18next namespaces. Pack labels translated in the pack. |
| Encoding | UTF-8 everywhere; CI rejects mojibake sequences (`Ã`, `â€`, `ðŸ`) and non-UTF-8 files; fix the 99 affected files. |
| Dates | Locale formats (en-KE/en-GB `dd/mm/yyyy`), configurable week start, institution time zone; typed date entry. |
| Calendars | Gregorian default; **Ethiopian calendar** (display + entry) via a calendar abstraction; Hijri display optional. Academic calendars are data (02 §3). |
| Numbers & money | `Intl.NumberFormat`; currency per institution and per document. |
| Names | Given/family order, single-name learners, multiple middle names; sorting by configured key. |
| Addresses | Country-specific hierarchies: Kenya county → sub-county → ward; Uganda district → sub-county → parish; Nigeria state → LGA; Ghana region → district; South Africa province → municipality. |
| Phones | E.164 storage, libphonenumber validation, local display. |
| Layout | RTL support (logical CSS properties), long-word wrapping for French/Portuguese labels. |

## 7. Performance and low-resource operation

- Budgets enforced in CI: initial JS ≤ 500 KB gzip, route chunks ≤ 200 KB, PWA precache ≤ 3 MB (today 9.1 MB), first interaction ≤ 3 s on a mid-range Android over 3G profile.
- Remove server-only and unused packages from the client bundle (`puppeteer`, `mysql2`, `pg`, `sqlite3`, `better-sqlite3`, LiveStore, Dexie, unused MCP/dev tools in dependencies).
- Virtualised grids, server/replica-side pagination and indexed queries for learner lists (≥ 5,000 learners), search-as-you-type pickers.
- Print-optimised CSS; thermal receipt template; PDF generation in a worker.
- Graceful offline queue with visible sync status per device.

## 8. Security and privacy

### 8.1 Data classification
| Class | Examples | Controls |
| --- | --- | --- |
| Public | School name, events | — |
| Internal | Class lists, timetables | Authenticated staff |
| Confidential | Contacts, results, fees | Role + scope |
| Special/restricted | Medical, safeguarding, counselling, disability, identity documents | Named roles only, access logged, excluded from bulk exports by default |

### 8.2 Controls
TLS on hub/cloud; encryption at rest on server (and optional SQLCipher on devices);
content-security policy; no secrets in the repository (move `.env` values, including the
error-tracking DSN, to deployment config); dependency and secret scanning in CI; signed
backups; rate-limited public endpoints (`/apply`, payment webhooks); immutable audit log;
PII scrubbing in error reports (opt-in telemetry).

### 8.3 Data-protection compliance (design support, not legal advice)
The platform must make compliance practical for the school (the data controller):
- Lawful basis and **parental consent** capture for learners' data and media (photos), with withdrawal.
- Data-subject requests: access/export, rectification, erasure/anonymisation (respecting statutory retention of academic and financial records).
- Retention schedules per record type, automated anonymisation of applicants not admitted, alumni opt-in.
- Breach-response support: access logs, export of affected records.
- Data residency choice for hosted deployments; cross-border transfer notices.
- Country references to support in configuration and documentation: Kenya Data Protection Act 2019 (and registration of education institutions with the ODPC), Nigeria Data Protection Act 2023, South Africa POPIA, Uganda Data Protection and Privacy Act 2019, Ghana Data Protection Act 2012, Rwanda Law No. 058/2021, Tanzania Personal Data Protection Act 2022, Zambia Data Protection Act 2021.

## 9. Integrations

- **Messaging**: SMS (Africa's Talking, Twilio, Infobip, local aggregators), WhatsApp Business API, email (SMTP); templates with merge fields; delivery status; cost tracking; sender ID per school.
- **Payments**: 05 §5 provider interface.
- **National systems**: registry/assessment plug-ins (03 §11, 04 §8).
- **Accounting/ERP**: exports and connectors (QuickBooks, Xero, Sage, Odoo, ERPNext).
- **Identity**: OIDC SSO; SCIM optional for large groups.
- **Calendars**: iCal feeds for school calendar and exams.
- **Outbox pattern** for all outbound calls (retries, idempotency keys, dead-letter view); inbound webhooks verified and idempotent.

## 10. Extensibility

- **Pack registry**: curriculum packs (03), country packs (identifiers, address schema, holidays, statutory returns), payroll packs (05 §9), report/document template packs, locale packs. Packs are data, validated by schema, versioned, signed by maintainers for the official registry.
- **Plug-in SDK**: declared permissions, UI extension slots (learner profile tabs, dashboard widgets, report blocks, payment methods), service hooks (on admitted, on invoice posted, on report published), server routes (hub/cloud). Rationalise today's builtin plug-ins: keep and document whitelabel, grading-engine (→ becomes the results engine), fee-calculator (→ billing service); move ERPNext behind the accounting connector interface; delete dormant duplicates.
- **Compatibility**: semantic versioning of the SDK; plug-ins declare supported core versions; CI matrix for official plug-ins.

## 11. Observability and support

Self-hosted error tracking (opt-in, PII scrubbed), structured logs on hub/cloud, a
**System Health** page (storage persistence, last backup, sync lag per device, pending
outbox, integration status, disk quota), diagnostic bundle export for support, and an
in-app "report a problem" that attaches the diagnostic bundle with consent.

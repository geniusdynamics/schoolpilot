# Phase 4 — Multi-user, Sync & Security

**Goal:** many staff devices share one school, online or offline, with server-side identity,
permissions, backups and observability ([spec 06 §3, §5, §8, §11](../../specs/multi-curriculum-platform/06-platform-architecture.md)).

**Depends on:** P1 · **Runs in parallel with:** P2, P3 · **Estimate:** 4–6 weeks.

## Design commitments
- One local engine (SQLite) and one server engine; the other providers are removed after DR-02.
- Conflict policy per entity: append-only financial/attendance events, cell-level merge for marks, field-level LWW with conflict log for profiles, server-allocated sequences with device blocks.
- Permissions evaluated identically on client and server.
- Backups encrypted, retained, and restore-drilled.

## Parallelism
W1 spike and server skeleton in parallel; W3 fans out sequences, RBAC, SSO, packaging, health page and hardening (separate trees under `server/**`, `packaging/**`, `src/modules/settings/**`).

## Exit evidence
GP-7 (three devices, offline/online, concurrent receipts and marks) and GP-8 (backup/restore) green; installers verified on Windows, Ubuntu, Raspberry Pi.

## Lanes

| Lane | Scope |
| --- | --- |
| A | Sync engine & protocol |
| B | Hub/cloud server |
| C | Identity & access |
| D | Operations (backup, health, packaging) |
| Q | Quality |

## Exit criteria

1. Three devices edit concurrently (GP-7) with deterministic outcomes
2. Hub runs on Windows, Ubuntu and Raspberry Pi with one installer each
3. Automatic encrypted backups and a verified restore (GP-8)
4. Server-side permission checks mirror client checks
5. `node scripts/prd/gate.mjs phase --probe` → GATE PASSED; baseline tightened; phase-complete log written.

## Waves

| Wave | Focus | Tasks (run in parallel) |
| --- | --- | --- |
| `P4-W1` | Sync decision spike and hub skeleton | P4-A01, P4-B01 |
| `P4-W2` | Sync protocol, server auth, backups | P4-A02, P4-C01, P4-D01 |
| `P4-W3` | Sequences, RBAC, SSO, packaging, health page, hardening | P4-A03, P4-C02, P4-C03, P4-D02, P4-D03, P4-D04 |
| `P4-W4` | Multi-device golden path; phase exit | P4-Q01 |

## Tasks

Snapshot generated with the ledger; **status lives in [`../tasks.json`](../tasks.json)**. Later-phase tasks are intentionally
coarser than P0: each is refined into sub-tasks (same id + suffix, e.g. `P2-C01a`) by the orchestrator at the start of its wave,
after the previous phase's learnings are logged.

#### P4-W1 — Sync decision spike and hub skeleton

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P4-A01` | A | DR-02 sync engine spike (SQLite↔Postgres layer vs PouchDB↔CouchDB) with offline/merge tests | — | L | Decision with measured results |
| `P4-B01` | B | Hub server skeleton (Node, Postgres or SQLite) evolving src/server/LANServer.ts; API for repositories | — | L | Runs domain services server-side unchanged |

#### P4-W2 — Sync protocol, server auth, backups

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P4-A02` | A | Sync protocol: change log, HLC versions, scoped replicas, per-entity conflict policy, conflict log UI | P4-A01, P4-B01 | L | Spec 06 §3.2 policies |
| `P4-C01` | C | Server authentication: sessions, lockout, password reset, TOTP for finance/admin, guardian phone OTP | P4-B01 | L | Spec 06 §5.1 |
| `P4-D01` | D | Backups: automatic encrypted daily, retention, restore to new instance, restore-drill reminder, full export | P4-B01 | M | GP-8 green |

#### P4-W3 — Sequences, RBAC, SSO, packaging, health page, hardening

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P4-A03` | A | Server-allocated sequences and device number blocks for offline receipting | P4-A02 | M | No duplicate receipt numbers across devices |
| `P4-C02` | C | Server-side RBAC with scopes and maker-checker workflow engine | P4-C01 | M | Same decisions as client checks |
| `P4-C03` | C | OIDC SSO (Google Workspace, Microsoft 365) for staff | P4-C01 | M | Login via SSO on hub/cloud |
| `P4-D02` | D | Packaging: hub installers for Windows, Ubuntu, Raspberry Pi; LAN discovery; TLS on LAN | P4-B01 | L | Fresh install to first login ≤ 15 min |
| `P4-D03` | D | System Health page (storage persistence, last backup, sync lag, outbox, integrations) and diagnostic bundle | P4-A02, P4-D01 | M | Spec 06 §11 |
| `P4-D04` | D | Security hardening: CSP, rate limits, secret/dependency scanning, encryption at rest, restricted-data access logs | P4-B01 | M | Threat checklist closed |

#### P4-W4 — Multi-device golden path; phase exit

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P4-Q01` | Q | GP-7 multi-device golden path | P4-A02, P4-A03 | M | Green in CI |

# Phase 6 — Ecosystem & Open-Source 1.0

**Goal:** an extensible, documented, governed open-source project with real schools using it
([spec 06 §9–10](../../specs/multi-curriculum-platform/06-platform-architecture.md#9-integrations), [spec 08 §6–8](../../specs/multi-curriculum-platform/08-quality-and-release.md#6-releases)).

**Depends on:** P2, P3, P4 (P5 may continue in parallel) · **Estimate:** ~4 weeks + one pilot term.

## Release criteria for 1.0
All phase exit criteria met; GP-1…GP-8 green; pilot sign-off for KE CBE (primary/comprehensive), KE transitional secondary, British international, and one non-Kenyan national pack; licence and governance documents published; security policy live; upgrade path from P0-era data verified.

## Lanes

| Lane | Scope |
| --- | --- |
| A | Plug-in SDK |
| B | Integrations |
| C | Portal |
| D | Documentation |
| E | Governance & release |

## Exit criteria

1. Plug-in SDK documented; one third-party-style plug-in built without core changes
2. ke-kemis and knec-registration export plug-ins; accounting export; SMS/WhatsApp providers
3. Guardian/learner PWA portal live
4. Licence chosen; repository hygiene complete; contributor docs; security policy
5. One full pilot term per flagship pack with sign-off; 1.0 tagged
6. `node scripts/prd/gate.mjs phase --probe` → GATE PASSED; baseline tightened; phase-complete log written.

## Waves

| Wave | Focus | Tasks (run in parallel) |
| --- | --- | --- |
| `P6-W1` | Licence, hygiene, governance, plug-in SDK | P6-E01, P6-E02, P6-E03, P6-A01 |
| `P6-W2` | Integrations, portal, documentation | P6-B01, P6-B02, P6-B03, P6-C01, P6-D01 |
| `P6-W3` | Pilot term | P6-E04 |
| `P6-W4` | Release 1.0 | P6-E05 |

## Tasks

Snapshot generated with the ledger; **status lives in [`../tasks.json`](../tasks.json)**. Later-phase tasks are intentionally
coarser than P0: each is refined into sub-tasks (same id + suffix, e.g. `P2-C01a`) by the orchestrator at the start of its wave,
after the previous phase's learnings are logged.

#### P6-W1 — Licence, hygiene, governance, plug-in SDK

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P6-E01` | E | DR-03 licence decision; LICENSE, NOTICE, pack data licence | — | S | Decision recorded |
| `P6-E02` | E | Repository hygiene for public release (secrets, assistant config folders, dead plug-ins, duplicate pages) | — | M | Secret scan clean; dead code removed |
| `P6-E03` | E | Governance: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue templates, RFC process, pack stewardship | — | S | Spec 08 §7 |
| `P6-A01` | A | Plug-in SDK: manifest, permissions, UI slots, service hooks, server routes, versioning; rationalise builtin plug-ins | — | L | Example plug-in passes compatibility tests |

#### P6-W2 — Integrations, portal, documentation

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P6-B01` | B | Kenya exports: ke-kemis and ke-knec-registration plug-ins | P6-A01 | M | Files validate against published formats |
| `P6-B02` | B | Messaging providers (Africa's Talking, Twilio, WhatsApp Business, SMTP) with outbox | P6-A01 | M | Delivery status tracked |
| `P6-B03` | B | Accounting connectors/exports (QuickBooks, Xero, Odoo, ERPNext via existing plug-in) | P6-A01 | M | Journal export validated |
| `P6-C01` | C | Guardian & learner PWA portal (balances, pay links, reports, attendance, notices, consent) | — | L | Works on 2–3 GB Android over 3G profile |
| `P6-D01` | D | Documentation set: role guides, admin guide, deployment guides, pack authoring, SDK, data-protection guide | — | L | Spec 08 §8 list complete |

#### P6-W3 — Pilot term

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P6-E04` | E | Pilot programme: one school per flagship pack for a full term; feedback triage | — | L | Sign-off from each pilot |

#### P6-W4 — Release 1.0

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P6-E05` | E | Release 1.0: changelog, migration notes, stable channel, LTS policy, tag | P6-E04 | S | All phase exits met |

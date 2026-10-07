# Phase 5 — Packs & Localisation

**Goal:** SchoolPilot speaks the languages and runs the curricula of its target countries
([spec 03 appendices D–K](../../specs/multi-curriculum-platform/03-curriculum-and-assessment.md#appendix-d--uganda-ug-national), [spec 06 §6](../../specs/multi-curriculum-platform/06-platform-architecture.md#6-internationalisation-and-localisation)).

**Depends on:** P2 engine for curriculum packs; **P5-W1 (i18n infrastructure) may start during P1.** · **Estimate:** 4–6 weeks, then ongoing community maintenance.

## Rules for pack tasks
- Each pack cites official sources in its README and ships vectors; anything unverifiable stays `verification: draft` and is listed in the phase log.
- Prefer a reviewer from the country (pack steward) before `verified`.
- Country packs carry identifiers, address hierarchy, holidays and statutory returns; payroll packs carry effective-dated statutory data (never hard-coded rates).

## Parallelism
W3 runs up to 7 pack tasks concurrently — each owns `packs/<code>/**` and `packs/country/<cc>/**` only.

## Lanes

| Lane | Scope |
| --- | --- |
| A | i18n & l10n infrastructure |
| B | Locales |
| C | Country & curriculum packs |
| D | Payroll pack interface |

## Exit criteria

1. sw, fr, pt, ar (RTL) locales complete for core flows; no hard-coded curriculum terms in core
2. Ethiopian calendar entry/display works in date fields
3. Uganda, Tanzania, Rwanda, Nigeria, Ghana, South Africa, Francophone packs pass vectors with cited sources
4. Country packs provide identifiers, address schemas, holidays; KE payroll pack implements the interface
5. `node scripts/prd/gate.mjs phase --probe` → GATE PASSED; baseline tightened; phase-complete log written.

## Waves

| Wave | Focus | Tasks (run in parallel) |
| --- | --- | --- |
| `P5-W1` | i18n infrastructure and locale formats (may start during P1) | P5-A01, P5-A02 |
| `P5-W2` | Calendars, Kiswahili and French, country pack format | P5-A03, P5-B01, P5-B02, P5-C01 |
| `P5-W3` | Portuguese/Arabic, Africa curriculum packs, payroll interface; phase exit | P5-B03, P5-C02, P5-C03, P5-C04, P5-C05, P5-C06, P5-D01 |

## Tasks

Snapshot generated with the ledger; **status lives in [`../tasks.json`](../tasks.json)**. Later-phase tasks are intentionally
coarser than P0: each is refined into sub-tasks (same id + suffix, e.g. `P2-C01a`) by the orchestrator at the start of its wave,
after the previous phase's learnings are logged.

#### P5-W1 — i18n infrastructure and locale formats (may start during P1)

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P5-A01` | A | i18n infrastructure: namespaces, extraction, translation platform sync, pseudo-locale CI check | — | M | Pseudo-locale shows no untranslated core strings |
| `P5-A02` | A | Locale formats (dates, numbers, currency, names, addresses, phones) and RTL layout support | — | M | ar layout mirrors correctly |

#### P5-W2 — Calendars, Kiswahili and French, country pack format

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P5-A03` | A | Calendar abstraction with Ethiopian calendar (display + entry) | P5-A02 | M | Round-trip conversion tests |
| `P5-B01` | B | Kiswahili locale (core flows + ke packs) | P5-A01 | M | Native-speaker review |
| `P5-B02` | B | French locale | P5-A01 | M | Review |
| `P5-C01` | C | Country pack format (identifiers, address hierarchy, holidays, statutory returns) + KE country pack | — | M | KE identifiers/address used by forms |

#### P5-W3 — Portuguese/Arabic, Africa curriculum packs, payroll interface; phase exit

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P5-B03` | B | Portuguese and Arabic locales | P5-A01, P5-A02 | M | Review |
| `P5-C02` | C | Uganda pack (PLE divisions, new lower secondary, UACE) + UG country pack | P5-C01 | L | Vectors pass |
| `P5-C03` | C | Nigeria pack (UBE/SSS, CA+exam, WAEC scale, terminal report with affective/psychomotor) + NG country pack | P5-C01 | L | Vectors pass |
| `P5-C04` | C | Tanzania, Rwanda packs + country packs | P5-C01 | L | Vectors pass |
| `P5-C05` | C | Ghana, South Africa packs + country packs | P5-C01 | L | Vectors pass |
| `P5-C06` | C | Francophone pack family (/20, coefficients, trimestres, conseil de classe, mentions) + SN/CI/CM country packs | P5-C01, P5-B02 | L | Vectors pass |
| `P5-D01` | D | Payroll pack interface + KE payroll pack (effective-dated statutory data) | — | L | Payslip fixtures match |

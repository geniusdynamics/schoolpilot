# 08 — Quality, Migration, Release and Governance

## 1. Why the current test suite missed everything

The audit's blockers shipped while the suite was "green" because the tests that mattered
mocked the layer that was broken (e.g. the setup-wizard spec mocks `useDatabaseCollection`;
there is no test that loads a page against a real provider and saves a record), and the
type ratchet allowed ~900 more errors than actually exist. The strategy below inverts that.

## 2. Test pyramid

| Layer | Scope | Tooling | Rule |
| --- | --- | --- | --- |
| **Domain unit** | Results engine, aggregation operators, billing/proration, allocation, promotion rules, sequences | Vitest | No mocks of domain logic; property-based tests for money splits and aggregation |
| **Pack conformance** | Every pack's vectors (03 §12) | Vitest | Runs for all packs on every engine change |
| **Repository integration** | Repositories + migrations against **real SQLite** (node build of the same adapter) and Postgres | Vitest + testcontainers (CI) | Never mock storage; invariant tests (02 §12) |
| **Component** | `EntityPicker`, `DateField`, `EntityForm`, `WizardForm`, `DataGrid`, report templates | Vitest + Testing Library | Picker conformance (07 §2) |
| **E2E golden paths** | Persona workflows in a real browser on a real build | Playwright | Must pass on SQLite-WASM (topology A) and hub (topology B) |
| **Smoke crawl** | Every route and hub tab renders without error boundary/404 and without console errors | Playwright (`scripts/audit/school-ops-probe.mjs` → test) | Zero tolerance |
| **Static contracts** | `contract-scan` sections all zero; lint rules (06 §2.4); typecheck; mojibake check | Node scripts, ESLint, tsc | Blocking |
| **Non-functional** | Bundle budgets, performance (billing 1,000 learners), accessibility (axe), visual regression of receipts/report cards | Playwright, Lighthouse CI | Budgets block merges |

## 3. Golden-path suites (acceptance)

Each suite starts from an **empty live database** (not demo) and uses only the UI.

### GP-1 New CBE primary school (Kenya)
1. Install → create administrator → wizard: school profile, country KE, programme `ke-cbe` (PP1–G6), year 2027 with three terms (dates edited), class groups (G1–G6, two streams each), learning areas accepted from pack, fee schedule for Term 1 (day only).
2. Create 3 staff (class teachers), assign homerooms.
3. Admit 12 learners with guardians (2 siblings share a guardian).
4. Bill Term 1; record cash, bank and M-Pesa (sandbox) payments; print receipts; statements show correct balances; sibling discount applied.
5. Take attendance for a week.
6. Record CBC rubric observations and an end-term test; publish primary term reports; PDFs show rubric levels, descriptors, competencies, attendance.
**Assertions:** counts, balances to the shilling, report content snapshots, no console errors.

### GP-2 Transitional secondary (Kenya)
Programmes `ke-cbe` (G10 pathways) and `ke-844` (F3–F4) in one school. Grade 10 learners choose pathway electives (combination rules enforced); Form 4 mark entry with papers; KCSE-style mean grade on F4 reports (best-7 vector); separate fee schedules; one billing run for both programmes.

### GP-3 British international school
`cambridge-intl` KS3 + IGCSE; Sep–Jul calendar with half-terms; USD-priced fees with KES base currency; option blocks; IGCSE A*–G and 9–1 scales; half-term reports with effort and target grades; no ranking.

### GP-4 Term cycle
Assessments opened → teacher mark entry (desktop + mobile) → lock → moderation adjust → compute → publish reports → term-end checklist → next term billing including carried balances.

### GP-5 Year-end rollover
Promotion run with repeats, a G9→G10 stage transition, graduates; commit; verify new class lists, historical queries, balances carried; undo and recommit.

### GP-6 Admissions
Public application → screening → interview → offer → acceptance with admission-fee payment → admit → appears in class, attendance, billing.

### GP-7 Multi-device (hub)
Bursar on PC, two teachers on phones offline; concurrent receipts (no duplicate numbers), concurrent mark entry on different cells (merge) and same cell (conflict surfaced); reconnect and converge.

### GP-8 Backup and restore
Automatic backup → wipe device → restore → data identical (checksums).

## 4. CI gates

1. `pnpm typecheck` with ratchet = current error count (decreasing only); `TS2304/TS2552` must be zero in `src/`.
2. ESLint custom rules (ids, `as any as`, collection literals, `useAppData` in new code).
3. `node scripts/audit/contract-scan.cjs --json` → all sections empty.
4. Unit + conformance + repository integration tests.
5. Golden paths GP-1, GP-4 on every PR (others nightly).
6. Smoke crawl on every PR.
7. Bundle budgets; mojibake/encoding check; secret scan.

## 5. Migrating existing installations

1. **Pre-flight**: automatic encrypted backup; integrity report (orphans, `NaN`/null FKs, streams without class, duplicate ids, denormalised-name drift).
2. **Map**: interactive mapping of existing classes → pack levels; streams → class groups for the current year; categories → residence status/fee categories; terms → academic periods; guardians de-duplicated by phone.
3. **Transform**: create enrolments from `current_class_stream_id`; convert nested arrays (fee template items, paper settings, invoice items) to rows; convert money to minor units; generate UUIDv7 for non-UUID ids with an id-map table so references and printed numbers stay stable.
4. **Verify**: row counts, balances per learner (before = after), marks per learner, sample report re-render matches.
5. **Rollback**: one click to the pre-flight backup until the school confirms.

## 6. Releases

- Semantic versioning; changelog per release; migration notes.
- **No breaking upgrades mid-term**: schools pin a release channel (`stable`, `next`); stable updates only ship schema changes during holiday windows unless security-critical.
- LTS line supported for one academic year.
- Pack releases are independent of core releases (03 §2.3).

## 7. Open-source governance

- **Licence**: choose and document (e.g. AGPL-3.0 for the core to keep hosted forks open, or MIT/Apache-2.0 for maximum adoption); packs under a permissive data licence (CC-BY-4.0) with source citations. Decision record before publication.
- **Repository hygiene before going public**: remove committed secrets/DSNs (`.env`), review assistant/IDE configuration folders (`docs/.claude`, `.qoder`, `.trae`, `.agents`) for what should ship publicly, clean dead plug-ins and duplicate pages, fix encoding, README with honest status.
- **Contribution flows**: CONTRIBUTING (setup, TDD, PR checklist with contract-scan/probe output), code of conduct, security policy (private disclosure), issue templates (bug, pack request, pack correction with source document).
- **Pack stewardship**: each country pack has named maintainers (ideally educators from that country); a correction requires a cited official source; `verified` status requires conformance vectors traced to an official example.
- **RFC process** for changes to the domain model, pack schema, plug-in SDK.
- **Pilot programme**: at least one school per flagship pack (CBE primary/comprehensive, transitional secondary, British international, one non-Kenyan national system) using each release candidate for a full term before `stable`.

## 8. Documentation deliverables

User guides per role (registrar, bursar, class teacher, subject teacher, exams officer,
head), administrator guide (setup, backups, users, integrations), deployment guides
(single device; LAN hub on Windows, Ubuntu and Raspberry Pi; hosted), pack authoring guide,
plug-in SDK guide, data-protection guide for schools, and short video walkthroughs of the
golden paths.

# SchoolPilot — Multi-Curriculum School Platform Specification

**Status:** Draft v1 · **Date:** 2026-10-07 · **Audience:** maintainers, contributors, implementers, school pilots
**Inputs:** [School Operations Audit (Oct 2026)](../../audit/2026-10-school-operations/README.md), the current codebase on `consolidation`, and curriculum/assessment practice in Kenya and across Africa.

> SchoolPilot will be open-sourced. This specification describes what it must become to
> run real schools — from a 200-learner rural primary school on one laptop to a
> 3,000-learner multi-campus international school — under Kenya's Competency-Based
> Education (CBE/CBC), the British system (EYFS → A-Level, Cambridge/Pearson), and the
> major national systems of Anglophone, Francophone and Lusophone Africa.

---

## Documents

| # | Document | What it covers |
| --- | --- | --- |
| 00 | **This file** | Vision, principles, scope, personas, glossary, roadmap |
| 01 | [Stabilisation (Phase 0)](./01-stabilisation.md) | Fixing every audit finding with acceptance criteria — the gate before any new feature |
| 02 | [Domain model](./02-domain-model.md) | Canonical entities, fields, relationships and invariants |
| 03 | [Curriculum & assessment engine](./03-curriculum-and-assessment.md) | Curriculum Packs, levels, learning areas, assessment schemes, grading scales, aggregation, promotion rules, report cards; reference packs for Kenya CBE, Kenya 8-4-4, British, Uganda, Tanzania, Rwanda, Nigeria, Ghana, South Africa, Francophone systems |
| 04 | [Student lifecycle & daily operations](./04-student-lifecycle.md) | Admissions → enrolment → placement → attendance → progression → exit/alumni; guardians, boarding, discipline, health |
| 05 | [Finance](./05-finance.md) | Fee structures, billing, discounts/bursaries, payments & mobile money, allocation, statements, accounting, payroll packs |
| 06 | [Platform architecture](./06-platform-architecture.md) | Data layer, persistence & sync, configuration, identity & RBAC, money, i18n/calendars, performance, security & privacy, integrations, extensibility |
| 07 | [UX standards](./07-ux-standards.md) | Forms, pickers/comboboxes, tables, wizards, feedback, printing, accessibility, mobile |
| 08 | [Quality, migration & release](./08-quality-and-release.md) | Test strategy, golden-path suites, CI gates, data migration, open-source governance |

---

## 1. Vision

A school should be able to download SchoolPilot, answer a short setup wizard
("Which country? Which curriculum(s)? Which levels do you teach? Day, boarding or both?"),
and on the same day:

1. admit and place learners into the right grade, class and stream;
2. publish a fee structure and bill every learner for the term;
3. receive fees by cash, bank and mobile money, with receipts and live balances;
4. take daily attendance;
5. record continuous assessment and exams in the format its curriculum requires;
6. print report cards that a parent, an inspector and the national examiner recognise;
7. roll the school over into the next term and the next year without re-typing anything.

Everything curriculum-specific (levels, subjects, grading, report layout, promotion
rules) is **data, not code** — shipped as versioned **Curriculum Packs** that the
community can contribute, review and update when ministries change policy (as Kenya
did with CBC → CBE, Junior School, and the 2026 Senior School pathways).

## 2. Principles

1. **Correctness before features.** No new module until the golden path (Phase 0) passes in CI on the real database provider.
2. **Configuration over customisation.** Country, curriculum, calendar, currency, grading and report layout are configured; the core never hard-codes "Form 1", "Term 3", "KCSE", "KES".
3. **Multiple curricula in one school.** Transitional schools (e.g. Kenyan secondary schools running Grade 10 CBE beside Forms 3–4 of 8-4-4 until 2027) and international schools (British + national) are first-class, not edge cases.
4. **History is never overwritten.** Enrolments, marks, invoices and payments are period-scoped records with audit trails; "current class" is a derived view.
5. **Money is exact.** Integer minor units, per-currency precision, append-only ledgers, no floats, no arbitrary maximums.
6. **Offline-first, multi-user.** Works on unreliable power and connectivity, but every staff device sees the same school; conflicts are resolved by rules, not luck.
7. **Fail closed.** A storage, auth or configuration problem stops the action with a clear message; it never silently degrades to demo data, in-memory storage or "accept any password".
8. **Low-spec friendly.** Usable on a 4 GB RAM laptop, a mid-range Android phone over 3G, and a thermal receipt printer.
9. **Privacy by default.** Children's data is minimised, consented, access-controlled, exportable and deletable in line with Kenya's Data Protection Act 2019 and its peers.
10. **Contributor-friendly.** One data-access pattern, one form pattern, one picker component, typed contracts, real tests.

## 3. Scope

### In scope (v1 of this spec)
School setup; academic structure (years, terms, levels, classes/streams, houses); curriculum
packs; subjects/learning areas & allocations; staff records & teaching assignments;
admissions; enrolment & placement; guardians & families; attendance (daily, period,
boarding roll-call); assessment (formative/CA, summative/exams, competencies, projects);
results processing & ranking policy; report cards & transcripts; promotion & graduation;
transfers & leaving certificates; fees (structures, billing, discounts, bursaries,
installments, fines); payments (cash, bank, cheque, mobile money, card); receipts &
statements; arrears & reminders; basic accounting (chart of accounts, vote heads, cash
book, bank reconciliation, exports); SMS/WhatsApp/email notices; parent & learner portal;
audit log; backups; data import/export; national-system exports (e.g. KEMIS/NEMIS, KNEC
registration files) as plug-ins.

### Out of scope (kept, but not specified here)
Library, inventory/procurement, nutrition/wallet, HR payroll calculation detail (only
"country payroll packs" interface is specified), transport routing optimisation,
learning-management/content delivery, timetable auto-generation (only the data model).

## 4. Personas & primary jobs

| Persona | Primary jobs | Typical device |
| --- | --- | --- |
| **Head teacher / Principal** | Approve structures, monitor fees & performance, sign reports, promotion decisions | Laptop, phone |
| **Deputy / Director of Studies** | Timetable, allocations, exam calendar, results analysis | Laptop |
| **Registrar / Secretary** | Admissions, enrolment, transfers, certificates, data returns | Desktop |
| **Bursar / Accountant / Accounts clerk** | Fee structures, billing, receipting, M-Pesa reconciliation, statements, bank reconciliation | Desktop + receipt printer |
| **Class teacher** | Attendance, class list, report comments, parent contact | Phone / shared laptop |
| **Subject teacher** | Mark entry for allocated classes, competency observations | Phone / laptop |
| **Exams officer** | Assessment setup, moderation, mark-sheet locking, report generation | Laptop |
| **Boarding master / matron** | Roll-call, exeat/leave-out, dormitory allocation | Phone |
| **Parent / guardian** | Fee balance & statements, pay via mobile money, report cards, notices | Phone (often feature-phone via SMS) |
| **Learner** (secondary+) | Timetable, results, assignments | Phone |
| **System administrator** | Users, roles, backups, integrations | Laptop |
| **Proprietor / board / county officer** | Read-only dashboards, multi-school roll-ups | Phone, laptop |

## 5. Glossary (canonical terms used in all documents)

| Term | Meaning | Local names |
| --- | --- | --- |
| **Institution** | The school as a legal entity | School, college, academy |
| **Campus** | A physical site of an institution | Branch, section |
| **Curriculum Pack** | Versioned data describing one curriculum (levels, learning areas, assessment, grading, promotion, report templates) | — |
| **Programme** | A curriculum offered by the institution, e.g. "Kenya CBE (PP1–G9)", "Cambridge IGCSE" | Section, track |
| **Stage** | Group of levels within a programme | Phase, key stage, cycle, band |
| **Level** | Ordinal year of study | Grade, Form, Year, Class, Standard, Primary 4, JSS 2, S3, 6e |
| **Class group** | A teaching group of learners at one level in one year | Stream, arm, section, division, form room, "7 Blue" |
| **Academic year** | The school year | Session (Nigeria), année scolaire |
| **Academic period** | Subdivision of the year used for teaching and reporting | Term, semester, trimester, half-term |
| **Learning area** | What is taught and assessed | Subject, course, discipline, matière |
| **Component** | Separately assessed part of a learning area | Paper, unit, strand, coursework, practical |
| **Assessment scheme** | How components and assessments combine into results | CA/exam weighting, SBA, coefficients |
| **Grading scale** | Mapping from a score or rubric to a grade/level/points | Grading system, rubric |
| **Enrolment** | A learner's membership of a programme/level/class group for an academic year | Registration |
| **Vote head** | A fee item that maps to a ledger account | Fee item, charge type |
| **Fee schedule** | The set of charges that apply to a population for a period | Fee structure |

## 6. Phased roadmap

| Phase | Goal | Exit criteria | Indicative effort* |
| --- | --- | --- | --- |
| **0 — Stabilise** | The current feature set works end-to-end on real persistence | Audit probe 16/16, crawl 0 crashes, golden-path suite green on SQLite and PouchDB providers | 3–4 weeks, 2 devs |
| **1 — Core model** | Adopt the canonical domain model (02) with migrations; one data layer (06 §2) | All modules read/write via repositories; no mock hooks; denormalised names removed | 4–6 weeks |
| **2 — Curriculum engine** | Curriculum Packs + assessment engine + report cards (03) | Kenya CBE (PP1–G12), Kenya 8-4-4, British (KS1–A-Level) packs pass conformance tests; report cards print | 6–8 weeks |
| **3 — Finance v2** | Fee matrix, billing runs, mobile money, statements (05) | Bursar can bill a whole school, reconcile an M-Pesa statement and print statements in < 1 hour | 5–6 weeks |
| **4 — Multi-user & sync** | Server or LAN hub with offline replicas (06 §3) | Three devices edit concurrently with deterministic conflict handling; nightly encrypted backup | 4–6 weeks |
| **5 — Africa packs & l10n** | Uganda, Tanzania, Rwanda, Nigeria, Ghana, South Africa, Francophone packs; Kiswahili, French, Portuguese, Arabic (RTL) | Each pack has a pilot school or ministry-document conformance test | ongoing, community |
| **6 — Ecosystem** | Plug-in SDK, national-system exports, accounting exports, parent app | Third-party pack/plug-in published without core changes | ongoing |

\*Effort assumes the team size noted and is for planning only.

## 7. Success metrics

- New-school setup (profile → first invoice batch) in **≤ 2 hours** without support.
- Term-start billing for 1,000 learners in **≤ 2 minutes** on a 4 GB laptop.
- Receipting a payment in **≤ 20 seconds** (keyboard only).
- Report cards for a 40-learner class generated in **≤ 30 seconds**.
- **Zero** data-loss incidents; **zero** "accept any password" paths.
- Pack conformance: every shipped pack reproduces the issuing body's published examples.

## 8. Non-goals and constraints

- No hard dependency on a cloud vendor; self-hosting on a school LAN must remain possible.
- No feature may require continuous internet access to record attendance, marks or payments.
- No ranking/position display is forced; ranking is a per-school, per-report policy (Kenya discourages public ranking of national-exam results; many schools still rank internally).
- No storage of mobile-money PINs, card numbers or national-ID images beyond what the law and integration require.

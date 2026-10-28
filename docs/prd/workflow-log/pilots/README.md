# P6-E04 pilot programme

**Status: not started. No school is enrolled.** This directory is the kit a pilot runs on. It is not
evidence that a pilot happened, and it does not turn a draft pack into a verified one.

E04 is blocked until the owner nominates one school per flagship pack, the school signs the pilot
agreement, and the school gives a term to the programme. The flagship packs stay
`verification: draft` until a curriculum officer reviews the specific items their `pack.json` lists;
a school's sign-off is acceptance of the pilot, not curriculum verification.

## The four flagship packs

| Pack | What it covers | Pilot role | Pack status today |
| --- | --- | --- | --- |
| `packs/ke-cbe` | Kenya Competency-Based Education, PP1–Grade 12 | primary / comprehensive | draft; no curriculum officer has reviewed it |
| `packs/ke-844` | Kenya 8-4-4 secondary, Forms 1–4 (KCSE) | transitional secondary | draft; no KNEC or KICD officer has reviewed it |
| `packs/cambridge-intl` (proposed; `packs/pearson-intl` is the alternate) | Cambridge International, Year 1–13 | British international | draft; no Cambridge reviewer has checked it |
| one non-Kenyan national pack — `packs/gh-sbc` proposed; `packs/za-caps`, `packs/ug-lsc`, `packs/rw-cbc` are alternates | a national curriculum | non-Kenyan national | draft; no ministry reviewer has checked it |

The release criteria name the first three roles and "one non-Kenyan national pack". The exact
British and non-Kenyan packs are the owner's choice. Do not put a school on a pack the owner has not
chosen.

## What the pilot is

One school per pack for one full academic term, using the build the way the school actually runs:
setup, admission and enrolment, attendance, billing and receipts, assessment and reports, promotion,
and the guardian portal where the school has the devices and the staff to run it. The school keeps
its data and its term; this is not a demo.

**The pilot is not a product launch.** It is the evidence E04 needs: a real school, a real term, a
signed record of what worked and what did not.

## What the school gets, and what we ask

| The school gets | We ask |
| --- | --- |
| The build, installed on a named device or a hub, with the deployment guide | A named pilot lead (head or deputy) and a named technical contact |
| A half-day setup and training session for the registrar, bursar and class teachers | One full academic term, not a fortnight |
| A named support channel and a triage promise (below) | A weekly check-in, and feedback within two working days |
| The data-protection pack and a review with the school's DPO | Permission to use anonymised aggregates in the pilot report |
| A written pilot report and a say in the pack corrections | A signed sign-off at the end, and a reference call if the pilot passes |

**Known limits to say before the school agrees:**

- The browser app is local-first. A LAN hub gives the school one server, backups and the API; it
  does **not** yet serve the browser app, so staff still run the app on their own devices.
- A guardian-only login cannot reach module routes in this build. The portal is tested by linking a
  staff login to a guardian; a school that expects parents to sign in with their own accounts must
  wait for that change.
- No payment provider is configured. The fees page shows the not-configured state; a live pay link
  is not part of this pilot unless the school already has a provider integration built.
- The packs are drafts. Their assessment rules and grade bands are the first thing the school's
  teachers should check; the pilot log captures every correction.
- The portal's Lighthouse/3G/low-end-device budget has not been measured. The pilot should measure it
  on the school's own devices (the command is in `docs/architecture/portal-performance.md`).

## Term plan

| When | What happens | Evidence |
| --- | --- | --- |
| 4–2 weeks before term | Agreement signed; DPO review; device/hub prepared; baseline metrics; training | signed agreement, install notes, baseline in `metrics.md` |
| Week 1 | Admission and enrolment; class lists; attendance starts; fee structures and first invoices | golden-path evidence, first feedback entry |
| Weeks 2–3 | Fees and receipts; assessment setup; first reports | receipts, report cards, feedback log |
| Mid-term | Review with the school lead; re-prioritise open issues; check backups and restore drill | mid-term note, restore evidence |
| Weeks 4–end | Full workflows; promotion dry run; guardian portal if in scope | promotion preview, portal notes |
| End of term | Endline metrics; close P1/P2 issues; sign-off; pack corrections | `sign-off-template.md`, `metrics.md`, correction list |

The school's own term dates win. Record the actual dates in the sign-off.

## Roles

| Role | Who | Responsibility |
| --- | --- | --- |
| Pilot owner | the product owner (Mr Genius) | nominates the schools, signs the agreement, accepts the final report |
| Pilot lead | a named person on the product side | runs the plan, owns the feedback log, escalates P1 |
| School lead | head/principal or deputy | makes staff time available, signs the school's acceptance |
| Registrar | school | admission, enrolment, registers, reports |
| Bursar | school | fee structures, invoices, receipts, statements |
| IT contact | school | devices, network, backups, the hub if used |
| Curriculum reviewer | school and, separately, a curriculum officer | checks the pack's assessment rules; only the officer can move `verification` off `draft` |

## Triage

| Severity | Meaning | First response | Resolution target |
| --- | --- | --- | --- |
| **P1** | data loss, a security issue, or the school cannot use the app | stop, preserve evidence, tell the owner within 1 hour | rollback or fix within 1 school day |
| **P2** | a core workflow is blocked for a class or the school | same day | 1 school day |
| **P3** | a workaround exists | 1 school day | 3 school days |
| **P4** | cosmetic or a suggestion | weekly triage | next release |

Every item goes in `feedback-log.md`. A P1 also gets an incident note with the time, the data
affected, the rollback, and the school's confirmation. Never put a learner's name or other personal
data in the log; use the learner's internal id or an anonymised example.

## Success measures

The pilot passes when all of these are true, or the sign-off records why one is not:

- Every golden path has been completed at least once at the school: setup, admission, billing,
  payment/receipt, attendance, assessment, report, promotion.
- Attendance is taken on at least 80% of the school's teaching days in the term.
- At least one full billing run, one payment with a receipt, and one published term report.
- A backup exists and a restore has been rehearsed into a scratch directory.
- No data-loss or security incident; every P1 is closed at exit; every P2 has a fix or a signed
  workaround.
- The school lead rates the fit at 4/5 or better and is willing to take a reference call.
- The pack correction list is written and owned, even where the correction is "no change".

## Data protection

The pilot handles real learner data, so the school's DPO reviews the pilot agreement and the
[data-protection guide](../../../guides/data-protection.md) before the first learner is admitted.
In short: the data stays on the school's device or hub; backups are encrypted; the pilot report uses
anonymised aggregates; the school owns the data and can ask for deletion at exit; no telemetry is
sent. The guide is guidance, not legal advice.

## Owner actions to unblock E04

1. Choose the British and non-Kenyan packs (Cambridge + one of Ghana/South Africa/Uganda/Rwanda).
2. Nominate one school per pack and name the school lead.
3. Sign the pilot agreement and get the school's DPO review.
4. Put the dates in `metrics.md` and `sign-off-template.md`.
5. Only then change the E04 ledger status from `blocked`.

Until those are done, this kit is preparation, not a pilot.

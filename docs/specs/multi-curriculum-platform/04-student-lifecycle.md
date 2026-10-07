# 04 — Student Lifecycle & Daily Operations

## 1. Lifecycle

```
enquiry ─▶ applicant ─▶ assessed ─▶ offered ─▶ accepted ─▶ enrolled/active ─┬─▶ promoted (next enrolment)
   │           │            │           │          │                         ├─▶ repeating
   └─ closed   └─ withdrawn └─ declined └─ lapsed  └─ no-show                ├─▶ suspended ─▶ active
                                                                              ├─▶ transferred_out ─▶ (re_admitted)
                                                                              ├─▶ withdrawn / expelled
                                                                              └─▶ graduated ─▶ alumni
```

- `learner.status` holds the lifecycle state; **class and level live on `enrolment`** (02 §7).
- Every transition is an event with actor, date, reason and attachments; transitions that affect billing (admission, day↔boarding, exit) notify Finance (05 §6).

## 2. Admissions

### 2.1 Configuration
- **Admission windows** per programme/level and academic year, with capacity per level/class group and a waitlist.
- **Application form templates** built from blocks: learner details, identifiers (pack/country driven), previous schooling, prior results (pack-defined: e.g. KJSEA slip for Grade 10 entry, Common Entrance, BECE), guardians, medical & special needs, residence choice, pathway/subject preferences (Senior School, A-Level), sibling at school, how-did-you-hear, consent.
- **Document checklist** per level (birth certificate, previous report, transfer letter, assessment results slip, immunisation record, photo) with required/optional and verification status.
- **Fees**: application fee and admission/caution deposit items linked to Finance (05 §2).

### 2.2 Workflow
1. Capture (staff form or public page `/apply` with rate limiting and email/phone OTP verification).
2. Screening (completeness, duplicates — match on identifiers, then name + DOB + guardian phone).
3. Assessment/interview scheduling (slots, panel, scores, notes).
4. Decision (offer, waitlist, decline) with templated letters/SMS; offer includes fee schedule and acceptance deadline.
5. Acceptance (guardian confirms; optional admission-fee payment via mobile money link).
6. **Admit**: creates `learner`, `guardian(s)`, `learner_guardian`, `identifier`s, the first `enrolment` (programme, level, class group, residence status, fee categories), assigns admission number from the sequence, triggers billing for the remainder of the term (pro-rata rules), and adds the learner to class lists, attendance and mark sheets.

**Acceptance:** a registrar admits 30 Grade 10 learners from approved applications in under 15 minutes, each appearing in the right class group, pathway teaching groups, attendance register and billing run, with no duplicate guardians for siblings.

## 3. Enrolment, placement and subject choice

- **Admission numbers**: named sequences with patterns (`{SEQ:5}`, `GA/{YYYY}/{SEQ:3}`, `{CAMPUS}-{SEQ}`); scope per institution, campus or year; never reused; manual override requires permission and is audited.
- **Class allocation tool**: distribute a level's intake across class groups balancing gender, residence, house, prior attainment, siblings apart/together; drag-and-drop adjustments; capacity warnings.
- **Mid-year moves**: stream change, day↔boarding switch, pathway change — each an `enrolment_change` with effective date; billing and teaching-group membership follow automatically.
- **Subject/elective choice**: per level and pathway, validated by pack `combination_rules` (e.g. Senior School core + 3 electives; A-Level 3–4 principals + subsidiaries; option blocks). Learners/guardians may submit choices in the portal; the school approves; timetable clash detection against teaching groups.
- **Exemptions**: per learning area with reason and evidence (e.g. Kiswahili exemption, KSL for deaf learners, religious education choice).

## 4. Guardians and households

- Multiple guardians per learner with roles (02 §6.2); exactly one primary contact; one or more **fee payers** with shares.
- **Households** link siblings (sibling discounts, combined statements, one SMS per household option).
- Contact verification (SMS OTP), preferred channel and language, quiet hours.
- **Safeguarding flags**: no-contact/no-release orders (court orders) visible at gate pass and pickup; restricted to authorised roles.
- Guardian portal: balances, statements, pay links, report cards, attendance, notices, consent forms; one login sees all their children across campuses.

## 5. Daily operations

### 5.1 Attendance
- Registers by class group (daily AM/PM), by teaching group (per lesson), and boarding roll-calls (evening/night); configurable per programme.
- Mobile-first marking: everyone present by default, tap exceptions; statuses present/absent/late/excused/medical/exeat/suspended; minutes late; reason codes.
- Late arrivals at the gate update the register.
- Automatic guardian SMS for unexplained absence after a cut-off time (configurable, opt-out).
- Calculations exclude non-school days from the calendar (02 §3).
- Reports: daily summary, chronic absence (< 90 %), registers for inspection, termly attendance on report cards.

### 5.2 Boarding
Residence and bed allocation; roll-calls; exeat/leave-out requests with guardian confirmation, QR gate pass, return check-in; visiting days; personal-effects/pocket-money wallet (existing wallet module as a plug-in).

### 5.3 Conduct and pastoral care
Incidents with categories, actions (counselling, detention, parent meeting, suspension), guardian notification, letters from templates; suspension changes status with dates and re-admission checklist; merit/house points optional; counselling notes with restricted access.

### 5.4 Health
Clinic visits, medication administration log, chronic conditions and allergies (alert banner on learner profile and gate pass), immunisation records, incident/injury reports. Medical data visible only to health and designated safeguarding roles.

### 5.5 Co-curricular
Clubs, sports, societies, Community Service Learning (Senior School CSL) hours and projects with evidence; appear on report cards and transcripts.

### 5.6 Gate and visitors
Visitor log, learner pick-up with authorised persons and codes (existing pickup module), staff/learner movement logs.

## 6. Term and year transitions

### 6.1 End of term checklist (guided)
1. All assessments for the period locked (list blockers by teacher/group).
2. Results computed and moderated.
3. Report cards generated, reviewed, published.
4. Attendance closed.
5. Fee balances reviewed; reminders sent.
6. Next term created/confirmed with dates (from pack calendar template).
7. Next-term billing run previewed and posted (05 §4).

### 6.2 End of year — promotion run
1. **Compute** suggestions for every active enrolment using pack progression rules (03 §7): promote, repeat, graduate, stage transition (e.g. G9 → G10 requires pathway placement), council review.
2. **Review** per class group: class teacher/Head of Year adjusts with reasons; bulk actions; conflicts flagged (e.g. capacity in next-year class groups).
3. **Map** to next-year class groups (default: same stream name at next level; configurable re-streaming).
4. **Approve** (head teacher).
5. **Commit** atomically: close current enrolments (`exit_reason`), open next-year enrolments (`entry_reason`), carry teaching-group defaults, keep fee balances on the learner account, mark graduates (`status = graduated`, alumni record), archive class lists and results.
6. **Undo** available until the first posting in the new year.

**Acceptance:** a 900-learner school promotes, repeats and graduates the right learners into the 2028 class groups in one session; "Who was in Grade 8 Blue in 2027?" still answers correctly afterwards.

### 6.3 Exit
- Transfer out: reason, destination school, date; produces leaving/transfer certificate and records pack (latest report, transcript, attendance summary, conduct summary as policy allows); national-registry transfer step via plug-in (e.g. KEMIS).
- Withdrawal/expulsion with approvals and letters; final account statement and refund/clearance (05 §7).
- Clearance workflow: library, boarding, sports, finance sign-offs before certificate release.
- Re-admission creates a new enrolment and preserves history.

## 7. Documents and certificates

Template-driven documents with numbering and verification QR: admission letter, offer letter, leaving certificate, transfer letter, testimonial/character certificate, bonafide letter, ID cards (learner/staff, with barcode/QR), exeat slip, suspension letter, fee statement, clearance form. Templates are per country/pack with school branding and locale.

## 8. Imports, exports and data returns

- **Bulk import** (XLSX/CSV) of learners, guardians, enrolments, staff, opening balances, historical marks — template download, column mapping, validation report, dry run, deduplication, idempotent re-run.
- **National registry** import/export through plug-ins (KEMIS/NEMIS in Kenya; EMIS equivalents elsewhere).
- **Statistical returns**: enrolment by level, gender, age, residence, special needs, nationality; staff by category; generated from the canonical model per country template.
- **Full export** of the school's data (JSON + CSV per entity) for portability and the right to data access.

## 9. Permissions summary (see 06 §5)

| Action | Registrar | Class teacher | Subject teacher | Bursar | Head | Guardian |
| --- | --- | --- | --- | --- | --- | --- |
| Capture/approve application | ✓ / — | — | — | — | — / ✓ | own application |
| Admit learner | ✓ | — | — | view fees | ✓ | — |
| Edit learner profile | ✓ | contact only | — | — | ✓ | request change |
| View medical | restricted | alert only | alert only | — | ✓ | own child |
| Take attendance | — | own class | own groups | — | ✓ | — |
| Move class / change residence | ✓ | request | — | notified | ✓ | — |
| Promotion run | prepare | review own class | — | — | approve | — |
| Exit/transfer | ✓ | — | — | clearance | approve | request |

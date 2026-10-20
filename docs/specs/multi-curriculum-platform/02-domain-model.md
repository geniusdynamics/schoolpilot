# 02 — Canonical Domain Model

This is the target data model for Phase 1 onwards. It replaces today's mix of nested
arrays, denormalised display names, single "current class" pointers and module-local
types. Field lists show the essentials; implementation may add technical fields.

## 1. Conventions

### 1.1 Identity and tenancy
- Every row has `id: Id` — a **string UUIDv7** (time-ordered, sortable, safe to generate offline). No numeric ids, no `Date.now()` ids, no prefixed ids.
- `type Id<T> = string & { __entity: T }` (branded) in TypeScript; comparisons are string equality only.
- Every row carries `institution_id`; rows that belong to a site also carry `campus_id`. This makes multi-school hosting and multi-campus schools possible without schema changes.
- Natural keys are enforced as unique constraints (e.g. `(institution_id, admission_number)`).

### 1.2 Time
- Timestamps: ISO-8601 UTC strings (`created_at`, `updated_at`, `deleted_at`).
- Calendar dates: `YYYY-MM-DD` strings, interpreted in the institution's time zone (`Africa/Nairobi` etc.).
- Effective dating for history: `valid_from`, `valid_to` (`null` = open).

### 1.3 Names are resolved, not stored
Display labels (`class_name`, `school_period_name`, `student_category_name` …) are **never
written** as data. Grids and pickers resolve them from ids via a shared lookup/selector
layer. (Report snapshots — invoices, receipts, report cards — store a frozen rendering;
that is a document, not a lookup.)

### 1.4 Money
`Money = { amount_minor: integer, currency: ISO-4217 }`. Precision from the currency
table (KES 2, UGX 0, TZS 2 but usually whole shillings, RWF 0, NGN 2, GHS 2, ZAR 2, XOF 0,
XAF 0, USD 2, GBP 2). No maximums. See 05 §1.

### 1.5 Audit and soft delete
`created_by`, `updated_by` (user ids), `deleted_at` for soft delete. Financial and
assessment records are **never** hard-deleted; they are reversed/voided with a reason.
Every mutation emits an `audit_event` (actor, entity, id, before, after, reason, device).

### 1.6 Extensibility
Entities that vary by country or curriculum carry `attributes: Record<string, JsonValue>`
validated by a JSON Schema contributed by the active Curriculum Pack or Country Pack
(e.g. `ke.kemis_upi`, `ng.nin`, `ug.lin`). Core code never reads pack-specific attributes
directly; it reads them through the pack's declared field definitions.

---

## 2. Organisation

| Entity | Key fields | Notes |
| --- | --- | --- |
| **institution** | `name`, `short_name`, `motto`, `logo_attachment_id`, `country` (ISO-3166), `region`/`county`, `ownership` (public, private, faith-based, community, international), `gender_policy` (mixed, boys, girls), `boarding_policy` (day, boarding, mixed), `default_locale`, `time_zone`, `base_currency`, `setup_completed_at` | One row per school (tenant). |
| **institution_identifier** | `institution_id`, `scheme` (e.g. `ke.knec_code`, `ke.kemis_code`, `ng.cac`, `ug.emis`), `value` | Multiple official numbers. |
| **campus** | `institution_id`, `name`, `address`, `phone`, `is_main` | Branches/sections. |
| **department** | `name`, `kind` (academic, administrative, support), `head_staff_id` | |
| **job_title** | `name`, `category` (teaching, non-teaching) | Replaces "designation". |
| **house** | `name`, `colour`, `patron_staff_id` | Sports/pastoral houses. |
| **residence** | `campus_id`, `name`, `gender`, `capacity`, `warden_staff_id` | Dormitory/hostel. |
| **residence_bed** | `residence_id`, `label` | Optional bed-level allocation. |

## 3. Calendar

| Entity | Key fields | Notes |
| --- | --- | --- |
| **calendar** | `name`, `programme_ids[]` | Most schools have one; international schools may run Jan–Nov (national) and Sep–Jul (British) calendars side by side. |
| **academic_year** | `calendar_id`, `name` ("2027", "2026/27"), `start_date`, `end_date`, `status` (planned, current, closed), `financial_year_id` | Exactly one `current` per calendar. Non-overlapping within a calendar. |
| **academic_period** | `academic_year_id`, `kind` (term, semester, trimester, half_term, quarter), `sequence`, `name`, `start_date`, `end_date`, `parent_period_id`, `is_reporting`, `is_billing`, `status` | Terms nest inside the year; half-terms nest inside terms. Replaces `school_periods` + `academic_period_definitions`. |
| **calendar_event** | `calendar_id`, `kind` (holiday, mid_term_break, exam_window, opening_day, closing_day, staff_day, event), `start_date`, `end_date`, `affects_attendance` | Drives school-day counts. |
| **financial_year** | `name`, `start_date`, `end_date`, `status` | Kenyan public schools use a Jul–Jun government FY; private schools often use Jan–Dec. Independent of academic years. |

## 4. Curriculum (instantiated from Curriculum Packs, see 03)

| Entity | Key fields | Notes |
| --- | --- | --- |
| **curriculum_pack** | `code` (`ke-cbe`, `ke-844`, `gb-national`, `cambridge-intl`, `ng-ube`, …), `version` (semver), `country`, `issuer`, `effective_from`, `checksum` | Read-only data installed from a pack file. |
| **programme** | `curriculum_pack_code`, `pack_version`, `name`, `calendar_id`, `status`, `overrides` | What the school offers, e.g. "CBE Primary (PP1–G6)", "Cambridge IGCSE". A school may run several. |
| **stage** | `programme_id`, `code`, `name`, `sequence` | Pre-primary, Lower Primary, Upper Primary, Junior School, Senior School; EYFS, KS1–KS5; JSS, SSS. |
| **level** | `stage_id`, `code`, `name`, `ordinal`, `typical_age`, `next_level_id`, `is_terminal`, `national_assessment_code` | "Grade 7", "Form 3", "Year 10", "JSS 2", "S5", "6e". `ordinal` is global within a programme for promotion. |
| **pathway** | `programme_id`, `code`, `name`, `level_ids[]`, `rules` | Kenya Senior School pathways (STEM, Social Sciences, Arts & Sports Science); A-Level combinations; Nigeria SSS Science/Arts/Commercial; Rwanda combinations (e.g. PCM, MCB, HEG). |
| **learning_area** | `programme_id`, `code`, `name`, `short_name`, `group`, `kind` (core, optional, elective, co-curricular, pastoral), `level_ids[]`, `pathway_ids[]`, `national_code` | "Subject" in most systems. National code (e.g. KNEC subject code) for exports. |
| **component** | `learning_area_id`, `code`, `name`, `kind` (paper, practical, coursework, oral, project, strand), `weight`, `max_score` | KCSE Paper 1/2/3, Cambridge components, CBC strands. |
| **outcome** | `learning_area_id`, `level_id`, `parent_id`, `code`, `text`, `kind` (strand, sub_strand, specific_learning_outcome, assessment_objective) | CBC strand → sub-strand → SLO hierarchy; British attainment targets. |
| **competency** | `programme_id`, `code`, `name`, `kind` (core_competency, value, pertinent_issue, attitude), `descriptors` | CBC core competencies (communication & collaboration, critical thinking …) and values. |
| **combination_rule** | `programme_id`, `level_ids[]`, `rule` (min/max electives, required groups, mutually exclusive learning areas) | Validates learner subject choices. |

## 5. Class groups and teaching

| Entity | Key fields | Notes |
| --- | --- | --- |
| **class_group** | `academic_year_id`, `programme_id`, `level_id`, `campus_id`, `name` ("Blue"), `display_name` (computed: "Grade 7 Blue"), `capacity`, `room`, `homeroom_teacher_ids[]` | Year-scoped: "Grade 7 Blue 2027" is a different row from "Grade 7 Blue 2028". Replaces `classes` + `class_streams`. A `level` without streams has one default class group. |
| **teaching_group** | `academic_year_id`, `learning_area_id`, `name`, `level_ids[]`, `class_group_ids[]`, `teacher_ids[]`, `kind` (whole_class, set, elective, combination) | Who is taught together for a learning area: whole class, ability sets, electives, A-Level sets drawn from several class groups. |
| **teaching_group_member** | `teaching_group_id`, `enrolment_id`, `valid_from`, `valid_to` | Derived automatically for `whole_class` groups. |
| **teaching_assignment** | `staff_id`, `teaching_group_id`, `role` (main, assistant), `valid_from`, `valid_to` | Drives mark-entry permissions. |
| **timetable_slot** / **timetable_entry** | slot = day/period/time; entry = slot × teaching_group × room | Data model only in this spec. |

## 6. People

### 6.1 Shared person fields
`given_name`, `middle_names`, `family_name`, `preferred_name`, `name_order` (given-first / family-first), `gender` (configurable list incl. "not stated"), `date_of_birth`, `nationality`, `languages[]`, `photo_attachment_id`, `phones[]` (E.164 + label), `emails[]`, `address` (structured, country-aware), `attributes`.

### 6.2 Entities

| Entity | Key fields | Notes |
| --- | --- | --- |
| **learner** | person fields, `admission_number` (sequence), `admission_date`, `status` (applicant, enrolled, suspended, withdrawn, transferred_out, graduated, deceased), `house_id`, `residence_status` (day, boarder, weekly_boarder), `special_needs[]`, `medical` (allergies, conditions, medications — restricted), `previous_school`, `household_id` | Status is lifecycle, not class. |
| **identifier** | `owner_type` (learner, guardian, staff), `owner_id`, `scheme`, `value`, `issued_by`, `verified_at` | Birth certificate no., KEMIS/NEMIS UPI, KNEC assessment no., NIN, LIN, passport, national ID, TSC no., KRA PIN … Schemes come from Country Packs. |
| **guardian** | person fields, `occupation`, `employer`, `national_id` (identifier), `is_staff_member_id` | |
| **learner_guardian** | `learner_id`, `guardian_id`, `relationship` (mother, father, guardian, grandparent, sibling, sponsor, other), `is_primary`, `has_parental_responsibility`, `is_fee_payer`, `fee_share_percent`, `can_pick_up`, `receives_reports`, `receives_sms`, `preferred_channel`, `preferred_language`, `priority` | Many-to-many; one primary; fee payer(s) drive statements. |
| **household** | `name`, `primary_payer_guardian_id` | Groups siblings for sibling discounts and combined statements. |
| **staff** | person fields, `employee_number`, `employment_type` (permanent, contract, board-employed, volunteer, intern), `job_title_id`, `department_ids[]`, `start_date`, `end_date`, `qualifications[]`, `teaching_competences` (learning_area × level), `user_id`, `payroll_profile` (Country Payroll Pack) | TSC number, tax PIN etc. as identifiers. |
| **user** | `username`, `password_hash` (argon2id/PBKDF2), `status`, `person_ref` (staff/guardian/learner), `mfa`, `last_login_at` | See 06 §5. |

## 7. Enrolment (the heart of history)

| Entity | Key fields | Notes |
| --- | --- | --- |
| **enrolment** | `learner_id`, `academic_year_id`, `programme_id`, `level_id`, `class_group_id`, `pathway_id`, `status` (active, repeating, left, completed), `start_date`, `end_date`, `entry_reason` (new_admission, promoted, repeated, transferred_in, re_admitted), `exit_reason` (promoted, graduated, transferred_out, withdrawn, expelled, deceased), `fee_category_ids[]`, `sponsorship_id` | Exactly one active enrolment per learner per calendar at any date. "Current class" = enrolment active today. |
| **enrolment_change** | `enrolment_id`, `kind` (class_change, pathway_change, category_change), `from`, `to`, `effective_date`, `reason`, `approved_by` | Mid-year stream moves, day↔boarding switches (affects billing pro-rata). |
| **learning_area_enrolment** | `enrolment_id`, `learning_area_id`, `teaching_group_id`, `status` (taking, dropped, exempt), `valid_from`, `valid_to` | Optional subjects, electives, exemptions (e.g. Kiswahili exemption, KSL for deaf learners). |
| **promotion_decision** | `enrolment_id`, `decision` (promote, repeat, conditional, graduate, transfer, leave), `to_level_id`, `to_class_group_id`, `rule_evaluation`, `decided_by`, `decided_at`, `committed_at` | Output of the year-end promotion run (03 §7, 04 §6). |

## 8. Assessment and results (engine in 03)

| Entity | Key fields | Notes |
| --- | --- | --- |
| **assessment_scheme** | `programme_id`, `level_ids[]`, `version`, `definition` (JSON per 03 §4) | How CA, exams and competencies combine. From the pack, overridable per school. |
| **grading_scale** | `programme_id`, `code`, `kind` (numeric_bands, rubric, points, letter, division, gpa, mark_out_of_20), `bands[]`, `version` | Multiple scales per programme (subject grade vs. overall grade vs. CBC rubric). |
| **assessment** | `academic_period_id`, `kind` (formative, cat, opener, mid_term, end_term, mock, project, practical, portfolio, national), `name`, `scheme_slot` (which weight bucket it fills), `level_ids[]`, `class_group_ids[]`, `learning_area_ids[]`, `component_ids[]`, `max_score`, `date_window`, `status` (draft, open, closed, moderated, published), `grading_scale_id` | Replaces `exam_sessions` + nested `paper_settings`. |
| **mark** | `assessment_id`, `enrolment_id`, `learning_area_id`, `component_id`, `score` (decimal string), `rubric_level`, `status_code` (present, absent, exempt, incomplete, malpractice), `comment`, `entered_by`, `entered_at`, `version` | One row per learner × assessment × component. Versioned: edits after close require a reason. |
| **competency_observation** | `enrolment_id`, `learning_area_id`, `outcome_id` or `competency_id`, `rubric_level`, `evidence` (text/attachment), `observed_on`, `observer_id` | CBC formative evidence. |
| **result** | `enrolment_id`, `academic_period_id`, `learning_area_id`, `score`, `grade`, `points`, `rubric_level`, `rank_in_group`, `teacher_comment`, `computed_at`, `engine_version`, `is_final` | Computed; recomputable; frozen when the report is published. |
| **period_result** | `enrolment_id`, `academic_period_id`, `aggregates` (total, mean, mean_grade, points, division, gpa, average_out_of_20, position, out_of), `class_teacher_comment`, `head_comment`, `conduct` | |
| **report_card** | `enrolment_id`, `academic_period_id`, `template_code`, `template_version`, `snapshot` (JSON), `pdf_attachment_id`, `published_at`, `published_by`, `acknowledged_by_guardian_at` | Immutable snapshot once published; re-issue creates a new version. |
| **comment_bank_entry** | `scope` (learning_area / overall / conduct), `band`, `text`, `locale` | Speeds up remarks. |

## 9. Attendance and pastoral

| Entity | Key fields |
| --- | --- |
| **attendance_session** | `date`, `session` (am, pm, day, period_n, roll_call), `class_group_id` or `teaching_group_id` or `residence_id`, `taken_by`, `taken_at`, `locked` |
| **attendance_mark** | `attendance_session_id`, `learner_id`, `status` (present, absent, late, excused, medical, exeat, suspended), `minutes_late`, `reason`, `notified_guardian_at` |
| **leave_out** (exeat) | `learner_id`, `kind` (exeat, half_term, medical, disciplinary), `out_at`, `due_back_at`, `returned_at`, `authorised_by`, `collected_by_guardian_id` |
| **conduct_incident** | `learner_id`, `date`, `category`, `description`, `action`, `points`, `guardian_informed_at`, `confidential` |
| **health_visit** | `learner_id`, `date`, `complaint`, `treatment`, `referred`, `recorded_by` (restricted access) |

## 10. Finance (detail in 05)

`account`, `vote_head`, `fee_item`, `fee_schedule`, `fee_schedule_line`, `discount_rule`,
`sponsorship`, `installment_plan`, `invoice`, `invoice_line`, `credit_note`, `payment`,
`payment_allocation`, `receipt`, `refund`, `mobile_money_transaction`, `bank_statement_line`,
`journal_entry`, `journal_line`, `sequence`.

## 11. Platform

`role`, `permission`, `role_assignment` (user × role × scope: campus/programme/level/class
group/learning area), `audit_event`, `setting` (typed, namespaced), `attachment`
(content-addressed, size/type-limited), `message_template`, `message`, `consent_record`,
`import_job`, `export_job`, `integration_account`.

---

## 12. Invariants (enforced in repositories and tested)

1. A learner has at most one active enrolment per calendar on any date.
2. An enrolment's `class_group.level_id == enrolment.level_id` and `class_group.academic_year_id == enrolment.academic_year_id`.
3. Academic periods of a year do not overlap at the same `kind`, and lie within the year.
4. At most one `current` academic year per calendar and one current term per year.
5. A mark's `enrolment` must be a member of a teaching group for that learning area on the assessment date (or flagged as an exception).
6. A published report card's snapshot never changes.
7. Invoices, payments and journal entries are immutable after posting; corrections are reversals.
8. Sum of `payment_allocation.amount` ≤ payment amount; unallocated remainder is learner credit.
9. Sequence numbers (admission, invoice, receipt) are unique per sequence scope and never reused.
10. Every foreign key resolves (repository-level referential integrity on all providers).

## 13. Mapping from the current schema

| Current collection(s) | Canonical entity | Migration note |
| --- | --- | --- |
| `school_details`, `settings` (undefined) | `institution`, `institution_identifier`, `setting` | Single row → institution. |
| `academic_year_structures`, `academic_period_definitions` | pack data (`stage`/period template) | Structures become calendar templates in packs. |
| `academic_years` | `academic_year` | Add `calendar_id`, `status`. |
| `school_periods` (finance module) | `academic_period` | Drop denormalised names; keep `financial_year_id` on the year. |
| `financial_years` | `financial_year` | Add UI (Phase 0). |
| `education_system_configurations`, `grading_schemes` | `programme`, `grading_scale`, `assessment_scheme` | |
| `classes` + `class_streams` (+ nested `classes.streams`) | `level` (pack) + `class_group` (year-scoped) | One `class_group` per stream per year; classes map to levels by name match + user confirmation. |
| `students` (`current_class_stream_id`, `primary_guardian`, `exam_result_summary`, denormalised names) | `learner` + `enrolment` + `learner_guardian` + `identifier` | Create an enrolment for the current year from `current_class_stream_id`; move `upi_no` to identifier; drop `exam_result_summary` (KCPE-only) into `attributes.ke.kcpe`. |
| `parents_guardians`, `student_guardian_relationships` | `guardian`, `learner_guardian` | |
| `staff`, `departments`, `designations` | `staff`, `department`, `job_title` | |
| `subjects`, `subject_papers` | `learning_area`, `component` | |
| `class_subject_allocations`, `teacher_subject_assignments`, `student_subject_enrollments` | `teaching_group`, `teaching_assignment`, `learning_area_enrolment` | |
| `exam_sessions` (+ `paper_settings`), `exam_schedules` | `assessment` | |
| `student_exam_results` (+ nested paper marks) | `mark`, `result`, `period_result` | |
| `student_attendance`, `session_attendance` | `attendance_session`, `attendance_mark` | |
| `fee_templates` (+ nested items) | `fee_schedule`, `fee_schedule_line`, `fee_item` | |
| `student_invoices` (+ nested items), `student_invoice_items` | `invoice`, `invoice_line` | |
| `student_payments`, `invoice_payment_applications`, `student_payment_records` | `payment`, `payment_allocation`, `receipt` | |
| `student_opening_balances`, `previous_session_fees` | opening-balance `invoice` lines / credit notes | |
| `fee_adjustments`, `fines` | `credit_note`, `invoice_line` (kind = fine/adjustment) | |
| `student_categories` | fee category (`attributes`) + `residence_status` | "Boarder/Day" is residence, not a category. |
| `dormitories` | `residence` | |
| `houses`, `point_*` | `house` (+ points as plug-in) | |

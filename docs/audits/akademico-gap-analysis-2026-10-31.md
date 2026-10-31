# Akademico gap analysis and mock inventory

Date: 2026-10-31
Old system source: `docs/AkademicoNotes` (Akademico Admissions, Examination, Finance, Inventory, Library and context notes).
New system: `src/modules/*` on `feat/person-search`.

This note separates three things:

1. concepts the old Akademico had that the new model should adopt;
2. concepts the new model already covers, so they are not re-built;
3. remaining mock screens and the order in which they should be made real.

## 1. What the old Akademico did well

### 1.1 Field-selection report builder

Old evidence: `Akademico_Admissions/akademico_admissions/frmReportConfigurations.cs`.

The operator picked a report (Students, Parents/Guardians, Teachers, Support Staff, Subjects), ticked the columns, chose a class and optional stream, then generated a printable/exportable report. The student field list included admission number, name, gender, date of birth, birth certificate, religion, home district, previous school, entry marks, class/stream admitted, current class/stream, admission date, dormitory, category, UPI, KCPE and index number.

New state before this change: `src/modules/reports/components/DynamicReportBuilder.tsx` was an empty component; `ReportBuilderService` had projection/filter/sort logic but no UI.

Adopted now: the builder is a real Student Report Builder under **Reports → Student Reports → Report Builder**. It selects columns, filters by class and stream, previews the grid, prints it and exports CSV. It uses the canonical learner, enrolment, class-group, level, guardian and learning-identifier rows rather than SQL strings.

Still to add: report types for staff, support staff, guardians and subjects; save a named report definition; PDF export via the existing print stylesheet.

### 1.2 Student list, global find, detailed view

Old evidence: `frmStudentList.cs`, `frmSearchStudentGlobal.cs`, `frmStudentDetailedView.cs`, `frmFindStudent.cs`.

- The list filtered by status (continuing, transferred, discontinued, alumni) and by class/stream.
- A global finder searched by admission number and opened the learner.
- The detailed view was one long read-only record: bio data, admission, placement, guardian, fees, discipline, documents.

New state: the canonical learner directory and `StudentProfilePage` exist; the directory now has explicit class and stream filters and the profile route is the old detailed view. The person picker searches admission number and names, so the "global find" role is covered, but there is no keyboard shortcut/global launcher outside a form.

Remaining: a global student finder (Ctrl/Cmd-K or header search) that opens the profile, not just a form picker.

### 1.3 "Effect fee structure" and bulk fee payment

Old evidence: `Akademico_Finance/Finance/frmFeeStructure.cs`, `frmBulkFeePayment.cs`, `CommonFunctions.verifyFeeStructure`.

The old flow:

1. Build a fee structure for a **student category + class + term + year**.
2. Mark it **effected** so it can be transacted with, and **active** once used.
3. On effect, for every continuing learner in that class/category, write a `previous_fee_structure` row if one does not exist.
4. Distribute prepayments and carried balances with the chosen mode (termly/yearly, priority/weighted).
5. Bulk payment then checked, per learner, that an effected structure existed for the same category/class/term/year and refused/warned when it did not.

New state: `fee_schedule` is a matrix over programme, level, residence status, fee category and campus; `BillingRunPanel` previews each learner with a reason they are billed or skipped (`no_schedule`, `cell_unresolved`, `already_billed`, `zero_total`, `out_of_scope`), and posts invoices in one run. Opening balances and ad-hoc charges are part of the same panel.

What is genuinely missing compared with the old flow: the old **prepayment/arrears distribution on effect** is not part of the same one-click action in the new UI. The new billing run bills the schedule but does not automatically turn the learner's excess votehead/credit into a termly or weighted distribution. That is a finance-policy decision and should be added as a separate, reversible "carry forward" step, not silently inside billing.

Recommendation: add a **"Affected learners" preview** on the fee schedule (the same list the billing run already computes) and a separate **"Carry forward balances"** action with dry-run, priority/weighted mode and an audit trail. Do not copy the old `effected/active` flags; use the schedule's workflow status.

### 1.4 Bulk grids as first-class workflows

Old evidence: `frmBulkFeePayment.cs`, `frmStudenClearance.cs`, `frmGraduateStudents.cs`, `frmStudentList.cs`.

The old screens put a check-box grid in front of the operator, let them select rows, and wrote the selected rows in one action. Validation errors were collected into a visible report rather than stopping at the first row.

New state: `DataGrid` supports selection, sticky columns, pagination and filters; the bulk update/import pages exist. The new billing run and promotion run already use preview-then-post. The missing piece is a consistent **bulk action pattern**: select rows, show a validation panel, confirm, post, show per-row outcome. The old errors-on-the-side panel is worth copying.

### 1.5 Certificates, clearance and graduation

Old evidence: `frmCertificates.cs`, `frmStudenClearance.cs`, `frmGraduateStudents.cs` (Spire.Doc templates).

The old system generated Word/PDF certificates and clearance forms from learner data, and graduation moved selected learners to a target class/stream while writing `previous_class`.

New state: `StudentClearancePage` and `CertificatesManagementPage` exist, but `BirthCertificatePage` and `CharacterCertificatePage` still contain hardcoded sample learners, and certificates are not template-driven. Graduation is now a learner status plus the promotion run.

Recommendation: one certificate template model (title, body with placeholders, signatories), one print renderer, and one clearance document that reads the learner, fee balance and library items. Reuse the newsletter print/placeholder mechanism.

### 1.6 Communication and SMS

Old evidence: `frmSendSMS.cs`, `frmSendGuardiansSms.cs`, `frmSendIndividualMessage.cs`, `frmSendPartnersMessage.cs`, `frmSmsConfiguration.cs`.

The old system had per-audience SMS, template placeholders and delivery history. New state: `CommunicationTemplatesPage`, `MessageCampaignsPage`, `SMSReportsPage`, `AutoSMSSettingsPage` cover most of it; the newsletter composer now handles print + portal publication. The remaining gap is a consistent template placeholder contract across SMS, newsletters and certificates.

## 2. What the new model already covers

Do not rebuild these merely because the old system had a screen for them:

| Old concept | New home |
| --- | --- |
| Student master record, guardians, categories | canonical `learner`, `guardian`, `learner_guardian`, `attributes` |
| Class/stream, class teacher, subject teacher | canonical `class_group`, `teaching_assignment`, `timetable_entry` |
| Subjects done / subject enrolment | canonical `learning_area_enrolment` / subject enrolment |
| Exams, marks, grading, report cards | assessment, mark, grading scale, report-card rendering and publishing |
| Fee structure and billing | `fee_schedule` matrix + `BillingRunPanel` |
| Payments, receipts, allocations | payment, payment_allocation, cashier runtime, document numbers |
| Attendance register | `attendance_session` + `attendance_mark` (the report now reads these) |
| Promotion | canonical `PromotionRunPage` (both entry points now use it) |
| Alumni | canonical graduated learner + `attributes.alumni`; engagements/events in their collections |
| Portals | portal announcements, fees, attendance, reports and consent |
| Multi-curriculum | curriculum packs and programme/level model |

## 3. 844-specific fields that must not become hardcoded columns

The old student record hardcoded KCPE, index number, district, dormitory, birth certificate, student category and "class admitted/stream admitted". The new model is multi-curriculum and multi-programme, so these must be **custom fields/attributes** on the learner (or a country-pack field definition), not new canonical columns. The report builder should read them from `learner.attributes` when a school's pack declares them; the builder now reads UPI and religion that way.

## 4. Remaining mock / non-working screens

Priority is impact on a real school day, not file count.

### P0 — misleading or unusable main screens

| Screen | Current state | Action |
| --- | --- | --- |
| `reports/pages/ReportsPage.tsx` | was a mock KPI dashboard | **Replaced now** with a catalogue of real reports; links need smoke tests |
| `reports/components/DynamicReportBuilder.tsx` | empty stub | **Implemented now** for students; extend to staff/guardians/subjects |
| `administration/NewslettersPage.tsx` | mock newsletters/events | **Implemented now** as announcement-backed composer, print and portal publish |
| `administration/AlumniDirectoryPage.tsx` | mock fallback + dead add form | **Implemented now** as canonical alumni search/year/add; engagements/events forms added |
| `administration/EntryMarksPage.tsx` | mock Pre-NA grid | **Redirected now** to the canonical marks workspace; delete the dead `EntryMarksManagement` component after its tests are retired |
| `administration/AttendanceReportsPage.tsx` | read legacy empty attendance and derived class list from results | **Rewritten now** on `attendance_session`/`attendance_mark`, with class/stream filters and profile links |
| `administration/BirthCertificatePage.tsx` | hardcoded sample learners | Replace with certificate template + canonical learner picker |
| `administration/CharacterCertificatePage.tsx` | hardcoded sample learners | Same template as birth/transfer certificates |
| `administration/TransferCertificatePage.tsx` | sample/legacy data | Same template + clearance/fee status |
| `finance/DayBookPage.tsx`, `CashBookPage.tsx`, `BalanceSheetPage.tsx` | read legacy/empty app-data; marked GAP | Rebuild on the posted ledger (`journal_entry`/`journal_line`) or hide until the ledger is complete |
| `academics/BoardExamResultsPage.tsx`, `DistributeResultsPage.tsx`, `ExamGazettePage.tsx`, `VerifyMarks*` | mock rows and no-op actions | Replace with canonical assessment/mark queries and the report-card publishing flow |

### P1 — real workflows with a missing last step

| Screen | Gap | Action |
| --- | --- | --- |
| `administration/StaffAttendancePage.tsx` | reads `useAppData` attendance records; no canonical staff-attendance entity | Define a canonical staff attendance record or a module table, with the same class/stream filter pattern |
| `administration/StudentBioDataPage.tsx` | reads app-data student bio rows; profile already has the canonical data | Redirect to the canonical student profile Bio tab |
| `administration/ScholarshipTrackingPage.tsx` | legacy collection; learner picker not shared | Move to canonical learner + a scholarship entity; add search/class filters |
| `administration/BulkStudentUpdatePage`, `BulkStaffUpdatePage`, `BulkAssignRollNumbersPage` | partial/no-op handlers | Use the select → validate → confirm → per-row outcome pattern |
| `finance/FeesReceiptTemplatePage.tsx` | template preview is a stub | Render from the real receipt data and print |
| `reports/ClassListsPage.tsx` | partly sample data | Read class groups/enrolments; use the report builder columns |
| `inventory/StationeryPage.tsx`, `nutrition/KitchenManagementPage.tsx`, `todos/TODOPage.tsx` | empty/no-op actions | Connect to their module collections |

### P2 — demo/seed-backed or low-traffic

`FinanceDataContext`, `HRDataContext`, `InventoryDataContext`, `LibraryDataContext`, `NutritionDataContext` intentionally seed demo data. Keep demo mode, but every page must show a "Demo data" badge and never present seeded totals as live. Add the badge centrally in the module shell rather than per page.

## 5. Recommended sequence

1. **Reports**: finish the builder (staff/guardian/subject report types), then rebuild the ledger reports on posted entries. This is the highest-value borrowing from Akademico.
2. **Certificates and clearance**: one template renderer for birth, character, transfer and clearance; all read canonical learners and a real fee/library status.
3. **Bulk action pattern**: extract the old validate-every-row, then post pattern into a shared hook used by fee payments, promotion, roll numbers and bulk updates.
4. **Fee carry-forward**: add the old prepayment/arrears distribution as an explicit, dry-run, audited step on the fee schedule; keep billing separate.
5. **Global student finder**: a header search that opens the canonical profile, with admission number, name and class filters.
6. **Mock sweep**: replace certificate/biographical/ledger/exam mocks; badge demo modules.

## 6. What was implemented in this pass

- One promotion implementation from both entry points.
- Canonical attendance report with working class/stream filters, every page of registers/marks, and learner profile links.
- Entry Marks route consolidated into the canonical marks workspace; learner search, class/stream filter and profile links added.
- Disciplinary and gate-pass forms now use the shared learner search and fill admission/class/stream.
- Alumni directory reads canonical graduates, searches, filters by year, and adds records; engagement and event forms write to their collections.
- Newsletters are persisted announcement rows with event/alumni flags, draft/publish, personalised print and portal visibility.
- Student directory class/stream filters.
- Real reports landing page and Student Report Builder replacing the mock KPI dashboard and empty stub.

The remaining P0/P1 table is the backlog for the next pass; the first two rows of the recommended sequence are the next implementation targets.

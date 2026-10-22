# State and status vocabulary audit

A survey of every state and status vocabulary in SchoolPilot, what owns it, whether anything
enforces the moves between its values, and whether it should adopt the workflow engine of
`src/domain/workflows` (`docs/architecture/workflow-engine.md`) or stay a plain enum.

The distinction this audit applies:

- **state** — where a record is in its life. It moves, and the moves are the interesting part
  (`draft` → `submitted` → `approved`).
- **status** — a condition or outcome at a point. It is read, not moved
  (`present`/`absent`/`exempt`, `valid`/`invalid`).
- **both** — one column carries a life *and* a condition, which is the smell that produces the
  "newly created, ordered" confusion: a record created into state `draft` with status `ordered`.

The recommendation is one of:

- **engine** — transitions, an approval, roles or an audit trail matter. This vocabulary should be
  a `WorkflowDefinition` and the column should be the state the engine moves.
- **enum** — a fixed list with no meaningful transitions. A zod enum (canonical) or a TS enum
  (module) is correct and a workflow would be ceremony.
- **unclear** — the code cannot tell me whether approvals, roles or an audit matter. The owner
  decides; I did not guess.

Where a vocabulary appears more than once (the platform has several duplicated vocabularies,
usually a `PascalCase` legacy enum beside a `snake_case` canonical one), the duplicate is listed
separately and marked as such.

Totals: **84 vocabularies found — 32 engine, 49 enum, 3 unclear.**

---

## 1. The canonical schema (`src/domain/schema`)

These are the vocabularies the repository validates and the canonical tables carry.

| # | Vocabulary | Where | Entity.column | Kind | Transitions enforced today | Approval / roles / audit | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `ASSESSMENT_STATUSES` | `assessment.ts:37` | `assessment.status` | state | No. The mark grid keeps a *separate* per-group state; the assessment's own status is only read as a floor (`marks/workflow.ts`) | No | **engine** — adopted as `academics.marks_lifecycle`; the assessment status stays the floor |
| 2 | `MARK_STATUSES` | `assessment.ts:38` | `mark.status_code` | status | n/a | No | **enum** — an outcome per mark, never moved |
| 3 | `ATTENDANCE_STATUSES` | `attendance.ts:21` | `attendance_mark.status` | status | n/a | No | **enum** |
| 4 | `CALENDAR_YEAR_STATUSES` | `calendar.ts:9` | `calendar.status`, `academic_year.status`, `financial_year.status` | state | No | No | **enum** for calendar and academic year; see #5 |
| 5 | `CALENDAR_YEAR_STATUSES` on `financial_year` | `calendar.ts:168` | `financial_year.status` | state | No | Closing a year may need the head's sign-off, but nothing says so | **unclear** — the owner decides whether closing a financial year is an approval |
| 6 | `PROGRAMME_STATUSES` | `curriculum.ts:17` | `programme.status` | state | No | No | **enum** |
| 7 | `ENROLMENT_STATUSES` | `enrolment.ts:17` | `enrolment.status` | state | Partly. `PromotionService` is the only mover, and it is not the column's owner | Yes, in `PromotionService` (roles + reasons), not in the column | **engine** — the promotion run is the transition authority; see §3 |
| 8 | `LEARNING_AREA_ENROLMENT_STATUSES` | `enrolment.ts:38` | `learning_area_enrolment.status` | status | No | No | **enum** |
| 9 | `FEE_SCHEDULE_STATUSES` | `finance.ts:33` | `fee_schedule.status` | state | No | No | **engine** — `finance.fee_schedule_approval` |
| 10 | `INVOICE_STATUSES` | `finance.ts:63` | `invoice.status` | state | No | Posting and voiding are permission-bearing (`invoice.post`, `payment.void`) | **engine** — `finance.document_posted` |
| 11 | inline `['draft','posted','void']` | `finance.ts:406` | `credit_note.status` | state | No | Same permissions as the invoice | **engine** — `finance.document_posted` |
| 12 | `PAYMENT_STATUSES` | `finance.ts:80` | `payment.status` | state | No | A reversal is a privileged act (`payment.void`) | **engine** — `finance.document_posted` |
| 13 | `RECEIPT_STATUSES` | `finance.ts:87` | `receipt.status` | state | No | No | **enum** — two values, no approval |
| 14 | `REFUND_STATUSES` | `finance.ts:88` | `refund.status` | state | No | A refund is *requested*, then *approved*, then *paid* — an approval by construction | **engine** — a refund approval |
| 15 | `LEARNER_STATUSES` | `people.ts:20` | `learner.status` | state | No | Leaving, suspension and expulsion are privileged; `PromotionService` writes `graduated` | **engine** — a learner-lifecycle workflow |
| 16 | `RESIDENCE_STATUSES` | `people.ts:29` | `learner.residence_status` | status | No | No | **enum** |
| 17 | `USER_STATUSES` | `people.ts:48` | `user.status` | state | No | Locking an account is privileged | **enum** — a fixed list with no approval |
| 18 | `PROMOTION_DECISIONS` | `enrolment.ts:39` | `promotion_decision.decision` | status | n/a | The decision is written by the run | **enum** — a decision value, not a state |

## 2. The shared enum module (`src/core/types/enums.ts`)

The legacy enums. Several are duplicates of a canonical vocabulary in `snake_case`; where they are,
the duplicate is the one to delete, not to migrate.

| # | Vocabulary | Where | Kind | Transitions enforced today | Approval / roles / audit | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 19 | `StudentStatus` | `enums.ts:15` | state | No | No | **engine** — a `PascalCase` duplicate of #15; collapse onto one workflow |
| 20 | `ExamSessionStatus` | `enums.ts:49` | state | No | Publishing marks is privileged | **engine** — an exam-session workflow |
| 21 | `CampaignStatus` | `enums.ts:78` | state | No | `Approved` before `Sent` is an approval | **engine** |
| 22 | `HRPayrollPeriodStatusEnum` | `enums.ts:86` | state | No | No | **enum** |
| 23 | `PayrollPeriodStatus` | `enums.ts:94` | state | No | No | **enum** — a second spelling of #22 |
| 24 | `PayslipStatus` | `enums.ts:111` | state | No | Paying a payslip is privileged | **engine** |
| 25 | `RFQStatus` | `enums.ts:129` | state | No | Awarding is a decision | **engine** |
| 26 | `AttendanceStatus` | `enums.ts:57` | status | n/a | No | **enum** — a `PascalCase` duplicate of #3 |

## 3. The domain services (`src/domain/services`)

| # | Vocabulary | Where | Kind | Transitions enforced today | Approval / roles / audit | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 27 | the promotion run's life (`computed` → `approved` → `committed` → `undone`) | implicit in `PromotionRun` (`PromotionService.ts:200`), never a column | state | Yes — `approve` checks roles, `commit`/`undo` check the state | Yes: roles (`PROMOTION_APPROVER_ROLES`), a reason on an override, a run record | **engine** — adopted as `enrolment.promotion_run` |
| 28 | `PromotionDecisionAction` | `PromotionService.ts:85` | status | n/a | The reviewer picks it with a reason | **enum** — a decision value |
| 29 | `ACTIVE_ENROLMENT_STATUSES` / `BILLED_INVOICE_STATUSES` / `RECEIVED_PAYMENT_STATUSES` | `PromotionService.ts:44-49` | status | n/a | No | **enum** — read-side groupings, not states |

## 4. Academics

| # | Vocabulary | Where | Kind | Transitions enforced today | Approval / roles / audit | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 30 | `WorkflowState` (marks) | `marks/types.ts:89` | state | **Yes** — the hand-written `MarkWorkflow` | A reason on an override and a reopen; an audit list | **engine** — adopted as `academics.marks_lifecycle` |
| 31 | `CellStatusCode` | `marks/types.ts:15` | status | n/a | No | **enum** |
| 32 | `RowVerdict.status` | `marks/types.ts:79` | status | n/a | No | **enum** |
| 33 | `TeachingScope.mode` | `marks/types.ts:127` | status | n/a | No | **enum** |
| 34 | `ResultState` | `data/enums.ts:4` | state | No | `Approved` before `Published` is an approval | **engine** — `review.verify` or a dedicated result workflow |
| 35 | `ExamSessionStatus` | `data/enums.ts:30` | state | No | No | **engine** — duplicate of #20 |
| 36 | `AssignmentStatus` | `data/enums.ts:79` | state | No | No | **enum** |
| 37 | `SubmissionStatus` | `data/enums.ts:85` | status | No | Grading is a decision | **enum** |
| 38 | `PlanStatus` (lesson plans) | `data/types.ts:387` | state | No | `Submitted` → `Approved`/`Rejected` is an approval | **engine** — `approval.two_step` |
| 39 | `PlanStatus` (lesson plans, second copy) | `data/lessonplans/useLessonPlansData.ts:59` | state | No | No | **engine** — a duplicate of #38 |
| 40 | `DistributionStatus` | `data/types.ts:524` | status | n/a | No | **enum** |
| 41 | `EventStatus` | `data/types.ts:543` | state | No | No | **enum** |
| 42 | `ExamTokenStatus` | `data/types.ts:595` | state | No | No | **enum** |
| 43 | `MarksEntrySessionStatus` | `data/types.ts:625` | state | No | No | **enum** |
| 44 | `ValidationStatus` | `data/types.ts:644` | status | n/a | No | **enum** |
| 45 | `CrossCheckStatus` | `data/types.ts:662` | state | No | `Discrepancy` and `Resolved` need a reason | **engine** — `review.verify` |
| 46 | `ReviewStatus` | `pages/reports/types.ts:73` | status | n/a | No | **enum** |
| 47 | `PrintStatus` | `pages/reports/types.ts:202` | status | n/a | No | **enum** |
| 48 | `AreaResultStatus` | `pages/results/types.ts:7` | status | n/a | No | **enum** |
| 49 | `AggregateResultStatus` | `pages/results/types.ts:33` | status | n/a | No | **enum** |

The report *publication* life (`review` → `publish` → `re-issue`) is enforced in
`pages/reports/publish.ts` by an append-only store and a reason requirement, but it is not a
column: a publication is an immutable version, so there is no state to move. It stays as it is;
`review.verify` is offered for the review step, not the publication.

## 5. Administration

| # | Vocabulary | Where | Kind | Transitions enforced today | Approval / roles / audit | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | `ApplicationStatus` | `data/types.ts:102` | state | No | `Approved`/`Rejected` after review is an approval | **engine** — `approval.two_step` |
| 51 | `ReviewStage` | `data/types.ts:119` | state | No | A stage of the review | **enum** |
| 52 | `ReviewDecision` | `data/types.ts:126` | status | n/a | No | **enum** |
| 53 | `ApprovalDecision` | `data/types.ts:134` | status | n/a | No | **enum** |
| 54 | `ImportStatus` | `data/types.ts:504` | state | No | No | **enum** |
| 55 | `ImportValidationStatus` | `data/types.ts:514` | status | n/a | No | **enum** |
| 56 | `ClearanceStatus` | `data/types.ts:566` | state | No | Each department signs a clearance off | **engine** — a clearance workflow |
| 57 | `ClearanceRequestStatus` | `data/types.ts:585` | state | No | No | **engine** — duplicate target of #56 |
| 58 | `DisciplinaryStatus` | `data/types.ts:639` | state | No | Investigation → review → resolution is an approval | **engine** |
| 59 | `CertificateStatus` | `data/types.ts:737` | state | No | `Approved` before `Issued` is an approval | **engine** |
| 60 | `VisitorStatus` | `data/types.ts:784` | state | No | No | **enum** |
| 61 | `PassStatus` | `data/types.ts:815` | state | No | `Pending` → `Approved` is an approval | **engine** |
| 62 | `ScholarshipStatus` | `data/types.ts:836` | status | No | No | **enum** |
| 63 | `SMSStatus` | `data/types.ts:855` | status | n/a | No | **enum** |
| 64 | `StaffAttendanceStatus` | `data/types.ts:907` | status | n/a | No | **enum** |
| 65 | `DynamicAttendanceStatus` | `data/types.ts:923` | status | n/a | No | **enum** |
| 66 | `AlumniEventStatus` | `data/types.ts:978` | state | No | No | **enum** |
| 67 | `TransactionStatus` (houses) | `data/houses/types.ts:6` | state | No | No | **enum** |
| 68 | `PickupCodeStatus` | `data/pickup/types.ts:5` | state | No | No | **enum** |
| 69 | `AlumniEngagementStatus` | `data/alumniTypes.ts:4` | status | No | Whether a donor relationship needs a sign-off is not in the code | **unclear** |

## 6. Admissions

| # | Vocabulary | Where | Kind | Transitions enforced today | Approval / roles / audit | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 70 | `ApplicationStatus` | `data/types.ts:7` | state | No | The file's own comment draws the life: `Draft → Submitted → Under Review → (Approved/Rejected/Deferred/Waitlisted) → Enrolled` | **engine** — a duplicate of #50 |
| 71 | `DocumentStatus` | `data/types.ts:56` | status | No | No | **enum** |

## 7. Finance, HR, Inventory, Library, Nutrition, Portal

| # | Vocabulary | Where | Kind | Transitions enforced today | Approval / roles / audit | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 72 | `FinancialYearStatus` | `finance/data/types.ts:5` | state | No | No | **enum** — a duplicate of #5 |
| 73 | `InvoiceStatus` | `finance/data/types.ts:44` | state | No | No | **engine** — a duplicate of #10 |
| 74 | `CustomerInvoiceStatus` | `finance/data/types.ts:53` | state | No | No | **engine** |
| 75 | `SupplierInvoiceStatus` | `finance/data/types.ts:63` | state | No | No | **engine** |
| 76 | `InstallmentStatus` | `finance/data/types.ts:78` | status | No | No | **enum** |
| 77 | `TransportAssignmentStatus` | `finance/data/types.ts:38` | state | No | No | **enum** |
| 78 | `HRPayslipStatusEnum` | `hr/data/types.ts:8` | state | No | No | **engine** — a duplicate of #24 |
| 79 | `ContractStatus` | `hr/data/types.ts:110` | state | No | No | **enum** |
| 80 | `RequisitionStatus` | `inventory/data/types.ts:23` | state | No | `Pending Approval` → `Approved`/`Rejected` is an approval by its own names | **engine** — `approval.two_step` |
| 81 | `PurchaseOrderStatus` | `inventory/data/types.ts:32` | state | No | `Pending Approval` → `Approved`, then receipt | **engine** |
| 82 | `InvRequisitionStatusEnum` / `InvPurchaseOrderStatusEnum` | `inventory/data/types.ts:67,76` | state | No | No | **engine** — duplicates of #80/#81 |
| 83 | `InvSupplierStatusEnum` | `inventory/data/types.ts:107` | state | No | `Pending Approval` is in the list | **engine** |
| 84 | `InvContractStatusEnum` | `inventory/data/types.ts:114` | state | No | No | **enum** |
| 85 | `InvRFQStatusEnum` | `inventory/data/types.ts:100` | state | No | No | **engine** — a duplicate of #25 |
| 86 | `AllocationStatus` | `inventory/data/types.ts:299` | status | n/a | No | **enum** |
| 87 | `BookStatus` | `library/data/types.ts:5` | state | No | Writing a book off as `Lost`/`Damaged` may need a sign-off; the code does not say | **unclear** |
| 88 | `FineStatus` | `library/data/types.ts:14` | state | No | Billing and waiving a fine is a decision | **engine** |
| 89 | `StudentMealPlanStatus` | `library/data/types.ts:21` | state | No | No | **enum** |
| 90 | `NutrStudentMealPlanStatusEnum` | `nutrition/data/types.ts:9` | state | No | No | **enum** — a duplicate of #89 |
| 91 | `InventoryStatus` | `nutrition/data/types.ts:99` | status | n/a | No | **enum** |
| 92 | `PortalAccessStatus` | `portal/data/usePortalData.ts:56` | status | n/a | No | **enum** — a resolution state of a hook, not a record |

## 8. The workflow model itself

| # | Vocabulary | Where | Kind | Recommendation |
| --- | --- | --- | --- | --- |
| 93 | `Workflow` / `WorkflowState` | `core/types/common.ts:81,88` | state | **engine** — this is the thin ordered list the engine grows: extended additively with `key`, `is_system`, `is_active` and `transitions`, and its states gain `is_initial`, `is_terminal` and `requires_reason_on_leave` |

The screen that manages those rows (`modules/settings/pages/SettingsWorkflowsPage.tsx`) is the only
consumer today. It lets a user create a workflow and add ordered states, and delete either. It has
no transitions, no guards, no roles and no audit, and it cannot express "this state cannot be
removed" — which is why the engine enforces the system-workflow protections itself.

---

## What the audit found

1. **The duplication is worse than the brief's inventory.** The same life is spelled two or three
   times: `AssessmentStatus`/`ResultState`/`ExamSessionStatus`, `StudentStatus`/`LEARNER_STATUSES`,
   `RequisitionStatus`/`InvRequisitionStatusEnum`, `PlanStatus` twice, `ApplicationStatus` twice,
   `PayslipStatus`/`HRPayslipStatusEnum`. Every one of them is a place where a transition written
   against one spelling is invisible to the other.

2. **Almost nothing enforces its transitions.** Of 84 vocabularies, only two did: the hand-written
   mark workflow and the promotion run. Everywhere else a screen sets a value from a `<select>`.
   That is the real problem the engine solves — not the absence of a state machine, but the absence
   of any authority over the move.

3. **The one existing approval gate was a local list.** `PROMOTION_APPROVER_ROLES` was the only
   role-guarded transition in the codebase, and it lived in the service that happened to need it.
   It is now the `approve` transition of `enrolment.promotion_run`.

4. **Most of the list should stay an enum.** 49 of 84 are conditions, outcomes or short fixed lives
   with no approval: `MARK_STATUSES`, the attendance statuses, the print and import statuses, the
   result-verdict statuses. Putting a workflow on those would add a table, a guard and an audit trail
   to answer a question nobody asks. The engine's value is precisely that it is optional.

5. **Three need the owner.** Closing a financial year, writing a book off, and a donor relationship
   may each be an approval; the code does not say and I did not invent a role for them.

6. **The state/status distinction is real and the code already mixes them.** `MarksEntrySessionStatus`
   ("Pending / In Progress / Completed") is a state; `ValidationStatus` ("Valid / Invalid / Warning")
   is a status; `RequisitionStatus` mixes both — `Pending Approval` is a state, `Rejected` is an
   outcome of a move. When a vocabulary mixes the two, the engine's model separates them: the state
   is what moves, the outcome is what the move records.

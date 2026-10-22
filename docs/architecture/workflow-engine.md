# The workflow engine

`src/domain/workflows` is one reusable workflow engine for the whole platform. It exists because the
system already had a workflow implementation under **Settings → School Operations → Workflows** that
nothing else used, while module after module invented its own status vocabulary and set it from a
`<select>`. The engine makes the shared thing the easy thing.

The audit of what exists and what should adopt it is `docs/architecture/workflow-audit.md`.

## The model

A **workflow definition** is data, not code paths:

```ts
interface WorkflowDefinition {
  key: string;                     // 'academics.marks_lifecycle'
  name: string;
  description?: string;
  system: boolean;                 // seeded: cannot be deleted or disabled, only added to
  enabled?: boolean;               // false when switched off
  scope_entity?: EntityName;       // the canonical entity whose records it moves
  policy: 'sequence' | 'explicit';
  states: WorkflowStateDefinition[];
  transitions: WorkflowTransitionDefinition[];
  default_permission?: Permission;
}
```

A **state** is where a record is in its life:

```ts
interface WorkflowStateDefinition {
  key: string;                     // the value stored on the record
  name: string;
  sequence_order: number;          // the order a record reaches states in
  is_initial?: boolean;            // where a record with no stored state starts
  is_terminal?: boolean;           // a state it does not leave by the ordinary path
  requires_reason_on_leave?: boolean;  // editing in this state is an override
}
```

A **transition** is a named move. It is the unit that carries the guards:

```ts
interface WorkflowTransitionDefinition {
  key: string;                     // 'approve' — the name in the audit trail
  label: string;
  from: string[];                  // the states it leaves
  to: string;                      // the state it enters
  allowed_roles?: Role[];          // one of these roles
  allowed_permissions?: Permission[];  // and one of these permissions
  requires_reason?: boolean;
  condition?: WorkflowCondition;   // a predicate over the record
  effects?: string[];              // named effects the host applies
}
```

### Two policies

- **`sequence`** reads the states as an ordered life. A move to a later state is an **advance** and
  needs no reason; a move to an earlier one is a **reopen** and needs one. No transition has to be
  written down. This is the shape the existing `Workflow`/`WorkflowState` model already had (an
  ordered list), and it is what the marks lifecycle is.
- **`explicit`** names every move. This is what an approval needs: a named transition can carry
  roles, permissions, a reason and a condition. `enrolment.promotion_run` is explicit.

A definition is declared through `defineWorkflow(...)`, which validates it: states with unique keys
and unique sequence orders, exactly one initial state, and every transition leading between states
that exist. A typo in a state key is a refusal at declaration time, not a silent dead end at run
time.

### The guard

`resolveMove(definition, request)` is a pure function: no storage, no clock, no throwing. It answers
five questions in order, and the first "no" is the verdict:

1. Is there such a workflow, and is it enabled?
2. Is there such a state, on both ends?
3. Does a transition lead from here to there?
4. May this actor make it? (roles, then permissions, through `hasPermission` of `@/data/auth`)
5. Does the move need a reason, and is one given? Does the record satisfy the condition?

It returns `{ allowed: true, move }` or `{ allowed: false, code, message, transition? }`. A caller
that wants a refusal turned into its own error vocabulary (the mark grid's `MarkEntryError`, the
promotion service's `RepositoryPermissionError`) reads `code` and translates. The engine never
throws from `resolveMove`; `WorkflowEngine.apply` does, with a `WorkflowError` whose `code` is the
guard's.

### The audit trail

Every applied transition appends one entry:

```ts
interface WorkflowTransitionEntry {
  id: string;
  workflow_key: string;
  record_key: string;      // the host record the move was about
  from: string | null;     // null when the record had no state yet
  to: string;
  transition: string;      // the transition key, or advance/reopen for a sequence workflow
  reason: string | null;
  actor_id: string;
  at: string;
  effects?: string[];      // what the host was asked to do
}
```

A move to the state the record is already in is not an event: it writes nothing and appends nothing,
so applying a transition twice is one entry, not two.

## System workflows versus user-defined ones

| | System workflow | User-defined workflow |
| --- | --- | --- |
| Source | the seeded catalogue, `src/domain/workflows/catalogue.ts` | written by a school |
| Created | never by a user | `engine.define(definition, actor)` |
| Deleted | **refused** (`assertDefinitionRemovable`) | `engine.remove(key, actor)` |
| Disabled | **refused** (`assertDefinitionDisablable`) | `engine.setEnabled(key, false, actor)` |
| Edited | **additive only** (`assertAdditiveEdit`): a state or a transition may be added; removing, renaming or reordering a state, and removing or re-pointing a transition, are refused | edited freely |
| Renamed | the workflow's own name and description may be edited | freely |
| `system` flag | forced `true` by the engine | forced `false` — a caller cannot define its way past the protections |

Who may edit at all is `workflow.manage`, a permission added to the existing catalogue of
`src/data/auth/roles.ts` (held by the administrator and the head teacher). The protections are
enforced in the engine, not only in the settings screen, and each one has a test
(`src/domain/workflows/__tests__/engine.test.ts`).

Why additive-only: a record already in a state, or an audit trail that names a transition, must not
be left pointing at something that no longer exists. Adding is safe; taking away is not.

## How a module uses it

**Fetch.** `engine.definition(key)` or `findSystemWorkflow(key)` returns a `WorkflowDefinition`;
`engine.definitions()` lists the catalogue and the school's own.

**Define.** A module that needs a workflow no seeded one covers writes it as data and declares it
with `defineWorkflow(...)`. If it is a platform-wide workflow, it belongs in the catalogue
(`system: true`); if it is a school's own, `engine.define(...)` writes it into the definition store.

**Use.** Three calls:

```ts
const engine = new WorkflowEngine({ store, definitions: [marksLifecycle] });

// what may happen next, for this actor
const moves = engine.available(MARKS_LIFECYCLE_KEY, { recordKey, actor });

// decide without writing (for a screen that previews, or to translate the refusal)
const decision = engine.evaluate(MARKS_LIFECYCLE_KEY, { recordKey, to: 'submitted', actor });

// apply: guard, write the state, append the audit entry
engine.apply(MARKS_LIFECYCLE_KEY, { recordKey, to: 'submitted', actor, at, reason });
```

**Store.** The engine runs against a port, not a table:

```ts
interface WorkflowStore {
  read(recordKey: string): WorkflowRecordState | null;
  write(record: WorkflowRecordState, options?: { reason?: string | null }): void;
  readAudit(recordKey?: string): readonly WorkflowTransitionEntry[];
  appendAudit(entry: WorkflowTransitionEntry): void;
  clear?(): void;
}
```

Three implementations ship:

- `createMemoryWorkflowStore()` — a test, or a session.
- `createStorageWorkflowStore(recordsKey, auditKey)` — a browser deployment with no canonical
  database in reach. This is what the mark grid uses.
- `createRepositoryWorkflowStore(repository, host, definition)` — the canonical repository. The
  record's state is **a column of the host row** (the ERPNext shape) and the transition audit is the
  repository's own `audit_event` trail, so nothing parallel is invented to hold either. It is
  asynchronous, because the repository is.

`createMemoryDefinitionStore()` and `createStorageDefinitionStore(key)` hold the definitions a
school adds, layered over the seeded catalogue.

### Where a record's state is stored

Two shapes, both supported:

- **On the host document** (ERPNext): `host = { entity: 'fee_schedule', state_field: 'status' }`.
  The state a module already reads *is* the state the workflow moved; the transition audit is the
  repository's `audit_event`, written in the same transaction. Nothing to keep in step.
- **In the engine's own record** (`WorkflowRecordState`), for a host with no canonical row: the mark
  grid's per-group workflow, whose record also carries the moderation payload the engine has no
  business knowing about.

`WorkflowRecordState.payload` is the seam: the engine owns the state and the audit, the host owns
everything else about the record.

## The catalogue of common workflows

A module developer should reuse these before inventing a status enum. All are `system: true` and
seeded from code.

| Key | Policy | States | Guarded moves | Reuse it for |
| --- | --- | --- | --- | --- |
| `academics.marks_lifecycle` | sequence | open → submitted → moderated → locked → published | advance free; reopen reasoned; override reasoned from `moderated` | any mark or result a teacher, then an examiner, then the school owns |
| `enrolment.promotion_run` | explicit | computed → approved → committed → undone | `approve` (head/administrator + `enrolment.write`), `commit`, `undo` | a year-end run a head teacher approves and can undo |
| `finance.fee_schedule_approval` | explicit | draft → submitted → approved → published → archived | `submit`, `approve` (`fee_schedule.approve`), `reject` (reasoned), `publish`, `archive` | a fee schedule a payer must not see before it is approved |
| `finance.document_posted` | explicit | draft → posted → void | `post` (`invoice.post`), `void` (reasoned, `payment.void`) | an invoice, credit note or payment |
| `approval.two_step` | explicit | draft → pending approval → approved \| rejected | `submit`, `approve`, `reject` (reasoned) | a requisition, a lesson plan, a certificate request |
| `review.verify` | explicit | pending → verified \| discrepancy → resolved | `verify`, `flag` (reasoned), `resolve` (reasoned) | a cross-check, a verification pass |
| `lifecycle.draft_active_closed` | sequence | draft → active → closed → archived | advance free; reopen reasoned | a plan, a programme, a term |

A module that needs a different life adds a definition; a module that needs a different *entity* on
one of these binds it (`scope_entity`, and the permission its own approvers hold) rather than copying
it.

## How this maps onto ERPNext / Frappe, and where it diverges

| Frappe | Here |
| --- | --- |
| A Workflow is attached to a DocType and writes a `workflow_state` field on the document | `scope_entity` names the canonical entity and `RepositoryWorkflowHost.state_field` names the column — the same idea, on the canonical entity |
| `Workflow Document State`: state, doc status, allow edit, update fields | `WorkflowStateDefinition`: key, `requires_reason_on_leave` (the "allow edit" half), and the host's own payload |
| `Workflow Transition`: state, action, next state, allowed role, condition, `allow_self_approval` | `WorkflowTransitionDefinition`: key (the action), from/to, `allowed_roles`, `allowed_permissions`, `condition` |
| Workflow Actions (server scripts) on a transition | `effects`: **named** effects the host applies. The engine does not run code; it says what the host was asked to do, and the host decides. A workflow is data, not a plugin surface |
| Conditions are Python expressions | `WorkflowCondition` is a small data predicate (`field_equals`, `field_present`, `any_of`). No expression evaluator, no `eval` |
| Roles are Frappe Roles | `Role` and `Permission` are the repository's own catalogue (`@/data/auth`); a transition names one of each |
| The audit is Frappe's Version / Comment trail | The repository's `audit_event` trail for a canonical host; the engine's own entries for a host with no canonical row. Either way the engine reads one shape |
| States are free-form rows; a workflow can be deleted | System workflows are seeded and protected in the engine: not deletable, not disable-able, additive-only |

Deliberate divergences:

1. **No server-side scripting on a transition.** `effects` are names. Running arbitrary code from a
   workflow definition is a security surface the platform does not need yet, and the canonical
   repository already authorises every write.
2. **Two policies, not one.** Frappe only has explicit transitions. Most of this platform's lives are
   ordered lists where an explicit transition per pair would be noise; `sequence` expresses those
   once.
3. **`requires_reason_on_leave` is a state property, not a transition property.** In the mark grid an
   *edit* in `locked` needs a reason, while the *move* from `locked` forward does not. That is a
   property of the state, and modelling it on the transition would have got it wrong.
4. **The audit is the repository's.** A canonical host's transitions are already audited by the
   repository's `audit_event`; the engine does not write a second log beside it.

## The engine's own API

```ts
import {
  WorkflowEngine, createMemoryWorkflowStore, createMemoryDefinitionStore,
  createRepositoryWorkflowStore, defineWorkflow, resolveMove, availableMoves,
  MARKS_LIFECYCLE_KEY, PROMOTION_RUN_KEY, SYSTEM_WORKFLOWS, findSystemWorkflow,
  WorkflowError, isWorkflowError,
} from '@/domain/workflows';
```

| Member | What it does |
| --- | --- |
| `WorkflowEngine#definition(key)` | resolves a definition, or throws `unknown_workflow` |
| `#definitions()` | the catalogue and the school's own |
| `#record(recordKey)` / `#state(key, recordKey)` | the stored state, or the workflow's initial state |
| `#evaluate(key, request)` | the guard's verdict, no writing |
| `#available(key, { recordKey, actor })` | the moves this actor may make |
| `#apply(key, request)` | guard, write, audit; throws `WorkflowError` on a refusal |
| `#history(recordKey?)` | the transition entries of one record, or of all |
| `#define` / `#update` / `#remove` / `#setEnabled` | definition management, permission-gated and system-protected |
| `resolveMove` / `availableMoves` | the pure guard, for a caller that owns its own store |
| `createRepositoryWorkflowStore` | the canonical adapter (async) |

## Adoption backlog

Two modules adopt the engine now, properly, with the old code deleted rather than left beside the
new:

- **`src/modules/academics/pages/marks/workflow.ts`** — the hand-written `MarkWorkflow` is now a thin
  host over `academics.marks_lifecycle`. The states, their order, the override rule and the audit are
  the engine's; the moderation payload and the module's error vocabulary stay in the module. The
  grid, the results page's `GradeModeration` and the teaching-scope guard are unchanged, and the
  existing tests pass untouched.
- **`src/domain/services/PromotionService.ts`** — the promotion run is `enrolment.promotion_run`.
  `PROMOTION_APPROVER_ROLES` now reads the roles off the `approve` transition, the role gate is
  `resolveMove`, and `approve`/`commit`/`undo` are recorded as audited transitions.

Everything else is a follow-up task. The checklist, with the reason each one is engine or enum, is
the recommendation column of the audit; the ordered work is:

- [ ] `finance.document_posted` on `invoice`, `credit_note` and `payment` (finance module) — the
      transitions already exist as permissions (`invoice.post`, `payment.void`) with no state
      authority behind them.
- [ ] `finance.fee_schedule_approval` on `fee_schedule` — the approval is named in the state list and
      enforced nowhere.
- [ ] A refund approval on `refund` — `requested` → `approved` → `paid` is an approval by
      construction.
- [ ] `approval.two_step` on the inventory `requisition` and `purchase_order` — the owner's own
      example; `Pending Approval` is in both lists.
- [ ] `approval.two_step` on lesson plans (`PlanStatus`) — `Submitted` → `Approved`/`Rejected`.
- [ ] `review.verify` on `CrossCheckStatus` and `ResultState` — a verification pass with a reasoned
      discrepancy.
- [ ] A learner-lifecycle workflow on `learner.status` — collapse `StudentStatus` and
      `LEARNER_STATUSES` onto one definition; exit, suspension and expulsion become guarded moves.
- [ ] An exam-session workflow on `ExamSessionStatus` — collapse the two spellings; publishing marks
      becomes a guarded move.
- [ ] A clearance workflow on `ClearanceRequestStatus`/`ClearanceStatus` — per-department sign-off.
- [ ] Delete the duplicates once the survivor exists: `InvRequisitionStatusEnum`,
      `InvPurchaseOrderStatusEnum`, `InvRFQStatusEnum`, the second `PlanStatus`, the admissions
      `ApplicationStatus`, `HRPayslipStatusEnum`, the finance `InvoiceStatus`, the academics
      `ExamSessionStatus`.
- [ ] Leave as an enum, deliberately: the mark, attendance, import, print, validation and result
      verdict statuses; the portal, SMS and scholarship statuses; the residence and gender
      vocabularies. These are conditions and outcomes; a workflow on them is ceremony.

The three `unclear` items in the audit — closing a financial year, writing a book off, and a donor
relationship — wait for the owner's call before any of them becomes a definition.

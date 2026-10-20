# Domain services

The four services the UI calls to run the daily life of a school: the admission of a learner,
the enrolment of a learner in a class group, the guardians of a learner, and the register of a
class.

Every read and every write of these services goes through the repository of P1-B02
(`@/data/repository`). A service never opens the database, never imports the legacy
`collections` and never touches the `AppDataContext`; a test in `__tests__/` guards that.

```ts
import { AdmissionService, AttendanceService, EnrolmentService, GuardianService } from '@/domain/services';

const admissions = new AdmissionService({ repository });
const enrolment = await admissions.admit({
  learner: { givenName: 'Amani', familyName: 'Wekesa', ... },
  guardians: [{ givenName: 'Grace', familyName: 'Wekesa', relationship: 'mother', ... }],
  enrolment: { classGroupId, startDate: '2027-01-05' },
});
```

## The dependencies

A service is built with the repository it works through, and nothing else:

| Option | What it is |
| --- | --- |
| `repository` | The repository of P1-B02. Every read and write goes through it. |
| `actor` | The user the writes are recorded for; the repository's own actor when omitted. |
| `now` | The clock of the service; the system clock when omitted. |

There is no module-level singleton and no hidden state: two services over two repositories are
two services.

**The permissions are the repository's business.** The repository of P1-B02 offers an
`authorize` hook, and the `ScopedRepository` of P1-B03 fills it with the role and scope model of
spec 02 §11. A service therefore does not check permissions itself: it hands every read and
write to the repository, and the repository refuses the ones the actor may not do. A service
built over a `ScopedRepository` is already scoped.

**The ids stay opaque.** Every id in the API is an `Id<T>` (`@/domain/ids`): a branded string,
never a number. The services never parse an id and never coerce one.

## The services

### EnrolmentService

| Method | What it does |
| --- | --- |
| `enrol(input)` | Enrols a learner into a class group of an academic year. |
| `prepareEnrolment(placement)` | Resolves the placement of an enrolment against its class group, without a learner. |
| `enrolmentRow(prepared, learnerId)` | The row of the enrolment of a learner. |
| `enrolPrepared(row)` | Stores a prepared enrolment. |
| `end(enrolmentId, input)` | Ends an enrolment with an exit reason, and moves the learner with it. |
| `transfer(enrolmentId, input)` | Moves a learner to another class group and writes the history row. |
| `currentClass(learnerId, at?)` | The class the learner is in on a day: the enrolment that runs on it. |
| `listEnrolments(learnerId, options?)` | The enrolments of a learner. |

The class group is the anchor of an enrolment: it is year-scoped (spec 02 §5) and carries the
academic year, the level and the programme, so the service reads those three from it. A caller
that names a different year, level or programme is refused.

### AdmissionService

| Method | What it does |
| --- | --- |
| `admit(input)` | Admits a learner: the learner, the guardians, the links, the identifiers and the first enrolment, in one call. |

This is the golden path GP-6 of spec 04 §2.2, step 6. The admission number is assigned by the
service when the caller does not name one: it follows the sequence of spec 04 §3
(`ADM/2027/001`), and a number is never reused.

**The guardians are de-duplicated by phone** (spec 02 §13): a guardian whose phone the school
already knows is linked to the learner instead of being created a second time, so two siblings
never end up with two copies of the same parent.

### GuardianService

| Method | What it does |
| --- | --- |
| `addGuardian(input)` | Adds a guardian. |
| `updateGuardian(guardianId, patch)` | Corrects a guardian. |
| `removeGuardian(guardianId)` | Removes a guardian, and the links to the learners first. |
| `linkGuardian(input)` | Links a guardian to a learner. |
| `unlinkGuardian(learnerId, guardianId)` | Removes that link. |
| `listContacts(learnerId)` | The guardians of a learner, with the contact details the UI shows. |
| `findByPhone(phone, options?)` | The guardians whose phone is the one given. |
| `addIdentifier(input)` | Records an identifier of a learner, a guardian or a member of staff. |
| `findIdentifierHolders(scheme, value)` | The identifiers that hold a scheme and a value. |
| `listIdentifiers(ownerType, ownerId)` | The identifiers of one owner. |
| `removeIdentifier(identifierId)` | Removes an identifier. |

The identifiers carry the schemes of the country packs; the `ke.kemis_upi` scheme of the
national registry of Kenya is the one the service knows by name (`KEMIS_UPI_SCHEME`). An
identifier names one owner: a UPI names one learner, a birth certificate number or a national
id names one person, so the service refuses an identifier that is already recorded.

### AttendanceService

| Method | What it does |
| --- | --- |
| `openRegister(input)` | Opens the register of a scope and a day, or returns the one that is open. |
| `recordMark(input)` | Marks one learner of a register. |
| `recordLeaveOut(input)` | Records a leave-out (exeat). |
| `recordConductIncident(input)` | Records a conduct incident. |
| `recordHealthVisit(input)` | Records a visit to the clinic. |
| `listMarks(sessionId)` | The marks of a register. |
| `lockRegister(sessionId)` | Locks a register, so it takes no further marks. |

A register covers one scope: a class group (the daily morning and afternoon registers), a
teaching group (the register of a lesson) or a residence (the evening roll-call).

## The invariants

The services do not re-implement the invariants of the repository: they let the repository
refuse the write, and they pass the typed error on unchanged. What is left is the part only a
service can judge.

| Invariant | Enforced by |
| --- | --- |
| §12.1 one active enrolment per learner and year on any date | the repository (`enrolment.single_active_per_calendar`) |
| §12.2 the class group of an enrolment carries the same level and year | the repository (`enrolment.class_group_alignment`); the service derives the level and the year from the class group, so a mismatch cannot be written |
| §12.10 every foreign key resolves, inside the institution | the repository, on every write |
| a register holds one mark per learner | the service (`duplicate`), the unique constraint of the schema behind it |
| a mark of a learner who was not there carries a reason | the service (`invalid_request`), the schema behind it |
| a `period_n` register names its lesson | the service (`invalid_request`), the schema behind it |
| the day of a register lies inside its academic period | the service (`out_of_period`) and the repository (`attendance.date_in_period`), which agree: a register that names no period is accepted by both, and a period the service derives always covers the day |
| a learner has exactly one primary contact | the service, on `linkGuardian` and on the admission |
| a guardian of the school is never copied | the service, on the admission (de-duplication by phone) |
| an identifier names one owner | the service, on `addIdentifier` and on the admission |
| the rows of an admission land together | the transaction of the repository, on `admit` |

### The atomicity of an admission

An admission writes five kinds of row: the learner, the guardians, the links, the identifiers
and the enrolment. They land in **one transaction of the repository** (P1-B02), so they land
together or not at all:

- a step that fails leaves no row behind, not even an archived one;
- the audit rows of the writes that joined the transaction roll back with it, so a failed
  admission leaves no trail;
- the change events of the writes that joined are delivered when the transaction commits,
  never inside it, so a watcher never sees a change that a later failure rolls back.

The error of a failed admission keeps its own type: an error of the repository stays an error
of the repository (a validation, a conflict, an invariant), an error of a service stays an
error of that service, and anything else becomes a service error.

The repository cannot read while a transaction is open, so a service resolves what it needs
before it opens the transaction and writes afterwards. The enrolment service therefore
publishes `prepareEnrolment` and `enrolmentRow`: a caller that writes inside a transaction of
its own resolves the placement of the enrolment first, and names the learner once the learner
row exists. The same pattern holds in the guardian service: the links of a learner, the links
of a guardian and the guardian itself are read first and written together afterwards.

## The errors

| Class | `code` | When |
| --- | --- | --- |
| `ServiceError` | `missing_reference` | a row the service had to resolve does not exist |
| | `invalid_request` | the input breaks a rule the service owns |
| | `duplicate` | the write would duplicate a row that exists |
| | `out_of_period` | the day of a register lies outside its academic period |
| | `failed` | the work failed for a reason the service does not know |

The errors of the repository are never wrapped: a validation, a conflict, a reference, a
permission or an invariant error reaches the caller as it was raised. A transaction that
rolls back wraps an error that is not one of the repository's, so the service unwraps it
again and hands the caller the error it had before.

## Known limits

- **The repository cannot read inside a transaction.** The adapter refuses a statement while
  a transaction is open, and the repository reads through the adapter. A service therefore
  resolves what it needs before it opens the transaction and writes afterwards: the class
  group of an enrolment, the guardian a phone belongs to, the identifiers that are already
  recorded. A write that needs a row another write of the same transaction created cannot
  read it; the enrolment of an admission is therefore built from the placement and the
  learner id, not read back.
- **The de-duplication of the guardians is a check, not a lock.** Two admissions that run at
  the same time can both find no guardian for a phone and both create one. The named
  sequence of spec 02 §12.9 (P3-A03) is the place where the school-wide uniqueness of a
  person belongs.
- **The admission number is derived from the learners the repository holds**, up to 500 of
  them per institution, archived rows included. A school with more learners needs the named
  sequence of spec 02 §12.9; until then a number that is already taken is refused by the
  unique constraint of the learner.

## The module

| File | Holds |
| --- | --- |
| `admissionService.ts` | The admission of a learner. |
| `attendanceService.ts` | The registers, the marks and the pastoral records. |
| `enrolmentService.ts` | The enrolments, their end and their moves. |
| `guardianService.ts` | The guardians, their links and the identifiers. |
| `common.ts` | The shapes the services share, the phone normalisation, the transaction helper and the rule of an identifier. |
| `errors.ts` | The errors the services raise themselves. |
| `index.ts` | The module index: a caller imports from here. |

## The tests

`__tests__/` runs against a real SQLite database with the canonical registry seeded, the same
way the repository tests do: there is no storage double and no mock of the repository anywhere
in the suite.

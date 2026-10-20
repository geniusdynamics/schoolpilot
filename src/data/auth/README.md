# Permissions

The role × permission × scope model of spec 02 §11 and spec 06 §5.2, and the authorizer that
judges a repository action against it.

The repository of `../repository` offers an `authorize` hook and raises a
`RepositoryPermissionError` when the hook denies an action. Without a hook every action is
allowed. This module fills that seam: it owns the **permissions**, not the storage.

## What is here

| File | Holds |
| --- | --- |
| `roles.ts` | the role catalogue, the permission catalogue, the permissions each role holds, and the scope kind each role is limited to |
| `scope.ts` | the scope types, the resolution from the real assignment data, and the row and list checks |
| `authorizer.ts` | the `PermissionContext`, the `ScopePermissionError` and the authorizer of the repository hook |
| `scopedRepository.ts` | the repository a scoped actor reads and writes through |

## The roles

The role catalogue of spec 06 §5.2 lists twenty-one seed roles. The domain needs eight of them,
and every other catalogue entry maps onto one of these:

| Role | Catalogue name (spec 06 §5.2) | Scope kind |
| --- | --- | --- |
| `administrator` | Super administrator | institution + finance |
| `head_teacher` | Head teacher/Principal | institution + finance |
| `registrar` | Registrar/Secretary | institution |
| `class_teacher` | Class teacher | class group |
| `teacher` | Subject teacher | teaching group |
| `accountant` | Bursar, Accounts clerk/Cashier | finance |
| `nurse` | Nurse | institution |
| `auditor` | Auditor (read-only) | institution + finance |

The catalogue entries that are not their own role map as follows: *Deputy (academics)* and *Head
of Department* behave like a `head_teacher` with a teaching assignment, *Deputy (administration)*
like a `registrar`, *Director of Studies/Exams officer* like a `head_teacher`, *Boarding
master/Matron* like a `class_teacher`, *Librarian*, *Storekeeper*, *Guidance & counselling*,
*Security/Gate* like a `nurse` (institution, contact rows only), *Guardian* and *Learner* are not
staff and get their own portal scope when the platform entities arrive, and *Board/Proprietor* is
an `auditor` over the dashboards.

## The permissions

The permissions are fine-grained, in the spirit of spec 06 §5.2 (`learner.read`,
`learner.medical.read`, `mark.write`, `invoice.post`, `payment.void`, `fee_schedule.approve`).
`ENTITY_PERMISSIONS` maps **every** canonical entity of the registry to the permission that reads
it and the permission that writes it; the map is exhaustive over the closed `EntityName` union, so
a new entity is a compile error until it is mapped. `ROLE_PERMISSIONS` maps every role to the
permissions it holds.

Two permissions are not entity permissions:

- `learner.medical.read` is a **field policy**. The medical record of a learner is special and
  restricted data (spec 06 §8.1), so the repository strips the `medical` field from the learner row
  of every role that does not hold the permission - on a read and on a list alike.
- `invoice.post`, `payment.void` and `fee_schedule.approve` name transitions no repository action
  carries; the finance services judge them.

## The scope

A role says **what** may be done, the scope says **which rows**. The scope kinds are the ones of
spec 06 §5.2, narrowed to what the canonical model carries:

| Scope kind | The rows it covers | How it is resolved |
| --- | --- | --- |
| `institution` | every row of the institution that is not a finance document | the institution of the actor's user row |
| `class_group` | the class group, its enrolments, its learners, their guardians and households, and the assessment rows of the class | the `class_group` rows that name the actor's staff id as homeroom teacher |
| `teaching_group` | the teaching group, its members and assignments, the group's enrolments and learners, the assessments of its learning area and the marks, results and reports of its members | the effective `teaching_assignment` rows of the actor's staff id, and the `teaching_group_member` rows that are effective at the date |
| `finance` | the finance documents of the institution | the institution of the actor's user row |

The scope is **effective-dated**: an assignment or a membership that does not cover the date
(`valid_from` / `valid_to`) grants nothing. Nothing is hard-coded - the resolution reads the real
rows, so an assignment that moves changes the permission with it.

The ledger has its own scope kind: the `institution` grant does not reach the finance documents,
so a registrar cannot read the ledger even though the institution grant covers the rest.

## The permission context and the authorizer

```ts
const { repository, context } = await createAuthorizedRepository({
  adapter,
  actorId: currentUserId,
  roles: ['teacher'],
  at: '2027-03-01',   // the date the scope is effective at; defaults to today
});

await repository.create('mark', { ... });   // refused when the learner is outside the groups
```

`PermissionContext` is the actor id, the roles and the resolved scope. It flows into the
repository through the `authorize` hook of B02:

```ts
const repository = createRepository({ adapter, actor, authorize: createAuthorizer(context) });
```

The authorizer answers two questions, in order:

1. **Permission** - does one of the actor's roles hold the permission the action needs?
2. **Scope** - is the row inside the actor's scope?

A denial raises a `ScopePermissionError`, which is a `RepositoryPermissionError` with a `reason`:
`permission`, `scope` or `no_context`. The repository passes it through unchanged, so the caller
sees the action, the entity and the reason. An actor without a context is denied, never allowed by
default.

## The scoped repository

`ScopedRepository` extends the repository of B02 and adds the read side of the scope:

| Method | What the scope does |
| --- | --- |
| `get` | the row is loaded and judged; a row outside the scope raises a permission error |
| `list` | the query is narrowed to the scope in SQL, so the page and its total stay honest |
| `update` | the stored row is judged before the patch is applied, and the merged row by the authorizer |
| `watch` | the payload holds the rows of the scope only |
| `remove` | the row is judged, and the permission is checked - B02's `remove` has no hook of its own |
| `auditTrail` | the row is judged |
| `auditLog` | the events are judged by the row they describe; the trail of the whole database stays with the actors whose scope covers the institution |

## The persistence seam

Spec 02 §11 names `role`, `permission` and `role_assignment` (user × role × scope). **Those
entities are not in the canonical registry of A03**, so this task does not persist them:

- The **roles** are an input of `resolvePermissionContext`. The caller passes the roles the actor
  holds; the platform entities will supply them once they are modelled.
- The **scope** is not stored at all - it is derived from the data that already exists
  (`teaching_assignment`, `teaching_group_member`, `class_group.homeroom_teacher_ids`), which is
  what makes it effective-dated and self-maintaining.
- The **audit trail** is not duplicated here. B02 owns the write audit trail, and this task owns
  the permissions.

The registry change that brings `role`, `permission` and `role_assignment` into the canonical
model is the seam of P1-B04 (its own §11 work) or a later registry change. When it lands, the
roles move from an input of the context to a read of the `role_assignment` rows, and the scope
kinds of spec 06 §5.2 that the canonical model does not carry yet (campus, programme, level,
learning area) become scope grants of their own.

## Known limits

- **The scoped repository is the read path.** The `authorize` hook of B02 is synchronous and sees
  the row of a write, but only the id of a `get` and nothing at all of a `list`. A plain
  `Repository` with the authorizer installed therefore judges the permission and the write scope;
  the row scope of a read is judged by `ScopedRepository`, which loads the row first. The
  repository change that would close the gap - a scope predicate in the list query, or the loaded
  row in the authorisation request - belongs to the registry work, not to this task.
- **A list and a `get` of the same row always agree.** The filter of a list is a superset of the
  rows the scope admits, and the rules that need a second column - the learning area of a mark,
  the learning areas of an assessment - are judged row by row on top of it. The test
  "lists exactly the rows a get allows, for every entity" holds that line for the whole registry.
- **The rows of a narrowed list are counted honestly.** The total of a list is the number of the
  rows that passed the scope, and the cursor points at the next of those rows. The narrowing
  costs a scan of the candidates of the filter, which the repository caps at 500 rows a page.
- **The institution-tenancy fallback reaches the identity rows.** A role that holds the
  institution scope and may read the `user` entity - the registrar does - sees every `user` row of
  the institution, the password hash included. The `user` rows belong to the platform and identity
  work of P1-B04; until the identity entities are modelled, that fallback is a known reach.
- **The scope is a snapshot.** It is resolved once, at `at`; a session that has to see a change
  re-resolves its context. The resolution reads at most 500 rows per entity.
- **A row of an entity no grant of the actor owns stays reachable inside the actor's own
  institution.** That is the tenancy default for reference data (learning areas, levels,
  calendars). The permission layer is the second guard: a role that may not read an entity is
  refused before the scope is consulted.
- **A JSON id list cannot be filtered by SQL.** The learning areas of an `assessment` live in a
  JSON column, so those rows are judged one by one and the page total counts the rows that
  passed.
- **The write path is the repository's own.** A write is judged inside the transaction, before the
  row is stored, so a refused write leaves no trace.

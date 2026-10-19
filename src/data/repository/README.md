# Repository

One typed repository over the canonical entity registry. Every method works on an
`EntityName`, so one implementation serves all 63 entities: validation runs the entity's
own zod schema, the storage mapping follows the entity's canonical column types, and the
invariants of spec 02 §12 are enforced in the write path.

```ts
const adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
await adapter.open();

const repository = createRepository({ adapter, actor: currentUserId });
await repository.setup();

const learner = await repository.create('learner', { institution_id, given_name, ... });
const page = await repository.list('learner', { where: { status: 'enrolled' }, limit: 20 });
const updated = await repository.update('learner', learner.id, { family_name: 'Otieno' }, {
  expectedVersion: learner.rowVersion,
});
```

## Public surface

| Method | Signature |
| --- | --- |
| `setup` | `setup(): Promise<void>` - foreign keys on, canonical DDL, concurrency columns, audit table |
| `get` | `get<E>(entity: E, id: Id<E>, options?: { includeDeleted?: boolean }): Promise<RepositoryRow<E> \| null>` |
| `list` | `list<E>(entity: E, query?: ListQuery): Promise<Page<RepositoryRow<E>>>` |
| `create` | `create<E>(entity: E, input: CreateInput<E>, options?: WriteOptions): Promise<RepositoryRow<E>>` |
| `update` | `update<E>(entity: E, id: Id<E>, patch: UpdateInput<E>, options: UpdateOptions): Promise<RepositoryRow<E>>` |
| `remove` | `remove<E>(entity: E, id: Id<E>, options?: RemoveOptions): Promise<RepositoryRow<E>>` |
| `watch` | `watch<E>(entity: E, query: ListQuery \| undefined, listener: WatchListener<RepositoryRow<E>>): Unsubscribe` |
| `subscribe` | `subscribe(listener: (event: ChangeEvent) => void): Unsubscribe` |
| `auditTrail` | `auditTrail(entity: EntityName, entityId: string): Promise<readonly AuditEvent[]>` |
| `auditLog` | `auditLog(query?: AuditQuery): Promise<readonly AuditEvent[]>` |
| `whenIdle` | `whenIdle(): Promise<void>` - resolves when no watch delivery is pending |
| `currentCommitSequence` | the last allocated commit sequence - an opaque token, not a commit count |

`RepositoryRow<E>` is the entity's row plus `id: Id<E>` and `rowVersion: number`.
`Page<T>` is `{ items, total, hasMore, nextCursor? }`, the shape the query cache expects
(DR-04).

## Schemas

The repository never keeps a second validator. It runs the entity's own zod object:

- `entitySchema(entity)` - the exact schema of the entity, the object the form binds to.
- `createSchemaFor(entity)` - the same schema without the server-owned fields
  (`id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`). A create
  form collects this.
- `updateSchemaFor(entity)` - the writable fields, all optional. An edit form collects
  this.
- `toWritableValues(row)` - the writable fields of a stored row. A row that comes back
  from the repository carries the server-owned fields and the concurrency counter, so it
  no longer matches the entity schema: the strict schema rejects `rowVersion` as an
  unknown key. A form seeds its fields from this, and the values then satisfy
  `updateSchemaFor` and can be sent straight back to `update`.

zod v4 drops the entity's cross-field refinements when the shape is derived, so the two
derived schemas check shape only. The repository re-validates the assembled row with
`entitySchema`, so a refinement still rejects the write - it just surfaces from the
repository rather than from the form.

A payload that carries a server-owned field is rejected with a validation error naming
the field. An edit form therefore has to send the patch of the writable fields, not the
whole record.

### Clearing a field

`update` merges the patch into the stored row and validates the result, so a field can
only be cleared when the schema allows it:

- A field declared `.nullish()` - `end_date`, `exit_reason` - is cleared by sending
  `null`.
- A field that is optional but not nullable - `house_id`, `pathway_id` - cannot be
  cleared at all. `null` fails the schema, and `undefined` is not a change, so the stored
  value stays. A field that has to be clearable needs `.nullish()` in the entity schema,
  which belongs to the registry task.

## Row mapping

The storage layer keeps JSON columns as TEXT and booleans as 0/1, exactly as the
canonical DDL declares them. The codec is derived from the entity's canonical storage
schema, so it cannot drift from the DDL:

| Schema type | Column | Round trip |
| --- | --- | --- |
| `string` (dates, enums, ids) | TEXT | as is |
| `integer`, `number` | INTEGER, REAL | number |
| `boolean` | INTEGER | `0`/`1` |
| `array`, `object` (money, phones, addresses, snapshots) | TEXT | JSON text |

A field that is absent stays absent; a nullable field that is `null` comes back as
`null`. A JSON field that holds `null` is stored as the JSON text `null`, so the value
survives the round trip.

## Soft delete

Every registered entity carries a `deleted_at` column, so a removal is always a soft
delete: the row stays, marked as deleted, and drops out of the default reads. `get` and
`list` hide it unless `includeDeleted` is set, and a write to an archived row is reported
as not found. The hard delete exists for an entity that declares no such column; no
registered entity does today.

## Referential integrity

`setup()` turns `PRAGMA foreign_keys` on and fails loudly when the connection refuses it,
so the database rejects a dangling reference itself. On top of that the repository checks
every reference of `storage.refs` before the write and raises a typed error naming the
relation:

```ts
await repository.create('learner', input);
// RepositoryReferenceError { relation: 'household', column: 'household_id' }
```

The tenancy rule of spec 02 §1.1 has no SQL equivalent and is checked here: a row may
only point at rows of its own institution, otherwise the write fails with the invariant
`tenancy.institution_scope`.

Only the scalar reference columns of `storage.refs` are checked. A JSON list of ids -
`level_ids`, `class_group_ids`, `fee_item_ids`, `homeroom_teacher_ids` and the like -
is stored as one JSON column, so the database has no foreign key for it and the
repository does not resolve its entries. A row may therefore carry an id in such a list
that no longer exists; the owning service keeps those lists in step.

## Audit trail

The repository keeps its own `audit_event` table. It is deliberately not the platform
`audit_event` entity of spec 02 §11 - that entity is not modelled yet, and the registry
belongs to A03. The table follows spec 02 §1.5: actor, entity, id, before, after, reason,
plus the changed field names, the timestamp and the commit sequence.

Every create, update and remove writes one row inside the write's own transaction, so a
rejected write leaves no trace. `changedFields` lists the fields the write touched,
without the bookkeeping columns (`updated_at`, `updated_by`) that every write moves.

```ts
const trail = await repository.auditTrail('learner', learner.id);
```

## Optimistic concurrency

`update` needs the version the caller read:

```ts
const row = await repository.get('learner', id);
const updated = await repository.update('learner', id, patch, { expectedVersion: row.rowVersion });
```

A stale write is rejected with a `RepositoryConflictError` whose `reason` is
`stale_version`, carrying `expectedVersion` and `actualVersion`. The check is atomic:
the update runs `WHERE id = ? AND <version column> = ?`, so of two writers that read the
same version exactly one wins.

`expectedVersion` is required by the type, but a caller that leaves it out at runtime
does not get a validation error: the stored version never equals `undefined`, so the
write is refused as a `stale_version` conflict. A missing version is a conflict, never a
silent overwrite.

### Which column carries the counter

The canonical DDL is CREATE-only, so a table that already existed never receives a new
column. `setup()` therefore adds the counter with an idempotent
`ALTER TABLE ... ADD COLUMN ... INTEGER NOT NULL DEFAULT 1`, after reading
`PRAGMA table_info` for the table.

| Entities | Column | Why |
| --- | --- | --- |
| the 57 entities without a business `version` field | `version` | the column is free |
| `curriculum_pack`, `assessment_scheme`, `grading_scale`, `mark`, `report_card`, `fee_schedule` | `row_version` | their `version` field is business data - a scheme version, a re-issue number, a mark revision - and must not double as the write counter |

The row exposes the counter as `rowVersion`, whatever the column is called, so the API
is the same for every entity. A business `version` field keeps its own value.

## Watch contract

`watch` is the live query of DR-04. The contract B02 hands to B05:

1. A watcher receives the current page when it subscribes.
2. A committed write emits a `ChangeEvent { entity, type, ids, origin, commitSequence }`
   on the change bus **before the write promise resolves**. The event is not emitted
   synchronously inside the caller's block: the transaction is awaited first, so the
   event can only be emitted once the write is committed.
3. A watch payload is delivered **after** the write promise resolved. The repository
   queues the delivery on a macrotask, so a caller never sees a change before its own
   write resolves and the cache may assume read-your-writes.
4. Every payload carries the commit sequence it reflects. The sequence is read from the
   repository's monotonic counter *before* the page is read, so a payload never claims a
   freshness it does not have. A payload tagged with a sequence below the cache's
   committed sequence is stale and must be rejected by the cache.
5. The commit sequence is an **opaque monotonic token**, not a commit count. It is
   allocated before the write, so a write that is refused still consumes a number and
   the numbers are not a 1:1 count of the commits. It is the same counter as
   `currentCommitSequence` and the `commitSequence` of the change event, so B05 can use
   the repository's sequence as the commit sequence of a mutation layer - but B05 has to
   compare the tokens, never count them.
6. A watcher may receive more than one payload for a single commit when it subscribed
   while a delivery was already on its way. The payloads always reflect the committed
   state and their sequences never decrease. The deliveries are serialised, so two
   payloads never cross.

`whenIdle()` resolves when no delivery is pending; B05's `whenSettled` can use it.

## Invariants (spec 02 §12)

Every part of §12 that the 63 registered entities can carry is enforced in the write
path, inside the write's transaction, before the row is stored. A violation raises a
`RepositoryInvariantError` with the invariant's name and the field paths it concerns.
The parts that need entities the registry does not hold are listed under "Deferred"
below, with the task that owns them.

| §12 | Invariant | Enforced on |
| --- | --- | --- |
| 1 | one active enrolment per learner and academic year on any date | `enrolment` create and update |
| 2 | the class group of an enrolment carries the same level and academic year | `enrolment` create and update, `class_group` update |
| 3 | periods of a year do not overlap at the same kind and lie inside the year | `academic_period` create and update |
| 4 | one current academic year per calendar, one current term per year | `academic_year`, `academic_period` |
| 5 | a mark's enrolment is a member of a teaching group for that learning area on the assessment date | `mark` create and update |
| 6 | the snapshot of a published report card never changes | `report_card` update |
| 7 | invoices, payments, credit notes and refunds are immutable after posting | `invoice`, `payment`, `credit_note`, `refund` update |
| 8 | the allocations of a payment never exceed the amount paid | `payment_allocation` create and update |
| 10 | every foreign key resolves | every write, plus the database's own foreign keys |

A posted document is never un-posted. The frozen fields of a posted invoice, payment,
credit note or refund cannot change, and the status may only move to another posted
state - partly paid, paid, void, reversed, rejected. Moving a posted document back to a
draft state is refused, because it would make every other field editable again on the
next write.

The frozen states run from the posting onwards. The state before it stays editable: a
`draft` invoice or credit note, a `pending` payment and a `requested` refund may still
be changed and may still be posted. A refund is frozen from its `approved` state on, so
the approval settles the amount; the annotations a transition sets - `paid_at`,
`approved_by` - stay writable, or the state could never be reached.

### Deferred, with the owning task

These parts of §12 cannot be enforced by this task, because the entities they need are
not modelled yet. They are listed here so nothing is silently skipped.

| §12 part | Why it is out of scope | Owning task |
| --- | --- | --- |
| 7 - journal entries are immutable after posting | the `journal_entry` and `journal_line` entities of spec 02 §10 are not in the registry | **P3-A02** (the posting engine, reversal only) with spec 05 |
| 9 - sequence numbers are unique per scope and never reused | the unique half is enforced wherever a table carries a unique key - the admission number of a learner, the number of an invoice, a credit note, a receipt and a refund are unique per institution. The per-scope and never-reused half needs the `sequence` entity of spec 02 §10, which is not in the registry | **P3-A03** (named sequences) with spec 05 |
| 5 - the "flagged as an exception" branch | the `mark` schema has no exception field; a schema change is needed and the entity registry is closed | the spec 03 assessment engine, through a future registry change (P1-A03 is closed and cannot own it) |

### Disclosure: the permission seam

The permission seam is a disclosure, not a §12 item: the repository offers an
`authorize` hook, but the role and permission model of spec 02 §11 and the platform
`audit_event` entity are not modelled. **P1-B03** owns the platform services that fill
the seam. See "Permissions".

## Known limits

- **An optional-but-not-nullable field cannot be cleared.** `update` merges the patch
  into the stored row, so `null` fails the schema and `undefined` is not a change. Only
  a `.nullish()` field can be cleared, and it takes `null`. See "Clearing a field".
- **The derived create and update schemas check the shape only.** zod v4 drops the
  entity's cross-field refinements when the shape is derived, so a refinement surfaces
  from the repository rather than from the form. See "Schemas".
- **A JSON id list carries no foreign key.** Only the scalar `storage.refs` columns are
  resolved, so a row may hold an id in a list that no longer exists. See "Referential
  integrity".
- **The commit sequence is per repository instance.** Two repositories over the same
  database keep separate counters, so a token from one is not comparable with a token
  from the other. The application runs one repository per database; a transport that
  writes from more than one has to carry its own ordering.

## Permissions

The repository offers an `authorize` hook and raises a `RepositoryPermissionError` when
it denies an action. The role and permission model itself is spec 02 §11 and is not
modelled yet, so the hook is the seam **P1-B03** fills in; without a hook every action
is allowed.

## Errors

| Class | `code` | Carries |
| --- | --- | --- |
| `RepositoryNotFoundError` | `not_found` | `entity`, `id` |
| `RepositoryValidationError` | `validation` | `issues`: `{ path, message, code }` with schema-aligned paths such as `total.amount_minor` and `phones.0.number` |
| `RepositoryConflictError` | `conflict` | `reason`: `unique` or `stale_version`, `columns`, `expectedVersion`, `actualVersion` |
| `RepositoryReferenceError` | `reference` | `relation`, `column`, `referencedId` |
| `RepositoryPermissionError` | `permission` | `action` |
| `RepositoryInvariantError` | `invariant` | `invariant`, `issues` |
| `RepositoryStorageError` | `storage` | `constraint` |

All of them extend `RepositoryError` and carry `entity` and `id` when they are known.
`isRepositoryError(error, code)` recognises them.

## Tests

`src/data/repository/__tests__/` runs against a real `better-sqlite3` database: the
canonical schema is applied and every entity is seeded from the canonical fixtures, in
the order their references allow. There is no storage double anywhere in the suite.

The seeding rewrites the scalar references of the fixtures onto the rows the database
actually holds, and leaves the JSON id lists as the fixtures declare them. A few of
those lists therefore name rows that were not seeded - the fixtures of a single entity
stand on their own - which is harmless, because a JSON id list is not a foreign key. A
test that checks a list points at a live row has to seed that row itself.

## Module layout

| File | Holds |
| --- | --- |
| `repository.ts` | the repository: get, list, create, update, remove, watch, the change bus |
| `types.ts` | the public types: `Page`, `ListQuery`, `RepositoryRow`, `ChangeEvent`, `AuditEvent` |
| `errors.ts` | the typed errors |
| `schemas.ts` | the entity schema, the derived create and update shapes, the issue mapping |
| `columns.ts` | the column metadata and the row codec |
| `query.ts` | the list query: filters, sort order, pagination, the cursor |
| `concurrency.ts` | the version column and the idempotent alter |
| `audit.ts` | the audit table, its DDL and its reader |
| `invariants.ts` | the guards of spec 02 §12 |
| `storageErrors.ts` | the mapping of a failed statement onto a typed error |

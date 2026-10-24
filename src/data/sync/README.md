# Sync protocol

The engine DR-02 chose: one canonical repository on SQLite (the device) and SQLite or Postgres
(the server), with our own outbox, hybrid logical clock, change envelope and per-entity merge
policies. Nothing here forks the domain layer; the apply verb reuses the entity schema, the row
codec, the invariant guards and the audit trail.

## The pieces

| File | What it owns |
| --- | --- |
| `hlc.ts` | The clock. `wall(15):counter(6):device`, fixed width, so a string compare is the total order in JS and in SQL. |
| `envelope.ts` | `Envelope` (a push: changed `fields` plus the per-field `base` clock), `Snapshot` (a pull: the row plus the clock of every column) and `ConflictNote`. |
| `policies.ts` | Spec 06 §3.2 as pure functions: `append_only`, `cell_merge`, `field_lww`. |
| `scope.ts` | `ReplicaScope`: one institution, an optional entity list closed over the reference graph, and an optional row predicate. |
| `store.ts` | The metadata tables: per-field clocks, the device outbox, the server change log and rejections, the conflict log. |
| `apply.ts` | The verb the repository lacks: write a remote row under the writer's id, with its own clocks, guards and audit. |
| `node.ts` | `DeviceNode` (writes through the repository, queues an envelope, pushes, pulls) and `ServerNode` (merges, logs, serves a scoped change log). |
| `httpTransport.ts` | The wire: one batched `POST /api/sync/push` and one `GET /api/sync/changes` per call. |
| `conflicts.ts` | The conflict log as the settings UI reads it, plus the summary counts. |

## The policies

- **Append-only** — `invoice`, `invoice_line`, `payment`, `payment_allocation`, `receipt`,
  `credit_note`, `refund`, `attendance_session`, `attendance_mark`. Two devices posting at the
  same time produce two rows, so there is no row to collide on. A re-delivered create under an
  id that already exists is refused and recorded; a later state transition on the row is an
  ordinary field merge. Immutability after posting stays the repository's guard.
- **Cell-level merge** — `mark`. A mark's identity is
  `(assessment_id, enrolment_id, learning_area_id, component_id)`. Two devices that entered the
  same cell offline have different UUIDs, so the merge finds the row by the cell key, keeps the
  id that landed first, folds the second device's values into it and logs a `cell_identity`
  conflict.
- **Field-level LWW with a conflict log** — everything else. `base[field]` is the clock the
  writer had seen for a column. A column conflict is real only when the writer had *not* seen
  the stored write (`base[field] < clock[field]`) and the two values differ; a write that saw
  the stored value is sequential and does not inflate the log. The later HLC wins.

A refusal — a schema failure, a guard, a unique or foreign-key violation, a scope violation, or
a pulled row that cannot be stored — is written as an `unresolved` conflict with its `detail`.
Nothing is dropped silently: the server logs it and the device that pushed it logs its own copy.

## The flow

1. A device writes through `repository.create` / `update` / `remove` inside
   `repository.transaction`, and `SyncStore.recordLocal` writes the outbox entry in the same
   transaction. The row and the change commit together.
2. `DeviceNode.push` sends every unsent envelope in one batch. `ServerNode.acceptBatch` applies
   each change in its own transaction, so one hard failure rolls back only that change.
3. The server appends each applied change to `sync_change` (with its `institution_id` and a
   server sequence) and records a rejection when it refuses one.
4. `DeviceNode.pull` asks for the newest state per row after its cursor. The server filters by
   the replica's scope in SQL and re-checks each decoded row in JS, then orders the page by the
   reference graph so a parent lands before its children.
5. The device applies each snapshot in its own transaction, advances its cursor, and announces
   the row on the repository bus (`announceChange`), so a live query refreshes for a pulled row
   as it does for a local write.

## Scoping

`ReplicaScope` names one institution. `scopedEntities` closes a narrowed entity list over the
foreign-key graph transitively, so a mark brings its enrolment, learner, assessment and
components; `institution` is always included. `rowInScope` accepts the institution row by id
and every other row by `institution_id`, then applies the optional `allowsRow` predicate. A
change whose row is outside the scope is answered `forbidden` and logged, never applied.

Changing the scope key resets the device's pull cursor, so the new scope is read from the
beginning. Rows the old scope left behind are the caller's to clear; the protocol does not
delete data on a scope change.

## What P4-A03 adds

`apply.ts` numbers an audit row from `MAX(commit_sequence) + 1` because the repository's own
counter is private and a pulled row does not advance it. Two applies in one transaction can
therefore share a number with a following local write. P4-A03 replaces this with
server-allocated sequences and device number blocks; the change log's `server_seq` is already
the cursor that allocation will build on.

# Sequences

Named document-number sequences: admission numbers, invoice numbers, receipt numbers and the
documents next to them. A number is **unique and never reused**, including under concurrency and
after a failure, and a device can issue numbers while it is offline.

```ts
import { createSqliteSequenceStore, ensureSequenceSchema, SequenceService } from '@/domain/sequences';

await ensureSequenceSchema(adapter);                       // the store's DDL, once
const store = createSqliteSequenceStore(adapter);
const sequences = new SequenceService({ store, deviceId: 'counter-1' });

const receipt = await sequences.issue('receipt', { institution: institutionId, year: 2027 });
receipt.number;   // "RCT/2027/000123"
receipt.scopeKey; // "institution=…|year=2027"
```

## The format grammar

A pattern is literal text and `{TOKEN}` parts:

| Token                | Renders                          |
| -------------------- | -------------------------------- |
| `{SEQ}` / `{SEQ:n}`  | the counter, zero-padded to `n`  |
| `{YYYY}`             | the four-digit year              |
| `{MM}`               | the two-digit month              |
| `{INST}`             | the institution code             |
| `{CAMPUS}`           | the campus code                  |
| `{TERM}`             | the term or period code          |
| `{CASHIER}`          | the cashier id                   |
| `{DEVICE}`           | the device id                    |

Two tokens may not sit next to each other: a literal separator is what makes a number parseable
back. A free-form value may not contain `/`, a brace, or the literal that follows it, so
`formatNumber` and `parseNumber` are exact inverses.

## Scopes and resets

A sequence is partitioned by the segments in its `scope`. Each scope has its own counter, keyed by
the canonical `scopeKey` (`institution=…|year=2027`), so two institutions never share a counter and
the key does not depend on the order the caller wrote the values in.

The `reset` policy is a scope of its own: `yearly` puts the year in the scope and requires `{YYYY}`
in the pattern, `monthly` puts the year and month in and requires `{MM}`. A reset therefore starts
at 1 with a number the previous period cannot have produced. `validateDefinition` refuses a
definition where the reset period is not printed, because that is exactly the mistake that would
let a new year repeat an old year's numbers.

A scope segment may be declared without being printed — an admission number is per institution
without containing the institution. `parse` can only return the segments the pattern renders.

## Why a number is never reused

Two store guarantees, not a read-then-write:

1. **The counter is taken atomically.** `allocate` is one `INSERT … ON CONFLICT DO UPDATE …
   RETURNING`, so concurrent callers each get a distinct value. Nothing reads a counter and writes
   it back.
2. **The ledger refuses a repeat.** Every number is recorded in `sequence_number`, whose unique key
   is `(sequence, scope_key, number)`. A reset, a replayed block or a hand-edited counter cannot
   record a number the store already holds.

`SequenceService.issue` never returns a number without it being in the ledger.

## The failure policy

| Policy  | What it means                                                                          |
| ------- | -------------------------------------------------------------------------------------- |
| `burn`  | the allocation commits on its own; a failure afterwards leaves a gap and the number is never handed out again. The default. |
| `reuse` | the allocation joins the transaction `withTransaction` opened; a rollback returns the number, because nothing was issued. |

Both are defensible; the choice is explicit. `burn` is the default because the spec says a receipt
number is never reused, and a number that may already be on a printed receipt must not reappear.
`burn` needs no transaction to be open — inside one, the service refuses and says so rather than
silently changing the policy.

## Offline device blocks

A device reserves a range up front so it can issue while disconnected:

```ts
await sequences.reserveBlock('receipt', scope, { size: 50 }); // e.g. 1..50
await sequences.issueFromBlock('receipt', scope);             // 1, 2, 3 … while offline
await sequences.outstandingBlocks({ sequence: 'receipt' });   // what the hub reports
```

- A block is taken from the same counter as direct issuance, so the hub's next number is after the
  block and the two cannot collide.
- Ranges are disjoint: two devices reserving at the same time get different ranges.
- A block's position advances as it is used, so a crash after a number is taken does not hand that
  number to anyone else.
- A block that is not finished is reported as outstanding, and releasing it does **not** return its
  unused numbers: they stay burnt, so a number that may already be printed is never reissued.
- An exhausted block drops out of the outstanding report; `blocks()` still shows it.

## Store schema

`SEQUENCE_DDL` creates `sequence_counter`, `sequence_number` and `sequence_block`. Nothing here
references a domain table, so the module can be adopted before the document tables grow their own
columns. **Schema migration 100 applies `SEQUENCE_DDL`** at startup
(`src/data/migrations/schemaMigrations.ts`, applied by `applySchemaMigrations` while the app opens
the canonical database); `ensureSequenceSchema` remains the path the module's own tests take, and
is safe to call alongside the migration.

## Migrating the call sites

`legacy.ts` still exports the old `nextSequenceNumber` / `nextReceiptNumber` / `sequenceYear`
helpers so existing callers keep working. They read the numbers they are given and write the next
one back, so two callers that read at the same time issue the same number. The call sites to move
to this module:

- `src/domain/services/admissionService.ts` — `nextAdmissionNumber`, which reads at most 500
  learner rows and then invents the next number.
- `src/domain/finance/billingService.ts` — invoice numbers built from an in-memory list.
- `src/domain/demo/demoSchool.ts` — admission, invoice and receipt numbers seeded inline.

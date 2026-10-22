# Statement import and reconciliation

The bank and mobile-money reconciliation of spec 05 section 8: *"import statements, auto-match,
manual match, unreconciled report."* This module reads a statement file into normalised lines,
suggests the payments and ledger entries that should correspond to them, records a match a human
confirms, reports what did not match, and posts an unexplained difference to a suspense account.

```ts
import { createNodeSqliteAdapter } from '@/data/adapters/sqlite';
import { LedgerService, createLedgerAccountMapping, createSqliteLedgerStore,
  ensureLedgerSchema } from '@/domain/finance/ledger';
import {
  ReconciliationService, createAccountDirectory, createArrayCandidateSource,
  createLedgerSuspensePoster, createSqliteReconciliationStore, ensureReconciliationSchema,
} from '@/domain/finance/reconciliation';

await ensureLedgerSchema(adapter);
await ensureReconciliationSchema(adapter);            // the module's own DDL, once

const ledger = new LedgerService({ store: createSqliteLedgerStore(adapter), actor: bursarId });
const reconciliation = new ReconciliationService({
  store: createSqliteReconciliationStore(adapter),
  accounts: createAccountDirectory([bankAccount]),
  candidates: myCandidateSource,                       // the seam the payments module fills
  poster: createLedgerSuspensePoster(ledger),
  actor: bursarId,
});

const { statement, lines, duplicate } = await reconciliation.importStatement(csv, {
  accountId: 'acct-bank', sourceName: 'january.csv',
});

const suggestions = await reconciliation.suggest({ accountId: 'acct-bank',
  from: statement.firstDate!, to: statement.lastDate! });
// suggestions[0].score is 100, its reasons name every rule that fired.

await reconciliation.confirmMatch({ statementLineId: lines[0].id,
  candidateKind: 'payment', candidateId: 'pay-101', score: suggestions[0].score });

const report = await reconciliation.report({ institutionId, accountId: 'acct-bank' });
report.unmatchedLines;        // the bank's movements the books lack
report.unmatchedCandidates;   // the books' movements the bank has not shown
report.difference;            // an exact Money: the bank less the books

await reconciliation.postSuspenseDifference({ institutionId, accountId: 'acct-bank' });
// a balanced entry: the account against the suspense account, once per account and day.
```

Every amount is a `Money` from `@/domain/money`, an integer count of minor units and a currency.
No major-unit `number` decides an amount anywhere here: an amount is read from the file's text
straight into `Money`, and a total is a sum of `Money`. A statement is exactly where a float would
corrupt a reconciliation.

## What already existed, and what this adds

`src/modules/finance/**` already covers most of the module's operations, and it is on point: the
Banks page, the Cash Book, the Day Book, the Journal Register, the Trial Balance and the payments
pages are all there. **What it does not have is a reconciliation or bank-import screen**: there is
no statement import, no match/unmatch and no unreconciled report anywhere in it. This task therefore
lands the **domain only**, in `src/domain/finance/reconciliation/*`; no page was added, so the page
route guard (`src/routing/__tests__/pageRouteCoverage.test.ts`) was not touched. The finance module
can build a screen over this service without it changing.

Two things already existed and are reused rather than reimplemented:

- the **ledger** (`src/domain/finance/ledger/*`) supplies the chart of accounts, the channel
  accounts, the journal entry constructor and the `post` that writes one. The suspense adjustment is
  a posting through it, never a field on a statement line.
- **allocation** (`src/domain/finance/allocation/*`) is untouched and not duplicated. Matching links
  a statement line to the record that should correspond to it; allocating a confirmed payment to
  invoice lines stays the allocation engine's job.

## The model

| Shape | What it is |
| --- | --- |
| `StatementAccount` | the bank account or mobile-money wallet a statement belongs to: its currency and whether it is a bank book or a mobile-money clearing account |
| `Statement` | one imported file: its format, currency, content `fingerprint`, date range, line count and who imported it |
| `StatementLine` | one normalised line: value date, `Money` amount, direction, reference, description, payer, the raw record text, and the `dedupeKey` |
| `MatchCandidate` | a payment or a ledger entry the line can be matched to |
| `MatchSuggestion` | a proposed match with its `score`, its `reasons` and its `rank` |
| `MatchRecord` | a confirmed match, and the record of its undoing |
| `ReconciliationReport` | what matched, what did not, and the exact difference |

### The seam: what a statement line is matched against

A statement line matches against **a payment or a ledger entry**, and this module knows nothing
about how either is stored. The interface it needs is deliberately small:

```ts
interface MatchCandidate {
  id: string;
  kind: 'payment' | 'ledger_entry';
  institutionId: string;
  accountId: string | null;          // the account the money landed in, when known
  date: string;                      // ISO day
  amount: Money;                     // positive
  direction: 'inflow' | 'outflow';
  reference: string | null;
  payerName: string | null;
  narration: string | null;
}

interface CandidateSource {
  listCandidates(query: CandidateQuery): Promise<readonly MatchCandidate[]>;
  getCandidate(kind: CandidateKind, id: string): Promise<MatchCandidate | null>;
}
```

The payments module (**P3-D01**, being built in parallel) and the ledger fill it; this module
depends on neither and edits neither. `createArrayCandidateSource(candidates)` is the in-memory
implementation the tests and a caller without a source use.

## Import

`parseStatement(text, { account, format?, sourceName?, dateOrder?, defaultDirection? })` reads the
whole file and returns normalised lines, or refuses. `ReconciliationService.importStatement` parses
before it writes anything, so **a malformed file writes nothing** and a refusal always names the
1-based file line that caused it.

### The two formats

| Format | Shapes it reads |
| --- | --- |
| `csv` | RFC 4180: quoted fields with embedded delimiters and newlines, doubled quotes, a UTF-8 BOM, CRLF or LF, and a delimiter (`,` `;` tab `|`) the header itself picks. The header is mapped to the columns it needs, tolerantly: `Value Date` / `Completion Time` for the date, `Amount` or a `Withdrawn`/`Paid In` pair, `Receipt No.` / `Reference`, `Details` / `Narration`, a payer column, `Currency`, and a `Type` / `Dr/Cr` direction column. |
| `ofx` | Both OFX 1.x (the SGML body, whose tags have no closing form) and OFX 2.x (XML with closing tags). `TRNTYPE`, `DTPOSTED`, `TRNAMT`, `FITID`, `REFNUM`, `CHECKNUM`, `NAME`, `MEMO` and `CURDEF` are read. |

The format is detected when the caller does not name it: an `<OFX>` root or an `OFXHEADER:` line
means OFX, a delimiter in the first non-blank line means CSV, anything else is `unknown_format`.

### Amounts, dates and directions

- An amount is read from the text into `Money` exactly: a thousands separator on either convention
  (`1,500.55` and `1.500,55`), a European decimal comma, an accounting negative `(1,500.00)`, a
  trailing minus, and a currency symbol or code glued to the figure. Precision the currency cannot
  hold is **refused, not rounded** — `1500.005` in KES is an `invalid_amount` carrying
  `reason: 'over_precision'`, because a statement is where a rounded cent becomes a reconciliation
  that never closes.
- A date is read from `2027-01-10`, `2027/01/10`, `20270110`, `10/01/2027`, `10-01-2027`,
  `10.01.2027`, `10 Jan 2027`, each with an optional time after it. A component greater than 12
  decides whether `03/04/2027` is day-first or month-first; when both could be a month,
  `dateOrder` decides and defaults to **day-first**, the convention of the markets this platform
  serves. A day that does not exist (`2027-02-30`) is refused.
- The **direction** is read from, in order: an explicit sign on the amount; the direction column
  (`Type`, `Dr/Cr`); the caller's `defaultDirection`; and otherwise the convention of a signed
  amount column — a positive figure is money in. A signed amount and a direction column that
  disagree, and a record carrying both a debit and a credit, are refused as `ambiguous_direction`
  rather than guessed.
- The statement's **own currency must be the account's**. A `Currency` column or an OFX `CURDEF`
  that names another currency is refused with `currency_mismatch`; a code the money module does not
  know is `unknown_currency`. A file that names no currency at all is read in the account's currency,
  because a statement is the account's.

### The refusals, with their line

| Code | When |
| --- | --- |
| `unknown_format` | the text is neither an OFX document nor a delimited file |
| `empty_statement` | no records, a header with no lines, or no `<STMTTRN>` |
| `missing_columns` | the header names no date, or no amount and no debit/credit pair |
| `malformed_row` | a record's field count differs from the header's, or a quoted field is never closed (the line the quote opened on) |
| `invalid_date` | a date the parser does not read, or a day that does not exist |
| `invalid_amount` | an amount that is not one, or one carrying more precision than the currency holds |
| `missing_amount` | a record with no amount at all |
| `ambiguous_direction` | the sign and the direction column disagree; both a debit and a credit; an OFX `TRNTYPE` and its `TRNAMT` sign disagree; or both a debit and a credit |
| `zero_amount` | an amount of zero: a statement line moves money |
| `unknown_currency` | a currency code the money module does not know |
| `currency_mismatch` | the statement is counted in another currency than the account |
| `account_not_found` | the account id is not in the directory |

### Idempotency

**The dedupe key of a line is `<statement fingerprint>#<file line>`, and the fingerprint is the
content of the file.** `fingerprintOf` hashes the canonical text — BOM dropped, line endings
unified, trailing whitespace dropped — with FNV-1a 64-bit, so the same file re-saved by another
editor fingerprints the same. Two invariants make a re-import harmless, one in the service and one
in the database:

- `reconciliation_statement` has a **unique index on `(institution_id, account_id, fingerprint)`**,
  and `importStatement` returns the existing statement and its lines with `duplicate: true` instead
  of writing anything (a caller that would rather refuse it passes `strict: true`). The line count
  does not grow, which the tests prove.
- `reconciliation_line` has a **unique index on `dedupe_key`** (and one on
  `(statement_id, file_line)`), so a line cannot be imported twice even by a caller that bypasses
  the service. A duplicate key is reported as `duplicate_statement`.

The fingerprint is deliberately not a cryptographic digest: it answers "is this the file I already
imported", and it must run in the browser, where `node:crypto` is not available.

## Matching

`suggestMatches(lines, candidates, options)` and `ReconciliationService.suggest({ accountId, from,
to, ... })` return a `MatchSuggestion` per line and candidate that could correspond. **The engine
suggests and never confirms**: it writes nothing, and a match exists only once a human calls
`confirmMatch`. A line that already carries a confirmed match and a candidate that already carries
one are left out, so every suggestion returned is still there to be confirmed.

### The rules and their weights

| Rule | Weight | When it fires |
| --- | --- | --- |
| `amount_exact` | 50 | **the gate**: the two amounts are equal, minor unit for minor unit, in one currency |
| `date_window` | 20 | the two dates are within the window (5 days by default); the weight falls by 4 for each day apart, so the edge of the window scores nothing for its date |
| `reference_exact` | 20 | the normalised references (upper-case letters and digits) are equal |
| `reference_contains` | 10 | one normalised reference carries the other, both at least four characters |
| `payer_name_similar` | 10 | the candidate's payer and the line's payer — or, when the line has none, its description, where a bank narration usually carries the name — share their significant words |
| `direction_match` | 5 | both moved the money the same way |
| `account_match` | 5 | the candidate names the same account |

The score is the sum, capped at 100. The amount is a **gate and not a weight**: a candidate one
minor unit out is never suggested, so the weights only order the candidates that could be the one.

### The tie-breaks

A line's suggestions are ordered by, in turn:

1. the higher score;
2. the closer date;
3. an exact reference over a contained one;
4. a payment over a ledger entry;
5. the candidate's date, then its id, ascending.

The order is therefore deterministic: the same lines and candidates always produce the same list.

## Match and unmatch

`confirmMatch({ statementLineId, candidateKind, candidateId, score?, reasons? })` writes a
`MatchRecord` linking the two sides, with **who matched it and when**. `unmatch({ matchId, reason })`
moves that record to `unmatched` and records **who undid it, when and why**.

- **A line is matched once and a payment is matched once.** Both are checked by the service and
  again by two partial unique indexes in the database (`… WHERE status = 'confirmed'`), so a caller
  that bypasses the service still cannot double-match. The refusals are `line_already_matched` and
  `candidate_already_matched`.
- **Unmatching restores both sides and never deletes history.** Nothing is deleted: the record keeps
  its two sides and gains who undid the link and why, and both sides are free again. A later match
  is a *new* record, so the history reads `confirmed, unmatched, confirmed`. A trigger refuses a
  `DELETE` on the table (`match_immutable`), and another refuses an update that re-points either
  side.
- **An unmatch without a reason is refused** (`reason_required`): an unmatch is an audit.
- An unknown line, candidate or match is `line_not_found`, `candidate_not_found` or `match_not_found`;
  a line and a candidate counted in different currencies are `match_currency_mismatch`.

Every match and unmatch also appends a row to the repository's own `audit_event` table, the way the
ledger does, so the trail is one convention and not two. `auditTrail(matchId)` reads it.

## Exceptions, and where an unexplained difference goes

`report({ institutionId, accountId, from?, to? })` returns, in full:

- `unmatchedLines` — **the bank's movements the books do not carry**, with each line's date, amount,
  reference, description and raw text;
- `unmatchedCandidates` — **the books' movements the bank has not shown**, the payments and ledger
  entries with no statement line;
- the signed totals of each (`unmatchedLineTotal`, `unmatchedCandidateTotal`, inflows positive) and
  of everything (`signedLineTotal`, `signedCandidateTotal`);
- `difference` = `signedLineTotal − signedCandidateTotal`, an exact `Money`.

Because a suggestion is only made when the amounts are exactly equal, every confirmed match nets
out, so `difference` equals `unmatchedLineTotal − unmatchedCandidateTotal` — the test asserts both
totals exactly, in minor units.

**An unexplained difference goes to a suspense account, as a posting.** The account is
`RECONCILIATION_ACCOUNTS.suspense` (`1990`, *Reconciliation suspense*): spec 05 section 8 names the
clearing accounts but not this one, so the module defines it and a caller registers it into the
chart with `createLedgerAccountMapping({ accounts: RECONCILIATION_CHART_ACCOUNTS })`. Money held for
a payer the books cannot identify is money the school owes back, which is why it is a liability.

`deriveSuspenseDifference(query)` derives the entry and `postSuspenseDifference(query)` posts it
through the ledger:

- each **unmatched statement line** is a movement the bank made and the books lack, so it is posted
  to the account in its own direction;
- each **unmatched payment** is a movement the books made and the bank has not shown, so it is
  posted the other way, which removes it from the account until the bank catches up;
- the contra is always the suspense account, so the entry balances exactly and the unexplained
  amount is visible in the trial balance instead of hidden in a statement field;
- a difference of zero is `nothing_to_post`; a caller with no poster is `no_suspense_poster`.

The entry is posted **once per account and day** — its source id is
`recon-suspense:<accountId>:<asOfDate>` — so the ledger's own one-posting-per-document guard refuses
a second posting of the same day with `conflict`, and a re-run of the reconciliation is safe.

## The module

| File | Holds |
| --- | --- |
| `types.ts` | the vocabulary: accounts, statements, lines, candidates, suggestions, match records, the report |
| `errors.ts` | `ReconciliationError` and its codes |
| `normalise.ts` | amount text, date text, reference and payer-name forms, the day difference, the fingerprint |
| `csv.ts` | the RFC 4180 reader and the delimiter it picks |
| `ofx.ts` | the OFX 1.x and OFX 2.x reader |
| `statement.ts` | the format detection, the header mapping, the per-record read, and every refusal |
| `match.ts` | the rules, the weights, the score and the tie-breaks |
| `suspense.ts` | the suspense account, the derived adjustment and the poster |
| `store.ts` | the DDL, the triggers, the port and the SQLite implementation |
| `service.ts` | `ReconciliationService`: import, suggest, confirm, unmatch, report, post |
| `index.ts` | the public API; a caller imports from here |

## Known limits

- **The suspense entry borrows a source document kind.** The posting engine's `SourceDocumentKind`
  is a closed list — invoice, payment, refund, credit note, opening balance — and holds no
  reconciliation or adjustment kind. This module does not edit the ledger, so the derived entry
  borrows `opening_balance`, the ledger's existing "the books are brought to a stated position"
  document, and `SuspensePostingInput.sourceKind` lets a caller name another once the ledger holds
  one. `DEFAULT_SUSPENSE_SOURCE_KIND` is the one line to change.
- **The suspense account is a policy, not a fact.** The spec asks for a suspense or unallocated
  account and does not name it; `1990` and its liability class are this module's choice. A school
  that keeps a different code changes `RECONCILIATION_ACCOUNTS`.
- **An unsigned amount with no direction column is read as money in.** That is the convention of a
  signed amount column and it is what every statement reader does; a file whose direction lives in
  a column this parser does not know is read wrongly unless the caller passes `defaultDirection`.
- **Journal and reconciliation entities are not in the canonical registry.** `src/domain/schema` is
  closed and does not model these tables, so this module keeps its own DDL and store, the same
  posture the ledger and the sequences module take. A canonical migration must apply
  `RECONCILIATION_DDL` (or call `ensureReconciliationSchema`).
- **A matched pair is not allocated.** Matching says *this statement line is this payment*;
  allocating that payment to invoice lines is the allocation engine's job (P3-D02/D03) and this
  module does not do it.
- **The statement's opening balance is not carried.** A statement's `LEDGERBAL` / `BALAMT` is read
  into the raw text of the file but not modelled, so a reconciliation is of the period's movements
  and not of the closing balance. Modelling a closing balance needs a stored balance per account,
  which is a later task's shape.

## The tests

`__tests__/` runs the reader and the rules pure, and the service against a real `better-sqlite3`
database — there is no storage double anywhere in the suite. The statements it reads are real files
in `__tests__/fixtures/`, not strings the tests built.

| File | Guards |
| --- | --- |
| `fixtures/bank-statement.csv` | a bank CSV: a signed `Amount` column, a quoted description with a comma, a negative line |
| `fixtures/mpesa-statement.csv` | a mobile-money CSV: a `Paid In`/`Withdrawn` pair, a `Currency` column, a time after the date |
| `fixtures/bank-statement.ofx` | an OFX 1.x SGML body |
| `fixtures/wallet-statement.ofx` | an OFX 2.x XML body, with a neutral `XFER` type |
| `fixtures/malformed-date.csv` | a day that does not exist, on line 3 |
| `fixtures/malformed-amount.csv` | an amount that is not one, on line 3 |
| `fixtures/unterminated.csv` | a quoted field that is never closed, opened on line 2 |
| `fixtures/malformed.ofx` | a `<TRNTYPE>DEBIT` with a positive amount, on line 17 |
| `fixtures/malformed-date.ofx` | a `<DTPOSTED>` on a day that does not exist, on line 17 |
| `csv.test.ts` | the reader: quoted fields, embedded newlines, doubled quotes, BOM, CRLF, delimiter detection, blank lines, line numbers, the unterminated-quote refusal |
| `ofx.test.ts` | the reader: both OFX shapes, tag extraction, currency, line numbers, the not-OFX refusal |
| `normalise.test.ts` | amounts, dates, references, name similarity, the fingerprint's stability, the day difference |
| `statement.test.ts` | both clean files, the BOM+CRLF tolerance, and every refusal with its line |
| `match.test.ts` | the amount gate, each rule and its weight, the score cap, all four tie-breaks, the exclusions, and that suggesting writes nothing |
| `reconciliation.test.ts` | the import and its idempotency, the dedupe key as a database invariant, suggest-then-confirm, match and unmatch with their refusals, the double-match and no-delete guards exercised in the database itself, the exception report and its exact totals, the suspense posting through a real ledger, and the refusals of a second posting and of a zero difference |

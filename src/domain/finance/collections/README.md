# Collections: reminders, pay links and promises to pay

Spec 05 §6 asks for "scheduled SMS/WhatsApp/email with pay links, tone templates (gentle → firm),
quiet hours, opt-out, per-guardian channel; promise-to-pay capture". This module is that, as a
domain service. It owns five things: a **schedule** (when to remind whom), a **template** (what the
message says), a **pay link** (how the payer pays), a **promise to pay** (a commitment that holds
reminders back) and the **quiet hours and opt-outs** that gate the lot.

## What it composes rather than repeats

- **The statements module** decides who gets a reminder and for how much. A candidate's amount is
  the `AgingItem.amount` from a `Statement`'s aging (`candidatesFromStatement`), which is the invoice
  total less what was allocated and credited. Nothing here recomputes a balance.
- **The app's messaging stack.** The `sms` channel is `smsChannelFrom(plugin)`, wrapping the
  existing `SMSPlugin` (`@/plugins/types`) that `src/plugins/builtin/sms-gateway` and `sms-mock`
  already implement. The template model mirrors the existing `communication_templates` collection
  (`name`, `type`, `body_template`) and the `{{variable}}` placeholder convention the communication
  templates and the built-in SMS mock already use. Nothing about SMS is re-implemented.
- **The canonical payer preferences.** `learner_guardian.receives_sms` and `preferred_channel` are
  the per-guardian channel preference; the run reaches a payer on the first of the schedule's
  channels the payer has a contact for, and a stored opt-out is the explicit instruction on top.

## The schedule: when, whom, how much

`ReminderSchedule` is data. An interval is `{ id, phase, days }` - a stable id, and a whole-day
distance from the due date (`before_due`, `on_due`, `after_due`). A run on a day asks
`isIntervalDueOn` for each candidate and each interval; `catchUpDays` (default 0) lets a run that
was missed fire the interval in the following days and only then.

The audience is `learner`, `household` or `sponsor`. A household is the unit a payer thinks in, so
a household schedule reads the household statement across its children; a sponsor's own unpaid
share is a different conversation, so a sponsor schedule reads the sponsor statement.

Selection is a pure function, `selectDueReminders`. For every candidate whose interval falls due it
returns one decision with an outcome and a reason:

| outcome | reason | when |
| --- | --- | --- |
| `send` | `due` | the interval is due and nothing holds it back |
| `deferred` | `quiet_hours` | the instant is inside the quiet window |
| `suppressed` | `opted_out` | the payer opted out of that channel or category |
| `suppressed` | `promise_to_pay` | an open promise still in force covers the document |
| `skipped` | `already_sent` | the attempt row for this document and interval is `sent` |
| `skipped` | `below_threshold` | the outstanding is under the schedule's floor |
| `skipped` | `no_contact` | the payer has no address on any of the schedule's channels |
| `skipped` | `no_template` | no template matches the channel, category and locale |
| `skipped` | `nothing_outstanding` | the amount is zero |

An interval that is not due produces no decision: a run reports who is due, not the whole calendar.

## Quiet hours

`QuietHours` is `{ enabled, start, end, timezone }`. `start` and `end` are local wall clock, `start`
inclusive and `end` exclusive, and a window may cross midnight (20:00–07:00 is the default). The
window is read in the schedule's IANA time zone, and the wall clock comes from the runtime's `Intl`,
so there is no zone table and no dependency. The run's day is likewise the local day in that zone.

A reminder that falls inside the window is **queued for the next window, not dropped**:
`quietHoursRelease` returns the instant the window ends (today if the window does not cross
midnight or the reading is in its early hours, tomorrow otherwise) and the attempt is stored
`queued` with that instant. The next run, at or after it, releases the queued attempts before
deciding anything fresh.

## Opt-outs

An opt-out silences a channel, a category or everything for a payer. It lives in its own table,
keyed by institution, payer and scope, so recording it twice updates it, editing a schedule cannot
clear it, and every re-run reads it again. An opt-out that arrives while a reminder is queued is
honoured when the queue is released, not only when it was first decided.

## Pay links

`issuePayLink` mints a token (a UUIDv7), signs `token.expiresAt` with HMAC-SHA256 and stores the
row that holds the document, the payer and the amount. The URL carries **only** the token, the
expiry and the signature - no learner id, no payer id, no name, no phone, no amount - so a link
that leaks reveals nothing about the family. `payLinkLeaksPersonalData(url, sensitive)` is the
check, exported so a caller can assert it too.

`verifyPayLink` refuses, in order: an unknown token, a signature that does not verify (including an
expiry that does not match the stored row), a link already used, and an expired link. An expired
link is refused with `expired`; the payer asks for a new one. Signing is injected
(`PayLinkSigner`); `createWebCryptoPayLinkSigner({ secret })` is the default.

## Promise to pay

A promise is an amount and a day against a document. While it is `open` and its day has not passed,
reminders for that document are suppressed. Once the day passes with the document still outstanding
the promise is `broken`: reminders **resume**, and, when the schedule names an
`escalationCategory`, the next reminder escalates to it (a broken promise defaults to escalating).
A document that leaves the statement - paid in full - resolves the promise as `kept` and no
reminder is ever sent.

## Idempotency

One row per `(institution, document, interval)` in `reminder_attempt`, enforced by a unique index.
A `sent` row means the reminder went out; a re-run finds it and returns `already_sent` instead of
sending again. The proof is the index: the second insert of the same key is the same row, so the
database itself refuses a second send. A queued row is the same row in state `queued`; a suppressed
row is the same row in state `suppressed`, re-evaluated on later runs so lifting an opt-out or
breaking a promise resumes the reminder.

## Persistence

The canonical registry models no reminder, so - like the ledger and the cashier session - the module
keeps its own tables (`ensureCollectionsSchema`): `reminder_schedule`, `reminder_opt_out`,
`reminder_promise`, `reminder_pay_link` and `reminder_attempt`. `createSqliteCollectionsStore`
builds the store over an adapter.

## Wiring

```ts
const collections = new CollectionsService({
  store: createSqliteCollectionsStore(adapter),
  channels: [smsChannelFrom(smsPlugin)],
  templates: myTemplates,
  reader: {
    // a thin adapter over StatementService.learnerStatement / householdStatement / sponsorStatement
    statementFor: (subject) => statementService.learnerStatement(subject.id as never, { to: runDay }),
  },
  signer: createWebCryptoPayLinkSigner({ secret: process.env.PAY_LINK_SECRET! }),
  payLinkBaseUrl: 'https://pay.example.test/fees',
  schoolName: 'Mwangaza Secondary',
});
```

## Known gap

The statements module does not age a sponsor's documents yet (its `sponsorStatement` carries no
aging items), so a `sponsor` audience falls back to a single balance candidate anchored on the day
the statement was taken. When P3-E01 grows sponsor aging, `candidatesFromStatement` picks it up
without a change here.

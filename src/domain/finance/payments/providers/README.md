# Payment providers

The seam a payment provider plugs into, and the one place webhook idempotency lives. Spec 05 §5.1
asks for payment integrations as plug-ins implementing a `PaymentProvider` interface; this module is
that interface, and the intake that turns a provider's delivery into a payment.

**A provider payment is a payment recorded by a machine instead of a cashier.** It lands in the same
`payment`, `payment_allocation` and `receipt` rows, through the same `PaymentsService` (P3-D01),
which numbers the receipt from the sequences module, allocates it with the allocation engine and
posts it with the ledger's payment derivation. Nothing here derives a journal entry for a matched
payment, and nothing here invents a second payment model.

## What is here

| File | Holds |
| --- | --- |
| `types.ts` | the `PaymentProvider` interface, the normalised `ProviderNotification`, and the rules a provider states about its own signatures and idempotency |
| `errors.ts` | `ProviderError`, its codes, and `requireCapability` |
| `store.ts` | the provider event ledger: one row per charge, notification or refund, keyed by the provider's transaction id |
| `suspense.ts` | the suspense queue for money that arrived with no learner to match it |
| `directory.ts` | the learner directory that resolves a payer's account reference (the admission number) |
| `intake.ts` | `ProviderPaymentService`: receive, initiate, refund, resolve, and poll |

## The interface

`PaymentProvider` maps onto spec 05 §5.1 and adds what the C2B/STK/B2C flows and webhook idempotency
need:

| Method | Spec §5.1 | What a provider that lacks it does |
| --- | --- | --- |
| `describe()` | — | returns `id`, `name` and its `capabilities`; a capability that is `false` is a statement, not a guess |
| `signature()` | — | states the scheme it actually uses; a provider with no check says `none` rather than pretending |
| `idempotency()` | — | says whether it retries, and which payload fields its transaction id is built from |
| `idempotencyKey(notification)` | — | returns `<providerId>:<transactionId>` |
| `verifyWebhook(input)` | `verifyWebhook` | returns `{valid:false, reason}`; the intake refuses with `signature_invalid` |
| `parseNotification(input)` | — | returns `null`; the intake refuses with `payload_unrecognised` |
| `initiateCharge(request)` | `createCollectionRequest` | declares `capabilities.collection: false`; the intake refuses with `capability_unsupported` |
| `refund(request)` | `refund` | declares `capabilities.refund: false`; refuses with `capability_unsupported` |
| `queryTransaction(reference)` | — | declares `capabilities.query: false`; refuses with `capability_unsupported` |
| `statementDialect()` | `parseStatement` | returns `{supported:false}`; the reconciliation module does the parsing, the provider says what its export looks like |
| `acknowledgeNotification?(input)` | — | optional: absent means "answer nothing". Only a protocol that waits for an answer needs it |

`requireCapability` is the one place a declaration is enforced: the intake asks before it acts, so a
provider that cannot refund says so by name instead of a caller discovering it halfway through.

## Webhook idempotency

**The key is the provider's transaction id, namespaced by the provider: `<providerId>:<transactionId>`.**
For M-Pesa that is `CheckoutRequestID` for an STK push, `TransID` for a C2B payment (which is also
the receipt the payer is told) and `OriginatorConversationID` for a B2C refund.

A delivery is told apart from a status update by hashing its payload *and its kind*
(`fingerprintOfEvent`): the same key with the same fingerprint is a **repeat**, and the same key with
a different fingerprint is a **status update** that moves the same record on.

- **A repeat writes nothing.** The second identical delivery returns `duplicate` and no second
  payment is recorded. The unique index on `idempotency_key` is the invariant behind it, so two
  deliveries that race still write once: the losing insert fails and the winning row is read back.
- **A status update moves the record on.** A C2B validation callback (kind `validation`) followed by
  the confirmation (kind `collection`) for the same `TransID` produces **one** payment: the
  validation records a decision, the confirmation records the payment. The kind is part of the
  fingerprint because M-Pesa's two C2B callbacks are byte-identical and are told apart only by the
  URL they arrive on.
- **A settled event is not moved back.** Once an event is `matched`, `suspense` or `refunded`, a
  later delivery of it returns `ignored`: a status query that still says "processing" after the
  payment landed cannot undo the payment.
- **A charge is a pending event.** `initiateCharge` records the charge under the same key, so the
  callback completes the record the charge opened, and the amount that was charged is on hand to
  check the callback's amount against.

**An amount that is not what was charged** is refused: the record moves to `refused`, the message
names both amounts, and nothing is posted. A C2B payment nobody initiated has no charge to compare
against, so it is recorded for the amount the provider states.

**A callback for an unknown learner** is not an error: the money arrived and cannot be placed, which
is what the suspense queue is for.

## The suspense queue

An unmatched provider payment reuses the reconciliation module's unmatched-money model rather than a
second queue: the arrival is the same shape as an unmatched statement line, so it is posted the same
way — debit the channel the money landed in (the mobile-money clearing account, 1030) and credit the
reconciliation module's suspense account (`RECONCILIATION_ACCOUNTS.suspense`, 1990). The queue keeps
the exact payload, the payer, the receipt and the account reference that was not recognised.

Resolving an entry to a learner records and posts the payment through the payments core, then
**reverses the suspense posting** through the ledger, so the suspense account returns to zero and the
money ends where it belongs: the mobile-money clearing account against the learner's fees.

The queue is a *store*, not a second suspense model. One thing it does not do is call the
reconciliation module's `deriveSuspensePosting`: that nets a whole account over a day and keys its
entry `recon-suspense:<account>:<day>`, which is right for a period-end reconciliation and wrong for
a queue that files one arrival at a time (two arrivals on one day would collide on that document id).
`suspensePostingFor` builds the same balanced shape and hands it to the module's own
`createLedgerSuspensePoster`, keyed by the entry.

## The offline topology

This product runs on a device with no internet and on a hub with an unreliable one, and a webhook
cannot reach a device that is offline. Daraja does not re-send a callback, so **the device polls**:
on reconnect, `reconcileOffline` queries the transaction (`queryTransaction`, M-Pesa's STK push
query) and runs the same completion the callback would have run. The key is the same, so a callback
that did arrive and a poll that follows it converge on one payment.

The STK push query carries the outcome only — no amount, no receipt — so the amount a payment is
recorded for comes from the charge the caller initiated, not from the query, and the payment is
referenced by the transaction id until a receipt is known. For a C2B payment there is no synchronous
per-transaction query, and the fallback is the M-Pesa statement import the spec names
(`statementDialect` describes the export for the reconciliation module's importer).

## What the seam does not own

- **Refund approval.** Maker-checker refunds belong to the refunds service (P3-C02). `issueRefund`
  sends an *already approved* refund and remembers the provider's transaction id so the B2C result
  callback can find it.
- **Statement parsing.** The reconciliation module (P3-D04) parses; a provider only describes its
  dialect.
- **Credentials.** They are the caller's: the intake and the provider take them as configuration and
  never read a file or an environment themselves. See the M-Pesa plug-in's `credentials.ts`.

## A known gap

`recordPayment` sets a payment's `reference` (the provider receipt) but not its `external_reference`
(the provider's transaction id), and `payment` freezes `external_reference` once the row is posted
(the repository's `finance.posted_immutable` invariant), so the seam cannot write it afterwards. The
provider's transaction id is therefore kept on the provider event ledger, which is the record
idempotency is decided from. Closing this needs either a provider-aware parameter on
`recordPayment` or `external_reference` coming out of the frozen field list — both in modules this
task does not own.

## Schema

`ensureProviderPaymentSchema(adapter)` applies the two tables (`provider_payment_event`,
`provider_suspense_entry`). A canonical migration must apply them; until it does, a caller applies
them the way the tests do.

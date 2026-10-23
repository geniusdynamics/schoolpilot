# M-Pesa (Safaricom Daraja)

The payment-provider seam (P3-D03) implemented against Safaricom's Daraja API, per spec 05 §5.1:
Daraja C2B callbacks with the account reference auto-matched to a learner, STK push from the portal,
a statement-import fallback and B2C for refunds.

## What is here

| File | Holds |
| --- | --- |
| `credentials.ts` | where the credentials come from, the required-key check, and the redaction for a log line |
| `daraja.ts` | the HTTP transport port and the Daraja client: OAuth, STK push, C2B URL registration, B2C, the STK push query |
| `payloads.ts` | the mapping from Daraja's payloads to the normalised notification, and the route that tells the C2B callbacks apart |
| `provider.ts` | the `PaymentProvider` implementation |
| `index.ts` | the plug-in manifest and lifecycle module |
| `__tests__/fixtures/*.json` | the recorded payloads |
| `__tests__/fixtures.ts` | the provenance of every recorded payload |
| `__tests__/mpesa.test.ts` | the contract tests against the recorded payloads |
| `__tests__/intake.test.ts` | the sandbox flows end to end, against real SQLite |

## The flows, field by field

Every field below comes from a payload in `__tests__/fixtures`, and `__tests__/fixtures.ts` says
where each was recorded from and which values this repo substituted for the documentation's sample.

| Flow | Request fields | Callback fields |
| --- | --- | --- |
| **STK push** | `BusinessShortCode`, `Password` (base64 of short code + passkey + timestamp), `Timestamp` (Nairobi, `YYYYMMDDHHmmss`), `TransactionType`, `Amount`, `PartyA`, `PartyB`, `PhoneNumber`, `CallBackURL`, `AccountReference`, `TransactionDesc` | `Body.stkCallback`: `MerchantRequestID`, `CheckoutRequestID`, `ResultCode`, `ResultDesc`, `CallbackMetadata.Item[]` — `Amount`, `MpesaReceiptNumber`, `TransactionDate`, `PhoneNumber` |
| **C2B confirmation** | none (Safaricom posts it) | `TransactionType`, `TransID` (the receipt), `TransTime`, `TransAmount`, `BusinessShortCode`, `BillRefNumber` (the account the payer quoted — the admission number), `InvoiceNumber`, `OrgAccountBalance`, `ThirdPartyTransID`, `MSISDN`, `FirstName`, `MiddleName`, `LastName` |
| **C2B validation** | none | identical to the confirmation; the **route** is the only thing that tells them apart |
| **B2C refund** | `InitiatorName`, `SecurityCredential`, `CommandID`, `Amount`, `PartyA`, `PartyB`, `Remarks`, `QueueTimeOutURL`, `ResultURL`, `Occasion` | `Result.ResultType`, `ResultCode`, `ResultDesc`, `OriginatorConversationID`, `ConversationID`, `TransactionID`, `ResultParameters.ResultParameter[]` — `TransactionAmount`, `TransactionReceipt`, `ReceiverPartyPublicName`, `TransactionCompletedDateTime` |
| **STK push query** | `BusinessShortCode`, `Password`, `Timestamp`, `CheckoutRequestID` | `ResponseCode`, `ResponseDescription`, `MerchantRequestID`, `CheckoutRequestID`, `ResultCode`, `ResultDesc` |

**Where the payloads were recorded from.** The Daraja developer documentation
(`https://developer.safaricom.co.ke`), the sample body Safaricom publishes for each API, transcribed
by hand field for field. **No payload was captured from a live sandbox**: this environment has no
route to `sandbox.safaricom.co.ke` and a test may not call the network. `fixtures.ts` lists, per
payload, the documented fields and every value that is this repo's own rather than the
documentation's sample (the amounts, the account reference, the refund remarks), and marks anything
inferred. The two things marked as inferred rather than recorded are the STK push query's lack of an
amount and a receipt, and the M-Pesa statement export's column header (`statementDialect`).

**Honest limits of the mapping.**

- A **failed** STK callback carries no `CallbackMetadata`, so the notification has no amount and no
  receipt. It says so with nulls rather than zeroes.
- For a **C2B** payment the `TransID` is both the transaction id and the receipt; a school is told
  the receipt, and the receipt is what the printed receipt shows.
- An **STK push callback carries no account reference at all**, so the learner is the one the charge
  was initiated for, which the charge record holds. A notification whose account *does* resolve wins
  over the charge's learner, so a payment made against a different reference than the one charged is
  recorded against the reference the payer actually used.
- A **B2C result** is keyed on `OriginatorConversationID` (what the caller supplied, which the result
  echoes back) rather than `ConversationID` (the provider's own).
- `ReceiverPartyPublicName` is written `254708374149 - John Doe`; the phone and the name are split on
  ` - `.

## Credentials

The consumer key, the consumer secret, the paybill short code, the Lipa na M-Pesa passkey, the B2C
initiator name and the B2C security credential are read from the **deployment configuration** by
`loadDarajaCredentials`, from these keys:

`DARAJA_ENVIRONMENT`, `DARAJA_CONSUMER_KEY`, `DARAJA_CONSUMER_SECRET`, `DARAJA_SHORT_CODE`,
`DARAJA_PASSKEY`, `DARAJA_INITIATOR_NAME`, `DARAJA_SECURITY_CREDENTIAL`, `DARAJA_CALLBACK_BASE_URL`,
`DARAJA_CALLBACK_TOKEN`, `DARAJA_SOURCE_IP_ALLOWLIST`.

**How they are kept out of the bundle.** The names carry no bundler prefix. This repo's
client-visible variables are the `REACT_APP_*` keys (`src/config/databaseEnvVars.ts`) and a bundler
inlines a prefixed variable into the JavaScript it ships to the browser; an unprefixed name is read
by the process that runs the hub/server, which is where the webhook is terminated. The plug-in's
`activate` reads the environment off `globalThis.process` — absent in a browser, which is the point —
and logs only `redactDarajaCredentials`, which reports *whether* a secret is set and never the
secret. The plug-in manifest's settings hold the non-secret configuration only (environment, short
code, callback base URL): a setting lives in the institution's database row and is readable through
the app.

A missing required key refuses with `credentials_missing` naming it, rather than defaulting to an
empty string.

## Signatures

**A Daraja callback body carries no signature.** Safaricom posts a plain JSON body to a URL the
merchant registered; there is no HMAC or signing key on it. `signature()` says so, and reports what
actually protects the endpoint:

- `shared_token` when `DARAJA_CALLBACK_TOKEN` is set — the secret token the merchant puts in the
  registered callback URL (`mpesaCallbackUrl` builds it), compared on every delivery.
- `ip_allowlist` when `DARAJA_SOURCE_IP_ALLOWLIST` is set — the first `x-forwarded-for` address (or
  `x-real-ip`) must be in the list.
- `none` when neither is set — stated rather than pretending a check happened.

The outbound side is authenticated: an OAuth bearer token (cached for an hour, less a minute) on
every API call, and the STK push's own `Password` and the B2C `SecurityCredential`.

## Idempotency

`idempotency()` says `retries: false`: Daraja documents no retry, so a lost callback is lost, which
is why the STK push query exists. Duplicates still collapse, because a delivery can be replayed and
because spec 05 §5.1 requires idempotency by provider transaction id whatever the provider does. See
the seam's README for the key, the repeat, the status update and the settled-event rules.

## The offline topology

Daraja does not re-send a callback, so a device that was offline when it fired never receives it. On
reconnect the transaction is queried (`queryTransaction` → the STK push query) and the same
completion runs, keyed by the same transaction id, so a callback and a poll converge on one payment.
The STK query carries no amount and no receipt, so the amount comes from the charge that was
initiated and the payment is referenced by the transaction id until a receipt is known. For a C2B
payment there is no synchronous query; the fallback is the M-Pesa statement import.

## Registering the plug-in — a gap

The plug-in is not listed in `src/plugins/BuiltinLoader.ts`'s `BUILTIN_PLUGINS`/`DORMANT_PLUGINS`.
That file is outside this task's file ownership (`src/plugins/payments/mpesa/*`), so registering it
is left as a one-line change to the loader for whoever owns it.

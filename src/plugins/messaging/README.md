# Messaging

SMS, WhatsApp and email through one provider seam, behind an outbox, per spec 06 §9: providers for
Africa's Talking, Twilio, the WhatsApp Business Cloud API and SMTP; templates with merge fields;
delivery status; an outbox with retries, idempotency keys and a dead-letter view; inbound webhooks
verified.

**This is plug-in-shaped code with tests, not a running integration.** The SDK is not wired into the
host yet (`docs/extensions/plugins.md`), the plug-in is not listed in `BuiltinLoader.ts`, and **no
real message was sent**: every test injects a transport and reads a recorded fixture.

## What is here

| Path | Holds |
| --- | --- |
| `types.ts` | the `MessagingProvider` port, the message, a send result, a delivery report, `MessagingError` |
| `outbox.ts` | the outbox over a storage-agnostic record: idempotent enqueue, claim under a lease, backoff, dead letters, delivery reports |
| `templates.ts` | merge fields, strict rendering, the plain-text and WhatsApp variants |
| `signature.ts` | HMAC-SHA-256 and HMAC-SHA-1 in plain TypeScript, and a constant-time compare |
| `settings.ts` | the typed settings, the credentials type, and the factory that selects the adapter |
| `providers/transport.ts` | the HTTP seam over `fetch`; tests inject a recorder |
| `providers/africas-talking.ts`, `twilio.ts`, `whatsapp.ts`, `smtp.ts` | one adapter per provider |
| `index.ts`, `plugin.json` | the plug-in manifest and lifecycle module |
| `__tests__/` | 78 tests, the recorded fixtures, and their provenance in `fixtures.ts` |

## The outbox

`Outbox` is pure logic over `OutboxRecord`s; a host supplies `OutboxStore` (find by idempotency key,
list, save) and gets a clock injected. It sets no timers and opens no database.

- **Enqueue is idempotent on the idempotency key.** A second enqueue - including from a new process
  after a restart - returns the stored record and ignores the new body. The key is the primary key,
  so a duplicated notification is one message.
- **Claim** takes the records whose next attempt is due and marks them `sending` under a lease. A
  second worker gets nothing; a worker that dies holding a record leaves it to be reclaimed when the
  lease expires (five minutes by default).
- **Backoff** is exponential from 30 s, doubled each failure, capped at 15 minutes: 30 s, 1 m, 2 m,
  4 m, 8 m, then 15 m. No jitter: a deterministic timetable is easier to test and to explain.
- **Dead letters** after `maxAttempts` (5 by default). A dead record is never claimed again and
  appears in `deadLettered()` for the dead-letter view.
- **Delivery status** is separate from the send status. `markSent` records the provider's id and the
  status its acceptance proves; `applyDeliveryReport` moves `deliveryStatus` to `delivered` or
  `failed` with the provider's reason. A delivery failure does not dead-letter: the message was
  accepted, so it is not sent again. The record stays `sent` with `deliveryStatus: failed`.

A host worker is three calls: `claimBatch` → `provider.send(record.message)` → `markSent` /
`markFailed`. `__tests__/end-to-end.test.ts` is that loop over a transport that fails twice, then
succeeds, then reports delivered.

**Limitation:** a permanent refusal (an invalid number) is retried to the attempt limit like a
transient one. The seam has no permanent/transient classification yet.

## Templates

`{{learner.name}}` style fields, nested by dot, found in the subject and the body. Rendering is
strict: a field with no value is an error listing **every** missing field, rather than a blank where
a learner's name should be. An empty string is a value; null, a missing path, an array and an object
are not.

`renderTemplate` returns the plain-text variant (subject and body) and the WhatsApp variant (template
name, language, ordered body parameters). The WhatsApp parameters are positional because a field
like `learner.name` is not a valid Meta parameter name; a named-parameter WhatsApp template would
need a `parameter_name` this renderer does not emit yet (**draft**).

## Providers

Every adapter takes an injected `HttpTransport` (or `SmtpTransport`) and never reads a credential
from code. Requests and responses below come from the documentation named in each section.

### Africa's Talking (SMS)

Docs: [`/docs/sms/sending/bulk`](https://developers.africastalking.com/docs/sms/sending/bulk),
[`/docs/sms/notifications`](https://developers.africastalking.com/docs/sms/notifications). Those
pages were read through `r.jina.ai` because the documentation host serves a browser challenge.

| | |
| --- | --- |
| Send | `POST {baseUrl}/version1/messaging/bulk`, headers `apiKey`, `Accept: application/json`, `Content-Type: application/json` |
| Request | `username`, `message`, `senderId`, `phoneNumbers[]`, `enqueue: 1` |
| Response | `SMSMessageData.Message`, `SMSMessageData.Recipients[]` with `statusCode`, `number`, `status`, `cost`, `messageId` |
| Initial status | `101` → sent; `100`/`102` → queued; any other code is a refusal (`rejected`) |
| Delivery report | form-encoded `id`, `status`, `phoneNumber`, `networkCode`, `failureReason`, `retryCount` |
| Report statuses | `Success` → delivered; `Sent`/`Submitted` → sent; `Buffered` → queued; `Rejected`/`Failed`/`AbsentSubscriber`/`Expired` → failed |

The bulk endpoint has no sandbox (“coming soon” in the documentation); `atBaseUrl` is a setting so an
operator can point it elsewhere. `senderId` is documented as required, so a message or the settings
must supply one.

### Twilio (SMS)

Docs: [Message resource](https://www.twilio.com/docs/messaging/api/message-resource),
[webhook request](https://www.twilio.com/docs/messaging/guides/webhook-request),
[webhook security](https://www.twilio.com/docs/usage/webhooks/webhooks-security).

| | |
| --- | --- |
| Send | `POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json`, HTTP Basic (`AccountSid:AuthToken`), `application/x-www-form-urlencoded` |
| Request | `To`, `Body`, `From` or `MessagingServiceSid`, optional `StatusCallback` |
| Response | the Message resource: `sid`, `status`, `error_code`, `error_message` |
| Status query | `GET .../Messages/{Sid}.json` — Twilio documents a query, so `status()` asks the provider |
| Status callback | form-encoded `MessageSid` (or deprecated `SmsSid`), `MessageStatus`, `ErrorCode`, `ErrorMessage` |
| Signature | `X-Twilio-Signature` = base64 HMAC-SHA-1, key the auth token, over the callback URL then every POST parameter sorted by name |

Twilio's status list maps as documented: `accepted`/`scheduled`/`queued` → queued,
`sending`/`sent` → sent, `delivered`/`read` → delivered, `failed`/`undelivered`/`canceled` → failed.
`read` counts as delivered because a read receipt cannot precede delivery. Twilio warns that the
callback's parameter set varies by channel and may grow, which is why parsing accepts every parameter
and the signature covers whatever arrived.

### WhatsApp Business (Meta Cloud API)

Docs: [send messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages),
[template fundamentals](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview),
[webhook payloads](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples),
[status reference](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status),
[webhook signatures](https://developers.facebook.com/docs/graph-api/webhooks/getting-started).

| | |
| --- | --- |
| Send | `POST https://graph.facebook.com/{apiVersion}/{phoneNumberId}/messages`, `Authorization: Bearer`, `application/json` |
| Template request | `messaging_product: whatsapp`, `recipient_type: individual`, `to`, `type: template`, `template: { name, language: { code }, components: [{ type: body, parameters: [{ type: text, text }] }] }` |
| Text request | `type: text`, `text: { preview_url, body }` |
| Response | `contacts[].{input, wa_id}`, `messages[].id` (and `message_status` only for template pacing) |
| Initial status | queued: the response proves acceptance, not delivery |
| Status webhook | `entry[].changes[].value.statuses[]` with `id`, `status`, `timestamp`, `recipient_id`, and `errors[]` when it failed |
| Error fields | `errors[].code`, `title`, `message`, `error_data.details` |
| Signature | `X-Hub-Signature-256: sha256=<hex>`, HMAC-SHA-256 of the **raw** body with the app secret |

Statuses map `sent` → sent, `delivered` → delivered, `read` → delivered, `failed` → failed; anything
else is ignored. Meta documents no status query, so `status()` answers from the last webhook and
throws `status_unavailable` otherwise. The GET subscription handshake (`hub.mode`,
`hub.verify_token`, `hub.challenge`) is **not implemented here**; a host mounts it.

### SMTP (email)

Standard: RFC 5321 §4.1.1 (envelope) and RFC 5322 §3.6 (message format).

| | |
| --- | --- |
| Message | `From`, `To`, `Subject`, `Date`, `Message-ID`, `MIME-Version: 1.0`, `Content-Type: text/plain; charset=utf-8`, `Content-Transfer-Encoding: 8bit`, blank line, body; CRLF endings, trailing CRLF |
| Envelope | `MAIL FROM` the configured address, `RCPT TO` the recipient |
| Status | accepted by the server → sent; refused → `rejected` with the server's reply |
| Webhook | none |

**No SMTP socket client ships here.** This repo has no SMTP dependency and the brief forbids adding
one, so the adapter takes an injected `SmtpTransport` whose `deliver` performs the conversation
(`nodemailer`, a local relay, a provider's submission API). A relay password belongs to that
transport, not to a setting. The generated `Message-ID` is this repo's construction (**draft**: SMTP
assigns none) in RFC 5322 syntax. A bounce arrives as a DSN message this adapter does not read, so
`verifyWebhook` says so and refuses rather than pretending.

## Webhook authenticity

| Provider | What proves a delivery |
| --- | --- |
| Twilio | HMAC-SHA-1 `X-Twilio-Signature` — documented; verified with `hmacSha1Base64`, compared constant-time |
| WhatsApp | HMAC-SHA-256 `X-Hub-Signature-256` over the raw body — documented; compared constant-time |
| Africa's Talking | **nothing in the payload.** The provider documents no signature, so this repo's protection is a source-address allowlist (`atDeliveryReportIpAllowlist`); with none configured, every report is refused. **Draft:** the allowlist arrangement is ours, not a provider feature |
| SMTP | nothing; it has no delivery webhook |

`verifyWebhook` and `parseWebhook` are separate: a caller verifies once, then reads the reports out
of a body it has proved genuine. Parsing does not verify by itself.

The allowlist reads `x-forwarded-for` (first address) or `x-real-ip`, so the proxy in front of the
hub must **overwrite** those headers rather than append to what a caller sent; otherwise a caller
chooses its own source address and the allowlist proves nothing.

The HMAC helpers are plain TypeScript because `crypto.subtle` is not available in this repo's jsdom
test environment and a Node import would break the browser bundle. They are tested against RFC 4231
and RFC 2202 vectors; the provider signature checks are tested against Node's own `createHmac` as an
independent oracle. Twilio recommends its SDKs for signature validation; this is a local
implementation of the algorithm it documents.

## Configuration

Settings are the non-secret values declared in `plugin.json`: the selected provider, sender ids, the
Africa's Talking username and base URL, the allowlist, the Twilio account SID / sender / Messaging
Service / callback URL, the WhatsApp phone number id / API version / language, and the SMTP from
address, name and Message-ID domain.

Credentials are **not** settings, because a setting lives in the institution's database row and is
readable through the app. `MessagingSecrets` carries `africastalkingApiKey`, `twilioAuthToken`,
`whatsappAccessToken` and `whatsappAppSecret`, and the host reads them from the deployment
configuration (the same posture as the M-Pesa plug-in). `createMessagingProvider` refuses a missing
setting by name at construction, rather than failing at the first send.

One plug-in with a `provider` setting, not one plug-in per adapter: the outbox, template renderer
and dead-letter view are written once, and a school changes provider by changing a setting. A
per-adapter manifest would duplicate the outbox and split the dead-letter view.

## Testing

`npx vitest run src/plugins/messaging` runs 78 tests and touches no network. `__tests__/fixtures.ts`
lists every recorded payload with the documentation page it was transcribed from, the values this
repo chose, and anything inferred; a test asserts that provenance. **No payload was captured from a
live provider**, and no message was sent.

Not covered here: cost tracking (spec 06 §9 mentions it; the task did not ask for it), retry jitter,
permanent-versus-transient failures, DSN bounce parsing, WhatsApp named template parameters and the
subscription handshake, and registration in `BuiltinLoader.ts` (outside this task's file ownership).

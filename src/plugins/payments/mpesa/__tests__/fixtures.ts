// ABOUTME: The recorded M-Pesa payloads the contract tests read, each with where it was recorded
// ABOUTME: from and which values were changed, so a test asserts against a real shape and says so.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Vitest runs with the repository root as its working directory, so the fixtures are resolved from
// there rather than from `import.meta.url`.
const FIXTURES = resolve(process.cwd(), 'src/plugins/payments/mpesa/__tests__/fixtures');

/** How a fixture was obtained. */
export type PayloadSource =
  /** Transcribed from the payload Safaricom publishes for the API in the Daraja documentation. */
  | 'daraja-documentation';

/** What a recorded payload is, and where it came from. */
export interface RecordedPayload {
  readonly name: string;
  readonly file: string;
  readonly source: PayloadSource;
  /** The Daraja API the payload belongs to, as the documentation names it. */
  readonly api: string;
  /** The documentation page the shape was transcribed from. */
  readonly recordedFrom: string;
  /** The field names and shapes that are documented and were not changed. */
  readonly documented: string;
  /** The values that are this repo's own rather than the documentation's sample, and why. */
  readonly substituted: readonly string[];
  /** Anything that is not in the documentation at all and was inferred. */
  readonly inferred: readonly string[];
}

const DOCS = 'https://developer.safaricom.co.ke';

/**
 * Every recorded payload the M-Pesa tests read.
 *
 * **No payload here was captured from a live Daraja sandbox**: this environment has no route to
 * `sandbox.safaricom.co.ke`, and a test may not call the network. Each payload is the sample body
 * Safaricom publishes for the API in the Daraja documentation, transcribed by hand field for
 * field. The `substituted` list names every value that is this repo's own rather than the
 * documentation's, and `inferred` names anything not in the documentation at all — so a reader can
 * tell a documented field from a value this repo chose.
 */
export const RECORDED_PAYLOADS: readonly RecordedPayload[] = [
  {
    name: 'stk-push-request',
    file: 'stk-push-request.json',
    source: 'daraja-documentation',
    api: 'Lipa na M-Pesa Online Payment (STK Push) — request',
    recordedFrom: `${DOCS} — the STK Push request sample`,
    documented:
      'BusinessShortCode, Password, Timestamp, TransactionType, Amount, PartyA, PartyB, PhoneNumber, CallBackURL, AccountReference, TransactionDesc',
    substituted: [
      'AccountReference: "GA/2027/001" — the sample body says "Test"; an admission number is what a school quotes',
      'Amount: "1500" — the sample body says "1"',
      'TransactionDesc: "Term 1 fees" — the sample body says "Test"',
    ],
    inferred: [],
  },
  {
    name: 'stk-push-response',
    file: 'stk-push-response.json',
    source: 'daraja-documentation',
    api: 'Lipa na M-Pesa Online Payment (STK Push) — response',
    recordedFrom: `${DOCS} — the STK Push response sample`,
    documented:
      'MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription, CustomerMessage',
    substituted: [],
    inferred: [],
  },
  {
    name: 'stk-callback-success',
    file: 'stk-callback-success.json',
    source: 'daraja-documentation',
    api: 'Lipa na M-Pesa Online Payment (STK Push) — callback, success',
    recordedFrom: `${DOCS} — the STK Push callback sample with ResultCode 0`,
    documented:
      'Body.stkCallback.MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata.Item[].Name, CallbackMetadata.Item[].Value',
    substituted: ['CallbackMetadata Amount: 1500 — the sample body says 1.00'],
    inferred: [],
  },
  {
    name: 'stk-callback-cancelled',
    file: 'stk-callback-cancelled.json',
    source: 'daraja-documentation',
    api: 'Lipa na M-Pesa Online Payment (STK Push) — callback, failure',
    recordedFrom: `${DOCS} — the STK Push callback failure shape (ResultCode 1032, "Request cancelled by user")`,
    documented:
      'the callback carries no CallbackMetadata when it fails, so a failed push has no Amount, no MpesaReceiptNumber and no TransactionDate',
    substituted: [],
    inferred: [],
  },
  {
    name: 'c2b-confirmation',
    file: 'c2b-confirmation.json',
    source: 'daraja-documentation',
    api: 'Customer to Business (C2B) — confirmation callback',
    recordedFrom: `${DOCS} — the C2B confirmation callback sample`,
    documented:
      'TransactionType, TransID, TransTime, TransAmount, BusinessShortCode, BillRefNumber, InvoiceNumber, OrgAccountBalance, ThirdPartyTransID, MSISDN, FirstName, MiddleName, LastName',
    substituted: ['TransAmount: "1500" — the sample body says "10"'],
    inferred: [],
  },
  {
    name: 'c2b-validation',
    file: 'c2b-validation.json',
    source: 'daraja-documentation',
    api: 'Customer to Business (C2B) — validation callback',
    recordedFrom: `${DOCS} — the C2B validation callback sample, which is byte-identical to the confirmation sample`,
    documented:
      'every field of the confirmation callback; the two bodies differ only in the URL they are posted to',
    substituted: ['TransAmount: "1500" — the sample body says "10"'],
    inferred: [],
  },
  {
    name: 'b2c-request',
    file: 'b2c-request.json',
    source: 'daraja-documentation',
    api: 'Business to Customer (B2C) — request',
    recordedFrom: `${DOCS} — the B2C request sample`,
    documented:
      'InitiatorName, SecurityCredential, CommandID, Amount, PartyA, PartyB, Remarks, QueueTimeOutURL, ResultURL, Occasion',
    substituted: [
      'Amount: "500" — the sample body says "10"',
      'Remarks/Occasion: "Deposit refund on transfer" — the sample body says "Test remarks"/"Test"',
    ],
    inferred: [],
  },
  {
    name: 'b2c-response',
    file: 'b2c-response.json',
    source: 'daraja-documentation',
    api: 'Business to Customer (B2C) — response',
    recordedFrom: `${DOCS} — the B2C response sample`,
    documented: 'ConversationID, OriginatorConversationID, ResponseCode, ResponseDescription',
    substituted: [],
    inferred: [],
  },
  {
    name: 'b2c-result-success',
    file: 'b2c-result-success.json',
    source: 'daraja-documentation',
    api: 'Business to Customer (B2C) — result callback, success',
    recordedFrom: `${DOCS} — the B2C result callback sample`,
    documented:
      'Result.ResultType, ResultCode, ResultDesc, OriginatorConversationID, ConversationID, TransactionID, ResultParameters.ResultParameter[].Key/Value (TransactionAmount, TransactionReceipt, ReceiverPartyPublicName, TransactionCompletedDateTime, and the B2C*AvailableFunds keys), ReferenceData.ReferenceItem',
    substituted: ['TransactionAmount: 500 — the sample body says 10'],
    inferred: [],
  },
  {
    name: 'b2c-timeout',
    file: 'b2c-timeout.json',
    source: 'daraja-documentation',
    api: 'Business to Customer (B2C) — timeout callback',
    recordedFrom: `${DOCS} — the B2C queue-timeout callback shape (ResultType 1, "The request is timed out.")`,
    documented: 'Result.ResultType 1 marks a timeout; the callback carries no ResultParameters',
    substituted: [],
    inferred: [],
  },
  {
    name: 'oauth-token',
    file: 'oauth-token.json',
    source: 'daraja-documentation',
    api: 'OAuth — generate access token, success',
    recordedFrom: `${DOCS} — the OAuth token response sample`,
    documented: 'access_token, expires_in (a string, not a number, in the sample)',
    substituted: [],
    inferred: [],
  },
  {
    name: 'oauth-refused',
    file: 'oauth-refused.json',
    source: 'daraja-documentation',
    api: 'OAuth — generate access token, refused',
    recordedFrom: `${DOCS} — the OAuth error shape (requestId, errorCode, errorMessage)`,
    documented: 'requestId, errorCode, errorMessage',
    substituted: [],
    inferred: [],
  },
  {
    name: 'stk-query-success',
    file: 'stk-query-success.json',
    source: 'daraja-documentation',
    api: 'Lipa na M-Pesa Online Query (STK Push Query) — a completed charge',
    recordedFrom: `${DOCS} — the STK Push Query response sample with ResultCode "0"`,
    documented: 'ResponseCode, ResponseDescription, MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc',
    substituted: [],
    inferred: [
      'the query carries no Amount and no MpesaReceiptNumber, so a completed charge is recorded for the amount that was charged rather than an amount read from the query',
    ],
  },
  {
    name: 'stk-query-pending',
    file: 'stk-query-pending.json',
    source: 'daraja-documentation',
    api: 'Lipa na M-Pesa Online Query (STK Push Query) — still processing',
    recordedFrom: `${DOCS} — the STK Push Query response while a request is being processed (ResultCode "500.001.1001")`,
    documented: 'ResponseCode, ResponseDescription, MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc',
    substituted: [],
    inferred: [],
  },
];

/** The exact text of a recorded payload. */
export function readPayload(name: string): string {
  const entry = RECORDED_PAYLOADS.find((payload) => payload.name === name);
  if (!entry) throw new Error(`there is no recorded payload named "${name}"`);
  return readFileSync(resolve(FIXTURES, entry.file), 'utf8');
}

/** A recorded payload as an object. */
export function payload(name: string): Record<string, unknown> {
  return JSON.parse(readPayload(name)) as Record<string, unknown>;
}

/**
 * A recorded payload with named values replaced.
 *
 * A test that needs a payload the school's own data can match — a C2B payment whose `BillRefNumber`
 * is a real admission number — says so here rather than inventing a body, so the shape stays the
 * recorded one and only the named values move.
 */
export function withSubstitutions(
  name: string,
  substitutions: Readonly<Record<string, string>>
): Record<string, unknown> {
  const base = payload(name);
  return substitute(base, substitutions) as Record<string, unknown>;
}

function substitute(value: unknown, substitutions: Readonly<Record<string, string>>): unknown {
  if (
    (typeof value === 'string' || typeof value === 'number') &&
    substitutions[String(value)] !== undefined
  ) {
    return substitutions[String(value)];
  }
  if (Array.isArray(value)) return value.map((entry) => substitute(entry, substitutions));
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = substitute(entry, substitutions);
    }
    return result;
  }
  return value;
}

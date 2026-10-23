// ABOUTME: The mapping from Daraja's payloads to the seam's normalised notification: the STK push
// ABOUTME: callback, the C2B validation and confirmation callbacks, and the B2C result callback.
// ABOUTME: Every field here comes from a payload recorded in __tests__/fixtures, and the fixtures say
// ABOUTME: where each was recorded from.

import { fromMajor, toDecimalString, type CurrencyCode, type Money } from '@/domain/money';
import type {
  ProviderNotification,
  ProviderTransactionStatus,
  WebhookAck,
} from '@/domain/finance/payments/providers';

/**
 * The callback routes the plugin is delivered on.
 *
 * These are the plugin's own routes, not Daraja's: the server that terminates the webhook mounts
 * them and registers the full URLs with Daraja. The route is what tells the C2B validation callback
 * from the confirmation callback, whose bodies are byte-identical.
 */
export const MPESA_ROUTES = {
  stk: '/webhooks/mpesa/stk',
  c2bValidation: '/webhooks/mpesa/c2b/validation',
  c2bConfirmation: '/webhooks/mpesa/c2b/confirmation',
  b2cResult: '/webhooks/mpesa/b2c/result',
  b2cTimeout: '/webhooks/mpesa/b2c/timeout',
} as const;

/** Which of the five deliveries a request is. */
export type MpesaRouteName = 'stk' | 'c2b_validation' | 'c2b_confirmation' | 'b2c_result' | 'b2c_timeout';

/**
 * The route name a delivery arrived on, or null when the path is not one of the plugin's.
 *
 * The query string is ignored, so the callback token the URL carries does not affect the match.
 */
export function routeNameOf(route: string): MpesaRouteName | null {
  const path = route.split('?')[0]?.split('#')[0] ?? '';
  switch (path) {
    case MPESA_ROUTES.stk:
      return 'stk';
    case MPESA_ROUTES.c2bValidation:
      return 'c2b_validation';
    case MPESA_ROUTES.c2bConfirmation:
      return 'c2b_confirmation';
    case MPESA_ROUTES.b2cResult:
      return 'b2c_result';
    case MPESA_ROUTES.b2cTimeout:
      return 'b2c_timeout';
    default:
      return null;
  }
}

/** The route name a body looks like, when the path did not name one. */
export function routeNameOfBody(body: Record<string, unknown>): MpesaRouteName | null {
  const inner = asObject(body.Body);
  if (inner && asObject(inner.stkCallback)) return 'stk';
  if (asObject(body.Result)) return 'b2c_result';
  if (typeof body.TransID === 'string') return 'c2b_confirmation';
  return null;
}

/**
 * The notification a delivery carries, or null when it is not a Daraja payload.
 *
 * `fallbackNow` is the instant used when a payload's own timestamp cannot be read: the money moved
 * at a time the provider stated, but a value date that cannot be parsed must not become a value
 * date of 1970.
 */
export function parseDarajaNotification(
  route: string,
  body: string,
  options: {
    readonly providerId: string;
    readonly currency: CurrencyCode;
    readonly fallbackNow: string;
  }
): ProviderNotification | null {
  const payload = parseObject(body);
  if (!payload) return null;
  const name = routeNameOf(route) ?? routeNameOfBody(payload);
  if (!name) return null;

  switch (name) {
    case 'stk':
      return stkNotification(payload, options);
    case 'c2b_validation':
      return c2bNotification(payload, 'validation', options);
    case 'c2b_confirmation':
      return c2bNotification(payload, 'collection', options);
    case 'b2c_result':
    case 'b2c_timeout':
      return b2cNotification(payload, options);
  }
}

/** The body the plugin answers a C2B validation callback with. */
export function mpesaValidationAck(accepted: boolean, reason?: string): WebhookAck {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ResultCode: accepted ? 0 : 1,
      ResultDesc: accepted ? 'Accepted' : reason ?? 'Rejected',
    }),
  };
}

/** The body the plugin answers a C2B confirmation callback with. */
export function mpesaConfirmationAck(): WebhookAck {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
  };
}

// ------------------------------------------------------------------ the three flows

/**
 * The STK push callback.
 *
 * A success carries a `CallbackMetadata.Item` array; a failure carries only the result code and its
 * description, so a failed push has no amount and no receipt, which the notification says with nulls
 * rather than zeroes.
 */
function stkNotification(
  payload: Record<string, unknown>,
  options: { readonly providerId: string; readonly currency: CurrencyCode; readonly fallbackNow: string }
): ProviderNotification | null {
  const inner = asObject(asObject(payload.Body)?.stkCallback);
  if (!inner) return null;
  const transactionId = asString(inner.CheckoutRequestID);
  if (!transactionId) return null;

  const resultCode = asNumber(inner.ResultCode);
  const metadata = asObject(inner.CallbackMetadata);
  const item = (name: string) => itemValue(metadata, name);

  const amountText = item('Amount');
  const amount = amountText === null ? null : parseAmount(amountText, options.currency);
  const receipt = item('MpesaReceiptNumber');

  return {
    providerId: options.providerId,
    kind: 'collection',
    transactionId,
    receipt: receipt === null ? null : String(receipt),
    amount,
    payer: {
      name: null,
      phone: item('PhoneNumber') === null ? null : String(item('PhoneNumber')),
      account: null,
    },
    occurredAt: readInstant(item('TransactionDate'), options.fallbackNow),
    status: statusFromResultCode(resultCode),
    failureReason:
      statusFromResultCode(resultCode) === 'succeeded' ? null : asString(inner.ResultDesc),
    raw: payload,
  };
}

/**
 * The C2B callback, which the validation and the confirmation URLs both receive.
 *
 * `TransID` is both the transaction id and the M-Pesa receipt: a paybill payment is identified by
 * the receipt the payer is told. `BillRefNumber` is the account the payer quoted — the admission
 * number — and is what auto-match reads.
 */
function c2bNotification(
  payload: Record<string, unknown>,
  kind: 'validation' | 'collection',
  options: { readonly providerId: string; readonly currency: CurrencyCode; readonly fallbackNow: string }
): ProviderNotification | null {
  const transactionId = asString(payload.TransID);
  if (!transactionId) return null;
  const amountText = asString(payload.TransAmount);
  const amount = amountText === null ? null : parseAmount(amountText, options.currency);

  return {
    providerId: options.providerId,
    kind,
    transactionId,
    receipt: transactionId,
    amount,
    payer: {
      name: personName(payload.FirstName, payload.MiddleName, payload.LastName),
      phone: asString(payload.MSISDN),
      account: asString(payload.BillRefNumber),
    },
    occurredAt: readInstant(asString(payload.TransTime), options.fallbackNow),
    status: 'succeeded',
    failureReason: null,
    raw: payload,
  };
}

/**
 * The B2C result callback, which carries a refund's outcome.
 *
 * The transaction id is the `OriginatorConversationID` the caller supplied, because that is what
 * the result echoes back; `ConversationID` is the provider's own. The amount, the receipt and the
 * time are in `ResultParameters.ResultParameter`, an array of `{Key, Value}` pairs.
 */
function b2cNotification(
  payload: Record<string, unknown>,
  options: { readonly providerId: string; readonly currency: CurrencyCode; readonly fallbackNow: string }
): ProviderNotification | null {
  const result = asObject(payload.Result);
  if (!result) return null;
  const transactionId =
    asString(result.OriginatorConversationID) ?? asString(result.ConversationID);
  if (!transactionId) return null;

  const parameters = asObject(result.ResultParameters);
  const parameter = (key: string) => resultParameter(parameters, key);

  const amountText = parameter('TransactionAmount');
  const amount = amountText === null ? null : parseAmount(amountText, options.currency);
  const publicName = parameter('ReceiverPartyPublicName');

  const resultType = asNumber(result.ResultType);
  const resultCode = asNumber(result.ResultCode);
  const status = resultType === 1 ? 'failed' : statusFromResultCode(resultCode);

  return {
    providerId: options.providerId,
    kind: 'refund',
    transactionId,
    receipt: asString(parameter('TransactionReceipt')) ?? asString(result.TransactionID),
    amount,
    payer: payerFromPublicName(publicName),
    occurredAt: readInstant(parameter('TransactionCompletedDateTime'), options.fallbackNow, 'dotted'),
    status,
    failureReason: status === 'succeeded' ? null : asString(result.ResultDesc),
    raw: payload,
  };
}

// ------------------------------------------------------------------ result codes

/**
 * What a Daraja result code means.
 *
 * The codes are the documented ones: 0 succeeded; 1032 the payer cancelled; 1037 the phone was
 * unreachable and the request timed out; 1 there were not enough funds; 2001 the PIN was wrong;
 * 1019 the request expired. A callback reports an outcome, so this never returns `pending`; the
 * query API's pending code is a string and is read by {@link statusFromQueryCode}.
 */
export function statusFromResultCode(code: number | null): ProviderTransactionStatus {
  if (code === null) return 'failed';
  if (code === 0) return 'succeeded';
  if (code === 1032) return 'cancelled';
  return 'failed';
}

/** The status of an STK push query, whose result code is a string and holds a pending code. */
export function statusFromQueryCode(code: string | null): ProviderTransactionStatus {
  if (code === null) return 'failed';
  if (code === '0') return 'succeeded';
  if (code === '1032') return 'cancelled';
  if (code.startsWith('500.001')) return 'pending';
  return 'failed';
}

// ------------------------------------------------------------------ helpers

/** A JSON object from a body, or null when the body is not one. */
export function parseObject(body: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** The amount a payload states, in the institution's currency. */
function parseAmount(text: string | number, currency: CurrencyCode) {
  try {
    return fromMajor(text, currency);
  } catch {
    return null;
  }
}

/** One `CallbackMetadata.Item` value, or null. */
function itemValue(
  metadata: Record<string, unknown> | null,
  name: string
): string | number | null {
  if (!metadata) return null;
  const items = metadata.Item;
  if (!Array.isArray(items)) return null;
  for (const entry of items) {
    const item = asObject(entry);
    if (item && asString(item.Name) === name) {
      const value = item.Value;
      if (typeof value === 'string' || typeof value === 'number') return value;
      return null;
    }
  }
  return null;
}

/** One `ResultParameters.ResultParameter` value, or null. */
function resultParameter(
  parameters: Record<string, unknown> | null,
  key: string
): string | number | null {
  if (!parameters) return null;
  const entries = parameters.ResultParameter;
  if (!Array.isArray(entries)) return null;
  for (const entry of entries) {
    const item = asObject(entry);
    if (item && asString(item.Key) === key) {
      const value = item.Value;
      if (typeof value === 'string' || typeof value === 'number') return value;
      return null;
    }
  }
  return null;
}

/** A payer's name from the name parts a C2B callback carries. */
function personName(...parts: unknown[]): string | null {
  const words = parts
    .map((part) => asString(part))
    .filter((part): part is string => part !== null);
  return words.length > 0 ? words.join(' ') : null;
}

/**
 * The payer of a B2C payment, from the `ReceiverPartyPublicName` the result carries.
 *
 * Daraja writes it as `254708374149 - John Doe`: the phone, a separator, then the name.
 */
function payerFromPublicName(publicName: string | number | null): {
  name: string | null;
  phone: string | null;
  account: null;
} {
  if (publicName === null) return { name: null, phone: null, account: null };
  const text = String(publicName);
  const separator = text.indexOf(' - ');
  if (separator < 0) return { name: text, phone: null, account: null };
  return {
    name: text.slice(separator + 3).trim() || null,
    phone: text.slice(0, separator).trim() || null,
    account: null,
  };
}

/**
 * An ISO instant from a Daraja timestamp.
 *
 * `compact` is `YYYYMMDDHHmmss` (the STK callback's `TransactionDate` and the C2B `TransTime`);
 * `dotted` is `DD.MM.YYYY HH:mm:ss` (the B2C result's `TransactionCompletedDateTime`). Both are
 * Nairobi local time, which is UTC+3 all year.
 */
export function readInstant(
  value: string | number | null,
  fallback: string,
  shape: 'compact' | 'dotted' = 'compact'
): string {
  if (value === null) return fallback;
  const text = String(value).trim();
  const parts =
    shape === 'compact'
      ? /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(text)
      : /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
  if (!parts) return fallback;
  const [year, month, day, hour, minute, second] =
    shape === 'compact'
      ? [parts[1], parts[2], parts[3], parts[4], parts[5], parts[6]]
      : [parts[3], parts[2], parts[1], parts[4], parts[5], parts[6]];
  const utc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  const instant = new Date(utc - 3 * 60 * 60 * 1000);
  return Number.isNaN(instant.getTime()) ? fallback : instant.toISOString();
}

/** A value as an object, or null. */
function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** A value as a non-empty string, or null. */
function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

/** A value as a finite number, or null. */
function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/**
 * An amount as Daraja's own amount text.
 *
 * Daraja's samples write a whole-shilling amount as `"1"` and a part-shilling one as `"10.50"`, so
 * the trailing zeros of a whole amount are dropped: `1500.00` is sent as `1500`. Nothing is rounded;
 * only a fraction that is exactly zero is trimmed.
 */
export function darajaAmountText(amount: Money): string {
  const text = toDecimalString(amount);
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

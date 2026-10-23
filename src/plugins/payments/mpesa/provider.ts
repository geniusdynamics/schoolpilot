// ABOUTME: The M-Pesa Daraja provider: the payment-provider seam implemented against Safaricom's
// ABOUTME: documented protocol - the STK push, the C2B validation and confirmation callbacks, the B2C
// ABOUTME: refund and its result callback, the STK push query, and the rules it states about its own
// ABOUTME: signatures and idempotency.

import type { CurrencyCode } from '@/domain/money';
import {
  ProviderError,
  type CollectionRequest,
  type CollectionResponse,
  type PaymentProvider,
  type ProviderIdentity,
  type ProviderIdempotencyRules,
  type ProviderNotification,
  type RefundRequest,
  type RefundResponse,
  type SignatureRule,
  type StatementDialect,
  type TransactionReference,
  type TransactionStatus,
  type WebhookAck,
  type WebhookInput,
  type WebhookVerification,
} from '@/domain/finance/payments/providers';

import {
  DarajaClient,
  createFetchTransport,
  type HttpTransport,
} from './daraja';
import type { DarajaCredentials } from './credentials';
import {
  MPESA_ROUTES,
  darajaAmountText,
  mpesaConfirmationAck,
  mpesaValidationAck,
  parseDarajaNotification,
  parseObject,
  statusFromQueryCode,
} from './payloads';

/** The id this provider is known by, in the event ledger and in a payment's provenance. */
export const MPESA_PROVIDER_ID = 'mpesa-daraja';

/** What the provider is built with. */
export interface MpesaProviderOptions {
  readonly credentials: DarajaCredentials;
  /** How HTTP calls are made. Tests inject a recorder; production uses `fetch`. */
  readonly transport?: HttpTransport;
  /** The currency the paybill collects in. M-Pesa Kenya collects Kenyan shillings. */
  readonly currency?: CurrencyCode;
  readonly now?: () => Date;
}

/** The provider, with the client it talks to exposed for a caller that wants it. */
export interface MpesaProvider extends PaymentProvider {
  readonly client: DarajaClient;
  readonly currency: CurrencyCode;
}

/**
 * Builds the M-Pesa Daraja provider.
 *
 * The transport is injected, so nothing in this module decides how a call is made and no test
 * reaches the network: a test hands in a transport that returns a recorded response and records the
 * request it was given.
 */
export function createMpesaProvider(options: MpesaProviderOptions): MpesaProvider {
  const currency: CurrencyCode = options.currency ?? 'KES';
  const clock = options.now ?? (() => new Date());
  const client = new DarajaClient({
    credentials: options.credentials,
    transport: options.transport ?? createFetchTransport(),
    now: clock,
  });

  return {
    client,
    currency,

    describe(): ProviderIdentity {
      return {
        id: MPESA_PROVIDER_ID,
        name: 'M-Pesa (Safaricom Daraja)',
        capabilities: {
          collection: true,
          notification: true,
          refund: true,
          query: true,
          statement: true,
        },
      };
    },

    /**
     * How a Daraja callback is made trustworthy.
     *
     * The honest answer is that **the callback body carries no signature**: Daraja posts a plain
     * JSON body to a URL the merchant registered, and there is no HMAC or signing key on it. What
     * actually protects the endpoint is (a) the secret token the merchant puts in the registered
     * callback URL, which is checked here when one is configured, and (b) the source-address
     * allowlist, checked when one is configured. When neither is configured this says `none` rather
     * than pretending a check happened.
     */
    signature(): SignatureRule {
      if (options.credentials.callbackToken) {
        return {
          scheme: 'shared_token',
          headerNames: ['x-callback-token'],
          description:
            'the callback URL carries a secret token that is compared on every delivery; the body itself is unsigned',
        };
      }
      if (options.credentials.sourceIpAllowlist.length > 0) {
        return {
          scheme: 'ip_allowlist',
          headerNames: ['x-forwarded-for', 'x-real-ip'],
          description:
            'the delivery must come from an allowed source address; the body itself is unsigned',
        };
      }
      return {
        scheme: 'none',
        headerNames: [],
        description:
          'Daraja does not sign a callback body; no callback token and no source allowlist are configured, so a delivery is trusted by its URL alone',
      };
    },

    /**
     * What M-Pesa says about its own idempotency.
     *
     * Daraja documents no retry: a callback is posted once and a lost one is lost, which is why the
     * STK push query exists. Duplicates are still collapsed, because a delivery can be replayed (a
     * proxy retry, an operator re-posting a captured payload) and because spec 05 §5.1 requires a
     * webhook to be idempotent by the provider transaction id whatever the provider does.
     */
    idempotency(): ProviderIdempotencyRules {
      return {
        retries: false,
        keyFields: ['CheckoutRequestID', 'TransID', 'OriginatorConversationID'],
        description:
          'a delivery is identified by the provider transaction id: CheckoutRequestID for an STK push, TransID for a C2B payment, OriginatorConversationID for a B2C refund',
      };
    },

    idempotencyKey(notification: ProviderNotification): string {
      return `${MPESA_PROVIDER_ID}:${notification.transactionId}`;
    },

    verifyWebhook(input: WebhookInput): WebhookVerification {
      const token = options.credentials.callbackToken;
      if (token) {
        const provided = tokenFromRoute(input.route) ?? input.headers['x-callback-token'] ?? '';
        if (provided !== token) {
          return {
            valid: false,
            reason: `the callback token on ${input.route} does not match the configured one; refusing the delivery`,
          };
        }
      }
      const allowlist = options.credentials.sourceIpAllowlist;
      if (allowlist.length > 0) {
        const source = sourceAddress(input.headers);
        if (source === null || !allowlist.includes(source)) {
          return {
            valid: false,
            reason: `the delivery to ${input.route} came from ${source ?? 'an unknown address'}, which is not in the configured allowlist`,
          };
        }
      }
      return {
        valid: true,
        reason:
          token || allowlist.length > 0
            ? 'the configured callback token and source address matched'
            : 'M-Pesa does not sign a callback body; the delivery is trusted by its registered URL',
      };
    },

    parseNotification(input: WebhookInput): ProviderNotification | null {
      return parseDarajaNotification(input.route, input.body, {
        providerId: MPESA_PROVIDER_ID,
        currency,
        fallbackNow: clock().toISOString(),
      });
    },

    /** Sends an STK push: a payment request to the payer's phone. */
    async initiateCharge(request: CollectionRequest): Promise<CollectionResponse> {
      const response = await client.stkPush({
        amount: darajaAmountText(request.amount),
        phone: normaliseMsisdn(request.phone),
        accountReference: request.accountReference,
        description: request.description,
        callbackUrl: request.callbackUrl,
      });
      const transactionId = text(response.CheckoutRequestID);
      if (transactionId === null) {
        throw new ProviderError(
          'charge_refused',
          `Daraja accepted the STK push but named no CheckoutRequestID: ${describe(response)}`,
          { detail: { responseCode: text(response.ResponseCode) } }
        );
      }
      const accepted = text(response.ResponseCode) === '0';
      if (!accepted) {
        throw new ProviderError(
          'charge_refused',
          `Daraja refused the STK push: ${describe(response)}`,
          { detail: { responseCode: text(response.ResponseCode), transactionId } }
        );
      }
      return {
        transactionId,
        status: 'pending',
        message: text(response.CustomerMessage) ?? text(response.ResponseDescription),
        raw: response,
      };
    },

    /** Sends a B2C payment out: how a refund leaves the paybill. */
    async refund(request: RefundRequest): Promise<RefundResponse> {
      const response = await client.b2c({
        amount: darajaAmountText(request.amount),
        phone: normaliseMsisdn(request.phone),
        remarks: request.description,
        resultUrl: request.resultUrl,
        timeoutUrl: request.timeoutUrl,
      });
      const transactionId =
        text(response.OriginatorConversationID) ?? text(response.ConversationID);
      if (transactionId === null) {
        throw new ProviderError(
          'refund_refused',
          `Daraja accepted the B2C request but named no conversation id: ${describe(response)}`,
          { detail: { responseCode: text(response.ResponseCode) } }
        );
      }
      if (text(response.ResponseCode) !== '0') {
        throw new ProviderError('refund_refused', `Daraja refused the B2C refund: ${describe(response)}`, {
          detail: { responseCode: text(response.ResponseCode), transactionId },
        });
      }
      return {
        transactionId,
        status: 'pending',
        message: text(response.ResponseDescription),
        raw: response,
      };
    },

    /**
     * Asks what became of an STK push.
     *
     * This is the offline fallback: a device that was offline when the callback fired never got it,
     * and Daraja does not re-send, so on reconnect the charge is queried. The query answers the
     * outcome only - it carries no amount and no receipt - so the amount a payment is recorded for
     * comes from the charge the caller initiated, not from this response.
     */
    async queryTransaction(reference: TransactionReference): Promise<TransactionStatus> {
      const response = await client.stkPushQuery({
        checkoutRequestId: reference.transactionId,
      });
      const status = statusFromQueryCode(text(response.ResultCode));
      return {
        transactionId: text(response.CheckoutRequestID) ?? reference.transactionId,
        status,
        amount: null,
        receipt: reference.receipt ?? null,
        payer: { name: null, phone: null, account: null },
        occurredAt: null,
        message: text(response.ResultDesc) ?? text(response.ResponseDescription),
        raw: response,
      };
    },

    /**
     * What the plugin knows about an M-Pesa statement export.
     *
     * The reconciliation module parses the file; this only says what it looks like. The columns are
     * the ones the M-Pesa portal's CSV export writes; **this shape was not recorded from the
     * sandbox** and is marked as such, unlike the callback payloads in the fixtures.
     */
    statementDialect(): StatementDialect {
      return {
        supported: true,
        format: 'csv',
        columns: [
          'Receipt No.',
          'Completion Time',
          'Details',
          'Transaction Status',
          'Paid In',
          'Withdrawn',
          'Balance',
        ],
        headerSignature: 'Receipt No.',
        notes:
          'the M-Pesa portal statement export; the payer quotes the admission number in the Details column, which the reconciliation module reads as the reference. This header was not recorded from the sandbox.',
      };
    },

    acknowledgeNotification(input: {
      readonly kind: ProviderNotification['kind'];
      readonly accepted: boolean;
      readonly reason?: string;
    }): WebhookAck {
      if (input.kind === 'validation') return mpesaValidationAck(input.accepted, input.reason);
      return mpesaConfirmationAck();
    },
  };
}

/** The callback URL the server registers with Daraja, with the token when one is configured. */
export function mpesaCallbackUrl(
  credentials: DarajaCredentials,
  route: string
): string {
  const base = (credentials.callbackBaseUrl ?? '').replace(/\/+$/, '');
  const token = credentials.callbackToken
    ? `?token=${encodeURIComponent(credentials.callbackToken)}`
    : '';
  return `${base}${route}${token}`;
}

/** The routes a caller registers, in one place. */
export const MPESA_REGISTERED_ROUTES = [
  MPESA_ROUTES.c2bValidation,
  MPESA_ROUTES.c2bConfirmation,
  MPESA_ROUTES.b2cResult,
  MPESA_ROUTES.b2cTimeout,
] as const;

/**
 * A Kenyan mobile number in the form Daraja wants: `2547XXXXXXXX`.
 *
 * The three forms a caller may hold are accepted: the local `07XXXXXXXX`, the international
 * `+2547XXXXXXXX` and the already-normalised `2547XXXXXXXX`. Anything else is refused rather than
 * guessed at, because a wrong number sends money to a stranger.
 */
export function normaliseMsisdn(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (/^254\d{9}$/.test(digits)) return digits;
  if (/^0\d{9}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  throw new ProviderError(
    'payload_invalid',
    `"${phone}" is not a Kenyan mobile number; give 07XXXXXXXX, +2547XXXXXXXX or 2547XXXXXXXX`,
    { detail: { phone } }
  );
}

/** The token a callback URL carries, when it carries one. */
function tokenFromRoute(route: string): string | null {
  const query = route.split('?')[1];
  if (!query) return null;
  for (const pair of query.split('&')) {
    const [key, value] = pair.split('=');
    if (key === 'token' && value) return decodeURIComponent(value);
  }
  return null;
}

/** The first source address a delivery carries, from the proxy headers a hub sits behind. */
function sourceAddress(headers: Readonly<Record<string, string>>): string | null {
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers['x-real-ip']?.trim() ?? null;
}

/** A payload value as text, or null. */
function text(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

/** The provider's own words for a failure, without echoing the request body. */
function describe(response: Record<string, unknown>): string {
  const code = text(response.ResponseCode) ?? text(response.errorCode);
  const message =
    text(response.ResponseDescription) ??
    text(response.CustomerMessage) ??
    text(response.errorMessage);
  return `${code ?? 'unknown code'}: ${message ?? 'no description'}`;
}

/** Parses a recorded callback body, for a caller that wants the raw object. */
export function readCallbackBody(body: string): Record<string, unknown> | null {
  return parseObject(body);
}

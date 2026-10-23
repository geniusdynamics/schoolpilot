// ABOUTME: The payment-provider seam: what any provider must implement to initiate a charge,
// ABOUTME: receive a payment notification, refund and be queried, the normalised notification the
// ABOUTME: rest of the system sees, and the rules a provider states about its own idempotency and
// ABOUTME: its signatures. Spec 05 §5.1 names this interface; a provider that cannot do one of the
// ABOUTME: five things says so rather than pretending.

import type { Money } from '@/domain/money';

/**
 * The five things a provider may be able to do.
 *
 * A provider that cannot do one of them declares `false` here and its method refuses with
 * `capability_unsupported`, so a caller can ask before it calls instead of catching an error it
 * did not expect. Nothing is silently degraded: a provider that cannot refund does not return an
 * empty refund.
 */
export interface ProviderCapabilities {
  /** Initiate a charge: an STK push, a payment link, a card intent. */
  readonly collection: boolean;
  /** Receive a payment notification: a callback, or the result of a status query. */
  readonly notification: boolean;
  /** Issue a refund of money already collected. */
  readonly refund: boolean;
  /** Ask the provider what became of a transaction. The fallback when a callback never arrived. */
  readonly query: boolean;
  /** Export a statement the reconciliation module can import. */
  readonly statement: boolean;
}

/** Who a provider is, and what it can do. */
export interface ProviderIdentity {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
}

/** What a provider says became of one transaction. */
export type ProviderTransactionStatus = 'succeeded' | 'failed' | 'pending' | 'cancelled';

/** The payer as the provider reports them. */
export interface ProviderPayer {
  readonly name: string | null;
  /** The phone the money moved from, in the provider's own form (M-Pesa: `2547…`). */
  readonly phone: string | null;
  /**
   * The account the payer quoted. On a paybill this is the reference that identifies who the money
   * is for — for a school, the admission number — and it is what auto-match reads.
   */
  readonly account: string | null;
}

/** What a provider's callback or query tells the system about one transaction. */
export interface ProviderNotification {
  readonly providerId: string;
  /**
   * `collection` is money in; `validation` is the provider asking whether to accept a payment
   * before it moves (the C2B validation callback); `refund` is money out.
   */
  readonly kind: 'collection' | 'validation' | 'refund';
  /** The provider's own transaction id: the thing an identical delivery repeats. */
  readonly transactionId: string;
  /** The provider's receipt number, when the notification carries one. */
  readonly receipt: string | null;
  /** Null on a notification that carries no amount (a failed STK callback). */
  readonly amount: Money | null;
  readonly payer: ProviderPayer;
  /** When the provider says the money moved, an ISO instant; the notification's arrival time otherwise. */
  readonly occurredAt: string;
  readonly status: ProviderTransactionStatus;
  /** The provider's own words for a failure, kept verbatim. */
  readonly failureReason: string | null;
  /** The exact payload, kept so a human can see what the provider said. */
  readonly raw: unknown;
}

/**
 * A delivery to verify: the route it arrived on, the headers and the raw body.
 *
 * `route` is required because it is the only thing that tells two identical bodies apart. M-Pesa's
 * C2B validation and confirmation callbacks are byte-identical and are distinguished solely by the
 * URL Safaricom posts them to; the server that terminates the webhook knows which route it is, and
 * so the route is part of the input rather than something a provider guesses.
 */
export interface WebhookInput {
  /** The callback path the request arrived on, e.g. `/webhooks/mpesa/c2b/confirmation`. */
  readonly route: string;
  readonly headers: Readonly<Record<string, string>>;
  /** The raw body exactly as received. */
  readonly body: string;
}

/** Whether a delivery is trusted, and why not when it is not. */
export interface WebhookVerification {
  readonly valid: boolean;
  readonly reason: string;
}

/**
 * What to answer a delivery with.
 *
 * M-Pesa's C2B validation callback expects a JSON body back saying whether the payment is
 * accepted, so the seam answers through the provider rather than through provider-shaped code in
 * the webhook route.
 */
export interface WebhookAck {
  readonly status: number;
  readonly contentType: string;
  readonly body: string;
}

/** How a provider's callbacks are made trustworthy. */
export type SignatureScheme =
  /** The body carries no signature at all; the provider's own protocol supplies none. */
  | 'none'
  /** A secret token the merchant placed in the callback URL, or a header the sender echoes. */
  | 'shared_token'
  /** An HMAC over the raw body with a shared secret. */
  | 'hmac_sha256'
  /** The sender's source address must be in an allowlist. */
  | 'ip_allowlist'
  /** The sender authenticates with an OAuth bearer token (an outbound API call, not a callback). */
  | 'oauth_bearer';

/** The signature rule a provider uses, stated so an operator knows what actually protects it. */
export interface SignatureRule {
  readonly scheme: SignatureScheme;
  /** The headers the rule reads. Empty when the rule reads the route or the source address. */
  readonly headerNames: readonly string[];
  readonly description: string;
}

/** What a provider says about its own idempotency. */
export interface ProviderIdempotencyRules {
  /** True when the provider retries or re-sends a delivery, so a duplicate must collapse. */
  readonly retries: boolean;
  /** The payload fields the idempotency key is built from, named as the provider names them. */
  readonly keyFields: readonly string[];
  readonly description: string;
}

/** What a caller asks a provider to charge. */
export interface CollectionRequest {
  readonly amount: Money;
  /** What the payer quotes to identify who the money is for: the admission number. */
  readonly accountReference: string;
  readonly phone: string;
  readonly description: string;
  readonly callbackUrl: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** What a provider said when asked to charge. */
export interface CollectionResponse {
  /** The provider's transaction id, the key every later notification repeats. */
  readonly transactionId: string;
  readonly status: ProviderTransactionStatus;
  readonly message: string | null;
  readonly raw: unknown;
}

/** What a caller asks a provider to refund. */
export interface RefundRequest {
  readonly amount: Money;
  readonly phone: string;
  readonly description: string;
  /** Where the provider posts the result of the refund. */
  readonly resultUrl: string;
  /** Where the provider posts a refund that timed out. */
  readonly timeoutUrl: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** What a provider said when asked to refund. */
export interface RefundResponse {
  readonly transactionId: string;
  readonly status: ProviderTransactionStatus;
  readonly message: string | null;
  readonly raw: unknown;
}

/** Which transaction a caller is asking about. */
export interface TransactionReference {
  readonly transactionId: string;
  readonly receipt?: string | null;
}

/** What a provider said about a transaction it was asked about. */
export interface TransactionStatus {
  readonly transactionId: string;
  readonly status: ProviderTransactionStatus;
  /** Null when the query does not carry the amount (M-Pesa's STK push query does not). */
  readonly amount: Money | null;
  readonly receipt: string | null;
  readonly payer: ProviderPayer;
  readonly occurredAt: string | null;
  readonly message: string | null;
  readonly raw: unknown;
}

/**
 * What a provider knows about the statement file it can export.
 *
 * The reconciliation module (P3-D04) owns statement parsing; a provider contributes the dialect
 * its own export uses, so the importer can read it. This is the `parseStatement` half of spec 05
 * §5.1: the module parses, the provider says what the file looks like. A provider with no export
 * says `supported: false`.
 */
export interface StatementDialect {
  readonly supported: boolean;
  readonly format: 'csv' | 'ofx' | null;
  /** The column names of the export, in order. */
  readonly columns: readonly string[];
  /** The header line the export starts with, so a caller can recognise the file. */
  readonly headerSignature: string | null;
  readonly notes: string | null;
}

/**
 * What any payment provider must implement.
 *
 * `initiateCharge` is spec 05 §5.1's `createCollectionRequest`, `verifyWebhook` is its
 * `verifyWebhook`, `refund` is its `refund`, and `statementDialect` is its `parseStatement` (the
 * module parses; the provider describes the file). `parseNotification`, `queryTransaction`,
 * `idempotency` and `signature` are what the C2B/STK/B2C flows and webhook idempotency need on top.
 */
export interface PaymentProvider {
  /** Who the provider is and what it can do. */
  describe(): ProviderIdentity;
  /** How the provider's callbacks are made trustworthy. */
  signature(): SignatureRule;
  /** What the provider says about its own idempotency. */
  idempotency(): ProviderIdempotencyRules;
  /**
   * The key an identical delivery repeats and a status update changes.
   *
   * The key is the provider's transaction id, namespaced by the provider. An identical re-delivery
   * carries the same key *and* the same payload; a status update carries the same key and a
   * different payload. The intake tells the two apart by hashing the payload.
   */
  idempotencyKey(notification: ProviderNotification): string;
  /** Whether a delivery is trusted, and why not when it is not. */
  verifyWebhook(input: WebhookInput): WebhookVerification;
  /** The notification a delivery carries, or null when it is not one of this provider's. */
  parseNotification(input: WebhookInput): ProviderNotification | null;
  /** Initiate a charge. Refuses with `capability_unsupported` when `collection` is false. */
  initiateCharge(request: CollectionRequest): Promise<CollectionResponse>;
  /** Issue a refund. Refuses with `capability_unsupported` when `refund` is false. */
  refund(request: RefundRequest): Promise<RefundResponse>;
  /** Ask what became of a transaction. Refuses with `capability_unsupported` when `query` is false. */
  queryTransaction(reference: TransactionReference): Promise<TransactionStatus>;
  /** What the provider knows about its statement export. */
  statementDialect(): StatementDialect;
  /**
   * The body to answer a delivery with, when the provider's protocol expects one.
   *
   * Optional, and absent means "answer nothing": only a protocol that waits for an answer (M-Pesa's
   * C2B validation callback) needs it, and a provider whose callbacks are fire-and-forget does not
   * implement it.
   */
  acknowledgeNotification?(input: {
    readonly kind: ProviderNotification['kind'];
    readonly accepted: boolean;
    readonly reason?: string;
  }): WebhookAck;
}

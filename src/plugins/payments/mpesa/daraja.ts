// ABOUTME: The Daraja API client: OAuth token handling, the STK push request, the C2B URL
// ABOUTME: registration, the B2C refund request and the STK push query, all over an injected
// ABOUTME: transport so nothing here decides how an HTTP call is actually made.

import { ProviderError } from '@/domain/finance/payments/providers';

import type { DarajaCredentials } from './credentials';
import { requireB2cCredentials } from './credentials';

/** One outbound call. */
export interface HttpRequest {
  readonly method: 'GET' | 'POST';
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  /** The JSON body, already serialised. Absent on a GET. */
  readonly body?: string;
}

/** One response, with its body as text. */
export interface HttpResponse {
  readonly status: number;
  readonly body: string;
}

/**
 * How an HTTP call is made.
 *
 * This is the seam the tests inject a recorder into, so no test calls the network: the client is
 * given a transport that returns a recorded response and records the request it was handed.
 */
export interface HttpTransport {
  send(request: HttpRequest): Promise<HttpResponse>;
}

/** The base URLs of the two Daraja deployments. */
export const DARAJA_BASE_URLS = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke',
} as const;

/** A transport over the platform's `fetch`. The production path; never used by a test. */
export function createFetchTransport(
  fetchImpl: typeof fetch = globalThis.fetch
): HttpTransport {
  return {
    async send(request: HttpRequest): Promise<HttpResponse> {
      const response = await fetchImpl(request.url, {
        method: request.method,
        headers: { ...request.headers },
        ...(request.body === undefined ? {} : { body: request.body }),
      });
      return { status: response.status, body: await response.text() };
    },
  };
}

/** What the client is built with. */
export interface DarajaClientOptions {
  readonly credentials: DarajaCredentials;
  readonly transport: HttpTransport;
  readonly now?: () => Date;
}

/** The OAuth token and when it stops being usable. */
interface AccessToken {
  readonly token: string;
  /** Epoch milliseconds the token must be discarded at, a minute before the provider's own expiry. */
  readonly expiresAt: number;
}

/**
 * The Daraja API.
 *
 * Every method is a thin request: it builds the documented body, sends it through the transport,
 * and hands back the parsed response. Nothing is cached but the OAuth token, which Daraja issues
 * for an hour and which a client reuses across calls.
 */
export class DarajaClient {
  private readonly credentials: DarajaCredentials;
  private readonly transport: HttpTransport;
  private readonly clock: () => Date;
  private readonly baseUrl: string;
  private token: AccessToken | null = null;

  constructor(options: DarajaClientOptions) {
    this.credentials = options.credentials;
    this.transport = options.transport;
    this.clock = options.now ?? (() => new Date());
    this.baseUrl = DARAJA_BASE_URLS[options.credentials.environment];
  }

  /** The paybill the money is collected into. */
  get shortCode(): string {
    return this.credentials.shortCode;
  }

  /**
   * The OAuth access token, reused until a minute before it expires.
   *
   * Daraja answers a bad key with 400 and a body naming the failure; that is a `credentials_missing`
   * refusal here, because a caller that got this far has a key and the key is wrong.
   */
  async accessToken(): Promise<string> {
    const now = this.clock().getTime();
    if (this.token && this.token.expiresAt > now) return this.token.token;

    const basic = base64(
      `${this.credentials.consumerKey}:${this.credentials.consumerSecret}`
    );
    const response = await this.send({
      method: 'GET',
      url: `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      headers: { Authorization: `Basic ${basic}`, Accept: 'application/json' },
    });
    const payload = parseJson(response, 'the OAuth token');
    const token = asString(payload.access_token);
    if (response.status >= 400 || token === null) {
      throw new ProviderError(
        'credentials_missing',
        `Daraja refused the OAuth token: ${describeFailure(response, payload)}`,
        { detail: { status: response.status, environment: this.credentials.environment } }
      );
    }
    const seconds = Number(payload.expires_in);
    const lifetime = Number.isFinite(seconds) && seconds > 0 ? seconds : 3599;
    this.token = { token, expiresAt: now + Math.max(lifetime - 60, 30) * 1000 };
    return token;
  }

  /** The Lipa na M-Pesa password: base64 of the short code, the passkey and the timestamp. */
  password(timestamp: string): string {
    return base64(`${this.credentials.shortCode}${this.credentials.passkey}${timestamp}`);
  }

  /**
   * Sends an STK push: a payment request to the payer's phone.
   *
   * The response's `CheckoutRequestID` is the transaction id every later callback repeats, so it is
   * what the intake keys idempotency on.
   */
  async stkPush(request: StkPushRequest): Promise<Record<string, unknown>> {
    const timestamp = request.timestamp ?? nairobiTimestamp(this.clock());
    const body = {
      BusinessShortCode: this.credentials.shortCode,
      Password: this.password(timestamp),
      Timestamp: timestamp,
      TransactionType: request.transactionType ?? 'CustomerPayBillOnline',
      Amount: request.amount,
      PartyA: request.phone,
      PartyB: this.credentials.shortCode,
      PhoneNumber: request.phone,
      CallBackURL: request.callbackUrl,
      AccountReference: request.accountReference,
      TransactionDesc: request.description,
    };
    return this.post('/mpesa/stkpush/v1/processrequest', body, 'the STK push');
  }

  /** Asks what became of an STK push. The fallback when its callback never arrived. */
  async stkPushQuery(request: StkPushQueryRequest): Promise<Record<string, unknown>> {
    const timestamp = request.timestamp ?? nairobiTimestamp(this.clock());
    return this.post(
      '/mpesa/stkpushquery/v1/query',
      {
        BusinessShortCode: this.credentials.shortCode,
        Password: this.password(timestamp),
        Timestamp: timestamp,
        CheckoutRequestID: request.checkoutRequestId,
      },
      'the STK push query'
    );
  }

  /** Registers the C2B validation and confirmation URLs with the paybill. */
  async registerC2bUrls(request: RegisterC2bRequest): Promise<Record<string, unknown>> {
    return this.post(
      '/mpesa/c2b/v1/registerurl',
      {
        ShortCode: this.credentials.shortCode,
        ResponseType: request.responseType ?? 'Completed',
        ConfirmationURL: request.confirmationUrl,
        ValidationURL: request.validationUrl,
      },
      'the C2B URL registration'
    );
  }

  /** Sends a B2C payment out: how a refund leaves the paybill. */
  async b2c(request: B2cRequest): Promise<Record<string, unknown>> {
    const { initiatorName, securityCredential } = requireB2cCredentials(this.credentials);
    return this.post(
      '/mpesa/b2c/v1/paymentrequest',
      {
        InitiatorName: initiatorName,
        SecurityCredential: securityCredential,
        CommandID: request.commandId ?? 'BusinessPayment',
        Amount: request.amount,
        PartyA: this.credentials.shortCode,
        PartyB: request.phone,
        Remarks: request.remarks,
        QueueTimeOutURL: request.timeoutUrl,
        ResultURL: request.resultUrl,
        Occasion: request.occasion ?? request.remarks,
      },
      'the B2C refund'
    );
  }

  /** Asks Daraja for the status of a transaction it holds. */
  async transactionStatus(request: TransactionStatusRequest): Promise<Record<string, unknown>> {
    const { initiatorName, securityCredential } = requireB2cCredentials(this.credentials);
    return this.post(
      '/mpesa/transactionstatus/v1/query',
      {
        Initiator: initiatorName,
        SecurityCredential: securityCredential,
        CommandID: request.commandId ?? 'TransactionStatusQuery',
        TransactionID: request.transactionId,
        PartyA: this.credentials.shortCode,
        IdentifierType: request.identifierType ?? '4',
        ResultURL: request.resultUrl,
        QueueTimeOutURL: request.timeoutUrl,
        Remarks: request.remarks ?? 'status query',
        Occasion: request.occasion ?? 'status query',
      },
      'the transaction status query'
    );
  }

  private async post(
    path: string,
    body: Record<string, unknown>,
    what: string
  ): Promise<Record<string, unknown>> {
    const token = await this.accessToken();
    const response = await this.send({
      method: 'POST',
      url: `${this.baseUrl}${path}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = parseJson(response, what);
    if (response.status >= 400) {
      throw new ProviderError(
        'transport',
        `Daraja refused ${what}: ${describeFailure(response, payload)}`,
        { detail: { status: response.status, path } }
      );
    }
    return payload;
  }

  private async send(request: HttpRequest): Promise<HttpResponse> {
    try {
      return await this.transport.send(request);
    } catch (error) {
      throw new ProviderError('transport', `the call to ${request.url} failed`, {
        cause: error,
        detail: { url: request.url, method: request.method },
      });
    }
  }
}

/** An STK push, as the client sends it. */
export interface StkPushRequest {
  /** The amount as Daraja's own decimal text, e.g. `"1500"` or `"1500.50"`. */
  readonly amount: string;
  readonly phone: string;
  readonly accountReference: string;
  readonly description: string;
  readonly callbackUrl: string;
  readonly transactionType?: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline';
  /** Overrides the timestamp, which a test pins so its request is reproducible. */
  readonly timestamp?: string;
}

/** An STK push query, as the client sends it. */
export interface StkPushQueryRequest {
  readonly checkoutRequestId: string;
  readonly timestamp?: string;
}

/** A C2B URL registration, as the client sends it. */
export interface RegisterC2bRequest {
  readonly validationUrl: string;
  readonly confirmationUrl: string;
  readonly responseType?: 'Completed' | 'Cancelled';
}

/** A B2C payment, as the client sends it. */
export interface B2cRequest {
  /** The amount as Daraja's own decimal text. */
  readonly amount: string;
  readonly phone: string;
  readonly remarks: string;
  readonly resultUrl: string;
  readonly timeoutUrl: string;
  readonly occasion?: string;
  readonly commandId?: 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment';
}

/** A transaction status query, as the client sends it. */
export interface TransactionStatusRequest {
  readonly transactionId: string;
  readonly resultUrl: string;
  readonly timeoutUrl: string;
  readonly commandId?: 'TransactionStatusQuery' | 'AccountBalance';
  readonly identifierType?: '1' | '2' | '4';
  readonly remarks?: string;
  readonly occasion?: string;
}

/**
 * A Nairobi timestamp, `YYYYMMDDHHmmss`.
 *
 * Kenya is UTC+3 the whole year and has never observed daylight saving, so the local time is the
 * UTC time shifted by three hours and no timezone database is needed to compute it.
 */
export function nairobiTimestamp(now: Date): string {
  const nairobi = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  return (
    `${nairobi.getUTCFullYear()}${pad(nairobi.getUTCMonth() + 1)}${pad(nairobi.getUTCDate())}` +
    `${pad(nairobi.getUTCHours())}${pad(nairobi.getUTCMinutes())}${pad(nairobi.getUTCSeconds())}`
  );
}

/** Base64 of a UTF-8 string, in the browser and in Node alike. */
function base64(text: string): string {
  const buffer = (globalThis as { Buffer?: { from(input: string): { toString(enc: string): string } } })
    .Buffer;
  if (buffer) return buffer.from(text).toString('base64');
  return globalThis.btoa(text);
}

/** The parsed body of a response, or a `transport` refusal naming what could not be read. */
function parseJson(response: HttpResponse, what: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(response.body);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error('the body is not a JSON object');
  } catch (error) {
    throw new ProviderError(
      'transport',
      `Daraja answered ${what} with ${response.status} and a body that is not JSON`,
      { cause: error, detail: { status: response.status, body: response.body.slice(0, 500) } }
    );
  }
}

/** The provider's own words for a failure, without leaking the credentials. */
function describeFailure(response: HttpResponse, payload: Record<string, unknown>): string {
  const code = asString(payload.errorCode) ?? asString(payload.ResponseCode);
  const message =
    asString(payload.errorMessage) ??
    asString(payload.ResponseDescription) ??
    asString(payload.ResultDesc);
  if (code || message) return `${code ?? 'unknown code'}: ${message ?? 'no description'}`;
  return `HTTP ${response.status} with no described reason`;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

// ABOUTME: Contract tests for the M-Pesa Daraja plug-in against recorded payloads: the STK push and
// ABOUTME: its callback, the C2B confirmation and validation callbacks, the B2C refund and its result
// ABOUTME: callback, the OAuth token and the STK push query. No test reaches the network: the
// ABOUTME: transport is injected and every call is answered from a recorded payload.

import { afterEach, describe, expect, it } from 'vitest';

import { ProviderError, isProviderError } from '@/domain/finance/payments/providers';

import { loadDarajaCredentials, redactDarajaCredentials } from '../credentials';
import { DarajaClient, nairobiTimestamp } from '../daraja';
import { MPESA_ROUTES, parseDarajaNotification, readInstant } from '../payloads';
import {
  createMpesaProvider,
  normaliseMsisdn,
  MPESA_PROVIDER_ID,
  mpesaCallbackUrl,
} from '../provider';
import { RECORDED_PAYLOADS, payload, readPayload } from './fixtures';
import { createRecorderTransport, requestBody, type RecorderTransport } from './recorder';

/** A fixed clock, so a timestamp the client builds is reproducible. */
const CLOCK = () => new Date('2023-10-31T09:39:59.000Z');
const NAIROBI = '20231031123959';

/** Credentials with a token and a source allowlist, so every check the plugin makes is exercised. */
const CREDENTIALS = loadDarajaCredentials({
  DARAJA_ENVIRONMENT: 'sandbox',
  DARAJA_CONSUMER_KEY: 'test-consumer-key',
  DARAJA_CONSUMER_SECRET: 'test-consumer-secret',
  DARAJA_SHORT_CODE: '174379',
  DARAJA_PASSKEY: 'test-passkey',
  DARAJA_INITIATOR_NAME: 'testapi',
  DARAJA_SECURITY_CREDENTIAL: 'test-security-credential',
  DARAJA_CALLBACK_BASE_URL: 'https://school.example.test',
  DARAJA_CALLBACK_TOKEN: 'callback-token-1',
  DARAJA_SOURCE_IP_ALLOWLIST: '196.201.214.200',
});

/**
 * The original `fetch`, restored after every test.
 *
 * The tests below replace it with a function that throws, so a flow that quietly reached the
 * network would fail loudly instead of passing on a machine that happens to be online.
 */
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function providerWith(transport: RecorderTransport) {
  return createMpesaProvider({ credentials: CREDENTIALS, transport, now: CLOCK });
}

/** A transport whose queue is the OAuth token, the answer to one call, in that order. */
function withToken(answer: string, status = 200): RecorderTransport {
  return createRecorderTransport([
    { body: readPayload('oauth-token') },
    { status, body: answer },
  ]);
}

describe('the recorded payloads', () => {
  it('every fixture says where it was recorded from, and that no live sandbox was reached', () => {
    expect(RECORDED_PAYLOADS.length).toBeGreaterThanOrEqual(14);
    for (const recorded of RECORDED_PAYLOADS) {
      expect(recorded.source).toBe('daraja-documentation');
      expect(recorded.recordedFrom).toContain('developer.safaricom.co.ke');
      expect(recorded.documented.length).toBeGreaterThan(0);
      // A payload is either the documentation's sample unchanged or names what was substituted.
      expect(Array.isArray(recorded.substituted)).toBe(true);
      expect(Array.isArray(recorded.inferred)).toBe(true);
      expect(readPayload(recorded.name).length).toBeGreaterThan(0);
    }
  });

  it('names the values this repo substituted rather than the documentation sample', () => {
    const stk = RECORDED_PAYLOADS.find((entry) => entry.name === 'stk-push-request');
    expect(stk?.substituted.join(' ')).toContain('AccountReference');
    const query = RECORDED_PAYLOADS.find((entry) => entry.name === 'stk-query-success');
    expect(query?.inferred.join(' ')).toContain('no Amount and no MpesaReceiptNumber');
  });
});

describe('the OAuth token', () => {
  it('is fetched once and reused, from the recorded token response', async () => {
    const transport = createRecorderTransport([{ body: readPayload('oauth-token') }]);
    const provider = providerWith(transport);
    await provider.client.accessToken();
    await provider.client.accessToken();
    expect(transport.callsTo('/oauth/v1/generate?grant_type=client_credentials')).toHaveLength(1);
    const request = transport.calls[0];
    expect(request?.method).toBe('GET');
    expect(request?.headers.Authorization).toMatch(/^Basic /);
    // The basic credential is the key and secret, and the header is the only place they appear.
    expect(
      Buffer.from(String(request?.headers.Authorization).slice('Basic '.length), 'base64').toString()
    ).toBe('test-consumer-key:test-consumer-secret');
  });

  it('refuses with credentials_missing when Daraja rejects the key', async () => {
    const transport = createRecorderTransport([
      { status: 400, body: readPayload('oauth-refused') },
    ]);
    const provider = providerWith(transport);
    await expect(provider.client.accessToken()).rejects.toMatchObject({
      code: 'credentials_missing',
    });
  });
});

describe('the STK push', () => {
  it('builds the documented request from the recorded shape and reads the CheckoutRequestID', async () => {
    const transport = withToken(readPayload('stk-push-response'));
    const provider = providerWith(transport);
    const response = await provider.initiateCharge({
      amount: { amount_minor: 150_000, currency: 'KES' },
      accountReference: 'GA/2027/001',
      phone: '0708374149',
      description: 'Term 1 fees',
      callbackUrl: 'https://school.example.test/webhooks/mpesa/stk?token=callback-token-1',
    });

    expect(response.transactionId).toBe('ws_CO_191220191020363925');
    expect(response.status).toBe('pending');

    const body = requestBody(transport.callsTo('/mpesa/stkpush/v1/processrequest')[0]);
    const documented = payload('stk-push-request');
    // Every field of the recorded request is present, and the fields that are ours carry our values.
    expect(Object.keys(body).sort()).toEqual(Object.keys(documented).sort());
    expect(body.BusinessShortCode).toBe('174379');
    expect(body.PartyB).toBe('174379');
    expect(body.TransactionType).toBe('CustomerPayBillOnline');
    expect(body.AccountReference).toBe('GA/2027/001');
    expect(body.Amount).toBe('1500');
    expect(body.PhoneNumber).toBe('254708374149');
    expect(body.PartyA).toBe('254708374149');
    expect(body.Timestamp).toBe(NAIROBI);
    // The password is base64 of the short code, the passkey and the timestamp, as Daraja documents.
    expect(Buffer.from(String(body.Password), 'base64').toString()).toBe(
      `174379test-passkey${NAIROBI}`
    );
  });

  it('refuses with charge_refused when Daraja will not accept it', async () => {
    const transport = withToken(
      JSON.stringify({
        ResponseCode: '1',
        ResponseDescription: 'The initiator information is invalid',
        MerchantRequestID: '29115-34620561-1',
        CheckoutRequestID: 'ws_CO_191220191020363925',
      })
    );
    const provider = providerWith(transport);
    await expect(
      provider.initiateCharge({
        amount: { amount_minor: 150_000, currency: 'KES' },
        accountReference: 'GA/2027/001',
        phone: '254708374149',
        description: 'Term 1 fees',
        callbackUrl: 'https://school.example.test/webhooks/mpesa/stk',
      })
    ).rejects.toMatchObject({ code: 'charge_refused' });
  });
});

describe('the STK push callback', () => {
  it('reads the amount, the receipt, the phone and the time from the recorded success callback', () => {
    const notification = parseDarajaNotification(
      MPESA_ROUTES.stk,
      readPayload('stk-callback-success'),
      { providerId: MPESA_PROVIDER_ID, currency: 'KES', fallbackNow: '2027-01-01T00:00:00.000Z' }
    );
    expect(notification).toMatchObject({
      kind: 'collection',
      transactionId: 'ws_CO_191220191020363925',
      receipt: 'NLJ7RT61SV',
      amount: { amount_minor: 150_000, currency: 'KES' },
      status: 'succeeded',
      failureReason: null,
      payer: { phone: '254708374149', name: null, account: null },
    });
    // 2019-12-19 10:21:15 in Nairobi is 07:21:15Z: the recorded time is local, and EAT is UTC+3.
    expect(notification?.occurredAt).toBe('2019-12-19T07:21:15.000Z');
  });

  it('reports a cancelled push as cancelled, with no amount and no receipt', () => {
    const notification = parseDarajaNotification(
      MPESA_ROUTES.stk,
      readPayload('stk-callback-cancelled'),
      { providerId: MPESA_PROVIDER_ID, currency: 'KES', fallbackNow: '2027-01-01T00:00:00.000Z' }
    );
    expect(notification).toMatchObject({
      status: 'cancelled',
      amount: null,
      receipt: null,
      failureReason: 'Request cancelled by user',
    });
  });
});

describe('the C2B callbacks', () => {
  it('reads the receipt, the amount, the payer and the account reference from the confirmation', () => {
    const notification = parseDarajaNotification(
      MPESA_ROUTES.c2bConfirmation,
      readPayload('c2b-confirmation'),
      { providerId: MPESA_PROVIDER_ID, currency: 'KES', fallbackNow: '2027-01-01T00:00:00.000Z' }
    );
    expect(notification).toMatchObject({
      kind: 'collection',
      transactionId: 'RKTQDM7W6S',
      // For a C2B payment the TransID is the receipt the payer is told.
      receipt: 'RKTQDM7W6S',
      amount: { amount_minor: 150_000, currency: 'KES' },
      status: 'succeeded',
      payer: { account: '1234', phone: '254708374149', name: 'John J Doe' },
    });
    expect(notification?.occurredAt).toBe('2019-11-22T03:38:45.000Z');
  });

  it('tells the validation callback from the confirmation callback by the route', () => {
    const validation = parseDarajaNotification(
      MPESA_ROUTES.c2bValidation,
      readPayload('c2b-validation'),
      { providerId: MPESA_PROVIDER_ID, currency: 'KES', fallbackNow: '2027-01-01T00:00:00.000Z' }
    );
    const confirmation = parseDarajaNotification(
      MPESA_ROUTES.c2bConfirmation,
      readPayload('c2b-confirmation'),
      { providerId: MPESA_PROVIDER_ID, currency: 'KES', fallbackNow: '2027-01-01T00:00:00.000Z' }
    );
    // The two recorded bodies are identical; only the route they arrive on differs.
    expect(readPayload('c2b-validation')).toBe(readPayload('c2b-confirmation'));
    expect(validation?.kind).toBe('validation');
    expect(confirmation?.kind).toBe('collection');
  });

  it('answers a validation callback with the documented ack', () => {
    const provider = providerWith(createRecorderTransport());
    const accepted = provider.acknowledgeNotification?.({ kind: 'validation', accepted: true });
    const refused = provider.acknowledgeNotification?.({
      kind: 'validation',
      accepted: false,
      reason: 'unknown account',
    });
    expect(JSON.parse(String(accepted?.body))).toEqual({ ResultCode: 0, ResultDesc: 'Accepted' });
    expect(JSON.parse(String(refused?.body))).toEqual({ ResultCode: 1, ResultDesc: 'unknown account' });
  });
});

describe('the B2C refund and its result', () => {
  it('builds the documented request and keys the refund on the conversation id', async () => {
    const transport = withToken(readPayload('b2c-response'));
    const provider = providerWith(transport);
    const response = await provider.refund({
      amount: { amount_minor: 50_000, currency: 'KES' },
      phone: '254708374149',
      description: 'Deposit refund on transfer',
      resultUrl: 'https://school.example.test/webhooks/mpesa/b2c/result',
      timeoutUrl: 'https://school.example.test/webhooks/mpesa/b2c/timeout',
    });
    expect(response.transactionId).toBe('16740-34861180-1');
    expect(response.status).toBe('pending');

    const body = requestBody(transport.callsTo('/mpesa/b2c/v1/paymentrequest')[0]);
    const documented = payload('b2c-request');
    expect(Object.keys(body).sort()).toEqual(Object.keys(documented).sort());
    expect(body.CommandID).toBe('BusinessPayment');
    expect(body.Amount).toBe('500');
    expect(body.PartyA).toBe('174379');
    expect(body.PartyB).toBe('254708374149');
    expect(body.InitiatorName).toBe('testapi');
    expect(body.SecurityCredential).toBe('test-security-credential');
  });

  it('reads the outcome, the receipt, the amount and the payer from the recorded result', () => {
    const notification = parseDarajaNotification(
      MPESA_ROUTES.b2cResult,
      readPayload('b2c-result-success'),
      { providerId: MPESA_PROVIDER_ID, currency: 'KES', fallbackNow: '2027-01-01T00:00:00.000Z' }
    );
    expect(notification).toMatchObject({
      kind: 'refund',
      transactionId: '16740-34861180-1',
      receipt: 'NLJ41HAY6Q',
      amount: { amount_minor: 50_000, currency: 'KES' },
      status: 'succeeded',
      payer: { phone: '254708374149', name: 'John Doe' },
    });
    expect(notification?.occurredAt).toBe('2019-12-19T08:45:50.000Z');
  });

  it('reports the recorded timeout as a failure', () => {
    const notification = parseDarajaNotification(
      MPESA_ROUTES.b2cTimeout,
      readPayload('b2c-timeout'),
      { providerId: MPESA_PROVIDER_ID, currency: 'KES', fallbackNow: '2027-01-01T00:00:00.000Z' }
    );
    expect(notification).toMatchObject({
      kind: 'refund',
      transactionId: '16740-34861180-1',
      status: 'failed',
      amount: null,
      failureReason: 'The request is timed out.',
    });
  });
});

describe('the STK push query', () => {
  it('reads a completed charge from the recorded query response', async () => {
    const transport = withToken(readPayload('stk-query-success'));
    const provider = providerWith(transport);
    const status = await provider.queryTransaction({
      transactionId: 'ws_CO_191220191020363925',
    });
    expect(status).toMatchObject({
      status: 'succeeded',
      // The query carries no amount and no receipt; the recorded payload says so.
      amount: null,
      receipt: null,
      transactionId: 'ws_CO_191220191020363925',
    });
    const body = requestBody(transport.callsTo('/mpesa/stkpushquery/v1/query')[0]);
    expect(body.CheckoutRequestID).toBe('ws_CO_191220191020363925');
    expect(body.BusinessShortCode).toBe('174379');
  });

  it('reports a still-processing charge as pending', async () => {
    const transport = withToken(readPayload('stk-query-pending'));
    const provider = providerWith(transport);
    const status = await provider.queryTransaction({
      transactionId: 'ws_CO_191220191020363925',
    });
    expect(status.status).toBe('pending');
    expect(status.message).toBe('The transaction is being processed');
  });
});

describe('signatures and idempotency', () => {
  it('states that a Daraja callback body is unsigned and how it is checked instead', () => {
    const provider = providerWith(createRecorderTransport());
    expect(provider.signature()).toMatchObject({ scheme: 'shared_token' });
    expect(provider.signature().description).toContain('the body itself is unsigned');
    expect(provider.idempotency()).toMatchObject({ retries: false });
    expect(provider.idempotency().keyFields).toEqual([
      'CheckoutRequestID',
      'TransID',
      'OriginatorConversationID',
    ]);
  });

  it('refuses a delivery whose callback token does not match', () => {
    const provider = providerWith(createRecorderTransport());
    const wrong = provider.verifyWebhook({
      route: `${MPESA_ROUTES.stk}?token=not-the-token`,
      headers: { 'x-forwarded-for': '196.201.214.200' },
      body: readPayload('stk-callback-success'),
    });
    expect(wrong.valid).toBe(false);
    expect(wrong.reason).toContain('does not match');

    const right = provider.verifyWebhook({
      route: `${MPESA_ROUTES.stk}?token=callback-token-1`,
      headers: { 'x-forwarded-for': '196.201.214.200' },
      body: readPayload('stk-callback-success'),
    });
    expect(right.valid).toBe(true);
  });

  it('refuses a delivery from a source address outside the allowlist', () => {
    const provider = providerWith(createRecorderTransport());
    const wrong = provider.verifyWebhook({
      route: `${MPESA_ROUTES.stk}?token=callback-token-1`,
      headers: { 'x-forwarded-for': '203.0.113.9, 196.201.214.200' },
      body: readPayload('stk-callback-success'),
    });
    expect(wrong.valid).toBe(false);

    const right = provider.verifyWebhook({
      route: `${MPESA_ROUTES.stk}?token=callback-token-1`,
      headers: { 'x-forwarded-for': '196.201.214.200' },
      body: readPayload('stk-callback-success'),
    });
    expect(right.valid).toBe(true);
  });

  it('says "none" when nothing is configured to check, rather than pretending', () => {
    const bare = createMpesaProvider({
      credentials: loadDarajaCredentials({
        DARAJA_CONSUMER_KEY: 'k',
        DARAJA_CONSUMER_SECRET: 's',
        DARAJA_SHORT_CODE: '174379',
        DARAJA_PASSKEY: 'p',
      }),
      transport: createRecorderTransport(),
      now: CLOCK,
    });
    expect(bare.signature().scheme).toBe('none');
    expect(bare.signature().description).toContain('trusted by its URL alone');
    expect(bare.verifyWebhook({ route: MPESA_ROUTES.stk, headers: {}, body: '{}' }).valid).toBe(true);
  });

  it('keys a delivery on the provider transaction id', () => {
    const provider = providerWith(createRecorderTransport());
    const notification = parseDarajaNotification(
      MPESA_ROUTES.c2bConfirmation,
      readPayload('c2b-confirmation'),
      { providerId: MPESA_PROVIDER_ID, currency: 'KES', fallbackNow: '2027-01-01T00:00:00.000Z' }
    );
    expect(notification).not.toBeNull();
    expect(provider.idempotencyKey(notification!)).toBe('mpesa-daraja:RKTQDM7W6S');
  });
});

describe('the offline query path', () => {
  it('never reaches the network: a throwing fetch leaves every flow working', async () => {
    globalThis.fetch = (() => {
      throw new Error('a test reached the network');
    }) as unknown as typeof fetch;

    const transport = withToken(readPayload('stk-push-response'));
    const provider = providerWith(transport);
    const response = await provider.initiateCharge({
      amount: { amount_minor: 150_000, currency: 'KES' },
      accountReference: 'GA/2027/001',
      phone: '254708374149',
      description: 'Term 1 fees',
      callbackUrl: 'https://school.example.test/webhooks/mpesa/stk',
    });
    expect(response.transactionId).toBe('ws_CO_191220191020363925');
    // Every call went to the injected recorder, not to fetch.
    expect(transport.calls).toHaveLength(2);
  });

  it('registers the callback URLs under the configured base URL and token', () => {
    expect(mpesaCallbackUrl(CREDENTIALS, MPESA_ROUTES.c2bConfirmation)).toBe(
      'https://school.example.test/webhooks/mpesa/c2b/confirmation?token=callback-token-1'
    );
  });
});

describe('the deployment configuration', () => {
  it('refuses when a required credential is missing, naming it', () => {
    try {
      loadDarajaCredentials({ DARAJA_CONSUMER_KEY: 'k' });
      throw new Error('expected a refusal');
    } catch (error) {
      expect(isProviderError(error)).toBe(true);
      expect((error as ProviderError).code).toBe('credentials_missing');
      expect((error as ProviderError).detail.missing).toContain('DARAJA_CONSUMER_SECRET');
    }
  });

  it('reads the credentials from unprefixed deployment keys, so no bundler inlines them', () => {
    // The keys carry no REACT_APP_/VITE_ prefix: a prefixed variable is inlined into the browser
    // bundle, and a Daraja consumer secret has no business in a browser.
    const redacted = redactDarajaCredentials(CREDENTIALS);
    expect(redacted).toMatchObject({
      environment: 'sandbox',
      shortCode: '174379',
      consumerKey: true,
      consumerSecret: true,
      passkey: true,
      callbackToken: true,
    });
    // The redaction reports only whether a secret is set; the secret itself is nowhere in it.
    expect(JSON.stringify(redacted)).not.toContain('test-consumer-secret');
    expect(JSON.stringify(redacted)).not.toContain('test-passkey');
  });
});

describe('helpers', () => {
  it('normalises the three forms of a Kenyan number and refuses anything else', () => {
    expect(normaliseMsisdn('0708374149')).toBe('254708374149');
    expect(normaliseMsisdn('+254708374149')).toBe('254708374149');
    expect(normaliseMsisdn('254708374149')).toBe('254708374149');
    expect(() => normaliseMsisdn('12345')).toThrow();
  });

  it('reads both Daraja timestamp shapes as Nairobi local time', () => {
    expect(readInstant('20191122063845', 'fallback')).toBe('2019-11-22T03:38:45.000Z');
    expect(readInstant('19.12.2019 11:45:50', 'fallback', 'dotted')).toBe(
      '2019-12-19T08:45:50.000Z'
    );
    expect(readInstant('not a timestamp', 'fallback')).toBe('fallback');
  });

  it('builds a Nairobi timestamp from a UTC instant', () => {
    expect(nairobiTimestamp(new Date('2023-10-31T09:39:59.000Z'))).toBe(NAIROBI);
  });

  it('has a client that reports the short code it collects into', () => {
    const client = new DarajaClient({
      credentials: CREDENTIALS,
      transport: createRecorderTransport(),
      now: CLOCK,
    });
    expect(client.shortCode).toBe('174379');
  });
});

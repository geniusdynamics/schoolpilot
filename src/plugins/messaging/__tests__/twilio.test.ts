// ABOUTME: Contract tests for the Twilio adapter: the documented Messages API request and Message
// ABOUTME: resource response, the status query, the status callback, and the HMAC-SHA-1 signature check
// ABOUTME: verified against Node's own HMAC rather than against the implementation under test.

import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { createTwilioProvider } from '../providers/twilio';
import type { OutboundMessage } from '../types';

import { readPayload } from './fixtures';
import { createRecorderTransport, requestForm } from './recorder';

const CONFIG = {
  accountSid: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  authToken: 'test-auth-token',
  from: '+14155552345',
  statusCallbackUrl: 'https://school.example.test/api/messaging/twilio/status',
};

function message(overrides: Partial<OutboundMessage> = {}): OutboundMessage {
  return {
    channel: 'sms',
    to: '+15551212121',
    body: 'Dear parent, Term 1 fees are due on 15 January.',
    idempotencyKey: 'invoice-2027-001-sms',
    ...overrides,
  };
}

/** The signature Twilio documents: the URL, then every POST parameter sorted by name. */
function twilioSignature(url: string, rawBody: string, authToken: string): string {
  const params = [...new URLSearchParams(rawBody).entries()].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0
  );
  const data = url + params.map(([name, value]) => `${name}${value}`).join('');
  return createHmac('sha1', authToken).update(data).digest('base64');
}

describe('Twilio send', () => {
  it('builds the documented Messages API request and maps the response', async () => {
    const transport = createRecorderTransport([{ body: readPayload('twilio-send-response') }]);
    const provider = createTwilioProvider({ config: CONFIG, transport });

    const result = await provider.send(message());

    const call = transport.calls[0]!;
    expect(call.method).toBe('POST');
    expect(call.url).toBe(
      'https://api.twilio.com/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages.json'
    );
    expect(call.headers.Authorization).toBe(
      `Basic ${btoa(`${CONFIG.accountSid}:${CONFIG.authToken}`)}`
    );
    expect(call.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

    const form = requestForm(call);
    expect(form.get('To')).toBe('+15551212121');
    expect(form.get('From')).toBe('+14155552345');
    expect(form.get('Body')).toBe('Dear parent, Term 1 fees are due on 15 January.');
    expect(form.get('StatusCallback')).toBe(CONFIG.statusCallbackUrl);

    expect(result).toMatchObject({
      providerMessageId: 'SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      status: 'queued',
    });
  });

  it('sends from the message sender over the configured one', async () => {
    const transport = createRecorderTransport([{ body: readPayload('twilio-send-response') }]);
    const provider = createTwilioProvider({ config: CONFIG, transport });

    await provider.send(message({ senderId: '+14155550999' }));

    expect(requestForm(transport.calls[0]).get('From')).toBe('+14155550999');
  });

  it('sends from a messaging service when one is configured instead of a number', async () => {
    const transport = createRecorderTransport([{ body: readPayload('twilio-send-response') }]);
    const provider = createTwilioProvider({
      config: { ...CONFIG, from: undefined, messagingServiceSid: 'MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' },
      transport,
    });

    await provider.send(message());

    const form = requestForm(transport.calls[0]);
    expect(form.get('MessagingServiceSid')).toBe('MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    expect(form.get('From')).toBeNull();
  });

  it('refuses a response with no message id', async () => {
    const transport = createRecorderTransport([{ body: '{"status":"queued"}' }]);
    const provider = createTwilioProvider({ config: CONFIG, transport });

    await expect(provider.send(message())).rejects.toMatchObject({ code: 'rejected' });
  });
});

describe('Twilio status query', () => {
  it('fetches the Message resource and maps a delivered status', async () => {
    const transport = createRecorderTransport([{ body: readPayload('twilio-message-delivered') }]);
    const provider = createTwilioProvider({ config: CONFIG, transport });

    const status = await provider.status('SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

    const call = transport.calls[0]!;
    expect(call.method).toBe('GET');
    expect(call.url).toBe(
      'https://api.twilio.com/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json'
    );
    expect(status).toMatchObject({
      providerMessageId: 'SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      status: 'delivered',
      reason: null,
    });
  });

  it('reports a failure with the provider’s error code and message', async () => {
    const transport = createRecorderTransport([
      {
        body: JSON.stringify({
          sid: 'SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          status: 'undelivered',
          error_code: 30003,
          error_message: 'Unreachable destination handset',
        }),
      },
    ]);
    const provider = createTwilioProvider({ config: CONFIG, transport });

    const status = await provider.status('SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(status.status).toBe('failed');
    expect(status.reason).toBe('30003 Unreachable destination handset');
  });
});

describe('Twilio status callback', () => {
  it('accepts a callback signed with the account auth token', () => {
    const provider = createTwilioProvider({ config: CONFIG, transport: createRecorderTransport() });
    const body = readPayload('twilio-status-callback');
    const signature = twilioSignature(CONFIG.statusCallbackUrl, body, CONFIG.authToken);

    expect(provider.verifyWebhook({ 'X-Twilio-Signature': signature }, body)).toEqual({
      valid: true,
      reason: 'the X-Twilio-Signature header matches the callback URL and parameters',
    });
  });

  it('refuses a callback with the wrong signature or none at all', () => {
    const provider = createTwilioProvider({ config: CONFIG, transport: createRecorderTransport() });
    const body = readPayload('twilio-status-callback');

    const wrong = provider.verifyWebhook({ 'x-twilio-signature': 'not-the-signature' }, body);
    expect(wrong.valid).toBe(false);
    expect(wrong.reason).toContain('X-Twilio-Signature');

    expect(provider.verifyWebhook({}, body).valid).toBe(false);
  });

  it('refuses to verify when no callback URL is configured, because the signature covers it', () => {
    const provider = createTwilioProvider({
      config: { ...CONFIG, statusCallbackUrl: undefined },
      transport: createRecorderTransport(),
    });

    const verification = provider.verifyWebhook(
      { 'x-twilio-signature': 'anything' },
      readPayload('twilio-status-callback')
    );
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('twilioStatusCallbackUrl');
  });

  it('maps a delivered callback', () => {
    const provider = createTwilioProvider({ config: CONFIG, transport: createRecorderTransport() });

    expect(provider.parseWebhook({}, readPayload('twilio-status-callback'))).toEqual([
      {
        providerMessageId: 'SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        status: 'delivered',
        reason: null,
        occurredAt: null,
        raw: expect.anything(),
      },
    ]);
  });

  it('maps an undelivered callback with the error code and message', () => {
    const provider = createTwilioProvider({ config: CONFIG, transport: createRecorderTransport() });

    const reports = provider.parseWebhook({}, readPayload('twilio-status-callback-undelivered'));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      providerMessageId: 'SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      status: 'failed',
      reason: '30003 Unreachable destination handset',
    });
  });

  it('accepts the deprecated SmsSid and SmsStatus names', () => {
    const provider = createTwilioProvider({ config: CONFIG, transport: createRecorderTransport() });

    const reports = provider.parseWebhook(
      {},
      'SmsSid=SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&SmsStatus=sent&AccountSid=ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );
    expect(reports[0]).toMatchObject({
      providerMessageId: 'SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      status: 'sent',
    });
  });

  it('ignores a status it does not recognise', () => {
    const provider = createTwilioProvider({ config: CONFIG, transport: createRecorderTransport() });

    expect(
      provider.parseWebhook(
        {},
        'MessageSid=SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&MessageStatus=brand-new'
      )
    ).toEqual([]);
  });
});

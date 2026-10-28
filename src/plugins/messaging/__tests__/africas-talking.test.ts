// ABOUTME: Contract tests for the Africa's Talking SMS adapter: the documented bulk-send request and
// ABOUTME: response, the delivery-report callback, the status it can and cannot answer, and the
// ABOUTME: refusal of a report that arrives without the configured source allowlist.

import { describe, expect, it } from 'vitest';

import { createAfricasTalkingProvider } from '../providers/africas-talking';
import { MessagingError, type OutboundMessage } from '../types';

import { payload, readPayload } from './fixtures';
import { createRecorderTransport } from './recorder';

const CONFIG = {
  username: 'schoolpilot',
  apiKey: 'test-api-key',
  senderId: 'GREENACRES',
};

function message(overrides: Partial<OutboundMessage> = {}): OutboundMessage {
  return {
    channel: 'sms',
    to: '+254712345678',
    body: 'Dear parent, Term 1 fees are due on 15 January.',
    idempotencyKey: 'invoice-2027-001-sms',
    ...overrides,
  };
}

describe("Africa's Talking send", () => {
  it('builds the documented bulk request and maps the response', async () => {
    const transport = createRecorderTransport([
      { body: readPayload('africas-talking-send-response') },
    ]);
    const provider = createAfricasTalkingProvider({ config: CONFIG, transport });

    const result = await provider.send(message());

    expect(transport.calls).toHaveLength(1);
    const call = transport.calls[0]!;
    expect(call.method).toBe('POST');
    expect(call.url).toBe('https://api.africastalking.com/version1/messaging/bulk');
    expect(call.headers.apiKey).toBe('test-api-key');
    expect(call.headers.Accept).toBe('application/json');
    expect(call.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(call.body ?? '{}')).toEqual({
      username: 'schoolpilot',
      message: 'Dear parent, Term 1 fees are due on 15 January.',
      senderId: 'GREENACRES',
      phoneNumbers: ['+254712345678'],
      enqueue: 1,
    });

    expect(result).toMatchObject({
      providerMessageId: 'ATPid_SampleTxnId123',
      status: 'sent',
    });
  });

  it('prefers the message sender id over the configured one', async () => {
    const transport = createRecorderTransport([
      { body: readPayload('africas-talking-send-response') },
    ]);
    const provider = createAfricasTalkingProvider({ config: CONFIG, transport });

    await provider.send(message({ senderId: 'EXAMS' }));

    expect(JSON.parse(transport.calls[0]!.body ?? '{}').senderId).toBe('EXAMS');
  });

  it('refuses a response whose recipient was rejected, with the provider’s own words', async () => {
    const transport = createRecorderTransport([
      { body: readPayload('africas-talking-send-refused') },
    ]);
    const provider = createAfricasTalkingProvider({ config: CONFIG, transport });

    const error: unknown = await provider.send(message()).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MessagingError);
    expect(error).toMatchObject({ code: 'rejected' });
    expect((error as Error).message).toMatch(/403.*InvalidPhoneNumber/);
  });

  it('refuses a response with no recipient at all rather than inventing an id', async () => {
    const transport = createRecorderTransport([{ body: '{"SMSMessageData":{"Recipients":[]}}' }]);
    const provider = createAfricasTalkingProvider({ config: CONFIG, transport });

    await expect(provider.send(message())).rejects.toMatchObject({ code: 'rejected' });
  });

  it('names a missing username rather than sending anonymously', () => {
    expect(() =>
      createAfricasTalkingProvider({
        config: { ...CONFIG, username: '' },
        transport: createRecorderTransport(),
      })
    ).toThrow(/atUsername/);
  });
});

describe("Africa's Talking delivery reports", () => {
  it('refuses a report when no source allowlist is configured, and says why', () => {
    const provider = createAfricasTalkingProvider({
      config: CONFIG,
      transport: createRecorderTransport(),
    });

    const verification = provider.verifyWebhook(
      { 'x-forwarded-for': '196.201.214.200' },
      readPayload('africas-talking-delivery-report')
    );

    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('no signature');
    expect(verification.reason).toContain('allowlist');
  });

  it('accepts a report from an allowed address and refuses any other', () => {
    const provider = createAfricasTalkingProvider({
      config: { ...CONFIG, deliveryReportIpAllowlist: ['196.201.214.200', '196.201.214.201'] },
      transport: createRecorderTransport(),
    });
    const body = readPayload('africas-talking-delivery-report');

    expect(provider.verifyWebhook({ 'x-forwarded-for': '196.201.214.200' }, body).valid).toBe(true);
    expect(provider.verifyWebhook({ 'x-real-ip': '196.201.214.201' }, body).valid).toBe(true);

    const refused = provider.verifyWebhook({ 'x-forwarded-for': '203.0.113.9' }, body);
    expect(refused.valid).toBe(false);
    expect(refused.reason).toContain('203.0.113.9');
  });

  it('maps a delivered report and then answers status from what it was told', async () => {
    const provider = createAfricasTalkingProvider({
      config: { ...CONFIG, deliveryReportIpAllowlist: ['196.201.214.200'] },
      transport: createRecorderTransport(),
    });
    await expect(provider.status('ATPid_SampleTxnId123')).rejects.toMatchObject({
      code: 'status_unavailable',
    });

    const reports = provider.parseWebhook(
      { 'x-forwarded-for': '196.201.214.200' },
      readPayload('africas-talking-delivery-report')
    );
    expect(reports).toEqual([
      {
        providerMessageId: 'ATPid_SampleTxnId123',
        status: 'delivered',
        reason: null,
        occurredAt: null,
        raw: expect.anything(),
      },
    ]);

    const status = await provider.status('ATPid_SampleTxnId123');
    expect(status.status).toBe('delivered');
  });

  it('maps a failed report with its failure reason', () => {
    const provider = createAfricasTalkingProvider({
      config: { ...CONFIG, deliveryReportIpAllowlist: ['196.201.214.200'] },
      transport: createRecorderTransport(),
    });

    const reports = provider.parseWebhook(
      { 'x-forwarded-for': '196.201.214.200' },
      readPayload('africas-talking-delivery-report-failed')
    );

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      providerMessageId: 'ATPid_SampleTxnId123',
      status: 'failed',
      reason: 'UserInBlackList',
    });
  });

  it('ignores an unknown status instead of guessing one', () => {
    const provider = createAfricasTalkingProvider({
      config: { ...CONFIG, deliveryReportIpAllowlist: ['196.201.214.200'] },
      transport: createRecorderTransport(),
    });

    expect(
      provider.parseWebhook(
        { 'x-forwarded-for': '196.201.214.200' },
        'id=ATPid_1&status=SomethingNew&phoneNumber=%2B2547'
      )
    ).toEqual([]);
  });

  it('keeps the recorded response shape it maps', () => {
    const body = payload('africas-talking-send-response') as {
      SMSMessageData: { Recipients: { messageId: string; statusCode: number }[] };
    };
    expect(body.SMSMessageData.Recipients[0]?.messageId).toBe('ATPid_SampleTxnId123');
    expect(body.SMSMessageData.Recipients[0]?.statusCode).toBe(101);
  });
});

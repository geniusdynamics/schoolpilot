// ABOUTME: Contract tests for the WhatsApp Cloud API adapter: the documented template and text send
// ABOUTME: bodies, the accepted-message response, the status webhook, and the X-Hub-Signature-256 check
// ABOUTME: verified against Node's own HMAC rather than against the implementation under test.

import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { createWhatsAppProvider } from '../providers/whatsapp';
import type { OutboundMessage } from '../types';

import { readPayload } from './fixtures';
import { createRecorderTransport, requestBody } from './recorder';

const CONFIG = {
  phoneNumberId: '106540352242922',
  accessToken: 'test-access-token',
  appSecret: 'test-app-secret',
  apiVersion: 'v23.0',
  defaultLanguage: 'en',
};

const MESSAGE_ID = 'wamid.HBgLMTY0NjcwNDM1OTUVAgARGBI4MjZGRDA0OUE2OTQ3RkEyMzcA';

function message(overrides: Partial<OutboundMessage> = {}): OutboundMessage {
  return {
    channel: 'whatsapp',
    to: '+16505551234',
    body: 'Dear parent, Term 1 fees are due on 15 January.',
    template: { id: 'fees_due', language: 'en', parameters: ['Amina Otieno', 'KES 1,500'] },
    idempotencyKey: 'invoice-2027-001-whatsapp',
    ...overrides,
  };
}

describe('WhatsApp send', () => {
  it('builds the documented template message and maps the accepted response', async () => {
    const transport = createRecorderTransport([{ body: readPayload('whatsapp-send-response') }]);
    const provider = createWhatsAppProvider({ config: CONFIG, transport });

    const result = await provider.send(message());

    const call = transport.calls[0]!;
    expect(call.method).toBe('POST');
    expect(call.url).toBe('https://graph.facebook.com/v23.0/106540352242922/messages');
    expect(call.headers.Authorization).toBe('Bearer test-access-token');
    expect(call.headers['Content-Type']).toBe('application/json');
    expect(requestBody(call)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '+16505551234',
      type: 'template',
      template: {
        name: 'fees_due',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Amina Otieno' },
              { type: 'text', text: 'KES 1,500' },
            ],
          },
        ],
      },
    });

    expect(result).toMatchObject({ providerMessageId: MESSAGE_ID, status: 'queued' });
  });

  it('falls back to the configured language and ordered merge values', async () => {
    const transport = createRecorderTransport([{ body: readPayload('whatsapp-send-response') }]);
    const provider = createWhatsAppProvider({ config: CONFIG, transport });

    await provider.send(
      message({
        template: { id: 'fees_due' },
        mergeValues: { learner: 'Amina Otieno', amount: 'KES 1,500' },
      })
    );

    const body = requestBody(transport.calls[0]);
    expect((body.template as { language: { code: string } }).language.code).toBe('en');
    expect(
      (body.template as { components: { parameters: { text: string }[] }[] }).components[0]?.parameters
    ).toEqual([{ type: 'text', text: 'Amina Otieno' }, { type: 'text', text: 'KES 1,500' }]);
  });

  it('sends a text message when the message names no template', async () => {
    const transport = createRecorderTransport([{ body: readPayload('whatsapp-send-response') }]);
    const provider = createWhatsAppProvider({ config: CONFIG, transport });

    await provider.send(message({ template: undefined }));

    expect(requestBody(transport.calls[0])).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '+16505551234',
      type: 'text',
      text: { preview_url: false, body: 'Dear parent, Term 1 fees are due on 15 January.' },
    });
  });

  it('refuses a response with no message id', async () => {
    const transport = createRecorderTransport([{ body: '{"messages":[]}' }]);
    const provider = createWhatsAppProvider({ config: CONFIG, transport });

    await expect(provider.send(message())).rejects.toMatchObject({ code: 'rejected' });
  });
});

describe('WhatsApp status webhook', () => {
  it('accepts a payload signed with the app secret', () => {
    const provider = createWhatsAppProvider({ config: CONFIG, transport: createRecorderTransport() });
    const body = readPayload('whatsapp-status-delivered');
    const signature = `sha256=${createHmac('sha256', CONFIG.appSecret).update(body).digest('hex')}`;

    expect(provider.verifyWebhook({ 'x-hub-signature-256': signature }, body)).toEqual({
      valid: true,
      reason: 'the X-Hub-Signature-256 header matches the app secret',
    });
  });

  it('refuses a payload with the wrong signature or none at all', () => {
    const provider = createWhatsAppProvider({ config: CONFIG, transport: createRecorderTransport() });
    const body = readPayload('whatsapp-status-delivered');

    const wrong = provider.verifyWebhook({ 'x-hub-signature-256': 'sha256=00' }, body);
    expect(wrong.valid).toBe(false);
    expect(wrong.reason).toContain('X-Hub-Signature-256');

    expect(provider.verifyWebhook({}, body).valid).toBe(false);
  });

  it('refuses to verify when no app secret is configured', () => {
    const provider = createWhatsAppProvider({
      config: { ...CONFIG, appSecret: undefined },
      transport: createRecorderTransport(),
    });

    const verification = provider.verifyWebhook({ 'x-hub-signature-256': 'sha256=00' }, '{}');
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('appSecret');
  });

  it('maps a delivered status with its timestamp', () => {
    const provider = createWhatsAppProvider({ config: CONFIG, transport: createRecorderTransport() });

    const reports = provider.parseWebhook({}, readPayload('whatsapp-status-delivered'));
    expect(reports).toEqual([
      {
        providerMessageId: 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBI3MTE5MjVBOTE3MDk5QUVFM0YA',
        status: 'delivered',
        reason: null,
        occurredAt: new Date(1750263773 * 1000).toISOString(),
        raw: expect.anything(),
      },
    ]);
  });

  it('maps a failed status with Meta’s error code and detail', () => {
    const provider = createWhatsAppProvider({ config: CONFIG, transport: createRecorderTransport() });

    const reports = provider.parseWebhook({}, readPayload('whatsapp-status-failed'));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      providerMessageId: 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBI3MTE5MjVBOTE3MDk5QUVFM0YA',
      status: 'failed',
      reason:
        '131047 Re-engagement message: Message failed to send because more than 24 hours have passed since the customer last replied.',
    });
  });

  it('answers status from the webhook it was told about, and nowhere else', async () => {
    const provider = createWhatsAppProvider({ config: CONFIG, transport: createRecorderTransport() });
    await expect(provider.status('wamid.unknown')).rejects.toMatchObject({
      code: 'status_unavailable',
    });

    provider.parseWebhook({}, readPayload('whatsapp-status-delivered'));
    const status = await provider.status('wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBI3MTE5MjVBOTE3MDk5QUVFM0YA');
    expect(status.status).toBe('delivered');
  });

  it('ignores an event that is not a status', () => {
    const provider = createWhatsAppProvider({ config: CONFIG, transport: createRecorderTransport() });

    expect(
      provider.parseWebhook(
        {},
        JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [] }] })
      )
    ).toEqual([]);
  });

  it('leaves the time null when Meta sends no timestamp, rather than reporting 1970', () => {
    const provider = createWhatsAppProvider({ config: CONFIG, transport: createRecorderTransport() });

    const [report] = provider.parseWebhook(
      {},
      JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              { value: { statuses: [{ id: 'wamid.no-time', status: 'sent' }] }, field: 'messages' },
            ],
          },
        ],
      })
    );

    expect(report?.occurredAt).toBeNull();
  });
});

// ABOUTME: Contract tests for the SMTP email adapter: the RFC 5322 message and envelope it builds, the
// ABOUTME: accepted and refused submission paths, and the honest refusal of a delivery webhook it does
// ABOUTME: not have.

import { describe, expect, it } from 'vitest';

import { createSmtpProvider } from '../providers/smtp';
import type { OutboundMessage } from '../types';

import { createSmtpRecorder } from './recorder';

const NOW = () => new Date('2026-01-05T08:00:00.000Z');

const CONFIG = {
  fromAddress: 'office@greenacres.example',
  fromName: 'Green Acres School',
  messageIdDomain: 'greenacres.example',
};

function message(overrides: Partial<OutboundMessage> = {}): OutboundMessage {
  return {
    channel: 'email',
    to: 'parent@example.test',
    subject: 'Fees for Term 1 are due',
    body: 'Dear parent,\nTerm 1 fees are due on 15 January.',
    idempotencyKey: 'invoice-2027-001-email',
    ...overrides,
  };
}

const MESSAGE_ID = '<sp.invoice-2027-001-email@greenacres.example>';

describe('SMTP send', () => {
  it('builds the RFC 5322 message and envelope the transport submits', async () => {
    const transport = createSmtpRecorder([{}]);
    const provider = createSmtpProvider({ config: CONFIG, transport, now: NOW });

    const result = await provider.send(message());

    expect(transport.submissions).toHaveLength(1);
    const submission = transport.submissions[0]!;
    expect(submission.envelope).toEqual({
      from: 'office@greenacres.example',
      to: ['parent@example.test'],
    });
    expect(submission.idempotencyKey).toBe('invoice-2027-001-email');

    expect(submission.message).toBe(
      [
        'From: "Green Acres School" <office@greenacres.example>',
        'To: parent@example.test',
        'Subject: Fees for Term 1 are due',
        'Date: Mon, 05 Jan 2026 08:00:00 +0000',
        `Message-ID: ${MESSAGE_ID}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        'Dear parent,',
        'Term 1 fees are due on 15 January.',
        '',
      ].join('\r\n')
    );

    expect(result).toEqual({
      providerMessageId: MESSAGE_ID,
      status: 'sent',
      raw: { response: '250 2.0.0 Ok: queued' },
    });
  });

  it('uses the message id the relay reports when it reports one', async () => {
    const transport = createSmtpRecorder([{ messageId: '<relay-id@greenacres.example>' }]);
    const provider = createSmtpProvider({ config: CONFIG, transport, now: NOW });

    const result = await provider.send(message());
    expect(result.providerMessageId).toBe('<relay-id@greenacres.example>');
  });

  it('refuses a submission the relay rejects, with the relay’s words', async () => {
    const transport = createSmtpRecorder([
      { accepted: false, response: '550 5.1.1 mailbox unavailable' },
    ]);
    const provider = createSmtpProvider({ config: CONFIG, transport, now: NOW });

    const error: unknown = await provider.send(message()).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: 'rejected' });
    expect((error as Error).message).toMatch(/550 5\.1\.1/);
  });

  it('answers status from the submission it made', async () => {
    const transport = createSmtpRecorder([{}]);
    const provider = createSmtpProvider({ config: CONFIG, transport, now: NOW });

    await expect(provider.status(MESSAGE_ID)).rejects.toMatchObject({ code: 'status_unavailable' });
    await provider.send(message());
    expect((await provider.status(MESSAGE_ID)).status).toBe('sent');
  });

  it('refuses to build without a from address', () => {
    expect(() =>
      createSmtpProvider({
        config: { ...CONFIG, fromAddress: '' },
        transport: createSmtpRecorder(),
      })
    ).toThrow(/smtpFromAddress/);
  });
});

describe('SMTP webhooks', () => {
  it('says plainly that SMTP has no delivery webhook instead of pretending to verify one', () => {
    const provider = createSmtpProvider({
      config: CONFIG,
      transport: createSmtpRecorder(),
      now: NOW,
    });

    const verification = provider.verifyWebhook({}, 'anything');
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('no delivery webhook');
    expect(provider.parseWebhook({}, 'anything')).toEqual([]);
  });
});

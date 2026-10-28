// ABOUTME: The end-to-end outbox run: a provider transport that fails twice and then succeeds, with
// ABOUTME: the outbox retrying on its backoff, recording the provider id, and landing the message at
// ABOUTME: delivered when the delivery report arrives.

import { describe, expect, it } from 'vitest';

import { createAfricasTalkingProvider } from '../providers/africas-talking';
import type { HttpRequest, HttpResponse, HttpTransport } from '../providers/transport';
import { Outbox } from '../outbox';
import type { OutboundMessage } from '../types';

import { readPayload } from './fixtures';
import { MemoryOutboxStore } from './memory-store';

/** A transport that refuses the first two attempts and then answers with the recorded response. */
function flakyTransport(failures: number): HttpTransport & { readonly calls: HttpRequest[] } {
  const calls: HttpRequest[] = [];
  return {
    calls,
    async send(request: HttpRequest): Promise<HttpResponse> {
      calls.push(request);
      if (calls.length <= failures) throw new Error('socket hang up');
      return { status: 200, body: readPayload('africas-talking-send-response') };
    },
  };
}

const MESSAGE: OutboundMessage = {
  channel: 'sms',
  to: '+254712345678',
  body: 'Dear parent, Term 1 fees are due on 15 January.',
  idempotencyKey: 'invoice-2027-001-sms',
};

describe('an outbox run over a flaky provider', () => {
  it('retries twice, sends on the third attempt and lands delivered', async () => {
    let now = new Date('2026-01-05T08:00:00.000Z');
    const advance = (ms: number): void => {
      now = new Date(now.getTime() + ms);
    };

    const store = new MemoryOutboxStore();
    const outbox = new Outbox({
      store,
      now: () => now,
      maxAttempts: 5,
      backoff: { initialMs: 30_000, multiplier: 2, maxMs: 900_000 },
    });

    const transport = flakyTransport(2);
    const provider = createAfricasTalkingProvider({
      config: {
        username: 'schoolpilot',
        apiKey: 'test-api-key',
        senderId: 'GREENACRES',
        deliveryReportIpAllowlist: ['196.201.214.200'],
      },
      transport,
    });

    await outbox.enqueue(MESSAGE);

    // Two attempts fail; each failure schedules the next attempt on the backoff.
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const claimed = await outbox.claimBatch(1);
      expect(claimed).toHaveLength(1);
      const error: unknown = await provider
        .send(claimed[0]!.message)
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(Error);
      const failed = await outbox.markFailed(MESSAGE.idempotencyKey, (error as Error).message);
      expect(failed.status).toBe('failed');
      expect(failed.deliveryStatus).toBe('failed');

      const next = failed.nextAttemptAt!.getTime() - now.getTime();
      advance(next);
    }

    // The third attempt reaches the recorded success.
    const third = await outbox.claimBatch(1);
    expect(third).toHaveLength(1);
    const sent = await provider.send(third[0]!.message);
    const accepted = await outbox.markSent(MESSAGE.idempotencyKey, sent);

    expect(transport.calls).toHaveLength(3);
    expect(accepted.status).toBe('sent');
    expect(accepted.attempts).toBe(3);
    expect(accepted.deliveryStatus).toBe('sent');
    expect(accepted.providerMessageId).toBe('ATPid_SampleTxnId123');

    // The provider's delivery report arrives and the message lands at delivered.
    const headers = { 'x-forwarded-for': '196.201.214.200' };
    const rawBody = readPayload('africas-talking-delivery-report');
    expect(provider.verifyWebhook(headers, rawBody).valid).toBe(true);

    const [report] = provider.parseWebhook(headers, rawBody);
    expect(report).toBeDefined();
    expect(await outbox.applyDeliveryReport(report!)).toBe(true);

    const landed = await outbox.get(MESSAGE.idempotencyKey);
    expect(landed?.deliveryStatus).toBe('delivered');
    expect(landed?.status).toBe('sent');
    expect(landed?.providerMessageId).toBe('ATPid_SampleTxnId123');
    expect(await outbox.deadLettered()).toEqual([]);
  });
});

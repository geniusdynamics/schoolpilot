// ABOUTME: Tests for the messaging outbox: idempotent enqueue across a restart, claim-once batches,
// ABOUTME: the exponential backoff timetable, dead-lettering after the attempt limit, lease reclaim,
// ABOUTME: and the delivery status a provider reports later.

import { describe, expect, it } from 'vitest';

import { Outbox, type BackoffPolicy } from '../outbox';
import type { OutboundMessage } from '../types';

import { MemoryOutboxStore } from './memory-store';

const START = new Date('2026-01-05T08:00:00.000Z');

const BACKOFF: BackoffPolicy = { initialMs: 30_000, multiplier: 2, maxMs: 900_000 };

function message(overrides: Partial<OutboundMessage> = {}): OutboundMessage {
  return {
    channel: 'sms',
    to: '+254712345678',
    body: 'Dear parent, Term 1 fees are due on 15 January.',
    senderId: 'SCHOOL',
    idempotencyKey: 'invoice-2027-001-sms',
    ...overrides,
  };
}

interface Fixture {
  readonly outbox: Outbox;
  readonly store: MemoryOutboxStore;
  advance(ms: number): void;
  at(): Date;
}

function setup(options: { maxAttempts?: number; backoff?: BackoffPolicy } = {}): Fixture {
  let now = START;
  const store = new MemoryOutboxStore();
  const outbox = new Outbox({
    store,
    now: () => now,
    maxAttempts: options.maxAttempts ?? 3,
    backoff: options.backoff ?? BACKOFF,
    claimLeaseMs: 300_000,
  });
  return {
    outbox,
    store,
    advance(ms: number): void {
      now = new Date(now.getTime() + ms);
    },
    at: () => now,
  };
}

describe('outbox enqueue', () => {
  it('keeps one entry when the same idempotency key is enqueued again after a restart', async () => {
    const fixture = setup();
    const first = await fixture.outbox.enqueue(message());
    expect(first.status).toBe('queued');
    expect(first.attempts).toBe(0);

    // A new process over the same store is what a restart looks like to the outbox.
    const restarted = new Outbox({ store: fixture.store, now: fixture.at });
    const second = await restarted.enqueue(message({ body: 'A different body with the same key' }));

    expect(second.message.idempotencyKey).toBe(first.message.idempotencyKey);
    expect(second.message.body).toBe(first.message.body);
    expect(second.enqueuedAt).toEqual(first.enqueuedAt);
    expect(fixture.store.size).toBe(1);
  });

  it('enqueues different keys as separate entries', async () => {
    const fixture = setup();
    await fixture.outbox.enqueue(message());
    await fixture.outbox.enqueue(message({ idempotencyKey: 'invoice-2027-002-sms' }));

    expect(fixture.store.size).toBe(2);
  });
});

describe('outbox claiming', () => {
  it('claims only the entries whose next attempt is due, and does not hand one out twice', async () => {
    const fixture = setup();
    await fixture.outbox.enqueue(message());

    const first = await fixture.outbox.claimBatch(1);
    expect(first).toHaveLength(1);
    expect(first[0]?.status).toBe('sending');

    // The claimed entry is under a lease, so an immediate second worker gets nothing.
    expect(await fixture.outbox.claimBatch(10)).toHaveLength(0);

    // Once the lease expires the entry is reclaimed rather than stranded.
    fixture.advance(300_001);
    expect(await fixture.outbox.claimBatch(10)).toHaveLength(1);
  });

  it('hands out at most the batch limit, and the rest on the next call', async () => {
    const fixture = setup();
    await fixture.outbox.enqueue(message());
    await fixture.outbox.enqueue(message({ idempotencyKey: 'invoice-2027-002-sms' }));

    const claimed = await fixture.outbox.claimBatch(1);
    expect(claimed.map((entry) => entry.message.idempotencyKey)).toEqual(['invoice-2027-001-sms']);

    const next = await fixture.outbox.claimBatch(1);
    expect(next.map((entry) => entry.message.idempotencyKey)).toEqual(['invoice-2027-002-sms']);
  });

  it('leaves an entry alone until its backoff has elapsed', async () => {
    const fixture = setup();
    await fixture.outbox.enqueue(message());
    await fixture.outbox.claimBatch(1);
    await fixture.outbox.markFailed('invoice-2027-001-sms', 'the gateway answered 503');

    expect(await fixture.outbox.claimBatch(10)).toHaveLength(0);
    fixture.advance(30_000);
    expect(await fixture.outbox.claimBatch(10)).toHaveLength(1);
  });
});

describe('outbox backoff', () => {
  it('waits longer after each failure until the cap', async () => {
    const fixture = setup({ maxAttempts: 10 });
    await fixture.outbox.enqueue(message());

    const observed: number[] = [];
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const claimed = await fixture.outbox.claimBatch(1);
      expect(claimed).toHaveLength(1);
      const failed = await fixture.outbox.markFailed(
        'invoice-2027-001-sms',
        `attempt ${attempt} failed`
      );
      expect(failed.attempts).toBe(attempt);
      const next = failed.nextAttemptAt;
      if (next === null) throw new Error('a retryable failure must schedule a next attempt');
      observed.push(next.getTime() - fixture.at().getTime());
      fixture.advance(next.getTime() - fixture.at().getTime());
    }

    expect(observed).toEqual([30_000, 60_000, 120_000, 240_000, 480_000, 900_000]);
  });
});

describe('outbox dead letters', () => {
  it('dead-letters a message after the configured attempt limit and lists it', async () => {
    const fixture = setup({ maxAttempts: 3 });
    await fixture.outbox.enqueue(message());

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await fixture.outbox.claimBatch(1);
      await fixture.outbox.markFailed('invoice-2027-001-sms', `failure ${attempt}`);
      if (attempt < 3) fixture.advance(900_000);
    }

    const dead = await fixture.outbox.get('invoice-2027-001-sms');
    expect(dead?.status).toBe('dead');
    expect(dead?.attempts).toBe(3);
    expect(dead?.deliveryStatus).toBe('failed');
    expect(dead?.lastError).toBe('failure 3');
    expect(dead?.nextAttemptAt).toBeNull();

    const listed = await fixture.outbox.deadLettered();
    expect(listed.map((entry) => entry.message.idempotencyKey)).toEqual(['invoice-2027-001-sms']);

    // A dead letter is never claimed again, however long the outbox runs.
    fixture.advance(86_400_000);
    expect(await fixture.outbox.claimBatch(10)).toHaveLength(0);
  });
});

describe('outbox delivery status', () => {
  it('records the provider message id on send and the later webhook report', async () => {
    const fixture = setup();
    await fixture.outbox.enqueue(message());
    await fixture.outbox.claimBatch(1);

    const sent = await fixture.outbox.markSent('invoice-2027-001-sms', {
      providerMessageId: 'ATPid_SampleTxnId123',
      status: 'sent',
    });
    expect(sent.status).toBe('sent');
    expect(sent.attempts).toBe(1);
    expect(sent.providerMessageId).toBe('ATPid_SampleTxnId123');
    expect(sent.deliveryStatus).toBe('sent');
    expect(sent.nextAttemptAt).toBeNull();

    const applied = await fixture.outbox.applyDeliveryReport({
      providerMessageId: 'ATPid_SampleTxnId123',
      status: 'delivered',
      reason: null,
      occurredAt: '2026-01-05T08:01:00.000Z',
    });
    expect(applied).toBe(true);

    const delivered = await fixture.outbox.get('invoice-2027-001-sms');
    expect(delivered?.deliveryStatus).toBe('delivered');
    expect(delivered?.status).toBe('sent');
  });

  it('ignores a report for a message the outbox does not hold', async () => {
    const fixture = setup();
    const applied = await fixture.outbox.applyDeliveryReport({
      providerMessageId: 'unknown',
      status: 'delivered',
      reason: null,
      occurredAt: null,
    });
    expect(applied).toBe(false);
  });

  it('keeps the failure reason a provider reports for a delivery', async () => {
    const fixture = setup();
    await fixture.outbox.enqueue(message());
    await fixture.outbox.claimBatch(1);
    await fixture.outbox.markSent('invoice-2027-001-sms', {
      providerMessageId: 'ATPid_SampleTxnId123',
      status: 'sent',
    });

    await fixture.outbox.applyDeliveryReport({
      providerMessageId: 'ATPid_SampleTxnId123',
      status: 'failed',
      reason: 'UserInBlackList',
      occurredAt: null,
    });

    const record = await fixture.outbox.get('invoice-2027-001-sms');
    expect(record?.deliveryStatus).toBe('failed');
    expect(record?.deliveryReason).toBe('UserInBlackList');
  });
});

// ABOUTME: The outbox for outbound messages: idempotent enqueue over a storage-agnostic record, claim
// ABOUTME: batches under a lease, exponential backoff on failure, dead-lettering after an attempt
// ABOUTME: limit, and the delivery status a provider reports afterwards.

import {
  MessagingError,
  type DeliveryReport,
  type DeliveryStatus,
  type OutboundMessage,
  type SendResult,
} from './types';

/** Where a record is in its life. A send failure is `failed` while it may still be retried. */
export type OutboxStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'dead';

/** One message and everything the outbox knows about it. */
export interface OutboxRecord {
  readonly message: OutboundMessage;
  readonly status: OutboxStatus;
  /** How many send attempts have been made, successful or not. */
  readonly attempts: number;
  /** When to try again; null once the record is sent or dead. */
  readonly nextAttemptAt: Date | null;
  /** Until when a claim holds the record; null when nobody holds it. */
  readonly leaseExpiresAt: Date | null;
  /** The provider's id for the message, once it accepted one. */
  readonly providerMessageId: string | null;
  /** The latest status the provider reported, before or after the send. */
  readonly deliveryStatus: DeliveryStatus | null;
  /** Why the latest delivery failed, in the provider's words. */
  readonly deliveryReason: string | null;
  /** Why the last send attempt failed. */
  readonly lastError: string | null;
  readonly enqueuedAt: Date;
  readonly updatedAt: Date;
}

/**
 * The storage the outbox keeps its records in.
 *
 * Deliberately dumb: it stores and returns records, and the selection rules - what is due, what may
 * be claimed - live in `Outbox` so they are testable without a database. `find` is keyed by the
 * message's idempotency key, which is the outbox's primary key.
 */
export interface OutboxStore {
  find(idempotencyKey: string): Promise<OutboxRecord | null>;
  list(): Promise<readonly OutboxRecord[]>;
  save(record: OutboxRecord): Promise<void>;
}

/** How the wait between attempts grows. */
export interface BackoffPolicy {
  /** The wait after the first failure, in milliseconds. */
  readonly initialMs: number;
  /** What each further failure multiplies the wait by. */
  readonly multiplier: number;
  /** The longest wait, in milliseconds. */
  readonly maxMs: number;
}

/** The backoff an outbox uses unless a caller chooses another. */
export const DEFAULT_BACKOFF: BackoffPolicy = {
  initialMs: 30_000,
  multiplier: 2,
  maxMs: 900_000,
};

/** How the outbox is built. */
export interface OutboxOptions {
  readonly store: OutboxStore;
  /** The clock; tests pin it, production leaves it out. */
  readonly now?: () => Date;
  /** Attempts after which a message is dead-lettered. */
  readonly maxAttempts?: number;
  readonly backoff?: BackoffPolicy;
  /** How long a claim holds a record before another worker may take it. */
  readonly claimLeaseMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_CLAIM_LEASE_MS = 300_000;

/** The wait before `attempt + 1`, where `attempt` is the number of attempts already made. */
export function backoffDelayMs(attempt: number, policy: BackoffPolicy): number {
  const grown = policy.initialMs * Math.pow(policy.multiplier, Math.max(attempt - 1, 0));
  return Math.min(grown, policy.maxMs);
}

/**
 * The outbox.
 *
 * No timer and no database lives here: a host worker calls `claimBatch`, sends each message through
 * a provider, and calls `markSent` or `markFailed`. The clock is injected, so a test can step over a
 * backoff without waiting.
 */
export class Outbox {
  private readonly store: OutboxStore;
  private readonly clock: () => Date;
  private readonly maxAttempts: number;
  private readonly backoff: BackoffPolicy;
  private readonly claimLeaseMs: number;

  constructor(options: OutboxOptions) {
    this.store = options.store;
    this.clock = options.now ?? (() => new Date());
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.backoff = options.backoff ?? DEFAULT_BACKOFF;
    this.claimLeaseMs = options.claimLeaseMs ?? DEFAULT_CLAIM_LEASE_MS;

    if (!Number.isInteger(this.maxAttempts) || this.maxAttempts < 1) {
      throw new RangeError('maxAttempts must be a positive integer');
    }
    if (this.claimLeaseMs <= 0) throw new RangeError('claimLeaseMs must be positive');
  }

  /**
   * Adds a message, or returns the record already stored under its idempotency key.
   *
   * The second enqueue's body is ignored: the key says the caller means the first message, and
   * sending a different body under the same key is a caller bug, not a new message.
   */
  async enqueue(message: OutboundMessage): Promise<OutboxRecord> {
    if (message.idempotencyKey.trim() === '') {
      throw new MessagingError('payload_invalid', 'a message needs an idempotency key');
    }
    if (message.to.trim() === '') {
      throw new MessagingError('payload_invalid', 'a message needs a recipient');
    }

    const existing = await this.store.find(message.idempotencyKey);
    if (existing) return existing;

    const now = this.clock();
    const record: OutboxRecord = {
      message,
      status: 'queued',
      attempts: 0,
      nextAttemptAt: now,
      leaseExpiresAt: null,
      providerMessageId: null,
      deliveryStatus: null,
      deliveryReason: null,
      lastError: null,
      enqueuedAt: now,
      updatedAt: now,
    };
    await this.store.save(record);
    return record;
  }

  /** The record stored under an idempotency key, or null. */
  async get(idempotencyKey: string): Promise<OutboxRecord | null> {
    return this.store.find(idempotencyKey);
  }

  /**
   * Claims up to `limit` records whose next attempt is due.
   *
   * A claimed record is `sending` under a lease, so a second worker does not take it. A record left
   * `sending` by a worker that died is reclaimed once its lease has expired.
   */
  async claimBatch(limit = 10): Promise<readonly OutboxRecord[]> {
    if (limit < 1) return [];
    const now = this.clock();
    const all = await this.store.list();
    const due = all
      .filter((record) => this.isDue(record, now))
      .sort((left, right) => this.dueAt(left).getTime() - this.dueAt(right).getTime())
      .slice(0, limit);

    const claimed: OutboxRecord[] = [];
    for (const record of due) {
      const next: OutboxRecord = {
        ...record,
        status: 'sending',
        leaseExpiresAt: new Date(now.getTime() + this.claimLeaseMs),
        updatedAt: now,
      };
      await this.store.save(next);
      claimed.push(next);
    }
    return claimed;
  }

  /** Records that a provider accepted the message, and what it called it. */
  async markSent(idempotencyKey: string, result: SendResult): Promise<OutboxRecord> {
    const record = await this.require(idempotencyKey);
    return this.replace(record, {
      status: 'sent',
      attempts: record.attempts + 1,
      nextAttemptAt: null,
      leaseExpiresAt: null,
      providerMessageId: result.providerMessageId,
      deliveryStatus: result.status,
      deliveryReason: null,
      lastError: null,
    });
  }

  /**
   * Records a failed attempt.
   *
   * The wait before the next attempt doubles from `initialMs` and stops at `maxMs`. After
   * `maxAttempts` the record is dead-lettered: no further attempt is made, and it appears in
   * `deadLettered` for a person to look at.
   */
  async markFailed(idempotencyKey: string, reason: string): Promise<OutboxRecord> {
    const record = await this.require(idempotencyKey);
    const attempts = record.attempts + 1;
    const dead = attempts >= this.maxAttempts;
    const now = this.clock();

    return this.replace(record, {
      status: dead ? 'dead' : 'failed',
      attempts,
      nextAttemptAt: dead ? null : new Date(now.getTime() + backoffDelayMs(attempts, this.backoff)),
      leaseExpiresAt: null,
      deliveryStatus: 'failed',
      deliveryReason: reason,
      lastError: reason,
    });
  }

  /**
   * Applies a delivery report the provider sent, matching on its message id.
   *
   * A delivery failure does not dead-letter the message: the provider accepted it, so the send is
   * not retried. The record keeps `status: 'sent'` and moves `deliveryStatus` to `failed`, which is
   * the honest account of what happened. Returns false when no record holds that provider id.
   */
  async applyDeliveryReport(report: DeliveryReport): Promise<boolean> {
    const all = await this.store.list();
    const record = all.find((entry) => entry.providerMessageId === report.providerMessageId);
    if (!record) return false;

    await this.replace(record, {
      deliveryStatus: report.status,
      deliveryReason: report.status === 'failed' ? report.reason : null,
    });
    return true;
  }

  /** Dead-lettered records, most recently touched first. */
  async deadLettered(limit = 50): Promise<readonly OutboxRecord[]> {
    const all = await this.store.list();
    return all
      .filter((record) => record.status === 'dead')
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, Math.max(limit, 0));
  }

  private isDue(record: OutboxRecord, now: Date): boolean {
    if (record.status === 'queued' || record.status === 'failed') {
      return record.nextAttemptAt !== null && record.nextAttemptAt.getTime() <= now.getTime();
    }
    if (record.status === 'sending') {
      return record.leaseExpiresAt !== null && record.leaseExpiresAt.getTime() <= now.getTime();
    }
    return false;
  }

  private dueAt(record: OutboxRecord): Date {
    return record.nextAttemptAt ?? record.leaseExpiresAt ?? record.enqueuedAt;
  }

  private async require(idempotencyKey: string): Promise<OutboxRecord> {
    const record = await this.store.find(idempotencyKey);
    if (!record) {
      throw new MessagingError(
        'payload_invalid',
        `there is no outbox entry under the idempotency key "${idempotencyKey}"`
      );
    }
    return record;
  }

  private async replace(
    record: OutboxRecord,
    change: Partial<OutboxRecord>
  ): Promise<OutboxRecord> {
    const next: OutboxRecord = { ...record, ...change, updatedAt: this.clock() };
    await this.store.save(next);
    return next;
  }
}

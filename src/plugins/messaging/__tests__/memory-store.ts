// ABOUTME: An in-memory outbox store for the tests: the port the outbox is written against, with
// ABOUTME: nothing but a map behind it, so a test can inspect exactly what the outbox persisted.

import type { OutboxRecord, OutboxStore } from '../outbox';

/** The smallest store that satisfies the port, held entirely in memory. */
export class MemoryOutboxStore implements OutboxStore {
  private readonly records = new Map<string, OutboxRecord>();

  /** The record count, so a test can prove an idempotent enqueue stored nothing new. */
  get size(): number {
    return this.records.size;
  }

  async find(idempotencyKey: string): Promise<OutboxRecord | null> {
    return this.records.get(idempotencyKey) ?? null;
  }

  async list(): Promise<readonly OutboxRecord[]> {
    return [...this.records.values()];
  }

  async save(record: OutboxRecord): Promise<void> {
    this.records.set(record.message.idempotencyKey, record);
  }
}

// ABOUTME: Durable edit queue tests: one entry per cell, an edit that fails stays queued, an edit a
// ABOUTME: teacher replaced during a flush is not written from the stale snapshot, and nothing is
// ABOUTME: applied twice.

import { describe, expect, it, vi } from 'vitest';

import {
  PendingEditQueue,
  createMemoryPendingEditStore,
  flushPendingEdits,
  type PendingEdit,
} from '../pendingEdits';

function edit(overrides: Partial<Omit<PendingEdit, 'key' | 'queuedAt' | 'attempts'>> = {}) {
  return {
    institutionId: 'inst-1',
    assessmentId: 'assessment-1',
    enrolmentId: 'enrolment-1',
    learningAreaId: 'area-1',
    markId: null,
    baseScore: null,
    score: '70',
    status: 'present' as const,
    reason: null,
    ...overrides,
  };
}

describe('pending edit queue', () => {
  it('keeps one entry per cell, so typing twice leaves one write', () => {
    const queue = new PendingEditQueue(createMemoryPendingEditStore());
    queue.enqueue(edit({ score: '70' }));
    queue.enqueue(edit({ score: '82' }));

    expect(queue.entries()).toHaveLength(1);
    expect(queue.entries()[0].score).toBe('82');
  });

  it('keeps separate entries for separate cells', () => {
    const queue = new PendingEditQueue(createMemoryPendingEditStore());
    queue.enqueue(edit());
    queue.enqueue(edit({ enrolmentId: 'enrolment-2' }));

    expect(queue.entries()).toHaveLength(2);
  });

  it('removes an entry only after the write succeeded', async () => {
    const queue = new PendingEditQueue(createMemoryPendingEditStore());
    queue.enqueue(edit());
    const write = vi.fn().mockRejectedValueOnce(new Error('storage busy')).mockResolvedValue(undefined);

    const failed = await flushPendingEdits(queue, write);
    expect(failed).toMatchObject({ applied: 0, failed: 1, remaining: 1 });
    expect(queue.entries()[0].attempts).toBe(1);

    const retried = await flushPendingEdits(queue, write);
    expect(retried).toMatchObject({ applied: 1, failed: 0, remaining: 0 });
    expect(queue.entries()).toEqual([]);
  });

  it('does not write an edit the teacher replaced while the flush was running', async () => {
    const queue = new PendingEditQueue(createMemoryPendingEditStore());
    queue.enqueue(edit({ score: '70' }));

    const written: string[] = [];
    await flushPendingEdits(queue, async (entry) => {
      written.push(entry.score ?? '');
      // The teacher corrects the same cell while the first write is in flight.
      queue.enqueue(edit({ score: '95' }));
    });

    expect(written).toEqual(['70']);
    expect(queue.entries().map((entry) => entry.score)).toEqual(['95']);
  });

  it('applies each entry exactly once across successive flushes', async () => {
    const queue = new PendingEditQueue(createMemoryPendingEditStore());
    queue.enqueue(edit());
    const write = vi.fn().mockResolvedValue(undefined);

    await flushPendingEdits(queue, write);
    await flushPendingEdits(queue, write);

    expect(write).toHaveBeenCalledTimes(1);
  });

  it('survives a reload: a new queue over the same store sees the edits', () => {
    const store = createMemoryPendingEditStore([
      {
        key: 'assessment-1|enrolment-1|area-1',
        institutionId: 'inst-1',
        assessmentId: 'assessment-1',
        enrolmentId: 'enrolment-1',
        learningAreaId: 'area-1',
        markId: null,
        baseScore: null,
        score: '64',
        status: 'present',
        reason: null,
        queuedAt: '2026-10-22T08:00:00.000Z',
        token: 'token-1',
        attempts: 0,
      },
    ]);

    const reloaded = new PendingEditQueue(store);
    expect(reloaded.size()).toBe(1);
    expect(reloaded.entries()[0].score).toBe('64');
  });
});

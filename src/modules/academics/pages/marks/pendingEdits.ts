// ABOUTME: The durable queue of mark edits that have not reached the repository yet. A teacher's
// ABOUTME: edit is written to browser storage first and removed only after the repository accepts it,
// ABOUTME: so a reload, a crash or a lost connection never drops an edit and never applies it twice.

import type { MarkStatus } from '@/domain/assessment/engine';

/** One mark edit waiting for the repository. */
export interface PendingEdit {
  /** Identity of the cell: `${assessmentId}|${enrolmentId}|${learningAreaId}`. */
  readonly key: string;
  readonly institutionId: string;
  readonly assessmentId: string;
  readonly enrolmentId: string;
  readonly learningAreaId: string;
  /** The mark row the edit updates, or null when the edit creates one. */
  readonly markId: string | null;
  /** The score the teacher saw when the edit was made, so a change made meanwhile can be reported. */
  readonly baseScore: string | null;
  readonly score: string | null;
  readonly status: MarkStatus;
  /** Set when the cell is locked and the edit is an authorised override. */
  readonly reason: string | null;
  readonly queuedAt: string;
  /** Identity of this queue entry; a newer edit of the same cell carries a different token. */
  readonly token: string;
  readonly attempts: number;
}

/** The durable half of the queue. */
export interface PendingEditStore {
  read(): PendingEdit[];
  write(edits: readonly PendingEdit[]): void;
}

/** What a flush did, so the page can say whether anything is still waiting. */
export interface FlushReport {
  readonly applied: number;
  readonly failed: number;
  readonly remaining: number;
  readonly error: unknown;
}

/** The cell identity the queue dedupes on. */
export function editKey(input: {
  readonly assessmentId: string;
  readonly enrolmentId: string;
  readonly learningAreaId: string;
}): string {
  return `${input.assessmentId}|${input.enrolmentId}|${input.learningAreaId}`;
}

function isPendingEdit(value: unknown): value is PendingEdit {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.key === 'string' &&
    typeof row.assessmentId === 'string' &&
    typeof row.enrolmentId === 'string' &&
    typeof row.learningAreaId === 'string' &&
    typeof row.status === 'string' &&
    typeof row.queuedAt === 'string' &&
    typeof row.token === 'string'
  );
}

/** A queue kept in browser storage; the fallback is memory, so a page still works without storage. */
export function createStoragePendingEditStore(
  storageKey: string,
  storage?: Storage | null
): PendingEditStore {
  const resolve = (): Storage | null => {
    if (storage !== undefined) return storage;
    try {
      return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
      return null;
    }
  };

  return {
    read() {
      const target = resolve();
      if (!target) return [];
      try {
        const raw = target.getItem(storageKey);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(isPendingEdit) : [];
      } catch {
        return [];
      }
    },
    write(edits) {
      const target = resolve();
      if (!target) return;
      try {
        target.setItem(storageKey, JSON.stringify(edits));
      } catch {
        // A full or blocked store must not break the grid; the edit stays in memory.
      }
    },
  };
}

/** A store that survives only the page; used when the browser gives the page no storage. */
export function createMemoryPendingEditStore(initial: readonly PendingEdit[] = []): PendingEditStore {
  let edits: readonly PendingEdit[] = [...initial];
  return {
    read: () => [...edits],
    write: (next) => {
      edits = [...next];
    },
  };
}

/**
 * The pending edits of one marks screen.
 *
 * One entry per cell: a newer edit of the same cell replaces the older one, so a teacher who types
 * 78 then 82 leaves one write behind, not two racing ones.
 */
export class PendingEditQueue {
  private readonly store: PendingEditStore;
  private sequence = 0;

  constructor(store: PendingEditStore) {
    this.store = store;
  }

  entries(): PendingEdit[] {
    return this.store.read();
  }

  size(): number {
    return this.store.read().length;
  }

  find(key: string): PendingEdit | undefined {
    return this.store.read().find((edit) => edit.key === key);
  }

  /** A token that differs for every edit, even two made in the same millisecond. */
  private nextToken(): string {
    this.sequence += 1;
    return `${Date.now().toString(36)}-${this.sequence.toString(36)}`;
  }

  /** Adds or replaces the edit of one cell. Returns the entry as stored. */
  enqueue(edit: Omit<PendingEdit, 'key' | 'queuedAt' | 'token' | 'attempts'> & { readonly key?: string }): PendingEdit {
    const key = edit.key ?? editKey(edit);
    const entry: PendingEdit = {
      ...edit,
      key,
      queuedAt: new Date().toISOString(),
      token: this.nextToken(),
      attempts: 0,
    };
    const current = this.store.read().filter((candidate) => candidate.key !== key);
    this.store.write([...current, entry]);
    return entry;
  }

  remove(key: string): void {
    this.store.write(this.store.read().filter((edit) => edit.key !== key));
  }

  /** Removes the entry only when it is still the one that was written. */
  removeIfUnchanged(key: string, token: string): void {
    this.store.write(
      this.store.read().filter((edit) => !(edit.key === key && edit.token === token))
    );
  }

  recordAttempt(key: string, token: string): void {
    this.store.write(
      this.store.read().map((edit) =>
        edit.key === key && edit.token === token ? { ...edit, attempts: edit.attempts + 1 } : edit
      )
    );
  }

  clear(): void {
    this.store.write([]);
  }
}

/**
 * Replays the queue through the repository.
 *
 * An entry is written once and removed once. Before the write the queue is re-read, so an edit the
 * teacher replaced during the flush is not written from the stale snapshot; after the write the
 * entry is removed only if it is still the entry that was written, so a newer edit of the same
 * cell survives. A refused write stays in the queue and is retried on the next flush.
 */
export async function flushPendingEdits(
  queue: PendingEditQueue,
  write: (edit: PendingEdit) => Promise<void>
): Promise<FlushReport> {
  const snapshot = queue.entries();
  let applied = 0;
  let failed = 0;
  let error: unknown = null;

  for (const entry of snapshot) {
    const current = queue.find(entry.key);
    if (!current || current.token !== entry.token) continue;
    try {
      await write(entry);
      queue.removeIfUnchanged(entry.key, entry.token);
      applied += 1;
    } catch (caught) {
      failed += 1;
      error ??= caught;
      queue.recordAttempt(entry.key, entry.token);
    }
  }

  return { applied, failed, remaining: queue.size(), error };
}

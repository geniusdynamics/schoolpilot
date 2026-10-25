// ABOUTME: The restricted-data access trail: one JSONL record per read or write of a restricted
// ABOUTME: field, naming the actor and the fields but never their values.

import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import type { EntityName } from '@/domain/schema';

/** What a caller did with the restricted data. */
export type RestrictedAccessAction = 'read' | 'list' | 'create' | 'update' | 'remove';

/** Whether the access was served. */
export type RestrictedAccessOutcome = 'allowed' | 'refused';

/** One access to restricted data. */
export interface RestrictedAccessEntry {
  readonly at: string;
  /** The actor the request named; null when it named none. */
  readonly actor: string | null;
  readonly action: RestrictedAccessAction;
  readonly entity: EntityName;
  /** The ids of the rows that carried restricted values. */
  readonly ids: readonly string[];
  /** The restricted fields touched, by name. Values are never recorded. */
  readonly fields: readonly string[];
  readonly outcome: RestrictedAccessOutcome;
}

/** Where restricted-data access is recorded. */
export interface RestrictedAccessLog {
  record(entry: RestrictedAccessEntry): void;
}

/** An access log that keeps entries in memory; used by tests and by an operator's dry run. */
export class MemoryRestrictedAccessLog implements RestrictedAccessLog {
  readonly entries: RestrictedAccessEntry[] = [];

  record(entry: RestrictedAccessEntry): void {
    this.entries.push(entry);
  }
}

/**
 * The hub's access log: one JSON line per entry, appended and flushed per record.
 *
 * The file is opened per record rather than held open, so a crash loses at most the entry being
 * written, and a rotated or deleted file is recreated instead of failing every later read. A
 * failed append throws: the caller treats a read it cannot record as a read it must not serve.
 */
export class FileRestrictedAccessLog implements RestrictedAccessLog {
  private readonly file: string;

  constructor(file: string) {
    this.file = file;
    mkdirSync(path.dirname(file), { recursive: true });
  }

  record(entry: RestrictedAccessEntry): void {
    appendFileSync(this.file, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', mode: 0o600 });
  }
}

/** The default access-log path under a hub's data directory. */
export function defaultRestrictedAccessLogFile(dataDir: string): string {
  return path.join(dataDir, 'logs', 'restricted-access.jsonl');
}

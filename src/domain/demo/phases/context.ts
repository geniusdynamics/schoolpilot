// ABOUTME: What every phase of the demo seed shares: the school's structure (current and previous
// ABOUTME: year), the open transaction, the clock, and the counters a failure reports.

import type { Repository, RepositoryRow, WriteOptions } from '@/data/repository';
import type { SqliteTransaction } from '@/data/adapters/sqlite';
import type { Id } from '@/domain/ids';
import type { CurrencyCode } from '@/domain/money';

/** One academic year of the demo school with what hangs off it. */
export interface DemoYear {
  readonly year: RepositoryRow<'academic_year'>;
  readonly financialYear: RepositoryRow<'financial_year'>;
  /** The terms in teaching order. */
  readonly terms: readonly RepositoryRow<'academic_period'>[];
  /** Every level x stream of the year, year-scoped. */
  readonly classGroups: readonly RepositoryRow<'class_group'>[];
}

/** The shared state of one run of the demo seed. */
export interface DemoContext {
  readonly repository: Repository;
  /** The repository's open transaction, so ledger and sequence stores can be bound to it. */
  readonly tx: SqliteTransaction;
  readonly institutionId: Id<'institution'>;
  readonly campusId: Id<'campus'>;
  readonly calendarId: Id<'calendar'>;
  readonly programmeId: Id<'programme'>;
  readonly currency: CurrencyCode;
  /** The day the demo is set on: terms before it are history, the one holding it is current. */
  readonly today: string;
  /** The levels in teaching order, lowest first. */
  readonly levels: readonly RepositoryRow<'level'>[];
  readonly current: DemoYear;
  readonly previous: DemoYear;
  /** The index in `current.terms` of the term the demo is set in. */
  readonly currentTermIndex: number;
  readonly options: WriteOptions;
  readonly count: (entity: string) => void;
  /** Names the substep that is running, so a failure reports where it happened. */
  readonly at: (name: string) => void;
}

/** The term of `year` that holds `day`, else the last one that ended before it, else the first. */
export function termIndexOn(terms: readonly { readonly start_date: string; readonly end_date: string }[], day: string): number {
  const holding = terms.findIndex((term) => term.start_date <= day && day <= term.end_date);
  if (holding >= 0) return holding;
  let lastEnded = -1;
  terms.forEach((term, index) => {
    if (term.end_date < day) lastEnded = index;
  });
  return lastEnded >= 0 ? lastEnded : 0;
}

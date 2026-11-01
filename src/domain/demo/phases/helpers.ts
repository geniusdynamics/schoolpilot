// ABOUTME: The small helpers every phase of the demo seed shares: natural-key lookups that make a
// ABOUTME: re-run reuse what it finds, dates, money, and the seeded random generator.

import type {
  CreateInput,
  ListQuery,
  Page,
  Repository,
  RepositoryRow,
  WriteOptions,
} from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';

/** A small deterministic generator, so two runs of the seed write the same scores. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/** The YYYY part of a date, for the document sequences. */
export function sequenceYear(date: string): number {
  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(year) ? year : new Date().getFullYear();
}

/** A code the canonical text columns accept: upper-case letters and digits. */
export function codeOf(value: string, fallback: string): string {
  const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.slice(0, 50) || fallback;
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** The same day `delta` calendar years away; the demo calendar never holds a 29 February. */
export function shiftYear(date: string, delta: number): string {
  return `${sequenceYear(date) + delta}${date.slice(4)}`;
}

/** The Monday-to-Friday days from `start` to `end`, both included, as ISO dates. */
export function weekdaysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(day);
  }
  return days;
}

/** The later of two ISO dates. */
export function laterOf(left: string, right: string): string {
  return left >= right ? left : right;
}

/** The earlier of two ISO dates. */
export function earlierOf(left: string, right: string): string {
  return left <= right ? left : right;
}

/** The first row matching the query, or null. */
export async function findOne<E extends EntityName>(
  repository: Repository,
  entity: E,
  query: ListQuery
): Promise<RepositoryRow<E> | null> {
  const page: Page<RepositoryRow<E>> = await repository.list(entity, { ...query, limit: 5 });
  return page.items[0] ?? null;
}

/**
 * The row of `entity` matching the natural key of `query`, created from `input` when it is missing.
 *
 * Every record the seed writes goes through this, so a second run (or a re-opened wizard) reuses
 * the school it finds instead of duplicating it. `onCreated` counts what a run actually wrote.
 */
export async function findOrCreate<E extends EntityName>(
  repository: Repository,
  entity: E,
  query: ListQuery,
  input: () => CreateInput<E>,
  options: WriteOptions,
  onCreated: () => void
): Promise<RepositoryRow<E>> {
  const existing = await findOne(repository, entity, query);
  if (existing) return existing;
  const row = await repository.create(entity, input(), options);
  onCreated();
  return row;
}

/** Every row of a query, following the pages the repository caps at its own maximum. */
export async function listAll<E extends EntityName>(
  repository: Repository,
  entity: E,
  query: Omit<ListQuery, 'limit' | 'cursor'> = {}
): Promise<RepositoryRow<E>[]> {
  const rows: RepositoryRow<E>[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page: Page<RepositoryRow<E>> = await repository.list(entity, {
      ...query,
      limit: 500,
      ...(cursor ? { cursor } : {}),
    });
    rows.push(...page.items);
    if (!page.hasMore || !page.nextCursor) return rows;
    cursor = page.nextCursor;
  }
}

/** A branded id from a row id, for the places a row hands its id to another row. */
export function idOf<E extends EntityName>(row: { readonly id: string }): Id<E> {
  return asId<E>(row.id);
}

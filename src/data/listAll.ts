// ABOUTME: Reads every page of a repository query, so a report is never silently truncated at the 500-row page cap.
// ABOUTME: The caller owns freshness; this helper makes one complete read and returns the rows in repository order.

import type { EntityName } from '@/domain/schema';
import type { ListQuery, RepositoryRow } from '@/data/repository';
import type { QueryRepository } from '@/data/query';

/** The largest page the repository will serve. */
const PAGE_SIZE = 500;

/** Reads a query to its last page. */
export async function listAll<E extends EntityName>(
  repository: QueryRepository,
  entity: E,
  query: ListQuery = {}
): Promise<RepositoryRow<E>[]> {
  const rows: RepositoryRow<E>[] = [];
  let cursor: string | undefined;
  do {
    const page = await repository.list(entity, {
      ...query,
      limit: PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
    });
    rows.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return rows;
}

// ABOUTME: Reads every page of a repository query by following its cursor, so a school's whole table
// ABOUTME: of marks or invoice lines is read, not the first page the repository caps at 500 rows.

import type { ListQuery, Page, RepositoryRow } from '@/data/repository';
import { MAX_LIMIT } from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import type { QueryRepository } from './cache';

/** The most pages one read follows: a bound, not a limit a school should reach (100,000 rows). */
const MAX_PAGES = 200;

/**
 * Every row of `query`, page by page, as one page that holds them all.
 *
 * The repository caps a page at {@link MAX_LIMIT} rows, so a single `list` silently returns a fraction
 * of a school's learners, invoices or marks. A caller that needs the whole table follows the cursor
 * until the rows run out; a caller that needs a window passes the `limit` it wants and does not use this.
 */
export async function readEveryPage<E extends EntityName>(
  repository: Pick<QueryRepository, 'list'>,
  entity: E,
  query: ListQuery = {}
): Promise<Page<RepositoryRow<E>>> {
  const items: RepositoryRow<E>[] = [];
  let cursor: string | undefined;
  for (let pages = 0; pages < MAX_PAGES; pages += 1) {
    const page: Page<RepositoryRow<E>> = await repository.list(entity, {
      ...query,
      limit: MAX_LIMIT,
      ...(cursor ? { cursor } : {}),
    });
    items.push(...page.items);
    if (!page.hasMore || !page.nextCursor) return { items, total: items.length, hasMore: false };
    cursor = page.nextCursor;
  }
  throw new Error(
    `${entity} holds more than ${MAX_PAGES * MAX_LIMIT} rows, which is more than a single read follows`
  );
}

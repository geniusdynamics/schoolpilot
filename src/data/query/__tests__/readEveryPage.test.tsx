// ABOUTME: Reading every page of a query: the pages are followed to the end, and the hook that asks for
// ABOUTME: them returns the rows beyond the first page and refreshes when the table changes.

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ListQuery, Page, RepositoryRow } from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import { queryCache, useEntityQuery } from '..';
import { readEveryPage } from '../readEveryPage';
import { FakeRepository, type FakeRow } from './fakeRepository';

/** A repository that cuts a table into pages of at most `size` rows, as the real one does at 500. */
class PagedRepository extends FakeRepository {
  constructor(private readonly size: number) {
    super();
  }

  override async list<E extends EntityName>(
    entity: E,
    query: ListQuery = {}
  ): Promise<Page<RepositoryRow<E>>> {
    this.listCalls += 1;
    const rows = this.rowsOf(entity);
    const start = query.cursor ? Number(query.cursor) : 0;
    const items = rows.slice(start, start + Math.min(query.limit ?? 50, this.size));
    const next = start + items.length;
    return {
      items: items as unknown as RepositoryRow<E>[],
      total: rows.length,
      hasMore: next < rows.length,
      ...(next < rows.length ? { nextCursor: String(next) } : {}),
    };
  }
}

const rowsOf = (count: number): FakeRow[] =>
  Array.from({ length: count }, (_, index) => ({ id: `r${index}`, name: `Row ${index}` }));

describe('readEveryPage', () => {
  it('follows the cursor until the rows run out', async () => {
    const repository = new PagedRepository(3);
    repository.seed('class_group', rowsOf(8));

    const page = await readEveryPage(repository, 'class_group');

    expect(page.items).toHaveLength(8);
    expect(page.items.map((row) => row.id)).toEqual(rowsOf(8).map((row) => row.id));
    expect(page.total).toBe(8);
    expect(page.hasMore).toBe(false);
    // Three pages: 3, 3 and 2 rows.
    expect(repository.listCalls).toBe(3);
  });

  it('reads an empty table as one empty page', async () => {
    const repository = new PagedRepository(3);

    const page = await readEveryPage(repository, 'class_group');

    expect(page.items).toEqual([]);
    expect(repository.listCalls).toBe(1);
  });
});

describe('useEntityQuery with allPages', () => {
  let repository: PagedRepository;

  beforeEach(() => {
    queryCache.clear();
    repository = new PagedRepository(3);
    repository.seed('class_group', rowsOf(8));
  });

  afterEach(() => {
    queryCache.clear();
  });

  it('returns the rows beyond the first page, where a plain read stops at the cap', async () => {
    // A plain read is one page: the repository returns at most its cap, here three rows.
    const capped = renderHook(() =>
      useEntityQuery(repository, 'class_group', { limit: 3 }, { mode: 'invalidate' })
    );
    const everything = renderHook(() =>
      useEntityQuery(repository, 'class_group', {}, { allPages: true })
    );

    await waitFor(() => expect(everything.result.current.status).toBe('success'));
    await waitFor(() => expect(capped.result.current.status).toBe('success'));

    expect(everything.result.current.data?.items).toHaveLength(8);
    expect(capped.result.current.data?.items).toHaveLength(3);
  });

  it('refreshes every page when the table changes', async () => {
    const { result } = renderHook(() =>
      useEntityQuery(repository, 'class_group', {}, { allPages: true })
    );
    await waitFor(() => expect(result.current.data?.items).toHaveLength(8));

    await act(async () => {
      await repository.write('class_group', { id: 'extra', name: 'Extra' });
    });

    await waitFor(() => expect(result.current.data?.items).toHaveLength(9));
    // It is not kept by the watch stream, which would deliver one page.
    expect(repository.watchSubscriptions).toBe(0);
  });
});

// ABOUTME: Tests the page-walking read used by reports: one call per cursor until the last page.
import { describe, expect, it, vi } from 'vitest';

import type { QueryRepository } from '@/data/query';
import { listAll } from '../listAll';

describe('listAll', () => {
  it('reads every page and returns the rows in order', async () => {
    const list = vi.fn(async (_entity: string, query: { cursor?: string }) =>
      query.cursor
        ? { items: [{ id: 'third' }], total: 3, hasMore: false }
        : { items: [{ id: 'first' }, { id: 'second' }], total: 3, hasMore: true, nextCursor: 'next' }
    );
    const repository = { list } as unknown as QueryRepository;

    const rows = await listAll(repository, 'learner');

    expect(rows.map((row) => row.id)).toEqual(['first', 'second', 'third']);
    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[0]?.[1]).toMatchObject({ limit: 500 });
    expect(list.mock.calls[1]?.[1]).toMatchObject({ limit: 500, cursor: 'next' });
  });
});

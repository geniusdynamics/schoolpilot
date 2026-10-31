// ABOUTME: Hook tests for useLookup: the explicit states, the archived resolution and the
// ABOUTME: handoff to the entity picker, which consumes the very same contract.

import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import EntityPicker from '@/components/ui/EntityPicker';
import type { Id } from '@/domain/ids';
import type { RepositoryRow } from '@/data/repository';

import { queryCache, useLookup } from '..';
import { FakeRepository } from './fakeRepository';

/** Lets the queued macrotasks of the repository run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const ACTIVE = '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e5f';
const ARCHIVED = '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e60';

type ClassGroupRow = RepositoryRow<'class_group'>;

describe('useLookup', () => {
  let repository: FakeRepository;

  beforeEach(() => {
    queryCache.clear();
    repository = new FakeRepository();
    repository.seed('class_group', [
      { id: ACTIVE, name: 'Grade 7 Blue' },
      { id: ARCHIVED, name: 'Grade 6 Blue', deleted_at: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  afterEach(() => {
    queryCache.clear();
  });

  it('starts empty and settles into the rows of the read', async () => {
    const { result } = renderHook(() =>
      useLookup('class_group', { repository, label: (row) => row.name })
    );

    expect(result.current.status).toBe('loading');
    expect(result.current.options).toEqual([]);

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.options.map((row) => row.name)).toEqual(['Grade 7 Blue']);
    expect(result.current.byId.size).toBe(2);
  });

  it('treats an empty result as a settled lookup and not as a loading one', async () => {
    repository.seed('class_group', []);
    const { result } = renderHook(() =>
      useLookup('class_group', { repository, label: (row) => row.name })
    );

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.options).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('keeps one derived map when the label is passed inline', async () => {
    const { result, rerender } = renderHook(() =>
      useLookup('class_group', { repository, label: (row) => row.name })
    );
    await waitFor(() => expect(result.current.status).toBe('success'));

    const derivedBefore = queryCache.derivedEntryCount();
    const mapBefore = result.current.byId;

    for (let index = 0; index < 20; index += 1) rerender();

    expect(queryCache.derivedEntryCount()).toBe(derivedBefore);
    expect(result.current.byId).toBe(mapBefore);

    // A genuine data change still produces a fresh map.
    await act(async () => {
      await repository.write('class_group', {
        id: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e61',
        name: 'Grade 8 Blue',
      });
      await flush();
    });

    await waitFor(() => expect(result.current.byId).not.toBe(mapBefore));
    expect(queryCache.derivedEntryCount()).toBe(derivedBefore);
  });

  it('resolves an archived row and keeps it out of the options', async () => {
    const { result } = renderHook(() =>
      useLookup('class_group', { repository, label: (row) => row.name })
    );
    await waitFor(() => expect(result.current.status).toBe('success'));

    const archivedId = ARCHIVED as Id<'class_group'>;
    expect(result.current.resolve(archivedId)?.name).toBe('Grade 6 Blue');
    expect(result.current.label(archivedId)).toBe('Grade 6 Blue (archived)');
    expect(result.current.options.map((row) => row.id)).toEqual([ACTIVE]);
    expect(result.current.isArchived(result.current.resolve(archivedId)!)).toBe(true);
  });

  it('offers the archived rows when the caller asks for them', async () => {
    const { result } = renderHook(() =>
      useLookup('class_group', {
        repository,
        label: (row) => row.name,
        includeArchived: true,
      })
    );
    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.options.map((row) => row.name)).toEqual([
      'Grade 7 Blue',
      'Grade 6 Blue',
    ]);
  });

  it('falls back to the given text for an unknown id', async () => {
    const { result } = renderHook(() =>
      useLookup('class_group', { repository, label: (row) => row.name })
    );
    await waitFor(() => expect(result.current.status).toBe('success'));

    const unknown = '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e99' as Id<'class_group'>;
    expect(result.current.label(unknown, 'Unknown group')).toBe('Unknown group');
    expect(result.current.resolve(unknown)).toBeUndefined();
  });

  it('refreshes after a write', async () => {
    const { result } = renderHook(() =>
      useLookup('class_group', { repository, label: (row) => row.name })
    );
    await waitFor(() => expect(result.current.status).toBe('success'));

    await act(async () => {
      await repository.write('class_group', { id: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e61', name: 'Grade 8 Blue' });
      await flush();
    });

    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(result.current.options.map((row) => row.name)).toEqual([
      'Grade 7 Blue',
      'Grade 8 Blue',
    ]);
  });

  it('searches a learner by admission number and by name without a custom field list', async () => {
    repository.seed('learner', [
      {
        id: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e70',
        name: 'Amina Wanjiku',
        admission_number: 'ADM/2026/012',
        given_name: 'Amina',
        family_name: 'Wanjiku',
      },
      {
        id: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e71',
        name: 'Baraka Otieno',
        admission_number: 'ADM/2026/120',
        given_name: 'Baraka',
        family_name: 'Otieno',
      },
    ]);
    const { result } = renderHook(() => useLookup('learner', { repository }));
    await waitFor(() => expect(result.current.status).toBe('success'));

    const byAdmission = await result.current.search?.('12');
    expect(byAdmission?.map((row) => row.admission_number)).toEqual([
      'ADM/2026/012',
      'ADM/2026/120',
    ]);

    const byName = await result.current.search?.('amina');
    expect(byName?.map((row) => row.family_name)).toEqual(['Wanjiku']);
  });

  it('searches the repository beyond the loaded page, and fetches one row by id', async () => {
    const { result } = renderHook(() =>
      useLookup('class_group', {
        repository,
        label: (row) => row.name,
        searchFields: ['name'],
      })
    );
    await waitFor(() => expect(result.current.status).toBe('success'));

    const matches = await result.current.search?.('blue');
    expect(matches?.map((row) => row.name)).toEqual(['Grade 7 Blue']);
    expect(result.current.searchText(result.current.resolve(ACTIVE as Id<'class_group'>)!)).toContain(
      'grade 7 blue'
    );

    const fetched = await result.current.fetch(ACTIVE as Id<'class_group'>);
    expect(fetched?.name).toBe('Grade 7 Blue');
  });

  it('serves the entity picker', async () => {
    const { result } = renderHook(() =>
      useLookup('class_group', { repository, label: (row) => row.name })
    );
    await waitFor(() => expect(result.current.status).toBe('success'));

    render(
      <EntityPicker<ClassGroupRow, Id<'class_group'>>
        label="Class group"
        value={null}
        onChange={() => undefined}
        lookup={result.current}
      />
    );

    const trigger = screen.getByRole('combobox', { name: 'Class group' });
    await act(async () => {
      trigger.click();
    });

    expect(screen.getByRole('option', { name: 'Grade 7 Blue' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Grade 6 Blue' })).not.toBeInTheDocument();
  });
});

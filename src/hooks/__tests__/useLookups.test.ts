// ABOUTME: Tests for the shared lookup builder: id → label maps for streams/classes and read-time placement resolution.
// ABOUTME: Ensures string (UUID) ids resolve and that labels never depend on denormalised *_name fields.

import { describe, it, expect } from 'vitest';
import { buildLookups, resolveClassPlacement } from '../useLookups';

const sources = {
  classes: [{ id: 'c-7', name: 'Grade 7' }, { id: 'c-8', name: 'Grade 8' }],
  classStreams: [
    { id: 's-blue', class_id: 'c-7', name: 'Blue', class_name: 'STALE' },
    { id: 's-green', class_id: 'c-8', name: 'Green' },
    { id: 's-orphan', class_id: 'missing', name: 'Orphan' },
  ],
  studentCategories: [{ id: 1, name: 'Boarder' }],
  dormitories: [{ id: 'd-1', name: 'Simba House' }],
  guardians: [{ id: 'g-1', name: 'Jane', phone: '07' }],
  guardianRelationships: [],
};

describe('buildLookups', () => {
  it('builds stream labels from the live class rows, ignoring denormalised names', () => {
    const lookups = buildLookups(sources);
    expect(lookups.streamById.get('s-blue')).toMatchObject({ className: 'Grade 7', name: 'Blue', label: 'Grade 7 · Blue' });
    expect(lookups.streamById.get('s-orphan')?.label).toBe('Orphan');
    expect(lookups.streamOptions.map(o => o.value)).toEqual(['s-blue', 's-green', 's-orphan']);
  });

  it('keys every map by string id', () => {
    const lookups = buildLookups(sources);
    expect(lookups.categoryNameById.get('1')).toBe('Boarder');
    expect(lookups.dormitoryNameById.get('d-1')).toBe('Simba House');
    expect(lookups.guardiansById.get('g-1')?.name).toBe('Jane');
  });
});

describe('resolveClassPlacement', () => {
  it('resolves class and stream names from a stream id', () => {
    const lookups = buildLookups(sources);
    expect(resolveClassPlacement(lookups, 's-green')).toEqual({ className: 'Grade 8', streamName: 'Green' });
    expect(resolveClassPlacement(lookups, null)).toEqual({ className: null, streamName: null });
    expect(resolveClassPlacement(lookups, 'unknown')).toEqual({ className: null, streamName: null });
  });
});

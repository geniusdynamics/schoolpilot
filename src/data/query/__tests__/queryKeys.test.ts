// ABOUTME: Tests the canonical query keys: the hash is stable, the entity is part of it and
// ABOUTME: every value that cannot survive a round trip through JSON is refused.

import { describe, expect, it } from 'vitest';

import { queryKey, stableStringify } from '..';

describe('query keys', () => {
  it('puts the entity into the hash', () => {
    expect(queryKey('learner', {}).hash).not.toBe(queryKey('class_group', {}).hash);
    expect(queryKey('learner', {}).hash).toBe('learner:{}');
  });

  it('ignores the key order and the undefined object values', () => {
    const first = queryKey('learner', { b: 2, a: { d: 4, c: 3 }, gone: undefined });
    const second = queryKey('learner', { a: { c: 3, d: 4 }, b: 2 });

    expect(first.hash).toBe(second.hash);
    expect(first.query.gone).toBeUndefined();
  });

  it('stores a date as its ISO string', () => {
    const dated = queryKey('learner', { from: new Date('2026-01-01T00:00:00Z') });

    expect(dated.query.from).toBe('2026-01-01T00:00:00.000Z');
    expect(dated.hash).toBe(queryKey('learner', { from: '2026-01-01T00:00:00.000Z' }).hash);
  });

  it('snapshots the query, so a later mutation cannot desync the key', () => {
    const input = { status: 'active', nested: { level: 1 } };
    const key = queryKey('learner', input);

    input.status = 'archived';
    input.nested.level = 2;

    expect(key.query.status).toBe('active');
    expect((key.query.nested as { level: number }).level).toBe(1);
    expect(key.hash).toBe(queryKey('learner', { status: 'active', nested: { level: 1 } }).hash);
    expect(Object.isFrozen(key.query)).toBe(true);
    expect(Object.isFrozen(key.query.nested)).toBe(true);
    expect(() => {
      (key.query as { status: string }).status = 'archived';
    }).toThrow(TypeError);
  });

  it('refuses the values a key cannot carry', () => {
    expect(() => stableStringify({ map: new Map() })).toThrow(/unsupported object Map/);
    expect(() => stableStringify({ set: new Set() })).toThrow(/unsupported object Set/);
    expect(() => stableStringify({ re: /x/ })).toThrow(/unsupported object RegExp/);
    expect(() => stableStringify({ ids: ['a', undefined] })).toThrow(/undefined array element/);
    expect(() => stableStringify({ n: Number.NaN })).toThrow(/non-finite/);
    expect(() => stableStringify({ fn: () => 1 })).toThrow(/unsupported function/);
    expect(() => stableStringify({ big: 1n })).toThrow(/unsupported bigint/);
    expect(() => stableStringify({ sym: Symbol('x') })).toThrow(/unsupported symbol/);

    class Custom {
      readonly value = 1;
    }
    expect(() => stableStringify({ custom: new Custom() })).toThrow(/unsupported object Custom/);
  });
});

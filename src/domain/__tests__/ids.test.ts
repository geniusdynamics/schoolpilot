// ABOUTME: Unit tests for branded Id<T> and the UUIDv7 generator in src/domain/ids.ts.
// ABOUTME: Covers wire format, version/variant bits, same-millisecond monotonicity and the brand.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { asId, compareIds, generateUuidv7, isId } from '../ids';
import type { Id } from '../ids';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function timestampOf(id: string): number {
  return parseInt(`${id.slice(0, 8)}${id.slice(9, 13)}`, 16);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateUuidv7', () => {
  it('returns a canonical UUIDv7 with the version and variant bits set', () => {
    for (let i = 0; i < 100; i++) {
      const id = generateUuidv7();
      expect(id).toMatch(UUID_V7);
      expect(id[14]).toBe('7');
      expect('89ab').toContain(id[19]);
    }
  });

  it('encodes the current time in the first 48 bits', () => {
    const before = Date.now();
    const timestamp = timestampOf(generateUuidv7());
    const after = Date.now();
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('is strictly increasing across a tight loop, including within one millisecond', () => {
    const frozen = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(frozen);

    const ids = Array.from({ length: 1000 }, () => generateUuidv7());

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(timestampOf(id)).toBe(frozen);
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i - 1] < ids[i]).toBe(true);
      expect(compareIds(asId(ids[i - 1]), asId(ids[i]))).toBe(-1);
    }
  });

  it('stays ordered when the clock moves backwards', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5_000);
    const first = generateUuidv7();

    vi.mocked(Date.now).mockReturnValue(Date.now() - 5_000);
    const second = generateUuidv7();

    expect(first < second).toBe(true);
  });
});

describe('isId', () => {
  it('accepts generated ids and rejects numeric, empty, prefixed and non-v7 strings', () => {
    expect(isId(generateUuidv7())).toBe(true);
    expect(isId('12345')).toBe(false);
    expect(isId('')).toBe(false);
    expect(isId('student-12345')).toBe(false);
    expect(isId('018f2b6c-7a10-4b3e-8f11-0123456789ab')).toBe(false);
    expect(isId(null)).toBe(false);
    expect(isId(42)).toBe(false);
  });
});

describe('asId', () => {
  it('returns the same runtime string while branding it for the type system', () => {
    const raw = generateUuidv7();
    const studentId = asId<'student'>(raw);
    expect(studentId).toBe(raw);
    expect(isId(studentId)).toBe(true);
  });

  it('brands entity types so a plain string is not assignable to an Id', () => {
    const raw = generateUuidv7();
    // @ts-expect-error a plain string must be branded with asId() before use as an id
    const studentId: Id<'student'> = raw;
    expect(studentId).toBe(raw);
  });
});

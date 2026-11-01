// ABOUTME: Tests the local receipt layout: defaults, field-by-field fallback for a corrupt value, and
// ABOUTME: the save/read round trip.

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RECEIPT_LAYOUT,
  RECEIPT_LAYOUT_STORAGE_KEY,
  readReceiptLayout,
  writeReceiptLayout,
} from '../receiptLayout';

const fakeStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
};

describe('receipt layout', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(readReceiptLayout(fakeStorage())).toEqual(DEFAULT_RECEIPT_LAYOUT);
  });

  it('falls back field by field when a stored value is corrupt', () => {
    const storage = fakeStorage();
    storage.setItem(RECEIPT_LAYOUT_STORAGE_KEY, JSON.stringify({ template: 'a9', title: '' }));

    expect(readReceiptLayout(storage)).toEqual(DEFAULT_RECEIPT_LAYOUT);
  });

  it('round-trips a saved layout', () => {
    const storage = fakeStorage();
    const saved = { ...DEFAULT_RECEIPT_LAYOUT, template: 'a4' as const, title: 'FEE RECEIPT' };
    expect(writeReceiptLayout(saved, storage)).toBe(true);
    expect(readReceiptLayout(storage)).toEqual(saved);
  });
});

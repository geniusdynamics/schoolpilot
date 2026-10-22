// ABOUTME: Tests the deprecated KES wrappers in the shared formatting utilities: they still render
// ABOUTME: the way they always did, because the pages that have not migrated yet still call them.

import { describe, expect, it } from 'vitest';

import { formatKES, formatKESCompact } from '../format';

/** The rendered text with the locale's non-breaking space normalised to a plain one. */
function render(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, ' ');
}

describe('the deprecated KES wrappers', () => {
  it('renders Kenyan shillings in major units', () => {
    expect(render(formatKES(1500))).toBe('Ksh 1,500.00');
    expect(render(formatKES(1500.55))).toBe('Ksh 1,500.55');
    expect(render(formatKES(0))).toBe('Ksh 0.00');
  });

  it('keeps the placeholder for a missing amount', () => {
    expect(formatKES(null)).toBe('—');
    expect(formatKES(undefined)).toBe('—');
    expect(formatKES(Number.NaN)).toBe('—');
  });

  it('renders the compact form', () => {
    expect(render(formatKESCompact(1250000))).toBe('Ksh 1.3M');
    expect(formatKESCompact(null)).toBe('—');
  });
});

// ABOUTME: Paste planning tests: row-major fill, a refused cell in the middle that does not discard
// ABOUTME: the values around it, spreadsheet addresses, and locked cells that the paste cannot reach.

import { describe, expect, it } from 'vitest';

import { cellAddress, columnAddress, parsePastedGrid, pasteSummary, planPaste } from '../paste';

function target(overrides: Partial<Parameters<typeof planPaste>[3]> = {}) {
  return {
    rowCount: 3,
    columnCount: 2,
    maxFor: (columnIndex: number) => (columnIndex === 0 ? 20 : 100),
    blockedReason: () => null,
    ...overrides,
  };
}

describe('paste planning', () => {
  it('reads a spreadsheet range as tab-separated rows and drops the terminating newline', () => {
    expect(parsePastedGrid('10\t50\r\n15\t60\r\n')).toEqual([
      ['10', '50'],
      ['15', '60'],
    ]);
    expect(parsePastedGrid('')).toEqual([]);
  });

  it('addresses columns the way a spreadsheet does', () => {
    expect(columnAddress(0)).toBe('A');
    expect(columnAddress(25)).toBe('Z');
    expect(columnAddress(26)).toBe('AA');
    expect(cellAddress(2, 1)).toBe('B3');
  });

  it('fills the grid row-major from the focused cell', () => {
    const plan = planPaste('10\t50\n15\t60', 0, 0, target());

    expect(plan.rejected).toEqual([]);
    expect(plan.accepted).toEqual([
      { rowIndex: 0, columnIndex: 0, score: '10' },
      { rowIndex: 0, columnIndex: 1, score: '50' },
      { rowIndex: 1, columnIndex: 0, score: '15' },
      { rowIndex: 1, columnIndex: 1, score: '60' },
    ]);
  });

  it('keeps the accepted values when a cell in the middle is refused, and names its address', () => {
    const plan = planPaste('10\t50\n15\t200', 0, 0, target());

    expect(plan.accepted).toEqual([
      { rowIndex: 0, columnIndex: 0, score: '10' },
      { rowIndex: 0, columnIndex: 1, score: '50' },
      { rowIndex: 1, columnIndex: 0, score: '15' },
    ]);
    expect(plan.rejected).toEqual([
      expect.objectContaining({
        address: 'B2',
        value: '200',
        reason: 'A score cannot be above the maximum of 100.',
      }),
    ]);
    expect(pasteSummary(plan)).toContain('B2');
    expect(pasteSummary(plan)).toContain('The other 3 marks were applied.');
  });

  it('refuses a non-number at its address and keeps the valid neighbour', () => {
    const plan = planPaste('ten\t50', 0, 0, target());

    expect(plan.accepted).toEqual([{ rowIndex: 0, columnIndex: 1, score: '50' }]);
    expect(plan.rejected).toEqual([
      expect.objectContaining({
        address: 'A1',
        value: 'ten',
        reason: 'A score is a number, for example 78 or 78.5.',
      }),
    ]);
  });

  it('never writes a locked cell, and still writes its neighbours', () => {
    const plan = planPaste('10\t50\n15\t60', 0, 0, target({
      blockedReason: (_row, column) =>
        column === 1 ? 'Marks for this assessment are locked; a change needs a reason.' : null,
    }));

    expect(plan.accepted).toEqual([
      { rowIndex: 0, columnIndex: 0, score: '10' },
      { rowIndex: 1, columnIndex: 0, score: '15' },
    ]);
    expect(plan.rejected.map((entry) => entry.address)).toEqual(['B1', 'B2']);
  });

  it('refuses a value that falls outside the grid, and keeps the one inside it', () => {
    const plan = planPaste('10\t50\n15\t60', 0, 0, target({ rowCount: 1, columnCount: 1 }));

    expect(plan.accepted).toEqual([{ rowIndex: 0, columnIndex: 0, score: '10' }]);
    expect(plan.rejected.map((entry) => entry.address)).toEqual(['B1', 'A2', 'B2']);
    expect(plan.rejected[0].reason).toContain('outside the grid');
  });

  it('skips a blank cell instead of treating it as a zero', () => {
    const plan = planPaste('10\t\n15\t60', 0, 0, target());

    expect(plan.accepted.map((entry) => entry.score)).toEqual(['10', '15', '60']);
    expect(plan.skipped).toBe(1);
    expect(plan.rejected).toEqual([]);
  });

  it('marks a single value as not a range, so the browser paste can handle it', () => {
    expect(planPaste('10', 0, 0, target()).multiCell).toBe(false);
    expect(planPaste('10\t20', 0, 0, target()).multiCell).toBe(true);
  });
});

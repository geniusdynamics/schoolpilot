// ABOUTME: Keyboard model tests: arrows clamp at the edge, Tab wraps to the next row, Enter moves
// ABOUTME: down, and shift reverses both.

import { describe, expect, it } from 'vitest';

import { nextCell } from '../navigation';

const shape = { rowCount: 3, columnCount: 2 };

describe('grid keyboard model', () => {
  it('moves with the arrow keys and clamps at the edge', () => {
    expect(nextCell('ArrowRight', false, { row: 0, column: 0 }, shape)).toEqual({ row: 0, column: 1 });
    expect(nextCell('ArrowDown', false, { row: 0, column: 1 }, shape)).toEqual({ row: 1, column: 1 });
    expect(nextCell('ArrowUp', false, { row: 0, column: 0 }, shape)).toBeNull();
    expect(nextCell('ArrowLeft', false, { row: 0, column: 0 }, shape)).toBeNull();
    expect(nextCell('ArrowDown', false, { row: 2, column: 0 }, shape)).toBeNull();
  });

  it('wraps Tab to the next row and back with shift', () => {
    expect(nextCell('Tab', false, { row: 0, column: 1 }, shape)).toEqual({ row: 1, column: 0 });
    expect(nextCell('Tab', true, { row: 1, column: 0 }, shape)).toEqual({ row: 0, column: 1 });
    expect(nextCell('Tab', true, { row: 0, column: 0 }, shape)).toBeNull();
    expect(nextCell('Tab', false, { row: 2, column: 1 }, shape)).toBeNull();
  });

  it('moves down on Enter and up with shift, and stays in the column', () => {
    expect(nextCell('Enter', false, { row: 0, column: 1 }, shape)).toEqual({ row: 1, column: 1 });
    expect(nextCell('Enter', true, { row: 1, column: 1 }, shape)).toEqual({ row: 0, column: 1 });
    expect(nextCell('Enter', false, { row: 2, column: 0 }, shape)).toBeNull();
  });

  it('jumps to the row ends with Home and End', () => {
    expect(nextCell('Home', false, { row: 1, column: 1 }, shape)).toEqual({ row: 1, column: 0 });
    expect(nextCell('End', false, { row: 1, column: 0 }, shape)).toEqual({ row: 1, column: 1 });
  });

  it('leaves a key it does not own to the browser', () => {
    expect(nextCell('a', false, { row: 0, column: 0 }, shape)).toBeNull();
    expect(nextCell('Escape', false, { row: 0, column: 0 }, shape)).toBeNull();
  });
});

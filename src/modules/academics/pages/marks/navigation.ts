// ABOUTME: The keyboard model of the mark grid: where a key moves the focus, as a pure function
// ABOUTME: the table component can call without knowing anything about the data behind it.

/** One cell of the grid, zero-based. */
export interface CellPosition {
  readonly row: number;
  readonly column: number;
}

/** How many rows and columns the grid currently shows. */
export interface GridShape {
  readonly rowCount: number;
  readonly columnCount: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function moved(from: CellPosition, row: number, column: number): CellPosition | null {
  return row === from.row && column === from.column ? null : { row, column };
}

/**
 * The cell a key press moves focus to, or null when the key is not a navigation key or the focus
 * cannot move (the grid's last cell on Tab, its last row on Enter).
 *
 * Tab wraps to the next row, as a spreadsheet does; Enter moves down the column. Arrows clamp at
 * the edge rather than wrapping, so a held arrow key never jumps across the grid.
 */
export function nextCell(
  key: string,
  shiftKey: boolean,
  from: CellPosition,
  shape: GridShape
): CellPosition | null {
  const lastRow = shape.rowCount - 1;
  const lastColumn = shape.columnCount - 1;
  if (lastRow < 0 || lastColumn < 0) return null;

  switch (key) {
    case 'ArrowUp':
      return moved(from, clamp(from.row - 1, 0, lastRow), from.column);
    case 'ArrowDown':
      return moved(from, clamp(from.row + 1, 0, lastRow), from.column);
    case 'ArrowLeft':
      return moved(from, from.row, clamp(from.column - 1, 0, lastColumn));
    case 'ArrowRight':
      return moved(from, from.row, clamp(from.column + 1, 0, lastColumn));
    case 'Home':
      return moved(from, from.row, 0);
    case 'End':
      return moved(from, from.row, lastColumn);
    case 'Enter':
      return moved(from, clamp(from.row + (shiftKey ? -1 : 1), 0, lastRow), from.column);
    case 'Tab': {
      if (!shiftKey) {
        if (from.column < lastColumn) return { row: from.row, column: from.column + 1 };
        if (from.row < lastRow) return { row: from.row + 1, column: 0 };
        return null;
      }
      if (from.column > 0) return { row: from.row, column: from.column - 1 };
      if (from.row > 0) return { row: from.row - 1, column: lastColumn };
      return null;
    }
    default:
      return null;
  }
}

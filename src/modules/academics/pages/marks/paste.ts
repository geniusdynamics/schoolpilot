// ABOUTME: Plans a paste from a spreadsheet into the mark grid: row-major from the focused cell,
// ABOUTME: every value checked, the accepted values applied and the refused ones reported by address.

import { checkScore } from './scheme';

/** Why one pasted value was refused, at the address it would have landed on. */
export interface PasteRejection {
  readonly address: string;
  readonly value: string;
  readonly reason: string;
}

/** One value the paste will write, at its grid position. */
export interface PasteEntry {
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly score: string;
}

/** The result of planning a paste: what will be written, what will not, and what was blank. */
export interface PastePlan {
  readonly accepted: readonly PasteEntry[];
  readonly rejected: readonly PasteRejection[];
  /** Blank cells in the clipboard; a blank cannot clear a stored score, so it changes nothing. */
  readonly skipped: number;
  /** True when the clipboard held more than one cell (a range, not a single value). */
  readonly multiCell: boolean;
}

/** The grid the paste lands on. */
export interface PasteTarget {
  readonly rowCount: number;
  readonly columnCount: number;
  /** The maximum of a column, or null when the scheme declares none. */
  readonly maxFor: (columnIndex: number) => number | null;
  /** Why a cell cannot be written at all (locked, moderated, no maximum), or null when it can. */
  readonly blockedReason: (rowIndex: number, columnIndex: number) => string | null;
}

/**
 * Splits spreadsheet clipboard text into a matrix.
 *
 * A spreadsheet copies a range as tab-separated rows. A trailing newline is the row terminator of
 * the last row, not an empty row, so it is dropped.
 */
export function parsePastedGrid(text: string): string[][] {
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (normalised === '') return [];
  const lines = normalised.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.map((line) => line.split('\t'));
}

/** The spreadsheet address of a zero-based column: A, B, ... Z, AA, AB. */
export function columnAddress(index: number): string {
  let remaining = index;
  let address = '';
  do {
    address = String.fromCharCode(65 + (remaining % 26)) + address;
    remaining = Math.floor(remaining / 26) - 1;
  } while (remaining >= 0);
  return address;
}

/** The spreadsheet address of a zero-based cell. */
export function cellAddress(rowIndex: number, columnIndex: number): string {
  return `${columnAddress(columnIndex)}${rowIndex + 1}`;
}

/**
 * Plans a paste starting at the focused cell.
 *
 * Values are consumed row-major, exactly as the spreadsheet presents them, so a 2x3 range fills
 * two rows of three columns. A value the scheme refuses is reported with its address and left out
 * of `accepted`; the values around it are still written. A cell that cannot be written at all
 * (locked, moderated, no maximum) is refused the same way, and the paste never reaches it.
 */
export function planPaste(
  text: string,
  anchorRow: number,
  anchorColumn: number,
  target: PasteTarget
): PastePlan {
  const matrix = parsePastedGrid(text);
  const accepted: PasteEntry[] = [];
  const rejected: PasteRejection[] = [];
  let skipped = 0;
  const multiCell = matrix.length > 1 || matrix.some((row) => row.length > 1);

  matrix.forEach((values, rowOffset) => {
    values.forEach((value, columnOffset) => {
      const rowIndex = anchorRow + rowOffset;
      const columnIndex = anchorColumn + columnOffset;
      const address = cellAddress(rowIndex, columnIndex);

      if (rowIndex >= target.rowCount || columnIndex >= target.columnCount) {
        rejected.push({
          address,
          value,
          reason: 'That cell is outside the grid this teaching group is marked on.',
        });
        return;
      }

      if (value.trim() === '') {
        skipped += 1;
        return;
      }

      const blocked = target.blockedReason(rowIndex, columnIndex);
      if (blocked !== null) {
        rejected.push({ address, value, reason: blocked });
        return;
      }

      const check = checkScore(value, target.maxFor(columnIndex));
      if (!check.ok) {
        rejected.push({ address, value, reason: check.message });
        return;
      }

      accepted.push({ rowIndex, columnIndex, score: check.score });
    });
  });

  return { accepted, rejected, skipped, multiCell };
}

/** The message the grid shows after a paste, or null when everything landed. */
export function pasteSummary(plan: PastePlan): string | null {
  if (plan.rejected.length === 0) {
    if (plan.accepted.length === 0) return null;
    return `Pasted ${plan.accepted.length} ${plan.accepted.length === 1 ? 'mark' : 'marks'}.`;
  }
  const refused = plan.rejected.map((entry) => `${entry.address}: ${entry.reason}`).join(' ');
  const applied =
    plan.accepted.length === 0
      ? 'No mark was pasted.'
      : `The other ${plan.accepted.length} ${plan.accepted.length === 1 ? 'mark was' : 'marks were'} applied.`;
  return `Some pasted cells were refused. ${refused} ${applied}`;
}

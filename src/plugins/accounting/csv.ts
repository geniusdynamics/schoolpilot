// ABOUTME: The CSV writer and reader the file connectors share: RFC 4180 quoting, a trailing newline on
// ABOUTME: every file written, and a reader strict enough to parse back exactly what was written.

/** One cell of a CSV row; an empty cell is written as nothing at all, never as a zero. */
export type CsvCell = string | number | null | undefined;

/** Writes rows as CSV: comma separated, quoted only where it is needed, one newline at the end. */
export function toCsv(rows: readonly (readonly CsvCell[])[]): string {
  const lines = rows.map((row) => row.map(cellText).join(','));
  return `${lines.join('\n')}\n`;
}

/**
 * Reads CSV back into rows of cells.
 *
 * Accepts LF or CRLF, a quoted cell that carries a comma, a quote (doubled) or a line break, and a
 * final newline that is present or absent.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let index = 0;

  while (index < text.length) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      cell += character;
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = true;
      index += 1;
      continue;
    }
    if (character === ',') {
      row.push(cell);
      cell = '';
      index += 1;
      continue;
    }
    if (character === '\r' && text[index + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      index += 2;
      continue;
    }
    if (character === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      index += 1;
      continue;
    }
    cell += character;
    index += 1;
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** A cell as the text of the file: quoted when a comma, a quote, a line break or a stray space needs it. */
function cellText(cell: CsvCell): string {
  const text = cell === null || cell === undefined ? '' : String(cell);
  if (/[",\n\r]/.test(text) || /^\s|\s$/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

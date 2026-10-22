// ABOUTME: A small RFC 4180 CSV reader: quoted fields with embedded delimiters and newlines, a BOM,
// ABOUTME: CRLF or LF, and a delimiter the header itself picks. It reports the file line each record
// ABOUTME: started on so a refusal can name it.

import { ReconciliationError } from './errors';
import { stripBom } from './normalise';

/** One CSV record: its fields, the line it started on, and its exact source text. */
export interface CsvRecord {
  readonly fields: readonly string[];
  /** The 1-based line of the file the record started on. */
  readonly line: number;
  /** The exact source text of the record, without its terminating newline. */
  readonly raw: string;
}

/** The delimiters a bank export uses, in the order a tie is broken. */
export const CSV_DELIMITERS: readonly string[] = [',', ';', '\t', '|'];

/**
 * Picks the delimiter of a CSV.
 *
 * The first line that holds any candidate delimiter decides: the candidate that appears most often
 * outside quotes wins, and a tie goes to the earlier candidate in {@link CSV_DELIMITERS}. A file
 * with no delimiter at all is not a CSV.
 */
export function detectDelimiter(text: string): string | null {
  const firstLine = stripBom(text)
    .split('\n')
    .find((line) => line.trim() !== '');
  if (firstLine === undefined) return null;
  const counts = CSV_DELIMITERS.map((delimiter) => ({
    delimiter,
    count: countOutsideQuotes(firstLine, delimiter),
  }));
  const best = counts.reduce((winner, candidate) =>
    candidate.count > winner.count ? candidate : winner
  );
  return best.count === 0 ? null : best.delimiter;
}

function countOutsideQuotes(line: string, delimiter: string): number {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') quoted = !quoted;
    else if (character === delimiter && !quoted) count += 1;
  }
  return count;
}

/**
 * Reads a CSV into records.
 *
 * A quoted field may hold the delimiter and a newline; a doubled quote inside one is one quote.
 * Blank lines are dropped, but the line counter still counts them, so a record's line is the line
 * of the file it came from. An unterminated quote is refused, naming the line the quote opened on:
 * the rest of the file would otherwise be read as one record.
 */
export function parseCsv(text: string, delimiter?: string): readonly CsvRecord[] {
  const source = stripBom(text).replace(/\r\n?/g, '\n');
  const separator = delimiter ?? detectDelimiter(source);
  if (separator === null) {
    throw new ReconciliationError('unknown_format', 'the text carries no CSV delimiter', {
      detail: {},
    });
  }

  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = '';
  let line = 1;
  let recordLine = 1;
  let recordStart = 0;
  let quoteLine: number | null = null;
  let quoted = false;

  const endRecord = (end: number): void => {
    fields.push(field);
    const raw = source.slice(recordStart, end);
    if (!(fields.length === 1 && fields[0].trim() === '')) {
      records.push({ fields, line: recordLine, raw });
    }
    fields = [];
    field = '';
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          quoteLine = null;
        }
      } else {
        if (character === '\n') line += 1;
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
      quoteLine = line;
      continue;
    }
    if (character === separator) {
      fields.push(field);
      field = '';
      continue;
    }
    if (character === '\n') {
      endRecord(index);
      line += 1;
      recordLine = line;
      recordStart = index + 1;
      continue;
    }
    field += character;
  }

  if (quoted) {
    throw new ReconciliationError(
      'malformed_row',
      `the field opened on line ${quoteLine ?? recordLine} is never closed; the quote is unterminated`,
      { detail: { line: quoteLine ?? recordLine } }
    );
  }
  if (fields.length > 0 || field !== '') {
    endRecord(source.length);
  }
  return records;
}

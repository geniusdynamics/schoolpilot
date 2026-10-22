// ABOUTME: A small OFX reader that takes both shapes banks send: the OFX 1.x SGML body, whose tags
// ABOUTME: have no closing form, and the OFX 2.x XML body. It returns the raw transactions and the
// ABOUTME: file line each one started on, so a refusal can name it.

import { ReconciliationError } from './errors';
import { normaliseNewlines, stripBom } from './normalise';

/** One raw `<STMTTRN>` as the file wrote it. */
export interface OfxTransaction {
  /** The transaction type tag, upper-cased (`DEBIT`, `CREDIT`, `CHECK`, ...). */
  readonly trnType: string | null;
  readonly datePosted: string | null;
  /** The signed amount text exactly as written. */
  readonly amountText: string | null;
  readonly fitId: string | null;
  readonly refNum: string | null;
  readonly name: string | null;
  readonly memo: string | null;
  readonly checkNum: string | null;
  /** The 1-based line of the file the `<STMTTRN>` opened on. */
  readonly line: number;
  /** The block's exact source text, kept for the audit. */
  readonly raw: string;
}

/** What an OFX file holds. */
export interface OfxDocument {
  /** The currency the statement is counted in, from `<CURDEF>`, upper-cased. */
  readonly currency: string | null;
  readonly transactions: readonly OfxTransaction[];
}

const BLOCK_START = /<STMTTRN>/i;

/**
 * Reads an OFX file.
 *
 * The header lines (`OFXHEADER:100`, ...) are ignored; the body is scanned for `<STMTTRN>` blocks,
 * and each block's tags are read by name. A tag's value runs to the next `<`, which reads both
 * `<TRNAMT>-1500.55` (OFX 1.x) and `<TRNAMT>-1500.55</TRNAMT>` (OFX 2.x) without a second parser.
 */
export function parseOfx(text: string): OfxDocument {
  const source = normaliseNewlines(stripBom(text));
  if (!/<OFX[\s>]/i.test(source)) {
    throw new ReconciliationError(
      'unknown_format',
      'the text carries no OFX root element; it is neither an OFX 1.x nor an OFX 2.x document',
      { detail: {} }
    );
  }

  const transactions: OfxTransaction[] = [];
  let cursor = 0;
  for (;;) {
    const start = source.slice(cursor).search(BLOCK_START);
    if (start < 0) break;
    const blockStart = cursor + start;
    const afterOpen = blockStart + source.slice(blockStart).indexOf('>') + 1;
    const closeAt = source.slice(afterOpen).search(/<\/STMTTRN>/i);
    const nextOpen = source.slice(afterOpen).search(BLOCK_START);
    const end =
      closeAt >= 0 && (nextOpen < 0 || closeAt < nextOpen)
        ? afterOpen + closeAt
        : nextOpen >= 0
          ? afterOpen + nextOpen
          : source.length;
    const raw = source.slice(blockStart, end);
    transactions.push({
      trnType: tag(raw, 'TRNTYPE'),
      datePosted: tag(raw, 'DTPOSTED'),
      amountText: tag(raw, 'TRNAMT'),
      fitId: tag(raw, 'FITID'),
      refNum: tag(raw, 'REFNUM'),
      name: tag(raw, 'NAME'),
      memo: tag(raw, 'MEMO'),
      checkNum: tag(raw, 'CHECKNUM'),
      line: lineAt(source, blockStart),
      raw,
    });
    cursor = end > blockStart ? end : blockStart + 1;
  }

  return { currency: tag(source, 'CURDEF'), transactions };
}

/** The value of the first `<TAG>` in the text, or null. */
function tag(text: string, name: string): string | null {
  const match = new RegExp(`<${name}>([^<]*)`, 'i').exec(text);
  if (match === null) return null;
  const value = match[1].trim();
  return value === '' ? null : value;
}

/** The 1-based line a character offset sits on. */
function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (text[index] === '\n') line += 1;
  }
  return line;
}

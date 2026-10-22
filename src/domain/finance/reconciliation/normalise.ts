// ABOUTME: Reading the real world's text: the amount and date shapes a statement writes, the
// ABOUTME: reference and payer-name forms the matching rules compare, and the content fingerprint
// ABOUTME: that makes a re-import idempotent.

import { MoneyError, fromMajor, type CurrencyCode, type Money } from '@/domain/money';
import { isIsoDay } from '@/domain/finance/ledger';

import { ReconciliationError } from './errors';

/** Strips a UTF-8 byte-order mark, which several bank exports carry. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Normalises CRLF and lone CR to LF, so the scanners only ever see one line ending. */
export function normaliseNewlines(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

/**
 * A content fingerprint of a statement file.
 *
 * FNV-1a over the UTF-16 code units of the canonical text, widened to 64 bits and rendered as hex.
 * It is deliberately not a cryptographic digest: it exists to answer "is this the same file I
 * already imported", not to resist a forger, and it must run in the browser, where `node:crypto`
 * is not available. The canonical text drops a BOM, unifies line endings and drops trailing
 * whitespace, so a file re-saved by another editor still fingerprints the same.
 */
export function fingerprintOf(parts: readonly string[]): string {
  const text = parts.map((part) => canonicalText(part)).join('\u0000');
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

/** The canonical form a fingerprint is taken over: no BOM, LF endings, no trailing whitespace. */
export function canonicalText(text: string): string {
  return normaliseNewlines(stripBom(text))
    .replace(/[ \t]+$/gm, '')
    .trim();
}

const AMOUNT_SHAPE = /^-?\d+(?:\.\d+)?$/;

/**
 * Reads an amount as a statement writes it into the exact decimal text `fromMajor` takes.
 *
 * Handles a thousands separator (`,` or `.`), a European decimal comma, an accounting negative in
 * parentheses, a trailing minus, and a currency symbol or code glued to the figure. It does not
 * round: precision the currency cannot hold is left for `fromMajor` to refuse.
 */
export function parseAmountText(text: string): string {
  const original = text;
  let value = text.trim();
  if (value === '') {
    throw new ReconciliationError('invalid_amount', `"${original}" is not an amount`, {
      detail: { value: original },
    });
  }

  let negative = false;
  if (value.startsWith('(') && value.endsWith(')')) {
    negative = true;
    value = value.slice(1, -1);
  }
  if (value.trim().endsWith('-')) {
    negative = true;
    value = value.trim().slice(0, -1);
  }
  // Currency symbols, codes and stray letters carry no figure; the separator decides the rest.
  value = value.replace(/[^\d.,+-]/g, '').replace(/[\s\u00a0]/g, '');
  if (value.startsWith('-')) {
    negative = true;
    value = value.slice(1);
  }
  value = value.replace(/^\+/, '');
  if (value === '') {
    throw new ReconciliationError('invalid_amount', `"${original}" is not an amount`, {
      detail: { value: original },
    });
  }

  value = decimalise(value);
  if (!AMOUNT_SHAPE.test(value)) {
    throw new ReconciliationError('invalid_amount', `"${original}" is not an amount`, {
      detail: { value: original },
    });
  }
  return negative ? `-${value}` : value;
}

/**
 * Turns grouped digits into a plain decimal.
 *
 * With both separators present the last one is the decimal point and the other groups thousands
 * (`1,234.56` and `1.234,56` both read 1234.56). A lone comma is a decimal point unless it groups
 * exactly three digits (`1,500` reads 1500, `1500,55` reads 1500.55); several commas always group.
 */
function decimalise(value: string): string {
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = Math.max(lastComma, lastDot);
    const grouped = value.slice(0, decimal).replace(/[.,]/g, '');
    return `${grouped}.${value.slice(decimal + 1).replace(/[.,]/g, '')}`;
  }
  if (lastComma >= 0) {
    const parts = value.split(',');
    if (parts.length > 2) return parts.join('');
    const tail = parts[1] ?? '';
    return tail.length === 3 && parts[0] !== '' ? `${parts[0]}${tail}` : `${parts[0]}.${tail}`;
  }
  if (lastDot >= 0) {
    const parts = value.split('.');
    if (parts.length > 2) return parts.join('');
  }
  return value;
}

/** An amount of a statement, exact in the currency's minor units. */
export function parseStatementAmount(text: string, currency: CurrencyCode): Money {
  const decimal = parseAmountText(text);
  try {
    return fromMajor(decimal, currency);
  } catch (error) {
    if (error instanceof MoneyError) {
      throw new ReconciliationError('invalid_amount', error.message, {
        cause: error,
        detail: { value: text, currency, reason: error.code },
      });
    }
    throw error;
  }
}

const MONTHS: readonly string[] = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

/**
 * Reads a date as a statement writes it into an ISO day, or null when it is not a date.
 *
 * Understands `2027-01-10`, `2027/01/10`, `20270110`, `10/01/2027`, `10-01-2027`, `10.01.2027`,
 * `10 Jan 2027`, each with an optional time after it. A component greater than 12 decides whether
 * `03/04/2027` is day-first or month-first; when both could be a month, `dateOrder` decides and
 * defaults to day-first, the convention of the markets this platform serves.
 */
export function parseStatementDate(
  text: string,
  options: { readonly dateOrder?: 'dmy' | 'mdy' } = {}
): string | null {
  const value = text.trim();
  if (value === '') return null;

  let match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(value);
  if (match) return isoDay(Number(match[1]), Number(match[2]), Number(match[3]));

  match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:[ ].*)?$/.exec(value);
  if (match) return isoDay(Number(match[1]), Number(match[2]), Number(match[3]));

  match = /^(\d{4})(\d{2})(\d{2})(?:\d{2,6}(?:\.\d+)?(?:[+-]\d{4})?)?$/.exec(value);
  if (match) return isoDay(Number(match[1]), Number(match[2]), Number(match[3]));

  match = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?:[ ].*)?$/.exec(value);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);
    if (first > 12 && second <= 12) return isoDay(year, second, first);
    if (second > 12 && first <= 12) return isoDay(year, first, second);
    if (first > 12 || second > 12) return null;
    const order = options.dateOrder ?? 'dmy';
    return order === 'dmy' ? isoDay(year, second, first) : isoDay(year, first, second);
  }

  match = /^(\d{1,2})[\s-]([A-Za-z]{3,})[\s-](\d{4})(?:[ ].*)?$/.exec(value);
  if (match) {
    const month = MONTHS.indexOf(match[2].slice(0, 3).toLowerCase()) + 1;
    if (month === 0) return null;
    return isoDay(Number(match[3]), month, Number(match[1]));
  }

  return null;
}

/** A calendar day, or null when the three numbers are not one. */
function isoDay(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const candidate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(
    day
  ).padStart(2, '0')}`;
  return isIsoDay(candidate) ? candidate : null;
}

/**
 * The form a reference is compared in: upper-case letters and digits only.
 *
 * A statement writes `REF 2027/000123` where the books write `ref2027000123`; both normalise to
 * `REF2027000123`, so the comparison is about the reference and not about the punctuation.
 */
export function normaliseReference(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  const value = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return value === '' ? null : value;
}

/** The significant words of a name: lower-case alphanumeric runs of two or more characters. */
export function nameTokens(text: string | null | undefined): readonly string[] {
  if (text === null || text === undefined) return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

/**
 * How alike two names are, from 0 to 1.
 *
 * The Jaccard overlap of their significant words, with one exception: when one name's words are
 * all present in the other's, the names agree - `JOHN KAMAU` and `JOHN KAMAU MWANGI` are the same
 * payer written twice, not two thirds of a match.
 */
export function nameSimilarity(left: string | null | undefined, right: string | null | undefined): number {
  const a = new Set(nameTokens(left));
  const b = new Set(nameTokens(right));
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  if (shared === 0) return 0;
  const smallest = Math.min(a.size, b.size);
  if (shared === smallest) return 1;
  return shared / (a.size + b.size - shared);
}

/** The whole days between two ISO days, or null when either is not one. */
export function dayDifference(left: string, right: string): number | null {
  if (!isIsoDay(left) || !isIsoDay(right)) return null;
  const a = Date.parse(`${left}T00:00:00Z`);
  const b = Date.parse(`${right}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.abs(Math.round((a - b) / 86_400_000));
}

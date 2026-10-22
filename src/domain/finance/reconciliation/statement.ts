// ABOUTME: Reading a bank or mobile-money statement into normalised lines: it picks the format,
// ABOUTME: maps a CSV's header to the columns it needs, reads the amount, the date and the direction
// ABOUTME: tolerantly, keeps the raw text, and refuses a malformed file by its line number.

import { abs, isCurrencyCode, isZero, type CurrencyCode, type Money } from '@/domain/money';

import { CSV_DELIMITERS, detectDelimiter, parseCsv, type CsvRecord } from './csv';
import { ReconciliationError } from './errors';
import {
  fingerprintOf,
  normaliseReference,
  parseStatementAmount,
  parseStatementDate,
  stripBom,
} from './normalise';
import { parseOfx, type OfxTransaction } from './ofx';
import type {
  ParsedLine,
  ParsedStatement,
  ParseStatementOptions,
  StatementDirection,
  StatementFormat,
} from './types';

/** The columns a CSV statement is read through. */
type Column =
  | 'date'
  | 'amount'
  | 'debit'
  | 'credit'
  | 'reference'
  | 'description'
  | 'payer'
  | 'currency'
  | 'direction';

/**
 * The header names a statement uses for each column.
 *
 * A header matches when its normalised form equals an alias or begins with an alias and a space, so
 * `Amount (KES)` still reads as the amount. The leftmost matching header wins, and an alias that is
 * a prefix of another alias (`value` against `value date`) is deliberately kept out of the lists so
 * that `Value Date` is never read as an amount.
 */
const HEADER_ALIASES: Readonly<Record<Column, readonly string[]>> = {
  date: [
    'date',
    'value date',
    'valuedate',
    'transaction date',
    'transactiondate',
    'tran date',
    'trandate',
    'posted date',
    'posting date',
    'post date',
    'book date',
    'completion time',
    'completion date',
    'effective date',
    'transaction time',
  ],
  amount: ['amount', 'transaction amount', 'amt'],
  debit: ['debit', 'debit amount', 'withdrawal', 'withdrawals', 'withdrawn', 'money out', 'paid out', 'dr'],
  credit: ['credit', 'credit amount', 'deposit', 'deposits', 'money in', 'paid in', 'cr'],
  reference: [
    'reference',
    'ref',
    'ref no',
    'reference no',
    'receipt no',
    'receipt number',
    'receipt',
    'transaction ref',
    'transaction id',
    'trx id',
    'transaction code',
    'code',
    'cheque no',
    'check no',
    'slip no',
    'slip number',
  ],
  description: [
    'description',
    'narration',
    'details',
    'particulars',
    'memo',
    'transaction details',
    'transaction description',
    'remarks',
    'notes',
  ],
  payer: ['payer', 'payer name', 'customer name', 'originator', 'paid by', 'depositor', 'name'],
  currency: ['currency', 'ccy', 'curr'],
  direction: ['direction', 'dr/cr', 'drcr', 'type', 'indicator', 'transaction direction'],
};

/** The order the columns are resolved in, so an ambiguous header is claimed by the earlier one. */
const COLUMN_ORDER: readonly Column[] = [
  'date',
  'amount',
  'debit',
  'credit',
  'reference',
  'description',
  'payer',
  'currency',
  'direction',
];

const DEBIT_WORDS: readonly string[] = [
  'd',
  'dr',
  'debit',
  'debits',
  'withdrawal',
  'withdraw',
  'out',
  'moneyout',
  'paidout',
  'payment',
  'payments',
  'expense',
  'w',
];
const CREDIT_WORDS: readonly string[] = [
  'c',
  'cr',
  'credit',
  'credits',
  'deposit',
  'deposits',
  'in',
  'moneyin',
  'paidin',
  'receipt',
  'receipts',
  'income',
];

/** OFX transaction types that move money out, and the ones that move it in. */
const OFX_DEBIT_TYPES: readonly string[] = [
  'CHECK',
  'DEBIT',
  'PAYMENT',
  'ATM',
  'FEE',
  'DIRECTDEBIT',
  'POS',
  'SRVCHG',
  'REPEATPMT',
];
const OFX_CREDIT_TYPES: readonly string[] = ['CREDIT', 'DEP', 'DIRECTDEP', 'INT', 'DIV'];

/** True when the text reads as an OFX document rather than a CSV. */
export function detectFormat(text: string): StatementFormat {
  const source = stripBom(text);
  if (/<OFX[\s>]/i.test(source) || /^OFXHEADER\s*:/im.test(source)) return 'ofx';
  if (detectDelimiter(source) !== null) return 'csv';
  throw new ReconciliationError(
    'unknown_format',
    'the text is neither an OFX document nor a delimited text file; the parser reads OFX and CSV',
    { detail: {} }
  );
}

/**
 * Reads a statement into normalised lines.
 *
 * The file's own currency must be the account's, or the whole file is refused: a statement of
 * another currency is not this account's, and converting it would invent an exchange rate. Every
 * refusal carries the 1-based line of the file that caused it, so nothing is imported half-way.
 */
export function parseStatement(text: string, options: ParseStatementOptions): ParsedStatement {
  const { account } = options;
  if (!isCurrencyCode(account.currency)) {
    throw new ReconciliationError(
      'unknown_currency',
      `the account ${account.id} is counted in "${account.currency}", which the money module does not know`,
      { detail: { accountId: account.id, currency: account.currency } }
    );
  }

  const format = options.format ?? detectFormat(text);
  const parsed =
    format === 'ofx' ? parseOfxStatement(text, options) : parseCsvStatement(text, options);
  return {
    ...parsed,
    fingerprint: fingerprintOf([account.institutionId, account.id, text]),
  };
}

// ------------------------------------------------------------------------------- CSV

function parseCsvStatement(text: string, options: ParseStatementOptions): ParsedStatement {
  const records = parseCsv(text);
  if (records.length === 0) {
    throw new ReconciliationError('empty_statement', 'the file holds no records at all', {
      detail: { format: 'csv' },
    });
  }

  const header = records[0].fields;
  const columns = resolveColumns(header);
  const missing: string[] = [];
  if (columns.date === undefined) missing.push('date');
  const hasAmount = columns.amount !== undefined;
  const hasPair = columns.debit !== undefined || columns.credit !== undefined;
  if (!hasAmount && !hasPair) missing.push('amount (or a debit/credit pair)');
  if (missing.length > 0) {
    throw new ReconciliationError(
      'missing_columns',
      `the header names no ${missing.join(' and no ')} column; the statement cannot be read without it`,
      { detail: { line: records[0].line, header, missing } }
    );
  }

  const currency = options.account.currency;
  const lines: ParsedLine[] = [];
  for (const record of records.slice(1)) {
    if (record.fields.every((field) => field.trim() === '')) continue;
    if (record.fields.length !== header.length) {
      throw new ReconciliationError(
        'malformed_row',
        `line ${record.line} carries ${record.fields.length} field(s) where the header promises ${header.length}`,
        { detail: { line: record.line, expected: header.length, actual: record.fields.length } }
      );
    }
    lines.push(withLine(() => csvLine(record, columns, currency, options), record.line));
  }  if (lines.length === 0) {
    throw new ReconciliationError('empty_statement', 'the file holds a header but no lines', {
      detail: { format: 'csv', line: records[0].line },
    });
  }

  return {
    format: 'csv',
    currency,
    fingerprint: '',
    sourceName: options.sourceName ?? null,
    lines,
  };
}

function csvLine(
  record: CsvRecord,
  columns: Readonly<Partial<Record<Column, number>>>,
  currency: CurrencyCode,
  options: ParseStatementOptions
): ParsedLine {
  const line = record.line;
  const cell = (column: Column): string => {
    const index = columns[column];
    return index === undefined ? '' : (record.fields[index] ?? '').trim();
  };

  const dateText = cell('date');
  const valueDate = parseStatementDate(dateText, {
    ...(options.dateOrder ? { dateOrder: options.dateOrder } : {}),
  });
  if (valueDate === null) {
    throw new ReconciliationError(
      'invalid_date',
      `line ${line} holds "${dateText}", which is not a date this parser reads`,
      { detail: { line, value: dateText, field: 'date' } }
    );
  }

  const declared = cell('currency');
  if (declared !== '') checkFileCurrency(declared, currency, line);

  const { amount, direction } = readAmount(record, columns, currency, options, line);
  const reference = normaliseReference(cell('reference'));
  const description = nullable(cell('description'));
  const payerName = nullable(cell('payer'));

  return {
    fileLine: line,
    valueDate,
    amount,
    direction,
    reference,
    description,
    payerName,
    raw: record.raw,
  };
}

/**
 * The amount and direction of a CSV record.
 *
 * A debit/credit pair wins when either of its cells moves money, because a file that carries both a
 * pair and a total is stating the pair; otherwise the amount column decides, by its sign, by a
 * direction column, or by the convention of a signed column.
 */
function readAmount(
  record: CsvRecord,
  columns: Readonly<Partial<Record<Column, number>>>,
  currency: CurrencyCode,
  options: ParseStatementOptions,
  line: number
): { amount: Money; direction: StatementDirection } {
  const cell = (column: Column): string => {
    const index = columns[column];
    return index === undefined ? '' : (record.fields[index] ?? '').trim();
  };

  const pairAmount = (text: string): Money | null =>
    text === '' ? null : parseStatementAmount(text, currency);
  const debit = pairAmount(cell('debit'));
  const credit = pairAmount(cell('credit'));
  const amountText = cell('amount');

  if (debit !== null && credit !== null && !isZero(debit) && !isZero(credit)) {
    throw new ReconciliationError(
      'ambiguous_direction',
      `line ${line} carries both a debit of ${debit.amount_minor} and a credit of ${credit.amount_minor} ${currency}; a line moves money one way`,
      { detail: { line, debitMinor: debit.amount_minor, creditMinor: credit.amount_minor } }
    );
  }

  if ((debit !== null && !isZero(debit)) || (credit !== null && !isZero(credit))) {
    const outgoing = debit !== null && !isZero(debit);
    const amount = outgoing ? (debit as Money) : (credit as Money);
    return { amount: abs(amount), direction: outgoing ? 'outflow' : 'inflow' };
  }

  if (amountText === '') {
    throw new ReconciliationError(
      'missing_amount',
      `line ${line} carries no amount: neither an amount nor a debit/credit pair holds one`,
      { detail: { line } }
    );
  }

  const signed = parseStatementAmount(amountText, currency);
  if (isZero(signed)) {
    throw new ReconciliationError(
      'zero_amount',
      `line ${line} moves ${signed.amount_minor} ${currency}; a statement line moves money`,
      { detail: { line, value: amountText } }
    );
  }

  const fromSign = explicitSign(amountText);
  const fromColumn = directionWord(cell('direction'));
  const direction = resolveDirection(fromSign, fromColumn, signed.amount_minor, options, line);
  return { amount: abs(signed), direction };
}

// ------------------------------------------------------------------------------- OFX

function parseOfxStatement(text: string, options: ParseStatementOptions): ParsedStatement {
  const document = parseOfx(text);
  const declared = document.currency;
  const currency = declared === null ? options.account.currency : declared.toUpperCase();
  if (!isCurrencyCode(currency)) {
    throw new ReconciliationError(
      'unknown_currency',
      `the statement is counted in "${currency}", which the money module does not know`,
      { detail: { value: currency, field: 'CURDEF' } }
    );
  }
  if (currency !== options.account.currency) {
    throw new ReconciliationError(
      'currency_mismatch',
      `the statement is counted in ${currency} but the account ${options.account.id} is counted in ${options.account.currency}`,
      { detail: { expected: options.account.currency, actual: currency, field: 'CURDEF' } }
    );
  }

  const lines = document.transactions.map((transaction) =>
    withLine(() => ofxLine(transaction, currency, options), transaction.line)
  );
  if (lines.length === 0) {
    throw new ReconciliationError(
      'empty_statement',
      'the OFX document holds no <STMTTRN> transaction',
      { detail: { format: 'ofx' } }
    );
  }

  return {
    format: 'ofx',
    currency,
    fingerprint: '',
    sourceName: options.sourceName ?? null,
    lines,
  };
}

function ofxLine(
  transaction: OfxTransaction,
  currency: CurrencyCode,
  options: ParseStatementOptions
): ParsedLine {
  const line = transaction.line;
  const valueDate = parseStatementDate(transaction.datePosted ?? '');
  if (valueDate === null) {
    throw new ReconciliationError(
      'invalid_date',
      `the <STMTTRN> on line ${line} holds "<DTPOSTED>${transaction.datePosted ?? ''}", which is not a date this parser reads`,
      { detail: { line, value: transaction.datePosted, field: 'DTPOSTED' } }
    );
  }

  const amountText = transaction.amountText;
  if (amountText === null) {
    throw new ReconciliationError(
      'missing_amount',
      `the <STMTTRN> on line ${line} carries no <TRNAMT>`,
      { detail: { line } }
    );
  }
  const signed = parseStatementAmount(amountText, currency);
  if (isZero(signed)) {
    throw new ReconciliationError(
      'zero_amount',
      `the <STMTTRN> on line ${line} moves ${signed.amount_minor} ${currency}; a statement line moves money`,
      { detail: { line, value: amountText } }
    );
  }

  const type = transaction.trnType?.toUpperCase() ?? null;
  const fromSign = explicitSign(amountText);
  const fromType = ofxDirection(type);
  let direction: StatementDirection;
  if (fromType !== null) {
    if (fromType === 'outflow' && fromSign !== -1) {
      throw new ReconciliationError(
        'ambiguous_direction',
        `the <STMTTRN> on line ${line} is a <TRNTYPE>${type} but its amount is ${amountText}; an OFX debit carries a negative amount`,
        { detail: { line, trnType: type, value: amountText } }
      );
    }
    if (fromType === 'inflow' && fromSign === -1) {
      throw new ReconciliationError(
        'ambiguous_direction',
        `the <STMTTRN> on line ${line} is a <TRNTYPE>${type} but its amount is negative (${amountText})`,
        { detail: { line, trnType: type, value: amountText } }
      );
    }
    direction = fromType;
  } else if (fromSign !== 0) {
    direction = fromSign < 0 ? 'outflow' : 'inflow';
  } else {
    // The OFX amount is signed by definition; a type the parser does not classify and an unsigned
    // amount is read by the convention of a signed column, positive meaning money in.
    direction = options.defaultDirection ?? 'inflow';
  }

  return {
    fileLine: line,
    valueDate,
    amount: abs(signed),
    direction,
    reference:
      normaliseReference(transaction.refNum) ??
      normaliseReference(transaction.checkNum) ??
      normaliseReference(transaction.fitId),
    description: nullable(transaction.memo) ?? nullable(transaction.name),
    payerName: nullable(transaction.name),
    raw: transaction.raw,
  };
}

// ------------------------------------------------------------------------------- shared

/**
 * The direction a CSV record moves the money.
 *
 * An amount that carries a sign of its own decides, and a direction column that contradicts it is a
 * refusal rather than a coin toss. An unsigned amount is read from the direction column, then from
 * the caller's default, and otherwise by the convention of a signed amount column: a positive figure
 * is money in.
 */
function resolveDirection(
  fromSign: -1 | 0 | 1,
  fromWord: StatementDirection | null,
  amountMinor: number,
  options: ParseStatementOptions,
  line: number
): StatementDirection {
  if (fromSign !== 0) {
    const bySign: StatementDirection = fromSign < 0 ? 'outflow' : 'inflow';
    if (fromWord !== null && fromWord !== bySign) {
      throw new ReconciliationError(
        'ambiguous_direction',
        `line ${line} is signed as a ${bySign} but its direction column says ${fromWord}`,
        { detail: { line, sign: bySign, column: fromWord } }
      );
    }
    return bySign;
  }
  if (fromWord !== null) return fromWord;
  if (options.defaultDirection !== undefined) return options.defaultDirection;
  return amountMinor < 0 ? 'outflow' : 'inflow';
}

/** Whether an amount text carries a sign of its own: `-1500`, `(1500.00)`, `1500-`, `+1500`. */
function explicitSign(text: string): -1 | 0 | 1 {
  const value = text.trim();
  if (value === '') return 0;
  if (value.startsWith('(') && value.endsWith(')')) return -1;
  if (value.endsWith('-')) return -1;
  if (value.startsWith('-')) return -1;
  if (value.startsWith('+')) return 1;
  return 0;
}

/** The direction a CSV direction column's word names, or null when the word is not one. */
function directionWord(text: string): StatementDirection | null {
  if (text === '') return null;
  const word = text.toLowerCase().replace(/[^a-z]/g, '');
  if (DEBIT_WORDS.includes(word)) return 'outflow';
  if (CREDIT_WORDS.includes(word)) return 'inflow';
  return null;
}

/** The direction an OFX transaction type names, or null when the type is neutral. */
function ofxDirection(type: string | null): StatementDirection | null {
  if (type === null) return null;
  if (OFX_DEBIT_TYPES.includes(type)) return 'outflow';
  if (OFX_CREDIT_TYPES.includes(type)) return 'inflow';
  return null;
}

/** The column index of each column the header names, the leftmost match winning. */
function resolveColumns(header: readonly string[]): Readonly<Partial<Record<Column, number>>> {
  const keys = header.map(headerKey);
  const columns: Partial<Record<Column, number>> = {};
  for (const column of COLUMN_ORDER) {
    const aliases = HEADER_ALIASES[column];
    const index = keys.findIndex(
      (key) => key !== '' && aliases.some((alias) => key === alias || key.startsWith(`${alias} `))
    );
    if (index >= 0) columns[column] = index;
  }
  return columns;
}

/** The comparable form of a header cell: lower case, single spaces, no punctuation but `/`. */
function headerKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Refuses a statement whose declared currency is not the account's. */
function checkFileCurrency(declared: string, currency: CurrencyCode, line: number): void {
  const code = declared.toUpperCase();
  if (!isCurrencyCode(code)) {
    throw new ReconciliationError(
      'unknown_currency',
      `line ${line} declares the currency "${declared}", which the money module does not know`,
      { detail: { line, value: declared, field: 'currency' } }
    );
  }
  if (code !== currency) {
    throw new ReconciliationError(
      'currency_mismatch',
      `line ${line} is counted in ${code}, but the account is counted in ${currency}`,
      { detail: { line, expected: currency, actual: code, field: 'currency' } }
    );
  }
}

/** A trimmed string, or null when it is empty. */
function nullable(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Runs a per-record read and guarantees that a refusal carries the file line it came from.
 *
 * A refusal raised deeper - the money module's over-precision, for one - knows nothing about the
 * file, so the line is added here rather than lost. Every refusal a caller can see names its line.
 */
function withLine<T>(work: () => T, line: number): T {
  try {
    return work();
  } catch (error) {
    if (error instanceof ReconciliationError && error.detail.line === undefined) {
      throw new ReconciliationError(error.code, error.message, {
        cause: error,
        detail: { ...error.detail, line },
      });
    }
    throw error;
  }
}

/** The delimiters the CSV reader accepts, re-exported so a caller can report what it looks for. */
export { CSV_DELIMITERS };

// ABOUTME: The conversion rules migration M5 applies: exact decimal-string to minor-unit parsing,
// ABOUTME: the legacy invoice status and payment channel vocabularies, and fee item codes.

import type { SqliteValue } from '@/data/adapters/sqlite';
import type {
  CreditNote,
  FeeItem,
  FeeScheduleLine,
  Invoice,
  InvoiceLine,
  Payment,
} from '@/domain/schema';

/**
 * The minor-unit precision of an ISO-4217 currency (spec 05 §1).
 *
 * The page-side helper lives in `modules/finance/data/canonicalFinance.ts`, next to React. A
 * migration runs outside React and its test must not pull the finance pages in, so the table is
 * repeated here. The two must agree; the currency table of spec 05 §1 is the source of both.
 */
export function currencyDigits(currency: string): number {
  switch (currency) {
    case 'JPY':
    case 'KRW':
    case 'VND':
    case 'CLP':
    case 'ISK':
    case 'UGX':
    case 'RWF':
      return 0;
    case 'BHD':
    case 'KWD':
    case 'OMR':
    case 'TND':
    case 'JOD':
      return 3;
    default:
      return 2;
  }
}

/** A length of text cut to a canonical column's limit, and whether it had to be cut. */
export interface FittedText {
  readonly text: string;
  readonly cut: boolean;
}

/** Trims a value to a canonical column's length. */
export function fitText(value: string, max: number): FittedText {
  const trimmed = value.trim();
  if (trimmed.length <= max) return { text: trimmed, cut: false };
  return { text: trimmed.slice(0, max).trim(), cut: true };
}

/** The decimal text a legacy amount column holds, or null when it holds no amount. */
export function legacyDecimal(value: SqliteValue): string | null {
  if (value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** A legacy amount converted to whole minor units. */
export interface MinorUnits {
  readonly amountMinor: number;
  /**
   * The legacy text, when it carried more decimal places than the currency has and the value
   * had to be rounded. Null when the conversion was exact.
   */
  readonly roundedFrom: string | null;
}

/** The outcome of converting a legacy amount. */
export type MinorConversion =
  | { readonly ok: true; readonly value: MinorUnits }
  | { readonly ok: false; readonly reason: string };

/**
 * Converts a legacy amount to whole minor units by reading its decimal text.
 *
 * The legacy columns are REAL, and a float multiplication by 100 drifts: `19.99 * 100` is
 * `1998.9999999999998`. So the value is never multiplied. Its shortest round-trip text (what
 * `String(value)` returns, the same text SQLite's own formatting produces) is split on the
 * decimal point, the fraction is padded to the currency's precision, and the digits are read as
 * one integer. An amount with more decimals than the currency has is rounded half away from
 * zero on the decimal string, and the caller is told which text it rounded.
 */
export function toMinorUnits(value: SqliteValue, currency: string): MinorConversion {
  const text = legacyDecimal(value);
  if (text === null) return { ok: false, reason: 'the row carries no amount' };

  const match = /^([+-]?)(\d+)(?:\.(\d*))?$/.exec(text);
  if (match === null) {
    return { ok: false, reason: `the amount "${text}" is not a plain decimal number` };
  }

  const negative = match[1] === '-';
  const whole = match[2];
  const fraction = match[3] ?? '';
  const digits = currencyDigits(currency);

  const keptFraction = fraction.slice(0, digits).padEnd(digits, '0');
  const kept = `${whole}${keptFraction}`.replace(/^0+(?=\d)/, '');
  const dropped = fraction.slice(digits);
  // '5' is the first digit at which a half away from zero rounds up.
  const roundUp = dropped !== '' && dropped.charCodeAt(0) >= 53;

  const magnitude = Number(kept);
  if (!Number.isSafeInteger(magnitude)) {
    return {
      ok: false,
      reason: `the amount "${text}" does not fit the canonical whole-number range`,
    };
  }

  const raised = roundUp ? magnitude + 1 : magnitude;
  const amountMinor = negative ? -raised : raised;
  const droppedDigits = dropped.replace(/0+$/, '');
  return {
    ok: true,
    value: {
      amountMinor: amountMinor === 0 ? 0 : amountMinor,
      roundedFrom: droppedDigits === '' ? null : text,
    },
  };
}

/** The canonical status a legacy invoice status names. */
export type InvoiceStatusMapping = {
  readonly status: Invoice['status'];
  /** False when the legacy status is one the canonical model does not name. */
  readonly known: boolean;
};

const INVOICE_STATUSES: readonly (readonly [string, Invoice['status']])[] = [
  ['draft', 'draft'],
  ['due', 'posted'],
  ['overdue', 'posted'],
  ['partially paid', 'partially_paid'],
  ['paid', 'paid'],
  ['voided', 'void'],
  ['void', 'void'],
];

/** Maps a legacy invoice status onto the canonical one. */
export function invoiceStatusOf(raw: string | null): InvoiceStatusMapping {
  const key = (raw ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const found = INVOICE_STATUSES.find((entry) => entry[0] === key);
  return found === undefined ? { status: 'posted', known: key === '' } : { status: found[1], known: true };
}

/** The canonical channel a legacy payment method names. */
export type PaymentChannelMapping = {
  readonly channel: Payment['channel'];
  /** False when the legacy method is one the canonical model does not name. */
  readonly known: boolean;
};

/** Maps a legacy payment method onto a canonical channel. */
export function paymentChannelOf(raw: string | null): PaymentChannelMapping {
  const key = (raw ?? '').trim().toLowerCase();
  if (key === '') return { channel: 'cash', known: true };
  if (/mobile|mpesa|m-pesa|airtel|mtn|orange money|wave/.test(key)) {
    return { channel: 'mobile_money', known: true };
  }
  if (/cheque|check/.test(key)) return { channel: 'cheque', known: true };
  if (/card|visa|mastercard|stripe|paystack|flutterwave/.test(key)) {
    return { channel: 'card', known: true };
  }
  if (/bank|transfer|deposit|eft|rtgs/.test(key)) return { channel: 'bank_deposit', known: true };
  if (/kind/.test(key)) return { channel: 'in_kind', known: true };
  if (/cash/.test(key)) return { channel: 'cash', known: true };
  return { channel: 'cash', known: false };
}

/** The legacy adjustment types that reduce what a learner owes. */
const CREDIT_ADJUSTMENTS = new Set(['scholarship', 'discount', 'exemption']);

/** The legacy adjustment types that increase what a learner owes. */
const CHARGE_ADJUSTMENTS = new Set(['fine', 'penalty']);

/** The direction a legacy fee adjustment moves the learner's balance. */
export type AdjustmentDirection = 'credit' | 'charge';

/**
 * The direction of a legacy adjustment.
 *
 * Scholarship, discount and exemption reduce the bill; fine and penalty add to it. The legacy
 * `Other` type carries no direction of its own, so the sign of its amount decides: a negative
 * amount is a credit and a positive one is a charge.
 */
export function adjustmentDirection(type: string | null, amountRaw: SqliteValue): AdjustmentDirection {
  const key = (type ?? '').trim().toLowerCase();
  if (CREDIT_ADJUSTMENTS.has(key)) return 'credit';
  if (CHARGE_ADJUSTMENTS.has(key)) return 'charge';
  const decimal = legacyDecimal(amountRaw);
  return decimal !== null && decimal.startsWith('-') ? 'credit' : 'charge';
}

/** The invoice line kind a charged adjustment becomes. */
export function adjustmentLineKind(type: string | null): InvoiceLine['kind'] {
  const key = (type ?? '').trim().toLowerCase();
  return key === 'fine' || key === 'penalty' ? 'fine' : 'adjustment';
}

/** The kind of a line carried from a legacy invoice item. */
export const LEGACY_ITEM_LINE_KIND: InvoiceLine['kind'] = 'fee';

/** The status a migrated credit note carries: the legacy adjustment was applied, so it is posted. */
export const MIGRATED_CREDIT_NOTE_STATUS: CreditNote['status'] = 'posted';

/** The status a migrated payment carries: the money was received, so it is posted. */
export const MIGRATED_PAYMENT_STATUS: Payment['status'] = 'posted';

/** The frequency a legacy template line becomes: the template is a school period's bill. */
export const MIGRATED_LINE_FREQUENCY: FeeScheduleLine['frequency'] = 'per_term';

/** The proration rule a legacy template line becomes: the legacy row prorates nothing. */
export const MIGRATED_PRORATION_RULE: FeeScheduleLine['proration_rule'] = 'full';

/** The status a migrated fee schedule carries: the template the school billed from was live. */
export const MIGRATED_SCHEDULE_STATUS = 'published' as const;

/** The funding source a legacy fee item becomes: the parent pays it. */
export const MIGRATED_FUNDING_SOURCE: FeeItem['funding_source'] = 'parent';

/** The description a fee item without a name falls back to. */
export const UNNAMED_FEE_ITEM = 'Fee item';

/** A fee item code from a description: upper case, letters, digits and underscores. */
export function codeFrom(text: string, max = 50): string {
  const code = text
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, max);
  return code === '' ? 'ITEM' : code;
}

/**
 * The category a fee item description names.
 *
 * The legacy template item carries a free-text description and a revenue account, no category.
 * The category is read from the words the description holds, and an item whose words name none
 * is `other`.
 */
export function feeItemCategory(description: string): FeeItem['category'] {
  const key = description.toLowerCase();
  if (/tuition|school fee|fees\b/.test(key)) return 'tuition';
  if (/board|accommodation|lodging/.test(key)) return 'boarding';
  if (/meal|lunch|food|breakfast|supper|snack/.test(key)) return 'meals';
  if (/transport|bus|shuttle|travel/.test(key)) return 'transport';
  if (/activity|club|trip|tour|sport|games/.test(key)) return 'activity';
  if (/exam|test|kcse|kcpe|assessment/.test(key)) return 'exam';
  if (/development|levy|infrastructure|building/.test(key)) return 'development_levy';
  if (/uniform|book|stationery|text/.test(key)) return 'uniform_books';
  if (/deposit|caution|security/.test(key)) return 'deposit';
  if (/fine|penalt|late/.test(key)) return 'fine';
  return 'other';
}

/** The normalised key two fee item descriptions are compared under. */
export function feeItemKey(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, ' ');
}

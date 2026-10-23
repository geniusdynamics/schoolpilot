// ABOUTME: The receipt of spec 05 §5.2: what it shows - payer, learner, amount in figures and in
// ABOUTME: words, channel and reference, allocation by vote head, balance after and cashier.

import { currencyDecimals, type CurrencyCode, type Money } from '@/domain/money';

import { channelLabel } from './channels';
import type { PaymentChannel, ReceiptAllocationLine, ReceiptView } from './types';

/** The words a currency's major and minor units are read as. */
export interface CurrencyWords {
  readonly major: readonly [string, string];
  readonly minor: readonly [string, string];
}

/**
 * The unit names of the currencies the platform prices in.
 *
 * A currency the table holds but this record does not name falls back to its code as the major
 * unit and "cents" as the minor one; the amount in figures is always exact either way.
 */
export const CURRENCY_UNIT_WORDS: Readonly<Partial<Record<CurrencyCode, CurrencyWords>>> = {
  KES: { major: ['shilling', 'shillings'], minor: ['cent', 'cents'] },
  UGX: { major: ['shilling', 'shillings'], minor: ['cent', 'cents'] },
  TZS: { major: ['shilling', 'shillings'], minor: ['cent', 'cents'] },
  RWF: { major: ['franc', 'francs'], minor: ['centime', 'centimes'] },
  NGN: { major: ['naira', 'naira'], minor: ['kobo', 'kobo'] },
  GHS: { major: ['cedi', 'cedis'], minor: ['pesewa', 'pesewas'] },
  ZAR: { major: ['rand', 'rand'], minor: ['cent', 'cents'] },
  USD: { major: ['dollar', 'dollars'], minor: ['cent', 'cents'] },
  EUR: { major: ['euro', 'euros'], minor: ['cent', 'cents'] },
  GBP: { major: ['pound', 'pounds'], minor: ['penny', 'pence'] },
  XOF: { major: ['franc', 'francs'], minor: ['centime', 'centimes'] },
  XAF: { major: ['franc', 'francs'], minor: ['centime', 'centimes'] },
};

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

const SCALES: readonly { readonly value: number; readonly word: string }[] = [
  { value: 1_000_000_000_000, word: 'trillion' },
  { value: 1_000_000_000, word: 'billion' },
  { value: 1_000_000, word: 'million' },
  { value: 1_000, word: 'thousand' },
];

/** The English words of a whole number below one thousand. */
function underOneThousand(value: number): string {
  if (value < 20) return ONES[value] as string;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const rest = value % 10;
    const tensWord = TENS[tens] as string;
    return rest === 0 ? tensWord : `${tensWord}-${ONES[rest] as string}`;
  }
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const head = `${ONES[hundreds] as string} hundred`;
  return rest === 0 ? head : `${head} and ${underOneThousand(rest)}`;
}

/**
 * The English words of a non-negative whole number.
 *
 * It reads the digits in groups of three, so the words are exact for every safe integer and no
 * amount is ever rounded on the way to a receipt.
 */
export function numberToWords(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`numberToWords reads a non-negative safe integer, got ${value}`);
  }
  if (value === 0) return 'zero';

  const parts: string[] = [];
  let left = value;
  for (const scale of SCALES) {
    if (left < scale.value) continue;
    const count = Math.floor(left / scale.value);
    parts.push(`${numberToWords(count)} ${scale.word}`);
    left %= scale.value;
  }
  if (left > 0) parts.push(underOneThousand(left));
  return parts.join(' ');
}

/** The unit words of a currency, falling back to its code and "cents". */
export function currencyWords(currency: string): CurrencyWords {
  const known = CURRENCY_UNIT_WORDS[currency as CurrencyCode];
  if (known) return known;
  return { major: [currency, currency], minor: ['cent', 'cents'] };
}

/**
 * An amount written out in words, the way a receipt prints it.
 *
 * The major and minor parts are split from the integer minor-unit count through the currency's
 * own precision, so `1505` KES reads "fifteen shillings and five cents" and never a float.
 */
export function amountInWords(value: Money): string {
  const words = currencyWords(value.currency);
  const digits = currencyDecimals(value.currency);
  const scale = 10 ** digits;
  const negative = value.amount_minor < 0;
  const absolute = Math.abs(value.amount_minor);
  const major = Math.floor(absolute / scale);
  const minor = absolute % scale;

  const majorWord = major === 1 ? words.major[0] : words.major[1];
  const parts = [`${numberToWords(major)} ${majorWord}`];
  if (minor > 0) {
    const minorWord = minor === 1 ? words.minor[0] : words.minor[1];
    parts.push(`${numberToWords(minor)} ${minorWord}`);
  }
  return `${negative ? 'minus ' : ''}${parts.join(' and ')}`;
}

/** What the receipt builder needs. */
export interface ReceiptViewInput {
  readonly number: string;
  readonly issuedAt: string;
  readonly status: 'issued' | 'void';
  readonly payer: string;
  readonly learners: readonly string[];
  readonly amount: Money;
  readonly channel: PaymentChannel;
  readonly reference?: string | null;
  readonly allocationByVoteHead?: readonly ReceiptAllocationLine[];
  readonly balanceAfter: Money;
  readonly cashier: string;
}

/** Builds the view a receipt prints. */
export function buildReceiptView(input: ReceiptViewInput): ReceiptView {
  return {
    number: input.number,
    issuedAt: input.issuedAt,
    status: input.status,
    payer: input.payer,
    learners: input.learners,
    amount: input.amount,
    amountInWords: amountInWords(input.amount),
    channel: input.channel,
    channelLabel: channelLabel(input.channel),
    reference: input.reference ?? null,
    allocationByVoteHead: input.allocationByVoteHead ?? [],
    balanceAfter: input.balanceAfter,
    cashier: input.cashier,
  };
}

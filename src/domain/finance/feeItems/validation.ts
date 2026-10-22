// ABOUTME: The fee-item rules: a well-formed code and name, a declared category and funding
// ABOUTME: source, and an amount that is exact Money in the institution's currency.

import { MoneyError, fromMinor, isCurrencyCode, isMoney, type CurrencyCode, type Money } from '@/domain/money';
import { FEE_FUNDING_SOURCES, FEE_ITEM_CATEGORIES } from '@/domain/schema';

import { FeeItemError } from './errors';
import type { FeeItemCategory, FeeItemFundingSource } from './types';

/** The shape of a vote-head code: upper case letters, digits and `_`, starting with a letter or digit. */
export const FEE_ITEM_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_]{0,49}$/;

/** The longest code the canonical column holds. */
export const FEE_ITEM_CODE_MAX_LENGTH = 50;

/** The canonical form of a code: trimmed and upper case, so `tuition` and `TUITION` are one code. */
export function normaliseFeeItemCode(code: string): string {
  return code.trim().toUpperCase();
}

/** The canonical form of a code, refused when it is empty or malformed. */
export function assertFeeItemCode(code: string): string {
  const normalised = normaliseFeeItemCode(code);
  if (normalised.length === 0) {
    throw new FeeItemError('code_malformed', 'a fee item code cannot be empty', { field: 'code' });
  }
  if (normalised.length > FEE_ITEM_CODE_MAX_LENGTH) {
    throw new FeeItemError(
      'code_malformed',
      `a fee item code holds at most ${FEE_ITEM_CODE_MAX_LENGTH} characters; got ${normalised.length}`,
      { field: 'code' }
    );
  }
  if (!FEE_ITEM_CODE_PATTERN.test(normalised)) {
    throw new FeeItemError(
      'code_malformed',
      `"${code}" is not a fee item code; use upper case letters, digits and _ (e.g. "TUITION")`,
      { field: 'code' }
    );
  }
  return normalised;
}

/** The name, refused when it is empty or longer than the canonical column. */
export function assertFeeItemName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new FeeItemError('name_required', 'a fee item needs a name', { field: 'name' });
  }
  if (trimmed.length > 200) {
    throw new FeeItemError('name_required', `a fee item name holds at most 200 characters; got ${trimmed.length}`, {
      field: 'name',
    });
  }
  return trimmed;
}

/** The category, refused when it is not one of the declared categories. */
export function assertFeeItemCategory(category: string): FeeItemCategory {
  const match = FEE_ITEM_CATEGORIES.find((candidate) => candidate === category);
  if (match === undefined) {
    throw new FeeItemError(
      'category_invalid',
      `"${category}" is not a fee item category; use one of ${FEE_ITEM_CATEGORIES.join(', ')}`,
      { field: 'category' }
    );
  }
  return match;
}

/** The funding source, refused when it is not one of the declared sources. */
export function assertFundingSource(source: string): FeeItemFundingSource {
  const match = FEE_FUNDING_SOURCES.find((candidate) => candidate === source);
  if (match === undefined) {
    throw new FeeItemError(
      'funding_source_invalid',
      `"${source}" is not a funding source; use one of ${FEE_FUNDING_SOURCES.join(', ')}`,
      { field: 'funding_source' }
    );
  }
  return match;
}

/**
 * An amount as exact Money in the institution's currency.
 *
 * The canonical fee item carries no amount of its own - an amount lives on the `fee_schedule_line`
 * a schedule writes for the item, and on the invoice lines it bills - so this is the boundary the
 * fee-item workflow applies to every amount it handles: the total and the allocations it reads
 * when it works out what an invoice still owes. A value that is not a money shape, is counted in
 * another currency, is not a whole number of minor units, or names a currency outside the table
 * is refused by name, never rounded.
 */
export function assertFeeAmount(value: unknown, currency: CurrencyCode): Money {
  if (!isMoney(value)) {
    throw new FeeItemError(
      'amount_not_money',
      `an amount must be a money value ({ amount_minor, currency }); got ${describe(value)}`,
      { field: 'amount' }
    );
  }
  if (value.currency !== currency) {
    throw new FeeItemError(
      'amount_currency_mismatch',
      `the amount is counted in ${value.currency} but the institution's currency is ${currency}; convert it explicitly`,
      { field: 'amount' }
    );
  }
  if (!isCurrencyCode(value.currency)) {
    throw new FeeItemError('amount_invalid', `"${value.currency}" is not a currency of the table`, {
      field: 'amount',
    });
  }
  try {
    return fromMinor(value.amount_minor, value.currency);
  } catch (error) {
    throw new FeeItemError(
      'amount_invalid',
      error instanceof MoneyError
        ? error.message
        : `the amount ${describe(value)} is not a whole number of minor units`,
      { field: 'amount', cause: error }
    );
  }
}

/** A short description of a value for a refusal message. */
function describe(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

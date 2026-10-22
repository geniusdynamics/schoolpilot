// ABOUTME: The GL-account mapping of a fee item and the directory it is resolved against. The
// ABOUTME: posting engine (P3-A02) consumes the mapping; the chart of accounts lands with it.

import type { FeeItem } from '@/domain/schema';

import { FeeItemError } from './errors';

/**
 * Which account a posting for a fee item touches.
 *
 * An invoice line on the item credits the item's revenue account; the debit is the
 * institution's receivables control account, which is not per item, so the item names only the
 * revenue side. A `null` code means the institution's default revenue account, and the posting
 * engine resolves that default itself.
 *
 * This is the seam the posting engine of P3-A02 reads: it calls {@link glMappingOf} on the
 * `fee_item` row it is posting for and credits `revenue_account_code`. The shape is deliberately
 * one field, so a second side can be added without changing the caller's contract.
 */
export interface FeeItemGlMapping {
  /** The revenue account a posting for the item credits; `null` for the institution default. */
  readonly revenue_account_code: string | null;
}

/**
 * The chart of accounts the GL account codes resolve against.
 *
 * The canonical registry models no chart-of-accounts entity yet (the accounts land with the P3
 * ledger, P3-A02), so the directory is a port: the fee-item service asks it whether a code names
 * an account, and a caller that has a chart of accounts supplies it. Until then the service
 * carries no directory and only the format rule applies. When a directory is supplied, a code
 * that does not resolve is refused with `gl_account_unresolved`.
 */
export interface GlAccountDirectory {
  /** True when the code names an account that exists. May be async. */
  has(accountCode: string): boolean | Promise<boolean>;
}

/** The shape of a GL account code: upper case letters, digits, and `.`, `_` or `-` separators. */
export const GL_ACCOUNT_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,49}$/;

/** The longest GL account code the canonical column holds. */
export const GL_ACCOUNT_CODE_MAX_LENGTH = 50;

/** The canonical form of an account code: trimmed and upper case. */
export function normaliseGlAccountCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * The canonical form of an account code, refused when it is empty or malformed.
 *
 * A malformed code is always refused, with or without a directory: the format is a rule of the
 * model, not of the chart of accounts.
 */
export function assertGlAccountCode(code: string): string {
  const normalised = normaliseGlAccountCode(code);
  if (normalised.length === 0) {
    throw new FeeItemError('gl_account_malformed', 'a GL account code cannot be empty', {
      field: 'revenue_account_code',
    });
  }
  if (normalised.length > GL_ACCOUNT_CODE_MAX_LENGTH) {
    throw new FeeItemError(
      'gl_account_malformed',
      `a GL account code holds at most ${GL_ACCOUNT_CODE_MAX_LENGTH} characters; got ${normalised.length}`,
      { field: 'revenue_account_code' }
    );
  }
  if (!GL_ACCOUNT_CODE_PATTERN.test(normalised)) {
    throw new FeeItemError(
      'gl_account_malformed',
      `"${code}" is not a GL account code; use upper case letters, digits and . _ - (e.g. "4000" or "REV.TUITION")`,
      { field: 'revenue_account_code' }
    );
  }
  return normalised;
}

/**
 * The account code in canonical form, resolved against the directory when one is given.
 *
 * `null`/`undefined`/an empty string all mean "the institution default" and resolve to `null`.
 */
export async function resolveGlAccountCode(
  code: string | null | undefined,
  directory?: GlAccountDirectory
): Promise<string | null> {
  if (code === null || code === undefined || code.trim() === '') return null;
  const normalised = assertGlAccountCode(code);
  if (directory && !(await directory.has(normalised))) {
    throw new FeeItemError(
      'gl_account_unresolved',
      `the GL account "${normalised}" is not in the chart of accounts`,
      { field: 'revenue_account_code' }
    );
  }
  return normalised;
}

/**
 * The GL mapping of a stored fee item row.
 *
 * The posting engine of P3-A02 reads this: the account it credits for a posting on the item.
 */
export function glMappingOf(row: Pick<FeeItem, 'revenue_account_code'>): FeeItemGlMapping {
  const code = row.revenue_account_code;
  return { revenue_account_code: code === undefined || code === '' ? null : code };
}

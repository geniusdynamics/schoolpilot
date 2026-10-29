// ABOUTME: The chart-of-accounts mapping a school configures: which account of QuickBooks, Xero, Odoo or
// ABOUTME: ERPNext each of its own accounts posts to, which journal and company an export posts into, and
// ABOUTME: the list of its own accounts the bursar still has to map before a journal can be exported.

import type { ExportBatch } from './types';

/** The target's account for one school account. */
export interface TargetAccount {
  /** What the target calls the account: a code, a name or a database id, per target. */
  readonly targetCode: string;
  /** The account's name in the target, which QuickBooks and ERPNext post by. */
  readonly targetName: string;
}

/** The mapping file a school configures once and every export reads. */
export interface ChartMapping {
  /** The target's account, by the school's own account code. */
  readonly accounts: Readonly<Record<string, TargetAccount>>;
  /** The target's journal identifier, for a system that posts into a named journal. */
  readonly journal: string | null;
  /** The target's company identifier, for a system that posts into a named company. */
  readonly company: string | null;
}

/** What a caller states to build a mapping. */
export interface ChartMappingInput {
  readonly accounts: Readonly<Record<string, TargetAccount>>;
  readonly journal?: string;
  readonly company?: string;
}

/** One school account an export would refuse, with how many lines post to it. */
export interface UnmappedAccount {
  readonly accountCode: string;
  readonly accountName: string | null;
  readonly lineCount: number;
}

/** Trims the codes and names, so a mapping typed by hand with stray spaces still matches. */
export function createChartMapping(input: ChartMappingInput): ChartMapping {
  const accounts: Record<string, TargetAccount> = {};
  for (const [code, account] of Object.entries(input.accounts)) {
    accounts[code.trim()] = {
      targetCode: account.targetCode.trim(),
      targetName: account.targetName.trim(),
    };
  }
  return {
    accounts,
    journal: trimmedOrNull(input.journal),
    company: trimmedOrNull(input.company),
  };
}

/** The target's account for a school account, or null when the mapping does not hold it. */
export function targetAccount(mapping: ChartMapping, accountCode: string): TargetAccount | null {
  return mapping.accounts[accountCode] ?? null;
}

/**
 * The school accounts the batch posts to that the mapping does not hold, in the order they first appear.
 *
 * A bursar reads this before exporting: every account here would be refused, and each is reported once
 * with the number of lines that post to it, so the work is one mapping row per account and not one per line.
 */
export function unmappedAccounts(batch: ExportBatch, mapping: ChartMapping): UnmappedAccount[] {
  const unmapped = new Map<string, UnmappedAccount>();
  for (const entry of batch.entries) {
    for (const line of entry.lines) {
      const code = line.accountCode.trim();
      const held = mapping.accounts[code];
      if (held) continue;
      const seen = unmapped.get(code);
      const name = line.accountName ?? null;
      unmapped.set(code, {
        accountCode: code,
        accountName: seen?.accountName ?? name,
        lineCount: (seen?.lineCount ?? 0) + 1,
      });
    }
  }
  return [...unmapped.values()];
}

function trimmedOrNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

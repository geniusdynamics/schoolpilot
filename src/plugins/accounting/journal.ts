// ABOUTME: Validating a journal export batch into the intermediate representation every connector renders:
// ABOUTME: it refuses an empty batch, an unbalanced entry, a line with the wrong number of sides, an amount
// ABOUTME: the currency cannot hold, and an account the school has not mapped, each with a path and a message.

import { isIsoDay } from '@/domain/finance/ledger/entry';
import {
  MoneyError,
  add,
  compare,
  fromMajor,
  isPositive,
  toDecimalString,
  zero,
  type CurrencyCode,
  type Money,
} from '@/domain/money';

import { accountingExportFor } from './connectors';
import { targetAccount, type ChartMapping } from './mapping';
import {
  ACCOUNTING_TARGET_IDS,
  type AccountingDocument,
  type AccountingDocumentEntry,
  type AccountingDocumentLine,
  type ExportBatch,
  type ExportEntryInput,
  type ExportIssue,
  type ExportLineInput,
  type ExportSide,
} from './types';

/** Either the validated document an export renders, or every reason the batch cannot be exported. */
export type ValidationResult =
  | { readonly ok: true; readonly document: AccountingDocument }
  | { readonly ok: false; readonly issues: readonly ExportIssue[] };

/**
 * Validates a batch against a chart mapping and builds the document a connector renders.
 *
 * Every refusal is collected rather than thrown at the first one: a bursar with four unmapped accounts
 * and one unbalanced entry fixes them all in one round. Nothing is exported unless the whole batch holds.
 */
export function validateBatch(batch: ExportBatch, mapping: ChartMapping): ValidationResult {
  const connector = accountingExportFor(batch.target);
  if (connector === null) {
    return refuse([
      {
        path: 'target',
        message: `"${batch.target}" is not an accounting system this plug-in exports; it exports ${ACCOUNTING_TARGET_IDS.join(', ')}`,
      },
    ]);
  }
  if (batch.entries.length === 0) {
    return refuse([
      {
        path: 'entries',
        message: 'a journal export needs at least one posted entry; the batch is empty',
      },
    ]);
  }

  const issues: ExportIssue[] = [];
  for (const requirement of connector.mappingRequirements) {
    if (mapping[requirement] === null) {
      issues.push({
        path: `mapping.${requirement}`,
        message: `${connector.label} posts into a ${requirement}; name it in the mapping file before exporting`,
      });
    }
  }

  const totals = seedTotals(batch.currency);
  if (totals === null) {
    return refuse([
      {
        path: 'currency',
        message: `"${batch.currency}" is not a currency the platform counts in, so the batch cannot be totalled`,
      },
    ]);
  }

  const entries: AccountingDocumentEntry[] = [];
  batch.entries.forEach((entry, index) => {
    const built = validateEntry(entry, index, batch, mapping, connector.label, totals, issues);
    if (built !== null) entries.push(built);
  });

  if (issues.length > 0) return refuse(issues);

  const document: AccountingDocument = {
    target: batch.target,
    institutionId: batch.institutionId,
    currency: batch.currency,
    entries,
    totalDebitMinor: totals.debit.amount_minor,
    totalCreditMinor: totals.credit.amount_minor,
  };

  const mappingIssues = connector.validateMapping?.(mapping, document) ?? [];
  if (mappingIssues.length > 0) return refuse(mappingIssues);

  return { ok: true, document };
}

/** The running totals of a batch: the debit and the credit side, both seeded in the batch's currency. */
interface BatchTotals {
  debit: Money;
  credit: Money;
}

function seedTotals(currency: CurrencyCode): BatchTotals | null {
  try {
    return { debit: zero(currency), credit: zero(currency) };
  } catch (error) {
    if (error instanceof MoneyError) return null;
    throw error;
  }
}

function validateEntry(
  entry: ExportEntryInput,
  index: number,
  batch: ExportBatch,
  mapping: ChartMapping,
  targetLabel: string,
  totals: BatchTotals,
  issues: ExportIssue[]
): AccountingDocumentEntry | null {
  const path = `entries[${index}]`;
  const issuesBefore = issues.length;
  const description = entry.description.trim();
  let amountsKnown = true;

  if (!isIsoDay(entry.date)) {
    issues.push({
      path: `${path}.date`,
      message: `an entry is dated by an ISO day (2027-02-10), not "${entry.date}"`,
    });
  }
  if (entry.reference.trim() === '') {
    issues.push({
      path: `${path}.reference`,
      message: 'an entry names the source document it came from; the reference is empty',
    });
  }
  if (description === '') {
    issues.push({
      path: `${path}.description`,
      message: 'an entry needs a narration; the description is empty',
    });
  }
  if (entry.lines.length < 2) {
    amountsKnown = false;
    issues.push({
      path: `${path}.lines`,
      message: `a journal entry needs at least two lines; this one has ${entry.lines.length}`,
    });
  }

  let debit = zero(batch.currency);
  let credit = zero(batch.currency);
  const lines: AccountingDocumentLine[] = [];

  entry.lines.forEach((line, lineIndex) => {
    const linePath = `${path}.lines[${lineIndex}]`;
    const accountCode = line.accountCode.trim();

    if (accountCode === '') {
      amountsKnown = false;
      issues.push({ path: `${linePath}.accountCode`, message: 'a journal line carries no account code' });
      return;
    }

    const stated = statedSide(line);
    if (!stated.ok) {
      amountsKnown = false;
      issues.push({ path: linePath, message: stated.message });
      return;
    }

    const parsed = parseAmount(stated.text, batch.currency);
    if (!parsed.ok) {
      amountsKnown = false;
      issues.push({ path: `${linePath}.${stated.side}`, message: parsed.message });
      return;
    }
    if (!isPositive(parsed.money)) {
      amountsKnown = false;
      issues.push({
        path: linePath,
        message: `line ${lineIndex + 1} holds ${toDecimalString(parsed.money)} ${batch.currency}; a journal line is a positive amount on one side`,
      });
      return;
    }

    const target = targetAccount(mapping, accountCode);
    if (target === null) {
      issues.push({
        path: `mapping["${accountCode}"]`,
        message: `account ${describeAccount(accountCode, line.accountName)} has no target account in the ${targetLabel} mapping; map it before exporting`,
      });
    }

    if (stated.side === 'debit') {
      debit = add(debit, parsed.money);
      totals.debit = add(totals.debit, parsed.money);
    } else {
      credit = add(credit, parsed.money);
      totals.credit = add(totals.credit, parsed.money);
    }

    lines.push({
      lineNumber: lineIndex + 1,
      accountCode,
      accountName: line.accountName?.trim() || null,
      targetCode: target?.targetCode ?? '',
      targetName: target?.targetName ?? '',
      side: stated.side,
      amountMinor: parsed.money.amount_minor,
      amountText: toDecimalString(parsed.money),
      description: line.description?.trim() || description,
      costCentre: line.costCentre?.trim() || null,
    });
  });

  if (amountsKnown && compare(debit, credit) !== 0) {
    issues.push({
      path,
      message: `entry ${entry.reference.trim() || '(no reference)'} does not balance: debits ${toDecimalString(debit)} and credits ${toDecimalString(credit)} ${batch.currency}`,
    });
  }

  if (issues.length > issuesBefore) return null;

  return { date: entry.date, reference: entry.reference.trim(), description, lines };
}

type StatedSide =
  | { readonly ok: true; readonly side: ExportSide; readonly text: string }
  | { readonly ok: false; readonly message: string };

function statedSide(line: ExportLineInput): StatedSide {
  const hasDebit = line.debit !== undefined;
  const hasCredit = line.credit !== undefined;
  if (hasDebit && hasCredit) {
    return { ok: false, message: 'a line carries both a debit and a credit; a line has exactly one side' };
  }
  if (!hasDebit && !hasCredit) {
    return { ok: false, message: 'a line carries neither a debit nor a credit; a line has exactly one side' };
  }
  return hasDebit
    ? { ok: true, side: 'debit', text: line.debit as string }
    : { ok: true, side: 'credit', text: line.credit as string };
}

type ParsedAmount =
  | { readonly ok: true; readonly money: Money }
  | { readonly ok: false; readonly message: string };

function parseAmount(text: string, currency: CurrencyCode): ParsedAmount {
  try {
    return { ok: true, money: fromMajor(text, currency) };
  } catch (error) {
    if (error instanceof MoneyError) return { ok: false, message: error.message };
    throw error;
  }
}

function describeAccount(accountCode: string, accountName: string | undefined): string {
  const name = accountName?.trim();
  return name ? `${accountCode} (${name})` : accountCode;
}

function refuse(issues: readonly ExportIssue[]): ValidationResult {
  return { ok: false, issues };
}

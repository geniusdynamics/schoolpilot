// ABOUTME: Refusal tests for the accounting export contract: an unbalanced entry, an amount the currency
// ABOUTME: cannot hold, a missing account mapping and an empty batch are refused with a path and a message,
// ABOUTME: and the unmapped accounts are listed before the bursar exports.

import { describe, expect, it } from 'vitest';

import { validateBatch } from '../journal';
import { createChartMapping, unmappedAccounts } from '../mapping';
import type { AccountingTargetId, ExportBatch, ExportIssue } from '../types';
import { batchFor, mappingFor } from './fixtures';

/** The issues a batch is refused with, or an empty list when it is accepted. */
function issuesOf(batch: ExportBatch): readonly ExportIssue[] {
  const result = validateBatch(batch, mappingFor(batch.target));
  return result.ok ? [] : result.issues;
}

function paths(issues: readonly ExportIssue[]): string[] {
  return issues.map((issue) => issue.path);
}

/** The two entries of the fixture batch with the first entry replaced. */
function withFirstEntry(batch: ExportBatch, entry: ExportBatch['entries'][number]): ExportBatch {
  return { ...batch, entries: [entry, ...batch.entries.slice(1)] };
}

describe('the journal export contract', () => {
  it('accepts a balanced batch and totals it in minor units', () => {
    const batch = batchFor('quickbooks');

    const result = validateBatch(batch, mappingFor('quickbooks'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.entries).toHaveLength(2);
    expect(result.document.totalDebitMinor).toBe(175055);
    expect(result.document.totalCreditMinor).toBe(175055);
    expect(result.document.entries[0].lines[0].amountText).toBe('1250.00');
    expect(result.document.entries[0].lines[0].targetName).toBe('Fee receivables');
    expect(result.document.entries[0].lines[0].side).toBe('debit');
    expect(result.document.entries[1].lines[0].costCentre).toBe('Main campus');
  });

  it('refuses an empty batch', () => {
    const issues = issuesOf({ ...batchFor('quickbooks'), entries: [] });

    expect(paths(issues)).toEqual(['entries']);
    expect(issues[0].message).toContain('empty');
  });

  it('refuses an entry whose debits and credits differ, naming the amounts', () => {
    const batch = batchFor('quickbooks');
    const entry = batch.entries[0];
    const issues = issuesOf(
      withFirstEntry(batch, {
        ...entry,
        lines: [entry.lines[0], { ...entry.lines[1], credit: '1200.00' }],
      })
    );

    expect(paths(issues)).toEqual(['entries[0]']);
    expect(issues[0].message).toContain('1250.00');
    expect(issues[0].message).toContain('1200.00');
  });

  it('refuses an amount the currency cannot hold', () => {
    const batch = batchFor('quickbooks');
    const entry = batch.entries[0];
    const issues = issuesOf(
      withFirstEntry(batch, {
        ...entry,
        lines: [{ ...entry.lines[0], debit: '1250.005' }, entry.lines[1]],
      })
    );

    expect(paths(issues)).toEqual(['entries[0].lines[0].debit']);
    expect(issues[0].message).toContain('KES');
  });

  it('refuses more decimals than a currency without subunits holds', () => {
    const batch: ExportBatch = {
      institutionId: 'institution-nova',
      target: 'quickbooks',
      currency: 'UGX',
      entries: [
        {
          date: '2027-02-10',
          reference: 'INV/2027/T1/000123',
          description: 'Term 1 fees',
          lines: [
            { accountCode: '1100', debit: '100.5' },
            { accountCode: '4000', credit: '100.5' },
          ],
        },
      ],
    };

    const issues = issuesOf(batch);

    expect(paths(issues)).toEqual(['entries[0].lines[0].debit', 'entries[0].lines[1].credit']);
  });

  it('refuses a line that carries both a debit and a credit', () => {
    const batch = batchFor('quickbooks');
    const entry = batch.entries[0];
    const issues = issuesOf(
      withFirstEntry(batch, {
        ...entry,
        lines: [{ ...entry.lines[0], credit: '1250.00' }, entry.lines[1]],
      })
    );

    expect(paths(issues)).toEqual(['entries[0].lines[0]']);
    expect(issues[0].message).toContain('both');
  });

  it('refuses a line that carries neither side, and a zero amount', () => {
    const batch = batchFor('quickbooks');
    const entry = batch.entries[0];

    expect(
      paths(
        issuesOf(
          withFirstEntry(batch, {
            ...entry,
            lines: [{ accountCode: '1100' }, entry.lines[1]],
          })
        )
      )
    ).toEqual(['entries[0].lines[0]']);

    expect(
      paths(
        issuesOf(
          withFirstEntry(batch, {
            ...entry,
            lines: [{ ...entry.lines[0], debit: '0.00' }, entry.lines[1]],
          })
        )
      )
    ).toEqual(['entries[0].lines[0]']);
  });

  it('refuses an account the chart mapping does not hold, naming the account', () => {
    const batch = batchFor('quickbooks');
    const mapping = createChartMapping({
      accounts: {
        '1100': { targetCode: '1100', targetName: 'Fee receivables' },
        '1020': { targetCode: '1020', targetName: 'Bank' },
      },
    });

    const result = validateBatch(batch, mapping);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(paths(result.issues)).toEqual(['mapping["4000"]']);
    expect(result.issues[0].message).toContain('4000');
    expect(result.issues[0].message).toContain('Fee revenue');
  });

  it('lists the accounts a bursar still has to map, with how often each is used', () => {
    const mapping = createChartMapping({
      accounts: { '1100': { targetCode: '1100', targetName: 'Fee receivables' } },
    });

    expect(unmappedAccounts(batchFor('quickbooks'), mapping)).toEqual([
      { accountCode: '4000', accountName: 'Fee revenue', lineCount: 1 },
      { accountCode: '1020', accountName: 'Bank', lineCount: 1 },
    ]);
  });

  it('refuses an Odoo export whose mapping names no journal', () => {
    const mapping = createChartMapping({
      accounts: {
        '1100': { targetCode: '42', targetName: 'Fee receivables' },
        '4000': { targetCode: '43', targetName: 'Fee revenue' },
        '1020': { targetCode: '44', targetName: 'Bank' },
      },
    });

    const result = validateBatch(batchFor('odoo'), mapping);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(paths(result.issues)).toEqual(['mapping.journal']);
  });

  it('refuses an Odoo account mapping that is not a database id', () => {
    const mapping = createChartMapping({
      journal: '3',
      accounts: {
        '1100': { targetCode: '42', targetName: 'Fee receivables' },
        '4000': { targetCode: 'REVENUE', targetName: 'Fee revenue' },
        '1020': { targetCode: '44', targetName: 'Bank' },
      },
    });

    const result = validateBatch(batchFor('odoo'), mapping);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(paths(result.issues)).toEqual(['mapping["4000"].targetCode']);
  });

  it('refuses an ERPNext export whose mapping names no company', () => {
    const result = validateBatch(
      batchFor('erpnext'),
      createChartMapping({
        accounts: {
          '1100': { targetCode: '1100', targetName: 'Fee receivables - NS' },
          '4000': { targetCode: '4000', targetName: 'Fee revenue - NS' },
          '1020': { targetCode: '1020', targetName: 'Bank - NS' },
        },
      })
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(paths(result.issues)).toEqual(['mapping.company']);
  });

  it('refuses a target no connector implements', () => {
    const issues = issuesOf({ ...batchFor('quickbooks'), target: 'sage' as AccountingTargetId });

    expect(paths(issues)).toEqual(['target']);
    expect(issues[0].message).toContain('sage');
  });

  it('adds in minor units, so cents never drift', () => {
    const batch: ExportBatch = {
      institutionId: 'institution-nova',
      target: 'quickbooks',
      currency: 'KES',
      entries: [
        {
          date: '2027-02-10',
          reference: 'INV/2027/T1/000123',
          description: 'Two small fees',
          lines: [
            { accountCode: '1100', debit: '0.10' },
            { accountCode: '1100', debit: '0.20' },
            { accountCode: '4000', credit: '0.30' },
          ],
        },
      ],
    };

    const result = validateBatch(batch, mappingFor('quickbooks'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.totalDebitMinor).toBe(30);
    expect(result.document.totalCreditMinor).toBe(30);
    expect(result.document.entries[0].lines[2].amountText).toBe('0.30');
  });

  it('refuses an entry dated by something other than an ISO day', () => {
    const batch = batchFor('quickbooks');
    const issues = issuesOf(withFirstEntry(batch, { ...batch.entries[0], date: '10/02/2027' }));

    expect(paths(issues)).toEqual(['entries[0].date']);
  });
});

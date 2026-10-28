// ABOUTME: Tests for the chart-of-accounts mapping a school configures: the target code and name per school
// ABOUTME: account, the journal and company identifiers some targets need, and what an unmapped line reports.

import { describe, expect, it } from 'vitest';

import { createChartMapping, targetAccount, unmappedAccounts } from '../mapping';
import { batchFor } from './fixtures';

describe('the chart-of-accounts mapping', () => {
  it('resolves a school account to the target code and name, trimmed', () => {
    const mapping = createChartMapping({
      accounts: { ' 4000 ': { targetCode: ' 4100 ', targetName: ' Tuition revenue ' } },
    });

    expect(targetAccount(mapping, '4000')).toEqual({
      targetCode: '4100',
      targetName: 'Tuition revenue',
    });
    expect(targetAccount(mapping, '9999')).toBeNull();
  });

  it('carries the journal and company identifiers as null when the school has not named them', () => {
    const mapping = createChartMapping({ accounts: {} });

    expect(mapping.journal).toBeNull();
    expect(mapping.company).toBeNull();
  });

  it('reports no unmapped account when every line is mapped', () => {
    const mapping = createChartMapping({
      accounts: {
        '1100': { targetCode: '1100', targetName: 'Fee receivables' },
        '4000': { targetCode: '4000', targetName: 'Fee revenue' },
        '1020': { targetCode: '1020', targetName: 'Bank' },
      },
    });

    expect(unmappedAccounts(batchFor('quickbooks'), mapping)).toEqual([]);
  });

  it('counts every line an unmapped account appears on, once per account', () => {
    const mapping = createChartMapping({
      accounts: { '4000': { targetCode: '4000', targetName: 'Fee revenue' } },
    });

    expect(unmappedAccounts(batchFor('quickbooks'), mapping)).toEqual([
      { accountCode: '1100', accountName: 'Fee receivables', lineCount: 2 },
      { accountCode: '1020', accountName: 'Bank', lineCount: 1 },
    ]);
  });
});

// ABOUTME: The shared journal batch, the per-target chart-of-accounts mappings and the expected export
// ABOUTME: files the accounting tests compare against. Expected files are read with their line endings
// ABOUTME: normalised so a Windows checkout compares equal to what the connectors write.

import fs from 'node:fs';
import path from 'node:path';

import { createChartMapping, type ChartMapping } from '../mapping';
import type { AccountingTargetId, ExportBatch, ExportEntryInput } from '../types';

export const INSTITUTION_ID = 'institution-nova';
export const CURRENCY = 'KES' as const;

/** The two posted entries every connector test exports: a fee invoice and a bank deposit. */
function entries(): ExportEntryInput[] {
  return [
    {
      date: '2027-02-10',
      reference: 'INV/2027/T1/000123',
      description: 'Term 1 fees for Amina Otieno',
      lines: [
        { accountCode: '1100', accountName: 'Fee receivables', debit: '1250.00' },
        {
          accountCode: '4000',
          accountName: 'Fee revenue',
          credit: '1250.00',
          description: 'Term 1 tuition',
        },
      ],
    },
    {
      date: '2027-02-11',
      reference: 'PAY/2027/T1/000045',
      description: 'Bank deposit for term 1',
      lines: [
        {
          accountCode: '1020',
          accountName: 'Bank',
          debit: '500.55',
          costCentre: 'Main campus',
        },
        { accountCode: '1100', accountName: 'Fee receivables', credit: '500.55' },
      ],
    },
  ];
}

/** A balanced batch for one target. */
export function batchFor(target: AccountingTargetId): ExportBatch {
  return { institutionId: INSTITUTION_ID, target, currency: CURRENCY, entries: entries() };
}

/** The mapping a bursar configures for one target, in that target's own vocabulary. */
export function mappingFor(target: AccountingTargetId): ChartMapping {
  switch (target) {
    case 'quickbooks':
    case 'xero':
    case 'xero-api':
      return createChartMapping({
        accounts: {
          '1100': { targetCode: '1100', targetName: 'Fee receivables' },
          '4000': { targetCode: '4000', targetName: 'Fee revenue' },
          '1020': { targetCode: '1020', targetName: 'Bank' },
        },
      });
    case 'odoo':
      return createChartMapping({
        journal: '3',
        accounts: {
          '1100': { targetCode: '42', targetName: '1100 Fee receivables' },
          '4000': { targetCode: '43', targetName: '4000 Fee revenue' },
          '1020': { targetCode: '44', targetName: '1020 Bank' },
        },
      });
    case 'erpnext':
      return createChartMapping({
        company: 'Nova Schools',
        accounts: {
          '1100': { targetCode: '1100', targetName: 'Fee receivables - NS' },
          '4000': { targetCode: '4000', targetName: 'Fee revenue - NS' },
          '1020': { targetCode: '1020', targetName: 'Bank - NS' },
        },
      });
  }
}

/** An expected export file, as the test compares it: LF line endings and no BOM. */
export function expected(name: string): string {
  const file = path.join(process.cwd(), 'src', 'plugins', 'accounting', '__tests__', 'fixtures', name);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

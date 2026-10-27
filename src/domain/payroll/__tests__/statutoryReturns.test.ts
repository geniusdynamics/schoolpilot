// ABOUTME: Tests the statutory return export: the rows a pack's return layout describes are built from
// ABOUTME: payslips, in the layout's column order, using the layout effective for the payslips' period.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { fromMajor } from '@/domain/money';

import { PayrollError, computePayslip, exportReturn, loadPayrollPack, type PayrollInput } from '..';
import { cloneFakePack } from './fakePack';

const KE_DIR = resolve(process.cwd(), 'packs', 'payroll', 'ke');

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(resolve(KE_DIR, ...parts), 'utf8')) as T;
}

const labels = readJson<Record<string, string>>('locales', 'en.json');
const ke = loadPayrollPack(readJson<unknown>('pack.json'), labels);

function keInput(employeeId: string, basic: string, start = '2026-02-01', end = '2026-02-28'): PayrollInput {
  return { employeeId, period: { start, end }, basicPay: fromMajor(basic, 'KES') };
}

function refusalOf(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (error) {
    if (error instanceof PayrollError) return error.code;
    throw error;
  }
}

describe('exporting a statutory return', () => {
  const payslips = [keInput('EMP-1', '30000.00'), keInput('EMP-2', '250000.00')].map((input) =>
    computePayslip(ke, input)
  );

  it('builds one row per payslip in the column order of the layout', () => {
    const result = exportReturn(ke, 'nssf_return', payslips);
    expect(result.id).toBe('nssf_return');
    expect(result.columns.map((column) => column.key)).toEqual([
      'employee_id',
      'period_start',
      'gross_pay',
      'employee_contribution',
      'employer_contribution',
    ]);
    expect(result.columns[0].label).toBe('Employee');
    // Year 4: 6% x 9,000 + 6% x (30,000 - 9,000) = 540.00 + 1,260.00; 250,000 reaches the 108,000 cap: 6,480.00.
    expect(result.rows).toEqual([
      ['EMP-1', '2026-02-01', '30000.00', '1800.00', '1800.00'],
      ['EMP-2', '2026-02-01', '250000.00', '6480.00', '6480.00'],
    ]);
  });

  it('reports the PAYE return with taxable pay and PAYE', () => {
    const result = exportReturn(ke, 'kra_paye_return', payslips);
    expect(result.columns.map((column) => column.key)).toEqual([
      'employee_id',
      'period_start',
      'gross_pay',
      'taxable_pay',
      'paye',
    ]);
    // EMP-1: taxable 30,000 - 1,800 - 825 - 450 = 26,925; tax 2,400 + 25% x 2,925 = 731.25 -> 3,131.25 - 2,400 = 731.25.
    expect(result.rows[0]).toEqual(['EMP-1', '2026-02-01', '30000.00', '26925.00', '731.25']);
  });

  it('carries the layout verification and authority so a draft layout is not mistaken for the official file', () => {
    const result = exportReturn(ke, 'sha_return', payslips);
    expect(result.verification).toBe('draft');
    expect(result.authority).toBe('Social Health Authority');
  });

  it('refuses a return the pack does not describe', () => {
    expect(refusalOf(() => exportReturn(ke, 'vat_return', payslips))).toBe('unknown_return');
  });

  it('refuses payslips from more than one period, and an empty list', () => {
    const other = computePayslip(ke, keInput('EMP-3', '30000.00', '2026-03-01', '2026-03-31'));
    expect(refusalOf(() => exportReturn(ke, 'nssf_return', [payslips[0], other]))).toBe('mixed_periods');
    expect(refusalOf(() => exportReturn(ke, 'nssf_return', []))).toBe('invalid_input');
  });

  it('refuses a layout that is not in force for the period and takes the one that is', () => {
    const document = cloneFakePack();
    document.returns = [
      { ...document.returns[0], effectiveFrom: '2030-01-01' },
      { ...document.returns[0], effectiveFrom: '2000-01-01', effectiveTo: '2024-12-31', labelKey: 'return.taxOld' },
    ];
    const fake = loadPayrollPack(document);
    const slipIn = (start: string, end: string) =>
      computePayslip(fake, { employeeId: 'E', period: { start, end }, basicPay: fromMajor('1000.00', 'KES') });
    expect(refusalOf(() => exportReturn(fake, 'zz_tax_return', [slipIn('2025-01-01', '2025-01-31')]))).toBe(
      'no_rule_in_force'
    );
    expect(exportReturn(fake, 'zz_tax_return', [slipIn('2024-12-01', '2024-12-31')]).labelKey).toBe('return.taxOld');
  });

  it('tells which layouts of the Kenya pack start when', () => {
    const early = computePayslip(ke, keInput('EMP-4', '30000.00', '2024-10-01', '2024-10-31'));
    expect(refusalOf(() => exportReturn(ke, 'ahl_return', [early]))).toBeNull();
    expect(refusalOf(() => exportReturn(ke, 'sha_return', [early]))).toBeNull();
  });

  it('works for a fictional pack with its own layout', () => {
    const fake = loadPayrollPack(cloneFakePack());
    const slip = computePayslip(fake, {
      employeeId: 'E-9',
      period: { start: '2025-01-01', end: '2025-01-31' },
      basicPay: fromMajor('50000.00', 'KES'),
    });
    expect(exportReturn(fake, 'zz_tax_return', [slip]).rows).toEqual([['E-9', '9540.00']]);
  });
});

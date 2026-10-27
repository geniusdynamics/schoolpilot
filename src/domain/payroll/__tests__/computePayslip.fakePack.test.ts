// ABOUTME: Proves the payroll code reads the pack and nothing else: a fictional pack with other rates
// ABOUTME: gives a hand-computed payslip, the same input gives a different payslip under the Kenya pack,
// ABOUTME: and changing one figure of a pack changes the payslip by exactly that figure's effect.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { fromMajor, toDecimalString, type Money } from '@/domain/money';

import { PayrollError, computePayslip, loadPayrollPack, type PayrollInput, type Payslip } from '..';
import { cloneFakePack } from './fakePack';

const KE_PACK_PATH = resolve(process.cwd(), 'packs', 'payroll', 'ke', 'pack.json');

function money(text: string): Money {
  return fromMajor(text, 'KES');
}

function lineAmounts(payslip: Payslip): Record<string, string> {
  return Object.fromEntries(payslip.lines.map((line) => [line.code, toDecimalString(line.amount)]));
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

const SHARED_INPUT: PayrollInput = {
  employeeId: 'EMP-7',
  period: { start: '2025-01-01', end: '2025-01-31' },
  basicPay: money('50000.00'),
};

describe('a payslip under a fictional pack', () => {
  const pack = loadPayrollPack(cloneFakePack());

  it('reproduces a hand computation made from the fictional rates only', () => {
    // Gross 12,500.00 = basic 10,000.00 + taxable bonus 2,000.00 + non-taxable 500.00.
    // Pension (reads basic pay 10,000, capped at the 5,000 upper limit; limits 1,000 / 5,000; 10% / 5%):
    //   tier I 10% x 1,000 = 100.00, tier II 10% x 4,000 = 400.00 -> employee 500.00; employer 50.00 + 200.00 = 250.00.
    // Health 5% x 12,500 = 625.00, capped at the 200.00 maximum.
    // Levy 2% x 12,500 = 250.00 (employee); the employer pays a flat 25.00.
    // Tax: taxable gross 12,000.00; the pension deduction is capped at 300.00 -> taxable pay 11,700.00;
    //   5% x 2,000 = 100.00 plus 20% x 9,700 = 1,940.00 -> 2,040.00; less personal relief 100.00
    //   and the family relief min(50% x 400.00, 50.00) = 50.00 -> 1,890.00.
    // Deductions 500.00 + 200.00 + 250.00 + 1,890.00 = 2,840.00; net 12,500.00 - 2,840.00 = 9,660.00.
    const payslip = computePayslip(pack, {
      employeeId: 'EMP-1',
      period: { start: '2025-03-01', end: '2025-03-31' },
      basicPay: money('10000.00'),
      allowances: [
        { code: 'bonus', label: 'Bonus', amount: money('2000.00'), taxable: true },
        { code: 'meal', label: 'Meal', amount: money('500.00'), taxable: false },
      ],
      inputs: { dependants: money('400.00') },
    });
    const amounts = lineAmounts(payslip);
    expect(amounts['pension.employee']).toBe('500.00');
    expect(amounts['pension.employer']).toBe('250.00');
    expect(amounts['health.employee']).toBe('200.00');
    expect(amounts['levy.employee']).toBe('250.00');
    expect(amounts['levy.employer']).toBe('25.00');
    expect(amounts['tax.taxable_pay']).toBe('11700.00');
    expect(amounts['tax.tax_before_relief']).toBe('2040.00');
    expect(amounts['tax.relief.family']).toBe('50.00');
    expect(amounts.tax).toBe('1890.00');
    expect(toDecimalString(payslip.grossPay)).toBe('12500.00');
    expect(toDecimalString(payslip.totalDeductions)).toBe('2840.00');
    expect(toDecimalString(payslip.employerCost)).toBe('275.00');
    expect(toDecimalString(payslip.netPay)).toBe('9660.00');
    expect(payslip.packId).toBe('zz-payroll');
  });

  it('gives a different payslip than the Kenya pack for the same input', () => {
    // Fictional pack, basic 50,000.00: pension employee 500.00 (cap), health 200.00 (cap), levy 2% = 1,000.00;
    // taxable pay 50,000 - 300 = 49,700; tax 100.00 + 20% x 47,700 = 9,540 -> 9,640.00 - 100.00 = 9,540.00.
    // Net 50,000.00 - (500.00 + 200.00 + 1,000.00 + 9,540.00) = 38,760.00.
    const fictional = computePayslip(pack, SHARED_INPUT);
    expect(toDecimalString(fictional.netPay)).toBe('38760.00');

    // Kenya pack, January 2025 (NSSF Year 2, December 2024 PAYE rules), same basic 50,000.00:
    // NSSF 420.00 + 6% x (36,000 - 7,000) = 1,740.00 -> 2,160.00; SHIF 2.75% = 1,375.00; levy 1.5% = 750.00;
    // taxable pay 50,000 - 2,160 - 1,375 - 750 = 45,715.00; tax 2,400.00 + 2,083.25 + 30% x 13,382 = 4,014.60
    // -> 8,497.85 - 2,400.00 = 6,097.85. Net 50,000.00 - (2,160.00 + 1,375.00 + 750.00 + 6,097.85) = 39,617.15.
    const kenya = computePayslip(
      loadPayrollPack(JSON.parse(readFileSync(KE_PACK_PATH, 'utf8')) as unknown),
      SHARED_INPUT
    );
    expect(toDecimalString(kenya.netPay)).toBe('39617.15');
    expect(toDecimalString(kenya.netPay)).not.toBe(toDecimalString(fictional.netPay));
  });

  it('follows a changed figure of the pack and nothing else', () => {
    const changed = cloneFakePack();
    (changed.rules[1].params as { rate: string }).rate = '0.01';
    (changed.rules[1].params as { maximum: string | null }).maximum = null;
    const tuned = computePayslip(loadPayrollPack(changed), SHARED_INPUT);
    // Health is now 1% x 50,000 = 500.00 with no maximum: 300.00 more than the 200.00 cap gave.
    expect(lineAmounts(tuned)['health.employee']).toBe('500.00');
    const original = computePayslip(pack, SHARED_INPUT);
    expect(toDecimalString(original.netPay)).toBe('38760.00');
    expect(toDecimalString(tuned.netPay)).toBe('38460.00');
  });

  it('follows the rounding mode of the pack', () => {
    // Levy 2% of 12,345.67 = 246.9134 -> 246.91 under half_up, 246.92 under up.
    const input: PayrollInput = { ...SHARED_INPUT, basicPay: money('12345.67') };
    const halfUp = computePayslip(pack, input);
    expect(lineAmounts(halfUp)['levy.employee']).toBe('246.91');
    const rounding = cloneFakePack();
    rounding.rounding = { mode: 'up' };
    const up = computePayslip(loadPayrollPack(rounding), input);
    expect(lineAmounts(up)['levy.employee']).toBe('246.92');
  });

  it('marks the payslip verified only when every rule it used is verified', () => {
    expect(computePayslip(pack, SHARED_INPUT).verification).toBe('verified');
    const draft = cloneFakePack();
    draft.rules[2].verification = 'draft';
    const payslip = computePayslip(loadPayrollPack(draft), SHARED_INPUT);
    expect(payslip.verification).toBe('draft');
    expect(payslip.rulesApplied.find((applied) => applied.ruleId === 'levy')?.verification).toBe('draft');
  });

  it('keeps lines whose amounts add up to the totals', () => {
    const payslip = computePayslip(pack, SHARED_INPUT);
    const sumOf = (kind: string): number =>
      payslip.lines.filter((line) => line.kind === kind).reduce((total, line) => total + line.amount.amount_minor, 0);
    expect(sumOf('earning')).toBe(payslip.grossPay.amount_minor);
    expect(sumOf('deduction')).toBe(payslip.totalDeductions.amount_minor);
    expect(sumOf('employer_cost')).toBe(payslip.employerCost.amount_minor);
    expect(payslip.grossPay.amount_minor - payslip.totalDeductions.amount_minor).toBe(payslip.netPay.amount_minor);
  });
});

describe('refusals of the payslip computation', () => {
  const pack = loadPayrollPack(cloneFakePack());

  it('refuses a period before every entry of a rule rather than guessing', () => {
    const bounded = cloneFakePack();
    bounded.rules[0].effectiveFrom = '2025-06-01';
    expect(
      refusalOf(() => computePayslip(loadPayrollPack(bounded), SHARED_INPUT))
    ).toBe('no_rule_in_force');
  });

  it('refuses a period a rule is known but not modelled in', () => {
    const ke = loadPayrollPack(JSON.parse(readFileSync(KE_PACK_PATH, 'utf8')) as unknown);
    expect(
      refusalOf(() =>
        computePayslip(ke, { ...SHARED_INPUT, period: { start: '2024-03-01', end: '2024-03-31' } })
      )
    ).toBe('rule_not_modelled');
  });

  it('refuses an input amount the pack does not declare', () => {
    expect(
      refusalOf(() => computePayslip(pack, { ...SHARED_INPUT, inputs: { bonusPoints: money('1.00') } }))
    ).toBe('invalid_input');
  });

  it('refuses amounts in another currency, negative amounts and an unreadable period', () => {
    expect(
      refusalOf(() => computePayslip(pack, { ...SHARED_INPUT, basicPay: fromMajor('100', 'USD') }))
    ).toBe('invalid_input');
    expect(
      refusalOf(() => computePayslip(pack, { ...SHARED_INPUT, basicPay: fromMajor('-5.00', 'KES') }))
    ).toBe('invalid_input');
    expect(
      refusalOf(() => computePayslip(pack, { ...SHARED_INPUT, period: { start: '2025-02-01', end: '2025-01-31' } }))
    ).toBe('invalid_input');
    expect(
      refusalOf(() => computePayslip(pack, { ...SHARED_INPUT, period: { start: 'January', end: '2025-01-31' } }))
    ).toBe('invalid_input');
  });

  it('refuses deductions that exceed the gross pay', () => {
    expect(
      refusalOf(() =>
        computePayslip(pack, {
          ...SHARED_INPUT,
          otherDeductions: [{ code: 'advance', label: 'Salary advance', amount: money('60000.00') }],
        })
      )
    ).toBe('net_pay_negative');
  });
});

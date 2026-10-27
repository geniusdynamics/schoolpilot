// ABOUTME: Tests loading a payroll pack and selecting the rule entry effective on a date: the day before
// ABOUTME: and the day a rate changed, a date with no entry, and the checks that refuse a broken pack.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PayrollError, loadPayrollPack, selectRule } from '..';
import { cloneFakePack } from './fakePack';

const KE_PACK_PATH = resolve(process.cwd(), 'packs', 'payroll', 'ke', 'pack.json');

function keDocument(): Record<string, unknown> {
  return JSON.parse(readFileSync(KE_PACK_PATH, 'utf8')) as Record<string, unknown>;
}

function loadKe() {
  return loadPayrollPack(keDocument());
}

/** The code a refusal carries, or null when nothing was refused. */
function refusalOf(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (error) {
    if (error instanceof PayrollError) return error.code;
    throw error;
  }
}

describe('loading a payroll pack', () => {
  it('loads the Kenya pack', () => {
    const pack = loadKe();
    expect(pack.id).toBe('ke-payroll');
    expect(pack.currency).toBe('KES');
    expect(pack.order).toEqual(['nssf', 'shif', 'ahl', 'nita', 'paye']);
  });

  it('loads a fictional pack with other rates', () => {
    expect(loadPayrollPack(cloneFakePack()).id).toBe('zz-payroll');
  });

  it('refuses a document that is not an object', () => {
    expect(refusalOf(() => loadPayrollPack(null))).toBe('invalid_pack');
    expect(refusalOf(() => loadPayrollPack('pack'))).toBe('invalid_pack');
    expect(refusalOf(() => loadPayrollPack([]))).toBe('invalid_pack');
  });

  it('refuses a currency outside the money table', () => {
    const document = cloneFakePack();
    document.currency = 'QQQ';
    expect(refusalOf(() => loadPayrollPack(document))).toBe('invalid_pack');
  });

  it('refuses an amount or a rate that cannot be read exactly', () => {
    const badAmount = cloneFakePack();
    (badAmount.rules[1].params as { minimum: string }).minimum = '10.005';
    expect(refusalOf(() => loadPayrollPack(badAmount))).toBe('invalid_pack');

    const badRate = cloneFakePack();
    (badRate.rules[1].params as { rate: string }).rate = '5%';
    expect(refusalOf(() => loadPayrollPack(badRate))).toBe('invalid_pack');
  });

  it('refuses a rule entry that cites a source the pack does not list', () => {
    const document = cloneFakePack();
    document.rules[0].sourceRef = 'nowhere';
    expect(refusalOf(() => loadPayrollPack(document))).toBe('invalid_pack');
  });

  it('refuses two entries of one rule that overlap in time', () => {
    const document = cloneFakePack();
    document.rules.push({ ...document.rules[0], effectiveFrom: '2010-01-01' });
    expect(refusalOf(() => loadPayrollPack(document))).toBe('invalid_pack');
  });

  it('refuses an entry that ends before it starts and an impossible date', () => {
    const reversed = cloneFakePack();
    reversed.rules[0].effectiveFrom = '2020-06-01';
    reversed.rules[0].effectiveTo = '2020-05-31';
    expect(refusalOf(() => loadPayrollPack(reversed))).toBe('invalid_pack');

    const impossible = cloneFakePack();
    impossible.rules[0].effectiveFrom = '2023-02-30';
    expect(refusalOf(() => loadPayrollPack(impossible))).toBe('invalid_pack');
  });

  it('refuses an order that names a rule with no entry, or lists a rule before one it reads', () => {
    const unknown = cloneFakePack();
    unknown.order = ['pension', 'health', 'levy', 'tax', 'ghost'];
    expect(refusalOf(() => loadPayrollPack(unknown))).toBe('invalid_pack');

    const early = cloneFakePack();
    early.order = ['tax', 'pension', 'health', 'levy'];
    expect(refusalOf(() => loadPayrollPack(early))).toBe('invalid_pack');
  });

  it('refuses income tax bands that do not rise or do not end open', () => {
    const falling = cloneFakePack();
    (falling.rules[3].params as { bands: Array<{ upTo: string | null; rate: string }> }).bands = [
      { upTo: '5000.00', rate: '0.05' },
      { upTo: '2000.00', rate: '0.10' },
      { upTo: null, rate: '0.20' },
    ];
    expect(refusalOf(() => loadPayrollPack(falling))).toBe('invalid_pack');

    const closed = cloneFakePack();
    (closed.rules[3].params as { bands: Array<{ upTo: string | null; rate: string }> }).bands = [
      { upTo: '2000.00', rate: '0.05' },
      { upTo: '9000.00', rate: '0.20' },
    ];
    expect(refusalOf(() => loadPayrollPack(closed))).toBe('invalid_pack');
  });

  it('refuses a rule that reads an input the pack does not declare', () => {
    const document = cloneFakePack();
    document.inputs = [];
    expect(refusalOf(() => loadPayrollPack(document))).toBe('invalid_pack');
  });

  it('refuses an earnings limit pair whose lower limit is above the upper', () => {
    const document = cloneFakePack();
    (document.rules[0].params as { lowerEarningsLimit: string }).lowerEarningsLimit = '9000.00';
    expect(refusalOf(() => loadPayrollPack(document))).toBe('invalid_pack');
  });
});

describe('selecting the rule entry effective on a date', () => {
  const pack = loadKe();

  function nssfFrom(date: string): string {
    return selectRule(pack, 'nssf', date).effectiveFrom;
  }

  it('selects the NSSF year by the day it started: the day before and the day of each change', () => {
    expect(nssfFrom('2024-01-31')).toBe('2023-02-01');
    expect(nssfFrom('2024-02-01')).toBe('2024-02-01');
    expect(nssfFrom('2025-01-31')).toBe('2024-02-01');
    expect(nssfFrom('2025-02-01')).toBe('2025-02-01');
    expect(nssfFrom('2026-01-31')).toBe('2025-02-01');
    expect(nssfFrom('2026-02-01')).toBe('2026-02-01');
    expect(nssfFrom('2031-06-15')).toBe('2026-02-01');
  });

  it('selects the PAYE rules by the December 2024 change', () => {
    expect(selectRule(pack, 'paye', '2024-11-30').effectiveFrom).toBe('2023-07-01');
    expect(selectRule(pack, 'paye', '2024-12-01').effectiveFrom).toBe('2024-12-01');
  });

  it('returns the figures of the table in force, read from the pack', () => {
    const before = selectRule(pack, 'nssf', '2026-01-31');
    const after = selectRule(pack, 'nssf', '2026-02-01');
    expect(before.params).toMatchObject({ upperEarningsLimit: expect.objectContaining({ amount_minor: 7200000 }) });
    expect(after.params).toMatchObject({ upperEarningsLimit: expect.objectContaining({ amount_minor: 10800000 }) });
  });

  it('refuses a date before the first entry of a rule', () => {
    expect(refusalOf(() => selectRule(pack, 'paye', '2023-06-30'))).toBe('no_rule_in_force');
    expect(refusalOf(() => selectRule(pack, 'nssf', '2023-01-31'))).toBe('no_rule_in_force');
  });

  it('refuses a date after the last entry that ends', () => {
    const document = cloneFakePack();
    document.rules[1].effectiveTo = '2020-12-31';
    const bounded = loadPayrollPack(document);
    expect(refusalOf(() => selectRule(bounded, 'health', '2020-12-31'))).toBeNull();
    expect(refusalOf(() => selectRule(bounded, 'health', '2021-01-01'))).toBe('no_rule_in_force');
  });

  it('refuses a rule the pack does not hold and a date that is not a date', () => {
    expect(refusalOf(() => selectRule(pack, 'ghost', '2025-01-01'))).toBe('no_rule_in_force');
    expect(refusalOf(() => selectRule(pack, 'nssf', '01/02/2025'))).toBe('invalid_input');
    expect(refusalOf(() => selectRule(pack, 'nssf', '2025-02-30'))).toBe('invalid_input');
  });

  it('returns a not-modelled entry for a period the pack knows but does not model', () => {
    const entry = selectRule(pack, 'shif', '2024-09-30');
    expect(entry.notModelled).toContain('NHIF');
    expect(selectRule(pack, 'shif', '2024-10-01').notModelled).toBeUndefined();
  });
});

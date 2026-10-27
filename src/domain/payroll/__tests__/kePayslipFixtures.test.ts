// ABOUTME: Fixture tests of the Kenya payroll pack: every payslip fixture is reproduced line by line to
// ABOUTME: the cent, each fixture cites where its figures come from, the pack's labels are complete and
// ABOUTME: every draft entry is listed in the pack README.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { fromMajor, toDecimalString, type Money } from '@/domain/money';

import { computePayslip, loadPayrollPack, ENGINE_LABEL_KEYS, type PayrollInput } from '..';

const KE_DIR = resolve(process.cwd(), 'packs', 'payroll', 'ke');

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(resolve(KE_DIR, ...parts), 'utf8')) as T;
}

interface FixtureInput {
  employeeId: string;
  period: { start: string; end: string };
  basicPay: string;
  allowances: Array<{ code: string; label: string; amount: string; taxable: boolean }>;
  inputs: Record<string, string>;
  otherDeductions: Array<{ code: string; label: string; amount: string }>;
}

interface Fixture {
  id: string;
  verification: 'verified' | 'draft';
  source: string;
  input: FixtureInput;
  expected: {
    grossPay: string;
    taxablePay: string;
    totalDeductions: string;
    employerCost: string;
    netPay: string;
    lines: Array<{ code: string; kind: string; amount: string }>;
  };
}

function money(text: string): Money {
  return fromMajor(text, 'KES');
}

function toInput(fixture: FixtureInput): PayrollInput {
  return {
    employeeId: fixture.employeeId,
    period: fixture.period,
    basicPay: money(fixture.basicPay),
    allowances: fixture.allowances.map((allowance) => ({ ...allowance, amount: money(allowance.amount) })),
    inputs: Object.fromEntries(Object.entries(fixture.inputs).map(([key, value]) => [key, money(value)])),
    otherDeductions: fixture.otherDeductions.map((deduction) => ({ ...deduction, amount: money(deduction.amount) })),
  };
}

const labels = readJson<Record<string, string>>('locales', 'en.json');
const pack = loadPayrollPack(readJson<unknown>('pack.json'), labels);
const fixtures = readJson<Fixture[]>('tests', 'payslip.fixtures.json');

describe('the Kenya payroll pack fixtures', () => {
  it('holds fixtures across several salaries and periods', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(6);
    const periods = new Set(fixtures.map((fixture) => fixture.input.period.start));
    expect(periods.size).toBeGreaterThanOrEqual(5);
    const salaries = new Set(fixtures.map((fixture) => fixture.input.basicPay));
    expect(salaries.size).toBeGreaterThanOrEqual(5);
    expect(new Set(fixtures.map((fixture) => fixture.id)).size).toBe(fixtures.length);
  });

  it.each(fixtures.map((fixture) => [fixture.id, fixture] as const))(
    'reproduces %s to the cent',
    (_id, fixture) => {
      const payslip = computePayslip(pack, toInput(fixture.input));
      const actual = payslip.lines.map((line) => ({
        code: line.code,
        kind: line.kind,
        amount: toDecimalString(line.amount),
      }));
      expect(actual).toEqual(fixture.expected.lines);
      expect(toDecimalString(payslip.grossPay)).toBe(fixture.expected.grossPay);
      expect(toDecimalString(payslip.taxablePay)).toBe(fixture.expected.taxablePay);
      expect(toDecimalString(payslip.totalDeductions)).toBe(fixture.expected.totalDeductions);
      expect(toDecimalString(payslip.employerCost)).toBe(fixture.expected.employerCost);
      expect(toDecimalString(payslip.netPay)).toBe(fixture.expected.netPay);
      expect(payslip.verification).toBe(fixture.verification);
    }
  );

  it('gives every fixture a note saying where its figures come from', () => {
    for (const fixture of fixtures) {
      expect(fixture.source.length, fixture.id).toBeGreaterThan(80);
      expect(fixture.source, fixture.id).toMatch(/Hand computation|worked example/i);
    }
  });

  it('labels every payslip line', () => {
    for (const fixture of fixtures) {
      const payslip = computePayslip(pack, toInput(fixture.input));
      for (const line of payslip.lines) {
        expect(line.label.length, `${fixture.id} ${line.code}`).toBeGreaterThan(0);
        expect(line.label, `${fixture.id} ${line.code}`).not.toBe(line.labelKey);
      }
    }
  });

  it('shows the December 2024 change: the same salary pays less PAYE once the levy and SHIF are deductible', () => {
    const november = fixtures.find((fixture) => fixture.id === 'ke-2024-11-basic-100000');
    const december = fixtures.find((fixture) => fixture.id === 'ke-2024-12-basic-100000');
    if (!november || !december) throw new Error('the November and December 2024 fixtures are missing');
    const payeOf = (fixture: Fixture): number =>
      Number(fixture.expected.lines.find((line) => line.code === 'paye')?.amount);
    expect(payeOf(december)).toBeLessThan(payeOf(november));
  });
});

describe('the Kenya pack documents', () => {
  it('has a label for every label key the pack and the engine use', () => {
    const document = readJson<{
      inputs: Array<{ labelKey: string }>;
      rules: Array<{
        labelKey: string;
        kind: string;
        params?: {
          taxableDeductions?: Array<{ labelKey: string }>;
          reliefs?: Array<{ labelKey: string }>;
          employeeRate?: string | null;
          employerRate?: string | null;
          employerFlat?: string | null;
        };
      }>;
      returns: Array<{ labelKey: string; columns: Array<{ labelKey: string }> }>;
    }>('pack.json');

    const keys = new Set<string>(ENGINE_LABEL_KEYS);
    for (const input of document.inputs) keys.add(input.labelKey);
    for (const rule of document.rules) {
      keys.add(rule.labelKey);
      if (rule.kind === 'social_security') {
        keys.add(`${rule.labelKey}.employee`);
        keys.add(`${rule.labelKey}.employer`);
      }
      if (rule.kind === 'health_insurance') keys.add(`${rule.labelKey}.employee`);
      if (rule.kind === 'levy') {
        if (rule.params?.employeeRate) keys.add(`${rule.labelKey}.employee`);
        if (rule.params?.employerRate || rule.params?.employerFlat) keys.add(`${rule.labelKey}.employer`);
      }
      for (const group of rule.params?.taxableDeductions ?? []) keys.add(group.labelKey);
      for (const relief of rule.params?.reliefs ?? []) keys.add(relief.labelKey);
    }
    for (const layout of document.returns) {
      keys.add(layout.labelKey);
      for (const column of layout.columns) keys.add(column.labelKey);
    }
    const missing = [...keys].filter((key) => labels[key] === undefined || labels[key].length === 0);
    expect(missing).toEqual([]);
  });

  it('lists every draft entry and every draft return layout in the README', () => {
    const readme = readFileSync(resolve(KE_DIR, 'README.md'), 'utf8');
    const document = readJson<{
      rules: Array<{ ruleId: string; effectiveFrom: string; verification: string }>;
      returns: Array<{ id: string; verification: string }>;
    }>('pack.json');
    const unlisted: string[] = [];
    for (const rule of document.rules.filter((entry) => entry.verification === 'draft')) {
      if (!readme.includes(`\`${rule.ruleId}\` from ${rule.effectiveFrom}`)) {
        unlisted.push(`${rule.ruleId} ${rule.effectiveFrom}`);
      }
    }
    for (const layout of document.returns.filter((entry) => entry.verification === 'draft')) {
      if (!readme.includes(`\`${layout.id}\``)) unlisted.push(layout.id);
    }
    expect(unlisted).toEqual([]);
  });

  it('tells the reader a payroll accountant must confirm the pack before anyone is paid from it', () => {
    const readme = readFileSync(resolve(KE_DIR, 'README.md'), 'utf8');
    expect(readme).toMatch(/payroll accountant/i);
    expect(readme).toMatch(/before it is used to pay/i);
    expect(readme.indexOf('payroll accountant')).toBeLessThan(900);
  });

  it('cites an official source for every rule entry and lists only fetched sources', () => {
    const document = readJson<{
      sources: Array<{ id: string; url: string; publisher: string }>;
      rules: Array<{ sourceRef: string }>;
    }>('pack.json');
    const ids = new Set(document.sources.map((source) => source.id));
    for (const rule of document.rules) expect(ids.has(rule.sourceRef), rule.sourceRef).toBe(true);
    for (const source of document.sources) {
      expect(source.url, source.id).toMatch(/^https:\/\/(?:www\.)?(?:kra|sha|nssf|nita|employers\.sha)\.go\.ke|^https:\/\/www\.nssf\.or\.ke|^https:\/\/nita\.go\.ke/);
    }
  });
});

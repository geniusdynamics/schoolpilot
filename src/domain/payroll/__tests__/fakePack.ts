// ABOUTME: A second, fictional payroll pack whose every rate, band and limit differs from the Kenya
// ABOUTME: pack, used to prove the payroll code reads the pack and nothing else.

/** One rule entry of a pack document; the parameters differ by kind, so a test casts the field it changes. */
export interface FakeRule {
  ruleId: string;
  kind: string;
  labelKey: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceRef: string;
  verification: string;
  params: Record<string, unknown>;
}

/** A pack document a test may edit before loading it. */
export interface FakePack {
  id: string;
  country: string;
  currency: string;
  version: string;
  verification: string;
  sources: Array<Record<string, string>>;
  rounding: { mode: string };
  inputs: Array<{ key: string; labelKey: string; deductedFromPay: boolean }>;
  order: string[];
  rules: FakeRule[];
  returns: Array<Record<string, unknown>>;
}

/** A payroll pack document in the shape of packs/payroll/schema.json, with rates unlike any real country. */
export const FAKE_PACK_DOCUMENT: FakePack = {
  id: 'zz-payroll',
  country: 'ZZ',
  currency: 'KES',
  version: '1.0.0',
  verification: 'draft',
  sources: [
    {
      id: 'zz-law',
      title: 'A fictional statute',
      publisher: 'Test Authority',
      url: 'https://example.org/zz-law',
      retrieved: '2026-01-01',
    },
  ],
  rounding: { mode: 'half_up' },
  inputs: [{ key: 'dependants', labelKey: 'input.dependants', deductedFromPay: false }],
  order: ['pension', 'health', 'levy', 'tax'],
  rules: [
    {
      ruleId: 'pension',
      kind: 'social_security',
      labelKey: 'rule.pension',
      effectiveFrom: '2000-01-01',
      effectiveTo: null,
      sourceRef: 'zz-law',
      verification: 'verified',
      params: {
        base: 'basic_pay',
        lowerEarningsLimit: '1000.00',
        upperEarningsLimit: '5000.00',
        employeeRate: '0.10',
        employerRate: '0.05',
      },
    },
    {
      ruleId: 'health',
      kind: 'health_insurance',
      labelKey: 'rule.health',
      effectiveFrom: '2000-01-01',
      effectiveTo: null,
      sourceRef: 'zz-law',
      verification: 'verified',
      params: { base: 'gross_pay', rate: '0.05', minimum: '10.00', maximum: '200.00' },
    },
    {
      ruleId: 'levy',
      kind: 'levy',
      labelKey: 'rule.levy',
      effectiveFrom: '2000-01-01',
      effectiveTo: null,
      sourceRef: 'zz-law',
      verification: 'verified',
      params: { base: 'gross_pay', employeeRate: '0.02', employerRate: null, employerFlat: '25.00' },
    },
    {
      ruleId: 'tax',
      kind: 'income_tax',
      labelKey: 'rule.tax',
      effectiveFrom: '2000-01-01',
      effectiveTo: null,
      sourceRef: 'zz-law',
      verification: 'verified',
      params: {
        bands: [
          { upTo: '2000.00', rate: '0.05' },
          { upTo: null, rate: '0.20' },
        ],
        personalRelief: '100.00',
        taxableDeductions: [
          {
            id: 'pension',
            labelKey: 'deduction.pension',
            capMonthly: '300.00',
            sources: [{ from: 'rule', ruleId: 'pension', party: 'employee' }],
          },
        ],
        reliefs: [
          {
            id: 'family',
            labelKey: 'relief.family',
            rate: '0.5',
            capMonthly: '50.00',
            source: { from: 'input', key: 'dependants' },
          },
        ],
      },
    },
  ],
  returns: [
    {
      id: 'zz_tax_return',
      labelKey: 'return.tax',
      authority: 'Test Authority',
      effectiveFrom: '2000-01-01',
      effectiveTo: null,
      sourceRef: 'zz-law',
      verification: 'draft',
      columns: [
        { key: 'employee', labelKey: 'column.employee', source: 'employeeId' },
        { key: 'tax', labelKey: 'column.tax', source: 'line:tax' },
      ],
    },
  ],
};

/** Deep copy, so a test can change one figure without touching the shared document. */
export function cloneFakePack(): FakePack {
  return JSON.parse(JSON.stringify(FAKE_PACK_DOCUMENT)) as FakePack;
}

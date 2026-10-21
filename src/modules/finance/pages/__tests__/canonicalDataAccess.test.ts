// ABOUTME: The source-level check for the finance module: no finance page reads a canonical collection
// ABOUTME: through the legacy app-data layer, every remaining legacy read names its gap, and every
// ABOUTME: reference a page offers is an EntityPicker.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const MODULE_ROOT = join(process.cwd(), 'src', 'modules', 'finance');
const UI_ROOTS = ['pages', 'components'] as const;

/**
 * The legacy collections the canonical registry can serve.
 *
 * A page that still reads one of these through `useAppData()`, `useFinance()` or
 * `useDatabaseCollection()` reads canonical data through the legacy layer, which is
 * exactly what this task removes.
 */
const CANONICAL_LEGACY_COLLECTIONS = [
  'students',
  'staff',
  'classes',
  'classStreams',
  'schoolPeriods',
  'academic_years',
  'feeTemplates',
  'studentInvoices',
  'studentInvoiceItems',
  'studentPayments',
  'invoicePaymentApplications',
  'feeAdjustments',
  'studentOpeningBalances',
] as const;

/**
 * The legacy collections the registry models no entity for. They stay on the legacy
 * layer until a registry change lands; every file that reads one carries GAP(P1-E03).
 */
const GAP_LEGACY_COLLECTIONS = [
  'chartOfAccounts',
  'banks',
  'suppliers',
  'supplierContracts',
  'customerInvoices',
  'supplierInvoices',
  'financialYears',
  'generalLedgerEntries',
  'journalEntries',
  'generalPayments',
  'balanceSheetItems',
  'cashBookEntries',
  'dayBookEntries',
  'incomeStatementItems',
  'trialBalanceItems',
  'receiptTemplates',
  'transportRoutes',
  'studentTransportAssignments',
  'expenseCategories',
  'expenseClaims',
  'partners',
  'customers',
] as const;

/** The pages migrated onto the canonical repository in this task. */
const MIGRATED_PAGES = [
  'FeeTemplatesPage.tsx',
  'StudentPaymentsPage.tsx',
  'PaymentAllocationPage.tsx',
  'FeeAdjustmentsPage.tsx',
  'FeesFinesPage.tsx',
  'FeesInstallmentsPage.tsx',
  'StudentOpeningBalancesPage.tsx',
  'FeeCollectionSummaryPage.tsx',
  'StudentFinancialSummaryPage.tsx',
  'StudentsPaidBookPage.tsx',
  'FeesDueReportPage.tsx',
  'VoteheadStatementPage.tsx',
  'PreviousSessionFeesPage.tsx',
  'FinanceDashboardPage.tsx',
  'InvoiceGenerationPage.tsx',
  'EffectFeeStructuresPage.tsx',
] as const;

interface SourceFile {
  readonly path: string;
  readonly text: string;
  readonly modulePath: string;
}

function walk(directory: string, found: SourceFile[]): void {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      if (entry === '__tests__') continue;
      walk(path, found);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    found.push({
      path,
      text: readFileSync(path, 'utf8'),
      modulePath: relative(MODULE_ROOT, path).split(sep).join('/'),
    });
  }
}

const files: SourceFile[] = [];
for (const root of UI_ROOTS) walk(join(MODULE_ROOT, root), files);

/** The names a legacy hook call reads. */
function collectionsReadBy(source: string): string[] {
  const names: string[] = [];
  const destructured = /\{([^{}]*)\}\s*=\s*use(?:AppData|Finance)\(\)/g;
  let match = destructured.exec(source);
  while (match) {
    for (const part of (match[1] ?? '').split(',')) {
      const name = part.split('=')[0]?.split(':')[0]?.trim();
      if (name) names.push(name);
    }
    match = destructured.exec(source);
  }
  const member = /use(?:AppData|Finance)\(\)\.(\w+)/g;
  match = member.exec(source);
  while (match) {
    names.push(match[1] as string);
    match = member.exec(source);
  }
  const collection = /useDatabaseCollection(?:<[^>]*>)?\(\s*'([^']+)'\s*\)/g;
  match = collection.exec(source);
  while (match) {
    names.push(match[1] as string);
    match = collection.exec(source);
  }
  return names;
}

function file(name: string): SourceFile {
  const found = files.find((candidate) => candidate.modulePath === `pages/${name}`);
  expect(found, `${name} must exist`).toBeDefined();
  return found as SourceFile;
}

describe('the finance UI reads canonical data through the repository', () => {
  it('finds the page and component sources', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('keeps useAppData() reads only inside a file that names its gap', () => {
    const offenders = files
      .filter((source) => /useAppData\(\)/.test(source.text))
      .filter((source) => !/GAP\(P1-E03\)/.test(source.text))
      .map((source) => source.modulePath);
    expect(offenders).toEqual([]);
  });

  it('leaves no legacy write of a canonical finance document', () => {
    const writeNames = [
      'addFeeTemplate',
      'updateFeeTemplate',
      'deleteFeeTemplate',
      'addFeeTemplateItem',
      'updateFeeTemplateItem',
      'deleteFeeTemplateItem',
      'recordStudentPayment',
      'addStudentPayment',
      'updateStudentPayment',
      'deleteStudentPayment',
      'addFeeAdjustment',
      'updateFeeAdjustment',
      'deleteFeeAdjustment',
      'addStudentOpeningBalance',
      'updateStudentOpeningBalance',
      'deleteStudentOpeningBalance',
      'generateTermInvoices',
      'generateStudentInvoices',
    ];
    const offenders: string[] = [];
    for (const source of files) {
      for (const name of writeNames) {
        if (new RegExp(`\\b${name}\\s*\\(`).test(source.text)) {
          offenders.push(`${source.modulePath} calls ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never destructures a canonical collection from the legacy layer', () => {
    const offenders: string[] = [];
    for (const source of files) {
      for (const name of collectionsReadBy(source.text)) {
        if ((CANONICAL_LEGACY_COLLECTIONS as readonly string[]).includes(name)) {
          offenders.push(`${source.modulePath} reads ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('marks every remaining legacy read with its gap when a collection is not canonical', () => {
    const unmarked: string[] = [];
    for (const source of files) {
      if (!/use(?:Finance|DatabaseCollection)\(/.test(source.text)) continue;
      if (!/GAP\(P1-E03\)/.test(source.text)) unmarked.push(source.modulePath);
    }
    expect(unmarked).toEqual([]);
  });

  it('keeps every gap read on a collection the registry does not model', () => {
    const known = new Set<string>([
      ...(CANONICAL_LEGACY_COLLECTIONS as readonly string[]),
      ...(GAP_LEGACY_COLLECTIONS as readonly string[]),
    ]);
    const offenders: string[] = [];
    for (const source of files) {
      const names = collectionsReadBy(source.text);
      for (const name of names) {
        if (!known.has(name)) continue;
        if ((CANONICAL_LEGACY_COLLECTIONS as readonly string[]).includes(name)) {
          offenders.push(`${source.modulePath} reads ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('renders every migrated page without a raw select or a legacy collection read', () => {
    for (const name of MIGRATED_PAGES) {
      const source = file(name);
      expect(source.text, `${name} must not use a raw <select>`).not.toMatch(/<select\b/);
      expect(collectionsReadBy(source.text), `${name} must not read a legacy collection`).toEqual([]);
    }
  });

  it('binds the reference pickers of every migrated page to EntityPicker', () => {
    const referencePages = [
      'FeeTemplatesPage.tsx',
      'StudentPaymentsPage.tsx',
      'PaymentAllocationPage.tsx',
      'FeeAdjustmentsPage.tsx',
      'FeesFinesPage.tsx',
      'FeesInstallmentsPage.tsx',
      'StudentOpeningBalancesPage.tsx',
      'FeeCollectionSummaryPage.tsx',
      'VoteheadStatementPage.tsx',
      'PreviousSessionFeesPage.tsx',
    ] as const;
    for (const name of referencePages) {
      const source = file(name);
      const throughPicker =
        /EntityPicker/.test(source.text) ||
        /BillingRunPanel|CreditNoteDialog/.test(source.text) ||
        /widget:\s*['"]entity['"]/.test(source.text);
      expect(throughPicker, `${name} must choose its references through EntityPicker`).toBe(true);
    }
  });

  it('gives every canonical finance data file two ABOUTME lines', () => {
    const added = files.filter((source) => /canonicalFinance|canonicalRepository|BillingRunPanel/.test(source.modulePath));
    expect(added.length).toBeGreaterThan(0);
    for (const source of added) {
      const head = source.text.split('\n').slice(0, 2);
      expect(head[0]?.startsWith('// ABOUTME:'), `${source.modulePath} needs an ABOUTME line`).toBe(true);
      expect(head[1]?.startsWith('// ABOUTME:'), `${source.modulePath} needs a second ABOUTME line`).toBe(true);
    }
  });
});

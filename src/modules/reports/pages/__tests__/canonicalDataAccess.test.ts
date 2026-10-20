// ABOUTME: The source-level check for the five module trees: no canonical collection is read
// ABOUTME: through the legacy app-data context, and every legacy read that stays names its gap.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const MODULE_ROOT = join(process.cwd(), 'src', 'modules');
const MODULE_TREES = ['inventory', 'library', 'nutrition', 'hr', 'reports'] as const;

/**
 * The legacy collections the canonical model serves.
 *
 * A page that still reads one of these through `useAppData()` or `useDatabaseCollection()` reads
 * canonical data through the legacy context, which is what this check refuses. Both spellings are
 * listed: the camelCase member the context exposes and the snake_case collection name.
 */
const CANONICAL_LEGACY_COLLECTIONS = [
  'users',
  'students',
  'staff',
  'classes',
  'classStreams',
  'class_streams',
  'subjects',
  'departments',
  'designations',
  'academicYears',
  'academic_years',
  'schoolPeriods',
  'school_periods',
  'financialYears',
  'financial_years',
  'examSessions',
  'exam_sessions',
  'gradingSchemes',
  'grading_schemes',
  'studentInvoices',
  'student_invoices',
  'studentPayments',
  'student_payments',
  'studentExamResults',
  'student_exam_results',
  'teacherSubjectAssignments',
  'teacher_subject_assignments',
] as const;

/**
 * The legacy collections the canonical registry does not model.
 *
 * A read of one of these stays on the legacy context until a registry change adds the
 * entity; the call site says which one is missing.
 */
const GAP_LEGACY_COLLECTIONS = [
  'payrollPeriods',
  'payrollItemTypes',
  'staffSalarySettings',
  'payslips',
  'itemsInv',
  'itemCategoriesInv',
  'warehouses',
  'stockLevels',
  'stockTransactions',
  'fixedAssets',
  'requisitions',
  'purchaseOrders',
  'suppliers',
  'supplierContracts',
  'rfqs',
  'supplierInvoices',
  'stationeryItems',
  'books',
  'bookCategories',
  'loans',
  'fines',
  'mealPlans',
  'menus',
  'merchants',
  'studentMealPlans',
  'studentWallets',
  'walletTransactions',
  'mealConsumptionLogs',
  'foodInventory',
  'kitchenMealPlans',
  'chartOfAccounts',
  'generalLedgerEntries',
  'journalEntries',
  'feeAdjustments',
  'studentOpeningBalances',
  'invoicePaymentApplications',
  'feeTemplates',
  'examPaperSettings',
] as const;

/**
 * The report pages whose canonical read is still pending.
 *
 * Each entry names the canonical entity that serves the collection, so the pending
 * migration is visible in the source instead of hidden in a report.
 */
const PENDING_CANONICAL_MIGRATION: Record<string, string> = {
  'reports/pages/ReportsDashboardPage.tsx': 'learner, staff, department, learning_area',
  'reports/pages/ClassListsPage.tsx': 'learner, class_group, assessment, grading_scale, mark',
  'reports/pages/ExamResultsHorizontalPage.tsx': 'learner, class_group, level, assessment, mark',
  'reports/pages/FeeCollectionSummaryPage.tsx': 'learner, class_group, academic_period, invoice, payment',
  'reports/pages/StudentFinancialSummaryPage.tsx': 'learner, class_group, academic_period, invoice, payment',
  'reports/pages/StudentVoteheadStatementPage.tsx': 'learner, academic_period, invoice, payment',
  'reports/library/OverdueReport.tsx': 'learner, staff',
};

interface SourceFile {
  readonly path: string;
  readonly text: string;
  /** The path relative to `src/modules`, with forward slashes. */
  readonly modulePath: string;
}

/** Every source file of the five module trees, tests excluded. */
function sourceFiles(): SourceFile[] {
  const found: SourceFile[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) {
        if (entry === '__tests__') continue;
        walk(path);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      found.push({
        path,
        text: readFileSync(path, 'utf8'),
        modulePath: relative(MODULE_ROOT, path).split(sep).join('/'),
      });
    }
  };
  for (const tree of MODULE_TREES) walk(join(MODULE_ROOT, tree));
  return found;
}

/** The collections a `useDatabaseCollection` call binds, by literal or by the constant naming it. */
function databaseCollectionNames(source: string): string[] {
  const names: string[] = [];
  const constants = new Map<string, string>();
  for (const declared of source.matchAll(/(?:const|let)\s+(\w+)\s*(?::\s*string)?\s*=\s*['"]([^'"]+)['"]/g)) {
    constants.set(declared[1] as string, declared[2] as string);
  }
  for (const called of source.matchAll(/useDatabaseCollection\s*(?:<[^()]*>)?\s*\(\s*([^)]+)\)/g)) {
    const argument = (called[1] ?? '').trim();
    const name = /^['"]([^'"]+)['"]$/.exec(argument)?.[1] ?? constants.get(argument);
    if (name) names.push(name);
  }
  return names;
}

/** The names a `useAppData()` call reads, by destructuring, by member or through its variable. */
function collectionsReadBy(source: string): string[] {
  const names: string[] = [];
  // The destructuring spelling: const { a, b } = useAppData();
  const destructured = /\{([^{}]*)\}\s*=\s*useAppData\(\)/g;
  let match = destructured.exec(source);
  while (match) {
    for (const part of (match[1] ?? '').split(',')) {
      const name = part.split('=')[0]?.split(':')[0]?.trim();
      if (name) names.push(name);
    }
    match = destructured.exec(source);
  }
  // The member spelling: useAppData().a
  const member = /useAppData\(\)\.(\w+)/g;
  match = member.exec(source);
  while (match) {
    names.push(match[1] as string);
    match = member.exec(source);
  }
  // The variable spelling: const appData = useAppData(); appData.students
  const assigned = /(?:const|let|var)\s+(\w+)\s*(?::\s*[^=;\n]+)?=\s*useAppData\(\)/g;
  match = assigned.exec(source);
  while (match) {
    const holder = match[1] as string;
    for (const read of source.matchAll(new RegExp(`\\b${holder}\\.(\\w+)`, 'g'))) {
      names.push(read[1] as string);
    }
    match = assigned.exec(source);
  }
  names.push(...databaseCollectionNames(source));
  return names;
}

/** True when the file still reads the legacy context. */
function readsLegacyContext(source: string): boolean {
  return /useAppData\(\)/.test(source);
}

const files = sourceFiles();

describe('the five module trees read canonical data through the repository', () => {
  it('finds the source files of the five trees', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('reads no canonical collection through the legacy app-data context', () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.modulePath in PENDING_CANONICAL_MIGRATION) continue;
      for (const name of collectionsReadBy(file.text)) {
        if ((CANONICAL_LEGACY_COLLECTIONS as readonly string[]).includes(name)) {
          offenders.push(`${file.modulePath} reads ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('names the canonical entity behind every pending migration', () => {
    for (const [file, entities] of Object.entries(PENDING_CANONICAL_MIGRATION)) {
      expect(entities.length, `${file} must name its canonical entities`).toBeGreaterThan(0);
      expect(files.some((candidate) => candidate.modulePath === file), `${file} must exist`).toBe(true);
    }
  });

  it('marks every legacy read that stays with the entity the registry lacks', () => {
    const unmarked: string[] = [];
    for (const file of files) {
      if (!readsLegacyContext(file.text)) continue;
      const names = collectionsReadBy(file.text);
      const canonical = names.filter((name) =>
        (CANONICAL_LEGACY_COLLECTIONS as readonly string[]).includes(name)
      );
      if (canonical.length > 0) continue; // reported by the check above
      if (!/GAP\(P1-E05\)/.test(file.text)) {
        unmarked.push(file.modulePath);
      }
    }
    expect(unmarked).toEqual([]);
  });

  it('keeps every gap read on a collection the registry does not model', () => {
    const known = [
      ...(CANONICAL_LEGACY_COLLECTIONS as readonly string[]),
      ...(GAP_LEGACY_COLLECTIONS as readonly string[]),
    ];
    const offenders: string[] = [];
    for (const file of files) {
      if (!readsLegacyContext(file.text)) continue;
      if (!/GAP\(P1-E05\)/.test(file.text)) continue;
      for (const name of collectionsReadBy(file.text)) {
        if (!known.includes(name)) continue; // a flag or a mutator, not a collection
        if ((GAP_LEGACY_COLLECTIONS as readonly string[]).includes(name)) continue;
        offenders.push(`${file.modulePath} reads ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('gives every file it added two ABOUTME lines', () => {
    const added = files.filter((file) =>
      /canonicalRepository|useCanonical/.test(file.modulePath)
    );
    expect(added.length).toBeGreaterThan(0);
    for (const file of added) {
      const head = file.text.split('\n').slice(0, 2);
      expect(head[0]?.startsWith('// ABOUTME:'), `${file.modulePath} needs an ABOUTME line`).toBe(true);
      expect(head[1]?.startsWith('// ABOUTME:'), `${file.modulePath} needs a second ABOUTME line`).toBe(true);
    }
  });
});

describe('the guard sees every spelling a screen could use', () => {
  it('reads a canonical collection held in a context variable', () => {
    const fixture = [
      'const appData = useAppData();',
      'const rows = appData.students;',
      'appData.addStaff({});',
    ].join('\n');

    expect(collectionsReadBy(fixture)).toEqual(expect.arrayContaining(['students', 'addStaff']));
  });

  it('reads a useDatabaseCollection call by its literal and by the constant naming it', () => {
    expect(collectionsReadBy("const c = useDatabaseCollection<Record<string, unknown>>('academic_years');")).toContain(
      'academic_years'
    );

    const throughConstant = [
      "const YEARS = 'academic_years';",
      'const c = useDatabaseCollection<YearRow>(YEARS);',
    ].join('\n');
    expect(collectionsReadBy(throughConstant)).toContain('academic_years');
  });
});

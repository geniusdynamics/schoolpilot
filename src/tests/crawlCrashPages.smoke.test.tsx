// ABOUTME: Smoke render tests for the pages the October 2026 crawl found crashing (audit SO-27, task P0-G02).
// ABOUTME: Each page must render without throwing with empty providers and with seeded data.

import React from 'react';
import { render as rtlRender, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ts from 'typescript';
import { AppDataContext } from '@/contexts/AppDataContext';
import { TestProviders } from '@/tests/setup';

// ── Controllable data sources ──────────────────────────────────────────────
// Data hooks that read the database directly are mocked so the smoke tests
// exercise the page render paths only. Each test seeds what it needs.
const seed = vi.hoisted(() => ({
  collections: {} as Record<string, unknown[]>,
  financialSummaries: [] as unknown[],
  books: [] as unknown[],
  bookCategories: [] as unknown[],
  subjectPassRates: [] as unknown[],
  applications: [] as unknown[],
}));

vi.mock('@/hooks/useDatabaseCollection', () => ({
  useDatabaseCollection: (name: string) => ({
    data: seed.collections[name] ?? [],
    loading: false,
    error: null,
    refresh: async () => {},
    insert: async () => null,
    update: async () => null,
    remove: async () => true,
    collection: null,
  }),
}));

vi.mock('@/modules/finance/hooks/useStudentFinancialSummary', () => {
  const hook = () => ({ data: seed.financialSummaries, loading: false, error: null, refresh: async () => {} });
  return { useStudentFinancialSummary: hook, default: hook };
});

vi.mock('@/modules/library/data/useBookData', () => ({
  useBookData: () => ({
    data: seed.books,
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    search: vi.fn(async () => seed.books),
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/modules/library/data/useBookCategoryData', () => ({
  useBookCategoryData: () => ({ data: seed.bookCategories, isLoading: false, error: null }),
}));

vi.mock('@/modules/reports/data/useAnalyticsData', () => {
  const hook = () => ({
    classPerformances: [],
    subjectPassRates: seed.subjectPassRates,
    teacherAnalytics: [],
    loading: false,
    selectedPeriod: null,
    setSelectedPeriod: () => {},
    availablePeriods: [],
  });
  return { useAnalyticsData: hook, default: hook };
});

vi.mock('@/modules/admissions/data/useAdmissionsData', () => {
  const hook = () => ({
    applications: seed.applications,
    getApplication: async (id: string) =>
      (seed.applications as Array<{ id: string }>).find((a) => a.id === id) ?? null,
    addReview: vi.fn(),
    makeDecision: vi.fn(),
  });
  return { useAdmissionsData: hook, default: hook };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

// ── Empty AppDataContext ───────────────────────────────────────────────────
// Every collection reads as an empty array, every loading flag as false and
// every mutation as a no-op, mirroring a freshly provisioned school.
const MUTATION = /^(add|update|delete|remove|create|refresh|set|get|make|apply|reset|generate)[A-Z]/;
const emptyAppData = (overrides: Record<string, unknown> = {}) =>
  new Proxy(overrides, {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop in target) return target[prop];
      if (prop === 'loading') return {};
      if (MUTATION.test(prop)) return vi.fn(async () => undefined);
      return [];
    },
  });

const renderPage = (
  ui: React.ReactElement,
  { appData = {}, path = '/', route = '/' }: { appData?: Record<string, unknown>; path?: string; route?: string } = {}
) =>
  rtlRender(
    <TestProviders>
      <AppDataContext.Provider value={emptyAppData(appData) as never}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={ui} />
          </Routes>
        </MemoryRouter>
      </AppDataContext.Provider>
    </TestProviders>
  );

beforeEach(() => {
  seed.collections = {};
  seed.financialSummaries = [];
  seed.books = [];
  seed.bookCategories = [];
  seed.subjectPassRates = [];
  seed.applications = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('crawl crash pages (SO-27) render without throwing', () => {
  describe('Finance › Account Ledger', () => {
    it('renders empty', async () => {
      const { default: Page } = await import('@/modules/finance/pages/AccountLedgerPage');
      renderPage(<Page />);
      expect(document.body.textContent).not.toBe('');
    });

    it('renders seeded ledger rows with formatted dates', async () => {
      seed.collections.general_ledger = [
        { id: 'gl-1', account_id: 1, effective_date: '2026-03-15', description: 'Fees received', debit: 1000, credit: 0 },
      ];
      const { default: Page } = await import('@/modules/finance/pages/AccountLedgerPage');
      renderPage(<Page />, { appData: { chartOfAccounts: [{ id: 1, account_code: '1000', name: 'Bank' }] } });
      expect(await screen.findByText('Fees received')).toBeInTheDocument();
    });
  });

  describe('Finance › Payments › Payment Allocation', () => {
    it('renders empty', async () => {
      const { default: Page } = await import('@/modules/finance/pages/PaymentAllocationPage');
      renderPage(<Page />);
      expect(document.body.textContent).not.toBe('');
    });

    it('renders with seeded students and payments', async () => {
      const { default: Page } = await import('@/modules/finance/pages/PaymentAllocationPage');
      renderPage(<Page />, {
        appData: {
          students: [{ id: 's1', admission_no: 'ADM001', first_name: 'Amina', last_name: 'Otieno' }],
          studentPayments: [{ id: 'p1', student_id: 's1', amount: 500, payment_date: '2026-03-01' }],
        },
      });
      expect(document.body.textContent).not.toBe('');
    });
  });

  describe('Reports › Finance › Fees Due', () => {
    it('renders empty', async () => {
      const { default: Page } = await import('@/modules/finance/pages/FeesDueReportPage');
      renderPage(<Page />);
      expect(document.body.textContent).not.toBe('');
    });

    it('renders a seeded overdue student with a formatted due date', async () => {
      seed.financialSummaries = [
        {
          studentId: 's1', admissionNo: 'ADM001', name: 'Amina Otieno', className: 'Form 1', streamName: 'East',
          feeAmount: 5000, feeExemption: 0, feePenalty: 0, amountPaid: 1000, balance: 4000, overpay: 0, refund: 0,
          earliestDueDate: '2026-01-31',
        },
      ];
      const { default: Page } = await import('@/modules/finance/pages/FeesDueReportPage');
      renderPage(<Page />);
      expect(await screen.findByText('Amina Otieno')).toBeInTheDocument();
      expect(screen.getByText('31 Jan 2026')).toBeInTheDocument();
    });
  });

  describe('Finance › Transport', () => {
    it('renders empty', async () => {
      const { default: Page } = await import('@/modules/finance/pages/TransportRoutesPage');
      renderPage(<Page />);
      expect(screen.getByText('Transport Routes & Fees')).toBeInTheDocument();
    });

    it('renders a seeded route that has no cost recorded', async () => {
      const { default: Page } = await import('@/modules/finance/pages/TransportRoutesPage');
      seed.collections.transport_routes = [
        { id: 1, name: 'Route A - Westlands', cost_per_period: 12000, gl_revenue_account_name: 'Transport Fees' },
        { id: 2, name: 'Route B - Karen', gl_revenue_account_name: 'Transport Fees' },
      ];
      renderPage(<Page />);
      expect(await screen.findByText('Route B - Karen')).toBeInTheDocument();
      expect(screen.getByText('12000.00')).toBeInTheDocument();
    });
  });

  describe('Library › Resources (Books)', () => {
    it('renders empty', async () => {
      const { default: Page } = await import('@/modules/library/pages/BooksPage');
      renderPage(<Page />);
      expect(document.body.textContent).not.toBe('');
    });

    it('renders seeded books', async () => {
      seed.books = [
        { id: 'b1', title: 'River and the Source', accession_no: 'ACC-001', status: 'Available', availability_status: 'Available' },
      ];
      const { default: Page } = await import('@/modules/library/pages/BooksPage');
      renderPage(<Page />);
      expect(await screen.findByText('River and the Source')).toBeInTheDocument();
    });
  });

  describe('Library › Fines', () => {
    it('renders empty', async () => {
      const { default: Page } = await import('@/modules/library/pages/FinesPage');
      renderPage(<Page />);
      expect(screen.getByText('Library Fines Management')).toBeInTheDocument();
    });

    it('renders a seeded fine without an amount', async () => {
      const { default: Page } = await import('@/modules/library/pages/FinesPage');
      seed.collections.fines = [
        { id: 'f1', book_title: 'Blossoms of the Savannah', user_name: 'Amina', amount: 50, status: 'Pending' },
        { id: 'f2', book_title: 'Kifo Kisimani', user_name: 'Baraka', status: 'Pending' },
      ];
      renderPage(<Page />);
      expect(await screen.findByText('Kifo Kisimani')).toBeInTheDocument();
      expect(screen.getByText('50.00')).toBeInTheDocument();
    });
  });

  describe('Nutrition › Kitchen', () => {
    it('renders empty', async () => {
      const { default: Page } = await import('@/modules/nutrition/pages/KitchenManagementPage');
      renderPage(<Page />);
      expect(document.body.textContent).not.toBe('');
    });

    it('renders seeded inventory from the data context', async () => {
      const { default: Page } = await import('@/modules/nutrition/pages/KitchenManagementPage');
      renderPage(<Page />, {
        appData: {
          foodInventory: [
            { id: 'fi1', name: 'Maize flour', category: 'Grains', unit: 'kg', quantity: 40, min_stock_level: 10,
              cost_per_unit: 80, total_cost: 3200, supplier: 'Unga Ltd', last_restocked: '2026-03-01',
              status: 'In Stock', dietary_suitable: ['None'] },
            { id: 'fi2', name: 'Beans', category: 'Proteins', unit: 'kg', quantity: 5, status: 'Low Stock' },
          ],
        },
      });
      expect(await screen.findByText('Maize flour')).toBeInTheDocument();
      expect(screen.getByText('Beans')).toBeInTheDocument();
    });
  });

  describe('Reports › Analytics › Subject Analysis', () => {
    it('renders empty', async () => {
      const { default: Page } = await import('@/modules/reports/pages/analytics/AnalyticsSubjectPage');
      renderPage(<Page />);
      expect(document.body.textContent).not.toBe('');
    });

    it('renders seeded subject pass rates that lack the optional breakdowns', async () => {
      seed.subjectPassRates = [
        { subjectId: 'sub-1', subjectName: 'Mathematics', averageScore: 62.4, passRate: 71, totalStudents: 180, submittedCount: 175 },
      ];
      const { default: Page } = await import('@/modules/reports/pages/analytics/AnalyticsSubjectPage');
      renderPage(<Page />);
      expect(await screen.findByText('Mathematics')).toBeInTheDocument();
    });
  });

  describe('Settings › Audit Log', () => {
    it('renders empty', async () => {
      const { default: Page } = await import('@/modules/settings/pages/AuditLogPage');
      renderPage(<Page />);
      expect(screen.getAllByText('Reset Filters').length).toBeGreaterThan(0);
    });

    it('renders seeded audit logs', async () => {
      const { default: Page } = await import('@/modules/settings/pages/AuditLogPage');
      renderPage(<Page />, {
        appData: {
          auditLogs: [
            { id: 'a1', changed_at: '2026-03-01T10:00:00Z', user_name: 'Admin', action: 'CREATE', table_name: 'students', record_pk: 's1' },
          ],
        },
      });
      expect(await screen.findByText('students')).toBeInTheDocument();
    });
  });

  describe('Admissions › Review Queue', () => {
    it('renders empty', async () => {
      const { default: Page } = await import('@/modules/admissions/pages/ApplicationReviewPage');
      renderPage(<Page />);
      expect(await screen.findByText('All caught up!')).toBeInTheDocument();
    });

    it('renders seeded applications that are missing applicant names', async () => {
      seed.applications = [
        { id: 'app-1', applicationNumber: 'APP-001', status: 'Submitted', firstName: 'Amina', lastName: 'Otieno' },
        { id: 'app-2', applicationNumber: 'APP-002', status: 'Submitted' },
      ];
      const { default: Page } = await import('@/modules/admissions/pages/ApplicationReviewPage');
      renderPage(<Page />);
      expect(await screen.findByText(/APP-002/)).toBeInTheDocument();
    });

    it('renders the detail view for an application missing applicant names', async () => {
      seed.applications = [{ id: 'app-2', applicationNumber: 'APP-002', status: 'Submitted' }];
      const { default: Page } = await import('@/modules/admissions/pages/ApplicationReviewPage');
      renderPage(<Page />, { path: '/admissions/review/app-2', route: '/admissions/review/:applicationId' });
      expect(await screen.findAllByText(/APP-002/)).not.toHaveLength(0);
    });
  });

  // The dev server's Babel transform rejects duplicate bindings (e.g. an imported
  // and a local `formatDate`) that Vitest's esbuild transform tolerates, and an
  // undeclared identifier only throws once its render path runs. Check the
  // bindings statically so both classes of crash are caught for every page.
  it('declares every identifier it uses exactly once', () => {
    const pages = [
      'src/modules/finance/pages/AccountLedgerPage.tsx',
      'src/modules/finance/pages/PaymentAllocationPage.tsx',
      'src/modules/finance/pages/FeesDueReportPage.tsx',
      'src/modules/finance/pages/TransportRoutesPage.tsx',
      'src/modules/library/pages/BooksPage.tsx',
      'src/modules/library/pages/BookCategoriesPage.tsx',
      'src/modules/library/pages/FinesPage.tsx',
      'src/modules/nutrition/pages/KitchenManagementPage.tsx',
      'src/modules/reports/pages/analytics/AnalyticsSubjectPage.tsx',
      'src/modules/settings/pages/AuditLogPage.tsx',
      'src/modules/admissions/pages/ApplicationReviewPage.tsx',
      'src/modules/academics/pages/ExamAnalysisContent.tsx',
    ];
    const program = ts.createProgram(pages, {
      noResolve: true,
      noEmit: true,
      skipLibCheck: true,
      types: [],
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    });
    // 2300/2440/2451: duplicate declarations; 2304/2552: cannot find name.
    const bindingCodes = new Set([2300, 2304, 2440, 2451, 2552]);
    const problems = pages.flatMap((page) =>
      program
        .getSemanticDiagnostics(program.getSourceFile(page))
        .filter((d) => bindingCodes.has(d.code))
        .map((d) => `${page}: TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`)
    );
    // With imports unresolved the checker skips import/local conflicts, so
    // collect module-scope value bindings by hand and report duplicates.
    for (const page of pages) {
      const seen = new Set<string>();
      const note = (name: string | undefined) => {
        if (!name) return;
        if (seen.has(name)) problems.push(`${page}: duplicate module binding '${name}'`);
        seen.add(name);
      };
      for (const stmt of program.getSourceFile(page)!.statements) {
        if (ts.isImportDeclaration(stmt) && stmt.importClause && !stmt.importClause.isTypeOnly) {
          note(stmt.importClause.name?.text);
          const bindings = stmt.importClause.namedBindings;
          if (bindings && ts.isNamespaceImport(bindings)) note(bindings.name.text);
          if (bindings && ts.isNamedImports(bindings)) {
            bindings.elements.filter((e) => !e.isTypeOnly).forEach((e) => note(e.name.text));
          }
        } else if (ts.isVariableStatement(stmt)) {
          stmt.declarationList.declarations.forEach((d) => ts.isIdentifier(d.name) && note(d.name.text));
        } else if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) {
          note(stmt.name?.text);
        }
      }
    }
    expect(problems).toEqual([]);
  }, 60000);

  describe('Academics › Exam Analysis', () => {
    it('renders empty and links Create Exam to a registered route', async () => {
      const { ExamAnalysisContent } = await import('@/modules/academics/pages/ExamAnalysisContent');
      renderPage(<ExamAnalysisContent />);
      const createExam = screen.getByText('Create Exam').closest('a');
      expect(createExam).not.toBeNull();
      expect(createExam!.getAttribute('href')).toBe('/academics/exam-setup?tab=exam-sessions');
      const myClasses = screen.getByText('My Classes').closest('a');
      expect(myClasses!.getAttribute('href')).toBe('/administration/classes');
    });
  });
});

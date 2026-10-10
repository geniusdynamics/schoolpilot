// ABOUTME: Contract test for the module data providers (administration, finance, academics) against an in-memory database.
// ABOUTME: Pins CRUD arity, persistence, nested collections (incl. computed hooks) and that contract-scan missing functions exist on a module or sync hook.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { databaseService } from '@/services/database/databaseService';
import { useAdministrationData } from '@/modules/administration/data/useAdministrationData';
import { useAdministration } from '@/modules/administration/hooks/useAdministration';
import { useFinanceData } from '@/modules/finance/data/useFinanceData';
import { useFinance } from '@/modules/finance/hooks/useFinance';
import { useAcademicData } from '@/modules/academics/data/useAcademicData';
import { useInventoryData } from '@/modules/inventory/data/useInventoryData';
import { useLibraryData } from '@/modules/library/data/useLibraryData';
import { useNutritionData } from '@/modules/nutrition/data/useNutritionData';
import { useExamResultsHorizontal } from '@/modules/academics/hooks/useExamResultsHorizontal';
import { useInvoiceGeneration } from '@/modules/finance/hooks/useFinanceServices';
import { SyncProvider, useSync } from '@/contexts/SyncContext';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(() => `gen-${Math.random().toString(36).slice(2, 10)}`),
  },
}));

const toast = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn(), showProgress: vi.fn() };
vi.mock('@/hooks/useToast', () => ({ useToastHelpers: () => toast }));
vi.mock('@/contexts/NetworkContext', () => ({ useNetwork: () => ({ isOnline: true }) }));

// ── In-memory database ────────────────────────────────────────────────────────
type Doc = Record<string, any>;
const store = new Map<string, Map<string, Doc>>();
const requestedCollections = new Set<string>();

function table(name: string): Map<string, Doc> {
  if (!store.has(name)) store.set(name, new Map());
  return store.get(name)!;
}

function fakeCollection(name: string) {
  const rows = () => table(name);
  return {
    name,
    find: vi.fn(async () => [...rows().values()].map((d) => ({ ...d }))),
    findById: vi.fn(async (id: string) => (rows().has(id) ? { ...rows().get(id)! } : null)),
    insert: vi.fn(async (doc: Doc) => {
      rows().set(doc.id, { ...doc });
      return { id: doc.id, doc: { ...doc }, ok: true };
    }),
    update: vi.fn(async (id: string, patch: Doc) => {
      const current = rows().get(id);
      if (!current) throw new Error(`${name}/${id} not found`);
      const next = { ...current, ...patch, id };
      rows().set(id, next);
      return { id, doc: { ...next }, ok: true };
    }),
    remove: vi.fn(async (id: string) => {
      rows().delete(id);
      return { id, ok: true };
    }),
  };
}

const collections = new Map<string, ReturnType<typeof fakeCollection>>();
function getCollection(name: string) {
  requestedCollections.add(name);
  if (!collections.has(name)) collections.set(name, fakeCollection(name));
  return collections.get(name)!;
}

const fakeDb = new Proxy({} as Record<string, unknown>, {
  get(_target, prop) {
    if (prop === 'getCollection') return getCollection;
    if (typeof prop !== 'string' || prop === 'then') return undefined;
    return getCollection(prop);
  },
});

function seed(name: string, docs: Doc[]) {
  for (const doc of docs) table(name).set(doc.id, { ...doc });
}

// Finds a persisted record by id, including records nested inside a parent's array field.
function findPersisted(id: string): Doc | undefined {
  for (const rows of store.values()) {
    if (rows.has(id)) return rows.get(id);
    for (const doc of rows.values()) {
      for (const value of Object.values(doc)) {
        if (Array.isArray(value)) {
          const nested = value.find((entry) => entry && typeof entry === 'object' && entry.id === id);
          if (nested) return nested;
        }
      }
    }
  }
  for (let i = 0; i < localStorage.length; i++) {
    const raw = localStorage.getItem(localStorage.key(i)!);
    try {
      const parsed = JSON.parse(raw ?? 'null');
      if (Array.isArray(parsed)) {
        const hit = parsed.find((entry) => entry && entry.id === id);
        if (hit) return hit;
      }
    } catch {
      // not JSON
    }
  }
  return undefined;
}

const idOf = (created: any): string | undefined => created?.id ?? created?.doc?.id;

// ── Providers under contract ─────────────────────────────────────────────────
const PROVIDERS = {
  useAdministrationData,
  useAdministration,
  useFinanceData,
  useFinance,
  useAcademicData,
} as const;

// Parent records needed by entities stored nested inside another collection.
const CREATE_PAYLOAD: Record<string, Doc> = {
  ExamPaperSetting: { exam_session_id: 'ES1', subject_paper_id: 'SP1', marks_out_of: 100 },
  FeeTemplateItem: { fee_template_id: 'FT1', description: 'Tuition', amount: 1000 },
};

function entitiesOf(api: Record<string, unknown>): string[] {
  return Object.keys(api)
    .filter((key) => /^add[A-Z]/.test(key))
    .map((key) => key.slice(3))
    .filter((entity) => typeof api[`update${entity}`] === 'function' && typeof api[`delete${entity}`] === 'function');
}

async function renderProvider<T>(hook: () => T, wrapper?: React.ComponentType<{ children: React.ReactNode }>) {
  const rendered = renderHook(hook, { wrapper });
  await waitFor(() => expect(databaseService.getDatabase).toHaveBeenCalled());
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return rendered;
}

beforeEach(() => {
  store.clear();
  collections.clear();
  requestedCollections.clear();
  localStorage.clear();
  vi.clearAllMocks();
  (databaseService.getDatabase as any).mockResolvedValue(fakeDb);
  seed('exam_sessions', [{ id: 'ES1', name: 'End Term 1', school_period_id: 'T1', status: 'Planned', paper_settings: [] }]);
  seed('fee_templates', [{ id: 'FT1', name: 'Form 1 Boarders', school_period_id: 'T1', items: [] }]);
});

describe.each(Object.entries(PROVIDERS))('%s contract', (_name, hook) => {
  it('exposes update(id, patch), remove(id) and create(data) signatures', async () => {
    const { result } = await renderProvider(hook as () => Record<string, unknown>);
    const api = result.current;
    const wrongArity: string[] = [];
    for (const [key, value] of Object.entries(api)) {
      if (typeof value !== 'function') continue;
      if (/^update[A-Z]/.test(key) && value.length !== 2) wrongArity.push(`${key}/${value.length}`);
      if (/^(delete|remove)[A-Z]/.test(key) && value.length !== 1) wrongArity.push(`${key}/${value.length}`);
      if (/^(add|create)[A-Z]/.test(key) && value.length < 1) wrongArity.push(`${key}/${value.length}`);
    }
    expect(wrongArity).toEqual([]);
  });

  it('persists create → update → remove for every entity', async () => {
    const { result } = await renderProvider(hook as () => Record<string, any>);
    const entities = entitiesOf(result.current);
    expect(entities.length).toBeGreaterThan(3);

    const failures: string[] = [];
    for (const entity of entities) {
      try {
        let created: any;
        await act(async () => {
          created = await result.current[`add${entity}`]({ name: `contract ${entity}`, ...CREATE_PAYLOAD[entity] });
        });
        const id = idOf(created);
        if (!id || !findPersisted(id)) { failures.push(`${entity}: create did not persist`); continue; }

        await act(async () => {
          await result.current[`update${entity}`](id, { notes: 'patched' });
        });
        if (findPersisted(id)?.notes !== 'patched') { failures.push(`${entity}: update(id, patch) did not persist`); continue; }

        await act(async () => {
          await result.current[`delete${entity}`](id);
        });
        if (findPersisted(id)) failures.push(`${entity}: remove(id) did not persist`);
      } catch (error) {
        failures.push(`${entity}: ${(error as Error).message}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('renamed collection literals', () => {
  it('never opens timetable_period_defs, exam_paper_settings or fee_template_items', async () => {
    await renderProvider(() => [
      useAdministrationData(), useFinanceData(), useAcademicData(), useExamResultsHorizontal(), useInvoiceGeneration(),
    ]);
    expect(requestedCollections.has('timetable_period_definitions')).toBe(true);
    for (const name of ['timetable_period_defs', 'exam_paper_settings', 'fee_template_items']) {
      expect(requestedCollections.has(name), name).toBe(false);
    }
  });

  it('keeps the provider sources free of the old literals', () => {
    for (const file of [
      'src/modules/academics/data/useAcademicData.ts',
      'src/modules/finance/data/useFinanceData.ts',
      'src/modules/academics/hooks/useExamResultsHorizontal.ts',
      'src/modules/finance/hooks/useFinanceServices.ts',
    ]) {
      const text = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      expect(text).not.toMatch(/['"](timetable_period_defs|exam_paper_settings|fee_template_items)['"]/);
    }
  });
});

describe('nested records', () => {
  it('stores exam paper settings inside their exam session', async () => {
    const { result } = await renderProvider(useAcademicData);
    let created: any;
    await act(async () => {
      created = await result.current.addExamPaperSetting({ exam_session_id: 'ES1', subject_paper_id: 'SP1', marks_out_of: 80 } as any);
    });
    expect(table('exam_sessions').get('ES1')!.paper_settings).toEqual([
      expect.objectContaining({ id: created.id, exam_session_id: 'ES1', marks_out_of: 80 }),
    ]);
    await waitFor(() => expect(result.current.examPaperSettings).toHaveLength(1));
    let forSession: any[] = [];
    await act(async () => {
      forSession = await result.current.getExamPaperSettingsForSession('ES1');
    });
    expect(forSession).toHaveLength(1);
  });

  it('stores fee template items inside their template', async () => {
    const { result } = await renderProvider(useFinanceData);
    let created: any;
    await act(async () => {
      created = await result.current.addFeeTemplateItem({ fee_template_id: 'FT1', description: 'Lunch', amount: 500 } as any);
    });
    expect(table('fee_templates').get('FT1')!.items).toEqual([
      expect.objectContaining({ id: created.id, fee_template_id: 'FT1', amount: 500 }),
    ]);
    await waitFor(() => expect(result.current.feeTemplateItems).toHaveLength(1));
  });
});

describe('nested records read by computed hooks', () => {
  it('weights exam results with paper settings stored in exam_sessions.paper_settings', async () => {
    seed('exam_sessions', [{
      id: 'ES2', name: 'Mid Term', paper_settings: [{ id: 'PS1', subject_paper_id: 'SP1', marks_out_of: 50, weight_percentage: 100 }],
    }]);
    seed('subject_papers', [{ id: 'SP1', subject_id: 'SUB1' }]);
    seed('subjects', [{ id: 'SUB1', name: 'Mathematics', abbreviation: 'MAT' }]);
    seed('students', [{ id: 'S1', admission_no: 'A1', first_name: 'Amina', last_name: 'Otieno' }]);
    seed('student_exam_results', [{ id: 'R1', student_id: 'S1', exam_session_id: 'ES2' }]);
    seed('student_paper_marks', [{ id: 'M1', student_exam_result_id: 'R1', paper_setting_id: 'PS1', score: 40 }]);

    const { result } = await renderProvider(useExamResultsHorizontal);
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data[0]).toMatchObject({ examName: 'Mid Term', studentName: 'Amina Otieno', subjectScores: { MAT: 80 } });
  });

  it('bills termly invoices from fee_templates.items', async () => {
    seed('fee_templates', [{
      id: 'FT9', name: 'Boarders', school_period_id: 3, student_category_id: 'BOARD',
      items: [{ id: 'FTI1', description: 'Tuition', amount: 10000 }, { id: 'FTI2', description: 'Boarding', amount: 5000 }],
    }]);
    seed('students', [{ id: 'S1', first_name: 'Amina', last_name: 'Otieno', status: 'Active', student_category_id: 'BOARD' }]);

    const { result } = await renderProvider(useInvoiceGeneration);
    let run: any;
    await act(async () => {
      run = await result.current.generateTermlyInvoices(3);
    });
    expect(run).toMatchObject({ generatedCount: 1, errors: [] });
    expect([...table('student_invoices').values()][0]).toMatchObject({ student_id: 'S1', total_amount_billed: 15000 });
  });
});

describe('administration additions', () => {
  it('upserts the school profile through updateSchoolDetails(id, patch)', async () => {
    const { result } = await renderProvider(useAdministration);
    await act(async () => {
      await result.current.updateSchoolDetails('school', { name: 'Kilimani High' });
    });
    expect(table('school_details').get('school')).toMatchObject({ name: 'Kilimani High' });
    await act(async () => {
      await result.current.updateSchoolDetails('school', { motto: 'Strive' });
    });
    expect(table('school_details').get('school')).toMatchObject({ name: 'Kilimani High', motto: 'Strive' });
    await waitFor(() => expect(result.current.schoolDetails).toMatchObject({ id: 'school', motto: 'Strive' }));
  });

  it('records and reads class history per learner', async () => {
    const { result } = await renderProvider(useAdministration);
    await act(async () => {
      await result.current.addStudentClassHistory({ student_id: 'S1', class_stream_id: 'F1E', academic_year_id: 'Y1', start_date: '2026-01-05' });
      await result.current.addStudentClassHistory({ student_id: 'S1', class_stream_id: 'F2E', academic_year_id: 'Y2', start_date: '2027-01-04' });
      await result.current.addStudentClassHistory({ student_id: 'S2', class_stream_id: 'F1W', academic_year_id: 'Y1', start_date: '2026-01-05' });
    });
    expect(table('student_class_history').size).toBe(3);
    await waitFor(() => expect(result.current.studentClassHistory).toHaveLength(3));
    expect(result.current.getStudentClassHistory('S1').map((h: Doc) => h.class_stream_id)).toEqual(['F1E', 'F2E']);
  });

  it('lists transferred learners for transfer certificates', async () => {
    seed('students', [
      { id: 'S1', admission_no: 'A1', first_name: 'Amina', last_name: 'Otieno', status: 'Transferred', current_class_name: 'Form 2' },
      { id: 'S2', admission_no: 'A2', first_name: 'Brian', last_name: 'Kip', status: 'Active' },
    ]);
    const { result } = await renderProvider(useAdministration);
    await waitFor(() => expect(result.current.transferCertificateStudents).toHaveLength(1));
    expect(result.current.transferCertificateStudents[0]).toMatchObject({ id: 'S1', student_id: 'A1', name: 'Amina Otieno', class_name: 'Form 2' });
  });
});

describe('finance additions', () => {
  beforeEach(() => {
    seed('fee_templates', [{
      id: 'FT2', name: 'Form 1 Boarders', school_period_id: 'T1',
      items: [
        { id: 'FTI1', fee_template_id: 'FT2', description: 'Tuition', amount: 10000 },
        { id: 'FTI2', fee_template_id: 'FT2', description: 'Boarding', amount: 5000 },
      ],
    }]);
    seed('students', [
      { id: 'S1', admission_no: 'A1', first_name: 'Amina', last_name: 'Otieno', status: 'Active', student_category_id: 'BOARD', current_class_stream_id: 'F1E' },
      { id: 'S2', admission_no: 'A2', first_name: 'Brian', last_name: 'Kip', status: 'Active', student_category_id: 'BOARD', current_class_stream_id: 'F1W' },
      { id: 'S3', admission_no: 'A3', first_name: 'Chebet', last_name: 'Ruto', status: 'Active', student_category_id: 'DAY', current_class_stream_id: 'F1E' },
    ]);
  });

  it('generateTermInvoices previews on dry run, bills each learner once, and is idempotent', async () => {
    const { result } = await renderProvider(useFinance);

    let preview: any;
    await act(async () => {
      preview = await result.current.generateTermInvoices({ feeTemplateId: 'FT2', schoolPeriodId: 'T1', studentIds: ['S1', 'S2'], dryRun: true });
    });
    expect(preview.invoices).toHaveLength(2);
    expect(preview.invoices[0]).toMatchObject({ student_id: 'S1', total_amount_billed: 15000 });
    expect(table('student_invoices').size).toBe(0);

    let run: any;
    await act(async () => {
      run = await result.current.generateTermInvoices({ feeTemplateId: 'FT2', schoolPeriodId: 'T1', studentIds: ['S1', 'S2'] });
    });
    expect(run.invoices).toHaveLength(2);
    expect(table('student_invoices').size).toBe(2);
    const stored = [...table('student_invoices').values()].find((inv) => inv.student_id === 'S1')!;
    expect(stored.items.map((item: Doc) => item.fee_template_item_id)).toEqual(['FTI1', 'FTI2']);

    let rerun: any;
    await act(async () => {
      rerun = await result.current.generateTermInvoices({ feeTemplateId: 'FT2', schoolPeriodId: 'T1', studentIds: ['S1', 'S2'] });
    });
    expect(rerun.invoices).toHaveLength(0);
    expect(rerun.skippedStudentIds).toEqual(['S1', 'S2']);
    expect(table('student_invoices').size).toBe(2);
  });

  it('generateStudentInvoices targets learners by category or stream', async () => {
    const { result } = await renderProvider(useFinanceData);
    let invoices: any[] = [];
    await act(async () => {
      invoices = await result.current.generateStudentInvoices('FT2', 'T1', { categoryId: 'BOARD' });
    });
    expect(invoices.map((inv) => inv.student_id).sort()).toEqual(['S1', 'S2']);
    expect(table('customer_invoices').size).toBe(0);
  });

  it('getStudentFinancialDetailsById summarises invoices and payments', async () => {
    seed('student_invoices', [{ id: 'I1', student_id: 'S1', invoice_number: 'INV1', school_period_id: 'T1', issue_date: '2026-01-05', due_date: '2026-02-01', total_amount_billed: 15000, amount_paid: 0, status: 'Due', items: [{ id: 'II1', description: 'Tuition', amount: 15000 }] }]);
    seed('student_payments', [{ id: 'P1', student_id: 'S1', receipt_no: 'R1', total_amount_paid: 4000, payment_method: 'Cash', transaction_date: '2026-01-10' }]);
    const { result } = await renderProvider(useFinance);
    let details: any;
    await act(async () => {
      details = await result.current.getStudentFinancialDetailsById('S1');
    });
    expect(details).toMatchObject({ id: 'S1', first_name: 'Amina' });
    expect(details.financial_summary).toMatchObject({ totalFees: 15000, totalPaid: 4000, currentBalance: 11000 });
    expect(details.invoices_charges).toHaveLength(1);
    expect(details.payment_history[0]).toMatchObject({ transactionId: 'R1', amount: 4000 });
  });
});

describe('sync hook', () => {
  it('reports queue status and records each completed sync in the history', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { result } = renderHook(useSync, { wrapper: SyncProvider });
      expect(result.current.getQueueStatus()).toMatchObject({ api: { pending: 0 }, sync: { pending: 0, errors: 0 } });
      expect(result.current.getSyncHistory()).toEqual([]);

      await act(async () => {
        await result.current.forceSync();
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.getSyncHistory()).toEqual([
        expect.objectContaining({ status: 'success', startedAt: expect.any(Date), completedAt: expect.any(Date) }),
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('contract-scan missing functions', () => {
  it('exist on a module or sync hook', async () => {
    const report = JSON.parse(execFileSync('node', ['scripts/audit/contract-scan.cjs', '--json'], { cwd: process.cwd(), encoding: 'utf8' }));
    const wanted = new Set<string>(report.missingAppDataFunctions.flatMap((entry: { missing: string[] }) => entry.missing));

    const { result } = await renderProvider(() => ({
      ...useSync(),
      ...useInventoryData(), ...useLibraryData(), ...useNutritionData(),
      ...useFinance(), ...useFinanceData(), ...useAcademicData(), ...useAdministrationData(), ...useAdministration(),
    }), SyncProvider);
    const missing = [...wanted].filter((name) => !(name in result.current));
    expect(missing).toEqual([]);
  });
});

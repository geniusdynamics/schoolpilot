// ABOUTME: Repository-backed tests for the Fee Templates page: template and fee-item edits persist to a real SQLite collection.
// ABOUTME: The app-data harness follows AppDataContext's updateFeeTemplate(id, patch) contract over an in-memory sqlite-wasm database.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';

import { FeeTemplatesContent } from '../FeeTemplatesPage';
import { AppDataContext } from '@/contexts/AppDataContext';
import type { EnhancedAppDataContextType } from '@/contexts/AppDataContext';
import { SQLiteWASMCollection } from '@/services/database/SQLiteWASMProvider';
import { ToastProvider } from '@/hooks/useToast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { AccountType } from '@/core/types';
import * as financeSchemas from '@/modules/finance/data/schema';

type FeeTemplateRow = {
  id: string;
  name: string;
  school_period_id: string;
  student_category_id?: string | null;
  school_period_name?: string | null;
  items?: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schoolPeriods = [
  { id: 'a3f1c2d4-0000-4000-8000-000000000001', name: 'Term 1 2027' },
  { id: 'a3f1c2d4-0000-4000-8000-000000000002', name: 'Term 2 2027' },
];
const chartOfAccounts = [
  { id: 'b7e2d3c4-0000-4000-8000-000000000010', account_code: '4000', name: 'Tuition Revenue', type: AccountType.REVENUE, is_active: true },
  { id: 'b7e2d3c4-0000-4000-8000-000000000011', account_code: '4100', name: 'Boarding Revenue', type: AccountType.REVENUE, is_active: true },
];

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
let db: Database;
let collection: SQLiteWASMCollection<FeeTemplateRow>;

const now = () => new Date().toISOString();

/**
 * Supplies the slice of app data the page reads, with fee-template writes going
 * through a real SQLite collection using the provider's (id, patch) signature.
 */
const RepositoryBackedAppData: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [feeTemplates, setFeeTemplates] = useState<FeeTemplateRow[]>([]);
  const reload = useCallback(async () => setFeeTemplates(await collection.find()), []);
  useEffect(() => { void reload(); }, [reload]);

  const value = useMemo(() => ({
    feeTemplates,
    schoolPeriods,
    studentCategories: [],
    chartOfAccounts,
    expenseCategories: [],
    loading: {},
    addFeeTemplate: async (data: Record<string, unknown>) => {
      const result = await collection.insert({ ...data, created_at: now(), updated_at: now() } as Omit<FeeTemplateRow, 'id'>);
      await reload();
      return result;
    },
    updateFeeTemplate: async (templateId: string, templateData: Partial<FeeTemplateRow>) => {
      const result = await collection.update(templateId, { ...templateData, updated_at: now() });
      await reload();
      return result;
    },
    deleteFeeTemplate: async (templateId: string) => {
      await collection.remove(templateId);
      await reload();
    },
  }), [feeTemplates, reload]);

  return (
    <AppDataContext.Provider value={value as unknown as EnhancedAppDataContextType}>
      {children}
    </AppDataContext.Provider>
  );
};

const renderPage = () =>
  render(
    <ToastProvider>
      <ConfirmProvider>
        <RepositoryBackedAppData>
          <FeeTemplatesContent />
        </RepositoryBackedAppData>
      </ConfirmProvider>
    </ToastProvider>
  );

const seedTemplate = async (overrides: Partial<FeeTemplateRow> = {}) => {
  const template: FeeTemplateRow = {
    id: 'c9d8e7f6-0000-4000-8000-000000000100',
    name: 'Form 1 Boarders',
    school_period_id: schoolPeriods[0].id,
    school_period_name: schoolPeriods[0].name,
    items: [],
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
  await collection.insert(template);
  return template;
};

const storedTemplate = async (id: string) => (await collection.findById(id)) as FeeTemplateRow;

const openItemsDialog = async (templateName: string) => {
  const row = (await screen.findByText(templateName)).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /Items/ }));
  return screen.findByText(`Manage Items for: ${templateName}`).then(() => screen.getAllByRole('dialog').at(-1) as HTMLElement);
};

const field = (container: HTMLElement, name: string) =>
  container.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement;

beforeAll(async () => {
  sqlite3 = await sqlite3InitModule({ print: () => {}, printErr: () => {} });
});

beforeEach(() => {
  db = new sqlite3.oo1.DB(':memory:');
  collection = new SQLiteWASMCollection<FeeTemplateRow>(db, 'fee_templates', financeSchemas.feeTemplatesSchema as never);
});

afterEach(() => {
  db.close();
});

describe('FeeTemplatesPage (repository-backed)', () => {
  it('adds a fee item above one million and persists it with a stable uuid', async () => {
    const template = await seedTemplate();
    renderPage();

    const dialog = await openItemsDialog(template.name);
    fireEvent.change(field(dialog, 'description'), { target: { name: 'description', value: 'Tuition' } });
    fireEvent.change(field(dialog, 'amount'), { target: { name: 'amount', value: '1500000' } });
    fireEvent.change(field(dialog, 'revenue_account_id'), { target: { name: 'revenue_account_id', value: chartOfAccounts[0].id } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Item' }));

    await waitFor(async () => {
      expect((await storedTemplate(template.id)).items).toHaveLength(1);
    });
    const [item] = (await storedTemplate(template.id)).items!;
    expect(item).toMatchObject({
      description: 'Tuition',
      amount: 1500000,
      revenue_account_id: chartOfAccounts[0].id,
      revenue_account_name: 'Tuition Revenue',
      fee_template_id: template.id,
    });
    expect(String(item.id)).toMatch(UUID_PATTERN);
    expect(await within(dialog).findByText('Tuition')).toBeInTheDocument();
  });

  it('edits an existing fee item in place, keeping its id', async () => {
    const template = await seedTemplate({
      items: [
        { id: 'item-tuition', fee_template_id: 'c9d8e7f6-0000-4000-8000-000000000100', description: 'Tuition', amount: 12000, revenue_account_id: chartOfAccounts[0].id, revenue_account_name: 'Tuition Revenue' },
        { id: 'item-boarding', fee_template_id: 'c9d8e7f6-0000-4000-8000-000000000100', description: 'Boarding', amount: 18000, revenue_account_id: chartOfAccounts[1].id, revenue_account_name: 'Boarding Revenue' },
      ],
    });
    renderPage();

    const dialog = await openItemsDialog(template.name);
    const tuitionRow = within(dialog).getByText('Tuition').closest('tr') as HTMLElement;
    fireEvent.click(within(tuitionRow).getByRole('button', { name: /Edit/ }));
    fireEvent.change(field(dialog, 'amount'), { target: { name: 'amount', value: '2750000.50' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update Item' }));

    await waitFor(async () => {
      const items = (await storedTemplate(template.id)).items!;
      expect(items.find((i) => i.id === 'item-tuition')?.amount).toBe(2750000.5);
    });
    const items = (await storedTemplate(template.id)).items!;
    expect(items.map((i) => i.id)).toEqual(['item-tuition', 'item-boarding']);
    expect(items.find((i) => i.id === 'item-boarding')?.amount).toBe(18000);
  });

  it('removes a fee item and persists the removal', async () => {
    const template = await seedTemplate({
      items: [
        { id: 'item-tuition', fee_template_id: 'c9d8e7f6-0000-4000-8000-000000000100', description: 'Tuition', amount: 12000, revenue_account_id: chartOfAccounts[0].id },
        { id: 'item-exam', fee_template_id: 'c9d8e7f6-0000-4000-8000-000000000100', description: 'Exam Fee', amount: 1500, revenue_account_id: chartOfAccounts[0].id },
      ],
    });
    renderPage();

    const dialog = await openItemsDialog(template.name);
    const examRow = within(dialog).getByText('Exam Fee').closest('tr') as HTMLElement;
    fireEvent.click(within(examRow).getByRole('button', { name: /Del/ }));
    const confirmDialog = await screen.findByText('Are you sure you want to delete this fee template item?')
      .then((el) => el.closest('[role="dialog"]') as HTMLElement);
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Delete' }));

    await waitFor(async () => {
      expect((await storedTemplate(template.id)).items!.map((i) => i.id)).toEqual(['item-tuition']);
    });
  });

  it('gives legacy items without ids a stable id so they can be edited individually', async () => {
    const template = await seedTemplate({
      items: [
        { fee_template_id: 'c9d8e7f6-0000-4000-8000-000000000100', description: 'Tuition', amount: 12000, revenue_account_id: chartOfAccounts[0].id },
        { fee_template_id: 'c9d8e7f6-0000-4000-8000-000000000100', description: 'Boarding', amount: 18000, revenue_account_id: chartOfAccounts[1].id },
      ],
    });
    renderPage();

    const dialog = await openItemsDialog(template.name);
    const boardingRow = within(dialog).getByText('Boarding').closest('tr') as HTMLElement;
    fireEvent.click(within(boardingRow).getByRole('button', { name: /Edit/ }));
    fireEvent.change(field(dialog, 'amount'), { target: { name: 'amount', value: '19000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update Item' }));

    await waitFor(async () => {
      const items = (await storedTemplate(template.id)).items!;
      expect(items.map((i) => i.amount)).toEqual([12000, 19000]);
    });
    const items = (await storedTemplate(template.id)).items!;
    items.forEach((i) => expect(String(i.id)).toMatch(UUID_PATTERN));
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
  });

  it('persists a template edit (name and period) without losing its items', async () => {
    const template = await seedTemplate({
      items: [{ id: 'item-tuition', fee_template_id: 'c9d8e7f6-0000-4000-8000-000000000100', description: 'Tuition', amount: 12000, revenue_account_id: chartOfAccounts[0].id }],
    });
    renderPage();

    const row = (await screen.findByText(template.name)).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /Edit/ }));
    const dialog = await screen.findByText('Edit Fee Template').then((el) => el.closest('[role="dialog"]') as HTMLElement);
    fireEvent.change(within(dialog).getByLabelText(/Template Name/), { target: { value: 'Form 1 Boarders (Revised)' } });
    fireEvent.change(field(dialog, 'school_period_id'), { target: { name: 'school_period_id', value: schoolPeriods[1].id } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

    await waitFor(async () => {
      expect((await storedTemplate(template.id)).name).toBe('Form 1 Boarders (Revised)');
    });
    const stored = await storedTemplate(template.id);
    expect(stored.school_period_id).toBe(schoolPeriods[1].id);
    expect(stored.school_period_name).toBe('Term 2 2027');
    expect(stored.items!.map((i) => i.id)).toEqual(['item-tuition']);
  });
});

describe('finance schemas', () => {
  it('accept amounts above 999,999.99 (no 999,999.99 bounds remain)', () => {
    const tightBounds: string[] = [];
    const walk = (node: unknown, path: string) => {
      if (!node || typeof node !== 'object') return;
      const record = node as Record<string, unknown>;
      if (record.maximum === 999999.99 || record.minimum === -999999.99) tightBounds.push(path);
      Object.entries(record).forEach(([key, child]) => walk(child, `${path}.${key}`));
    };
    Object.entries(financeSchemas).forEach(([name, schema]) => walk(schema, name));

    expect(tightBounds).toEqual([]);
  });

  it('fee template item amount has no maximum', () => {
    expect(financeSchemas.feeTemplateItemProperties.amount.maximum).toBeUndefined();
  });
});

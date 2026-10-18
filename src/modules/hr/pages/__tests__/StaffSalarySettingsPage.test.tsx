// ABOUTME: Page tests for Staff Salary Settings (P0-H04, SO-22/SO-24): components persist in the
// ABOUTME: staff_salary_components collection with string ids and UUID staff_id, edited via update(id, patch).

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { databaseService } from '@/services/database/databaseService';
import StaffSalarySettingsPage from '../StaffSalarySettingsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(),
  },
}));

type Row = { id: string } & Record<string, unknown>;

function createMemoryCollection(seed: Row[] = []) {
  let rows = seed.map((row) => ({ ...row }));
  return {
    rows: () => rows,
    find: vi.fn(async () => rows.map((row) => ({ ...row }))),
    insert: vi.fn(async (doc: Row) => {
      if (typeof doc.id !== 'string') throw new Error('id must be a string');
      rows = [...rows, { ...doc }];
      return { ...doc };
    }),
    update: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      if (typeof id !== 'string') throw new Error('Unsupported bind() argument type: object');
      rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      return rows.find((row) => row.id === id) ?? null;
    }),
    remove: vi.fn(async (id: string) => {
      rows = rows.filter((row) => row.id !== id);
      return true;
    }),
  };
}

const STAFF_UUID = '874b9758-1f2e-4c1a-9d3e-0a1b2c3d4e5f';
let collections: Record<string, ReturnType<typeof createMemoryCollection>>;
let nextId = 0;

const renderPage = () =>
  render(
    <ConfirmProvider>
      <StaffSalarySettingsPage />
    </ConfirmProvider>
  );

const field = (dialog: HTMLElement, name: string) =>
  dialog.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement;

beforeEach(() => {
  nextId = 0;
  collections = {
    staff: createMemoryCollection([{ id: STAFF_UUID, first_name: 'Jane', last_name: 'Wanjiru', username: 'jwanjiru' }]),
    staff_salary_components: createMemoryCollection([
      {
        id: 'comp-1',
        staff_id: STAFF_UUID,
        component_name: 'House Allowance',
        component_type: 'earning',
        amount: 5000,
        is_active: true,
        effective_from: '2026-01-01T00:00:00.000Z',
      },
    ]),
  };
  vi.mocked(databaseService.getDatabase).mockResolvedValue({
    getCollection: (name: string) => collections[name] ?? null,
  } as never);
  vi.mocked(databaseService.generateId).mockImplementation(() => `uuid-${++nextId}`);
});

describe('StaffSalarySettingsPage (P0-H04)', () => {
  it('lists stored components and resolves the staff name from a UUID staff_id', async () => {
    renderPage();
    expect(await screen.findByText('House Allowance')).toBeInTheDocument();
    expect(await screen.findByText('Jane Wanjiru')).toBeInTheDocument();
  });

  it('creates a component with a string id and the selected UUID staff_id', async () => {
    renderPage();
    await screen.findByText('House Allowance');
    fireEvent.click(screen.getByRole('button', { name: /salarySettings.addButton/ }));
    const dialog = await screen.findByRole('dialog');

    await waitFor(() =>
      expect(within(dialog).getByRole('option', { name: /Jane Wanjiru/ })).toHaveValue(STAFF_UUID)
    );
    fireEvent.change(field(dialog, 'staff_id'), { target: { value: STAFF_UUID } });
    expect(field(dialog, 'staff_id')).toHaveValue(STAFF_UUID);
    fireEvent.change(field(dialog, 'component_name'), { target: { value: 'NHIF' } });
    fireEvent.change(field(dialog, 'component_type'), { target: { value: 'deduction' } });
    fireEvent.change(field(dialog, 'amount'), { target: { value: '1700' } });
    fireEvent.submit(dialog.querySelector('form')!);

    await waitFor(() =>
      expect(collections.staff_salary_components.rows().map((r) => r.component_name)).toContain('NHIF')
    );
    const saved = collections.staff_salary_components.rows().find((r) => r.component_name === 'NHIF')!;
    expect(saved.id).toBe('uuid-1');
    expect(saved.staff_id).toBe(STAFF_UUID);
    expect(saved.component_type).toBe('deduction');
    expect(saved.amount).toBe(1700);
    expect(await screen.findByText('NHIF')).toBeInTheDocument();
  });

  it('edits a component with update(id, patch) keeping the UUID staff_id', async () => {
    renderPage();
    await screen.findByText('House Allowance');
    fireEvent.click(screen.getByRole('button', { name: /common:edit/ }));
    const dialog = await screen.findByRole('dialog');
    expect(field(dialog, 'staff_id')).toHaveValue(STAFF_UUID);
    fireEvent.change(field(dialog, 'amount'), { target: { value: '6000' } });
    fireEvent.submit(dialog.querySelector('form')!);

    await waitFor(() => expect(collections.staff_salary_components.update).toHaveBeenCalled());
    const [id, patch] = collections.staff_salary_components.update.mock.calls[0];
    expect(id).toBe('comp-1');
    expect(patch).toMatchObject({ staff_id: STAFF_UUID, amount: 6000 });
    expect(collections.staff_salary_components.rows()[0].amount).toBe(6000);
  });

  it('deletes a component after confirming in the dialog', async () => {
    renderPage();
    await screen.findByText('House Allowance');
    fireEvent.click(screen.getByRole('button', { name: /common:delete/ }));
    const dialog = await screen.findByRole('dialog');
    const buttons = within(dialog).getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(collections.staff_salary_components.remove).toHaveBeenCalledWith('comp-1'));
    await waitFor(() => expect(screen.queryByText('House Allowance')).not.toBeInTheDocument());
  });
});

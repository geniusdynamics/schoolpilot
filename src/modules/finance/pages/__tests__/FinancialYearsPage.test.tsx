// ABOUTME: Component tests for the Finance › Financial Years page backed by the 'financial_years' collection.
// ABOUTME: Covers listing with the current badge, create/edit through the form, overlap errors and closing rules.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FinancialYearsPage from '../FinancialYearsPage';
import { FinancialYearsPage as BarrelFinancialYearsPage } from '../index';
import { financeModule } from '../../moduleDefinition';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { FinancialYearStatus } from '@/core/types';
import { databaseService } from '@/services/database/databaseService';
import type { FinancialYearRecord } from '../../data/useFinancialYearData';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, maybeOptions?: Record<string, unknown>) => {
      const options = typeof fallback === 'object' ? fallback : maybeOptions;
      const text = typeof fallback === 'string' ? fallback : (options?.defaultValue as string | undefined) ?? key;
      return text.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(options?.[name] ?? ''));
    },
  }),
}));

const mockToast = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() };
vi.mock('@/hooks/useToast', () => ({ useToast: () => mockToast }));

// The calendar picker is not keyboard-typable in jsdom; a native date input keeps the YYYY-MM-DD contract.
vi.mock('@/components/ui/forms/DateField', () => {
  const DateFieldStub = ({ label, value, onChange, name }: { label?: string; value?: string; onChange?: (v: string) => void; name?: string }) => (
    <label>
      {label}
      <input type="date" name={name} value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
  return { default: DateFieldStub, DateField: DateFieldStub };
});

/** AppDataContext reloads the shared lookups (the term form's financial-year picker) on this event. */
const appDataChanged = vi.fn();
window.addEventListener('appDataChanged', () => appDataChanged());

vi.mock('@/services/database/databaseService', () => ({
  databaseService: { getDatabase: vi.fn(), generateId: vi.fn(() => 'fy-created') },
}));

const year = (id: string, name: string, start: string, end: string, status = FinancialYearStatus.OPEN): FinancialYearRecord => ({
  id,
  name,
  start_date: start,
  end_date: end,
  status,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

let rows: FinancialYearRecord[] = [];
const collection = {
  find: vi.fn(async () => rows.map((row) => ({ ...row }))),
  insert: vi.fn(async (doc: FinancialYearRecord) => {
    rows = [...rows, { ...doc }];
    return { id: doc.id, doc, ok: true };
  }),
  update: vi.fn(async (id: string, patch: Partial<FinancialYearRecord>) => {
    rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
    return rows.find((row) => row.id === id) ?? null;
  }),
  remove: vi.fn(),
};

const renderPage = () => render(<ConfirmProvider><FinancialYearsPage /></ConfirmProvider>);

const rowFor = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  rows = [];
  vi.mocked(databaseService.getDatabase).mockResolvedValue({
    getCollection: (name: string) => (name === 'financial_years' ? collection : null),
  } as never);
});

describe('FinancialYearsPage', () => {
  it('lists financial years from the database and marks the current one', async () => {
    rows = [
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31', FinancialYearStatus.CLOSED),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31'),
    ];
    renderPage();

    expect(await screen.findByText('FY 2026')).toBeInTheDocument();
    expect(within(rowFor('FY 2026')).getByText('Current')).toBeInTheDocument();
    expect(within(rowFor('FY 2025')).queryByText('Current')).not.toBeInTheDocument();
    expect(within(rowFor('FY 2025')).getByText('Closed')).toBeInTheDocument();
  });

  it('creates the next financial year from a pre-filled form and refreshes the term picker data', async () => {
    rows = [year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31')];
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('FY 2026');

    await user.click(screen.getByRole('button', { name: /add financial year/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/name/i)).toHaveValue('FY 2027');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('FY 2027')).toBeInTheDocument();
    expect(collection.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'fy-created', name: 'FY 2027', start_date: '2027-01-01', end_date: '2027-12-31', status: FinancialYearStatus.OPEN })
    );
    expect(appDataChanged).toHaveBeenCalled();
  });

  it('shows an overlap error and does not save an overlapping year', async () => {
    rows = [year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31')];
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('FY 2026');

    await user.click(screen.getByRole('button', { name: /add financial year/i }));
    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'FY Mid');
    const startInput = within(dialog).getByLabelText(/start date/i);
    await user.clear(startInput);
    await user.type(startInput, '2026-07-01');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(/overlaps FY 2026/)).toBeInTheDocument();
    expect(collection.insert).not.toHaveBeenCalled();
  });

  it('edits an existing financial year by id', async () => {
    rows = [year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31')];
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('FY 2026');

    await user.click(within(rowFor('FY 2026')).getByRole('button', { name: /edit/i }));
    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'FY 2026 (Calendar)');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(collection.update).toHaveBeenCalledWith('fy-2026', expect.objectContaining({ name: 'FY 2026 (Calendar)' })));
    expect(await screen.findByText('FY 2026 (Calendar)')).toBeInTheDocument();
  });

  it('does not offer to close the only open year', async () => {
    rows = [year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31')];
    renderPage();
    await screen.findByText('FY 2026');

    expect(within(rowFor('FY 2026')).getByRole('button', { name: /close/i })).toBeDisabled();
  });

  it('closes an earlier open year after confirmation, leaving exactly one current year', async () => {
    rows = [
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31'),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31'),
    ];
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('FY 2025');

    await user.click(within(rowFor('FY 2025')).getByRole('button', { name: /close/i }));
    const confirmDialog = await screen.findByRole('dialog');
    expect(within(confirmDialog).getByText(/Close FY 2025\?/)).toBeInTheDocument();
    await user.click(within(confirmDialog).getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(collection.update).toHaveBeenCalledWith('fy-2025', expect.objectContaining({ status: FinancialYearStatus.CLOSED })));
    await waitFor(() => expect(within(rowFor('FY 2025')).getByText('Closed')).toBeInTheDocument());
    expect(screen.getAllByText('Current')).toHaveLength(1);
    expect(within(rowFor('FY 2026')).getByText('Current')).toBeInTheDocument();
  });

  it('reopens a closed year', async () => {
    rows = [
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31', FinancialYearStatus.CLOSED),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31'),
    ];
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('FY 2025');

    await user.click(within(rowFor('FY 2025')).getByRole('button', { name: /reopen/i }));

    await waitFor(() => expect(collection.update).toHaveBeenCalledWith('fy-2025', expect.objectContaining({ status: FinancialYearStatus.OPEN })));
  });
});

describe('Financial Years registration', () => {
  it('is reachable from the finance navigation and routes, and exported from the pages barrel', () => {
    const nav = financeModule.navigation?.find((item) => item.path === '/finance/financial-years');
    expect(nav).toMatchObject({ page: 'FinancialYearsPage', name: 'navigation:finance.financialYears' });
    expect(nav).not.toHaveProperty('deprecated', true);
    expect(financeModule.routes).toContainEqual({ path: '/finance/financial-years', page: 'FinancialYearsPage' });
    expect(BarrelFinancialYearsPage).toBe(FinancialYearsPage);
  });
});

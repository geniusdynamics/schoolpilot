// ABOUTME: Component tests for the finance Financial Years screen on the canonical financial_year
// ABOUTME: entity: the current badge, create/edit, the overlap and duplicate refusals, close/reopen,
// ABOUTME: and the note that closing a year here does not close the ledger's accounting period.

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { queryCache } from '@/data/query';

import FinancialYearsPage from '../FinancialYearsPage';
import { FinancialYearsContent } from '../FinancialYearsPage';
import { FinancialYearsPage as BarrelFinancialYearsPage } from '../index';
import { financeModule } from '../../moduleDefinition';
import {
  createFinanceRepositoryDouble,
  type FinanceRepositoryDouble,
} from '../../data/__tests__/canonicalRepositoryDouble';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, maybeOptions?: Record<string, unknown>) => {
      const options = typeof fallback === 'object' ? fallback : maybeOptions;
      const text =
        typeof fallback === 'string' ? fallback : ((options?.defaultValue as string | undefined) ?? key);
      return text.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(options?.[name] ?? ''));
    },
  }),
}));

const toast = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));

const INSTITUTION = '00000000-0000-7000-8000-000000000001';

interface SeedYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'planned' | 'current' | 'closed';
}

const year = (
  id: string,
  name: string,
  start: string,
  end: string,
  status: SeedYear['status'] = 'current'
): SeedYear => ({ id, name, start_date: start, end_date: end, status });

let repository: FinanceRepositoryDouble;

function renderPage(seed: readonly SeedYear[] = []) {
  repository = createFinanceRepositoryDouble({
    institution: [{ id: INSTITUTION, name: 'Mwangaza Secondary School' }],
    financial_year: seed.map((row) => ({ ...row, institution_id: INSTITUTION })),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter>
      <ConfirmProvider>
        <CanonicalRepositoryProvider repository={repository}>{children}</CanonicalRepositoryProvider>
      </ConfirmProvider>
    </MemoryRouter>
  );
  return render(<FinancialYearsContent />, { wrapper });
}

const rowFor = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

const submittedRows = () => repository.rows.financial_year ?? [];

beforeEach(() => {
  queryCache.clear();
  vi.clearAllMocks();
});

describe('FinancialYearsPage', () => {
  it('lists the canonical financial years and marks the current one', async () => {
    renderPage([
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31', 'closed'),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current'),
    ]);

    expect(await screen.findByText('FY 2026')).toBeInTheDocument();
    expect(within(rowFor('FY 2026')).getByText('Current')).toBeInTheDocument();
    expect(within(rowFor('FY 2025')).queryByText('Current')).not.toBeInTheDocument();
    expect(within(rowFor('FY 2025')).getByText('Closed')).toBeInTheDocument();
  });

  it('shows the empty state when the school has no financial year yet', async () => {
    renderPage();
    expect(await screen.findByText('No financial years yet')).toBeInTheDocument();
  });

  it('creates the next financial year from the pre-filled form', async () => {
    renderPage([year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current')]);
    await screen.findByText('FY 2026');

    fireEvent.click(screen.getByRole('button', { name: /add financial year/i }));
    const form = await screen.findByRole('form', { name: 'Entity form' });
    expect(within(form).getByLabelText(/^Name/i)).toHaveValue('FY 2027');

    fireEvent.click(within(form).getByRole('button', { name: 'Create financial year' }));

    await waitFor(() => expect(submittedRows()).toHaveLength(2));
    expect(submittedRows().find((row) => row.name === 'FY 2027')).toMatchObject({
      start_date: '2027-01-01',
      end_date: '2027-12-31',
      status: 'planned',
    });
    expect(await screen.findByText('FY 2027')).toBeInTheDocument();
  });

  it('shows the overlap refusal in the form and does not save the year', async () => {
    renderPage([year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current')]);
    await screen.findByText('FY 2026');

    fireEvent.click(screen.getByRole('button', { name: /add financial year/i }));
    const form = await screen.findByRole('form', { name: 'Entity form' });
    fireEvent.change(within(form).getByLabelText(/^Name/i), { target: { value: 'FY Mid' } });
    fireEvent.change(within(form).getByLabelText(/^Start date/i), { target: { value: '2026-07-01' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Create financial year' }));

    expect(await within(form).findByText(/overlaps FY 2026/)).toBeInTheDocument();
    expect(submittedRows()).toHaveLength(1);
  });

  it('shows the duplicate-name refusal in the form and does not save the year', async () => {
    renderPage([year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current')]);
    await screen.findByText('FY 2026');

    fireEvent.click(screen.getByRole('button', { name: /add financial year/i }));
    const form = await screen.findByRole('form', { name: 'Entity form' });
    fireEvent.change(within(form).getByLabelText(/^Name/i), { target: { value: 'fy 2026' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Create financial year' }));

    expect(await within(form).findByText(/named FY 2026 already exists/i)).toBeInTheDocument();
    expect(submittedRows()).toHaveLength(1);
  });

  it('edits an existing financial year', async () => {
    renderPage([year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current')]);
    await screen.findByText('FY 2026');

    fireEvent.click(within(rowFor('FY 2026')).getByRole('button', { name: /edit/i }));
    const form = await screen.findByRole('form', { name: 'Entity form' });
    fireEvent.change(within(form).getByLabelText(/^Name/i), { target: { value: 'FY 2026 (Calendar)' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save financial year' }));

    await waitFor(() =>
      expect(submittedRows().find((row) => row.id === 'fy-2026')).toMatchObject({
        name: 'FY 2026 (Calendar)',
      })
    );
    expect(await screen.findByText('FY 2026 (Calendar)')).toBeInTheDocument();
  });

  it('does not offer to close the only open year', async () => {
    renderPage([year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current')]);
    await screen.findByText('FY 2026');

    expect(within(rowFor('FY 2026')).getByRole('button', { name: /close/i })).toBeDisabled();
  });

  it('closes the current year after confirmation and leaves exactly one current year', async () => {
    renderPage([
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current'),
      year('fy-2027', 'FY 2027', '2027-01-01', '2027-12-31', 'planned'),
    ]);
    await screen.findByText('FY 2026');

    fireEvent.click(within(rowFor('FY 2026')).getByRole('button', { name: /close/i }));
    const confirmDialog = await screen.findByRole('dialog');
    expect(within(confirmDialog).getByText(/Close FY 2026\?/)).toBeInTheDocument();
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(submittedRows().find((row) => row.id === 'fy-2026')?.status).toBe('closed')
    );
    await waitFor(() =>
      expect(within(rowFor('FY 2026')).getByText('Closed')).toBeInTheDocument()
    );
    expect(within(rowFor('FY 2027')).getByText('Current')).toBeInTheDocument();
    expect(screen.getAllByText('Current')).toHaveLength(1);
    expect(toast.showSuccess).toHaveBeenCalledWith('FY 2026 closed');
  });

  it('reopens a closed year', async () => {
    renderPage([
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31', 'closed'),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current'),
    ]);
    await screen.findByText('FY 2025');

    fireEvent.click(within(rowFor('FY 2025')).getByRole('button', { name: /reopen/i }));

    await waitFor(() =>
      expect(submittedRows().find((row) => row.id === 'fy-2025')?.status).toBe('planned')
    );
  });

  it('says that closing a year here does not close the ledger period, and links to Period Close', async () => {
    renderPage();
    await screen.findByText('No financial years yet');

    expect(screen.getByText(/does not close the ledger/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Period Close/i })).toHaveAttribute(
      'href',
      '/finance/accounting-reports?tab=period-close'
    );
    expect(screen.queryByTestId('legacy-data-notice')).not.toBeInTheDocument();
  });
});

describe('Financial Years registration', () => {
  it('is reachable from the finance navigation and routes, and exported from the pages barrel', () => {
    const nav = financeModule.navigation?.find((item) => item.path === '/finance/financial-years');
    expect(nav).toMatchObject({ page: 'FinancialYearsPage', name: 'navigation:finance.financialYears' });
    expect(nav).not.toHaveProperty('deprecated', true);
    expect(financeModule.routes).toContainEqual({
      path: '/finance/financial-years',
      page: 'FinancialYearsPage',
    });
    expect(BarrelFinancialYearsPage).toBe(FinancialYearsPage);
  });
});


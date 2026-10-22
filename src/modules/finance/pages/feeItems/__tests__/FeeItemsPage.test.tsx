// ABOUTME: The fee-items page on the canonical repository: the list, a create that reaches the
// ABOUTME: repository, a refused save that marks its field, an edit, a deactivation, and the RBAC gate.

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';

import { createFinanceRepositoryDouble, type FinanceRepositoryDouble } from '@/modules/finance/data/__tests__/canonicalRepositoryDouble';
import { FeeItemsPageContent } from '../FeeItemsPage';

const toast = vi.hoisted(() => ({
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast, useToastHelpers: () => toast }));

const rbac = vi.hoisted(() => ({ canEdit: true }));
vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => ({ hasPermission: () => rbac.canEdit }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const INSTITUTION = '00000000-0000-7000-8000-000000000001';
const TUITION = '00000000-0000-7000-8000-00000000002f';
const RETIRED = '00000000-0000-7000-8000-000000000040';

function seed(): FinanceRepositoryDouble {
  return createFinanceRepositoryDouble({
    institution: [
      {
        id: INSTITUTION,
        name: 'Mwangaza Secondary School',
        short_name: 'Mwangaza',
        country: 'KE',
        time_zone: 'Africa/Nairobi',
        base_currency: 'KES',
      },
    ],
    fee_item: [
      {
        id: TUITION,
        institution_id: INSTITUTION,
        code: 'TUITION',
        name: 'Tuition fee',
        revenue_account_code: '4000',
        category: 'tuition',
        refundable: false,
        taxable: false,
        priority: 1,
        funding_source: 'parent',
      },
      {
        id: RETIRED,
        institution_id: INSTITUTION,
        code: 'OLD_LUNCH',
        name: 'Lunch (retired)',
        category: 'meals',
        refundable: false,
        taxable: false,
        priority: 2,
        funding_source: 'government_capitation',
        deleted_at: '2027-02-01T00:00:00.000Z',
      },
    ],
  });
}

let repository: FinanceRepositoryDouble;

beforeEach(() => {
  rbac.canEdit = true;
  toast.showSuccess.mockClear();
  toast.showError.mockClear();
  repository = seed();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <ConfirmProvider>
        <CanonicalRepositoryProvider repository={repository}>
          <FeeItemsPageContent />
        </CanonicalRepositoryProvider>
      </ConfirmProvider>
    </MemoryRouter>
  );

const dialog = async () => screen.findByRole('dialog');

const feeItemRows = () => (repository.rows.fee_item ?? []) as readonly Record<string, unknown>[];

describe('the fee-items page', () => {
  it('lists the active vote heads with their funding source, GL account and priority', async () => {
    renderPage();

    expect(await screen.findByText('TUITION')).toBeInTheDocument();
    expect(screen.getByText('Tuition fee')).toBeInTheDocument();
    expect(screen.getByText('Tuition')).toBeInTheDocument();
    expect(screen.getByText('Learner / guardian')).toBeInTheDocument();
    expect(screen.getByText('4000')).toBeInTheDocument();
    // The deactivated item is out of the default view.
    expect(screen.queryByText('OLD_LUNCH')).not.toBeInTheDocument();
  });

  it('reveals the deactivated items when asked', async () => {
    renderPage();
    await screen.findByText('TUITION');

    fireEvent.click(screen.getByLabelText('Show deactivated'));

    expect(await screen.findByText('OLD_LUNCH')).toBeInTheDocument();
    expect(screen.getByText('Deactivated')).toBeInTheDocument();
    expect(screen.getByText('Government capitation')).toBeInTheDocument();
  });

  it('creates a fee item through the repository, with the canonical code and the next priority', async () => {
    renderPage();
    await screen.findByText('TUITION');

    fireEvent.click(screen.getByRole('button', { name: /Add fee item/i }));
    const modal = await dialog();

    fireEvent.change(within(modal).getByLabelText('Code'), { target: { value: 'activity' } });
    fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: 'Activity fee' } });
    fireEvent.change(within(modal).getByLabelText('GL account'), { target: { value: '4100' } });
    fireEvent.click(within(modal).getByRole('button', { name: /Add fee item/i }));

    await waitFor(() =>
      expect(repository.writes.some((write) => write.entity === 'fee_item' && write.action === 'create')).toBe(
        true
      )
    );
    const created = feeItemRows().find((row) => row.code === 'ACTIVITY');
    expect(created).toMatchObject({
      institution_id: INSTITUTION,
      name: 'Activity fee',
      category: 'tuition',
      funding_source: 'parent',
      revenue_account_code: '4100',
      priority: 2,
    });
    // The dialog is closed and the new item is on the grid.
    expect(await screen.findByText('ACTIVITY')).toBeInTheDocument();
  });

  it('refuses a duplicate code and marks the field', async () => {
    renderPage();
    await screen.findByText('TUITION');

    fireEvent.click(screen.getByRole('button', { name: /Add fee item/i }));
    const modal = await dialog();

    fireEvent.change(within(modal).getByLabelText('Code'), { target: { value: 'TUITION' } });
    fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: 'Another tuition' } });
    fireEvent.click(within(modal).getByRole('button', { name: /Add fee item/i }));

    expect(await within(modal).findByText(/already used in this institution/i)).toBeInTheDocument();
    // The dialog stays open and nothing was written.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(repository.writes.some((write) => write.action === 'create')).toBe(false);
    expect(toast.showError).not.toHaveBeenCalled();
  });

  it('edits a fee item and writes the change', async () => {
    renderPage();
    await screen.findByText('TUITION');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const modal = await dialog();
    expect(within(modal).getByLabelText('Code')).toHaveValue('TUITION');

    fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: 'Tuition (revised)' } });
    fireEvent.change(within(modal).getByLabelText(/Funding source/), { target: { value: 'bursary' } });
    fireEvent.click(within(modal).getByRole('button', { name: /Save changes/i }));

    await waitFor(() =>
      expect(repository.writes.some((write) => write.entity === 'fee_item' && write.action === 'update')).toBe(
        true
      )
    );
    const stored = feeItemRows().find((row) => row.id === TUITION);
    expect(stored).toMatchObject({ name: 'Tuition (revised)', funding_source: 'bursary' });
  });

  it('deactivates a fee item after the confirmation', async () => {
    renderPage();
    await screen.findByText('TUITION');

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    const confirmation = await dialog();
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(repository.writes.some((write) => write.entity === 'fee_item' && write.action === 'remove')).toBe(
        true
      )
    );
    expect(feeItemRows().find((row) => row.id === TUITION)?.deleted_at).toBeTruthy();
  });

  it('shows the refusal when the item a fee structure references cannot be deactivated', async () => {
    repository = createFinanceRepositoryDouble({
      institution: [{ id: INSTITUTION, base_currency: 'KES' }],
      fee_item: [
        {
          id: TUITION,
          institution_id: INSTITUTION,
          code: 'TUITION',
          name: 'Tuition',
          category: 'tuition',
          refundable: false,
          taxable: false,
          priority: 1,
          funding_source: 'parent',
        },
      ],
      fee_schedule_line: [
        {
          id: '0d0d0d0d-0d0d-7d0d-8d0d-0d0d0d0d0d0d',
          institution_id: INSTITUTION,
          fee_schedule_id: '0e0e0e0e-0e0e-7e0e-8e0e-0e0e0e0e0e0e',
          fee_item_id: TUITION,
          amount: { amount_minor: 150_000, currency: 'KES' },
          mandatory: true,
          frequency: 'per_term',
          proration_rule: 'full',
        },
      ],
    });
    renderPage();
    await screen.findByText('TUITION');

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    const confirmation = await dialog();
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(toast.showError).toHaveBeenCalledWith(expect.stringMatching(/fee structure line/))
    );
    expect(feeItemRows().find((row) => row.id === TUITION)?.deleted_at).toBeFalsy();
  });

  it('offers no way to change configuration without the finance write permission', async () => {
    rbac.canEdit = false;
    renderPage();
    await screen.findByText('TUITION');

    expect(screen.queryByRole('button', { name: /Add fee item/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    // The list is still readable, and so is the deactivated toggle.
    expect(screen.getByLabelText('Show deactivated')).toBeInTheDocument();
  });
});

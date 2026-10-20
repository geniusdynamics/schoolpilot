// ABOUTME: Page tests for banks, chart of accounts, suppliers, supplier and customer invoices (P0-E05, SO-11/22/23):
// ABOUTME: CRUD goes to the database through useFinance() with update(id, patch) and UUID foreign keys kept as strings.

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import BanksPage from '../BanksPage';
import ChartOfAccountsPage from '../ChartOfAccountsPage';
import SuppliersPage from '../SuppliersPage';
import SupplierInvoicesPage from '../SupplierInvoicesPage';
import CustomerInvoicesPage from '../CustomerInvoicesPage';
import { databaseService } from '@/services/database/databaseService';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(),
  },
}));

// These pages must read CRUD from useFinance(); the app-wide snapshot lacks these mutators (SO-11).
vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => {
    throw new Error('finance pages must not use useAppData()');
  },
}));

type Row = { id: string } & Record<string, unknown>;

interface MemoryCollection {
  rows: () => Row[];
  find: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
}

function createMemoryCollection(seed: Row[] = []): MemoryCollection {
  let rows = seed.map((row) => ({ ...row }));
  return {
    rows: () => rows,
    find: vi.fn(async () => rows.map((row) => ({ ...row }))),
    insert: vi.fn(async (doc: Row) => {
      rows = [...rows, { ...doc }];
      return { ...doc };
    }),
    update: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      if (typeof id !== 'string') throw new Error('Unsupported bind() argument type: object');
      rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      return rows.find((row) => row.id === id) ?? null;
    }),
    remove: vi.fn(async (id: string) => {
      if (typeof id !== 'string') throw new Error('Unsupported bind() argument type: number');
      rows = rows.filter((row) => row.id !== id);
      return true;
    }),
  };
}

// UUIDs that start with digits: parseInt/Number would turn them into a wrong number or NaN (SO-22).
const ASSET_ID = '874b9758-0000-4000-8000-000000000001';
const REVENUE_ID = '874b9758-0000-4000-8000-000000000002';
const EXPENSE_CAT_ID = '91c2aa10-0000-4000-8000-000000000003';
const SUPPLIER_ID = '30f1e2d3-0000-4000-8000-000000000004';
const CUSTOMER_ID = '55aa66bb-0000-4000-8000-000000000005';

let collections: Record<string, MemoryCollection>;
let nextId = 0;

const collection = (name: string) => {
  if (!collections[name]) collections[name] = createMemoryCollection();
  return collections[name];
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ConfirmProvider>{ui}</ConfirmProvider>
    </MemoryRouter>
  );

const openAddDialog = async (name: RegExp) => {
  fireEvent.click((await screen.findAllByRole('button', { name }))[0]);
  return screen.findByRole('dialog');
};

const submitDialog = (dialog: HTMLElement) => {
  const buttons = within(dialog).getAllByRole('button');
  fireEvent.click(buttons[buttons.length - 1]);
};

const confirmDelete = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /^Delete$/i }));
  const dialog = await screen.findByRole('dialog');
  submitDialog(dialog);
};

const stamp = { created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };

beforeEach(() => {
  nextId = 0;
  collections = {
    chart_of_accounts: createMemoryCollection([
      { id: ASSET_ID, account_code: '1100', name: 'Main Bank', type: 'Asset', template_type: 'Custom', is_active: true, ...stamp },
      { id: REVENUE_ID, account_code: '4100', name: 'Hall Hire', type: 'Revenue', template_type: 'Custom', is_active: true, ...stamp },
    ]),
    expense_categories: createMemoryCollection([{ id: EXPENSE_CAT_ID, name: 'Utilities' }]),
    banks: createMemoryCollection([
      { id: 'bank-1', name: 'KCB Main', account_no: '001', gl_account_id: ASSET_ID, ...stamp },
    ]),
    suppliers: createMemoryCollection([{ id: SUPPLIER_ID, name: 'Jua Kali Supplies', ...stamp }]),
    supplier_invoices: createMemoryCollection([]),
    customers: createMemoryCollection([{ id: CUSTOMER_ID, name: 'Riverside Church', ...stamp }]),
    customer_invoices: createMemoryCollection([]),
  };
  vi.mocked(databaseService.getDatabase).mockResolvedValue({
    getCollection: (name: string) => collection(name),
  } as never);
  vi.mocked(databaseService.generateId).mockImplementation(() => `uuid-${++nextId}`);
});

describe('BanksPage (P0-E05)', () => {
  it('creates a bank linked to a UUID GL account', async () => {
    renderWithProviders(<BanksPage />);
    await screen.findByText('KCB Main');
    const dialog = await openAddDialog(/Add Bank Account/i);
    fireEvent.change(within(dialog).getByLabelText(/^Bank Name/i), { target: { value: 'Equity Fees' } });
    const gl = within(dialog).getByLabelText(/GL Asset Account/i);
    await waitFor(() => expect(within(gl).getByRole('option', { name: /1100 - Main Bank/ })).toBeInTheDocument());
    fireEvent.change(gl, { target: { value: ASSET_ID } });
    submitDialog(dialog);

    await waitFor(() => expect(collections.banks.rows().map((r) => r.name)).toContain('Equity Fees'));
    const saved = collections.banks.rows().find((r) => r.name === 'Equity Fees')!;
    expect(saved.gl_account_id).toBe(ASSET_ID);
  });

  it('edits a bank with update(id, patch) and shows the GL account name', async () => {
    renderWithProviders(<BanksPage />);
    expect(await screen.findByText(/Main Bank/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /^Edit$/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Bank Name/i), { target: { value: 'KCB Fees' } });
    submitDialog(dialog);

    await waitFor(() =>
      expect(collections.banks.update).toHaveBeenCalledWith('bank-1', expect.objectContaining({ name: 'KCB Fees', gl_account_id: ASSET_ID }))
    );
    expect(collections.banks.rows()[0].name).toBe('KCB Fees');
  });

  it('deletes a bank by its string id', async () => {
    renderWithProviders(<BanksPage />);
    await screen.findByText('KCB Main');
    await confirmDelete();
    await waitFor(() => expect(collections.banks.rows()).toHaveLength(0));
    expect(collections.banks.remove).toHaveBeenCalledWith('bank-1');
  });
});

describe('ChartOfAccountsPage (P0-E05)', () => {
  it('creates an expense account with a UUID expense category', async () => {
    renderWithProviders(<ChartOfAccountsPage />);
    await screen.findByText('Hall Hire');
    const dialog = await openAddDialog(/Add Account/i);
    fireEvent.change(within(dialog).getByLabelText(/^Account Code/i), { target: { value: '5100' } });
    fireEvent.change(within(dialog).getByLabelText(/^Account Name/i), { target: { value: 'Electricity' } });
    fireEvent.change(within(dialog).getByLabelText(/^Account Type/i), { target: { value: 'Expense' } });
    const category = await within(dialog).findByLabelText(/Expense Category/i);
    await waitFor(() => expect(within(category).getByRole('option', { name: 'Utilities' })).toBeInTheDocument());
    fireEvent.change(category, { target: { value: EXPENSE_CAT_ID } });
    submitDialog(dialog);

    await waitFor(() => expect(collections.chart_of_accounts.rows().map((r) => r.name)).toContain('Electricity'));
    const saved = collections.chart_of_accounts.rows().find((r) => r.name === 'Electricity')!;
    expect(saved.expense_category_id).toBe(EXPENSE_CAT_ID);
    expect(saved.type).toBe('Expense');
  });

  it('edits an account with update(id, patch)', async () => {
    renderWithProviders(<ChartOfAccountsPage />);
    await screen.findByText('Hall Hire');
    fireEvent.click((await screen.findAllByRole('button', { name: /^Edit$/i }))[1]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Account Name/i), { target: { value: 'Hall & Field Hire' } });
    submitDialog(dialog);

    await waitFor(() =>
      expect(collections.chart_of_accounts.update).toHaveBeenCalledWith(REVENUE_ID, expect.objectContaining({ name: 'Hall & Field Hire' }))
    );
  });

  it('deletes an account by its string id', async () => {
    renderWithProviders(<ChartOfAccountsPage />);
    await screen.findByText('Hall Hire');
    fireEvent.click((await screen.findAllByRole('button', { name: /^Delete$/i }))[0]);
    submitDialog(await screen.findByRole('dialog'));
    await waitFor(() => expect(collections.chart_of_accounts.remove).toHaveBeenCalledWith(ASSET_ID));
  });
});

describe('SuppliersPage (P0-E05)', () => {
  it('creates a supplier in the database', async () => {
    renderWithProviders(<SuppliersPage />);
    await screen.findByText('Jua Kali Supplies');
    const dialog = await openAddDialog(/Add Supplier/i);
    fireEvent.change(within(dialog).getByLabelText(/^Supplier Name/i), { target: { value: 'Maji Water Ltd' } });
    submitDialog(dialog);
    await waitFor(() => expect(collections.suppliers.rows().map((r) => r.name)).toContain('Maji Water Ltd'));
    expect(await screen.findByText('Maji Water Ltd')).toBeInTheDocument();
  });

  it('edits a supplier with update(id, patch)', async () => {
    renderWithProviders(<SuppliersPage />);
    await screen.findByText('Jua Kali Supplies');
    fireEvent.click(await screen.findByRole('button', { name: /^Edit$/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Phone/i), { target: { value: '0700000000' } });
    submitDialog(dialog);
    await waitFor(() =>
      expect(collections.suppliers.update).toHaveBeenCalledWith(SUPPLIER_ID, expect.objectContaining({ phone: '0700000000' }))
    );
  });

  it('deletes a supplier by its string id', async () => {
    renderWithProviders(<SuppliersPage />);
    await screen.findByText('Jua Kali Supplies');
    await confirmDelete();
    await waitFor(() => expect(collections.suppliers.rows()).toHaveLength(0));
  });
});

describe('SupplierInvoicesPage (P0-E05)', () => {
  it('records a supplier invoice against a UUID supplier, then edits and deletes it', async () => {
    renderWithProviders(<SupplierInvoicesPage />);
    const dialog = await openAddDialog(/Add Supplier Invoice/i);
    const supplier = within(dialog).getByLabelText(/^Supplier/i);
    await waitFor(() => expect(within(supplier).getByRole('option', { name: 'Jua Kali Supplies' })).toBeInTheDocument());
    fireEvent.change(supplier, { target: { value: SUPPLIER_ID } });
    fireEvent.change(within(dialog).getByLabelText(/^Invoice Number/i), { target: { value: 'SI-001' } });
    fireEvent.change(within(dialog).getByLabelText(/^Total Amount/i), { target: { value: '1500' } });
    submitDialog(dialog);

    await waitFor(() => expect(collections.supplier_invoices.rows()).toHaveLength(1));
    const saved = collections.supplier_invoices.rows()[0];
    expect(saved.supplier_id).toBe(SUPPLIER_ID);
    expect(saved.total_amount).toBe(1500);
    // Supplier name is resolved at read time, not from a denormalised column
    expect(await screen.findByText('Jua Kali Supplies')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /^Edit$/i }));
    const editDialog = await screen.findByRole('dialog');
    fireEvent.change(within(editDialog).getByLabelText(/^Amount Paid/i), { target: { value: '500' } });
    submitDialog(editDialog);
    await waitFor(() =>
      expect(collections.supplier_invoices.update).toHaveBeenCalledWith(
        'uuid-1',
        expect.objectContaining({ amount_paid: 500, supplier_id: SUPPLIER_ID })
      )
    );

    await confirmDelete();
    await waitFor(() => expect(collections.supplier_invoices.rows()).toHaveLength(0));
  });
});

describe('CustomerInvoicesPage (P0-E05)', () => {
  it('creates a customer invoice, adds an item with a UUID revenue account, and deletes it', async () => {
    renderWithProviders(<CustomerInvoicesPage />);
    const dialog = await openAddDialog(/New Customer Invoice/i);
    const customer = within(dialog).getByLabelText(/^Customer/i);
    await waitFor(() => expect(within(customer).getByRole('option', { name: 'Riverside Church' })).toBeInTheDocument());
    fireEvent.change(customer, { target: { value: CUSTOMER_ID } });
    fireEvent.change(within(dialog).getByLabelText(/^Invoice Number/i), { target: { value: 'CI-001' } });
    submitDialog(dialog);

    await waitFor(() => expect(collections.customer_invoices.rows()).toHaveLength(1));
    expect(collections.customer_invoices.rows()[0].customer_id).toBe(CUSTOMER_ID);
    expect(await screen.findByText('Riverside Church')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /^Items$/i }));
    const itemsDialog = await screen.findByRole('dialog');
    // The shared Textarea does not associate its label, so find it by field name.
    const description = itemsDialog.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
    fireEvent.change(description, { target: { value: 'Hall hire, Saturday' } });
    fireEvent.change(within(itemsDialog).getByLabelText(/^Amount/i), { target: { value: '2500' } });
    fireEvent.change(within(itemsDialog).getByLabelText(/Revenue GL Account/i), { target: { value: REVENUE_ID } });
    fireEvent.click(within(itemsDialog).getByRole('button', { name: /Add Item/i }));

    await waitFor(() =>
      expect(collections.customer_invoices.update).toHaveBeenCalledWith('uuid-1', expect.objectContaining({ total_amount: 2500 }))
    );
    const saved = collections.customer_invoices.rows()[0];
    const items = saved.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0].revenue_account_id).toBe(REVENUE_ID);
    expect(items[0].revenue_account_name).toBe('Hall Hire');
    fireEvent.click(within(itemsDialog).getByRole('button', { name: /^Done$/i }));

    await confirmDelete();
    await waitFor(() => expect(collections.customer_invoices.rows()).toHaveLength(0));
  });
});

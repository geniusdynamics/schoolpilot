// ABOUTME: Page tests for general receipts, opening balances, fines, transport routes and assignments (P0-E04).
// ABOUTME: CRUD goes through useFinance() to the database with update(id, patch), UUID ids stay strings, failures show a message.

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import GeneralReceiptsPage from '../GeneralReceiptsPage';
import StudentOpeningBalancesPage from '../StudentOpeningBalancesPage';
import FeesFinesPage from '../FeesFinesPage';
import TransportRoutesPage from '../TransportRoutesPage';
import StudentTransportAssignmentsPage from '../StudentTransportAssignmentsPage';
import { databaseService } from '@/services/database/databaseService';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(),
  },
}));

// The app-wide snapshot lacks these mutators at runtime (SO-11); the pages must use useFinance().
vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => {
    throw new Error('finance pages must not use useAppData()');
  },
}));

const toast = vi.hoisted(() => ({
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast, useToastHelpers: () => toast }));

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
      rows = rows.filter((row) => row.id !== id);
      return true;
    }),
  };
}

const STUDENT = '874b9758-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
const STUDENT_2 = '9f8e7d6c-5b4a-4321-8fed-cba987654321';
const PERIOD = '3a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const REVENUE = '5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e8f';
const ROUTE = '7e8f9a0b-1c2d-4e3f-8a4b-5c6d7e8f9a0b';

let collections: Record<string, MemoryCollection>;
let nextId = 0;

const collection = (name: string) => {
  if (!collections[name]) collections[name] = createMemoryCollection();
  return collections[name];
};

const renderPage = (ui: React.ReactElement) => render(<ConfirmProvider>{ui}</ConfirmProvider>);

const field = (dialog: HTMLElement, name: string) => {
  const element = dialog.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
  if (!element) throw new Error(`field ${name} not found`);
  return element;
};

const change = (dialog: HTMLElement, name: string, value: string) =>
  fireEvent.change(field(dialog, name), { target: { name, value } });

const lastButton = (dialog: HTMLElement) => {
  const buttons = within(dialog).getAllByRole('button');
  return buttons[buttons.length - 1];
};

const openDialog = async (name: RegExp) => {
  fireEvent.click((await screen.findAllByRole('button', { name }))[0]);
  return screen.findByRole('dialog');
};

const confirmDelete = async () => {
  fireEvent.click((await screen.findAllByRole('button', { name: /^Delete$/i }))[0]);
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(lastButton(dialog));
};

const stamp = { created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
  nextId = 0;
  collections = {
    students: createMemoryCollection([
      { id: STUDENT, first_name: 'Amina', last_name: 'Wanjiru', admission_no: 'ADM-7', status: 'Active' },
      { id: STUDENT_2, first_name: 'Brian', last_name: 'Otieno', admission_no: 'ADM-8', status: 'Active' },
    ]),
    staff: createMemoryCollection([]),
    partners: createMemoryCollection([]),
    customers: createMemoryCollection([]),
    school_periods: createMemoryCollection([{ id: PERIOD, name: 'Term 1 2026' }]),
    chart_of_accounts: createMemoryCollection([
      { id: REVENUE, account_code: '4100', name: 'Transport Income', type: 'Revenue', is_active: true, ...stamp },
    ]),
    general_payments: createMemoryCollection([]),
    student_opening_balances: createMemoryCollection([]),
    fee_adjustments: createMemoryCollection([]),
    transport_routes: createMemoryCollection([]),
    student_transport_assignments: createMemoryCollection([]),
  };
  vi.mocked(databaseService.getDatabase).mockResolvedValue({
    getCollection: (name: string) => collection(name),
  } as never);
  vi.mocked(databaseService.generateId).mockImplementation(() => `uuid-${++nextId}`);
});

describe('GeneralReceiptsPage (P0-E04)', () => {
  it('records a receipt with string ids and the computed total, then edits and deletes it', async () => {
    renderPage(<GeneralReceiptsPage />);
    let dialog = await openDialog(/Record Receipt/i);
    change(dialog, 'payer_type', 'Student');
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /Amina Wanjiru/ })).toBeInTheDocument());
    change(dialog, 'payer_id', STUDENT);
    change(dialog, 'item_description_0', 'Bus trip');
    change(dialog, 'item_amount_0', '1500');
    change(dialog, 'item_revenue_account_id_0', REVENUE);
    fireEvent.click(lastButton(dialog));

    await waitFor(() => expect(collections.general_payments.rows()).toHaveLength(1));
    const saved = collections.general_payments.rows()[0];
    expect(saved.payer_id).toBe(STUDENT);
    expect(saved.total_amount_paid).toBe(1500);
    expect((saved.items as Row[])[0].revenue_account_id).toBe(REVENUE);
    expect(toast.showSuccess).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText(/Amina Wanjiru/)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /View\/Edit/i }));
    dialog = await screen.findByRole('dialog');
    change(dialog, 'item_amount_0', '2000');
    fireEvent.click(lastButton(dialog));
    await waitFor(() => expect(collections.general_payments.update).toHaveBeenCalled());
    expect(collections.general_payments.update.mock.calls[0][0]).toBe(saved.id);
    await waitFor(() => expect(collections.general_payments.rows()[0].total_amount_paid).toBe(2000));

    await confirmDelete();
    await waitFor(() => expect(collections.general_payments.rows()).toHaveLength(0));
  });

  it('shows the validation message inside the dialog and saves nothing', async () => {
    renderPage(<GeneralReceiptsPage />);
    const dialog = await openDialog(/Record Receipt/i);
    fireEvent.click(lastButton(dialog));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/description/i);
    expect(collections.general_payments.insert).not.toHaveBeenCalled();
  });

  it('shows the save error in the dialog and keeps it open', async () => {
    collections.general_payments.insert.mockRejectedValueOnce(new Error('Database is read-only'));
    renderPage(<GeneralReceiptsPage />);
    const dialog = await openDialog(/Record Receipt/i);
    change(dialog, 'payer_name_external', 'Harambee guest');
    change(dialog, 'item_description_0', 'Hall hire');
    change(dialog, 'item_amount_0', '500');
    change(dialog, 'item_revenue_account_id_0', REVENUE);
    fireEvent.click(lastButton(dialog));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Database is read-only/);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('StudentOpeningBalancesPage (P0-E04)', () => {
  it('adds an opening balance for a UUID learner, edits it with (id, patch) and deletes it', async () => {
    renderPage(<StudentOpeningBalancesPage />);
    let dialog = await openDialog(/Add Opening Balance/i);
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /Amina Wanjiru/ })).toBeInTheDocument());
    change(dialog, 'student_id', STUDENT);
    change(dialog, 'amount', '3200');
    fireEvent.click(lastButton(dialog));

    await waitFor(() => expect(collections.student_opening_balances.rows()).toHaveLength(1));
    const saved = collections.student_opening_balances.rows()[0];
    expect(saved.student_id).toBe(STUDENT);
    expect(saved.amount).toBe(3200);
    expect(toast.showSuccess).toHaveBeenCalled();
    expect(await screen.findByText('Amina Wanjiru')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /^Edit$/i }));
    dialog = await screen.findByRole('dialog');
    change(dialog, 'amount', '4000');
    fireEvent.click(lastButton(dialog));
    await waitFor(() => expect(collections.student_opening_balances.rows()[0].amount).toBe(4000));
    expect(collections.student_opening_balances.update.mock.calls[0][0]).toBe(saved.id);

    await confirmDelete();
    await waitFor(() => expect(collections.student_opening_balances.rows()).toHaveLength(0));
  });
});

describe('FeesFinesPage (P0-E04)', () => {
  it('adds a fine with a UUID school period, edits it and deletes it', async () => {
    renderPage(<FeesFinesPage />);
    let dialog = await openDialog(/Add Fine/i);
    await waitFor(() => expect(within(dialog).getByRole('option', { name: 'Term 1 2026' })).toBeInTheDocument());
    change(dialog, 'student_id', STUDENT);
    change(dialog, 'school_period_id', PERIOD);
    change(dialog, 'amount', '250');
    change(dialog, 'reason', 'Late payment');
    fireEvent.click(lastButton(dialog));

    await waitFor(() => expect(collections.fee_adjustments.rows()).toHaveLength(1));
    const saved = collections.fee_adjustments.rows()[0];
    expect(saved.school_period_id).toBe(PERIOD);
    expect(saved.student_id).toBe(STUDENT);
    expect(saved.adjustment_type).toBe('Fine');
    expect(saved.amount).toBe(250);
    expect(await screen.findByText('Amina Wanjiru')).toBeInTheDocument();
    expect(screen.getByText('Term 1 2026')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /^Edit$/i }));
    dialog = await screen.findByRole('dialog');
    change(dialog, 'amount', '300');
    fireEvent.click(lastButton(dialog));
    await waitFor(() => expect(collections.fee_adjustments.rows()[0].amount).toBe(300));
    expect(collections.fee_adjustments.update.mock.calls[0][0]).toBe(saved.id);
    expect(collections.fee_adjustments.rows()[0].school_period_id).toBe(PERIOD);

    await confirmDelete();
    await waitFor(() => expect(collections.fee_adjustments.rows()).toHaveLength(0));
  });

  it('shows the validation message inside the dialog when required fields are missing', async () => {
    renderPage(<FeesFinesPage />);
    const dialog = await openDialog(/Add Fine/i);
    fireEvent.click(lastButton(dialog));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/required/i);
    expect(collections.fee_adjustments.insert).not.toHaveBeenCalled();
  });
});

describe('TransportRoutesPage (P0-E04)', () => {
  it('adds a route with a UUID revenue account, edits it with (id, patch) and deletes it', async () => {
    renderPage(<TransportRoutesPage />);
    let dialog = await openDialog(/Add Transport Route/i);
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /Transport Income/ })).toBeInTheDocument());
    change(dialog, 'name', 'Thika Road');
    change(dialog, 'cost_per_period', '4500');
    change(dialog, 'gl_revenue_account_id', REVENUE);
    fireEvent.click(lastButton(dialog));

    await waitFor(() => expect(collections.transport_routes.rows()).toHaveLength(1));
    const saved = collections.transport_routes.rows()[0];
    expect(saved.gl_revenue_account_id).toBe(REVENUE);
    expect(saved.cost_per_period).toBe(4500);
    expect(await screen.findByText('Thika Road')).toBeInTheDocument();
    expect(screen.getByText(/Transport Income/)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /^Edit$/i }));
    dialog = await screen.findByRole('dialog');
    change(dialog, 'name', 'Thika Superhighway');
    fireEvent.click(lastButton(dialog));
    await waitFor(() => expect(collections.transport_routes.rows()[0].name).toBe('Thika Superhighway'));
    expect(collections.transport_routes.update.mock.calls[0][0]).toBe(saved.id);

    await confirmDelete();
    await waitFor(() => expect(collections.transport_routes.rows()).toHaveLength(0));
  });
});

describe('TransportRoutesPage seeded data (P0-E04)', () => {
  it('renders a stored route that has no cost recorded', async () => {
    collections.transport_routes = createMemoryCollection([
      { id: ROUTE, name: 'Route B - Karen', gl_revenue_account_id: REVENUE, ...stamp },
    ]);
    renderPage(<TransportRoutesPage />);
    expect(await screen.findByText('Route B - Karen')).toBeInTheDocument();
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });
});

describe('StudentTransportAssignmentsPage (P0-E04)', () => {
  it('assigns a learner to a route and period with string ids, edits and deletes the assignment', async () => {
    collections.transport_routes = createMemoryCollection([
      { id: ROUTE, name: 'Thika Road', cost_per_period: 4500, gl_revenue_account_id: REVENUE, ...stamp },
    ]);
    renderPage(<StudentTransportAssignmentsPage />);
    let dialog = await openDialog(/Assign Student to Route/i);
    await waitFor(() => expect(within(dialog).getByRole('option', { name: 'Thika Road' })).toBeInTheDocument());
    change(dialog, 'student_id', STUDENT);
    change(dialog, 'route_id', ROUTE);
    change(dialog, 'school_period_id', PERIOD);
    fireEvent.click(lastButton(dialog));

    await waitFor(() => expect(collections.student_transport_assignments.rows()).toHaveLength(1));
    const saved = collections.student_transport_assignments.rows()[0];
    expect(saved).toMatchObject({ student_id: STUDENT, route_id: ROUTE, school_period_id: PERIOD, status: 'Active' });
    expect(await screen.findByText('Amina Wanjiru')).toBeInTheDocument();
    expect(screen.getByText('Thika Road')).toBeInTheDocument();
    expect(screen.getByText('Term 1 2026')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /^Edit$/i }));
    dialog = await screen.findByRole('dialog');
    change(dialog, 'status', 'Inactive');
    fireEvent.click(lastButton(dialog));
    await waitFor(() => expect(collections.student_transport_assignments.rows()[0].status).toBe('Inactive'));
    expect(collections.student_transport_assignments.update.mock.calls[0][0]).toBe(saved.id);

    await confirmDelete();
    await waitFor(() => expect(collections.student_transport_assignments.rows()).toHaveLength(0));
  });
});

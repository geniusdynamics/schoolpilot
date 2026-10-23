// ABOUTME: Smoke and CRUD tests for the nutrition pages (P0-H03, SO-11/22/23): CRUD goes through the
// ABOUTME: nutrition module hooks with update(id, patch), and UUID foreign keys stay strings end to end.

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { AccountType, MealType } from '@/types';
import MealPlansPage from '../MealPlansPage';
import MenusPage from '../MenusPage';
import MerchantsPage from '../MerchantsPage';
import StudentMealAssignmentsPage from '../StudentMealAssignmentsPage';
import MealConsumptionLogPage from '../MealConsumptionLogPage';
import StudentWalletPage from '../StudentWalletPage';
import MealPlanningHubPage from '../MealPlanningHubPage';
import NutritionOperationsHubPage from '../NutritionOperationsHubPage';
import { databaseService } from '@/services/database/databaseService';
import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { createFakeRepository, type FakeRepository } from '@/modules/hr/data/__tests__/canonicalRepositoryDouble';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(),
  },
}));

vi.mock('@/core/moduleRegistry', () => ({
  moduleRegistry: { isEnabled: () => true },
}));

const STUDENT_ID = '874b9758-2c1d-4f1e-9a01-5b7c2d3e4f50';
const PERIOD_ID = '1f6a2b3c-4d5e-4f60-8a71-92b3c4d5e6f7';
const PLAN_ID = '9c8b7a65-4321-4fed-8cba-0987654321ab';
const OTHER_PLAN_ID = '3e2d1c0b-a987-4654-8321-fedcba987654';
const MENU_ID = '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d';
const COA_ID = '7d6c5b4a-3f2e-4d1c-9b0a-8f7e6d5c4b3a';
const today = new Date().toISOString().split('T')[0];

// The app-wide snapshot only supplies the collections the canonical model does not
// cover yet (SO-11); the learners and the school periods come from the repository.
const appData = {
  chartOfAccounts: [
    { id: COA_ID, name: 'Canteen Sales', account_code: '4100', type: AccountType.REVENUE, is_active: true },
  ],
  loading: {},
};

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => appData,
}));

const CLASS_GROUP_ID = '5e4d3c2b-1a09-4f8e-9d7c-6b5a4938271f';
const INSTITUTION_ID = '00000000-0000-7000-8000-000000000001';

/** The canonical rows the nutrition pages read: the learner, its class and the term. */
function canonicalRows() {
  return {
    learner: [
      {
        id: STUDENT_ID,
        institution_id: INSTITUTION_ID,
        given_name: 'Amina',
        family_name: 'Otieno',
        name_order: 'given_first',
        gender: 'female',
        admission_number: 'ADM001',
        status: 'enrolled',
        residence_status: 'day',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    class_group: [
      {
        id: CLASS_GROUP_ID,
        institution_id: INSTITUTION_ID,
        campus_id: '00000000-0000-7000-8000-000000000002',
        academic_year_id: '00000000-0000-7000-8000-000000000003',
        programme_id: '00000000-0000-7000-8000-000000000004',
        level_id: '00000000-0000-7000-8000-000000000005',
        name: 'Grade 7 East',
        homeroom_teacher_ids: [],
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    enrolment: [
      {
        id: '00000000-0000-7000-8000-000000000006',
        institution_id: INSTITUTION_ID,
        learner_id: STUDENT_ID,
        academic_year_id: '00000000-0000-7000-8000-000000000003',
        programme_id: '00000000-0000-7000-8000-000000000004',
        level_id: '00000000-0000-7000-8000-000000000005',
        class_group_id: CLASS_GROUP_ID,
        status: 'active',
        start_date: '2026-01-01',
        entry_reason: 'new_admission',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    academic_period: [
      {
        id: PERIOD_ID,
        institution_id: INSTITUTION_ID,
        academic_year_id: '00000000-0000-7000-8000-000000000003',
        kind: 'term',
        sequence: 1,
        name: 'Term 1 2026',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
        is_reporting: true,
        is_billing: true,
        status: 'current',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  };
}

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
      const saved = { ...doc, id: doc.id ?? `uuid-${++nextId}` };
      rows = [...rows, saved];
      return { ...saved };
    }),
    update: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      if (typeof id !== 'string') throw new Error('Unsupported bind() argument type: object');
      rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      return rows.find((row) => row.id === id) ?? null;
    }),
    remove: vi.fn(async (id: string) => {
      if (typeof id !== 'string') throw new Error('Unsupported bind() argument type: object');
      rows = rows.filter((row) => row.id !== id);
      return true;
    }),
  };
}

let collections: Record<string, MemoryCollection>;
let nextId = 0;
let repository: FakeRepository;

const collection = (name: string) => {
  if (!collections[name]) collections[name] = createMemoryCollection();
  return collections[name];
};

const renderPage = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ConfirmProvider>
        <CanonicalRepositoryProvider repository={repository}>{ui}</CanonicalRepositoryProvider>
      </ConfirmProvider>
    </MemoryRouter>
  );

const stamp = { created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };

beforeEach(() => {
  nextId = 0;
  repository = createFakeRepository(canonicalRows());
  collections = {
    meal_plans: createMemoryCollection([
      { id: PLAN_ID, name: 'Full Board', description: 'Three meals', cost_per_period: 1000, ...stamp },
      { id: OTHER_PLAN_ID, name: 'Lunch Only', cost_per_period: 400, ...stamp },
    ]),
    menus: createMemoryCollection([
      { id: MENU_ID, menu_date: today, meal_type: MealType.LUNCH, description: 'Ugali and beans', cost: 50, ...stamp },
    ]),
    merchants: createMemoryCollection([{ id: 'mer-1', name: 'Canteen', gl_account_id: COA_ID, ...stamp }]),
    student_meal_plans: createMemoryCollection([]),
    meal_consumption_logs: createMemoryCollection([
      {
        id: 'log-1',
        student_id: 'stu-other',
        menu_id: MENU_ID,
        consumption_time: '2026-01-02T12:00:00.000Z',
        charged_amount: 50,
        student_name: 'Brian Kiprop',
        menu_description: 'Rice and stew',
        menu_meal_type: MealType.LUNCH,
        menu_date: '2026-01-02',
      },
    ]),
    student_wallets: createMemoryCollection([
      { id: 'wal-1', student_id: STUDENT_ID, balance: 200, last_updated: '2026-01-02T08:00:00.000Z', student_name: 'Amina Otieno' },
    ]),
    wallet_transactions: createMemoryCollection([
      {
        id: 'tx-1',
        student_id: STUDENT_ID,
        transaction_date: '2026-01-02T08:00:00.000Z',
        transaction_type: 'Credit',
        amount: 200,
        description: 'Opening deposit',
        running_balance: 200,
      },
    ]),
  };
  const db = new Proxy({} as Record<string, unknown>, {
    get: (_target, prop) => {
      if (prop === 'getCollection') return (name: string) => collection(name);
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      return collection(prop);
    },
  });
  vi.mocked(databaseService.getDatabase).mockResolvedValue(db as never);
  vi.mocked(databaseService.generateId).mockImplementation(() => `uuid-${++nextId}`);
});

describe('MealPlansPage (P0-H03)', () => {
  it('edits a meal plan with update(id, patch) and deletes it by its UUID', async () => {
    renderPage(<MealPlansPage />);
    expect(await screen.findByText('Full Board')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^Edit$/i })[0]);
    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getAllByRole('textbox')[0];
    expect(nameInput).toHaveValue('Full Board');
    fireEvent.change(nameInput, { target: { value: 'Full Board Plus' } });
    fireEvent.click(within(dialog).getAllByRole('button').at(-1)!);

    await waitFor(() =>
      expect(collections.meal_plans.update).toHaveBeenCalledWith(
        PLAN_ID,
        expect.objectContaining({ name: 'Full Board Plus', cost_per_period: 1000 })
      )
    );
    expect(await screen.findByText('Full Board Plus')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^Delete$/i })[0]);
    const confirmDialog = await screen.findByRole('dialog');
    fireEvent.click(within(confirmDialog).getAllByRole('button').at(-1)!);
    await waitFor(() => expect(collections.meal_plans.remove).toHaveBeenCalledWith(PLAN_ID));
  });
});

describe('MenusPage (P0-H03)', () => {
  it('edits a menu with update(id, patch)', async () => {
    renderPage(<MenusPage />);
    expect(await screen.findByText('Ugali and beans')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const dialog = await screen.findByRole('dialog');
    const description = within(dialog).getByRole('textbox');
    fireEvent.change(description, { target: { value: 'Ugali, beans and greens' } });
    fireEvent.click(within(dialog).getAllByRole('button').at(-1)!);

    await waitFor(() =>
      expect(collections.menus.update).toHaveBeenCalledWith(
        MENU_ID,
        expect.objectContaining({ description: 'Ugali, beans and greens', meal_type: MealType.LUNCH })
      )
    );
    expect(await screen.findByText('Ugali, beans and greens')).toBeInTheDocument();
  });

  it('keeps the menus explanation on the card heading instead of a description row', async () => {
    renderPage(<MenusPage />);
    await screen.findByText('Ugali and beans');

    // The sentence moved off the card body onto the heading, reachable from the info hint.
    expect(screen.getByRole('button', { name: 'About this section' })).toBeInTheDocument();
    expect(screen.getByText('menus.management.description')).toBeInTheDocument();
  });
});

describe('MerchantsPage (P0-H03)', () => {
  it('creates a merchant keeping the GL account UUID a string and shows the account name', async () => {
    renderPage(<MerchantsPage />);
    expect(await screen.findByText('Canteen')).toBeInTheDocument();
    expect(await screen.findByText(/Canteen Sales/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^Add Merchant$/i })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Tuck Shop' } });
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: COA_ID } });
    fireEvent.click(within(dialog).getAllByRole('button').at(-1)!);

    await waitFor(() => expect(collections.merchants.rows().map((r) => r.name)).toContain('Tuck Shop'));
    const saved = collections.merchants.rows().find((r) => r.name === 'Tuck Shop')!;
    expect(saved.gl_account_id).toBe(COA_ID);
    expect(collections.merchants.insert).toHaveBeenCalledTimes(1);
  });

  it('edits and deletes a merchant by its id', async () => {
    renderPage(<MerchantsPage />);
    await screen.findByText('Canteen');
    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Main Canteen' } });
    fireEvent.click(within(dialog).getAllByRole('button').at(-1)!);
    await waitFor(() =>
      expect(collections.merchants.update).toHaveBeenCalledWith(
        'mer-1',
        expect.objectContaining({ name: 'Main Canteen', gl_account_id: COA_ID })
      )
    );

    fireEvent.click(await screen.findByRole('button', { name: /^Delete$/i }));
    const confirmDialog = await screen.findByRole('dialog');
    fireEvent.click(within(confirmDialog).getAllByRole('button').at(-1)!);
    await waitFor(() => expect(collections.merchants.remove).toHaveBeenCalledWith('mer-1'));
  });
});

describe('StudentMealAssignmentsPage (P0-H03)', () => {
  it('assigns a meal plan with UUID period and plan ids kept as strings', async () => {
    renderPage(<StudentMealAssignmentsPage />);
    expect(await screen.findByText(/Amina Otieno/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Assign Plan/i }));
    const dialog = await screen.findByRole('dialog');
    const comboboxes = within(dialog).getAllByRole('combobox');
    // The student and the period are pickers; the meal plan is still a select.
    expect(comboboxes[1]).toHaveTextContent(/Term 1 2026/);
    const planSelect = comboboxes[2];
    fireEvent.change(planSelect, { target: { value: PLAN_ID } });
    expect(planSelect).toHaveValue(PLAN_ID);
    fireEvent.click(within(dialog).getAllByRole('button').at(-1)!);

    await waitFor(() => expect(collections.student_meal_plans.rows()).toHaveLength(1));
    expect(collections.student_meal_plans.rows()[0]).toEqual(
      expect.objectContaining({ student_id: STUDENT_ID, school_period_id: PERIOD_ID, meal_plan_id: PLAN_ID })
    );
    expect(await screen.findByText('Full Board')).toBeInTheDocument();
  });

  it('changes an existing assignment with update(id, patch)', async () => {
    collections.student_meal_plans = createMemoryCollection([
      { id: 'smp-1', student_id: STUDENT_ID, school_period_id: PERIOD_ID, meal_plan_id: PLAN_ID, status: 'Active', ...stamp },
    ]);
    renderPage(<StudentMealAssignmentsPage />);
    expect(await screen.findByText('Full Board')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Edit Assignment/i }));
    const dialog = await screen.findByRole('dialog');
    const planSelect = within(dialog).getAllByRole('combobox')[2];
    fireEvent.change(planSelect, { target: { value: OTHER_PLAN_ID } });    fireEvent.click(within(dialog).getAllByRole('button').at(-1)!);

    await waitFor(() =>
      expect(collections.student_meal_plans.update).toHaveBeenCalledWith(
        'smp-1',
        expect.objectContaining({ meal_plan_id: OTHER_PLAN_ID, school_period_id: PERIOD_ID })
      )
    );
  });
});

describe('MealConsumptionLogPage (P0-H03)', () => {
  it('lists stored logs and logs a meal for a student against today\'s menu', async () => {
    renderPage(<MealConsumptionLogPage />);
    expect(await screen.findByText('Brian Kiprop')).toBeInTheDocument();
    expect(await screen.findByText(/Selected Menu:/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('meal-log-student-picker'));
    fireEvent.click(await screen.findByRole('option', { name: /Amina Otieno/ }));
    fireEvent.click(screen.getByRole('button', { name: /Log Consumption/i }));

    await waitFor(() =>
      expect(collections.meal_consumption_logs.rows().map((r) => r.student_id)).toContain(STUDENT_ID)
    );
    const saved = collections.meal_consumption_logs.rows().find((r) => r.student_id === STUDENT_ID)!;
    expect(saved.menu_id).toBe(MENU_ID);
    expect(saved.student_name).toBe('Amina Otieno');
    expect(await screen.findByText(/Meal logged successfully for Amina/)).toBeInTheDocument();
  });
});

describe('StudentWalletPage (P0-H03)', () => {
  it('shows wallets and history, and posts a deposit that updates the balance', async () => {
    renderPage(<StudentWalletPage />);
    expect(await screen.findByText('Amina Otieno')).toBeInTheDocument();
    expect(screen.getByText('200.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /View History/i }));
    expect(await screen.findByText('Opening deposit')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Close$/i }).at(-1)!);

    fireEvent.click(screen.getByRole('button', { name: /Manual Transaction/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByTestId('wallet-student-picker'));
    fireEvent.click(await screen.findByRole('option', { name: /Amina Otieno/ }));
    const typeSelect = within(dialog).getAllByRole('combobox')[1];
    expect((typeSelect as HTMLSelectElement).value).not.toBe('');
    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '50' } });
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Pocket money' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Post Transaction/i }));

    await waitFor(() =>
      expect(collections.wallet_transactions.rows().map((r) => r.description)).toContain('Pocket money')
    );
    const tx = collections.wallet_transactions.rows().find((r) => r.description === 'Pocket money')!;
    expect(tx).toEqual(expect.objectContaining({ student_id: STUDENT_ID, amount: 50, running_balance: 250 }));
    await waitFor(() => expect(collections.student_wallets.rows()[0].balance).toBe(250));
  });

  it('records a debit adjustment as a negative amount and lowers the balance', async () => {
    renderPage(<StudentWalletPage />);
    await screen.findByText('Amina Otieno');
    fireEvent.click(screen.getByRole('button', { name: /Manual Transaction/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByTestId('wallet-student-picker'));
    fireEvent.click(await screen.findByRole('option', { name: /Amina Otieno/ }));
    const typeSelect = within(dialog).getAllByRole('combobox')[1];
    const debitOption = within(typeSelect).getByRole('option', { name: /Debit Wallet/i }) as HTMLOptionElement;
    fireEvent.change(typeSelect, { target: { value: debitOption.value } });
    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '30' } });
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Lost card fee' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Post Transaction/i }));

    await waitFor(() =>
      expect(collections.wallet_transactions.rows().map((r) => r.description)).toContain('Lost card fee')
    );
    const tx = collections.wallet_transactions.rows().find((r) => r.description === 'Lost card fee')!;
    expect(tx).toEqual(expect.objectContaining({ amount: -30, running_balance: 170 }));
    await waitFor(() => expect(collections.student_wallets.rows()[0].balance).toBe(170));
  });
});

describe('Nutrition hub pages (P0-H03 smoke)', () => {
  it('renders the meal planning hub', async () => {
    renderPage(<MealPlanningHubPage />);
    expect(await screen.findByText('Full Board')).toBeInTheDocument();
  });

  it('renders the operations hub', async () => {
    renderPage(<NutritionOperationsHubPage />);
    expect(await screen.findByText('Canteen')).toBeInTheDocument();
  });
});

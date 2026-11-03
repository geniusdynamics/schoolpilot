// ABOUTME: The transport screens on the real canonical repository and ledger: a route is created
// ABOUTME: and edited, a term's charges are billed with their result, and an assignment is made and
// ABOUTME: removed without a legacy collection in sight.

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { applySchemaMigrations } from '@/data/migrations';
import { queryCache } from '@/data/query';
import { createRepository, type Repository } from '@/data/repository';
import { LedgerService, createSqliteLedgerStore } from '@/domain/finance/ledger';

import { StudentTransportAssignmentsPageContent } from '../StudentTransportAssignmentsPage';
import { TransportRoutesPageContent } from '../TransportRoutesPage';

const SLOW = { timeout: 15_000 } as const;

const toast = vi.hoisted(() => ({
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast, useToastHelpers: () => toast }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: Record<string, unknown>) => {
      let text = typeof fallback === 'string' ? fallback : key;
      for (const [name, value] of Object.entries(options ?? {})) {
        text = text.replaceAll(`{{${name}}}`, String(value));
      }
      return text;
    },
  }),
}));

interface Basics {
  readonly institutionId: string;
  readonly yearId: string;
  readonly periodId: string;
  readonly programmeId: string;
  readonly levelId: string;
  readonly classGroupId: string;
}

let adapter: SqliteAdapter;
let repository: Repository;
let ledger: LedgerService;

async function seedBasics(): Promise<Basics> {
  const institution = await repository.create('institution', {
    name: 'Mwangaza Secondary School',
    short_name: 'Mwangaza',
    country: 'KE',
    ownership: 'public',
    gender_policy: 'mixed',
    boarding_policy: 'day',
    default_locale: 'en-KE',
    time_zone: 'Africa/Nairobi',
    base_currency: 'KES',
  });
  const calendar = await repository.create('calendar', {
    institution_id: institution.id,
    name: 'National Calendar',
    programme_ids: [],
  });
  const year = await repository.create('academic_year', {
    institution_id: institution.id,
    calendar_id: calendar.id,
    name: '2027',
    start_date: '2027-01-05',
    end_date: '2027-11-30',
    status: 'current',
  });
  const period = await repository.create('academic_period', {
    institution_id: institution.id,
    academic_year_id: year.id,
    kind: 'term',
    sequence: 1,
    name: 'Term 1 2027',
    start_date: '2027-01-05',
    end_date: '2027-04-10',
    is_reporting: true,
    is_billing: true,
    status: 'current',
  });
  const programme = await repository.create('programme', {
    institution_id: institution.id,
    curriculum_pack_code: 'ke-cbe',
    pack_version: '1.0.0',
    name: 'CBE Junior School',
    calendar_id: calendar.id,
    status: 'active',
  });
  const stage = await repository.create('stage', {
    institution_id: institution.id,
    programme_id: programme.id,
    code: 'JS',
    name: 'Junior School',
    sequence: 1,
  });
  const level = await repository.create('level', {
    institution_id: institution.id,
    stage_id: stage.id,
    code: 'G7',
    name: 'Grade 7',
    ordinal: 1,
    is_terminal: false,
  });
  const campus = await repository.create('campus', {
    institution_id: institution.id,
    name: 'Main Campus',
    is_main: true,
  });
  const classGroup = await repository.create('class_group', {
    institution_id: institution.id,
    campus_id: campus.id,
    academic_year_id: year.id,
    programme_id: programme.id,
    level_id: level.id,
    name: 'Blue',
    homeroom_teacher_ids: [],
  });

  return {
    institutionId: institution.id,
    yearId: year.id,
    periodId: period.id,
    programmeId: programme.id,
    levelId: level.id,
    classGroupId: classGroup.id,
  };
}

async function seedLearner(
  basics: Basics,
  given: string,
  family: string,
  admission: string
): Promise<string> {
  const learner = await repository.create('learner', {
    institution_id: basics.institutionId,
    given_name: given,
    family_name: family,
    name_order: 'given_first',
    gender: 'female',
    admission_number: admission,
    status: 'enrolled',
    residence_status: 'day',
  });
  return learner.id;
}

async function seedEnrolment(basics: Basics, learnerId: string): Promise<void> {
  await repository.create('enrolment', {
    institution_id: basics.institutionId,
    learner_id: learnerId,
    academic_year_id: basics.yearId,
    programme_id: basics.programmeId,
    level_id: basics.levelId,
    class_group_id: basics.classGroupId,
    status: 'active',
    start_date: '2027-01-05',
    end_date: null,
    entry_reason: 'new_admission',
  });
}

async function seedRoute(basics: Basics, name = 'Westlands'): Promise<string> {
  const route = await repository.create('transport_route', {
    institution_id: basics.institutionId,
    name,
    cost: { amount_minor: 150_000, currency: 'KES' },
    revenue_account_code: '4100',
    active: true,
  });
  return route.id;
}

function renderRoutes() {
  return render(
    <MemoryRouter>
      <ConfirmProvider>
        <CanonicalRepositoryProvider repository={repository}>
          <TransportRoutesPageContent adapter={adapter} />
        </CanonicalRepositoryProvider>
      </ConfirmProvider>
    </MemoryRouter>
  );
}

function renderAssignments() {
  return render(
    <MemoryRouter>
      <ConfirmProvider>
        <CanonicalRepositoryProvider repository={repository}>
          <StudentTransportAssignmentsPageContent adapter={adapter} />
        </CanonicalRepositoryProvider>
      </ConfirmProvider>
    </MemoryRouter>
  );
}

beforeEach(async () => {
  queryCache.clear();
  toast.showSuccess.mockClear();
  toast.showError.mockClear();

  adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();
  repository = createRepository({ adapter });
  await repository.setup();
  await applySchemaMigrations(adapter);
  ledger = new LedgerService({ store: createSqliteLedgerStore(adapter) });
});

afterEach(async () => {
  await adapter.close();
});

describe('the transport routes screen', () => {
  it('shows its empty state, adds a route and edits it through the canonical repository', async () => {
    await seedBasics();
    renderRoutes();

    expect(await screen.findByText('No transport routes yet', {}, SLOW)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Add transport route/i })[0] as HTMLElement);

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Route/), {
      target: { value: 'Westlands' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Cost per term/), {
      target: { value: '1,500.00' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Revenue account/), {
      target: { value: '4100' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Add transport route/i }));

    await waitFor(async () => {
      expect((await repository.list('transport_route', {})).items).toHaveLength(1);
    }, SLOW);
    const created = (await repository.list('transport_route', {})).items[0];
    expect(created).toMatchObject({
      name: 'Westlands',
      cost: { amount_minor: 150_000, currency: 'KES' },
      revenue_account_code: '4100',
      active: true,
    });
    expect(await screen.findByText('Westlands', {}, SLOW)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const edit = await screen.findByRole('dialog');
    fireEvent.change(within(edit).getByLabelText(/^Route/), {
      target: { value: 'Westlands Express' },
    });
    fireEvent.click(within(edit).getByRole('button', { name: /Save changes/i }));

    await waitFor(async () => {
      const current = await repository.get('transport_route', created.id);
      expect(current?.name).toBe('Westlands Express');
    }, SLOW);
    expect(await screen.findByText('Westlands Express', {}, SLOW)).toBeInTheDocument();
  });

  it('bills the route, shows who was charged and skipped, and refuses to bill them twice', async () => {
    const basics = await seedBasics();
    const routeId = await seedRoute(basics);
    const jane = await seedLearner(basics, 'Jane', 'Wanjiru', 'ADM-1');
    const peter = await seedLearner(basics, 'Peter', 'Otieno', 'ADM-2');
    await seedEnrolment(basics, jane);
    for (const learnerId of [jane, peter]) {
      await repository.create('transport_assignment', {
        institution_id: basics.institutionId,
        learner_id: learnerId,
        route_id: routeId,
        academic_period_id: basics.periodId,
        status: 'active',
      });
    }

    renderRoutes();
    await screen.findByText('Westlands', {}, SLOW);
    fireEvent.click(screen.getByRole('button', { name: /Bill this term/i }));

    const dialog = await screen.findByRole('dialog');
    const bill = within(dialog).getByRole('button', { name: /Bill this term/i });
    await waitFor(() => expect(bill).toBeEnabled(), SLOW);
    fireEvent.click(bill);

    expect(await screen.findByText(/1 charged, 1 skipped/, {}, SLOW)).toBeInTheDocument();
    const result = within(dialog).getByRole('status');
    expect(result).toHaveTextContent(/invoice INV\/2027\/1\//);
    expect(result).toHaveTextContent(/Peter Otieno has no active enrolment in Term 1 2027\./);

    const invoices = await repository.list('invoice', {});
    expect(invoices.items).toHaveLength(1);
    expect(invoices.items[0]?.learner_id).toBe(jane);
    const lines = await repository.list('invoice_line', {
      where: { invoice_id: invoices.items[0]?.id },
    });
    expect(lines.items.map((line) => line.kind)).toEqual(['transport']);
    expect(
      await ledger.listEntries({ institutionId: basics.institutionId, sourceKind: 'invoice' })
    ).toHaveLength(1);

    fireEvent.click(within(dialog).getByRole('button', { name: /Bill this term/i }));
    expect(await screen.findByText(/0 charged, 2 skipped/, {}, SLOW)).toBeInTheDocument();
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      /Jane Wanjiru is already charged for Term 1 2027/
    );
    expect((await repository.list('invoice', {})).items).toHaveLength(1);
    expect(
      await ledger.listEntries({ institutionId: basics.institutionId, sourceKind: 'invoice' })
    ).toHaveLength(1);
  });
});

describe('the transport assignments screen', () => {
  it('assigns a learner to a route for a term and removes the assignment', async () => {
    const basics = await seedBasics();
    const routeId = await seedRoute(basics);
    const jane = await seedLearner(basics, 'Jane', 'Wanjiru', 'ADM-1');

    renderAssignments();
    expect(await screen.findByText('No learners assigned', {}, SLOW)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Assign learner/i })[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByLabelText(/^Learner/));
    fireEvent.click(await screen.findByRole('option', { name: /Jane Wanjiru/ }));
    fireEvent.change(within(dialog).getByLabelText(/^Route/), { target: { value: routeId } });
    fireEvent.click(within(dialog).getByLabelText(/^Term/));
    fireEvent.click(await screen.findByRole('option', { name: 'Term 1 2027' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Assign learner/i }));

    await waitFor(async () => {
      expect((await repository.list('transport_assignment', {})).items).toHaveLength(1);
    }, SLOW);
    const assignment = (await repository.list('transport_assignment', {})).items[0];
    expect(assignment).toMatchObject({
      learner_id: jane,
      route_id: routeId,
      academic_period_id: basics.periodId,
      status: 'active',
    });

    expect(await screen.findByText(/Jane Wanjiru/, {}, SLOW)).toBeInTheDocument();
    expect(screen.getByText('Westlands')).toBeInTheDocument();
    expect(screen.getByText('Term 1 2027')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Remove$/i }));
    const confirm = await screen.findByRole('dialog');
    fireEvent.click(within(confirm).getByRole('button', { name: /^Remove$/i }));

    await waitFor(async () => {
      expect((await repository.list('transport_assignment', {})).items).toHaveLength(0);
      const archived = await repository.list('transport_assignment', { includeDeleted: true });
      expect(archived.items).toHaveLength(1);
      expect(archived.items[0]?.deleted_at).toBeTruthy();
    }, SLOW);
    expect(await screen.findByText('No learners assigned', {}, SLOW)).toBeInTheDocument();
  });

  it('says to add a route first when the school has none', async () => {
    const basics = await seedBasics();
    await seedLearner(basics, 'Jane', 'Wanjiru', 'ADM-1');

    renderAssignments();

    expect(await screen.findByText('No transport routes yet', {}, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Assign learner/i })).toBeDisabled();
  });
});

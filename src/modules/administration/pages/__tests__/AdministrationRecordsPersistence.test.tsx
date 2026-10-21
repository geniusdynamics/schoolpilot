// ABOUTME: Page tests proving partners, customers, templates, campaigns and health records live in the database.
// ABOUTME: Each page lists stored rows, writes through the collection, and shows the change again after a remount (reload).

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnersPage from '../PartnersPage';
import CustomersPage from '../CustomersPage';
import CommunicationTemplatesPage from '../CommunicationTemplatesPage';
import MessageCampaignsPage from '../MessageCampaignsPage';
import StudentHealthRecordsPage from '../StudentHealthRecordsPage';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { databaseService } from '@/services/database/databaseService';
import { CampaignAudienceType, CampaignStatus, PartnerType, TemplateType } from '../../data/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));

const mockToast = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() };
vi.mock('@/hooks/useToast', () => ({ useToast: () => mockToast }));

const appData = {
  students: [{ id: 'S001', admission_no: 'ADM001', first_name: 'Jim', last_name: 'Halpert', current_class_name: 'Form 1' }],
  classStreams: [{ id: 'cs-1', class_id: 'c-1', name: 'A', class_name: 'Form 1' }],
  staff: [{ id: 'STF001', user_id: 'USR1', first_name: 'Michael', last_name: 'Scott', display_name: 'Michael Scott' }],
  users: [],
};
vi.mock('@/hooks/useAppData', () => ({ useAppData: () => appData, useAppDataInternal: () => appData }));
vi.mock('@/contexts/UserContext', () => ({
  useUser: () => ({ currentUser: { id: 'USR_ADMIN', username: 'admin', display_name: 'Admin User' } }),
}));

vi.mock('@/services/database/databaseService', () => ({
  databaseService: { getDatabase: vi.fn(), generateId: vi.fn() },
}));

// The learner and class-group reads are canonical now; the test hands the pages those rows.
const canonicalLearners = [
  {
    id: 'S001', admission_no: 'ADM001', first_name: 'Jim', last_name: 'Halpert',
    name: 'Jim Halpert', current_class_name: 'Form 1', current_class_stream_name: '',
    class_group_id: null, status: 'Active', gender: 'Male', deleted_at: null,
  },
];
vi.mock('../../data/useCanonicalLearners', () => ({
  useCanonicalLearners: () => ({ learners: canonicalLearners, isLoading: false }),
}));
vi.mock('../../data/useCanonicalClassGroups', () => ({
  useCanonicalClassGroups: () => ({ classGroups: [], isLoading: false }),
}));

type Row = { id: string } & Record<string, unknown>;

/** A store that outlives component mounts, standing in for the persisted database. */
let store: Record<string, Row[]>;
let idCounter = 0;

function collectionFor(name: string) {
  return {
    find: vi.fn(async () => (store[name] ?? []).map((row) => ({ ...row }))),
    insert: vi.fn(async (doc: Row) => {
      store[name] = [...(store[name] ?? []), { ...doc }];
      return { ...doc };
    }),
    update: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      store[name] = (store[name] ?? []).map((row) => (row.id === id ? { ...row, ...patch } : row));
      return store[name].find((row) => row.id === id) ?? null;
    }),
    remove: vi.fn(async (id: string) => {
      store[name] = (store[name] ?? []).filter((row) => row.id !== id);
      return true;
    }),
  };
}

const stamp = '2026-01-01T00:00:00.000Z';

beforeEach(() => {
  vi.clearAllMocks();
  idCounter = 0;
  store = {
    partners: [{ id: 'p-1', name: 'Rotary Club', partner_type: PartnerType.SPONSOR, created_at: stamp, updated_at: stamp }],
    customers: [{ id: 'cu-1', name: 'Canteen Vendor', phone: '0700', created_at: stamp, updated_at: stamp }],
    communication_templates: [
      { id: 'tpl-1', name: 'Welcome Message', type: TemplateType.SMS, body_template: 'Welcome {{student_name}}', created_at: stamp, updated_at: stamp },
    ],
    message_campaigns: [
      {
        id: 'mc-1',
        name: 'New Term Welcome',
        template_id: 'tpl-1',
        body: 'Welcome back',
        status: CampaignStatus.DRAFT,
        target_audience_type: CampaignAudienceType.ALL_STUDENTS,
        created_by: 'STF001',
        created_at: stamp,
        updated_at: stamp,
      },
    ],
    student_health_records: [],
  };
  vi.mocked(databaseService.generateId).mockImplementation(() => `new-${++idCounter}`);
  vi.mocked(databaseService.getDatabase).mockResolvedValue({ getCollection: (name: string) => collectionFor(name) } as never);
});

const renderPage = (page: React.ReactElement) => render(<ConfirmProvider>{page}</ConfirmProvider>);

async function confirmDialog(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole('dialog');
  const buttons = within(dialog).getAllByRole('button');
  await user.click(buttons[buttons.length - 1]);
}

describe('administration records persist in the database', () => {
  it('Partners: lists stored partners and a created partner survives a reload', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage(<PartnersPage />);
    expect(await screen.findByText('Rotary Club')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add partner/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox', { name: /partner name/i }), 'Water Board');
    await user.click(within(dialog).getByRole('button', { name: /add partner/i }));

    await waitFor(() => expect(store.partners.map((row) => row.name)).toContain('Water Board'));
    expect(store.partners.find((row) => row.name === 'Water Board')).toMatchObject({ id: 'new-1', partner_type: PartnerType.OTHER });

    unmount();
    renderPage(<PartnersPage />);
    expect(await screen.findByText('Water Board')).toBeInTheDocument();
  });

  it('Partners: editing a partner persists the change with update(id, patch)', async () => {
    const user = userEvent.setup();
    renderPage(<PartnersPage />);
    expect(await screen.findByText('Rotary Club')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getAllByRole('textbox')[0];
    await user.clear(nameInput);
    await user.type(nameInput, 'Rotary District');
    await user.click(within(dialog).getAllByRole('button').at(-1)!);

    await waitFor(() => expect(store.partners[0]).toMatchObject({ id: 'p-1', name: 'Rotary District' }));
  });

  it('Customers: editing a customer persists the change with update(id, patch)', async () => {
    const user = userEvent.setup();
    renderPage(<CustomersPage />);
    expect(await screen.findByText('Canteen Vendor')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getAllByRole('textbox')[0];
    await user.clear(nameInput);
    await user.type(nameInput, 'Canteen Services');
    await user.click(within(dialog).getAllByRole('button').at(-1)!);

    await waitFor(() => expect(store.customers[0]).toMatchObject({ id: 'cu-1', name: 'Canteen Services' }));
  });

  it('Customers: deleting a customer removes it from the database', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage(<CustomersPage />);
    expect(await screen.findByText('Canteen Vendor')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /delete/i }));
    await confirmDialog(user);

    await waitFor(() => expect(store.customers).toHaveLength(0));
    unmount();
    renderPage(<CustomersPage />);
    await waitFor(() => expect(screen.queryByText('Canteen Vendor')).not.toBeInTheDocument());
  });

  it('Communication templates: editing a template persists the change', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage(<CommunicationTemplatesPage />);
    expect(await screen.findByText('Welcome Message')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getAllByRole('textbox')[0];
    await user.clear(nameInput);
    await user.type(nameInput, 'Welcome Back');
    await user.click(within(dialog).getAllByRole('button').at(-1)!);

    await waitFor(() => expect(store.communication_templates[0]).toMatchObject({ id: 'tpl-1', name: 'Welcome Back' }));
    unmount();
    renderPage(<CommunicationTemplatesPage />);
    expect(await screen.findByText('Welcome Back')).toBeInTheDocument();
  });

  it('Message campaigns: shows stored campaigns with resolved display fields and deletes through the database', async () => {
    const user = userEvent.setup();
    renderPage(<MessageCampaignsPage />);
    expect(await screen.findByText('New Term Welcome')).toBeInTheDocument();
    expect(await screen.findByText('Welcome Message')).toBeInTheDocument();
    expect(screen.getByText('Michael Scott')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /delete/i }));
    await confirmDialog(user);
    await waitFor(() => expect(store.message_campaigns).toHaveLength(0));
    await waitFor(() => expect(screen.queryByText('New Term Welcome')).not.toBeInTheDocument());
  });

  it('Student health records: saving a record stores it without the display name and shows it after reload', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage(<StudentHealthRecordsPage />);
    expect(await screen.findByText('Jim Halpert')).toBeInTheDocument();
    expect(screen.getByText('No Record')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button').find((button) => /record|health|edit|manage/i.test(button.textContent ?? ''))!);
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getAllByRole('textbox')[0], 'O+');
    await user.click(within(dialog).getAllByRole('button').at(-1)!);

    await waitFor(() => expect(store.student_health_records).toHaveLength(1));
    expect(store.student_health_records[0]).toMatchObject({ student_id: 'S001', blood_type: 'O+' });
    expect(store.student_health_records[0]).not.toHaveProperty('student_name');

    unmount();
    renderPage(<StudentHealthRecordsPage />);
    expect(await screen.findByText('Record Exists')).toBeInTheDocument();
  });

  it('Student health records: editing a record persists the change with update(id, patch)', async () => {
    store.student_health_records = [
      { id: 'shr-1', student_id: 'S001', blood_type: 'O+', created_at: stamp, updated_at: stamp },
    ];
    const user = userEvent.setup();
    renderPage(<StudentHealthRecordsPage />);
    expect(await screen.findByText('Record Exists')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /manage health record/i }));
    const dialog = await screen.findByRole('dialog');
    const bloodTypeInput = within(dialog).getAllByRole('textbox')[0];
    await user.clear(bloodTypeInput);
    await user.type(bloodTypeInput, 'A-');
    await user.click(within(dialog).getAllByRole('button').at(-1)!);

    await waitFor(() => expect(store.student_health_records[0]).toMatchObject({ id: 'shr-1', blood_type: 'A-' }));
  });
});

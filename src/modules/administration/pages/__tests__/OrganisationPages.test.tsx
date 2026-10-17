// ABOUTME: Page tests for departments, designations, dormitories and student categories (P0-C06, SO-11/23/25):
// ABOUTME: CRUD goes to the database with update(id, patch), and a new department shows up in the staff form.

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import DepartmentsPage from '../DepartmentsPage';
import DesignationsPage from '../DesignationsPage';
import DormitoriesPage from '../DormitoriesPage';
import StudentCategoriesPage from '../StudentCategoriesPage';
import { StaffListContent } from '../StaffListPage';
import { databaseService } from '@/services/database/databaseService';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(),
  },
}));

// None of these pages may read CRUD from the app-wide snapshot: it lacks these mutators (SO-11).
vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => {
    throw new Error('organisation pages must not use useAppData()');
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
      rows = rows.filter((row) => row.id !== id);
      return true;
    }),
  };
}

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
  fireEvent.click(await screen.findByRole('button', { name }));
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
    departments: createMemoryCollection([{ id: 'dep-1', name: 'Technical Studies', is_academic: true, ...stamp }]),
    designations: createMemoryCollection([{ id: 'des-1', title: 'Teacher', ...stamp }]),
    dormitories: createMemoryCollection([{ id: 'dorm-1', name: 'Kilimanjaro', capacity: 40, master_id: 'stf-uuid-1', ...stamp }]),
    student_categories: createMemoryCollection([{ id: 'cat-1', name: 'Boarder' }]),
    staff: createMemoryCollection([
      { id: 'stf-uuid-1', first_name: 'Jane', last_name: 'Wanjiru', is_active: true, ...stamp },
    ]),
  };
  vi.mocked(databaseService.getDatabase).mockResolvedValue({
    getCollection: (name: string) => collection(name),
  } as never);
  vi.mocked(databaseService.generateId).mockImplementation(() => `uuid-${++nextId}`);
});

describe('DepartmentsPage (P0-C06)', () => {
  it('lists departments stored in the database', async () => {
    renderWithProviders(<DepartmentsPage />);
    expect(await screen.findByText('Technical Studies')).toBeInTheDocument();
  });

  it('creates a department in the database and the staff form offers it', async () => {
    const { unmount } = renderWithProviders(<DepartmentsPage />);
    await screen.findByText('Technical Studies');
    const dialog = await openAddDialog(/add ?department/i);
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: 'Languages' } });
    submitDialog(dialog);

    await waitFor(() => expect(collections.departments.rows().map((r) => r.name)).toContain('Languages'));
    const saved = collections.departments.rows().find((r) => r.name === 'Languages')!;
    expect(saved.id).toBe('uuid-1');
    expect(saved.is_academic).toBe(false);
    expect(await screen.findByText('Languages')).toBeInTheDocument();
    unmount();

    renderWithProviders(<StaffListContent />);
    const staffDialog = await openAddDialog(/Add Staff/i);
    const departmentSelect = within(staffDialog).getByLabelText(/^Department/i);
    await waitFor(() =>
      expect(within(departmentSelect).getByRole('option', { name: 'Languages' })).toHaveValue('uuid-1')
    );
  });

  it('edits a department with update(id, patch)', async () => {
    renderWithProviders(<DepartmentsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /^Edit$/i }));
    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getAllByRole('textbox')[0];
    expect(nameInput).toHaveValue('Technical Studies');
    fireEvent.change(nameInput, { target: { value: 'Technical and Applied Studies' } });
    submitDialog(dialog);

    await waitFor(() => expect(collections.departments.update).toHaveBeenCalledTimes(1));
    expect(collections.departments.update).toHaveBeenCalledWith(
      'dep-1',
      expect.objectContaining({ name: 'Technical and Applied Studies', is_academic: true })
    );
    expect(collections.departments.rows()[0].name).toBe('Technical and Applied Studies');
  });

  it('deletes a department from the database after confirmation', async () => {
    renderWithProviders(<DepartmentsPage />);
    await screen.findByText('Technical Studies');
    await confirmDelete();
    await waitFor(() => expect(collections.departments.remove).toHaveBeenCalledWith('dep-1'));
    expect(collections.departments.rows()).toHaveLength(0);
  });
});

describe('DesignationsPage (P0-C06)', () => {
  it('creates, edits and deletes designations in the database', async () => {
    renderWithProviders(<DesignationsPage />);
    await screen.findByText('Teacher');

    const dialog = await openAddDialog(/add ?designation/i);
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: 'Bursar' } });
    submitDialog(dialog);
    await waitFor(() => expect(collections.designations.rows().map((r) => r.title)).toContain('Bursar'));
    await screen.findByText('Bursar');

    fireEvent.click(screen.getAllByRole('button', { name: /^Edit$/i })[0]);
    const editDialog = await screen.findByRole('dialog');
    const titleInput = within(editDialog).getAllByRole('textbox')[0];
    expect(titleInput).toHaveValue('Teacher');
    fireEvent.change(titleInput, { target: { value: 'Senior Teacher' } });
    submitDialog(editDialog);
    await waitFor(() =>
      expect(collections.designations.update).toHaveBeenCalledWith('des-1', expect.objectContaining({ title: 'Senior Teacher' }))
    );
    await screen.findByText('Senior Teacher');

    fireEvent.click(screen.getAllByRole('button', { name: /^Delete$/i })[0]);
    submitDialog(await screen.findByRole('dialog'));
    await waitFor(() => expect(collections.designations.remove).toHaveBeenCalledWith('des-1'));
    expect(collections.designations.rows().map((r) => r.title)).toEqual(['Bursar']);
  });
});

describe('DormitoriesPage (P0-C06)', () => {
  it('resolves the master name from staff at read time', async () => {
    renderWithProviders(<DormitoriesPage />);
    expect(await screen.findByText('Kilimanjaro')).toBeInTheDocument();
    expect(await screen.findByText('Jane Wanjiru')).toBeInTheDocument();
  });

  it('creates a dormitory keeping the staff id a string', async () => {
    renderWithProviders(<DormitoriesPage />);
    await screen.findByText('Kilimanjaro');
    const dialog = await openAddDialog(/add ?dormitory/i);
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: 'Elgon' } });
    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '32' } });
    const masterSelect = within(dialog).getByRole('combobox');
    await waitFor(() => expect(within(masterSelect).getAllByRole('option').length).toBeGreaterThan(1));
    fireEvent.change(masterSelect, { target: { value: 'stf-uuid-1' } });
    submitDialog(dialog);

    await waitFor(() => expect(collections.dormitories.rows().map((r) => r.name)).toContain('Elgon'));
    const saved = collections.dormitories.rows().find((r) => r.name === 'Elgon')!;
    expect(saved.master_id).toBe('stf-uuid-1');
    expect(saved.capacity).toBe(32);
  });

  it('edits with update(id, patch) and deletes by id', async () => {
    renderWithProviders(<DormitoriesPage />);
    fireEvent.click(await screen.findByRole('button', { name: /^Edit$/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: 'Kilimanjaro House' } });
    submitDialog(dialog);
    await waitFor(() =>
      expect(collections.dormitories.update).toHaveBeenCalledWith(
        'dorm-1',
        expect.objectContaining({ name: 'Kilimanjaro House', master_id: 'stf-uuid-1' })
      )
    );
    await screen.findByText('Kilimanjaro House');

    await confirmDelete();
    await waitFor(() => expect(collections.dormitories.remove).toHaveBeenCalledWith('dorm-1'));
  });
});

describe('StudentCategoriesPage (P0-C06)', () => {
  it('creates, edits and deletes student categories in the database', async () => {
    renderWithProviders(<StudentCategoriesPage />);
    await screen.findByText('Boarder');

    const dialog = await openAddDialog(/add ?category/i);
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: 'Bursary' } });
    submitDialog(dialog);
    await waitFor(() => expect(collections.student_categories.rows().map((r) => r.name)).toContain('Bursary'));
    await screen.findByText('Bursary');

    fireEvent.click(screen.getAllByRole('button', { name: /^Edit$/i })[0]);
    const editDialog = await screen.findByRole('dialog');
    fireEvent.change(within(editDialog).getAllByRole('textbox')[0], { target: { value: 'Day Scholar' } });
    submitDialog(editDialog);
    await waitFor(() =>
      expect(collections.student_categories.update).toHaveBeenCalledWith('cat-1', expect.objectContaining({ name: 'Day Scholar' }))
    );
    await screen.findByText('Day Scholar');

    fireEvent.click(screen.getAllByRole('button', { name: /^Delete$/i })[0]);
    submitDialog(await screen.findByRole('dialog'));
    await waitFor(() => expect(collections.student_categories.remove).toHaveBeenCalledWith('cat-1'));
    expect(collections.student_categories.rows().map((r) => r.name)).toEqual(['Bursary']);
  });
});

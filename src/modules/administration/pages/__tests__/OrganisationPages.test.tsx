// ABOUTME: Page tests for the administration collections the registry cannot serve (P0-C06).
// ABOUTME: Dormitories and student categories keep their own collections; the canonical
// ABOUTME: departments and designations are covered by canonicalAdministration.test.tsx.

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import DormitoriesPage from '../DormitoriesPage';
import StudentCategoriesPage from '../StudentCategoriesPage';
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

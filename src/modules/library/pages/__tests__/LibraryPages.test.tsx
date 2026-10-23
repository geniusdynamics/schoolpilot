// ABOUTME: Page smoke tests for library categories and fines (P0-H02, SO-11/23/24):
// ABOUTME: pages use the library module hook, write with update(id, patch) and read loans from `loans`.

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { ToastProvider } from '@/hooks/useToast';
import BookCategoriesPage from '../BookCategoriesPage';
import FinesPage from '../FinesPage';
import { useLibraryData } from '../../data/useLibraryData';
import { databaseService } from '@/services/database/databaseService';
import BookLoansPage from '../BookLoansPage';
import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { createFakeRepository, type FakeRepository } from '@/modules/hr/data/__tests__/canonicalRepositoryDouble';

const USER_UUID = '874b9758-3d4e-4f1a-9b3c-0d1e2f3a4b5c';
const STAFF_UUID = '874b9758-1f2e-4c1a-9d3e-0a1b2c3d4e5f';
let repository: FakeRepository;

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(),
  },
}));

// Library pages must not read CRUD from the app-wide snapshot: it lacks these mutators (SO-11).
// The catalogue reads (books, loans, fines) stay there until the registry models them.
vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({
    books: [],
    loading: {},
  }),
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
let requested: string[];
let nextId = 0;

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <ConfirmProvider>
          <CanonicalRepositoryProvider repository={repository}>{ui}</CanonicalRepositoryProvider>
        </ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>
  );

const submitDialog = (dialog: HTMLElement) => {
  const buttons = within(dialog).getAllByRole('button');
  fireEvent.click(buttons[buttons.length - 1]);
};

beforeEach(() => {
  nextId = 0;
  requested = [];
  repository = createFakeRepository({
    user: [
      {
        id: USER_UUID,
        institution_id: '00000000-0000-7000-8000-000000000001',
        username: 'amani',
        password_hash: 'hash',
        status: 'active',
        mfa: false,
        person_ref: { type: 'staff', id: STAFF_UUID },
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    staff: [
      {
        id: STAFF_UUID,
        institution_id: '00000000-0000-7000-8000-000000000001',
        given_name: 'Amani',
        family_name: 'Otieno',
        name_order: 'given_first',
        gender: 'female',
        employee_number: 'EMP-2',
        employment_type: 'permanent',
        department_ids: [],
        start_date: '2020-01-01',
        homeroom_teacher_ids: [],
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  });
  collections = {
    book_categories: createMemoryCollection([{ id: 'bc-1', name: 'Fiction' }]),
    books: createMemoryCollection(),
    loans: createMemoryCollection([
      {
        id: 'loan-1',
        book_id: 'book-1',
        user_id: 'user-1',
        book_title: 'Kidagaa Kimemwozea',
        user_name: 'Amani Otieno',
        loan_date: '2026-09-01',
        due_date: '2026-09-15',
      },
    ]),
    library_members: createMemoryCollection(),
    fines: createMemoryCollection([
      { id: 'fine-1', loan_id: 'loan-1', amount: 50, reason: 'Overdue Book', status: 'Pending' },
    ]),
  };
  vi.mocked(databaseService.getDatabase).mockResolvedValue({
    getCollection: (name: string) => {
      requested.push(name);
      return collections[name] ?? null;
    },
  } as never);
  vi.mocked(databaseService.generateId).mockImplementation(() => `uuid-${++nextId}`);
});

describe('useLibraryData (P0-H02)', () => {
  it('reads loans from the canonical `loans` collection, not the book_loans alias', async () => {
    const { result } = renderHook(() => useLibraryData());
    await waitFor(() => expect(result.current.loans).toHaveLength(1));
    expect(result.current.bookLoans).toHaveLength(1);
    expect(requested).toContain('loans');
    expect(requested).toContain('library_members');
    expect(requested).not.toContain('book_loans');
  });
});

describe('BookCategoriesPage (P0-H02)', () => {
  it('lists, creates, edits with update(id, patch) and deletes categories in the database', async () => {
    renderWithProviders(<BookCategoriesPage />);
    expect(await screen.findByText('Fiction')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add ?category|addCategory/i }));
    let dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: 'Science' } });
    submitDialog(dialog);
    await waitFor(() => expect(collections.book_categories.rows().map((r) => r.name)).toContain('Science'));
    expect(collections.book_categories.rows().find((r) => r.name === 'Science')!.id).toBe('uuid-1');
    expect(await screen.findByText('Science')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^Edit$/i })[0]);
    dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getAllByRole('textbox')[0];
    expect(nameInput).toHaveValue('Fiction');
    fireEvent.change(nameInput, { target: { value: 'Literature' } });
    submitDialog(dialog);
    await waitFor(() =>
      expect(collections.book_categories.update).toHaveBeenCalledWith('bc-1', expect.objectContaining({ name: 'Literature' }))
    );

    fireEvent.click(screen.getAllByRole('button', { name: /^Delete$/i })[0]);
    dialog = await screen.findByRole('dialog');
    submitDialog(dialog);
    await waitFor(() => expect(collections.book_categories.remove).toHaveBeenCalledWith('bc-1'));
  });

  it('keeps the categories explanation on the card heading instead of a description row', async () => {
    renderWithProviders(<BookCategoriesPage />);
    await screen.findByText('Fiction');

    // The sentence moved off the card body onto the heading, reachable from the info hint.
    expect(screen.getByRole('button', { name: 'About this section' })).toBeInTheDocument();
    expect(screen.getByText('bookCategories.defineCategories')).toBeInTheDocument();
  });
});

describe('BookLoansPage (P1-E05)', () => {
  it('picks the borrower from the canonical users', async () => {
    renderWithProviders(<BookLoansPage />);
    fireEvent.click(await screen.findByRole('button', { name: /issue|loan|add/i }));
    const dialog = await screen.findByRole('dialog');
    const picker = within(dialog).getByTestId('book-loan-borrower-picker');
    fireEvent.click(picker);
    fireEvent.click(await screen.findByRole('option', { name: /Amani Otieno/ }));
    await waitFor(() =>
      expect(within(dialog).getByTestId('book-loan-borrower-picker')).toHaveTextContent(/Amani Otieno/)
    );
  });
});

describe('FinesPage (P0-H02)', () => {
  it('lists fines, offers loans from the database and updates status with update(id, patch)', async () => {
    renderWithProviders(<FinesPage />);
    expect(await screen.findByText('fine-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Update Status/i }));
    const dialog = await screen.findByRole('dialog');
    const selects = within(dialog).getAllByRole('combobox');
    expect(within(selects[0]).getByRole('option', { name: /Kidagaa Kimemwozea/ })).toHaveValue('loan-1');

    fireEvent.change(selects[selects.length - 1], { target: { name: 'status', value: 'Paid' } });
    submitDialog(dialog);
    await waitFor(() =>
      expect(collections.fines.update).toHaveBeenCalledWith('fine-1', expect.objectContaining({ status: 'Paid' }))
    );
    expect(collections.fines.rows()[0].status).toBe('Paid');
  });
});

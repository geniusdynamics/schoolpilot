// ABOUTME: Page tests for the student directory's guardian persistence and read-time name resolution.
// ABOUTME: Covers Add/Edit writing guardian + relationship rows, Edit pre-fill, and class/stream/guardian columns for UI-created learners.

import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import StudentsListPage from '../pages/StudentsListPage';
import { useAppData } from '@/hooks/useAppData';
import { ToastProvider } from '@/hooks/useToast';
import { PersonGender, StudentStatus } from '@/types';

vi.mock('@/hooks/useAppData');
// The screen-reader announcer removes its node on a 1s real timer; when that fires after the jsdom
// environment is torn down it throws "document is not defined". It is not under test here.
vi.mock('@/utils/accessibility', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/accessibility')>()),
  announceToScreenReader: vi.fn(),
}));
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

const CLASS_ID = '0c9e7c1a-1111-4aaa-8bbb-000000000001';
const STREAM_ID = '874b9758-2222-4ccc-8ddd-000000000002';
const OTHER_STREAM_ID = '5d1f0e22-3333-4eee-8fff-000000000003';
const STUDENT_ID = '9a8b7c6d-4444-4111-8222-000000000004';
const GUARDIAN_ID = 'f1e2d3c4-5555-4333-8444-000000000005';

type Collection = {
  data: any[];
  loading: boolean;
  error: null;
  refresh: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  collection: null;
};

const collections: Record<string, Collection> = {};
const makeCollection = (data: any[] = []): Collection => ({
  data,
  loading: false,
  error: null,
  refresh: vi.fn().mockResolvedValue(undefined),
  insert: vi.fn().mockImplementation(async (doc: any) => doc),
  update: vi.fn().mockImplementation(async (id: string, doc: any) => ({ id, ...doc })),
  remove: vi.fn().mockResolvedValue(true),
  collection: null,
});

vi.mock('@/hooks/useDatabaseCollection', () => ({
  useDatabaseCollection: (name: string) => {
    if (!collections[name]) collections[name] = makeCollection();
    return collections[name];
  },
}));

const render = (ui: React.ReactElement) => rtlRender(<ToastProvider>{ui}</ToastProvider>);
const mockUseAppData = vi.mocked(useAppData);

/** A learner created in the UI: string UUID ids and no denormalised *_name or embedded guardian. */
const uiStudent = {
  id: STUDENT_ID,
  admission_no: 'UI-001',
  first_name: 'Amani',
  last_name: 'Wekesa',
  gender: PersonGender.FEMALE,
  status: StudentStatus.ACTIVE,
  current_class_stream_id: STREAM_ID,
  created_at: '2027-01-10T08:00:00.000Z',
  updated_at: '2027-01-10T08:00:00.000Z',
};

let addStudent: ReturnType<typeof vi.fn>;
let updateStudent: ReturnType<typeof vi.fn>;

function seedCollections() {
  for (const key of Object.keys(collections)) delete collections[key];
  collections.classes = makeCollection([{ id: CLASS_ID, name: 'Grade 7' }]);
  collections.class_streams = makeCollection([
    { id: STREAM_ID, class_id: CLASS_ID, name: 'Blue' },
    { id: OTHER_STREAM_ID, class_id: CLASS_ID, name: 'Green' },
  ]);
  collections.student_categories = makeCollection([]);
  collections.dormitories = makeCollection([]);
  collections.parents_guardians = makeCollection([
    { id: GUARDIAN_ID, name: 'Probe Guardian', phone: '0700000000', relationship_type: 'Mother' },
  ]);
  collections.student_guardian_relationships = makeCollection([
    { id: 'rel-1', student_id: STUDENT_ID, guardian_id: GUARDIAN_ID, relationship_type: 'Mother', is_primary: true },
  ]);
}

beforeEach(() => {
  seedCollections();
  addStudent = vi.fn().mockImplementation(async (data: any) => data);
  updateStudent = vi.fn().mockImplementation(async (_id: string, data: any) => data);
  mockUseAppData.mockReturnValue({
    students: [uiStudent],
    classStreams: [],
    studentCategories: [],
    dormitories: [],
    loading: { students: false, all: false },
    addStudent,
    updateStudent,
    deleteStudent: vi.fn(),
  } as any);
});

const clickSubmit = (name: string) => {
  const buttons = screen.getAllByRole('button', { name });
  fireEvent.click(buttons[buttons.length - 1]);
};

describe('StudentsListPage — guardians and read-time names', () => {
  it('shows class, stream and guardian for a UI-created learner', () => {
    render(<StudentsListPage />);

    expect(screen.getByText('Amani Wekesa')).toBeInTheDocument();
    expect(screen.getByText('Grade 7')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Probe Guardian')).toBeInTheDocument();
  });

  it('Add Student persists a guardian row and a primary relationship linked to the new learner', async () => {
    render(<StudentsListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Student' }));
    await screen.findByText('Add New Student');

    fireEvent.change(screen.getByLabelText('Admission No.'), { target: { value: 'PROBE-1' } });
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Probe' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Learner' } });

    fireEvent.click(screen.getByRole('tab', { name: /Guardian Details/ }));
    fireEvent.change(screen.getByLabelText('Guardian Full Name'), { target: { value: 'New Guardian' } });
    fireEvent.change(screen.getByLabelText('Relationship Type'), { target: { value: 'Mother' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '0711111111' } });

    fireEvent.click(screen.getByRole('tab', { name: /Academic Details/ }));
    fireEvent.change(screen.getByLabelText('Class Stream'), { target: { value: OTHER_STREAM_ID } });
    clickSubmit('Add Student');

    await waitFor(() => expect(collections.student_guardian_relationships.insert).toHaveBeenCalled());

    expect(addStudent).toHaveBeenCalledTimes(1);
    const studentPayload = addStudent.mock.calls[0][0];
    expect(typeof studentPayload.id).toBe('string');
    expect(studentPayload.current_class_stream_id).toBe(OTHER_STREAM_ID);
    expect(studentPayload).not.toHaveProperty('current_class_name');

    const guardianRow = collections.parents_guardians.insert.mock.calls[0][0];
    expect(guardianRow).toMatchObject({ name: 'New Guardian', phone: '0711111111', relationship_type: 'Mother' });

    const relationshipRow = collections.student_guardian_relationships.insert.mock.calls[0][0];
    expect(relationshipRow).toMatchObject({
      student_id: studentPayload.id,
      guardian_id: guardianRow.id,
      relationship_type: 'Mother',
      is_primary: true,
    });
  });

  it('Edit pre-fills the existing guardian and updates it instead of creating a duplicate', async () => {
    render(<StudentsListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await screen.findByText('Edit Student');

    fireEvent.click(screen.getByRole('tab', { name: /Guardian Details/ }));
    const nameInput = screen.getByLabelText('Guardian Full Name') as HTMLInputElement;
    expect(nameInput.value).toBe('Probe Guardian');
    expect((screen.getByLabelText('Phone Number') as HTMLInputElement).value).toBe('0700000000');
    expect((screen.getByLabelText('Relationship Type') as HTMLSelectElement).value).toBe('Mother');

    fireEvent.change(nameInput, { target: { value: 'Probe Guardian Renamed' } });
    fireEvent.click(screen.getByRole('tab', { name: /Academic Details/ }));
    expect((screen.getByLabelText('Class Stream') as HTMLSelectElement).value).toBe(STREAM_ID);
    clickSubmit('Save Changes');

    await waitFor(() => expect(collections.parents_guardians.update).toHaveBeenCalled());
    expect(collections.parents_guardians.update).toHaveBeenCalledWith(
      GUARDIAN_ID,
      expect.objectContaining({ name: 'Probe Guardian Renamed' }),
    );
    expect(collections.parents_guardians.insert).not.toHaveBeenCalled();
    expect(collections.student_guardian_relationships.insert).not.toHaveBeenCalled();
    expect(updateStudent).toHaveBeenCalledWith(STUDENT_ID, expect.objectContaining({ current_class_stream_id: STREAM_ID }));
  });
});

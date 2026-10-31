// ABOUTME: Page tests for the academics configuration pages that still read the legacy module
// ABOUTME: context (P0-F04, SO-11/22/23): grading schemes, education systems, timetable entries
// ABOUTME: and exam sessions persist with string (UUID) ids.

import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { databaseService } from '@/services/database/databaseService';
import { AdministrationDataProvider } from '@/modules/administration/data/AdministrationDataContext';
import { AcademicDataProvider } from '@/modules/academics/data/AcademicDataContext';
import GradingSchemesPage from '../GradingSchemesPage';
import EducationSystemsPage from '../EducationSystemsPage';
import TimetableEntriesPage from '../TimetableEntriesPage';
import ExamSessionsPage from '../ExamSessionsPage';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(),
  },
}));

// These pages must not read CRUD from the app-wide snapshot: it lacks these mutators (SO-11).
vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => {
    throw new Error('academics configuration pages must not use useAppData()');
  },
}));

// The configuration editor is a large wizard; a stub that saves a renamed copy is enough to test the page's wiring.
vi.mock('../EducationSystemConfigPage', () => ({
  EducationSystemConfigPageContent: ({ editingSystem, onSave }: { editingSystem: { name?: string } | null; onSave: (s: unknown) => void }) => (
    <button type="button" onClick={() => onSave({ ...(editingSystem ?? {}), name: `${editingSystem?.name ?? 'New'} (edited)` })}>
      stub-save-system
    </button>
  ),
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

const renderPage = (ui: React.ReactElement) =>
  render(
    <AdministrationDataProvider>
      <AcademicDataProvider>{ui}</AcademicDataProvider>
    </AdministrationDataProvider>
  );

const selectByName = (name: string) => document.querySelector(`select[name="${name}"]`) as HTMLSelectElement;
const optionLabels = (select: HTMLSelectElement) => Array.from(select.options).filter((o) => o.value).map((o) => o.textContent?.trim());

// UUID-style ids, as created through the UI (seed data uses "1", "2" which hides coercion bugs).
const YEAR = '0192a1b2-0000-7000-8000-00000000a001';
const TERM = '0192a1b2-0000-7000-8000-00000000b001';
const CLASS = '0192a1b2-0000-7000-8000-00000000c001';
const STREAM = '874b9758-0000-7000-8000-00000000d001';
const SUBJECT = '0192a1b2-0000-7000-8000-00000000e001';
const SUBJECT_2 = '0192a1b2-0000-7000-8000-00000000e002';
const STUDENT = '0192a1b2-0000-7000-8000-00000000f001';
const TEACHER = '0192a1b2-0000-7000-8000-000000001001';
const ALLOCATION = '0192a1b2-0000-7000-8000-000000002001';
const PERIOD = '0192a1b2-0000-7000-8000-000000003001';

beforeEach(() => {
  nextId = 0;
  localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  collections = {
    academic_years: createMemoryCollection([{ id: YEAR, name: '2026' }]),
    academic_period_definitions: createMemoryCollection([{ id: 'apd-1', name: 'Term 1' }]),
    school_periods: createMemoryCollection([
      { id: TERM, academic_year_id: YEAR, period_definition_id: 'apd-1', start_date: '2026-01-05', end_date: '2026-04-03', is_active: true },
    ]),
    classes: createMemoryCollection([{ id: CLASS, name: 'Grade 7' }]),
    class_streams: createMemoryCollection([{ id: STREAM, class_id: CLASS, name: 'East' }]),
    subjects: createMemoryCollection([
      { id: SUBJECT, name: 'Mathematics', subject_code: 'MAT' },
      { id: SUBJECT_2, name: 'English', subject_code: 'ENG' },
    ]),
    students: createMemoryCollection([
      { id: STUDENT, first_name: 'Amani', last_name: 'Otieno', admission_no: 'A001', current_class_stream_id: STREAM, status: 'Active' },
    ]),
    staff: createMemoryCollection([
      { id: TEACHER, first_name: 'Jane', last_name: 'Wanjiru', is_active: true, designation_title: 'Teacher' },
    ]),
  };
  vi.mocked(databaseService.getDatabase).mockResolvedValue({
    getCollection: (name: string) => collection(name),
  } as never);
  vi.mocked(databaseService.generateId).mockImplementation(() => `uuid-${++nextId}`);
});

describe('GradingSchemesPage (P0-F04)', () => {
  it('creates a scheme, adds a level and deletes the scheme in the database', async () => {
    renderPage(<GradingSchemesPage />);
    fireEvent.click(await screen.findByRole('button', { name: /add grading scheme/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/scheme name/i), { target: { value: 'KCSE' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /add scheme/i }));

    await waitFor(() => expect(collections.grading_schemes.rows()).toHaveLength(1));
    expect(collections.grading_schemes.rows()[0]).toMatchObject({ name: 'KCSE', is_default: false, levels: [] });
    expect(await screen.findByText('KCSE')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /manage levels/i }));
    const levels = await screen.findByRole('dialog');
    fireEvent.change(within(levels).getByLabelText(/grade \(e\.g\./i), { target: { value: 'A' } });
    fireEvent.change(within(levels).getByLabelText(/minimum score/i), { target: { value: '80' } });
    fireEvent.click(within(levels).getByRole('button', { name: /add level/i }));

    await waitFor(() => expect(collections.grading_schemes.update).toHaveBeenCalledWith('uuid-1', expect.objectContaining({
      levels: [expect.objectContaining({ grade: 'A', min_score: 80, scheme_id: 'uuid-1' })],
    })));
    const savedLevel = (collections.grading_schemes.rows()[0].levels as Array<{ id: unknown }>)[0];
    expect(typeof savedLevel.id).toBe('string');

    fireEvent.click(within(levels).getByRole('button', { name: /done/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(collections.grading_schemes.rows()).toHaveLength(0));
  });
});

describe('EducationSystemsPage (P0-F04)', () => {
  it('edits a system with update(id, patch) and clones it', async () => {
    renderPage(<EducationSystemsPage />);
    const editButtons = await screen.findAllByRole('button', { name: /^edit$/i });
    const firstName = (await screen.findAllByRole('row'))[1].querySelector('td')?.textContent ?? '';
    fireEvent.click(editButtons[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'stub-save-system' }));

    expect(await screen.findByText(`${firstName} (edited)`)).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem('education_system_configurations') || '[]');
    expect(stored.filter((s: { name: string }) => s.name === `${firstName} (edited)`)).toHaveLength(1);

    const countBefore = stored.length;
    fireEvent.click(screen.getAllByRole('button', { name: /clone/i })[0]);
    await waitFor(() => {
      const after = JSON.parse(localStorage.getItem('education_system_configurations') || '[]');
      expect(after).toHaveLength(countBefore + 1);
    });
  });
});

describe('TimetableEntriesPage (P0-F04)', () => {
  beforeEach(() => {
    collections.timetable_period_definitions = createMemoryCollection([
      { id: PERIOD, period_name: 'Lesson 1', start_time: '08:00', end_time: '08:40' },
    ]);
    collections.class_subject_allocations = createMemoryCollection([
      { id: ALLOCATION, class_stream_id: STREAM, subject_id: SUBJECT, academic_year_id: YEAR },
      { id: 'alloc-eng', class_stream_id: STREAM, subject_id: SUBJECT_2, academic_year_id: YEAR },
    ]);
    collections.teacher_subject_assignments = createMemoryCollection([
      { id: 'tsa-1', allocation_id: ALLOCATION, teacher_id: TEACHER },
      { id: 'tsa-2', allocation_id: 'alloc-eng', teacher_id: TEACHER },
    ]);
  });

  it('adds and edits a slot for a UUID stream with string ids', async () => {
    renderPage(<TimetableEntriesPage />);
    const streamPicker = await screen.findByLabelText('Select Class Stream');
    await waitFor(() => expect(optionLabels(streamPicker as HTMLSelectElement)).toEqual(['Grade 7 - East']));
    fireEvent.change(streamPicker, { target: { value: STREAM } });

    const addButtons = await screen.findAllByRole('button', { name: '' });
    fireEvent.click(addButtons[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(selectByName('subject_id'), { target: { value: SUBJECT } });
    fireEvent.click(await screen.findByRole('combobox', { name: 'Teacher' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Jane Wanjiru' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /add slot/i }));

    await waitFor(() => expect(collections.timetable_entries.rows()).toHaveLength(1));
    expect(collections.timetable_entries.rows()[0]).toMatchObject({
      class_stream_id: STREAM,
      period_id: PERIOD,
      subject_id: SUBJECT,
      teacher_id: TEACHER,
      day_of_week: 'MONDAY',
    });
    expect(await screen.findByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('Jane Wanjiru')).toBeInTheDocument();

    // The filled slot's first icon button is Edit.
    fireEvent.click(screen.getAllByRole('button', { name: '' })[0]);
    const editDialog = await screen.findByRole('dialog');
    fireEvent.change(selectByName('subject_id'), { target: { value: SUBJECT_2 } });
    fireEvent.click(await screen.findByRole('combobox', { name: 'Teacher' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Jane Wanjiru' }));
    fireEvent.click(within(editDialog).getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(collections.timetable_entries.update).toHaveBeenCalledWith('uuid-1', expect.objectContaining({
      subject_id: SUBJECT_2,
      teacher_id: TEACHER,
    })));
    expect(await screen.findByText('English')).toBeInTheDocument();
  });
});

describe('ExamSessionsPage (P0-F04)', () => {
  it('creates a session for a UUID school period and stores the id unchanged', async () => {
    renderPage(<ExamSessionsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Exam Session' }));
    await screen.findByRole('dialog');
    await waitFor(() => expect(optionLabels(selectByName('school_period_id'))).toEqual(['Term 1']));
    fireEvent.change(screen.getByLabelText(/^Exam Session Name/), { target: { value: 'End Term' } });
    fireEvent.change(selectByName('school_period_id'), { target: { value: TERM } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Session' }));

    await waitFor(() => expect(collections.exam_sessions.rows()).toHaveLength(1));
    expect(collections.exam_sessions.rows()[0]).toMatchObject({ name: 'End Term', school_period_id: TERM });
  });
});

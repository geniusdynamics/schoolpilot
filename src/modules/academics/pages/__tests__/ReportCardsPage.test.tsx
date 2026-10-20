// ABOUTME: Page test for report cards: choose an exam and a class stream, preview a card per learner, print them.
// ABOUTME: Reads live collections through a fake databaseService seeded from the shared report-card fixtures.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { buildClassFixture, STREAM_ID } from '../../components/reportCard/__tests__/fixtures';

const COLLECTIONS = [
  'school_details', 'students', 'class_streams', 'exam_sessions', 'student_exam_results',
  'subjects', 'subject_papers', 'grading_schemes', 'student_attendance', 'school_periods',
];

const fake = await vi.hoisted(async () => {
  const { createFakeDatabaseService } = await import('@/tests/utils/schoolDetailsDb');
  return {
    current: createFakeDatabaseService([
      'school_details', 'students', 'class_streams', 'exam_sessions', 'student_exam_results',
      'subjects', 'subject_papers', 'grading_schemes', 'student_attendance', 'school_periods',
    ]),
  };
});
vi.mock('@/services/database/databaseService', () => ({ databaseService: fake.current.databaseService }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string | Record<string, unknown>, opts?: Record<string, unknown>) => {
      const text = typeof fallback === 'string' ? fallback : _key;
      const vars = (typeof fallback === 'object' ? fallback : opts) ?? {};
      return text.replace(/\{\{(\w+)\}\}/g, (_m, k) => String(vars[k] ?? ''));
    },
  }),
}));

import ReportCardsPage from '../ReportCardsPage';

function seed(learners: number) {
  const src = buildClassFixture(learners);
  const c = fake.current.collections;
  c.school_details.seed([src.school as Record<string, unknown> & { id: string }]);
  c.students.seed(src.students);
  c.class_streams.seed(src.classStreams);
  c.exam_sessions.seed([src.examSession!]);
  c.student_exam_results.seed(src.results);
  c.subjects.seed(src.subjects);
  c.subject_papers.seed(src.subjectPapers);
  c.grading_schemes.seed(src.gradingSchemes);
  c.student_attendance.seed(src.attendance.map((a, i) => ({ ...a, id: a.id ?? `a${i}` })));
  c.school_periods.seed(src.schoolPeriods);
}

describe('ReportCardsPage', () => {
  beforeEach(() => COLLECTIONS.forEach((n) => fake.current.collections[n].seed([])));
  afterEach(() => vi.restoreAllMocks());

  const choose = async () => {
    await screen.findByRole('option', { name: 'End of Term 1' });
    fireEvent.change(screen.getByLabelText('Exam'), { target: { value: 'session-1' } });
    await screen.findByRole('option', { name: 'Grade 7 Blue' });
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: STREAM_ID } });
  };

  it('asks for an exam and a class before showing report cards', async () => {
    seed(2);
    render(<ReportCardsPage />);
    expect(await screen.findByText('Choose an exam and a class to prepare report cards.')).toBeTruthy();
    expect(screen.queryByTestId('report-card')).toBeNull();
  });

  it('shows one report card per learner in the class and prints them', async () => {
    seed(3);
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(<ReportCardsPage />);
    await choose();
    const cards = await screen.findAllByTestId('report-card');
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByText('Greenfields Academy')).toBeTruthy();
    expect(within(cards[0]).getByText('Learner1 Pupil')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Print 3 report cards/ }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('applies the head teacher remark to every card and narrows to one learner', async () => {
    seed(3);
    render(<ReportCardsPage />);
    await choose();
    await screen.findAllByTestId('report-card');
    fireEvent.change(screen.getByLabelText("Head teacher's comment"), { target: { value: 'Well done.' } });
    await waitFor(() => expect(screen.getAllByText('Well done.', { selector: 'p' })).toHaveLength(3));
    fireEvent.change(screen.getByLabelText('Learner'), { target: { value: 'stu-2' } });
    await waitFor(() => expect(screen.getAllByTestId('report-card')).toHaveLength(1));
    expect(screen.getByText('Learner2 Pupil', { selector: 'div' })).toBeTruthy();
  });

  it('prepares a class of 40 for printing in well under 30 seconds', async () => {
    seed(40);
    vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(<ReportCardsPage />);
    const started = performance.now();
    await choose();
    expect(await screen.findAllByTestId('report-card')).toHaveLength(40);
    fireEvent.click(screen.getByRole('button', { name: /Print 40 report cards/ }));
    expect(performance.now() - started).toBeLessThan(30000);
  });
});

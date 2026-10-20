// ABOUTME: Component tests for Student Promotion (SO-16): preview lists the class, confirm commits the selection, undo reverts it.
// ABOUTME: The run functions are covered with real collection semantics in hooks/__tests__/studentPromotionRun.test.ts.

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentPromotionPage from '../StudentPromotionPage';

const mockUseAppData = vi.fn();
const showSuccess = vi.fn();
const showError = vi.fn();
const showWarning = vi.fn();
const commit = vi.fn();
const undo = vi.fn();
const confirm = vi.fn();

vi.mock('@/hooks/useAppData', () => ({ useAppData: () => mockUseAppData() }));
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showSuccess, showError, showWarning, showInfo: vi.fn() }),
}));
vi.mock('@/components/ui/ConfirmDialog', () => ({ useConfirm: () => confirm }));
vi.mock('../../hooks/useStudentPromotion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useStudentPromotion')>();
  return { ...actual, useStudentPromotion: () => ({ ready: true, commit, undo, getStudentClassHistory: vi.fn() }) };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      const values = typeof fallback === 'object' ? fallback : {};
      const template = typeof fallback === 'string' ? fallback : String(values.defaultValue ?? key);
      return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name] ?? ''));
    },
    i18n: { language: 'en' },
  }),
}));

const appData = {
  // The context exposes per-collection loading flags; `all` is the only whole-page signal.
  loading: { all: false, students: false, classes: false, classStreams: false, academicYears: false },
  classes: [{ id: 'C-7', name: 'Grade 7' }, { id: 'C-8', name: 'Grade 8' }],
  classStreams: [{ id: 'S-7B', name: 'Blue', class_id: 'C-7' }, { id: 'S-8B', name: 'Blue', class_id: 'C-8' }],
  academicYears: [{ id: 'AY-2026', name: '2026' }],
  students: [
    { id: 'ST-1', first_name: 'Amani', last_name: 'Otieno', admission_no: 'A1', status: 'Active', current_class_stream_id: 'S-7B' },
    { id: 'ST-2', first_name: 'Chebet', last_name: 'Kip', admission_no: 'A2', status: 'Suspended', current_class_stream_id: 'S-7B' },
    { id: 'ST-3', first_name: 'Dalia', last_name: 'Njeri', admission_no: 'A3', status: 'Active', current_class_stream_id: 'S-8B' },
  ],
};

const run = {
  academicYearId: 'AY-2026',
  promotionDate: '2026-01-05',
  entries: [{ studentId: 'ST-1', previousClassStreamId: 'S-7B', newClassStreamId: 'S-8B', newHistoryId: 'H-1', closedHistoryIds: [] }],
  failures: [],
};

describe('StudentPromotionPage (SO-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppData.mockReturnValue(appData);
    confirm.mockResolvedValue(true);
    commit.mockResolvedValue(run);
    undo.mockResolvedValue({ restored: 1, failures: [] });
  });

  it('renders the promotion form when loading is the per-collection record at rest', () => {
    render(<StudentPromotionPage />);

    // Guard regression: `loading` is an object, so truthiness alone would keep the page on the spinner forever.
    expect(screen.getByRole('heading', { name: 'Promote a class' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps the spinner while the page-wide loading flag is set', () => {
    mockUseAppData.mockReturnValue({ ...appData, loading: { ...appData.loading, all: true } });
    render(<StudentPromotionPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Promote a class' })).not.toBeInTheDocument();
  });

  it('previews the class with string ids, commits eligible learners, then undoes the run', async () => {
    render(<StudentPromotionPage />);

    fireEvent.change(screen.getByLabelText('Current class'), { target: { value: 'S-7B' } });
    fireEvent.change(screen.getByLabelText('Promote to'), { target: { value: 'S-8B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByText('A1 · Amani Otieno')).toBeInTheDocument();
    expect(screen.getByText('Status is Suspended')).toBeInTheDocument();
    expect(screen.queryByText(/Dalia/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Grade 8 · Blue').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Promote 1 learners/ }));

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    const [rows, options] = commit.mock.calls[0];
    expect(rows.map((r: { studentId: string }) => r.studentId)).toEqual(['ST-1']);
    expect(options.academicYearId).toBe('AY-2026');
    expect(showSuccess).toHaveBeenCalledWith('1 learners promoted.');

    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(undo).toHaveBeenCalledWith(run));
    expect(showSuccess).toHaveBeenLastCalledWith('1 learners returned to their previous class.');
  });

  it('does not commit when the confirmation is declined', async () => {
    confirm.mockResolvedValue(false);
    render(<StudentPromotionPage />);

    fireEvent.change(screen.getByLabelText('Current class'), { target: { value: 'S-7B' } });
    fireEvent.change(screen.getByLabelText('Promote to'), { target: { value: 'S-8B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('button', { name: /Promote 1 learners/ }));

    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(commit).not.toHaveBeenCalled();
  });
});

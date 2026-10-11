// ABOUTME: Component tests for Bulk Stream Creation (SO-06): real classes only, correct payloads, duplicate guard.
// ABOUTME: Also covers the corrupt-stream repair panel, which reassigns students before deleting streams.

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BulkStreamCreationPage from '../BulkStreamCreationPage';

const mockUseAppData = vi.fn();
const showSuccess = vi.fn();
const showError = vi.fn();
const showWarning = vi.fn();

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => mockUseAppData(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showSuccess, showError, showWarning, showInfo: vi.fn() }),
}));

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

const addClassStream = vi.fn();
const updateStudent = vi.fn();
const deleteClassStream = vi.fn();

const buildAppData = (overrides: Record<string, unknown> = {}) => ({
  classes: [
    { id: 'CLS-7', name: 'Grade 7' },
    { id: 'CLS-8', name: 'Grade 8' },
  ],
  classStreams: [{ id: 'S-1', name: 'Blue', class_id: 'CLS-7' }],
  students: [],
  addClassStream,
  updateStudent,
  deleteClassStream,
  ...overrides,
});

const classSelect = () => screen.getByLabelText(/Select Class/i) as HTMLSelectElement;

const enterStreamNames = (names: string[]) => {
  names.forEach((name, index) => {
    if (index > 0) fireEvent.click(screen.getByRole('button', { name: /Add Stream Field/i }));
    const inputs = screen.getAllByPlaceholderText(/name \(e\.g\./i);
    fireEvent.change(inputs[index], { target: { value: name } });
  });
};

describe('BulkStreamCreationPage (SO-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addClassStream.mockResolvedValue(undefined);
    updateStudent.mockResolvedValue(undefined);
    deleteClassStream.mockResolvedValue(undefined);
    mockUseAppData.mockReturnValue(buildAppData());
  });

  it('offers only the real classes, without hard-coded Form 1-4 options', () => {
    render(<BulkStreamCreationPage />);

    const options = within(classSelect()).getAllByRole('option').map(o => o.textContent);
    expect(options).toEqual(['-- Select a class --', 'Grade 7', 'Grade 8']);
    expect(screen.queryByText(/^Form [1-4]$/)).toBeNull();
  });

  it('creates each stream with name and class_id in a single argument', async () => {
    render(<BulkStreamCreationPage />);

    fireEvent.change(classSelect(), { target: { value: 'CLS-8' } });
    enterStreamNames(['Blue', ' Green ']);
    fireEvent.click(screen.getByRole('button', { name: /Create 2 Stream/i }));

    await waitFor(() => expect(addClassStream).toHaveBeenCalledTimes(2));
    expect(addClassStream).toHaveBeenNthCalledWith(1, { class_id: 'CLS-8', name: 'Blue' });
    expect(addClassStream).toHaveBeenNthCalledWith(2, { class_id: 'CLS-8', name: 'Green' });
    expect(await screen.findByText('Green')).toBeInTheDocument();
  });

  it('skips names that already exist in the class or repeat in the form', async () => {
    render(<BulkStreamCreationPage />);

    fireEvent.change(classSelect(), { target: { value: 'CLS-7' } });
    enterStreamNames(['blue', 'Green', 'green']);
    fireEvent.click(screen.getByRole('button', { name: /Create 1 Stream/i }));

    await waitFor(() => expect(addClassStream).toHaveBeenCalledTimes(1));
    expect(addClassStream).toHaveBeenCalledWith({ class_id: 'CLS-7', name: 'Green' });
    expect(showWarning).toHaveBeenCalled();
  });

  it('hides the repair panel when no stream is corrupt', () => {
    render(<BulkStreamCreationPage />);
    expect(screen.queryByText(/Corrupt streams/i)).toBeNull();
  });

  it('requires reassigning students before deleting a corrupt stream', async () => {
    mockUseAppData.mockReturnValue(buildAppData({
      classStreams: [
        { id: 'S-1', name: 'Blue', class_id: 'CLS-7' },
        { id: 'S-BAD', name: null, class_id: null },
      ],
      students: [{ id: 'ST-1', current_class_stream_id: 'S-BAD' }],
    }));
    render(<BulkStreamCreationPage />);

    const panel = screen.getByTestId('corrupt-stream-repair');
    expect(within(panel).getByText(/1 student/i)).toBeInTheDocument();
    const repairButton = within(panel).getByRole('button', { name: /Repair/i });
    expect(repairButton).toBeDisabled();

    const target = within(panel).getByLabelText(/Move students to/i);
    const targetOptions = within(target).getAllByRole('option').map(o => o.textContent);
    expect(targetOptions).toEqual(['-- Choose a stream --', 'Grade 7 - Blue']);
    fireEvent.change(target, { target: { value: 'S-1' } });
    fireEvent.click(repairButton);

    await waitFor(() => expect(deleteClassStream).toHaveBeenCalledWith('S-BAD'));
    expect(updateStudent).toHaveBeenCalledWith('ST-1', { current_class_stream_id: 'S-1' });
    expect(updateStudent.mock.invocationCallOrder[0]).toBeLessThan(deleteClassStream.mock.invocationCallOrder[0]);
  });
});

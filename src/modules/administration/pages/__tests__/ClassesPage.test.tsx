// ABOUTME: Component tests for the Classes page Add Class / Add Stream buttons (SO-05).
// ABOUTME: Verifies the buttons render in the card headers and submit correct payloads to the data API.

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassesContent } from '../ClassesPage';

const mockUseAdministration = vi.fn();

vi.mock('../../hooks/useAdministration', () => ({
  useAdministration: () => mockUseAdministration(),
}));

vi.mock('../BulkStreamCreationPage', () => ({
  BulkStreamCreationContent: () => null,
}));

const translations: Record<string, string> = {
  'classes.title': 'Classes',
  'classes.addClassButton': 'Add Class',
  'classes.addStreamButton': 'Add Stream',
  'classes.manageStreamsButton': 'Manage Streams',
  'classes.modalAddTitle': 'Add New Class',
  'classes.nameLabel': 'Class Name',
  'classes.streamNameLabel': 'Stream Name',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) =>
      translations[key] ?? (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'en' },
  }),
}));

const addClass = vi.fn();
const addClassStream = vi.fn();

const buildAdministration = (overrides: Record<string, unknown> = {}) => ({
  classes: [{ id: 'CLS-7', name: 'Grade 7' }],
  classStreams: [],
  staff: [],
  loading: { classes: false, classStreams: false, staff: false },
  addClass,
  updateClass: vi.fn(),
  deleteClass: vi.fn(),
  addClassStream,
  updateClassStream: vi.fn(),
  deleteClassStream: vi.fn(),
  ...overrides,
});

const fillAndSubmit = async (label: string, value: string) => {
  const dialog = await screen.findByRole('dialog');
  const input = within(dialog).getByLabelText(new RegExp(label, 'i'));
  fireEvent.change(input, { target: { value } });
  fireEvent.click(within(dialog).getByRole('button', { name: /^Save$/i }));
};

describe('ClassesContent add buttons (SO-05)', () => {
  beforeEach(() => {
    addClass.mockReset().mockResolvedValue(undefined);
    addClassStream.mockReset().mockResolvedValue(undefined);
    mockUseAdministration.mockReturnValue(buildAdministration());
  });

  it('renders an Add Class button and creates a class with the entered name', async () => {
    render(<ClassesContent />);

    const addClassButton = screen.getByRole('button', { name: /Add Class/i });
    fireEvent.click(addClassButton);

    await fillAndSubmit('Class Name', 'Grade 8');

    await waitFor(() => expect(addClass).toHaveBeenCalledTimes(1));
    expect(addClass).toHaveBeenCalledWith({ name: 'Grade 8' });
  });

  it('hides Add Stream until a class is selected', () => {
    render(<ClassesContent />);
    expect(screen.queryByRole('button', { name: /Add Stream/i })).not.toBeInTheDocument();
  });

  it('renders Add Stream for the selected class and creates a stream with name and class_id', async () => {
    render(<ClassesContent />);

    fireEvent.click(screen.getByRole('button', { name: /Manage Streams/i }));

    const addStreamButton = await screen.findByRole('button', { name: /Add Stream/i });
    fireEvent.click(addStreamButton);

    await fillAndSubmit('Stream Name', 'Blue');

    await waitFor(() => expect(addClassStream).toHaveBeenCalledTimes(1));
    expect(addClassStream).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Blue', class_id: 'CLS-7' })
    );
  });
});

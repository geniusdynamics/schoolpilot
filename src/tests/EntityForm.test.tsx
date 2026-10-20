// ABOUTME: Tests for the schema-driven EntityForm (Phase 1b.3)
// ABOUTME: Covers rendering from field config, inline validation, and submit flow.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EntityForm, { EntityFieldConfig } from '@/components/ui/forms/EntityForm';

const mockToast = {
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => mockToast,
}));

const fields: EntityFieldConfig[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'code', label: 'Code', required: true },
  { name: 'grouping', label: 'Grouping', type: 'select', options: [
    { value: 'core', label: 'Core' },
    { value: 'optional', label: 'Optional' },
  ] },
  { name: 'notes', label: 'Notes', type: 'textarea' },
  { name: 'is_compulsory', label: 'Compulsory', type: 'checkbox' },
];

function setup(overrides: Partial<Parameters<typeof EntityForm>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(
    <EntityForm
      fields={fields}
      isOpen
      title="Add Subject"
      onSubmit={onSubmit}
      onClose={onClose}
      {...overrides}
    />
  );
  return { onSubmit, onClose };
}

describe('EntityForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all configured fields', () => {
    setup();
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Grouping/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Notes/i })).toBeInTheDocument();
  });

  it('blocks submit with inline errors when required fields are empty', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.click(screen.getByRole('button', { name: /Save/i }));

    // Summary alert + one alert per invalid required field
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText(/is required/i).length).toBeGreaterThanOrEqual(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits typed values and closes on success', async () => {
    const user = userEvent.setup();
    const { onSubmit, onClose } = setup();

    await user.type(screen.getByLabelText(/Name/i), 'Mathematics');
    await user.type(screen.getByLabelText(/Code/i), 'MATH101');
    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0] as Record<string, any>;
    expect(payload.name).toBe('Mathematics');
    expect(payload.code).toBe('MATH101');
    await waitFor(() => expect(mockToast.showSuccess).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows an error toast when onSubmit rejects and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Duplicate code'));
    const onClose = vi.fn();

    render(
      <EntityForm fields={fields} isOpen title="Add Subject" onSubmit={onSubmit} onClose={onClose} />
    );

    await user.type(screen.getByLabelText(/Name/i), 'Mathematics');
    await user.type(screen.getByLabelText(/Code/i), 'MATH101');
    await user.click(screen.getByRole('button', { name: /Save/i }));

    // The error toast carries the thrown message and the dialog stays open
    await waitFor(() => expect(mockToast.showError).toHaveBeenCalled());
    expect(mockToast.showError.mock.calls[0][0]).toContain('Duplicate code');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('seeds values from initialData in edit mode', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup({
      initialData: { id: 7, name: 'Physics', code: 'PHY' },
    });

    expect(screen.getByLabelText(/Name/i)).toHaveValue('Physics');

    await user.clear(screen.getByLabelText(/Code/i));
    await user.type(screen.getByLabelText(/Code/i), 'PHY201');
    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0] as Record<string, any>;
    expect(payload.id).toBe(7);
    expect(payload.code).toBe('PHY201');
  });
});

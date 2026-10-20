// ABOUTME: Behaviour tests for the schema-bound EntityForm: submit, blur, nested errors and reset.
// ABOUTME: Uses a focused test schema plus an injected entity lookup test double.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v4';

import { moneySchema } from '@/domain/schema/common';
import { phoneSchema } from '@/domain/schema/people';
import SchemaEntityForm from '../SchemaEntityForm';
import type { EntityFormFieldMeta, EntityFormLookup } from '../fieldTypes';

const HOUSE_ID = '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e5f';

const testSchema = z
  .strictObject({
    name: z.string().min(1, 'Name is required'),
    status: z.enum(['active', 'left']),
    start_date: z.iso.date('Start date must be a valid date'),
    end_date: z.iso.date().optional(),
    total: moneySchema,
    deposit: moneySchema.optional(),
    contact_phone: phoneSchema.optional(),
    identifier: z
      .strictObject({
        scheme: z.string().min(1, 'Identifier type is required'),
        value: z.string().min(1, 'Identifier value is required'),
      })
      .optional(),
    house_id: z.uuidv7().optional(),
    contact: z
      .strictObject({
        email: z.email('Enter a valid email'),
      })
      .optional(),
  })
  .refine((row) => !row.end_date || row.end_date >= row.start_date, {
    path: ['end_date'],
    message: 'End date must be on or after start date',
  })
  .refine((row) => row.status !== 'left' || row.end_date !== undefined, {
    message: 'End date is required when status is left',
  });

type TestInput = z.input<typeof testSchema>;

const fields: EntityFormFieldMeta[] = [
  { path: 'name', label: 'Name', order: 1, section: 'Identity' },
  { path: 'status', label: 'Status', order: 2, section: 'Identity' },
  { path: 'start_date', label: 'Start date', order: 3, section: 'Dates' },
  { path: 'end_date', label: 'End date', order: 4, section: 'Dates', required: false },
  { path: 'total', label: 'Total', order: 5, section: 'Finance' },
  { path: 'deposit', label: 'Deposit', order: 6, section: 'Finance' },
  {
    path: 'contact_phone',
    label: 'Phone',
    order: 7,
    section: 'Contact',
    widget: 'phone',
    country: 'KE',
  },
  {
    path: 'identifier',
    label: 'Learner identifier',
    order: 8,
    section: 'Contact',
    widget: 'identifier',
    schemes: [{ value: 'ke.kemis_upi', label: 'KEMIS UPI' }],
  },
  {
    path: 'house_id',
    label: 'House',
    order: 9,
    section: 'Contact',
    widget: 'entity',
    lookupKey: 'house',
  },
  {
    path: 'contact.email',
    label: 'Email',
    order: 10,
    section: 'Contact',
    widget: 'email',
    help: 'Used for report delivery',
  },
];

const validValues: TestInput = {
  name: 'Amani Wekesa',
  status: 'active',
  start_date: '2027-01-05',
  total: { amount_minor: 600000, currency: 'KES' },
  contact: { email: 'amani@example.test' },
};

interface HouseRow {
  readonly id: string;
  readonly name: string;
}

const HOUSE_ROW: HouseRow = { id: HOUSE_ID, name: 'Kilimanjaro' };

const houseLookup: EntityFormLookup = {
  options: [HOUSE_ROW],
  byId: new Map([[HOUSE_ID, HOUSE_ROW]]),
  label: (id, fallback = '') => (id === HOUSE_ID ? 'Kilimanjaro' : fallback),
  resolve: (id) => (id === HOUSE_ID ? HOUSE_ROW : undefined),
  status: 'success',
};

function renderForm(
  overrides: Partial<ComponentProps<typeof SchemaEntityForm<typeof testSchema>>> = {}
) {
  return render(
    <SchemaEntityForm
      schema={testSchema}
      fields={fields}
      initialValues={validValues}
      onSubmit={vi.fn()}
      lookups={{ house: houseLookup }}
      {...overrides}
    />
  );
}

function nameInput(): HTMLElement {
  return screen.getByLabelText(/^Name/);
}

describe('SchemaEntityForm', () => {
  it('renders fields in metadata order, grouped by section', () => {
    renderForm();

    expect(screen.getByRole('group', { name: 'Identity' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Dates' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Finance' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Contact' })).toBeInTheDocument();

    expect(screen.getByLabelText(/^Name/)).toHaveValue('Amani Wekesa');
    expect(screen.getByLabelText(/^Status/)).toHaveValue('active');
    expect(screen.getByLabelText(/^Start date/)).toHaveValue('05/01/2027');
    expect(screen.getByLabelText(/^Total/)).toHaveValue('6,000.00');
    expect(screen.getByLabelText(/^End date/)).toHaveValue('');

    const requiredMarks = screen.getAllByText('*', { selector: 'span[aria-hidden="true"]' });
    expect(requiredMarks.length).toBeGreaterThan(0);
    expect(screen.getAllByText('required', { selector: 'span.sr-only' }).length).toBeGreaterThan(0);
  });

  it('infers select options and money/date widgets from the schema', () => {
    renderForm();

    const status = screen.getByLabelText(/^Status/);
    expect(status.tagName).toBe('SELECT');
    expect(within(status).getByRole('option', { name: 'active' })).toBeInTheDocument();
    expect(within(status).getByRole('option', { name: 'left' })).toBeInTheDocument();

    expect(screen.getByLabelText(/^Total/)).toHaveAttribute('inputMode', 'decimal');
    expect(screen.getByLabelText(/^Start date/)).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('submits validated typed values once and disables the form while saving', async () => {
    const user = userEvent.setup();
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = vi.fn<(values: TestInput) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
    );
    renderForm({ onSubmit });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Amani Wekesa',
      status: 'active',
      total: { amount_minor: 600000, currency: 'KES' },
    });

    const busyButton = screen.getByRole('button', { name: 'Saving…' });
    expect(busyButton).toBeDisabled();
    expect(nameInput()).toBeDisabled();

    fireEvent.submit(screen.getByRole('form', { name: 'Entity form' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit?.();
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    expect(nameInput()).toBeEnabled();
  });

  it('submits a date typed through DateField as an ISO string', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(values: TestInput) => void>();
    renderForm({
      onSubmit,
      initialValues: { ...validValues, start_date: undefined },
    });

    await user.type(screen.getByLabelText(/^Start date/), '15/03/2027');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ start_date: '2027-03-15' })
    );
  });

  it('blocks submit while an optional money field has a parse error', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(values: TestInput) => void>();
    renderForm({ onSubmit });

    const deposit = screen.getByLabelText(/^Deposit/);
    await user.type(deposit, '12.345');
    expect(screen.getByText('Use no more than 2 decimal places.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(deposit).toHaveFocus());

    await user.clear(deposit);
    await user.type(deposit, '12.34');
    expect(screen.queryByText('Use no more than 2 decimal places.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      deposit: { amount_minor: 1234, currency: 'KES' },
    });
  });

  it('blocks submit while an optional phone field has a parse error', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(values: TestInput) => void>();
    renderForm({ onSubmit });

    const phone = screen.getByLabelText(/^Phone/);
    await user.type(phone, 'abc');
    expect(screen.getByText('Enter a valid phone number.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.clear(phone);
    await user.type(phone, '0712 345 678');
    expect(screen.queryByText('Enter a valid phone number.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      contact_phone: { number: '+254712345678' },
    });
  });

  it('submits an optional identifier as absent after clearing it', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(values: TestInput) => void>();
    renderForm({
      onSubmit,
      initialValues: {
        ...validValues,
        identifier: { scheme: 'ke.kemis_upi', value: 'UPI-1' },
      },
    });

    await user.clear(screen.getByLabelText(/^Learner identifier/));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('identifier');
  });

  it('validates on blur, clears the error on change and focuses the first invalid field on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({
      onSubmit,
      initialValues: { ...validValues, name: '' },
    });

    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();

    nameInput().focus();
    await user.tab();
    expect(screen.getByText('Name is required')).toBeInTheDocument();

    await user.type(nameInput(), 'Amani');
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();

    await user.clear(nameInput());
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(nameInput()).toHaveFocus());
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('maps a nested issue to its declared field and links the error by id', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({
      onSubmit,
      initialValues: {
        ...validValues,
        contact: { email: 'not-an-email' },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    const emailInput = screen.getByLabelText(/^Email/);
    const message = screen.getByText('Enter a valid email');
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput.getAttribute('aria-describedby')).toContain(message.id);

    const describedBy = (emailInput.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean);
    expect(describedBy.length).toBeGreaterThan(0);
    for (const id of describedBy) {
      expect(document.getElementById(id)).not.toBeNull();
    }
    expect(screen.queryByText('Used for report delivery')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders a path-targeted refinement beside its field', async () => {
    const user = userEvent.setup();
    renderForm({
      initialValues: {
        ...validValues,
        start_date: '2027-05-01',
        end_date: '2027-04-01',
      },
    });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    const endDate = screen.getByLabelText(/^End date/);
    const message = screen.getByText('End date must be on or after start date');
    expect(endDate).toHaveAttribute('aria-invalid', 'true');
    expect(endDate.getAttribute('aria-describedby')).toContain(message.id);
  });

  it('renders a root refinement as a form-level error summary', async () => {
    const user = userEvent.setup();
    renderForm({
      initialValues: { ...validValues, status: 'left' },
    });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    const summary = screen.getByRole('alert');
    expect(summary).toHaveTextContent('End date is required when status is left');
    expect(summary).toHaveTextContent('Please fix the highlighted fields before saving.');
  });

  it('keeps inputs and shows a repository error when saving fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {
      throw new Error('Database is offline');
    });
    renderForm({ onSubmit });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('Database is offline');
    expect(nameInput()).toHaveValue('Amani Wekesa');
    expect(nameInput()).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('shows an externally supplied server error at form level', () => {
    renderForm({ serverError: 'You do not have permission to save this learner.' });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'You do not have permission to save this learner.'
    );
  });

  it('preserves dirty state across seed identity changes and resets on a record change', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    const { rerender } = renderForm({ recordKey: 'learner-1', onDirtyChange });

    const form = screen.getByRole('form', { name: 'Entity form' });
    expect(form).toHaveAttribute('data-dirty', 'false');

    await user.clear(nameInput());
    await user.type(nameInput(), 'Zuri');
    expect(form).toHaveAttribute('data-dirty', 'true');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    rerender(
      <SchemaEntityForm
        schema={testSchema}
        fields={fields}
        initialValues={{ ...validValues, name: 'Amani Wekesa' }}
        recordKey="learner-1"
        onSubmit={vi.fn()}
        lookups={{ house: houseLookup }}
        onDirtyChange={onDirtyChange}
      />
    );

    expect(nameInput()).toHaveValue('Zuri');
    expect(screen.getByRole('form', { name: 'Entity form' })).toHaveAttribute(
      'data-dirty',
      'true'
    );

    rerender(
      <SchemaEntityForm
        schema={testSchema}
        fields={fields}
        initialValues={{ ...validValues, name: 'Neema' }}
        recordKey="learner-2"
        onSubmit={vi.fn()}
        lookups={{ house: houseLookup }}
        onDirtyChange={onDirtyChange}
      />
    );

    expect(nameInput()).toHaveValue('Neema');
    expect(screen.getByRole('form', { name: 'Entity form' })).toHaveAttribute(
      'data-dirty',
      'false'
    );
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('resets an in-progress field draft when the record changes', async () => {
    const user = userEvent.setup();
    const { rerender } = renderForm({ recordKey: 'learner-1' });

    const total = screen.getByLabelText(/^Total/);
    await user.click(total);
    await user.clear(total);
    await user.type(total, '1.00');

    rerender(
      <SchemaEntityForm
        schema={testSchema}
        fields={fields}
        initialValues={{
          ...validValues,
          total: { amount_minor: 2500, currency: 'KES' },
        }}
        recordKey="learner-2"
        onSubmit={vi.fn()}
        lookups={{ house: houseLookup }}
      />
    );

    expect(screen.getByLabelText(/^Total/)).toHaveValue('25.00');
  });

  it('disables all controls when the parent controls the submitting state', () => {
    renderForm({ submitting: true });

    expect(nameInput()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('reports a missing lookup instead of rendering a silently empty picker', () => {
    renderForm({ lookups: {} });

    expect(screen.getByText('No options are configured for this field.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^House/)).toBeDisabled();
  });
});

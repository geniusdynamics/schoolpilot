// ABOUTME: End-to-end form parity with the canonical learner schema.
// ABOUTME: Proves the rendered form submits exactly what the repository schema accepts.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { z } from 'zod/v4';

import { learnerSchema } from '@/domain/schema/people';
import { validFixtures } from '@/domain/schema/__tests__/fixtures';
import SchemaEntityForm from '../SchemaEntityForm';
import type { EntityFormFieldMeta } from '../fieldTypes';

type LearnerInput = z.input<typeof learnerSchema>;

const fields: EntityFormFieldMeta[] = [
  { path: 'given_name', label: 'Given name', order: 1 },
  { path: 'family_name', label: 'Family name', order: 2 },
  { path: 'gender', label: 'Gender', order: 3 },
  { path: 'date_of_birth', label: 'Date of birth', order: 4 },
];

const learner = validFixtures.learner;

describe('SchemaEntityForm with the canonical learner schema', () => {
  it('submits the valid learner payload that the schema accepts', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(values: LearnerInput) => void>();
    render(
      <SchemaEntityForm
        schema={learnerSchema}
        fields={fields}
        initialValues={learner}
        recordKey={learner.id}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    expect(learnerSchema.safeParse(submitted).success).toBe(true);
    expect(submitted.given_name).toBe('Amani');
  });

  it('refuses the same bad enum the schema refuses and shows the field error', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(values: LearnerInput) => void>();
    const invalid = { ...learner, gender: 'unknown' } as unknown as LearnerInput;

    render(
      <SchemaEntityForm
        schema={learnerSchema}
        fields={fields}
        initialValues={invalid}
        recordKey={learner.id}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(learnerSchema.safeParse(invalid).success).toBe(false);

    const gender = screen.getByLabelText(/^Gender/);
    expect(gender).toHaveAttribute('aria-invalid', 'true');

    const describedBy = gender.getAttribute('aria-describedby') ?? '';
    const errorText = describedBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ');
    expect(errorText).toContain('Invalid option');
  });
});

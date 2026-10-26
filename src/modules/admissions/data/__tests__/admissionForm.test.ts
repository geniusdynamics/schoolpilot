// ABOUTME: Pins the admission form's identifier schemes (they come from the KE country pack) and the
// ABOUTME: validation of the identifier values against the chosen scheme, field by field.

import { describe, expect, it } from 'vitest';

import {
  GUARDIAN_IDENTIFIER_SCHEMES,
  LEARNER_IDENTIFIER_SCHEMES,
  emptyAdmissionForm,
  toAdmissionInput,
  validateAdmissionForm,
  type AdmissionFormValues,
} from '../admissionForm';

const ID = (suffix: string) => `01930000-0000-7000-8000-0000000002${suffix}`;

/** A form that passes every rule except the ones a test changes. */
function validForm(overrides: Partial<AdmissionFormValues> = {}): AdmissionFormValues {
  return {
    ...emptyAdmissionForm(new Date('2026-01-12T00:00:00Z')),
    given_name: 'Achieng',
    family_name: 'Otieno',
    programme_id: ID('01'),
    level_id: ID('02'),
    class_group_id: ID('03'),
    guardians: [
      { id: '', given_name: 'Grace', family_name: 'Otieno', relationship: 'mother', phone: '+254700000001' },
    ],
    ...overrides,
  };
}

const issueOf = (values: AdmissionFormValues, field: string) => {
  const result = validateAdmissionForm(values);
  return result.ok ? undefined : result.issues.find((issue) => issue.field === field);
};

describe('the admission form identifier schemes', () => {
  it('lists the learner schemes with the values, labels and order the form has always had', () => {
    expect(LEARNER_IDENTIFIER_SCHEMES).toEqual([
      { value: 'ke.kemis_upi', label: 'KEMIS unique pupil identifier (UPI)' },
      { value: 'ke.birth_certificate', label: 'Birth certificate number' },
      { value: 'ke.national_id', label: 'National ID' },
    ]);
  });

  it('lists the guardian schemes with the values, labels and order the form has always had', () => {
    expect(GUARDIAN_IDENTIFIER_SCHEMES).toEqual([
      { value: 'ke.national_id', label: 'National ID' },
      { value: 'ke.birth_certificate', label: 'Birth certificate number' },
    ]);
  });
});

describe('identifier values on the admission form', () => {
  it('accepts a form with no identifier', () => {
    expect(validateAdmissionForm(validForm()).ok).toBe(true);
  });

  it('refuses a malformed KRA PIN and names the field', () => {
    const issue = issueOf(
      validForm({ guardian_identifier_scheme: 'ke.kra_pin', guardian_identifier_value: 'A12345' }),
      'guardian_identifier_value'
    );
    expect(issue?.message).toMatch(/Not a valid KRA PIN/);
  });

  it('accepts a well-formed KRA PIN', () => {
    const result = validateAdmissionForm(
      validForm({ guardian_identifier_scheme: 'ke.kra_pin', guardian_identifier_value: 'A123456789Z' })
    );
    expect(result.ok).toBe(true);
  });

  it('accepts a lower-case KRA PIN with spaces and stores it normalised', () => {
    const values = validForm({ guardian_identifier_scheme: 'ke.kra_pin', guardian_identifier_value: ' a123456789z ' });
    expect(validateAdmissionForm(values).ok).toBe(true);
    const input = toAdmissionInput(values, [{ givenName: 'Grace', familyName: 'Otieno', phones: [] }]);
    expect(input.identifiers).toEqual([
      { scheme: 'ke.kra_pin', value: 'A123456789Z', owner: 'guardian', guardianIndex: 0 },
    ]);
  });

  it('refuses a malformed national ID on the learner and on the guardian', () => {
    expect(
      issueOf(
        validForm({ identifier_scheme: 'ke.national_id', identifier_value: '12AB' }),
        'identifier_value'
      )?.message
    ).toMatch(/Not a valid National ID/);
    expect(
      issueOf(
        validForm({ guardian_identifier_scheme: 'ke.national_id', guardian_identifier_value: '123456' }),
        'guardian_identifier_value'
      )?.message
    ).toMatch(/Not a valid National ID/);
  });

  it('accepts an eight-digit national ID', () => {
    expect(
      validateAdmissionForm(validForm({ identifier_scheme: 'ke.national_id', identifier_value: '12345678' })).ok
    ).toBe(true);
  });

  it('accepts a free-text scheme value as written', () => {
    const result = validateAdmissionForm(
      validForm({ identifier_scheme: 'ke.kemis_upi', identifier_value: 'UPI-8001' })
    );
    expect(result.ok).toBe(true);
  });

  it('still refuses half of an identifier: a scheme with no value, and a value with no scheme', () => {
    expect(
      issueOf(validForm({ identifier_scheme: 'ke.kemis_upi' }), 'identifier_value')?.message
    ).toBe('Choose a scheme and enter the value, or leave both empty.');
    expect(
      issueOf(validForm({ guardian_identifier_value: '12345678' }), 'guardian_identifier_value')?.message
    ).toBe('Choose a scheme and enter the value, or leave both empty.');
  });

  it('refuses a scheme no country pack defines', () => {
    expect(
      issueOf(validForm({ identifier_scheme: 'ke.driving_licence', identifier_value: 'X' }), 'identifier_value')
        ?.message
    ).toMatch(/not an identifier scheme/);
  });

  it('keeps the existing rules: a malformed identifier does not hide a missing name', () => {
    const result = validateAdmissionForm(
      validForm({ given_name: '', identifier_scheme: 'ke.national_id', identifier_value: 'nope' })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.field)).toEqual(
        expect.arrayContaining(['given_name', 'identifier_value'])
      );
    }
  });

  it('stores the normalised learner identifier', () => {
    const values = validForm({ identifier_scheme: 'ke.national_id', identifier_value: ' 12 345 678 ' });
    expect(toAdmissionInput(values, []).identifiers).toEqual([
      { scheme: 'ke.national_id', value: '12345678', owner: 'learner' },
    ]);
  });
});

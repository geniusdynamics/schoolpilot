// ABOUTME: Page tests for admitting a learner: the form drives AdmissionService, which writes
// ABOUTME: the learner, guardians, links, identifiers and enrolment, and every refusal names its field.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { AdmitLearnerPageContent } from '../AdmitLearnerPage';
import { createFakeRepository, type FakeRepository } from '../../data/__tests__/canonicalRepositoryDouble';

const INSTITUTION = '01930000-0000-7000-8000-000000000001';
const PROGRAMME = '01930000-0000-7000-8000-000000000101';
const OTHER_PROGRAMME = '01930000-0000-7000-8000-000000000102';
const LEVEL = '01930000-0000-7000-8000-000000000103';
const OTHER_LEVEL = '01930000-0000-7000-8000-000000000104';
const CLASS_GROUP = '01930000-0000-7000-8000-000000000105';
const OTHER_CLASS_GROUP = '01930000-0000-7000-8000-000000000106';
const GUARDIAN = '01930000-0000-7000-8000-000000000107';
const OTHER_LEARNER = '01930000-0000-7000-8000-000000000108';
const HELD_IDENTIFIER = '01930000-0000-7000-8000-000000000109';
const ACADEMIC_YEAR = '01930000-0000-7000-8000-00000000010a';
const CAMPUS = '01930000-0000-7000-8000-00000000010b';

/** A class group of the seeded programme and level. */
function classGroup(id: string, name: string, programmeId: string, levelId: string) {
  return {
    id,
    institution_id: INSTITUTION,
    campus_id: CAMPUS,
    academic_year_id: ACADEMIC_YEAR,
    programme_id: programmeId,
    level_id: levelId,
    name,
    homeroom_teacher_ids: [],
  };
}

let repository: FakeRepository;

beforeEach(() => {
  repository = createFakeRepository({
    institution: [{ id: INSTITUTION, name: 'Riverside Academy' }],
    programme: [
      {
        id: PROGRAMME,
        institution_id: INSTITUTION,
        curriculum_pack_code: 'ke-cbe',
        pack_version: '1.0.0',
        name: 'CBE Junior School',
        calendar_id: '01930000-0000-7000-8000-00000000000c',
        status: 'active',
      },
      {
        id: OTHER_PROGRAMME,
        institution_id: INSTITUTION,
        curriculum_pack_code: 'ke-844',
        pack_version: '1.0.0',
        name: '844 Secondary',
        calendar_id: '01930000-0000-7000-8000-00000000000c',
        status: 'active',
      },
    ],
    level: [
      {
        id: LEVEL,
        institution_id: INSTITUTION,
        stage_id: '01930000-0000-7000-8000-00000000000d',
        code: 'G7',
        name: 'Grade 7',
        ordinal: 1,
        is_terminal: false,
      },
      {
        id: OTHER_LEVEL,
        institution_id: INSTITUTION,
        stage_id: '01930000-0000-7000-8000-00000000000d',
        code: 'G8',
        name: 'Grade 8',
        ordinal: 2,
        is_terminal: false,
      },
    ],
    class_group: [
      classGroup(CLASS_GROUP, 'Blue', PROGRAMME, LEVEL),
      classGroup(OTHER_CLASS_GROUP, 'Gold', OTHER_PROGRAMME, OTHER_LEVEL),
    ],
    guardian: [
      {
        id: GUARDIAN,
        institution_id: INSTITUTION,
        given_name: 'Grace',
        family_name: 'Wanjiku',
        name_order: 'given_first',
        gender: 'female',
        phones: [{ number: '+254700111222' }],
      },
    ],
    learner: [
      {
        id: OTHER_LEARNER,
        institution_id: INSTITUTION,
        given_name: 'Other',
        family_name: 'Learner',
        admission_number: 'ADM/2027/001',
        status: 'enrolled',
      },
    ],
    identifier: [
      {
        id: HELD_IDENTIFIER,
        institution_id: INSTITUTION,
        owner_type: 'learner',
        owner_id: OTHER_LEARNER,
        scheme: 'ke.national_id',
        value: '90010001',
      },
    ],
  });
});

const renderPage = () =>
  render(
    <CanonicalRepositoryProvider repository={repository}>
      <AdmitLearnerPageContent />
    </CanonicalRepositoryProvider>
  );

const field = (name: string) => {
  const element = document.querySelector(`[name="${name}"]`);
  if (!element) throw new Error(`field "${name}" is not rendered`);
  return element as HTMLInputElement | HTMLSelectElement;
};

const type = (name: string, value: string) => {
  fireEvent.change(field(name), { target: { name, value } });
};

const choose = async (testId: string, option: RegExp) => {
  fireEvent.click(screen.getByTestId(testId));
  fireEvent.click(await screen.findByRole('option', { name: option }));
};

/** Fills the learner, the placement and a new guardian. */
const fillAdmission = async (overrides: { readonly learner?: string; readonly guardian?: string } = {}) => {
  type('given_name', overrides.learner ?? 'Amani');
  type('family_name', 'Wekesa');
  type('date_of_birth', '2014-02-03');
  type('guardians.0.given_name', overrides.guardian ?? 'Peter');
  type('guardians.0.family_name', 'Wekesa');
  type('guardians.0.phone', '+254700333444');
  type('start_date', '2027-01-05');

  await choose('programme-picker', /CBE Junior School/);
  await choose('level-picker', /Grade 7/);
  await choose('class-group-picker', /Blue/);
};

const submit = () => fireEvent.submit(document.querySelector('form') as HTMLFormElement);

describe('AdmitLearnerPage', () => {
  it('admits a learner through the service and writes the five rows in one call', async () => {
    renderPage();
    await fillAdmission();
    type('identifier_scheme', 'ke.kemis_upi');
    type('identifier_value', 'UPI-8001');
    submit();

    const result = await screen.findByTestId('admission-result');
    expect(result).toHaveTextContent('Amani Wekesa');
    expect(result).toHaveTextContent('ADM/2027/002');
    expect(result).toHaveTextContent('Placed in Blue.');
    expect(result).toHaveTextContent('1 guardian created and linked.');
    expect(result).toHaveTextContent('1 identifier recorded.');

    const learners = repository.rows.learner ?? [];
    const learner = learners.find((row) => row.given_name === 'Amani');
    expect(learner).toBeDefined();
    expect(learner).toMatchObject({
      institution_id: INSTITUTION,
      family_name: 'Wekesa',
      status: 'enrolled',
      residence_status: 'day',
    });

    const guardian = (repository.rows.guardian ?? []).find(
      (row) => row.given_name === 'Peter' && row.family_name === 'Wekesa'
    );
    expect(guardian).toBeDefined();
    expect(guardian).toMatchObject({ institution_id: INSTITUTION });

    const link = (repository.rows.learner_guardian ?? [])[0];
    expect(link).toMatchObject({
      learner_id: learner?.id,
      guardian_id: guardian?.id,
      relationship: 'mother',
      is_primary: true,
    });

    const identifier = (repository.rows.identifier ?? []).find(
      (row) => row.value === 'UPI-8001'
    );
    expect(identifier).toMatchObject({
      owner_type: 'learner',
      owner_id: learner?.id,
      scheme: 'ke.kemis_upi',
    });

    const enrolment = (repository.rows.enrolment ?? [])[0];
    expect(enrolment).toMatchObject({
      learner_id: learner?.id,
      class_group_id: CLASS_GROUP,
      programme_id: PROGRAMME,
      level_id: LEVEL,
      academic_year_id: ACADEMIC_YEAR,
      start_date: '2027-01-05',
      entry_reason: 'new_admission',
      status: 'active',
    });
  });

  it('links a guardian the school already knows instead of copying the person', async () => {
    renderPage();
    await fillAdmission();
    await choose('guardian-picker-0', /Grace Wanjiku/);

    // The picker fills the guardian fields from the row it selected.
    expect(screen.getByDisplayValue('Grace')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+254700111222')).toBeInTheDocument();

    submit();

    const result = await screen.findByTestId('admission-result');
    expect(result).toHaveTextContent('The guardians the school already knew were linked');
    expect((repository.rows.guardian ?? []).length).toBe(1);
    const link = (repository.rows.learner_guardian ?? [])[0];
    expect(link).toMatchObject({ guardian_id: GUARDIAN });
  });

  it('admits a learner with two guardians and links both, the first as the primary', async () => {
    renderPage();
    await fillAdmission();
    fireEvent.click(screen.getByRole('button', { name: 'Add another guardian' }));

    type('guardians.1.given_name', 'Mary');
    type('guardians.1.family_name', 'Wekesa');
    type('guardians.1.phone', '+254700555666');
    fireEvent.change(field('guardians.1.relationship'), { target: { value: 'father' } });

    submit();

    const result = await screen.findByTestId('admission-result');
    expect(result).toHaveTextContent('2 guardians created and linked.');
    expect(result).toHaveTextContent('2 guardian links written.');

    const guardians = repository.rows.guardian ?? [];
    expect(guardians.map((row) => row.given_name)).toEqual(
      expect.arrayContaining(['Peter', 'Mary'])
    );
    const links = repository.rows.learner_guardian ?? [];
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ relationship: 'mother', is_primary: true });
    expect(links[1]).toMatchObject({ relationship: 'father', is_primary: false });
    expect(links[0].guardian_id).not.toBe(links[1].guardian_id);
  });

  it('refuses an archived class group and names the class group field', async () => {
    renderPage();
    await fillAdmission();

    const archived = { ...repository.rows.class_group![0], deleted_at: '2027-01-01T00:00:00.000Z' };
    act(() => repository.publish('class_group', [archived, repository.rows.class_group![1]]));
    submit();

    const failure = await screen.findByTestId('admission-failure');
    expect(failure).toHaveAttribute('data-field', 'class_group_id');
    expect(failure).toHaveTextContent(/Class group: This class group no longer exists/);
    expect((repository.rows.learner ?? []).length).toBe(1);
  });

  it('refuses a programme the class group does not belong to and names the programme field', async () => {
    renderPage();
    await fillAdmission();
    await choose('programme-picker', /844 Secondary/);
    submit();

    const failure = await screen.findByTestId('admission-failure');
    expect(failure).toHaveAttribute('data-field', 'programme_id');
    expect(failure).toHaveTextContent(/Programme: This class group belongs to another programme/);
    expect((repository.rows.learner ?? []).length).toBe(1);
  });

  it('refuses a level the class group does not belong to and names the level field', async () => {
    renderPage();
    await fillAdmission();
    await choose('level-picker', /Grade 8/);
    submit();

    const failure = await screen.findByTestId('admission-failure');
    expect(failure).toHaveAttribute('data-field', 'level_id');
    expect(failure).toHaveTextContent(/Level: This class group belongs to another level/);
    expect((repository.rows.learner ?? []).length).toBe(1);
  });

  it('refuses an identifier another learner holds and names the guardian identifier field', async () => {
    renderPage();
    await fillAdmission();
    type('guardian_identifier_scheme', 'ke.national_id');
    type('guardian_identifier_value', '90010001');
    submit();

    const failure = await screen.findByTestId('admission-failure');
    expect(failure).toHaveAttribute('data-field', 'guardian_identifier_value');
    expect(failure).toHaveTextContent(/Guardian identifier: This identifier already belongs to another person/);
    expect((repository.rows.learner ?? []).length).toBe(1);
  });

  it('blocks a malformed national ID before the service is called and names the field', async () => {
    renderPage();
    await fillAdmission();
    type('guardian_identifier_scheme', 'ke.national_id');
    type('guardian_identifier_value', 'ID-9001');
    submit();

    const failure = await screen.findByTestId('admission-failure');
    expect(failure).toHaveAttribute('data-field', 'guardian_identifier_value');
    expect(failure).toHaveTextContent(/Guardian identifier: Not a valid National ID/);
    expect((repository.rows.learner ?? []).length).toBe(1);
  });

  it('blocks the submit with the required fields before the service is called', async () => {
    renderPage();
    submit();

    const failure = await screen.findByTestId('admission-failure');
    expect(failure).toHaveAttribute('data-field', 'given_name');
    expect(within(failure).getByText(/First name/)).toBeInTheDocument();
    expect((repository.rows.learner ?? []).length).toBe(1);
  });

  it('offers only the levels the chosen programme declares', async () => {
    // A school that runs two programmes may declare a level in each; the picker must not offer the
    // other programme's level. The level's programme is its stage's programme.
    const STAGE_A = '01930000-0000-7000-8000-00000000000e';
    const STAGE_B = '01930000-0000-7000-8000-00000000000f';
    const levels = repository.rows.level ?? [];
    act(() => {
      repository.publish('stage', [
        { id: STAGE_A, institution_id: INSTITUTION, programme_id: PROGRAMME, code: 'JS', name: 'Junior School', sequence: 1 },
        { id: STAGE_B, institution_id: INSTITUTION, programme_id: OTHER_PROGRAMME, code: 'SEC', name: 'Secondary', sequence: 1 },
      ]);
      repository.publish('level', [
        { ...levels[0], stage_id: STAGE_A },
        { ...levels[1], stage_id: STAGE_B },
      ]);
    });

    renderPage();
    await choose('programme-picker', /844 Secondary/);
    fireEvent.click(screen.getByTestId('level-picker'));

    const listbox = (await screen.findAllByRole('listbox')).at(-1) as HTMLElement;
    const names = within(listbox)
      .getAllByRole('option')
      .map((option) => option.textContent ?? '');
    expect(names).toContain('Grade 8');
    expect(names).not.toContain('Grade 7');
  });
});

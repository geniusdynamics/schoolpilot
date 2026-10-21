// ABOUTME: Page tests for the admissions register: applicants and admitted learners read from the
// ABOUTME: canonical repository, with the guardian edit and identifier forms bound to their schemas.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { AdmissionsRegisterPageContent } from '../AdmissionsRegisterPage';
import { createFakeRepository, type FakeRepository } from '../../data/__tests__/canonicalRepositoryDouble';

const INSTITUTION = '01930000-0000-7000-8000-000000000001';
const PROGRAMME = '01930000-0000-7000-8000-000000000101';
const LEVEL = '01930000-0000-7000-8000-000000000103';
const CLASS_GROUP = '01930000-0000-7000-8000-000000000105';
const GUARDIAN = '01930000-0000-7000-8000-000000000107';
const APPLICANT = '01930000-0000-7000-8000-000000000201';
const ADMITTED = '01930000-0000-7000-8000-000000000202';
const ENROLMENT = '01930000-0000-7000-8000-000000000203';
const LINK = '01930000-0000-7000-8000-000000000204';

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
    ],
    class_group: [
      {
        id: CLASS_GROUP,
        institution_id: INSTITUTION,
        campus_id: '01930000-0000-7000-8000-00000000010b',
        academic_year_id: '01930000-0000-7000-8000-00000000010a',
        programme_id: PROGRAMME,
        level_id: LEVEL,
        name: 'Blue',
        homeroom_teacher_ids: [],
      },
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
        id: APPLICANT,
        institution_id: INSTITUTION,
        given_name: 'Daniel',
        family_name: 'Kiptoo',
        admission_number: 'ADM/2027/010',
        admission_date: '2026-11-01',
        status: 'applicant',
        residence_status: 'day',
      },
      {
        id: ADMITTED,
        institution_id: INSTITUTION,
        given_name: 'Amani',
        family_name: 'Wekesa',
        admission_number: 'ADM/2027/011',
        admission_date: '2027-01-05',
        status: 'enrolled',
        residence_status: 'day',
      },
    ],
    enrolment: [
      {
        id: ENROLMENT,
        institution_id: INSTITUTION,
        learner_id: ADMITTED,
        academic_year_id: '01930000-0000-7000-8000-00000000010a',
        programme_id: PROGRAMME,
        level_id: LEVEL,
        class_group_id: CLASS_GROUP,
        status: 'active',
        start_date: '2027-01-05',
        entry_reason: 'new_admission',
      },
    ],
    learner_guardian: [
      {
        id: LINK,
        institution_id: INSTITUTION,
        learner_id: ADMITTED,
        guardian_id: GUARDIAN,
        relationship: 'mother',
        is_primary: true,
        has_parental_responsibility: true,
        is_fee_payer: false,
        can_pick_up: true,
        receives_reports: true,
        receives_sms: true,
        preferred_channel: 'sms',
      },
    ],
  });
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <CanonicalRepositoryProvider repository={repository}>
        <AdmissionsRegisterPageContent />
      </CanonicalRepositoryProvider>
    </MemoryRouter>
  );

describe('AdmissionsRegisterPage', () => {
  it('lists the applicants and the admitted learners with their class group and guardians', async () => {
    renderPage();

    expect(await screen.findByText('Amani Wekesa')).toBeInTheDocument();
    expect(screen.getByText('Daniel Kiptoo')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Grace Wanjiku')).toBeInTheDocument();
    expect(screen.getByText('Applicant')).toBeInTheDocument();
    expect(screen.getAllByText('Admitted')).toHaveLength(2);
    expect(screen.getByText('ADM/2027/011')).toBeInTheDocument();
  });

  it('filters the register by the learner lifecycle', async () => {
    renderPage();
    await screen.findByText('Amani Wekesa');

    fireEvent.click(screen.getByRole('button', { name: 'Applicants' }));
    expect(screen.getByText('Daniel Kiptoo')).toBeInTheDocument();
    expect(screen.queryByText('Amani Wekesa')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Admitted' }));
    expect(screen.getByText('Amani Wekesa')).toBeInTheDocument();
    expect(screen.queryByText('Daniel Kiptoo')).not.toBeInTheDocument();
  });

  it('edits a guardian through the schema-bound guardian form', async () => {
    renderPage();
    await screen.findByText('Amani Wekesa');

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit guardian' })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByDisplayValue('Wanjiku'), {
      target: { value: 'Wanjiku-Otieno' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save guardian' }));

    await waitFor(() =>
      expect((repository.rows.guardian ?? [])[0].family_name).toBe('Wanjiku-Otieno')
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('records an identifier of an admitted learner through the schema-bound identifier form', async () => {
    renderPage();
    await screen.findByText('Amani Wekesa');

    fireEvent.click(screen.getAllByRole('button', { name: 'Record identifier' })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(dialog.querySelector('[name="scheme"]') as HTMLInputElement, {
      target: { value: 'ke.kemis_upi' },
    });
    fireEvent.change(dialog.querySelector('[name="value"]') as HTMLInputElement, {
      target: { value: 'UPI-1234' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save identifier' }));

    await waitFor(() => {
      const identifier = (repository.rows.identifier ?? [])[0];
      expect(identifier).toMatchObject({
        institution_id: INSTITUTION,
        owner_type: 'learner',
        owner_id: ADMITTED,
        scheme: 'ke.kemis_upi',
        value: 'UPI-1234',
      });
    });
  });
});

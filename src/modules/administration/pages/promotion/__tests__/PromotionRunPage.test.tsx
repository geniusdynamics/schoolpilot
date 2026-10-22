// ABOUTME: Component tests for the promotion run page: the class-by-class review shows each
// ABOUTME: suggestion with the learners a human still has to settle, the override dialog records a
// ABOUTME: reason, the approval is gated on the head teacher's role, and the commit writes the record.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Repository } from '@/data/repository';
import type { Role } from '@/data/auth';
import type { ProgressionDefinition, ProgressionLevel, ProgressionStage } from '@/domain/assessment/progression';
import type { PromotionRules } from '@/domain/services';

import { PromotionRunPageContent } from '../PromotionRunPage';
import { createPromotionRepositoryDouble } from './promotionRepositoryDouble';

const INSTITUTION = '01930000-0000-7000-8000-000000000001';
const CAMPUS = '01930000-0000-7000-8000-000000000002';
const PROGRAMME = '01930000-0000-7000-8000-000000000003';
const USER = '01930000-0000-7000-8000-000000000004';
const YEAR_2028 = '01930000-0000-7000-8000-000000000010';
const YEAR_2029 = '01930000-0000-7000-8000-000000000011';
const G8 = '01930000-0000-7000-8000-000000000020';
const G9 = '01930000-0000-7000-8000-000000000021';
const G10 = '01930000-0000-7000-8000-000000000022';
const G11 = '01930000-0000-7000-8000-000000000023';
const G12 = '01930000-0000-7000-8000-000000000024';
const CLOSING_G8 = '01930000-0000-7000-8000-000000000030';
const CLOSING_G9 = '01930000-0000-7000-8000-000000000031';
const CLOSING_G11 = '01930000-0000-7000-8000-000000000032';
const CLOSING_G12 = '01930000-0000-7000-8000-000000000033';
const OPENING_G9 = '01930000-0000-7000-8000-000000000040';
const OPENING_G10 = '01930000-0000-7000-8000-000000000041';
const OPENING_G12 = '01930000-0000-7000-8000-000000000042';
const ADA = '01930000-0000-7000-8000-000000000050';
const CIA = '01930000-0000-7000-8000-000000000051';
const EVE = '01930000-0000-7000-8000-000000000052';
const GIA = '01930000-0000-7000-8000-000000000053';

const DEFINITION: ProgressionDefinition = {
  progression: [
    { levels: ['G8'], rule: 'automatic' },
    {
      levels: ['G9'],
      rule: 'stage_transition',
      to_stage: 'SS',
      requires: ['national_assessment_recorded'],
    },
    { levels: ['G11'], rule: 'class_council', suggest: { metric: 'annual.average', gte: 50 } },
  ],
  graduation: [{ levels: ['G12'], rule: 'graduate' }],
};

const LEVELS: readonly ProgressionLevel[] = [
  { code: 'G8', next: 'G9' },
  { code: 'G9', next: 'G10' },
  { code: 'G10', next: 'G11' },
  { code: 'G11', next: 'G12' },
  { code: 'G12', next: null },
];

const STAGES: readonly ProgressionStage[] = [{ code: 'SS', levels: ['G10', 'G11', 'G12'] }];

const RULES: PromotionRules = { definition: DEFINITION, levels: LEVELS, stages: STAGES };

function academicYear(id: string, name: string, start: string, end: string) {
  return {
    id,
    institution_id: INSTITUTION,
    calendar_id: '01930000-0000-7000-8000-000000000005',
    name,
    start_date: start,
    end_date: end,
    status: 'planned',
  };
}

function level(id: string, code: string) {
  return {
    id,
    institution_id: INSTITUTION,
    stage_id: '01930000-0000-7000-8000-000000000006',
    code,
    name: code,
    ordinal: 1,
    is_terminal: code === 'G12',
  };
}

function classGroup(id: string, name: string, yearId: string, levelId: string) {
  return {
    id,
    institution_id: INSTITUTION,
    campus_id: CAMPUS,
    academic_year_id: yearId,
    programme_id: PROGRAMME,
    level_id: levelId,
    name,
    homeroom_teacher_ids: [],
  };
}

function learner(id: string, given: string, family: string, admission: string) {
  return {
    id,
    institution_id: INSTITUTION,
    given_name: given,
    family_name: family,
    name_order: 'given_first',
    gender: 'not_stated',
    admission_number: admission,
    status: 'enrolled',
    residence_status: 'day',
  };
}

function enrolment(id: string, learnerId: string, groupId: string, levelId: string) {
  return {
    id,
    institution_id: INSTITUTION,
    learner_id: learnerId,
    academic_year_id: YEAR_2028,
    programme_id: PROGRAMME,
    level_id: levelId,
    class_group_id: groupId,
    status: 'active',
    start_date: '2028-01-05',
    end_date: null,
    entry_reason: 'new_admission',
    exit_reason: null,
  };
}

function seed() {
  return {
    institution: [{ id: INSTITUTION, name: 'Mwangaza' }],
    academic_year: [
      academicYear(YEAR_2028, '2028', '2028-01-05', '2028-11-30'),
      academicYear(YEAR_2029, '2029', '2029-01-05', '2029-11-30'),
    ],
    level: [
      level(G8, 'G8'),
      level(G9, 'G9'),
      level(G10, 'G10'),
      level(G11, 'G11'),
      level(G12, 'G12'),
    ],
    class_group: [
      classGroup(CLOSING_G8, 'Blue', YEAR_2028, G8),
      classGroup(CLOSING_G9, 'Blue', YEAR_2028, G9),
      classGroup(CLOSING_G11, 'Blue', YEAR_2028, G11),
      classGroup(CLOSING_G12, 'Blue', YEAR_2028, G12),
      classGroup(OPENING_G9, 'Blue', YEAR_2029, G9),
      classGroup(OPENING_G10, 'Blue', YEAR_2029, G10),
      classGroup(OPENING_G12, 'Blue', YEAR_2029, G12),
    ],
    learner: [
      learner(ADA, 'Ada', 'Achieng', 'ADM/2028/001'),
      learner(CIA, 'Cia', 'Chebet', 'ADM/2028/002'),
      learner(EVE, 'Eve', 'Ekai', 'ADM/2028/003'),
      learner(GIA, 'Gia', 'Gitau', 'ADM/2028/004'),
    ],
    enrolment: [
      enrolment('01930000-0000-7000-8000-000000000060', ADA, CLOSING_G8, G8),
      enrolment('01930000-0000-7000-8000-000000000061', CIA, CLOSING_G9, G9),
      enrolment('01930000-0000-7000-8000-000000000062', EVE, CLOSING_G11, G11),
      enrolment('01930000-0000-7000-8000-000000000063', GIA, CLOSING_G12, G12),
    ],
  };
}

function renderPage(roles: readonly Role[]) {
  const repository = createPromotionRepositoryDouble(seed());
  render(
    <PromotionRunPageContent
      repository={repository as unknown as Repository}
      rules={RULES}
      approver={{ actor: USER, roles }}
    />
  );
  return repository;
}

/** Chooses the two years and computes the run. */
async function compute() {
  fireEvent.change(screen.getByLabelText('Year being closed'), { target: { value: YEAR_2028 } });
  fireEvent.change(screen.getByLabelText('Year being opened'), { target: { value: YEAR_2029 } });
  fireEvent.click(screen.getByTestId('promotion-compute'));
  await screen.findByText(/suggestion\(s\):/);
}

/** Settles the two undecided learners through the override dialog. */
async function override(learnerName: string, action: 'promote' | 'repeat', reason: string) {
  fireEvent.click(screen.getByRole('button', { name: `Override ${learnerName}` }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Decision'), { target: { value: action } });
  fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: reason } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save override' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('the promotion run page', () => {
  beforeEach(() => {
    // Each test renders its own page and repository.
  });

  it('reviews class by class, marking the referrals and the blocked transitions as pending', async () => {
    renderPage(['head_teacher']);
    await compute();

    expect(screen.getByTestId(`promotion-decision-${ADA}`)).toHaveTextContent('Promote');
    expect(screen.getByTestId(`promotion-decision-${CIA}`)).toHaveTextContent('Blocked');
    expect(screen.getByText('Blocked: a required record is missing')).toBeInTheDocument();
    expect(screen.getByTestId(`promotion-decision-${EVE}`)).toHaveTextContent('Refer to the class council');
    expect(screen.getByText('Waiting for the class council')).toBeInTheDocument();
    expect(screen.getByTestId(`promotion-decision-${GIA}`)).toHaveTextContent('Graduate');

    const conflicts = screen.getByTestId('promotion-conflicts');
    expect(within(conflicts).getByText(/Cia Chebet/)).toBeInTheDocument();
    expect(within(conflicts).getByText(/Eve Ekai/)).toBeInTheDocument();

    // Nothing commits while a learner is undecided.
    expect(screen.getByTestId('promotion-approve')).toBeDisabled();
  });

  it('narrows the review to one class group', async () => {
    renderPage(['head_teacher']);
    await compute();

    expect(screen.getByTestId(`promotion-row-${ADA}`)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Class group'), { target: { value: CLOSING_G9 } });
    await waitFor(() => expect(screen.queryByTestId(`promotion-row-${ADA}`)).not.toBeInTheDocument());
    expect(screen.getByTestId(`promotion-row-${CIA}`)).toBeInTheDocument();
  });

  it('records an override through the dialog and refuses one with no reason', async () => {
    renderPage(['head_teacher']);
    await compute();

    fireEvent.click(screen.getByRole('button', { name: 'Override Cia Chebet' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save override' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('An override needs a reason.');

    fireEvent.change(within(dialog).getByLabelText('Decision'), { target: { value: 'promote' } });
    fireEvent.change(within(dialog).getByLabelText('Reason'), {
      target: { value: 'The council agreed to promote after the assessment was recorded.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save override' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const decision = screen.getByTestId(`promotion-decision-${CIA}`);
    expect(decision).toHaveTextContent('Promote');
    expect(decision).toHaveAttribute('data-overridden', 'true');
    expect(screen.getByText('The council agreed to promote after the assessment was recorded.')).toBeInTheDocument();
    expect(screen.queryByText(/Cia Chebet:/)).not.toBeInTheDocument();
  });

  it('gates the approval on the head teacher’s role', async () => {
    renderPage(['registrar']);
    await compute();

    expect(screen.getByTestId('promotion-approve')).toBeDisabled();
    expect(screen.getByText(/cannot approve a promotion run/)).toBeInTheDocument();
  });

  it('approves, commits and shows the run record, then offers the undo', async () => {
    renderPage(['head_teacher']);
    await compute();
    await override('Cia Chebet', 'promote', 'Assessment recorded; the council agreed to promote.');
    await override('Eve Ekai', 'promote', 'Council agreed to promote.');

    const approve = screen.getByTestId('promotion-approve');
    await waitFor(() => expect(approve).toBeEnabled());
    fireEvent.click(approve);
    expect(await screen.findByTestId('promotion-notice')).toHaveTextContent('Approved by');

    const commit = screen.getByTestId('promotion-commit');
    await waitFor(() => expect(commit).toBeEnabled());
    fireEvent.click(commit);

    const record = await screen.findByTestId('promotion-record');
    expect(record).toHaveTextContent('3 promoted');
    expect(record).toHaveTextContent('1 graduated');
    expect(record).toHaveTextContent('2 overridden');
    expect(record).toHaveTextContent('Council agreed to promote.');
    expect(screen.getByTestId('promotion-undo')).toBeInTheDocument();
  });
});

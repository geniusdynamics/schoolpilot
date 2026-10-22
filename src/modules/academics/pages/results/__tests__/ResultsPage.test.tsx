// ABOUTME: Results page tests: the computed table, an incomplete result never shown as a grade, the
// ABOUTME: "Why this grade" drill-down for four operator shapes, moderation with a reason, and scope.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AggregationDefinition } from '@/domain/assessment/aggregation';

import { CanonicalRepositoryProvider } from '@/modules/academics/data/canonicalRepository';
import { createFakeRepository, type FakeRepository } from '@/modules/academics/pages/__tests__/canonicalRepositoryDouble';
import {
  MarkWorkflow,
  createMemoryWorkflowStore,
} from '@/modules/academics/pages/marks/workflow';
import type { WorkflowStore } from '@/modules/academics/pages/marks/workflow';
import { ResultsPageContent } from '../ResultsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

const INSTITUTION = 'inst-0001';
const PROGRAMME = 'programme-0001';
const YEAR = 'year-0001';
const PERIOD = 'period-0001';
const LEVEL = 'level-0001';
const CLASS = 'class-east';
const OTHER_CLASS = 'class-west';
const SCALE_ID = 'scale-subject';
const DIVISION_ID = 'scale-division';
const STAFF = 'staff-teacher';
const OTHER_STAFF = 'staff-other';
const USER = 'user-teacher';
const USER_OTHER = 'user-other';
const AT = '2026-03-01T09:00:00.000Z';

const AREAS = [
  { id: 'area-eng', code: 'ENG', name: 'English', group: 'languages' },
  { id: 'area-mat', code: 'MAT', name: 'Mathematics', group: 'mathematics' },
  { id: 'area-sci', code: 'SCI', name: 'Science', group: 'sciences' },
  { id: 'area-his', code: 'HIS', name: 'History', group: 'humanities' },
] as const;

type AreaCode = (typeof AREAS)[number]['code'];
type Scores = Partial<Record<AreaCode, string | null>>;

const GROUP_IDS: Readonly<Record<AreaCode, string>> = {
  ENG: 'group-eng',
  MAT: 'group-mat',
  SCI: 'group-sci',
  HIS: 'group-his',
};

const ASSESSMENT_IDS: Readonly<Record<AreaCode, string>> = {
  ENG: 'assess-eng',
  MAT: 'assess-mat',
  SCI: 'assess-sci',
  HIS: 'assess-his',
};

const LEARNERS: readonly {
  readonly learner: string;
  readonly enrolment: string;
  readonly member: string;
  readonly given: string;
  readonly family: string;
  readonly admission: string;
}[] = [
  { learner: 'learner-1', enrolment: 'enrol-1', member: 'member-1', given: 'Amani', family: 'Otieno', admission: 'ADM-001' },
  { learner: 'learner-2', enrolment: 'enrol-2', member: 'member-2', given: 'Bello', family: 'Mwangi', admission: 'ADM-002' },
];

const DEFAULTS: { readonly amani: Scores; readonly bello: Scores } = {
  amani: { ENG: '88', MAT: '79', SCI: '65', HIS: '61' },
  bello: { ENG: '70', MAT: '60', SCI: '50', HIS: '40' },
};

function marksFor(enrolmentId: string, scores: Scores) {
  return AREAS.flatMap((area) => {
    const score = scores[area.code];
    if (score === null || score === undefined) return [];
    return [
      {
        id: `mark-${enrolmentId}-${area.code}`,
        assessment_id: ASSESSMENT_IDS[area.code],
        enrolment_id: enrolmentId,
        learning_area_id: area.id,
        score,
        status_code: 'present',
        institution_id: INSTITUTION,
      },
    ];
  });
}

function seed(input: { readonly amani?: Scores; readonly bello?: Scores } = {}) {
  const amani = input.amani ?? DEFAULTS.amani;
  const bello = input.bello ?? DEFAULTS.bello;

  return {
    institution: [{ id: INSTITUTION, name: 'Greenfields Academy' }],
    programme: [{ id: PROGRAMME, name: 'Junior Secondary', institution_id: INSTITUTION }],
    academic_year: [
      {
        id: YEAR,
        name: '2026',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        status: 'current',
        institution_id: INSTITUTION,
      },
    ],
    academic_period: [
      {
        id: PERIOD,
        name: 'Term 1',
        academic_year_id: YEAR,
        kind: 'term',
        sequence: 1,
        start_date: '2026-01-05',
        end_date: '2026-04-03',
        is_reporting: true,
        is_billing: true,
        status: 'current',
        institution_id: INSTITUTION,
      },
    ],
    level: [{ id: LEVEL, name: 'Grade 7', ordinal: 7, is_terminal: false, institution_id: INSTITUTION }],
    class_group: [
      {
        id: CLASS,
        name: 'East',
        level_id: LEVEL,
        academic_year_id: YEAR,
        campus_id: 'campus-0001',
        programme_id: PROGRAMME,
        institution_id: INSTITUTION,
        homeroom_teacher_ids: [],
      },
      {
        id: OTHER_CLASS,
        name: 'West',
        level_id: LEVEL,
        academic_year_id: YEAR,
        campus_id: 'campus-0001',
        programme_id: PROGRAMME,
        institution_id: INSTITUTION,
        homeroom_teacher_ids: [],
      },
    ],
    learning_area: AREAS.map((area) => ({
      id: area.id,
      code: area.code,
      name: area.name,
      group: area.group,
      kind: 'core',
      programme_id: PROGRAMME,
      level_ids: [LEVEL],
      pathway_ids: [],
      institution_id: INSTITUTION,
    })),
    staff: [
      {
        id: STAFF,
        user_id: USER,
        given_name: 'Grace',
        family_name: 'Wekesa',
        institution_id: INSTITUTION,
      },
      {
        id: OTHER_STAFF,
        user_id: USER_OTHER,
        given_name: 'Peter',
        family_name: 'Otieno',
        institution_id: INSTITUTION,
      },
    ],
    teaching_group: AREAS.map((area) => ({
      id: GROUP_IDS[area.code],
      name: `Grade 7 ${area.name} East`,
      campus_id: 'campus-0001',
      academic_year_id: YEAR,
      learning_area_id: area.id,
      level_ids: [LEVEL],
      class_group_ids: [CLASS],
      teacher_ids: [STAFF],
      kind: 'whole_class',
      institution_id: INSTITUTION,
    })).concat([
      {
        id: 'group-other',
        name: 'Grade 7 English West',
        campus_id: 'campus-0001',
        academic_year_id: YEAR,
        learning_area_id: 'area-eng',
        level_ids: [LEVEL],
        class_group_ids: [OTHER_CLASS],
        teacher_ids: [OTHER_STAFF],
        kind: 'whole_class',
        institution_id: INSTITUTION,
      },
    ]),
    teaching_assignment: AREAS.map((area) => ({
      id: `assignment-${area.code}`,
      staff_id: STAFF,
      teaching_group_id: GROUP_IDS[area.code],
      role: 'main',
      valid_from: '2026-01-05',
      institution_id: INSTITUTION,
    })).concat([
      {
        id: 'assignment-other',
        staff_id: OTHER_STAFF,
        teaching_group_id: 'group-other',
        role: 'main',
        valid_from: '2026-01-05',
        institution_id: INSTITUTION,
      },
    ]),
    teaching_group_member: LEARNERS.flatMap((learner) =>
      AREAS.map((area) => ({
        id: `${learner.member}-${area.code}`,
        teaching_group_id: GROUP_IDS[area.code],
        enrolment_id: learner.enrolment,
        valid_from: '2026-01-05',
        institution_id: INSTITUTION,
      }))
    ).concat([
      {
        id: 'member-other',
        teaching_group_id: 'group-other',
        enrolment_id: 'enrol-other',
        valid_from: '2026-01-05',
        institution_id: INSTITUTION,
      },
    ]),
    learner: LEARNERS.map((learner) => ({
      id: learner.learner,
      given_name: learner.given,
      family_name: learner.family,
      admission_number: learner.admission,
      status: 'enrolled',
      name_order: 'given_first',
      gender: 'female',
      residence_status: 'day',
      institution_id: INSTITUTION,
    })).concat([
      {
        id: 'learner-other',
        given_name: 'Other',
        family_name: 'Learner',
        admission_number: 'ADM-900',
        status: 'enrolled',
        name_order: 'given_first',
        gender: 'male',
        residence_status: 'day',
        institution_id: INSTITUTION,
      },
    ]),
    enrolment: LEARNERS.map((learner) => ({
      id: learner.enrolment,
      learner_id: learner.learner,
      academic_year_id: YEAR,
      programme_id: PROGRAMME,
      level_id: LEVEL,
      class_group_id: CLASS,
      status: 'active',
      start_date: '2026-01-05',
      institution_id: INSTITUTION,
    })).concat([
      {
        id: 'enrol-other',
        learner_id: 'learner-other',
        academic_year_id: YEAR,
        programme_id: PROGRAMME,
        level_id: LEVEL,
        class_group_id: OTHER_CLASS,
        status: 'active',
        start_date: '2026-01-05',
        institution_id: INSTITUTION,
      },
    ]),
    assessment: AREAS.map((area) => ({
      id: ASSESSMENT_IDS[area.code],
      name: 'End of Term',
      kind: 'end_term',
      scheme_slot: 'ET',
      academic_period_id: PERIOD,
      learning_area_ids: [area.id],
      class_group_ids: [CLASS],
      level_ids: [LEVEL],
      component_ids: [],
      max_score: 100,
      date_window: { start_date: '2026-03-23', end_date: '2026-03-27' },
      status: 'open',
      grading_scale_id: SCALE_ID,
      institution_id: INSTITUTION,
    })),
    grading_scale: [
      {
        id: SCALE_ID,
        code: 'subject_bands',
        kind: 'numeric_bands',
        bands: [
          { code: 'A', label: 'A', min: 80, max: 101, points: 12 },
          { code: 'B', label: 'B', min: 70, max: 80, points: 9 },
          { code: 'C', label: 'C', min: 60, max: 70, points: 7 },
          { code: 'D', label: 'D', min: 50, max: 60, points: 5 },
          { code: 'E', label: 'E', min: 40, max: 50, points: 3 },
          { code: 'F', label: 'F', min: 0, max: 40, points: 1 },
        ],
        version: '1',
        programme_id: PROGRAMME,
        institution_id: INSTITUTION,
      },
      {
        id: DIVISION_ID,
        code: 'divisions',
        kind: 'division',
        bands: [
          { code: 'I', label: 'Division I', min: 36, max: 49 },
          { code: 'II', label: 'Division II', min: 30, max: 36 },
          { code: 'III', label: 'Division III', min: 24, max: 30 },
          { code: 'IV', label: 'Division IV', min: 0, max: 24 },
        ],
        version: '1',
        programme_id: PROGRAMME,
        institution_id: INSTITUTION,
      },
    ],
    mark: [...marksFor('enrol-1', amani), ...marksFor('enrol-2', bello)],
  };
}

const BEST_N: AggregationDefinition = {
  code: 'best3',
  op: 'best_n',
  n: 3,
  value: 'score',
  groups: [{ require_all: ['ENG'] }, { group: 'sciences', min: 1 }, { fill_from: 'any' }],
  then: { op: 'mean', precision: 2 },
  result_scale: 'subject_bands',
};

const WEIGHTED_MEAN: AggregationDefinition = {
  code: 'moyenne',
  op: 'weighted_mean',
  value: 'score',
  weights: { ENG: 2, MAT: 1, SCI: 1, HIS: 1 },
  precision: 2,
  result_scale: 'subject_bands',
};

const CAPPED: AggregationDefinition = {
  code: 'ple_division',
  op: 'sum',
  value: 'grade_points',
  result_scale: 'divisions',
  fail_if: { any_grade: 'E', in: ['ENG'], then_max_division: 'IV' },
};

const SUM_WITH_MULTIPLIERS: AggregationDefinition = {
  code: 'attainment_8',
  op: 'sum',
  value: 'score',
  multipliers: { ENG: 2, MAT: 2 },
  divisor: 'sum_of_multipliers',
  precision: 2,
  result_scale: 'subject_bands',
};

let repository: FakeRepository;
let store: WorkflowStore;

beforeEach(() => {
  repository = createFakeRepository(seed());
  store = createMemoryWorkflowStore();
});

function renderPage(
  aggregation: AggregationDefinition,
  options: { readonly actorId?: string; readonly role?: string | null; readonly seed?: ReturnType<typeof seed> } = {}
) {
  if (options.seed !== undefined) repository = createFakeRepository(options.seed);
  const view = render(
    <CanonicalRepositoryProvider repository={repository}>
      <ResultsPageContent
        actorId={options.actorId ?? USER}
        role={options.role === undefined ? 'teacher' : options.role}
        aggregation={aggregation}
        workflowStore={store}
        now={() => AT}
      />
    </CanonicalRepositoryProvider>
  );
  return view;
}

async function openResults(aggregation: AggregationDefinition, options: Parameters<typeof renderPage>[1] = {}) {
  const view = renderPage(aggregation, options);
  await screen.findByText('Amani Otieno');
  return view;
}

async function openWhy(learnerName: string) {
  fireEvent.click(screen.getByRole('button', { name: `Why this grade for ${learnerName}` }));
  return screen.findByTestId('why-headline');
}

function step(index: number): HTMLElement {
  return screen.getByTestId(`why-step-${index}`);
}

describe('the results table', () => {
  it('shows each learning area’s grade from the engine and the aggregate beside it', async () => {
    await openResults(BEST_N);

    const english = screen.getByTestId('area-enrol-1-ENG');
    expect(english.textContent).toContain('A');
    expect(english.textContent).toContain('88%');

    const history = screen.getByTestId('area-enrol-1-HIS');
    expect(history.textContent).toContain('C');
    expect(history.textContent).toContain('61%');

    expect(screen.getByTestId('aggregate-grade-enrol-1').textContent).toBe('B');
    expect(screen.getByTestId('aggregate-enrol-1').textContent).toContain('77.33');
    expect(screen.getByTestId('aggregation-note').textContent).toContain('Best 3');
  });

  it('never presents an incomplete result as a grade', async () => {
    await openResults(BEST_N, {
      seed: seed({ bello: { ENG: '70', MAT: '60', SCI: null, HIS: '40' } }),
    });

    const science = screen.getByTestId('area-enrol-2-SCI');
    expect(science.textContent).toContain('Incomplete');
    expect(science.textContent).toContain('No result yet: End of Term has no mark.');

    // No grade element exists for an aggregate that has no grade, and the reason is stated.
    expect(screen.queryByTestId('aggregate-grade-enrol-2')).toBeNull();
    const aggregate = screen.getByTestId('aggregate-enrol-2');
    expect(aggregate.textContent).toContain('Incomplete');
    expect(aggregate.textContent).toContain('Science has no complete result');
    expect(within(aggregate).queryByText('C')).toBeNull();
  });

  it('says so when no marks exist at all, and still lists the learners', async () => {
    await openResults(BEST_N, {
      seed: seed({ amani: { ENG: null, MAT: null, SCI: null, HIS: null }, bello: { ENG: null, MAT: null, SCI: null, HIS: null } }),
    });

    expect(screen.getByText(/No marks have been entered for this class in this period yet/)).toBeTruthy();
    expect(screen.getByText('Amani Otieno')).toBeTruthy();
    expect(screen.queryByTestId('aggregate-grade-enrol-1')).toBeNull();
    expect(screen.getByTestId('aggregate-enrol-1').textContent).toContain('Incomplete');
  });
});

describe('why this grade', () => {
  it('explains a best_n: candidates, reasons, lost_to, divisor and band', async () => {
    await openResults(BEST_N);
    const headline = await openWhy('Amani Otieno');

    expect(headline.textContent).toContain('Best 3 of 4');
    expect(headline.textContent).toContain('232');
    expect(headline.textContent).toContain('÷ 3');
    expect(headline.textContent).toContain('77.33');
    expect(headline.textContent).toContain('→ B');

    const selection = step(0);
    expect(selection.getAttribute('data-step-kind')).toBe('select');
    expect(within(selection).getByText('Required area')).toBeTruthy();
    expect(within(selection).getByText('Fills a group minimum')).toBeTruthy();
    expect(within(selection).getByText('One of the highest remaining')).toBeTruthy();
    expect(within(selection).getByText('Lower than Science')).toBeTruthy();

    const combine = step(1);
    expect(combine.getAttribute('data-step-kind')).toBe('mean');
    expect(within(combine).getByText('232 ÷ 3 = 77.33.')).toBeTruthy();

    const round = step(2);
    expect(round.getAttribute('data-step-kind')).toBe('round');
    expect(within(round).getByText('232/3 rounded to 2 decimal places (half up) = 77.33.')).toBeTruthy();

    const lookup = step(3);
    expect(lookup.getAttribute('data-step-kind')).toBe('lookup');
    expect(within(lookup).getByText(/It fell in B: 70 to 80/)).toBeTruthy();
  });

  it('explains a weighted mean with each weight and product', async () => {
    await openResults(WEIGHTED_MEAN);
    const headline = await openWhy('Amani Otieno');

    expect(headline.textContent).toContain('Σ value × weight');
    expect(headline.textContent).toContain('÷ 5');
    expect(headline.textContent).toContain('76.2');

    const combine = step(0);
    expect(combine.getAttribute('data-step-kind')).toBe('weighted_mean');
    expect(within(combine).getByText('× 2')).toBeTruthy();
    expect(within(combine).getByText('176')).toBeTruthy();
    expect(within(combine).getByText('The weights add up to 5.')).toBeTruthy();
  });

  it('explains a capped fail_if with its trigger, order and the band it was capped from', async () => {
    await openResults(CAPPED, {
      seed: seed({ amani: { ENG: '45', MAT: '92', SCI: '88', HIS: '79' } }),
    });
    const headline = await openWhy('Amani Otieno');

    expect(headline.textContent).toContain('→ IV');
    expect(headline.textContent).toContain('capped from I to IV');

    const cap = screen.getByText('National rule (fail_if)').closest('section');
    expect(cap).not.toBeNull();
    const scope = within(cap as HTMLElement);
    expect(scope.getByText('It fired: English carries E. I was capped to IV.')).toBeTruthy();
    expect(scope.getByText('Band order used for the cap, best first: I > II > III > IV.')).toBeTruthy();
  });

  it('explains a plain sum with multipliers and where the divisor came from', async () => {
    await openResults(SUM_WITH_MULTIPLIERS);
    const headline = await openWhy('Amani Otieno');

    expect(headline.textContent).toBe('Total: 460 ÷ 6 = 76.67 → B');

    const combine = step(0);
    expect(combine.getAttribute('data-step-kind')).toBe('sum');
    expect(within(combine).getAllByText('× 2').length).toBe(2);
    expect(within(combine).getByText('176')).toBeTruthy();
    expect(
      within(combine).getByText('Divided by 6 — the total of the multipliers applied.')
    ).toBeTruthy();
  });

  it('changes the explanation when the marks change, because the numbers come from the trace', async () => {
    const first = await openResults(BEST_N);
    const before = (await openWhy('Amani Otieno')).textContent;
    first.unmount();

    await openResults(BEST_N, { seed: seed({ amani: { ENG: '60', MAT: '79', SCI: '65', HIS: '61' } }) });
    const after = (await openWhy('Amani Otieno')).textContent;

    expect(before).toContain('232');
    expect(after).not.toBe(before);
    expect(after).toContain('204');
    expect(after).not.toContain('232');
  });
});

describe('moderation', () => {
  async function moderateAmani(role?: string | null): Promise<void> {
    await openResults(BEST_N, role === undefined ? {} : { role });
    fireEvent.click(screen.getByRole('button', { name: 'Moderate Amani Otieno' }));
  }

  it('requires a reason before it records an override', async () => {
    await moderateAmani();

    expect(screen.getByTestId('moderation-computed').textContent).toBe('B');
    fireEvent.change(screen.getByLabelText('Grade to award'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('reason');
    expect(new MarkWorkflow(store).moderations('aggregate:best3', CLASS)).toEqual({});
  });

  it('records original, moderated, reason, actor and time through the mark workflow store', async () => {
    await moderateAmani();

    fireEvent.change(screen.getByLabelText('Grade to award'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Reason (required)'), {
      target: { value: 'Examinations office correction after remarking script 14.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }));

    await waitFor(() =>
      expect(screen.getByTestId('aggregate-override-enrol-1').textContent).toContain('Moderated: A')
    );
    // The engine's own grade stays visible beside the override.
    expect(screen.getByTestId('aggregate-enrol-1').textContent).toContain('The engine still says B');

    const record = new MarkWorkflow(store).moderations('aggregate:best3', CLASS)['enrol-1'];
    expect(record).toMatchObject({
      original: 'B',
      moderated: 'A',
      reason: 'Examinations office correction after remarking script 14.',
      actorId: USER,
      at: AT,
    });
  });

  it('shows the original and the moderated grade together and removes it only with a reason', async () => {
    await moderateAmani();
    fireEvent.change(screen.getByLabelText('Grade to award'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Reason (required)'), {
      target: { value: 'Remark of script 14.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }));
    await screen.findByTestId('aggregate-override-enrol-1');

    fireEvent.click(screen.getByRole('button', { name: 'Moderate Amani Otieno' }));
    expect(screen.getByTestId('moderation-record').textContent).toBe('B → A');

    // No reason: the removal is refused and the override stays.
    fireEvent.click(screen.getByRole('button', { name: 'Remove override' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(new MarkWorkflow(store).moderations('aggregate:best3', CLASS)['enrol-1'].moderated).toBe('A');

    fireEvent.change(screen.getByLabelText('Reason (required)'), {
      target: { value: 'Restored after the review panel.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove override' }));

    await waitFor(() => expect(screen.queryByTestId('aggregate-override-enrol-1')).toBeNull());
    expect(screen.getByTestId('aggregate-grade-enrol-1').textContent).toBe('B');
    expect(new MarkWorkflow(store).moderations('aggregate:best3', CLASS)['enrol-1'].moderated).toBe('');
  });

  it('gives a read-only role no moderation control', async () => {
    await openResults(BEST_N, { role: 'registrar' });

    expect(screen.queryByRole('button', { name: 'Moderate Amani Otieno' })).toBeNull();
    expect(screen.getByText(/Read-only:/)).toBeTruthy();
  });
});

describe('scope', () => {
  it('shows a teacher their own class only', async () => {
    await openResults(BEST_N);

    expect(screen.getByText('Amani Otieno')).toBeTruthy();
    expect(screen.getByText('Bello Mwangi')).toBeTruthy();
    // The other class and its learner are not reachable, so neither appears.
    expect(screen.queryByText('Other Learner')).toBeNull();
    expect(screen.getByTestId('results-table').textContent).not.toContain('ADM-900');
  });

  it('tells a login with no staff record that it reaches no teaching group', async () => {
    renderPage(BEST_N, { actorId: 'user-with-no-staff-record' });

    expect(await screen.findByText('No results to show')).toBeTruthy();
    const notice = screen.getByText('No results to show').parentElement;
    expect(notice?.textContent).toContain('No staff record is linked to this login');
  });
});

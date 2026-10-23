// ABOUTME: Mark entry v2 page tests: the scheme columns and the group's learners, the keyboard and
// ABOUTME: paste paths, the engine's per-cell status, a locked cell that needs a reason, a moderated
// ABOUTME: cell that shows both values, an offline edit that survives and flushes, and teacher scope.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateInput, RepositoryRow, UpdateInput, UpdateOptions, WriteOptions } from '@/data/repository';
import { asId } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';

import { CanonicalRepositoryProvider } from '@/modules/academics/data/canonicalRepository';
import { MarkEntryV2PageContent } from '../MarkEntryV2Page';
import { useMarkEntry } from '../useMarkEntry';
import { createFakeRepository, type FakeRepository } from '@/modules/academics/pages/__tests__/canonicalRepositoryDouble';

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
const CLASS = 'class-0001';
const AREA = 'area-english';
const GROUP = 'group-blue';
const OTHER_GROUP = 'group-green';
const STAFF = 'staff-teacher';
const OTHER_STAFF = 'staff-other';
const USER = 'user-teacher';
const USER_OTHER = 'user-other';
const ASSESS_CAT = 'assessment-cat';
const ASSESS_ET = 'assessment-et';

const LEARNERS = [
  { learner: 'learner-1', enrolment: 'enrol-1', member: 'member-1', given: 'Amani', family: 'Otieno', admission: 'ADM-001' },
  { learner: 'learner-2', enrolment: 'enrol-2', member: 'member-2', given: 'Bello', family: 'Mwangi', admission: 'ADM-002' },
  { learner: 'learner-3', enrolment: 'enrol-3', member: 'member-3', given: 'Chiku', family: 'Njeri', admission: 'ADM-003' },
];

const OTHER_ENROLMENT = 'enrol-other';

function seed(): Parameters<typeof createFakeRepository>[0] {
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
    level: [
      {
        id: LEVEL,
        name: 'Grade 7',
        ordinal: 7,
        is_terminal: false,
        institution_id: INSTITUTION,
      },
    ],
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
    ],
    learning_area: [
      {
        id: AREA,
        code: 'ENG',
        name: 'English',
        kind: 'core',
        programme_id: PROGRAMME,
        level_ids: [LEVEL],
        pathway_ids: [],
        institution_id: INSTITUTION,
      },
    ],
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
    teaching_group: [
      {
        id: GROUP,
        name: 'Grade 7 English Blue',
        campus_id: 'campus-0001',
        academic_year_id: YEAR,
        learning_area_id: AREA,
        level_ids: [LEVEL],
        class_group_ids: [CLASS],
        teacher_ids: [STAFF],
        kind: 'whole_class',
        institution_id: INSTITUTION,
      },
      {
        id: OTHER_GROUP,
        name: 'Grade 7 English Green',
        campus_id: 'campus-0001',
        academic_year_id: YEAR,
        learning_area_id: AREA,
        level_ids: [LEVEL],
        class_group_ids: [CLASS],
        teacher_ids: [OTHER_STAFF],
        kind: 'whole_class',
        institution_id: INSTITUTION,
      },
    ],
    teaching_assignment: [
      {
        id: 'assignment-1',
        staff_id: STAFF,
        teaching_group_id: GROUP,
        role: 'main',
        valid_from: '2026-01-05',
        institution_id: INSTITUTION,
      },
    ],
    teaching_group_member: LEARNERS.map((row) => ({
      id: row.member,
      teaching_group_id: GROUP,
      enrolment_id: row.enrolment,
      valid_from: '2026-01-05',
      institution_id: INSTITUTION,
    })).concat([
      {
        id: 'member-other',
        teaching_group_id: OTHER_GROUP,
        enrolment_id: OTHER_ENROLMENT,
        valid_from: '2026-01-05',
        institution_id: INSTITUTION,
      },
    ]),
    learner: LEARNERS.map((row) => ({
      id: row.learner,
      given_name: row.given,
      family_name: row.family,
      admission_number: row.admission,
      status: 'enrolled',
      name_order: 'given_first',
      gender: 'female',
      residence_status: 'day',
      institution_id: INSTITUTION,
    })),
    enrolment: LEARNERS.map((row) => ({
      id: row.enrolment,
      learner_id: row.learner,
      academic_year_id: YEAR,
      programme_id: PROGRAMME,
      level_id: LEVEL,
      class_group_id: CLASS,
      status: 'active',
      start_date: '2026-01-05',
      institution_id: INSTITUTION,
    })).concat([
      {
        id: OTHER_ENROLMENT,
        learner_id: 'learner-other',
        academic_year_id: YEAR,
        programme_id: PROGRAMME,
        level_id: LEVEL,
        class_group_id: CLASS,
        status: 'active',
        start_date: '2026-01-05',
        institution_id: INSTITUTION,
      },
    ]),
    assessment: [
      {
        id: ASSESS_CAT,
        name: 'CAT 1',
        kind: 'cat',
        scheme_slot: 'CAT',
        academic_period_id: PERIOD,
        learning_area_ids: [AREA],
        class_group_ids: [CLASS],
        level_ids: [LEVEL],
        component_ids: [],
        max_score: 20,
        date_window: { start_date: '2026-02-02', end_date: '2026-02-06' },
        status: 'open',
        institution_id: INSTITUTION,
      },
      {
        id: ASSESS_ET,
        name: 'End of Term',
        kind: 'end_term',
        scheme_slot: 'ET',
        academic_period_id: PERIOD,
        learning_area_ids: [AREA],
        class_group_ids: [CLASS],
        level_ids: [LEVEL],
        component_ids: [],
        max_score: 100,
        date_window: { start_date: '2026-03-23', end_date: '2026-03-27' },
        status: 'open',
        institution_id: INSTITUTION,
      },
    ],
    mark: [],
  };
}

interface CapturedWrite {
  readonly operation: string;
  readonly entity: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly reason: string | undefined;
}

interface Instrumented {
  readonly repository: FakeRepository;
  readonly writes: CapturedWrite[];
}

/**
 * The shared double records what was written but not the options a write carried, and the reason an
 * override needs lives in those options. This wraps `create`/`update` to keep them.
 */
function instrument(base: FakeRepository): Instrumented {
  const writes: CapturedWrite[] = [];
  const originalCreate = base.create.bind(base);
  const originalUpdate = base.update.bind(base);

  const create: FakeRepository['create'] = async <E extends EntityName,>(
    entity: E,
    input: CreateInput<E>,
    options?: WriteOptions
  ): Promise<RepositoryRow<E>> => {
    writes.push({
      operation: 'create',
      entity,
      payload: input as unknown as Readonly<Record<string, unknown>>,
      reason: options?.reason,
    });
    return originalCreate(entity, input, options);
  };

  const update: FakeRepository['update'] = async <E extends EntityName,>(
    entity: E,
    id: RepositoryRow<E>['id'],
    patch: UpdateInput<E>,
    options: UpdateOptions
  ): Promise<RepositoryRow<E>> => {
    writes.push({
      operation: 'update',
      entity,
      payload: patch as unknown as Readonly<Record<string, unknown>>,
      reason: options.reason,
    });
    return originalUpdate(entity, id, patch, options);
  };

  base.create = create;
  base.update = update;
  return { repository: base, writes };
}

let repository: FakeRepository;
let writes: CapturedWrite[];

function renderPage(isOnline: () => boolean = () => true) {
  return render(
    <CanonicalRepositoryProvider repository={repository}>
      <MarkEntryV2PageContent
        actorId={USER}
        role="teacher"
        debounceMs={0}
        isOnline={isOnline}
      />
    </CanonicalRepositoryProvider>
  );
}

async function openGrid(isOnline: () => boolean = () => true): Promise<void> {
  renderPage(isOnline);
  expect(await screen.findByLabelText('CAT 1 for Amani Otieno')).toBeTruthy();
}

function pasteInto(input: HTMLElement, text: string): void {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  fireEvent(input, event);
}

function score(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

/** Walks the workflow from open to the state under test. */
function advance(times: number): void {
  const labels = ['Submit marks', 'Moderate marks', 'Lock marks'];
  for (let step = 0; step < times; step += 1) {
    fireEvent.click(screen.getByRole('button', { name: labels[step] }));
  }
}

beforeEach(() => {
  window.localStorage.clear();
  const instrumented = instrument(createFakeRepository(seed()));
  repository = instrumented.repository;
  writes = instrumented.writes;
});

describe('mark entry v2 grid', () => {
  it('keeps the card explanation behind the info hint instead of on a permanent row', async () => {
    await openGrid();

    // The sentence used to be a paragraph in the card body; it now lives on the card header's hint.
    expect(screen.getByRole('button', { name: 'About this section' })).toBeTruthy();
    expect(screen.queryByText(/Learners down, the scheme/, { selector: 'p' })).toBeNull();
  });

  it('draws a column per assessment and a row per learner of the group', async () => {
    await openGrid();

    expect(screen.getByRole('columnheader', { name: /CAT 1/ })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: /End of Term/ })).toBeTruthy();
    expect(screen.getByText('Bello Mwangi')).toBeTruthy();
    expect(screen.getByText('Chiku Njeri')).toBeTruthy();
  });

  it('moves the focus with the arrow keys, Tab and Enter', async () => {
    await openGrid();
    const first = score('CAT 1 for Amani Otieno');
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(score('End of Term for Amani Otieno'));

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(score('CAT 1 for Amani Otieno'));

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Enter' });
    expect(document.activeElement).toBe(score('CAT 1 for Bello Mwangi'));

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Enter', shiftKey: true });
    expect(document.activeElement).toBe(score('CAT 1 for Amani Otieno'));
  });

  it('pastes a range row-major, keeps the accepted values and names the refused cell', async () => {
    await openGrid();

    pasteInto(score('CAT 1 for Amani Otieno'), '10\t50\n15\t200');

    await waitFor(() => expect(writes).toHaveLength(3));
    expect(writes.map((write) => write.payload.score)).toEqual(['10', '50', '15']);

    // The refused cell is reported with its address, and its value never reaches the grid.
    expect(await screen.findByText(/B2/)).toBeTruthy();
    expect(score('End of Term for Bello Mwangi').value).toBe('');
    expect(score('CAT 1 for Amani Otieno').value).toBe('10');
    expect(score('CAT 1 for Bello Mwangi').value).toBe('15');
  });

  it('never queues a pasted value above the column maximum', async () => {
    await openGrid();

    pasteInto(score('CAT 1 for Amani Otieno'), '30\t50');

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].payload.score).toBe('50');
    expect(score('CAT 1 for Amani Otieno').value).toBe('');
    expect(await screen.findByText(/A1/)).toBeTruthy();
  });

  it('shows the engine status of every cell: missing, out of range and not a number', async () => {
    await openGrid();

    expect(screen.getAllByText('Missing').length).toBe(LEARNERS.length * 2);

    fireEvent.change(score('CAT 1 for Amani Otieno'), { target: { value: '25' } });
    expect(await screen.findByText('Out of range')).toBeTruthy();
    expect(screen.getByText('A score cannot be above the maximum of 20.')).toBeTruthy();
    expect(writes).toHaveLength(0);

    fireEvent.change(score('CAT 1 for Amani Otieno'), { target: { value: 'ten' } });
    expect(await screen.findByText('Not a number')).toBeTruthy();
    expect(writes).toHaveLength(0);
  });

  it('reaches the engine verdict for a missing mark', async () => {
    await openGrid();

    expect(
      screen.getAllByText(
        'This assessment has no mark. The scheme needs it before the learner can be graded.'
      ).length
    ).toBeGreaterThan(0);
  });
});

describe('mark entry workflow', () => {
  it('locks a cell, refuses a change without a reason, and records the reason on the override', async () => {
    await openGrid();
    advance(3);

    expect(screen.getByTestId('workflow-bar').textContent).toContain('locked');
    const lockedCell = score('CAT 1 for Amani Otieno');
    expect(lockedCell.readOnly).toBe(true);
    // Only the focused assessment is locked; the other column is untouched.
    expect(score('End of Term for Amani Otieno').readOnly).toBe(false);

    fireEvent.change(lockedCell, { target: { value: '18' } });
    expect(
      await screen.findByText(/Marks for this assessment are locked. A change needs a reason/)
    ).toBeTruthy();
    expect(writes).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Override with a reason' }));
    fireEvent.change(await screen.findByLabelText('Reason (required)'), {
      target: { value: 'Examination office correction after remarking script 14.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Override' }));

    await waitFor(() => expect(score('CAT 1 for Amani Otieno').readOnly).toBe(false));
    fireEvent.change(score('CAT 1 for Amani Otieno'), { target: { value: '18' } });

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({
      operation: 'create',
      payload: expect.objectContaining({ assessment_id: ASSESS_CAT, score: '18' }),
      reason: 'Examination office correction after remarking script 14.',
    });
  });

  it('shows the original and the moderated value of a moderated cell', async () => {
    repository = createFakeRepository({
      ...seed(),
      mark: [
        {
          id: 'mark-1',
          assessment_id: ASSESS_CAT,
          enrolment_id: 'enrol-1',
          learning_area_id: AREA,
          score: '12',
          status_code: 'present',
          version: 1,
          institution_id: INSTITUTION,
        },
      ],
    });
    const instrumented = instrument(repository);
    repository = instrumented.repository;
    writes = instrumented.writes;

    await openGrid();
    advance(2);
    expect(screen.getByTestId('workflow-bar').textContent).toContain('moderated');

    fireEvent.click(screen.getByRole('button', { name: 'Override with a reason' }));
    fireEvent.change(await screen.findByLabelText('Reason (required)'), {
      target: { value: 'Script re-marked by the examination office.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Override' }));

    await waitFor(() => expect(score('CAT 1 for Amani Otieno').readOnly).toBe(false));
    fireEvent.change(score('CAT 1 for Amani Otieno'), { target: { value: '18' } });

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({
      operation: 'update',
      payload: expect.objectContaining({ score: '18', version: 2 }),
      reason: 'Script re-marked by the examination office.',
    });
    expect(
      await screen.findByText('Moderated: was 12, now 18')
    ).toBeTruthy();
  });

  it('asks for a reason before it reopens a locked group', async () => {
    await openGrid();
    advance(3);

    fireEvent.click(screen.getByRole('button', { name: 'Reopen with a reason' }));
    const confirm = await screen.findByRole('button', { name: 'Reopen' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Reason (required)'), {
      target: { value: 'Head teacher asked for a correction.' },
    });
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(screen.getByTestId('workflow-bar').textContent).toContain('open')
    );
  });
});

describe('mark entry autosave', () => {
  it('keeps an edit made offline, then writes it when the connection returns', async () => {
    let online = false;
    await openGrid(() => online);

    fireEvent.change(score('CAT 1 for Amani Otieno'), { target: { value: '10' } });

    expect(await screen.findByText('1 unsaved edit')).toBeTruthy();
    expect(await screen.findByText(/Offline: edits are kept/)).toBeTruthy();
    await waitFor(() => expect(writes).toHaveLength(0));
    expect(
      window.localStorage.getItem(`schoolpilot.marks.pending.v1:${INSTITUTION}`)
    ).toContain('"score":"10"');

    online = true;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].payload.score).toBe('10');
    await waitFor(() =>
      expect(
        window.localStorage.getItem(`schoolpilot.marks.pending.v1:${INSTITUTION}`)
      ).toBe('[]')
    );
  });

  it('writes each cell once even when it is edited twice before the debounce fires', async () => {
    await openGrid();

    const input = score('CAT 1 for Amani Otieno');
    fireEvent.change(input, { target: { value: '8' } });
    fireEvent.change(input, { target: { value: '9' } });

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].payload.score).toBe('9');
  });
});

describe('mark entry teacher scope', () => {
  it('offers only the teaching groups the teacher is assigned to', async () => {
    await openGrid();

    fireEvent.click(screen.getByRole('combobox', { name: /Teaching group/ }));
    expect(await screen.findByRole('option', { name: 'Grade 7 English Blue' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Grade 7 English Green' })).toBeNull();
  });

  it('refuses a write to another group even when the write path is called directly', async () => {
    const Harness: React.FC = () => {
      const state = useMarkEntry({
        groupId: asId<'teaching_group'>(OTHER_GROUP),
        periodId: asId<'academic_period'>(PERIOD),
        actorId: USER,
        role: 'teacher',
        debounceMs: 0,
      });
      return (
        <div>
          <button onClick={() => state.setScore(0, 0, '50')}>write directly</button>
          <p>{state.refusal ?? 'no refusal'}</p>
          <p>{`rows:${state.rows.length}`}</p>
        </div>
      );
    };

    render(
      <CanonicalRepositoryProvider repository={repository}>
        <Harness />
      </CanonicalRepositoryProvider>
    );

    expect(await screen.findByText('rows:1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'write directly' }));

    expect(await screen.findByText(/outside your scope/)).toBeTruthy();
    await waitFor(() => expect(writes).toHaveLength(0));
  });
});

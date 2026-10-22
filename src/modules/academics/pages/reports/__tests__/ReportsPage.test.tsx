// ABOUTME: The review-to-publish path on the page: generate from the computed results, review and
// ABOUTME: exclude, publish an immutable snapshot, re-issue a linked version, and distribute.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AggregationDefinition } from '@/domain/assessment/aggregation';

import { CanonicalRepositoryProvider } from '@/modules/academics/data/canonicalRepository';
import { createFakeRepository, type FakeRepository } from '@/modules/academics/pages/__tests__/canonicalRepositoryDouble';
import {
  createMemoryPublicationStore,
  createUnavailablePdfExecutor,
  ReportsPageContent,
  type Publication,
} from '..';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, options?: Record<string, unknown>) => {
      const text = typeof fallback === 'string' ? fallback : key;
      if (options === undefined) return text;
      return text.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(options[name] ?? ''));
    },
  }),
}));

const INSTITUTION = '0192a1b2-0000-7000-8000-0000000000a1';
const PROGRAMME = '0192a1b2-0000-7000-8000-0000000000a2';
const YEAR = '0192a1b2-0000-7000-8000-0000000000a3';
const PERIOD = '0192a1b2-0000-7000-8000-0000000000a4';
const LEVEL = '0192a1b2-0000-7000-8000-0000000000a5';
const CLASS = '0192a1b2-0000-7000-8000-0000000000a6';
const SCALE_ID = '0192a1b2-0000-7000-8000-0000000000a7';
const STAFF = '0192a1b2-0000-7000-8000-0000000000a8';
const USER = '0192a1b2-0000-7000-8000-0000000000a9';

const AREAS = [
  { id: 'area-eng', code: 'ENG', name: 'English', group: 'languages' },
  { id: 'area-mat', code: 'MAT', name: 'Mathematics', group: 'mathematics' },
] as const;

const LEARNERS = [
  { learner: 'learner-1', enrolment: 'enrol-1', given: 'Amani', family: 'Otieno', admission: 'ADM-001', eng: '88', mat: '79' },
  { learner: 'learner-2', enrolment: 'enrol-2', given: 'Bello', family: 'Mwangi', admission: 'ADM-002', eng: '70', mat: null },
] as const;

const AGGREGATION: AggregationDefinition = {
  code: 'overall',
  op: 'mean',
  value: 'score',
  precision: 2,
  result_scale: 'subject_bands',
};

function seed() {
  return {
    institution: [{ id: INSTITUTION, name: 'Riverside Academy', short_name: 'Riverside', default_locale: 'en' }],
    programme: [{ id: PROGRAMME, name: 'Junior Secondary', institution_id: INSTITUTION }],
    academic_year: [
      { id: YEAR, name: '2026', start_date: '2026-01-01', end_date: '2026-12-31', status: 'current', institution_id: INSTITUTION },
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
        campus_id: 'campus-1',
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
    staff: [{ id: STAFF, user_id: USER, given_name: 'Grace', family_name: 'Wekesa', institution_id: INSTITUTION }],
    teaching_group: AREAS.map((area) => ({
      id: `group-${area.code}`,
      name: `Grade 7 ${area.name} East`,
      campus_id: 'campus-1',
      academic_year_id: YEAR,
      learning_area_id: area.id,
      level_ids: [LEVEL],
      class_group_ids: [CLASS],
      teacher_ids: [STAFF],
      kind: 'whole_class',
      institution_id: INSTITUTION,
    })),
    teaching_assignment: AREAS.map((area) => ({
      id: `assignment-${area.code}`,
      staff_id: STAFF,
      teaching_group_id: `group-${area.code}`,
      role: 'main',
      valid_from: '2026-01-05',
      institution_id: INSTITUTION,
    })),
    teaching_group_member: LEARNERS.flatMap((learner) =>
      AREAS.map((area) => ({
        id: `member-${learner.enrolment}-${area.code}`,
        teaching_group_id: `group-${area.code}`,
        enrolment_id: learner.enrolment,
        valid_from: '2026-01-05',
        institution_id: INSTITUTION,
      }))
    ),
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
    })),
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
    })),
    assessment: AREAS.map((area) => ({
      id: `assess-${area.code}`,
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
          { code: 'E', label: 'E', min: 0, max: 50, points: 3 },
        ],
        version: '1',
        programme_id: PROGRAMME,
        institution_id: INSTITUTION,
      },
    ],
    mark: LEARNERS.flatMap((learner) =>
      AREAS.filter((area) => (area.code === 'ENG' ? learner.eng : learner.mat) !== null).map((area) => ({
        id: `mark-${learner.enrolment}-${area.code}`,
        assessment_id: `assess-${area.code}`,
        enrolment_id: learner.enrolment,
        learning_area_id: area.id,
        score: area.code === 'ENG' ? learner.eng : learner.mat,
        status_code: 'present',
        institution_id: INSTITUTION,
      }))
    ),
  };
}

let repository: FakeRepository;
let store: ReturnType<typeof createMemoryPublicationStore>;
let printed: number;

beforeEach(() => {
  repository = createFakeRepository(seed());
  store = createMemoryPublicationStore();
  printed = 0;
});

function renderPage() {
  return render(
    <CanonicalRepositoryProvider repository={repository}>
      <ReportsPageContent
        actorId={USER}
        role="teacher"
        aggregation={AGGREGATION}
        store={store}
        pdfExecutor={createUnavailablePdfExecutor('no print worker in this test')}
        hosts={{ verification: 'https://verify.schoolpilot.app', portal: 'https://portal.schoolpilot.app', short: 'https://sp.app' }}
        signingSecret="test-secret"
        appBaseUrl="https://school.example"
        printAll={async () => {
          printed += 1;
        }}
      />
    </CanonicalRepositoryProvider>
  );
}

async function openReady() {
  const view = renderPage();
  await waitFor(() => expect(screen.getByTestId('generate-batch')).not.toBeDisabled());
  return view;
}

async function generate() {
  fireEvent.click(screen.getByTestId('generate-batch'));
  return screen.findByTestId('review-panel');
}

describe('the review step on the page', () => {
  it('refuses to publish before anything has been reviewed', async () => {
    await openReady();
    expect(screen.getByTestId('publish-batch')).toBeDisabled();
    expect(screen.getByTestId('review-empty').textContent).toContain('Nothing goes out unreviewed');
  });

  it('shows the counts and lets the reviewer exclude a learner', async () => {
    await openReady();
    const review = await generate();
    expect(review.textContent).toContain('2 learners');
    expect(screen.getByTestId('review-included').textContent).toContain('2 will be published');

    fireEvent.click(screen.getByLabelText('Include Bello Mwangi'));
    expect(screen.getByTestId('review-included').textContent).toContain('1 will be published');
    expect(screen.getByTestId('publish-batch').textContent).toContain('1');
  });

  it('flags a learner whose aggregate has no complete result', async () => {
    await openReady();
    const review = await generate();
    expect(review.textContent).toContain('Incomplete results');
    expect(review.textContent).toContain('the card prints the gaps');
  });
});

describe('the publish step on the page', () => {
  it('publishes the included learners and freezes their snapshots', async () => {
    await openReady();
    await generate();
    fireEvent.click(screen.getByTestId('publish-batch'));

    await waitFor(() => expect(screen.getByTestId('published-table')).toBeTruthy());
    const records = await store.readAll();
    expect(records).toHaveLength(2);
    expect(records.every((record) => record.version === 1)).toBe(true);

    // The published document carries a valid signed QR; the frozen content keeps the computed grade.
    const amani = records.find((record) => record.content.card.learner.name === 'Amani Otieno') as Publication;
    const verification = amani.document.blocks.find((block) => block.kind === 'verification');
    if (verification?.kind !== 'verification') throw new Error('no verification block');
    expect(verification.payload.qr).not.toBeNull();
    expect(amani.verificationUrl).toContain(`/v1/${amani.documentId}?sig=`);
    expect(amani.content.grades[0].gradeCode).toBe('A');
  });

  it('re-issues a new linked version and leaves the earlier one readable', async () => {
    await openReady();
    await generate();
    fireEvent.click(screen.getByTestId('publish-batch'));
    await waitFor(() => expect(screen.getByTestId('published-table')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Re-issue Amani Otieno' }));
    fireEvent.change(screen.getByLabelText('Reason (required)'), { target: { value: 'The printed copy was lost.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue a new version' }));

    await waitFor(async () => {
      const records = await store.readAll();
      expect(records.some((record) => record.version === 2)).toBe(true);
    });
    const records = await store.readAll();
    const amani = records.filter((record) => record.content.card.learner.name === 'Amani Otieno');
    expect(amani.map((record) => record.version)).toEqual([1, 2]);
    expect(amani[1].supersedes).toBe(amani[0].id);
    expect(amani[1].reason).toBe('The printed copy was lost.');
  });
});

describe('the distribution step on the page', () => {
  it('builds the print queue, prints the batch and reports the PDF path', async () => {
    await openReady();
    await generate();
    fireEvent.click(screen.getByTestId('publish-batch'));
    await waitFor(() => expect(screen.getByTestId('print-queue')).toBeTruthy());

    expect(screen.getByTestId('print-queue').textContent).toContain('0 of 2 done');
    expect(screen.getByTestId('pdf-executor').textContent).toContain('no print worker in this test');
    // The SMS and portal links carry no learner data.
    expect(screen.getByTestId('sms-link').textContent).not.toContain('Amani');
    expect(screen.getByTestId('portal-link').textContent).not.toContain('ADM-');

    fireEvent.click(screen.getByTestId('print-batch'));
    await waitFor(() => expect(screen.getByTestId('print-queue').textContent).toContain('2 of 2 done'));
    expect(printed).toBe(1);

    fireEvent.click(screen.getByTestId('store-pdfs'));
    await waitFor(() => expect(screen.getByTestId('pdf-outcomes')).toBeTruthy());
    expect(screen.getByTestId('pdf-outcomes').textContent).toContain('no print worker in this test');
  });
});

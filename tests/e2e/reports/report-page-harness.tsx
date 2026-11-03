// ABOUTME: Mounts the real Report publishing page over the repository double, so a browser can
// ABOUTME: inspect the period/class pickers and the template control exactly as the app renders them.

import { useEffect, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import '@/index.css';
import { initializeI18n } from '@/i18n/i18n';
import { CanonicalRepositoryProvider } from '@/modules/academics/data/canonicalRepository';
import { createFakeRepository } from '@/modules/academics/pages/__tests__/canonicalRepositoryDouble';
import {
  createMemoryPublicationStore,
  createUnavailablePdfExecutor,
  ReportsPageContent,
} from '@/modules/academics/pages/reports';

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
      {
        id: '0192a1b2-0000-7000-8000-0000000000b4',
        name: 'Term 2',
        academic_year_id: YEAR,
        kind: 'term',
        sequence: 2,
        start_date: '2026-05-04',
        end_date: '2026-08-07',
        is_reporting: true,
        is_billing: true,
        status: 'planned',
        institution_id: INSTITUTION,
      },
      {
        id: '0192a1b2-0000-7000-8000-0000000000b5',
        name: 'Term 3',
        academic_year_id: YEAR,
        kind: 'term',
        sequence: 3,
        start_date: '2026-09-01',
        end_date: '2026-11-27',
        is_reporting: true,
        is_billing: true,
        status: 'planned',
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
      {
        id: '0192a1b2-0000-7000-8000-0000000000c6',
        name: 'West',
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

declare global {
  interface Window {
    __page?: { ready: boolean };
  }
}

/** Fixed debug strip: reports what actually sits on top at the open popup's option area. */

function Harness(): ReactElement {
  useEffect(() => {
    void initializeI18n();
    document.documentElement.setAttribute('data-report-ready', 'true');
    window.__page = { ready: true };
  }, []);

  return (
    <CanonicalRepositoryProvider repository={createFakeRepository(seed())}>
      <ReportsPageContent
        actorId={USER}
        role="teacher"
        aggregation={{
          code: 'overall',
          op: 'mean',
          value: 'score',
          precision: 2,
          result_scale: 'subject_bands',
        }}
        store={createMemoryPublicationStore()}
        pdfExecutor={createUnavailablePdfExecutor('no print worker in this harness')}
        hosts={{ verification: 'https://verify.schoolpilot.app', portal: 'https://portal.schoolpilot.app', short: 'https://sp.app' }}
        signingSecret="harness-secret"
        appBaseUrl="https://school.example"
        printAll={async () => {}}
      />
    </CanonicalRepositoryProvider>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<Harness />);

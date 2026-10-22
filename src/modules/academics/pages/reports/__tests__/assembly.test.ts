// ABOUTME: Tests for bulk generation: a document per learner from the computed results, moderation
// ABOUTME: applied with the engine's value kept, and one learner's failure isolated from the batch.

import { describe, expect, it } from 'vitest';

import { generateBatch, type GenerateOptions } from '../assembly';
import type { GeneratedReport } from '../types';
import {
  AREAS,
  AT,
  HOSTS,
  LEARNERS,
  LOCALES,
  SCHOOL,
  TEMPLATE,
  TEMPLATE_VERSION,
  computeRows,
  type LearnerFixture,
} from './fixtures';

function options(overrides: Partial<GenerateOptions> = {}): GenerateOptions {
  return {
    areas: AREAS,
    rows: computeRows(),
    template: TEMPLATE,
    templateVersion: TEMPLATE_VERSION,
    locales: LOCALES,
    locale: 'en',
    defaultLocale: 'en',
    school: SCHOOL,
    term: { name: 'Term 1', year: '2026' },
    periodId: 'period-1',
    verificationHost: HOSTS.verification,
    documentIdFor: (_row, index) => `RC-2026-${String(index + 1).padStart(6, '0')}`,
    now: () => AT,
    ...overrides,
  };
}

function reportFor(batch: ReturnType<typeof generateBatch>, enrolmentId: string): GeneratedReport {
  const report = batch.reports.find((entry) => entry.enrolmentId === enrolmentId);
  expect(report).toBeDefined();
  return report as GeneratedReport;
}

describe('bulk generation', () => {
  it('produces one document per learner, from the results the engine computed', () => {
    const batch = generateBatch(options());

    expect(batch.progress).toEqual({ total: 3, done: 3, failed: 0 });
    expect(batch.failures).toEqual([]);
    expect(batch.reports.map((report) => report.learnerName)).toEqual([
      'Amani Otieno',
      'Bello Mwangi',
      'Chidi Nkemdirim',
    ]);

    const amani = reportFor(batch, 'enrol-amani');
    const results = amani.card.results;
    expect(results?.rows.map((row) => row.cells.total)).toEqual(['88', '79', '65']);
    expect(results?.rows.map((row) => row.cells.grade)).toEqual(['A', 'B', 'C']);
    expect(results?.totals?.cells.grade).toBe('B');
    expect(amani.grades.map((grade) => grade.gradeCode)).toEqual(['A', 'B', 'C']);
    expect(amani.incomplete).toBe(false);
  });

  it('prints the reason for an area with no result instead of a grade, and flags the report', () => {
    const learners: LearnerFixture[] = LEARNERS.map((learner) =>
      learner.enrolmentId === 'enrol-bello'
        ? { ...learner, scores: { ENG: '70', MAT: '60', SCI: null } }
        : learner
    );
    const batch = generateBatch(options({ rows: computeRows(learners) }));

    const bello = reportFor(batch, 'enrol-bello');
    expect(bello.incomplete).toBe(true);
    const science = bello.card.results?.rows[2];
    expect(science?.cells.total).toBe('Incomplete');
    expect(science?.cells.remark).toContain('no mark');
    expect(bello.card.rubric?.rows[2].level).toBe('Incomplete');
    // The other learners are untouched by one learner's gap.
    expect(batch.progress.failed).toBe(0);
    expect(reportFor(batch, 'enrol-amani').incomplete).toBe(false);
  });

  it('isolates one learner’s failure and carries the rest of the batch', () => {
    const learners: LearnerFixture[] = LEARNERS.map((learner) =>
      learner.enrolmentId === 'enrol-bello' ? { ...learner, learnerName: '  ' } : learner
    );
    const batch = generateBatch(options({ rows: computeRows(learners) }));

    expect(batch.progress).toEqual({ total: 3, done: 2, failed: 1 });
    expect(batch.failures).toEqual([
      {
        enrolmentId: 'enrol-bello',
        learnerName: '  ',
        reason: 'No learner name is recorded for this enrolment.',
      },
    ]);
    expect(batch.reports.map((report) => report.enrolmentId)).toEqual(['enrol-amani', 'enrol-chidi']);
  });

  it('fails every learner with the reason when no learning area is marked, without throwing', () => {
    const batch = generateBatch(options({ areas: [] }));

    expect(batch.progress).toEqual({ total: 3, done: 0, failed: 3 });
    expect(batch.failures[0].reason).toBe(
      'No learning area is marked for this class in this period.'
    );
  });

  it('keeps the moderated grade with the engine’s value beside it', () => {
    const batch = generateBatch(
      options({
        moderationOf: (enrolmentId) =>
          enrolmentId === 'enrol-amani'
            ? {
                original: 'B',
                value: 'A',
                reason: 'Remarked script 14.',
                actorId: 'exams-officer',
                at: AT,
              }
            : null,
      })
    );

    const amani = reportFor(batch, 'enrol-amani');
    expect(amani.aggregate.engineGrade).toBe('B');
    expect(amani.aggregate.moderatedValue).toBe('A');
    expect(amani.aggregate.publishedGrade).toBe('A');
    expect(amani.moderation?.reason).toBe('Remarked script 14.');

    const summary = amani.card.summary ?? [];
    expect(summary.find((item) => item.key === 'summary.mean_grade')?.value).toBe('A');
    expect(summary.find((item) => item.key === 'summary.moderated')?.value).toBe(
      'A (engine computed B)'
    );
    expect(summary.find((item) => item.key === 'summary.moderation_reason')?.value).toBe(
      'Remarked script 14.'
    );
    // The totals row prints the published grade too.
    expect(amani.card.results?.totals?.cells.grade).toBe('A');
  });

  it('marks a learner outside scope for the reviewer', () => {
    const batch = generateBatch(
      options({ outsideScope: new Set(['enrol-chidi']) })
    );
    expect(reportFor(batch, 'enrol-chidi').outsideScope).toBe(true);
    expect(reportFor(batch, 'enrol-amani').outsideScope).toBe(false);
  });

  it('gives the preview document no valid QR', () => {
    const batch = generateBatch(options());
    const preview = reportFor(batch, 'enrol-amani').previewDocument;
    expect(preview.preview).toBe(true);
    const verification = preview.blocks.find((block) => block.kind === 'verification');
    expect(verification).toBeDefined();
    if (verification?.kind === 'verification') {
      expect(verification.payload.qr).toBeNull();
      expect(verification.payload.url).toBe(
        `${HOSTS.verification}/v1/RC-2026-000001?preview=1`
      );
    }
  });

  it('attaches attendance and comments when the caller supplies them', () => {
    const batch = generateBatch(
      options({
        attendanceOf: () => ({ daysOpen: 62, present: 58, absent: 4, late: 2 }),
        commentsOf: () => [{ role: 'class_teacher', text: 'A steady term.' }],
      })
    );
    const amani = reportFor(batch, 'enrol-amani');
    expect(amani.card.attendance?.daysOpen).toBe(62);
    expect(amani.card.comments?.[0].text).toBe('A steady term.');
  });
});

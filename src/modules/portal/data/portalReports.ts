// ABOUTME: The term reports the portal shows: a published report card per reporting term, the final
// ABOUTME: results that sit behind it, and an explicit not-published state where nothing is published.

import { assertLearnerAccess, type PortalIdentity } from './portalAccess';

/** One final learning-area result the portal shows on a term report. */
export interface PortalReportResult {
  readonly areaName: string;
  readonly score: number | null;
  readonly grade: string | null;
  readonly points: number | null;
}

/** One reporting term, as the portal shows it. */
export interface PortalTermReport {
  readonly periodId: string;
  readonly periodName: string;
  readonly state: 'published' | 'not-published';
  readonly reportCardId: string | null;
  readonly templateCode: string | null;
  readonly templateVersion: string | null;
  readonly publishedAt: string | null;
  readonly hasPdf: boolean;
  readonly results: readonly PortalReportResult[];
}

export interface ReportPeriodSource {
  readonly id: string;
  readonly name: string;
  readonly start_date: string;
  readonly is_reporting: boolean;
}

export interface ReportEnrolmentSource {
  readonly id: string;
  readonly learner_id: string;
  readonly status: string;
}

export interface ReportCardSource {
  readonly id: string;
  readonly enrolment_id: string;
  readonly academic_period_id: string;
  readonly template_code: string;
  readonly template_version: string;
  readonly version: number;
  readonly pdf_attachment_id?: string;
  readonly published_at?: string;
  readonly deleted_at?: string | null;
}

export interface ResultSource {
  readonly id: string;
  readonly enrolment_id: string;
  readonly academic_period_id: string;
  readonly learning_area_id: string;
  readonly score?: number;
  readonly grade?: string;
  readonly points?: number;
  readonly is_final: boolean;
  readonly deleted_at?: string | null;
}

export interface LearningAreaSource {
  readonly id: string;
  readonly name: string;
}

export interface TermReportSources {
  readonly periods: readonly ReportPeriodSource[];
  readonly enrolments: readonly ReportEnrolmentSource[];
  readonly reportCards: readonly ReportCardSource[];
  readonly results: readonly ResultSource[];
  readonly learningAreas: readonly LearningAreaSource[];
}

const isLive = (row: { readonly deleted_at?: string | null }): boolean =>
  row.deleted_at === undefined || row.deleted_at === null;

/** The latest published card for one period, by publication time then version. */
function latestPublished(
  cards: readonly ReportCardSource[]
): ReportCardSource | undefined {
  return [...cards].sort((left, right) => {
    const byTime = (right.published_at ?? '').localeCompare(left.published_at ?? '');
    return byTime !== 0 ? byTime : right.version - left.version;
  })[0];
}

/**
 * Every reporting term the learner's school records, newest first.
 *
 * A term is `published` when a report card for the learner's enrolment in that term carries a
 * `published_at`; drafts and carded-but-unpublished terms are `not-published`, and the results shown
 * are the learner's final ones for the term, so a draft card never leaks a provisional grade.
 */
export function readTermReports(
  identity: PortalIdentity,
  learnerId: string,
  sources: TermReportSources
): readonly PortalTermReport[] {
  assertLearnerAccess(identity, learnerId);

  const enrolmentIds = new Set(
    sources.enrolments.filter((row) => row.learner_id === learnerId).map((row) => row.id)
  );
  const areasById = new Map(sources.learningAreas.map((area) => [area.id, area]));

  return [...sources.periods]
    .filter((period) => period.is_reporting)
    .sort((left, right) => right.start_date.localeCompare(left.start_date))
    .map((period) => {
      const periodCards = sources.reportCards.filter(
        (card) =>
          card.academic_period_id === period.id &&
          enrolmentIds.has(card.enrolment_id) &&
          isLive(card) &&
          Boolean(card.published_at)
      );
      const card = latestPublished(periodCards);

      const results = card
        ? sources.results
            .filter(
              (result) =>
                result.academic_period_id === period.id &&
                enrolmentIds.has(result.enrolment_id) &&
                result.is_final &&
                isLive(result)
            )
            .map((result) => ({
              areaName: areasById.get(result.learning_area_id)?.name ?? 'Learning area',
              score: result.score ?? null,
              grade: result.grade ?? null,
              points: result.points ?? null,
            }))
        : [];

      return {
        periodId: period.id,
        periodName: period.name,
        state: card ? 'published' : 'not-published',
        reportCardId: card?.id ?? null,
        templateCode: card?.template_code ?? null,
        templateVersion: card?.template_version ?? null,
        publishedAt: card?.published_at ?? null,
        hasPdf: Boolean(card?.pdf_attachment_id),
        results,
      } satisfies PortalTermReport;
    });
}

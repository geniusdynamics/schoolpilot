// ABOUTME: The vocabulary of report publishing: the generated batch and its failures, the review a
// ABOUTME: publisher signs off, the frozen snapshot and its versions, and the distribution channels.

import type {
  ReportBlockModel,
  ReportCardData,
  ReportLocaleBundles,
  ReportPageFurniture,
  ReportPageGeometry,
  ReportReduction,
  ReportTemplate,
  ReportTemplateIssue,
} from '@/domain/reports/types';

import type { GradeOverrideView } from '../results';

// --------------------------------------------------------------- generation
/** One learner's generated report: the frozen card inputs and the document resolved from them. */
export interface GeneratedReport {
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly admissionNumber: string | null;
  readonly house: string | null;
  /** The opaque id the published snapshot and its QR point at. */
  readonly documentId: string;
  /** The period the results belong to; the publication's unique key includes it. */
  readonly periodId: string;
  readonly issuedAt: string;
  /** The card the document was assembled from, before signing. */
  readonly card: ReportCardData;
  /** The resolved grades, frozen with the card so a later mark change cannot reach them. */
  readonly grades: readonly FrozenGrade[];
  readonly aggregate: FrozenAggregate;
  /** The document as it would print before it is published: no valid QR. */
  readonly previewDocument: DocumentSnapshot;
  /** True when the learner's aggregate has no complete result, so the card carries gaps. */
  readonly incomplete: boolean;
  /** The moderation in force when the report was generated, if any. */
  readonly moderation: GradeOverrideView | null;
  /** True when the learner is outside the actor's teaching scope. */
  readonly outsideScope: boolean;
}

/** A learner the batch could not generate for. One failure never aborts the batch. */
export interface GenerationFailure {
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly reason: string;
}

export interface BatchProgress {
  readonly total: number;
  readonly done: number;
  readonly failed: number;
}

export interface GenerationBatch {
  readonly reports: readonly GeneratedReport[];
  readonly failures: readonly GenerationFailure[];
  readonly progress: BatchProgress;
  /** The template the batch was generated with, frozen into every snapshot the batch publishes. */
  readonly template: ReportTemplate;
  readonly templateVersion: string;
}

// ------------------------------------------------------------------- review

/**
 * How one learner stands at review time.
 * `ready` publishes as it is; `incomplete` publishes with gaps the reviewer accepts; `moderated`
 * carries an override; `outside_scope` is a learner the actor's teaching groups do not reach.
 */
export type ReviewStatus = 'ready' | 'incomplete' | 'moderated' | 'outside_scope';

export interface ReviewItem {
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly status: ReviewStatus;
  /** Plain-language lines: what is missing, what was moderated, why the learner is out of scope. */
  readonly issues: readonly string[];
  readonly moderation: GradeOverrideView | null;
  /** True when the reviewer excluded the learner from the publish. */
  readonly excluded: boolean;
}

export interface ReviewSummary {
  readonly total: number;
  readonly ready: number;
  readonly incomplete: number;
  readonly moderated: number;
  readonly outsideScope: number;
  readonly excluded: number;
  /** The learners that will be published: neither excluded nor out of scope. */
  readonly included: number;
  readonly failures: readonly GenerationFailure[];
}

/** A batch a reviewer has seen. Nothing publishes without one. */
export interface ReviewedBatch {
  readonly batch: GenerationBatch;
  readonly items: readonly ReviewItem[];
  readonly summary: ReviewSummary;
  readonly reviewedBy: string;
  readonly reviewedAt: string;
}

// ----------------------------------------------------------------- snapshot

/** A `ReportDocumentModel` with the label lookup frozen as plain data, so it survives JSON. */
export interface DocumentSnapshot {
  readonly documentId: string;
  readonly template: { readonly code: string; readonly name: string };
  readonly locale: string;
  readonly dir: 'ltr' | 'rtl';
  /**
   * The locale bundles the labels were resolved from, plus the chain, so the same lookup can be
   * rebuilt from the snapshot alone. The keys are data-driven (`summary.total`, `comment.<role>`),
   * so a frozen map of resolved strings could never be complete; the frozen source can.
   */
  readonly labelSource: {
    readonly bundles: ReportLocaleBundles;
    readonly locale: string;
    readonly defaultLocale: string;
  };
  readonly page: ReportPageGeometry;
  readonly blocks: readonly ReportBlockModel[];
  readonly furniture: ReportPageFurniture;
  readonly reduction: ReportReduction;
  readonly issues: readonly ReportTemplateIssue[];
  readonly pagination: 'sheet' | 'flow';
  readonly preview: boolean;
  readonly issuedAt: string | null;
  readonly commentMaxLength: number | null;
  readonly title: string;
}

/** One learning area's grade as the publish froze it, with the moderation beside the engine value. */
export interface FrozenGrade {
  readonly areaCode: string;
  readonly areaName: string;
  readonly percent: string | null;
  readonly gradeCode: string | null;
  readonly gradeLabel: string | null;
}

export interface FrozenAggregate {
  readonly code: string;
  /** What the engine computed. */
  readonly engineValue: string | null;
  readonly engineGrade: string | null;
  /** What a moderator set, or null when the engine's grade stands. */
  readonly moderatedValue: string | null;
  readonly moderationReason: string | null;
  readonly moderationActorId: string | null;
  readonly moderationAt: string | null;
  /** The grade the published card shows: the moderated one when it exists, else the engine's. */
  readonly publishedGrade: string | null;
}

/** The exact content a publish froze. Every member is plain data, so it never drifts. */
export interface SnapshotContent {
  readonly documentId: string;
  readonly issuedAt: string;
  readonly template: ReportTemplate;
  readonly templateVersion: string;
  readonly locale: string;
  readonly card: ReportCardData;
  readonly grades: readonly FrozenGrade[];
  readonly aggregate: FrozenAggregate;
}

/** One published, frozen version of a learner's report. */
export interface Publication {
  readonly id: string;
  readonly documentId: string;
  readonly enrolmentId: string;
  readonly periodId: string;
  readonly templateCode: string;
  readonly templateVersion: string;
  /** 1 for the first issue, 2 for the first re-issue, and so on. */
  readonly version: number;
  /** The `id` of the version this one replaces, or null for the first issue. */
  readonly supersedes: string | null;
  /** The reason a re-issue was made; null for the first issue. */
  readonly reason: string | null;
  readonly publishedBy: string;
  readonly publishedAt: string;
  readonly snapshotHash: string;
  readonly signature: string;
  readonly content: SnapshotContent;
  readonly document: DocumentSnapshot;
  /** The absolute signed verification URL the QR carries. */
  readonly verificationUrl: string;
  /** The shareable guardian-portal link to this snapshot. */
  readonly portalUrl: string;
  /** The opaque short link the SMS carries. */
  readonly smsUrl: string;
}

// ------------------------------------------------------------- distribution

export type PrintStatus = 'pending' | 'printing' | 'done' | 'failed';

/** A sort order for a batch print run (spec 07 §6). */
export type PrintOrder = 'admission' | 'surname' | 'house';

export interface PrintQueueEntry {
  readonly documentId: string;
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly admissionNumber: string | null;
  readonly house: string | null;
  readonly status: PrintStatus;
  readonly attempts: number;
  readonly lastError: string | null;
}

export interface PrintQueueProgress {
  readonly total: number;
  readonly done: number;
  readonly failed: number;
  readonly pending: number;
  readonly printing: number;
}

export type PdfRenderOutcome =
  | { readonly ok: true; readonly documentId: string; readonly bytesLength: number }
  | { readonly ok: false; readonly documentId: string; readonly reason: string };

export interface DistributionLink {
  readonly kind: 'portal' | 'sms' | 'verification';
  readonly url: string;
  /** What the link resolves to, in plain language, for the reviewer and for the test. */
  readonly resolvesTo: string;
}

/** The SMS the school sends. It names the school and the notice, never the learner. */
export interface SmsNotice {
  readonly to: string | null;
  readonly body: string;
  readonly link: string;
}

// -------------------------------------------------------------------- errors

export type ReportPublishErrorCode =
  | 'no_review'
  | 'nothing_to_publish'
  | 'not_found'
  | 'already_published'
  | 'reason_required'
  | 'invalid_document_id'
  | 'invalid_signature';

/** A publish refusal that says what happened and what to do next. */
export class ReportPublishError extends Error {
  readonly code: ReportPublishErrorCode;

  constructor(code: ReportPublishErrorCode, message: string) {
    super(message);
    this.name = 'ReportPublishError';
    this.code = code;
  }
}

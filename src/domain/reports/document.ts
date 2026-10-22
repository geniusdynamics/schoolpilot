// ABOUTME: Builds the resolved report document: ordered non-empty blocks, their labels, the page
// ABOUTME: geometry, the direction, the furniture text and the verification QR.

import { directionOf } from './bidi';
import { emptyText as emptyTextFor, blockHeading, resolveLabels, type ReportLabels } from './labels';
import { qrMatrix } from './qr';
import { columnsFor, resolveTemplate, type ResolvedTemplate, type ResolvedTemplateBlock } from './template';
import type {
  BlockPayloads,
  QrMatrix,
  ReportBlockKind,
  ReportBlockModel,
  ReportCardData,
  ReportColumnSpec,
  ReportDocumentModel,
  ReportLearnerField,
  ReportLocaleBundles,
  ReportPageFurniture,
  ReportRating,
  ReportResultRow,
  ReportTemplate,
  ReportTemplateIssue,
} from './types';
import { buildVerificationLink, qrSizeMmFor, VerificationLinkError } from './verification';

const isText = (value: string | null | undefined): value is string => typeof value === 'string' && value.trim() !== '';

export interface ReportVerificationConfig {
  readonly host: string;
  /** base64url signature from the publish service (P2-D03). Absent means unpublished. */
  readonly signature?: string | null;
  readonly preview?: boolean;
}

export interface ResolveDocumentOptions {
  readonly template: ReportTemplate;
  readonly card: ReportCardData;
  /** Pack locale files keyed by locale: `{ en: {...}, sw: {...} }`. */
  readonly locales?: ReportLocaleBundles;
  readonly locale?: string;
  readonly defaultLocale?: string;
  /** Defaults to the template code; a published document carries the id the QR points at. */
  readonly documentId?: string;
  readonly issuedAt?: string | null;
  readonly verification?: ReportVerificationConfig | null;
  readonly layout?: 'auto' | 'full' | 'reduced';
  /** `sheet` for a one-card document, `flow` for a multi-page document that needs page numbers. */
  readonly pagination?: 'sheet' | 'flow';
  readonly title?: string;
}

interface VerificationState {
  readonly url: string | null;
  readonly preview: boolean;
  readonly qr: QrMatrix | null;
  readonly qrSizeMm: number;
  readonly issues: readonly ReportTemplateIssue[];
}

const NO_VERIFICATION: VerificationState = { url: null, preview: true, qr: null, qrSizeMm: 16, issues: [] };

function resolveVerification(
  config: ReportVerificationConfig | null | undefined,
  documentId: string
): VerificationState {
  if (!config || !isText(config.host)) return NO_VERIFICATION;
  try {
    const link = buildVerificationLink({
      host: config.host,
      documentId,
      signature: config.signature,
      preview: config.preview,
    });
    // An unpublished document must not carry a valid-looking code: no QR at all, a visible label.
    if (link.preview) return { ...NO_VERIFICATION, url: link.url };
    const qr = qrMatrix(link.url);
    return { url: link.url, preview: false, qr, qrSizeMm: qrSizeMmFor(qr.version), issues: [] };
  } catch (error) {
    if (error instanceof VerificationLinkError) return NO_VERIFICATION;
    return {
      ...NO_VERIFICATION,
      issues: [{ code: 'qr_overflow', path: 'verification', detail: error instanceof Error ? error.message : 'QR encoding failed' }],
    };
  }
}

function learnerFields(card: ReportCardData): ReportLearnerField[] {
  const fields: ReportLearnerField[] = [{ key: 'learner.name', value: card.learner.name }];
  const optional: [string, string | null | undefined][] = [
    ['learner.admission_no', card.learner.admissionNo],
    ['learner.class', card.learner.className],
    ['learner.house', card.learner.house],
  ];
  for (const [key, value] of optional) {
    if (isText(value)) fields.push({ key, value });
  }
  for (const field of card.learner.fields ?? []) {
    if (isText(field.value)) fields.push(field);
  }
  return fields;
}

function ratingPayload(ratings: readonly ReportRating[] | null | undefined): { ratings: readonly ReportRating[] } {
  return { ratings: (ratings ?? []).filter((rating) => isText(rating.name)) };
}

interface BlockContext {
  readonly labels: ReportLabels;
  readonly card: ReportCardData;
  readonly verification: VerificationState;
  readonly documentId: string;
  readonly issuedAt: string | null;
}

/**
 * Assembles one block. The cast is the one place the model correlates a block kind with its payload:
 * every call names the kind, so a payload of the wrong shape is a compile error at the call site.
 */
function makeBlock<K extends ReportBlockKind>(
  kind: K,
  context: BlockContext,
  block: ResolvedTemplateBlock,
  payload: BlockPayloads[K],
  empty: boolean,
  flow: boolean
): ReportBlockModel {
  return {
    kind,
    heading: kind === 'header' ? null : blockHeading(context.labels, kind, block.labelKey),
    payload,
    emptyText: empty ? emptyTextFor(context.labels, kind) : null,
    flow,
  } as ReportBlockModel;
}

function resultsColumns(labels: ReportLabels, block: ResolvedTemplateBlock): ReportColumnSpec[] {
  return columnsFor(labels, block.columns);
}

/**
 * Resolves one template against one card. Pure: it reads no store, no clock and no DOM, so the same
 * options always produce the same document and a test can assert every block's model directly.
 */
export function resolveDocument(options: ResolveDocumentOptions): ReportDocumentModel {
  const locale = options.locale ?? options.defaultLocale ?? 'en';
  const defaultLocale = options.defaultLocale ?? 'en';
  const labels = resolveLabels({ bundles: options.locales ?? {}, locale, defaultLocale });
  const resolved: ResolvedTemplate = resolveTemplate(options.template, { layout: options.layout });
  const card = options.card;
  const documentId = options.documentId ?? options.template.code;
  const issuedAt = options.issuedAt ?? null;
  // A pack that names the document in its locale (`report.title`) gets a translated title; otherwise
  // the template's own name is the title.
  const title = options.title ?? (labels.has('report.title') ? labels.get('report.title') : resolved.name);
  const verification = resolveVerification(options.verification, documentId);
  const context: BlockContext = { labels, card, verification, documentId, issuedAt };

  const blocks: ReportBlockModel[] = resolved.blocks.map((block) => {
    switch (block.kind) {
      case 'header':
        return makeBlock('header', context, block, {
          school: card.school,
          term: card.term ?? null,
          title,
        }, !isText(card.school.name), false);

      case 'learner':
        return makeBlock('learner', context, block, {
          learner: card.learner,
          fields: learnerFields(card),
        }, !isText(card.learner.name), false);

      case 'attendance': {
        const attendance = card.attendance ?? null;
        const hasAttendance = attendance !== null && attendance.daysOpen > 0;
        return makeBlock('attendance', context, block, {
          attendance: attendance ?? { daysOpen: 0, present: 0, absent: 0 },
        }, !hasAttendance, false);
      }

      case 'results_table': {
        const rows: readonly ReportResultRow[] = card.results?.rows ?? [];
        return makeBlock('results_table', context, block, {
          columns: resultsColumns(labels, block),
          rows,
          totals: card.results?.totals ?? null,
        }, rows.length === 0, true);
      }

      case 'rubric_table': {
        const rows = card.rubric?.rows ?? [];
        return makeBlock('rubric_table', context, block, {
          headings: {
            area: labels.get('rubric.area'),
            strand: labels.get('rubric.strand'),
            level: labels.get('rubric.level'),
            descriptor: labels.get('rubric.descriptor'),
          },
          rows,
        }, rows.length === 0, true);
      }

      case 'competencies':
        return makeBlock('competencies', context, block, ratingPayload(card.competencies), (card.competencies ?? []).length === 0, false);

      case 'affective_psychomotor':
        return makeBlock('affective_psychomotor', context, block, ratingPayload(card.traits), (card.traits ?? []).length === 0, false);

      case 'co_curricular': {
        const activities = (card.coCurricular ?? []).filter(isText);
        return makeBlock('co_curricular', context, block, { activities }, activities.length === 0, false);
      }

      case 'summary': {
        const items = (card.summary ?? []).filter((item) => isText(item.value));
        return makeBlock('summary', context, block, { items }, items.length === 0, false);
      }

      case 'comments': {
        const comments = (card.comments ?? []).filter((comment) => isText(comment.text));
        return makeBlock('comments', context, block, { comments }, comments.length === 0, false);
      }

      case 'progression': {
        const progression = card.progression ?? null;
        return makeBlock('progression', context, block, {
          progression: progression ?? { decision: '' },
        }, !isText(progression?.decision), false);
      }

      case 'fees': {
        const fees = card.fees ?? {};
        const hasFees = isText(fees.balance) || isText(fees.nextTerm) || isText(fees.note);
        return makeBlock('fees', context, block, { fees }, !hasFees, false);
      }

      case 'calendar': {
        const calendar = card.calendar ?? {};
        const hasCalendar = isText(calendar.closing) || isText(calendar.opening);
        return makeBlock('calendar', context, block, { calendar }, !hasCalendar, false);
      }

      case 'signatures': {
        const signatures = (card.signatures ?? []).filter((signature) => isText(signature.role));
        return makeBlock('signatures', context, block, { signatures }, signatures.length === 0, false);
      }

      case 'verification':
        return makeBlock('verification', context, block, {
          documentId,
          issuedAt,
          url: verification.url,
          preview: verification.preview,
          qr: verification.qr,
          qrSizeMm: verification.qrSizeMm,
        }, verification.url === null, false);
    }
  });

  const furniture: ReportPageFurniture = {
    leftText: `${title} · ${documentId}`,
    pageNumbers: options.pagination === 'flow',
    fontPt: 7.5,
    color: '#4b5563',
  };

  return {
    documentId,
    template: { code: resolved.code, name: resolved.name },
    locale,
    dir: directionOf(locale),
    labels,
    page: resolved.page,
    blocks,
    furniture,
    reduction: resolved.reduction,
    issues: [...resolved.issues, ...verification.issues],
    pagination: options.pagination ?? 'sheet',
    preview: verification.preview,
    issuedAt,
    commentMaxLength: resolved.commentMaxLength,
    title,
  };
}

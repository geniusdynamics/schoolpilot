// ABOUTME: The plain data model of a printable report: the pack template shape, the card data the
// ABOUTME: assembly layer supplies, and the resolved document model the React print surface renders.

// ------------------------------------------------------------------ template

/** The 15 block types of spec 03 §8.1, in the order the schema lists them. */
export type ReportBlockKind =
  | 'header'
  | 'learner'
  | 'attendance'
  | 'results_table'
  | 'rubric_table'
  | 'competencies'
  | 'affective_psychomotor'
  | 'co_curricular'
  | 'summary'
  | 'comments'
  | 'progression'
  | 'fees'
  | 'calendar'
  | 'signatures'
  | 'verification';

export const REPORT_BLOCK_KINDS: readonly ReportBlockKind[] = [
  'header',
  'learner',
  'attendance',
  'results_table',
  'rubric_table',
  'competencies',
  'affective_psychomotor',
  'co_curricular',
  'summary',
  'comments',
  'progression',
  'fees',
  'calendar',
  'signatures',
  'verification',
];

/** Blocks a template may include at most once (a second occurrence is a template defect). */
export const SINGLE_INSTANCE_BLOCKS: readonly ReportBlockKind[] = [
  'header',
  'learner',
  'attendance',
  'summary',
  'progression',
  'fees',
  'calendar',
  'signatures',
  'verification',
];

/** The configurable columns of a results table (spec 03 §8.1). */
export type ReportColumnKind =
  | 'components'
  | 'slots'
  | 'total'
  | 'grade'
  | 'points'
  | 'position'
  | 'class_mean'
  | 'highest'
  | 'lowest'
  | 'teacher_initials'
  | 'remark';

export const REPORT_COLUMN_KINDS: readonly ReportColumnKind[] = [
  'components',
  'slots',
  'total',
  'grade',
  'points',
  'position',
  'class_mean',
  'highest',
  'lowest',
  'teacher_initials',
  'remark',
];

export type ReportPageSize = 'A4' | 'A5';
export type ReportOrientation = 'portrait' | 'landscape';

/** `template.page` as the pack schema declares it; both members are optional (A4 portrait default). */
export interface ReportPageSpec {
  readonly size?: ReportPageSize;
  readonly orientation?: ReportOrientation;
}

export interface ReportTemplateBlock {
  readonly type: ReportBlockKind;
  readonly label_key?: string;
  readonly columns?: readonly ReportColumnKind[];
}

/** A `reports/*.report.json` document (packs/schema/report.schema.json). */
export interface ReportTemplate {
  readonly code: string;
  readonly name: string;
  readonly levels?: readonly string[];
  readonly page?: ReportPageSpec;
  readonly blocks: readonly ReportTemplateBlock[];
  readonly comment_max_length?: number;
}

// -------------------------------------------------------------------- locale

/** One pack locale file: labels plus band descriptors (the JSON under a pack's locales directory). */
export interface ReportLocaleBundle {
  readonly labels?: Readonly<Record<string, string>>;
  readonly descriptors?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

export type ReportLocaleBundles = Readonly<Record<string, ReportLocaleBundle>>;

/**
 * The resolved label source for one document: the chain is already applied, so `get` never returns an
 * empty string. Carried on the document model so the print surface needs nothing but the model.
 */
export interface ReportLabels {
  get(key: string): string;
  has(key: string): boolean;
  readonly locale: string;
}

// ---------------------------------------------------------------------- card

export interface ReportSchool {
  readonly name: string;
  readonly motto?: string | null;
  readonly address?: string | null;
  readonly contact?: string | null;
  /** Data URI or same-origin URL. Vector logos stay vector in the PDF. */
  readonly logo?: string | null;
  /** Natural pixel width of a raster logo, so the surface can warn below 240 px (≈300 DPI at 20 mm). */
  readonly logoPixelWidth?: number | null;
}

export interface ReportTerm {
  readonly name?: string | null;
  readonly year?: string | null;
}

export interface ReportLearnerField {
  /** Locale key such as `learner.house`; resolved through the label chain. */
  readonly key: string;
  readonly value: string;
}

export interface ReportLearner {
  readonly name: string;
  readonly admissionNo?: string | null;
  readonly className?: string | null;
  readonly house?: string | null;
  readonly photo?: string | null;
  readonly fields?: readonly ReportLearnerField[];
}

export interface ReportAttendance {
  readonly daysOpen: number;
  readonly present: number;
  readonly absent: number;
  readonly late?: number | null;
}

/**
 * One results row. Every cell is already formatted by the caller: numbers, fractions and status
 * codes are presentation values, so this layer never re-formats a score.
 */
export interface ReportResultRow {
  readonly code: string;
  readonly name: string;
  readonly cells: Readonly<Partial<Record<ReportColumnKind, string>>>;
}

export interface ReportResults {
  readonly rows: readonly ReportResultRow[];
  /** Rendered as a totals row inside `tbody` (a `tfoot` repeats on every page — DR-05). */
  readonly totals?: ReportResultRow | null;
}

export interface ReportRubricRow {
  readonly area: string;
  readonly strand?: string | null;
  readonly level: string;
  readonly descriptor?: string | null;
}

export interface ReportRubric {
  readonly rows: readonly ReportRubricRow[];
  /** Optional band descriptors keyed by level, already resolved for the locale. */
  readonly descriptors?: Readonly<Record<string, string>> | null;
}

export interface ReportRating {
  readonly name: string;
  readonly level: string;
  readonly descriptor?: string | null;
}

export interface ReportSummaryItem {
  /** Locale key such as `summary.total`; resolved through the label chain. */
  readonly key: string;
  readonly value: string;
}

export interface ReportComment {
  /** Role key such as `class_teacher`; the label chain resolves `comment.<role>`. */
  readonly role: string;
  readonly text: string;
}

export interface ReportProgression {
  readonly decision: string;
  readonly note?: string | null;
}

export interface ReportFees {
  readonly balance?: string | null;
  readonly nextTerm?: string | null;
  readonly note?: string | null;
}

export interface ReportCalendar {
  readonly closing?: string | null;
  readonly opening?: string | null;
}

export interface ReportSignature {
  /** Role key such as `class_teacher`; the label chain resolves `signature.<role>`. */
  readonly role: string;
  readonly name?: string | null;
}

/** Everything a block can draw on. One card, one learner, one term. */
export interface ReportCardData {
  readonly school: ReportSchool;
  readonly learner: ReportLearner;
  readonly term?: ReportTerm | null;
  readonly attendance?: ReportAttendance | null;
  readonly results?: ReportResults | null;
  readonly rubric?: ReportRubric | null;
  readonly competencies?: readonly ReportRating[] | null;
  readonly traits?: readonly ReportRating[] | null;
  readonly coCurricular?: readonly string[] | null;
  readonly summary?: readonly ReportSummaryItem[] | null;
  readonly comments?: readonly ReportComment[] | null;
  readonly progression?: ReportProgression | null;
  readonly fees?: ReportFees | null;
  readonly calendar?: ReportCalendar | null;
  readonly signatures?: readonly ReportSignature[] | null;
}

// -------------------------------------------------------------------- page

export interface ReportMargins {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface ReportPageGeometry {
  readonly size: ReportPageSize;
  readonly orientation: ReportOrientation;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly margins: ReportMargins;
  readonly contentWidthMm: number;
  readonly contentHeightMm: number;
  /** Baseline body size for this geometry (DR-05 page table). */
  readonly baseFontPt: number;
  /** Table and metadata sizes derived from the baseline, never below the legibility floor. */
  readonly tableFontPt: number;
  readonly metaFontPt: number;
}

// ------------------------------------------------------------------ resolved

/** The learning-area name column is always present and never configurable. */
export type ReportTableColumnKind = ReportColumnKind | 'name';

export interface ReportColumnSpec {
  readonly kind: ReportTableColumnKind;
  readonly label: string;
  readonly align: 'start' | 'center' | 'end';
  /** Percentage width; every spec in one table sums to 100. */
  readonly width: number;
}

export interface HeaderPayload {
  readonly school: ReportSchool;
  readonly term: ReportTerm | null;
  readonly title: string;
}

export interface LearnerPayload {
  readonly learner: ReportLearner;
  readonly fields: readonly ReportLearnerField[];
}

export interface AttendancePayload {
  readonly attendance: ReportAttendance;
}

export interface ResultsPayload {
  /** Always starts with the learning-area name column. */
  readonly columns: readonly ReportColumnSpec[];
  readonly rows: readonly ReportResultRow[];
  readonly totals: ReportResultRow | null;
}

export interface RubricHeadings {
  readonly area: string;
  readonly strand: string;
  readonly level: string;
  readonly descriptor: string;
}

export interface RubricPayload {
  readonly headings: RubricHeadings;
  readonly rows: readonly ReportRubricRow[];
}

export interface RatingsPayload {
  readonly ratings: readonly ReportRating[];
}

export interface CoCurricularPayload {
  readonly activities: readonly string[];
}

export interface SummaryPayload {
  readonly items: readonly ReportSummaryItem[];
}

export interface CommentsPayload {
  readonly comments: readonly ReportComment[];
}

export interface ProgressionPayload {
  readonly progression: ReportProgression;
}

export interface FeesPayload {
  readonly fees: ReportFees;
}

export interface CalendarPayload {
  readonly calendar: ReportCalendar;
}

export interface SignaturesPayload {
  readonly signatures: readonly ReportSignature[];
}

export interface QrMatrix {
  readonly version: number;
  readonly size: number;
  readonly mask: number;
  readonly penalty: number;
  readonly modules: readonly (readonly boolean[])[];
}

export interface VerificationPayload {
  readonly documentId: string;
  readonly issuedAt: string | null;
  /** Absolute signed URL, or null when the document has no verification target at all. */
  readonly url: string | null;
  /** True when the document is unpublished: no QR is drawn and the block says so. */
  readonly preview: boolean;
  readonly qr: QrMatrix | null;
  /** The QR edge length in millimetres (16 mm, or 18 mm once the payload outgrows version 5). */
  readonly qrSizeMm: number;
}

export interface BlockPayloads {
  header: HeaderPayload;
  learner: LearnerPayload;
  attendance: AttendancePayload;
  results_table: ResultsPayload;
  rubric_table: RubricPayload;
  competencies: RatingsPayload;
  affective_psychomotor: RatingsPayload;
  co_curricular: CoCurricularPayload;
  summary: SummaryPayload;
  comments: CommentsPayload;
  progression: ProgressionPayload;
  fees: FeesPayload;
  calendar: CalendarPayload;
  signatures: SignaturesPayload;
  verification: VerificationPayload;
}

/** One rendered block: its heading, its data, and whether it has any. */
export type ReportBlockModel = {
  [K in ReportBlockKind]: {
    readonly kind: K;
    readonly heading: string | null;
    readonly payload: BlockPayloads[K];
    /** Set when the block has no data; the surface renders this text instead of an empty hole. */
    readonly emptyText: string | null;
    /** True for a block that may span pages, so the print stylesheet may break inside it. */
    readonly flow: boolean;
  };
}[ReportBlockKind];

export interface ReportPageFurniture {
  /** Literal text in the `@bottom-left` margin box, or null. */
  readonly leftText: string | null;
  /** Emit `Page N of M` in `@bottom-right` via the CSS page counters. */
  readonly pageNumbers: boolean;
  readonly fontPt: number;
  readonly color: string;
}

export interface ReportReduction {
  readonly applied: boolean;
  readonly dropped: readonly ReportBlockKind[];
  readonly columnsTrimmed: boolean;
}

export interface ReportTemplateIssue {
  /** Developer diagnostic; not shown to a user. */
  readonly code: 'unknown_block' | 'duplicate_block' | 'no_blocks' | 'empty_columns' | 'unknown_column' | 'qr_overflow';
  readonly path: string;
  readonly detail: string;
}

export interface ReportDocumentModel {
  readonly documentId: string;
  readonly template: { readonly code: string; readonly name: string };
  readonly locale: string;
  readonly dir: 'ltr' | 'rtl';
  readonly labels: ReportLabels;
  readonly page: ReportPageGeometry;
  readonly blocks: readonly ReportBlockModel[];
  readonly furniture: ReportPageFurniture;
  readonly reduction: ReportReduction;
  readonly issues: readonly ReportTemplateIssue[];
  /** `sheet` is a one-card document; `flow` is a multi-page document (transcript, statement). */
  readonly pagination: 'sheet' | 'flow';
  readonly preview: boolean;
  readonly issuedAt: string | null;
  readonly commentMaxLength: number | null;
  readonly title: string;
}

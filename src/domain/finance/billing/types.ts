// ABOUTME: The vocabulary of a billing run v2: the scope it covers, the preview a bursar reviews
// ABOUTME: with its reasons and its skips, the one-off inputs (ad-hoc charges, opening balances)
// ABOUTME: and the outcome the post reports.

import type { SqliteTransaction } from '@/data/adapters/sqlite';
import type { CreateInput, ListQuery, Page, RepositoryRow, WriteOptions } from '@/data/repository';
import type { Id } from '@/domain/ids';
import type { CurrencyCode, Money, RoundingMode } from '@/domain/money';
import type { EntityName } from '@/domain/schema';
import type { ScheduleProrationRule, ScheduleResidenceStatus } from '@/domain/finance/schedules';

/** The fee line kinds an ad-hoc charge may carry. */
export type AdHocChargeKind = 'fine' | 'adjustment' | 'other';

/** The kinds an invoice line of a run may carry. */
export type BillingLineKind =
  | 'fee'
  | 'discount'
  | 'adjustment'
  | 'fine'
  | 'opening_balance'
  | 'other';

/** Where a previewed line came from. */
export type BillingLineSource = 'schedule' | 'adhoc' | 'opening_balance';

/** Which side an opening balance sits on: `debit` is what the learner owes. */
export type BillingOpeningSide = 'debit' | 'credit';

/**
 * Why a learner in scope was not billed.
 *
 * Every one of these is a fact the bursar can act on, so the run reports them by name rather than
 * folding them into an "unmatched" count: a learner with no enrolment needs a different fix from
 * one whose level the schedule does not price.
 */
export type BillingSkipCode =
  | 'no_enrolment'
  | 'not_enrolled_in_period'
  | 'no_schedule'
  | 'cell_unresolved'
  | 'already_billed'
  | 'zero_total'
  | 'out_of_scope';

/** What a run covers. */
export interface BillingRunScope {
  readonly periodId: Id<'academic_period'>;
  /** Only these schedule versions; every version in force when omitted. */
  readonly scheduleIds?: readonly Id<'fee_schedule'>[];
  readonly levelIds?: readonly Id<'level'>[];
  readonly categoryIds?: readonly Id<'fee_category'>[];
  readonly residenceStatuses?: readonly ScheduleResidenceStatus[];
  readonly programmeIds?: readonly Id<'programme'>[];
  /** Only these learners. */
  readonly learnerIds?: readonly Id<'learner'>[];
}

/** A one-off charge (a fine, a trip, a damage fee) attached to a learner's invoice. */
export interface AdHocChargeInput {
  readonly learnerId: Id<'learner'>;
  /** The fee item whose GL mapping the charge posts to. */
  readonly feeItemId: Id<'fee_item'>;
  readonly description: string;
  readonly amount: Money;
  readonly kind: AdHocChargeKind;
  readonly dueDate?: string;
}

/** What a learner arriving from a previous system already owed, or had paid. */
export interface OpeningBalanceInput {
  readonly learnerId: Id<'learner'>;
  readonly amount: Money;
  readonly side: BillingOpeningSide;
  /** The day the balance is stated as at; the entry and the invoice are dated by it. */
  readonly asOfDate: string;
}

/** What a caller asks a run to do. */
export interface BillingRunRequest {
  readonly scope: BillingRunScope;
  /** The invoice date; the day the run posts when omitted. */
  readonly issueDate?: string;
  readonly dueDate?: string;
  readonly adhocCharges?: readonly AdHocChargeInput[];
  readonly openingBalances?: readonly OpeningBalanceInput[];
  /** The actor the writes are stamped with; the repository's own default when omitted. */
  readonly actor?: string;
}

/** One version of a schedule a run priced from. */
export interface SchedulePin {
  readonly feeScheduleId: string;
  readonly name: string;
  readonly version: number;
  readonly status: string;
}

/** The proration a line was billed under. */
export interface ProrationRecord {
  readonly rule: ScheduleProrationRule;
  /** The exact fraction the amount was scaled by: `numerator / denominator`. */
  readonly numerator: number;
  readonly denominator: number;
  readonly rounding: RoundingMode;
  /** The days the learner was billable, and the days the period holds. */
  readonly billableDays: number;
  readonly periodDays: number;
  readonly enrolledFrom: string;
  readonly enrolledTo: string;
}

/** One line the run would bill, with the reason it is there. */
export interface BillingPreviewItem {
  readonly source: BillingLineSource;
  /** The vote head, when the line names one. */
  readonly feeItemId: string | null;
  readonly feeItemLabel: string | null;
  readonly description: string;
  readonly kind: BillingLineKind;
  /** The amount after proration. */
  readonly amount: Money;
  /** The schedule's amount, when proration scaled it. */
  readonly listAmount: Money | null;
  /** The schedule version this line was priced from, for a schedule line. */
  readonly scheduleId: string | null;
  readonly scheduleVersion: number | null;
  readonly frequency: string | null;
  readonly proration: ProrationRecord | null;
  /** Why this line is on the invoice. */
  readonly reason: string;
}

/** One learner's invoice in the preview. */
export interface BillingPreviewLine {
  readonly learnerId: string;
  readonly learnerName: string;
  readonly admissionNumber: string;
  readonly levelId: string | null;
  readonly residenceStatus: string | null;
  /** True when the run creates the learner's first invoice for the period. */
  readonly isNewInvoice: boolean;
  /** True when the learner is already billed and the run adds the missing items on a second invoice. */
  readonly supplementary: boolean;
  /** The invoice the learner already holds for the period, when there is one. */
  readonly existingInvoiceNumber: string | null;
  readonly items: readonly BillingPreviewItem[];
  /** The sum of the items: what this run adds to the learner's balance. */
  readonly amount: Money;
  readonly schedulePins: readonly SchedulePin[];
  /** The reasons a bursar reads: the cell, the proration, the one-off charges. */
  readonly reasons: readonly string[];
}

/** A learner in scope the run did not bill. */
export interface BillingSkip {
  readonly learnerId: string;
  readonly learnerName: string;
  readonly code: BillingSkipCode;
  readonly detail: string;
}

/** The totals of a preview. */
export interface BillingPreviewTotals {
  readonly learnersInScope: number;
  readonly learnersBilled: number;
  readonly learnersSkipped: number;
  readonly newInvoices: number;
  readonly supplementaryInvoices: number;
  readonly amount: Money;
}

/** What a run would bill, and why, with nothing written. */
export interface BillingRunPreview {
  /** The run's identity; see `identity.ts` for exactly what it is derived from. */
  readonly key: string;
  readonly periodId: string;
  readonly periodName: string;
  readonly institutionId: string;
  readonly currency: CurrencyCode;
  readonly issueDate: string;
  readonly dueDate: string;
  /** The versions this run prices from, newest first. */
  readonly schedulePins: readonly SchedulePin[];
  readonly lines: readonly BillingPreviewLine[];
  readonly skips: readonly BillingSkip[];
  readonly totals: BillingPreviewTotals;
  /** Facts about the run that are not refusals but change what it bills. */
  readonly notices: readonly string[];
}

/** What a posted run recorded, as the audit trail keeps it. */
export interface PostedBillingRun {
  readonly key: string;
  readonly runId: string;
  readonly periodId: string;
  readonly schedulePins: readonly SchedulePin[];
  readonly learnersBilled: number;
  readonly invoicesCreated: number;
  readonly supplementaryInvoices: number;
  readonly ledgerEntries: number;
  readonly amount: Money;
  readonly postedAt: string;
  readonly postedBy: string | null;
}

/** What a post did, or that it replayed an earlier run. */
export interface BillingRunOutcome {
  readonly key: string;
  /** True when the run identity was already posted and this call wrote nothing. */
  readonly replayed: boolean;
  readonly posted: boolean;
  /** The run id of the recorded run when this call replayed one. */
  readonly original: PostedBillingRun | null;
  readonly invoicesCreated: number;
  readonly supplementaryInvoices: number;
  readonly ledgerEntries: number;
  /** What this call added to the learners' balances. */
  readonly amount: Money;
  /** The state of the run as it is now; after a post, every learner it billed is already billed. */
  readonly preview: BillingRunPreview;
}

/** The statement surface a run reads and writes through; the canonical repository satisfies it. */
export interface BillingRunStore {
  get<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options?: { readonly includeDeleted?: boolean }
  ): Promise<RepositoryRow<E> | null>;
  list<E extends EntityName>(entity: E, query?: ListQuery): Promise<Page<RepositoryRow<E>>>;
  create<E extends EntityName>(
    entity: E,
    input: CreateInput<E>,
    options?: WriteOptions
  ): Promise<RepositoryRow<E>>;
  /** The one transaction a run posts in. Absent on a read-only store, where a post is refused. */
  transaction?<T>(work: (tx: SqliteTransaction) => Promise<T>): Promise<T>;
}

/** What the service is built with. */
export interface BillingRunServiceOptions {
  readonly store: BillingRunStore;
  /** The clock; injectable so a test can pin the dates. */
  readonly now?: () => Date;
  /** The actor the writes are stamped with. */
  readonly actor?: string;
  /** How many rows a page of a read holds. Defaults to the repository's own maximum. */
  readonly pageSize?: number;
}

export type { SqliteTransaction };

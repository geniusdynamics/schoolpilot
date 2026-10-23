// ABOUTME: The vocabulary of the statements module: the three kinds of statement, the movement a
// ABOUTME: running account is made of, the aging buckets and clearance status around it, and the
// ABOUTME: ports the service reads the ledger and the canonical rows through.

import type { ListQuery, Page, RepositoryRow } from '@/data/repository';
import type { Id } from '@/domain/ids';
import type {
  JournalEntry,
  SourceDocument,
  SourceDocumentKind,
} from '@/domain/finance/ledger';
import type { CurrencyCode, Money } from '@/domain/money';
import type { EntityName } from '@/domain/schema';

// ---------------------------------------------------------------------------
// The statement account set: what a statement's balance is summed over.
// ---------------------------------------------------------------------------

/**
 * One account a statement's balance is summed over.
 *
 * The ledger keeps the receivables in one control account (1100) and the money held for a learner
 * in another (2150), so a learner's balance is the receivable **net of the credit held**. `weight`
 * is the multiplier applied to the account's `(debit − credit)`:
 *
 * - receivables (1100): `+1` - a debit is what the learner owes;
 * - learner credit (2150): `+1` - the balance is the receivable *minus* the credit, and a credit to
 *   2150 is already a negative `(debit − credit)`.
 *
 * The set is a **policy the caller may state**, because the ledger's refund debit account is one
 * (its README says so): `refundEntry` debits refunds payable (2100) and never releases learner
 * credit, so weighting 2100 into the balance would double-count a refund of credit. A school whose
 * refunds are posted differently states its own set.
 */
export interface StatementAccount {
  readonly code: string;
  readonly name: string;
  readonly weight: 1 | -1;
}

// ---------------------------------------------------------------------------
// The movements a statement is made of.
// ---------------------------------------------------------------------------

/** The kind of movement a running account shows. */
export type StatementMovementKind =
  | 'opening_balance'
  | 'invoice'
  | 'allocation'
  | 'credit'
  | 'credit_note'
  | 'refund'
  | 'adjustment';

/** The kind of detail line a movement carries, so a discount is visible. */
export type StatementDetailKind = 'fee' | 'discount';

/** One detail line of a movement: a fee line of an invoice, or a discount that reduces it. */
export interface StatementMovementDetail {
  readonly kind: StatementDetailKind;
  readonly description: string;
  readonly accountCode: string;
  /** Signed as the charge reads: a fee is positive and a discount negative. */
  readonly amount: Money;
}

/** A movement before it is placed in the running balance. */
export interface MovementDraft {
  readonly id: string;
  readonly kind: StatementMovementKind;
  /** The day the movement takes effect (ISO `YYYY-MM-DD`). */
  readonly date: string;
  /** The document the movement came from. */
  readonly source: SourceDocument;
  readonly description: string;
  /** Signed: a movement that increases what is owed (a debit) is positive. */
  readonly amount: Money;
  /** The entry's lines the movement does not itself account for, so a discount is visible. */
  readonly detail: readonly StatementMovementDetail[];
  readonly reversesEntryId: string | null;
  readonly correctsEntryId: string | null;
}

/** A movement placed in the running balance. */
export interface StatementMovement extends MovementDraft {
  /** The balance after this movement. */
  readonly balanceAfter: Money;
}

/** What one movement kind sums to across a statement. */
export interface StatementKindTotal {
  readonly kind: StatementMovementKind;
  readonly amount: Money;
  readonly count: number;
}

// ---------------------------------------------------------------------------
// Aging.
// ---------------------------------------------------------------------------

/** The buckets of spec 05 §6: current, 1-30, 31-60, 61-90, 90+ days past due. */
export type AgingBucketName =
  | 'current'
  | 'days_1_30'
  | 'days_31_60'
  | 'days_61_90'
  | 'days_90_plus';

/** One outstanding item, aged from its due date. */
export interface AgingItem {
  readonly id: string;
  readonly documentId: string;
  readonly documentNumber?: string;
  /** The day the item was raised; the fallback reference when it carries no due date. */
  readonly issueDate: string;
  /** The day it falls due. Absent, the item ages by the stated convention. */
  readonly dueDate?: string | null;
  /** The **outstanding** amount: a partially paid item ages only the part that is left. Positive. */
  readonly amount: Money;
}

/** What an item with no due date ages from. */
export type MissingDueDateConvention = 'issue_date' | 'current';

/** One bucket of the aging summary. */
export interface AgingBucket {
  readonly name: AgingBucketName;
  readonly label: string;
  /** The first day past due it covers, inclusive. */
  readonly fromDays: number;
  /** The last day past due it covers, inclusive; null is open-ended. */
  readonly toDays: number | null;
  readonly amount: Money;
  readonly count: number;
  readonly items: readonly AgingItem[];
}

/** The aging of a subject's outstanding items, as of a day. */
export interface AgingSummary {
  readonly asOf: string;
  readonly currency: CurrencyCode;
  readonly buckets: readonly AgingBucket[];
  readonly total: Money;
  /** The convention applied to an item that carries no due date. */
  readonly missingDueDate: MissingDueDateConvention;
}

// ---------------------------------------------------------------------------
// Clearance.
// ---------------------------------------------------------------------------

/** The clearance states of spec 05 §6. */
export type ClearanceState = 'cleared' | 'on_plan' | 'in_arrears';

/** What a learner's clearance reads besides the balance. */
export interface ClearanceRule {
  /** Whether a payment plan is in force: an arrears learner on a plan is `on_plan`. */
  readonly onPlan?: boolean;
  /** A sponsor's unpaid share, when the caller tracks it. */
  readonly sponsorShortfall?: Money;
  /** Whether a sponsor's unpaid share blocks clearance. Defaults to false (sponsor liability). */
  readonly sponsorBlocksClearance?: boolean;
}

/** A learner's clearance, as the statement sees it. */
export interface ClearanceStatus {
  readonly state: ClearanceState;
  /** True only for `cleared`. A credit balance clears. */
  readonly cleared: boolean;
  /** What remains owed; zero when the account is settled or in credit. */
  readonly outstanding: Money;
  /** The credit the learner holds; zero when nothing is owed to them. */
  readonly credit: Money;
  readonly reasons: readonly string[];
}

// ---------------------------------------------------------------------------
// The household split.
// ---------------------------------------------------------------------------

/** One sponsor's part of one learner's bill. */
export interface HouseholdSponsorShare {
  readonly payerId: string;
  readonly name: string;
  readonly fundingSource?: string;
  readonly amount: Money;
}

/** One learner's part of a household's bill, split between the family and its sponsors. */
export interface HouseholdMemberSplit {
  readonly learnerId: string;
  readonly learnerName: string;
  /** What the family owes for this child: the residual the learner invoice carries. */
  readonly familyShare: Money;
  /** What each sponsor owes for this child: the sponsored part, not netted into the family's. */
  readonly sponsorShares: readonly HouseholdSponsorShare[];
  /** The bill these shares divide. */
  readonly total: Money;
}

/**
 * A household's bill split across the family and its sponsors, per child.
 *
 * The split is the discounts module's (`planLearnerBill(...).split`), read here rather than
 * recomputed: the family's share is the residual the learner invoice carries and each sponsor's
 * share is the sponsor invoice, so a household statement shows the two side by side instead of
 * netting the sponsored part away.
 */
export interface HouseholdSplit {
  readonly householdId: string;
  readonly currency: CurrencyCode;
  readonly members: readonly HouseholdMemberSplit[];
  /** The family's total across the household. */
  readonly familyTotal: Money;
  /** Every sponsor's total across the household. */
  readonly sponsorTotal: Money;
  /** The household's bill: `familyTotal + sponsorTotal`. */
  readonly total: Money;
}

// ---------------------------------------------------------------------------
// The statement.
// ---------------------------------------------------------------------------

/** Which of the three statements a statement is. */
export type StatementKind = 'learner' | 'household' | 'sponsor';

/** The period a statement covers; a null bound is open. */
export interface StatementPeriod {
  /** The first day covered, inclusive. Null is open. */
  readonly from?: string | null;
  /** The last day covered, inclusive. Null is open. */
  readonly to?: string | null;
}

/** The tie that proves a statement equals the ledger. */
export interface StatementLedgerTie {
  /** The closing balance the running movements arrive at. */
  readonly statementBalance: Money;
  /** The balance the ledger reports for the same entries, through the ledger's own derivation. */
  readonly ledgerBalance: Money;
  /** Whether the two agree: the acceptance of the module. */
  readonly agrees: boolean;
  /** The accounts the ledger balance is summed over, with their weights. */
  readonly accounts: readonly StatementAccount[];
}

/** A statement: a running account, its aging, its clearance and its split. */
export interface Statement {
  readonly kind: StatementKind;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly currency: CurrencyCode;
  readonly from: string | null;
  readonly to: string | null;
  readonly asOf: string;
  readonly openingBalance: Money;
  readonly closingBalance: Money;
  readonly movements: readonly StatementMovement[];
  readonly totals: readonly StatementKindTotal[];
  readonly aging: AgingSummary;
  /** The learner's clearance; null on a household or a sponsor statement. */
  readonly clearance: ClearanceStatus | null;
  /** The family-versus-sponsor split; null on a learner or a sponsor statement. */
  readonly split: HouseholdSplit | null;
  /** The tie against the ledger. */
  readonly ledger: StatementLedgerTie;
  /**
   * Whether the sum of the movements equals closing minus opening.
   *
   * The running-balance arithmetic; it holds by construction and is reported so a screen or a test
   * can check it rather than assume it.
   */
  readonly movementsAgree: boolean;
  /** What the statement includes and excludes, in the words the screen shows. */
  readonly notes: readonly string[];
}

/** What the pure builder is handed: the scoped entries, the items to age, and the split. */
export interface StatementBuildInput {
  readonly kind: StatementKind;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly currency: CurrencyCode;
  /** The entries the ledger returned for this subject, oldest first. */
  readonly entries: readonly JournalEntry[];
  readonly period: StatementPeriod;
  /** The day the aging is as of, and the day the ledger balance is taken at. */
  readonly asOf: string;
  /** The outstanding items to age. */
  readonly agingItems: readonly AgingItem[];
  readonly missingDueDate?: MissingDueDateConvention;
  readonly accounts?: readonly StatementAccount[];
  readonly clearance?: ClearanceRule | null;
  readonly split?: HouseholdSplit | null;
  readonly notes?: readonly string[];
}

/** A sponsor's documents: the sponsor invoices issued to it and the receipts against them. */
export interface SponsorSubject {
  readonly id: string;
  readonly name: string;
  /** The ledger documents that belong to this sponsor. */
  readonly documents: readonly SourceDocument[];
}

// ---------------------------------------------------------------------------
// The ports.
// ---------------------------------------------------------------------------

/** The write surface the statement service needs. The canonical repository satisfies it. */
export interface StatementStore {
  get<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options?: { readonly includeDeleted?: boolean }
  ): Promise<RepositoryRow<E> | null>;
  list<E extends EntityName>(
    entity: E,
    query?: ListQuery
  ): Promise<Page<RepositoryRow<E>>>;
}

/** The ledger the statement service reads. `LedgerService` satisfies it. */
export interface LedgerReader {
  listEntries(query: {
    readonly institutionId?: string;
    readonly asOf?: string;
    readonly periodId?: string;
    readonly sourceKind?: SourceDocumentKind;
    readonly sourceId?: string;
    readonly limit?: number;
  }): Promise<readonly JournalEntry[]>;
  accountBalance(
    accountCode: string,
    query: { readonly currency: CurrencyCode; readonly institutionId?: string; readonly asOf?: string }
  ): Promise<Money>;
}

/** The journal entry shape, re-exported so a caller of this module need not import the ledger. */
export type { JournalEntry };

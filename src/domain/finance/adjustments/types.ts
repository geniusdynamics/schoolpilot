// ABOUTME: The vocabulary of the adjustments module: the credit note and its application, the refund
// ABOUTME: and its maker-checker decision, the write-off and its recovery, the exit-clearance
// ABOUTME: document and its assessment, and the balance explanation that traces every shilling of a
// ABOUTME: learner's balance to a document.

import type { SqliteTransaction } from '@/data/adapters/sqlite';
import type {
  CreateInput,
  ListQuery,
  Page,
  RepositoryRow,
  UpdateInput,
  UpdateOptions,
  WriteOptions,
} from '@/data/repository';
import type { Id } from '@/domain/ids';
import type { CurrencyCode, Money } from '@/domain/money';
import type { EntityName } from '@/domain/schema';
import type { PaymentChannel } from '@/domain/finance/payments';
import type { Role } from '@/data/auth';
import type { WorkflowActor } from '@/domain/workflows';

/** The statement surface the module reads and writes through; the canonical repository satisfies it. */
export interface AdjustmentStore {
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
  update<E extends EntityName>(
    entity: E,
    id: Id<E>,
    patch: UpdateInput<E>,
    options: UpdateOptions
  ): Promise<RepositoryRow<E>>;
  /** The one transaction a document posts in. Absent on a read-only store. */
  transaction?<T>(work: (tx: SqliteTransaction) => Promise<T>): Promise<T>;
}

// ---------------------------------------------------------------------------- credit notes

/** One fee item a credit note names, so the ledger debits that item's own revenue account. */
export interface CreditNoteLineInput {
  readonly feeItemId?: string | null;
  readonly amount: Money;
}

/** What a caller asks of a credit note. */
export interface CreditNoteRequest {
  readonly learnerId: Id<'learner'>;
  /** The invoice the note corrects, when it corrects one. It is recorded, never edited. */
  readonly invoiceId?: Id<'invoice'>;
  readonly amount: Money;
  readonly reason: string;
  readonly issueDate: string;
  /**
   * The fee items the note credits. Without them the note credits fee revenue as a whole, which is
   * the "against the account" case; with them the ledger debits each item's own revenue account.
   */
  readonly lines?: readonly CreditNoteLineInput[];
  /**
   * The invoice line the note is applied to through the allocation engine, when it is applied. A
   * note without one is left as a credit balance for the learner.
   */
  readonly applyToInvoiceId?: Id<'invoice'>;
  readonly actor?: string;
}

/** The credit note a request produced, and what happened to it. */
export interface CreditNoteOutcome {
  readonly creditNote: RepositoryRow<'credit_note'>;
  readonly number: string;
  readonly ledgerEntryId: string;
  /** The allocation the note was applied under, or null when it was left as a credit balance. */
  readonly application: CreditNoteApplication | null;
  /** The credit still available to the learner after the application. */
  readonly remainingCredit: Money;
}

/** One invoice line a credit note was applied to, and how much of it. */
export interface CreditNoteApplicationLine {
  readonly invoiceLineId: string;
  readonly invoiceId: string;
  readonly amount: Money;
}

/** The record of a credit note applied to an invoice, kept in the audit trail. */
export interface CreditNoteApplication {
  readonly creditNoteId: string;
  readonly invoiceId: string;
  readonly learnerId: string | null;
  readonly amount: Money;
  readonly appliedAt: string;
  readonly appliedBy: string | null;
  readonly lines: readonly CreditNoteApplicationLine[];
}

// ---------------------------------------------------------------------------- refunds

/** What a caller asks of a refund. A refund is money going back out, so it needs a second pair of eyes. */
export interface RefundRequest {
  readonly learnerId?: Id<'learner'>;
  /** The payment the refund gives back, when it refunds one. */
  readonly paymentId?: Id<'payment'>;
  readonly amount: Money;
  readonly reason: string;
  /** The channel the money leaves through; the payments module's channel vocabulary. */
  readonly channel: PaymentChannel;
  /** The day the request is made; the clock's day when omitted. */
  readonly requestedAt?: string;
  readonly actor?: string;
}

/** A checker's decision on a refund. */
export interface RefundDecision {
  readonly refundId: Id<'refund'>;
  readonly actor: WorkflowActor;
  /** Why the refund is approved; recorded on the transition. */
  readonly reason?: string;
  /** The channel the money leaves through, overriding the one the request named. */
  readonly channel?: PaymentChannel;
  /** The day the money is paid out; the clock's day when omitted. */
  readonly paidAt?: string;
}

/** A checker's rejection of a refund. A rejection needs a reason. */
export interface RefundRejection {
  readonly refundId: Id<'refund'>;
  readonly actor: WorkflowActor;
  readonly reason: string;
}

/** What a refund request or decision produced. */
export interface RefundOutcome {
  readonly refund: RepositoryRow<'refund'>;
  readonly number: string;
  readonly channel: PaymentChannel;
  /** The journal entry posted on approval, or null when nothing was posted. */
  readonly ledgerEntryId: string | null;
  /** True when this call only recorded a request and posted nothing. */
  readonly awaitingApproval: boolean;
}

// ---------------------------------------------------------------------------- write-offs

/** The life of a write-off document. */
export type WriteOffState = 'requested' | 'approved' | 'rejected';

/** An uncollectable balance written off, with the reason and the approval trail. */
export interface WriteOffDocument {
  readonly id: string;
  readonly number: string;
  readonly institutionId: string;
  readonly learnerId: string;
  readonly amount: Money;
  readonly reason: string;
  readonly issueDate: string;
  readonly state: WriteOffState;
  readonly requestedBy: string | null;
  readonly requestedAt: string;
  readonly decidedBy: string | null;
  readonly decidedAt: string | null;
  readonly decisionReason: string | null;
  /** The journal entry that removed the debt from receivables, once it is approved. */
  readonly ledgerEntryId: string | null;
}

/** What a caller asks of a write-off. */
export interface WriteOffRequest {
  readonly learnerId: Id<'learner'>;
  readonly amount: Money;
  readonly reason: string;
  readonly issueDate?: string;
  readonly actor?: string;
}

/** A checker's decision on a write-off. */
export interface WriteOffDecision {
  readonly writeOffId: string;
  readonly actor: WorkflowActor;
  readonly reason?: string;
  readonly decidedAt?: string;
}

/** A checker's rejection of a write-off. */
export interface WriteOffRejection {
  readonly writeOffId: string;
  readonly actor: WorkflowActor;
  readonly reason: string;
  readonly decidedAt?: string;
}

/** A recovery of a written-off debt: a new posting, never a reversal of the write-off. */
export interface WriteOffRecoveryRequest {
  readonly writeOffId: string;
  /** The amount recovered; the whole write-off when omitted. */
  readonly amount?: Money;
  readonly reason: string;
  /** The day the recovery is recognised; the clock's day when omitted. */
  readonly recoveredAt?: string;
  readonly actor?: string;
}

/** The record of a written-off debt recovered. */
export interface WriteOffRecovery {
  readonly id: string;
  readonly writeOffId: string;
  readonly institutionId: string;
  readonly learnerId: string;
  readonly amount: Money;
  readonly reason: string;
  readonly recoveredAt: string;
  readonly recoveredBy: string | null;
  readonly ledgerEntryId: string;
}

/** What a write-off request or decision produced. */
export interface WriteOffOutcome {
  readonly writeOff: WriteOffDocument;
  /** True when this call only recorded a request and posted nothing. */
  readonly awaitingApproval: boolean;
  /** The journal entry posted on approval, or null while the request awaits a checker. */
  readonly ledgerEntryId: string | null;
}

// ---------------------------------------------------------------------------- clearance

/** The state of a clearance document. */
export type ClearanceState = 'pending' | 'cleared' | 'refused';

/** Why a learner is or is not clearable. Every check is a fact a bursar can act on. */
export type ClearanceCheckCode =
  | 'balance_settled_or_written_off'
  | 'library_books_returned'
  | 'school_property_returned';

/** One condition of the clearance rule, and whether it holds. */
export interface ClearanceCheck {
  readonly code: ClearanceCheckCode;
  readonly passed: boolean;
  readonly detail: string;
}

/** The facts the clearance rule is decided from. */
export interface ClearanceFacts {
  readonly learnerId: string;
  readonly currency: CurrencyCode;
  /** What the learner still owes: positive is a debt, zero or negative is settled or in credit. */
  readonly outstanding: Money;
  /** What has been written off, reported for a reader; the outstanding is already net of it. */
  readonly writtenOff: Money;
  /** Books still out of the library. The library module is not modelled yet, so the caller states it. */
  readonly libraryBooksOut?: number;
  /** School property (a jersey, a lab kit) still out. Stated by the caller. */
  readonly propertyItemsOut?: number;
}

/** The verdict of the clearance rule: clearable, and why not when not. */
export interface ClearanceAssessment {
  readonly learnerId: string;
  readonly currency: CurrencyCode;
  readonly outstanding: Money;
  readonly writtenOff: Money;
  readonly clearable: boolean;
  readonly checks: readonly ClearanceCheck[];
}

/** A clearance document: a learner's exit sign-off, with the state it is in. */
export interface ClearanceDocument {
  readonly id: string;
  readonly institutionId: string;
  readonly learnerId: string;
  readonly state: ClearanceState;
  readonly assessment: ClearanceAssessment;
  readonly reason: string;
  readonly requestedBy: string | null;
  readonly requestedAt: string;
  readonly decidedBy: string | null;
  readonly decidedAt: string | null;
  readonly decisionReason: string | null;
}

/** What a caller asks of a clearance. */
export interface ClearanceRequest {
  readonly learnerId: Id<'learner'>;
  readonly reason: string;
  /** Books still out; the caller states it because the library is not modelled yet. */
  readonly libraryBooksOut?: number;
  readonly propertyItemsOut?: number;
  readonly requestedAt?: string;
  readonly actor?: string;
}

/** A decision on a clearance document. */
export interface ClearanceDecision {
  readonly clearanceId: string;
  readonly actor: WorkflowActor;
  /** `clear` issues the certificate; `refuse` sends the learner back with a reason. */
  readonly decision: 'clear' | 'refuse';
  /** Why; required to refuse. */
  readonly reason?: string;
  readonly decidedAt?: string;
}

// ---------------------------------------------------------------------------- balance

/** The kind of document a balance is traceable to. */
export type BalanceDocumentKind =
  | 'invoice'
  | 'opening_balance'
  | 'credit_note'
  | 'write_off'
  | 'recovery'
  | 'payment';

/** One document of a learner's balance, with its signed effect on what the learner owes. */
export interface BalanceDocument {
  readonly kind: BalanceDocumentKind;
  readonly id: string;
  readonly number: string | null;
  /** The day the document takes effect. */
  readonly date: string;
  /** Its signed effect: an invoice adds, a credit, a write-off and a payment reduce. */
  readonly amount: Money;
  readonly description: string;
}

/** Every document that makes up a learner's balance, summing to it. */
export interface BalanceExplanation {
  readonly learnerId: string;
  readonly institutionId: string;
  readonly currency: CurrencyCode;
  readonly asOf: string | null;
  /** What the learner owes: the sum of the documents. */
  readonly balance: Money;
  readonly documents: readonly BalanceDocument[];
  /**
   * The same balance read back from the ledger: the receivable and learner-credit lines of the
   * learner's own journal entries. The acceptance is that it equals {@link balance}.
   */
  readonly ledgerBalance: Money;
  /** True when the documents sum to the ledger's balance for the learner. */
  readonly agrees: boolean;
}

// ---------------------------------------------------------------------------- the service

/** The roles a refund's or a write-off's approval is reserved to (spec 05 section 11). */
export const DEFAULT_APPROVER_ROLES: readonly Role[] = ['head_teacher', 'administrator'];

/** What the service is built with. */
export interface AdjustmentsServiceOptions {
  /**
   * The canonical repository the documents live in. The module keeps its own write-off, recovery,
   * clearance and credit-note-application records in the repository's own `audit_event` table, as
   * the billing run keeps its own record, and reads them through a transaction of this store.
   */
  readonly store: AdjustmentStore;
  /** The actor the writes are stamped with when a request names none. */
  readonly actor?: string;
  /** The clock; injectable so a test can pin the dates. */
  readonly now?: () => Date;
  /**
   * The amount at or below which a write-off needs no checker, in minor units of the institution
   * currency. Defaults to zero: every write-off is approved by a second pair of eyes. A school
   * raises it to let a bursar write off a small balance directly.
   */
  readonly writeOffApprovalThresholdMinor?: number;
  /** The roles a refund's or a write-off's approval is reserved to. */
  readonly approverRoles?: readonly Role[];
}

// ABOUTME: The vocabulary of the payments core: the channels a payment arrives through, the cheque
// ABOUTME: lifecycle, the cashier session with its reconciliation and Z-report, and the ports the
// ABOUTME: service writes through (the canonical repository, the sequences module, the ledger).

import type {
  CreateInput,
  ListQuery,
  Page,
  RepositoryRow,
  UpdateInput,
  UpdateOptions,
  WriteOptions,
} from '@/data/repository';
import type { SqliteTransaction } from '@/data/adapters/sqlite';
import type { AllocationPlan, AllocationStrategyKind } from '@/domain/finance/allocation';
import type {
  EntryQuery,
  JournalEntry,
  PaymentChannel,
  PaymentPostingInput,
} from '@/domain/finance/ledger';
import type { Id } from '@/domain/ids';
import type { Money } from '@/domain/money';
import type { EntityName } from '@/domain/schema';
import type { Allocation as SequenceAllocation, ScopeValues } from '@/domain/sequences';

/** The channel a payment arrives through. The canonical list of spec 05 §5.1, from the ledger. */
export type { PaymentChannel };

/**
 * The states of a cheque, in the order they are reached.
 *
 * `received` is a cheque handed over at the counter; `deposited` is it paid into the bank;
 * `cleared` is the bank honouring it; `bounced` is the bank refusing it. Spec 05 §5.1 names the
 * two ends of the run (`pending → cleared/bounced`); the middle state is the deposit, which is
 * where a cheque stops being a piece of paper and becomes a bank balance.
 */
export type ChequeState = 'received' | 'deposited' | 'cleared' | 'bounced';

/** The status a cashier session is in. A session closes once. */
export type CashierSessionStatus = 'open' | 'closed';

/** A cashier session: an opening float, the payments taken in it, and a close that reconciles. */
export interface CashierSession {
  readonly id: string;
  readonly institutionId: string;
  readonly cashierUserId: string;
  readonly cashierName: string;
  readonly currency: string;
  /** The float the cashier started the session with. */
  readonly openingFloat: Money;
  readonly status: CashierSessionStatus;
  readonly openedAt: string;
  readonly closedAt: string | null;
  /** What the cashier counted in the drawer at the close. Null while the session is open. */
  readonly countedCash: Money | null;
  /** The float plus the cash taken; what the drawer should hold. Null while open. */
  readonly expectedCash: Money | null;
  /** Counted less expected. A positive difference is a surplus, a negative one a shortfall. */
  readonly variance: Money | null;
  readonly closeReason: string | null;
}

/** One payment attached to a cashier session. */
export interface CashierSessionPayment {
  readonly sessionId: string;
  readonly paymentId: string;
  readonly channel: PaymentChannel;
  readonly amount: Money;
  readonly attachedAt: string;
}

/** The reconciliation a close states: the drawer should hold, and what it held. */
export interface CashierReconciliation {
  readonly sessionId: string;
  readonly currency: string;
  readonly openingFloat: Money;
  /** The cash taken in the session: the cash-channel payments, and only those. */
  readonly cashTaken: Money;
  readonly expectedCash: Money;
  readonly countedCash: Money;
  /** Counted less expected. Stated, never hidden. */
  readonly variance: Money;
  readonly balanced: boolean;
}

/** One line of a Z-report: a channel and what it took in the session. */
export interface ZReportChannelLine {
  readonly channel: PaymentChannel;
  readonly label: string;
  readonly count: number;
  readonly amount: Money;
  /** True for the channel the drawer holds, which the reconciliation counts. */
  readonly isCash: boolean;
}

/** The Z-report of a session: its figures by channel, and the reconciliation. */
export interface ZReport {
  readonly session: CashierSession;
  readonly generatedAt: string;
  readonly lines: readonly ZReportChannelLine[];
  readonly total: Money;
  readonly cashTotal: Money;
  readonly paymentCount: number;
  readonly expectedCash: Money;
  readonly countedCash: Money | null;
  readonly variance: Money | null;
}

/** One allocation of a receipt, by vote head. */
export interface ReceiptAllocationLine {
  readonly label: string;
  readonly amount: Money;
}

/** What a receipt shows (spec 05 §5.2). */
export interface ReceiptView {
  readonly number: string;
  readonly issuedAt: string;
  readonly status: 'issued' | 'void';
  readonly payer: string;
  readonly learners: readonly string[];
  readonly amount: Money;
  readonly amountInWords: string;
  readonly channel: PaymentChannel;
  readonly channelLabel: string;
  readonly reference: string | null;
  readonly allocationByVoteHead: readonly ReceiptAllocationLine[];
  readonly balanceAfter: Money;
  readonly cashier: string;
}

/** What a caller states to take a payment at the counter. */
export interface RecordPaymentInput {
  readonly learnerId: Id<'learner'>;
  /** The amount, an integer count of minor units and a currency. */
  readonly amount: Money;
  readonly channel: PaymentChannel;
  /** The slip number, the provider transaction id, the cheque number. Required off the cash channel. */
  readonly reference?: string;
  /** The value date and time. Defaults to the clock. */
  readonly receivedAt?: string;
  readonly cashierUserId?: string;
  readonly cashierName?: string;
  /** The session the payment is taken in. A closed session refuses it. */
  readonly sessionId?: string;
  /** The invoices to allocate to. Without them the oldest outstanding lines are filled. */
  readonly invoiceIds?: readonly string[];
  /** The allocation policy. Defaults to the engine's own default (`oldest_first`). */
  readonly strategy?: AllocationStrategyKind;
  /** The payer's name for the receipt; the learner's guardian is not resolved here. */
  readonly payerName?: string;
  /** Post the payment to the ledger now. Default true; a received cheque is never posted. */
  readonly post?: boolean;
  /** Why the payment was taken, recorded on the audit event. */
  readonly reason?: string;
}

/** A payment that was taken, with its receipt, its allocation plan and its ledger entry. */
export interface RecordedPayment {
  readonly payment: RepositoryRow<'payment'>;
  readonly receipt: RepositoryRow<'receipt'>;
  readonly plan: AllocationPlan;
  readonly receiptView: ReceiptView;
  /** The journal entry the posting produced, or null when the payment was not posted. */
  readonly entry: JournalEntry | null;
}

/** The fee a bounced cheque adds, when the caller asks for one. */
export interface BounceFeeInput {
  readonly amount: Money;
  readonly description: string;
  readonly feeItemId?: string;
  /** The term the invoice number is scoped by (the `invoice` sequence prints it). */
  readonly term: string | number;
  readonly campus?: string;
  readonly issueDate?: string;
}

/** What a caller states to move a cheque along its lifecycle. */
export interface ChequeMoveInput {
  readonly paymentId: Id<'payment'>;
  /** The day the move takes effect. Defaults to the clock's day. */
  readonly on?: string;
  readonly reason?: string;
  readonly actor?: string;
}

/** A cheque bounce, and the fee it may add. */
export interface ChequeBounceInput extends ChequeMoveInput {
  /** The reason the bank refused it. Required: a bounce is an audited decision. */
  readonly reason: string;
  readonly fee?: BounceFeeInput;
}

/** What a caller states to open a cashier session. */
export interface OpenSessionInput {
  readonly institutionId: Id<'institution'>;
  readonly cashierUserId: string;
  readonly cashierName?: string;
  readonly openingFloat: Money;
  readonly openedAt?: string;
  readonly reason?: string;
}

/** What a caller states to close a cashier session. */
export interface CloseSessionInput {
  readonly sessionId: string;
  readonly countedCash: Money;
  readonly closedAt?: string;
  /** Why the session was closed, and what the difference is when there is one. */
  readonly reason?: string;
  readonly actor?: string;
}

/**
 * The write surface the payments service needs.
 *
 * The canonical `Repository` satisfies it, and so does the finance module's test double, so the
 * service can be exercised against either. It is deliberately the same shape as the repository the
 * finance pages already write through, so the page hands its repository straight over.
 */
export interface PaymentsStore {
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
  remove<E extends EntityName>(entity: E, id: Id<E>, options?: WriteOptions): Promise<RepositoryRow<E>>;
  transaction?<T>(work: (tx: SqliteTransaction) => Promise<T>): Promise<T>;
}

/**
 * Where a receipt number comes from.
 *
 * This is the sequences module (P3-A03) and nothing else: `SequenceService` satisfies it
 * structurally. A number is never invented here, and a receipt number is never reused.
 */
export interface DocumentNumberSource {
  issue(name: string, scope: ScopeValues): Promise<SequenceAllocation>;
}

/**
 * The posting engine (P3-A02), narrowed to what the payments core calls.
 *
 * `LedgerService` satisfies it structurally. The payments core never derives a journal entry
 * itself: it hands the payment and its allocations to `postPayment`, and it reverses a posted
 * entry through `reverse`, never by editing it.
 */
export interface PaymentLedgerPort {
  postPayment(input: PaymentPostingInput): Promise<JournalEntry>;
  reverse(
    entryId: string,
    options: { readonly reason: string; readonly entryDate?: string; readonly actor?: string }
  ): Promise<JournalEntry>;
  listEntries(query: EntryQuery): Promise<readonly JournalEntry[]>;
}

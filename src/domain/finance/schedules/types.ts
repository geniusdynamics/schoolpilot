// ABOUTME: The fee-schedule matrix model: the four dimensions a cell is addressed by, the lines a
// ABOUTME: cell prices, the uplift a copy is made with, and the ports the service reads and writes through.

import type { CreateInput, ListQuery, Page, RepositoryRow, UpdateInput, UpdateOptions, WriteOptions } from '@/data/repository';
import type { Id } from '@/domain/ids';
import type { Money, RoundingMode } from '@/domain/money';
import type {
  EntityName,
  FeeSchedule,
  FeeScheduleLine,
  FEE_LINE_FREQUENCIES,
  PRORATION_RULES,
} from '@/domain/schema';
import type { WorkflowActor, WorkflowAvailableMove, WorkflowTransitionEntry } from '@/domain/workflows';

/** The residence statuses a schedule cell may address. */
export type ScheduleResidenceStatus = FeeSchedule['residence_statuses'][number];

/** The lifecycle status of a schedule version. It is the workflow engine's state column. */
export type ScheduleStatus = FeeSchedule['status'];

/** How often a line is billed. */
export type ScheduleFrequency = (typeof FEE_LINE_FREQUENCIES)[number];

/** How a mid-period joiner or leaver is prorated. */
export type ScheduleProrationRule = (typeof PRORATION_RULES)[number];

/**
 * Where a cell sits in the matrix: level × residence × fee category × campus.
 *
 * `feeCategoryId` and `campusId` are optional because the spec's §2.2 example varies neither: a
 * schedule that spans one category and one campus leaves them out. A dimension the schedule spans
 * with more than one value must be named by the caller, or resolution refuses rather than picking.
 */
export interface ScheduleCellAddress {
  readonly levelId: Id<'level'>;
  readonly residence: ScheduleResidenceStatus;
  readonly feeCategoryId?: Id<'fee_category'>;
  readonly campusId?: Id<'campus'>;
}

/** One fee item priced in a cell. */
export interface ScheduleLineInput {
  readonly feeItemId: Id<'fee_item'>;
  /** The amount, in the institution's currency. Minor units only; never a major-unit number. */
  readonly amount: Money;
  /** Whether every learner of the cell is charged it; `true` when the caller does not say. */
  readonly mandatory?: boolean;
  /** How often it is billed; `per_term` when the caller does not say. */
  readonly frequency?: ScheduleFrequency;
  /** The dates it falls due, when the schedule pins them. */
  readonly dueDates?: readonly string[];
  /** The installment plan it follows, when one is chosen. */
  readonly installmentPlanId?: Id<'installment_plan'>;
  /** How a mid-period joiner or leaver is prorated; `full` when the caller does not say. */
  readonly prorationRule?: ScheduleProrationRule;
}

/** One cell of the matrix: its address and the fee items it prices. */
export interface ScheduleCellInput extends ScheduleCellAddress {
  readonly lines: readonly ScheduleLineInput[];
}

/** A whole version of a schedule: the population it applies to and the cells it prices. */
export interface ScheduleVersionInput {
  readonly institutionId: Id<'institution'>;
  /** The matrix name, shared by every version of it. */
  readonly name: string;
  readonly academicYearId: Id<'academic_year'>;
  readonly academicPeriodIds: readonly Id<'academic_period'>[];
  readonly programmeIds: readonly Id<'programme'>[];
  readonly levelIds: readonly Id<'level'>[];
  readonly residenceStatuses: readonly ScheduleResidenceStatus[];
  readonly feeCategoryIds: readonly Id<'fee_category'>[];
  readonly campusId?: Id<'campus'>;
  readonly newLearnersOnly?: boolean;
  /** The version number; a new version is a whole new row. */
  readonly version: number;
  readonly cells: readonly ScheduleCellInput[];
}

/** A line as it was stored, read back with its defaults filled. */
export interface ResolvedLine {
  readonly feeItemId: Id<'fee_item'>;
  readonly amount: Money;
  readonly mandatory: boolean;
  readonly frequency: ScheduleFrequency;
  readonly dueDates: readonly string[];
  readonly installmentPlanId: Id<'installment_plan'> | null;
  readonly prorationRule: ScheduleProrationRule;
}

/**
 * A resolved cell: the prices a learner of this population is billed.
 *
 * `feeScheduleId` and `version` pin the version the amounts came from, so a billing run can record
 * which version of the schedule a learner was billed from and a historical invoice can explain
 * itself. A published version is immutable, so resolving the same cell later gives the same
 * amounts.
 */
export interface ResolvedCell {
  readonly feeScheduleId: Id<'fee_schedule'>;
  readonly name: string;
  readonly version: number;
  readonly status: ScheduleStatus;
  readonly levelId: Id<'level'>;
  readonly residence: ScheduleResidenceStatus;
  readonly feeCategoryId: Id<'fee_category'> | null;
  readonly campusId: Id<'campus'> | null;
  readonly lines: readonly ResolvedLine[];
  /** The sum of the cell's lines, exact in minor units. */
  readonly total: Money;
}

/** How a copied version's amounts are raised. A percentage, a per-item delta, or both. */
export interface ScheduleUplift {
  /** The percentage every line is raised by, e.g. `7.5` for a 7.5% uplift. */
  readonly percent?: number;
  /** The rounding rule for the percentage. Defaults to `half_up`; see `uplift.ts` for why. */
  readonly percentRounding?: RoundingMode;
  /** A per-fee-item absolute change, added after the percentage. */
  readonly fixed?: Readonly<Record<string, Money>>;
}

/** A request that moves a version through the approval workflow. */
export interface ScheduleApprovalRequest {
  readonly feeScheduleId: Id<'fee_schedule'>;
  readonly actor: WorkflowActor;
  /** The reason a rejection (or any reasoned move) carries. */
  readonly reason?: string;
}

/** One version of a matrix, as the service reads it back. */
export interface ScheduleVersion {
  readonly schedule: RepositoryRow<'fee_schedule'>;
  readonly lines: readonly RepositoryRow<'fee_schedule_line'>[];
}

/** What a caller can narrow the list of versions by. */
export interface ScheduleListQuery {
  readonly institutionId?: Id<'institution'>;
  /** The matrix name; every version of it when given. */
  readonly name?: string;
  /** The status a version is in. */
  readonly status?: ScheduleStatus;
}

/**
 * The maker-checker gateway of the approval workflow.
 *
 * The states, the roles and permissions, the reasoned rejection and the audit trail are the
 * workflow engine's (`finance.fee_schedule_approval`). This port is the seam the schedule service
 * calls so the engine can be supplied by a repository-backed store in production and by a memory
 * store in a test. The gateway also enforces the one rule the workflow's own guard cannot: the maker
 * of a submission may not approve it.
 */
export interface ScheduleApprovalGateway {
  /** The state a version is in: the stored one, or the workflow's initial state. */
  stateOf(feeScheduleId: Id<'fee_schedule'>): Promise<string>;
  /** The moves the actor may make from the version's state. */
  available(
    feeScheduleId: Id<'fee_schedule'>,
    actor: WorkflowActor
  ): Promise<readonly WorkflowAvailableMove[]>;
  /** Moves the version to `submitted`. */
  submit(request: ScheduleApprovalRequest): Promise<void>;
  /** Approves a submitted version. Refuses when the actor made the submission. */
  approve(request: ScheduleApprovalRequest): Promise<void>;
  /** Sends a submitted version back to draft. A reason is required. */
  reject(request: ScheduleApprovalRequest): Promise<void>;
  /** Publishes an approved version, making it the one in force. */
  publish(request: ScheduleApprovalRequest): Promise<void>;
  /** Archives a published version. */
  archive(request: ScheduleApprovalRequest): Promise<void>;
  /** The transition trail of a version: the engine's audit. */
  history(feeScheduleId: Id<'fee_schedule'>): Promise<readonly WorkflowTransitionEntry[]>;
}

/**
 * The write surface the schedule service needs.
 *
 * The canonical `Repository` satisfies it, and so does the finance module's test double, so the
 * service runs against either.
 */
export interface ScheduleStore {
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
  remove<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options?: WriteOptions
  ): Promise<RepositoryRow<E>>;
}

/** A stored schedule line, for the code that reads the matrix back. */
export type StoredScheduleLine = FeeScheduleLine;

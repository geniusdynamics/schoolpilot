// ABOUTME: The installment-plan model: the dated percentage installments a canonical
// ABOUTME: `installment_plan` declares, the dated amounts they derive from a schedule line's own
// ABOUTME: amount, the status an installment is in, and the store port every read goes through.

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
import type { Money, RoundingMode } from '@/domain/money';
import type { EntityName } from '@/domain/schema';

/**
 * One installment of a plan: the order it falls in, the day it falls due, and its share of the
 * whole. The share is a percentage and never an amount — the amount belongs to the schedule line
 * that bills it, so a plan cannot drift from the price it splits.
 */
export interface InstallmentPart {
  /** The order of the installment, from 1. */
  readonly sequence: number;
  /** The calendar day it falls due, `YYYY-MM-DD`. */
  readonly dueDate: string;
  /** The share of the whole, as a percentage held to two decimals at most. */
  readonly percent: number;
}

/**
 * A plan as this module reads and writes it, mapped from the canonical `installment_plan` row.
 *
 * It is not a second model: every field is the row's own. A plan carries no money and no amount,
 * which is what lets one plan split a 6,000 tuition line and a 4,200 lunch line without changing.
 */
export interface InstallmentPlan {
  readonly id: Id<'installment_plan'>;
  readonly name: string;
  readonly academicPeriodId: Id<'academic_period'> | null;
  readonly installments: readonly InstallmentPart[];
}

/** A plan's installment with the amount the schedule line's own total gives it. */
export interface DatedInstallment extends InstallmentPart {
  readonly amount: Money;
}

/** Whether an installment is still ahead, due today, late, or settled. */
export type InstallmentStatus = 'scheduled' | 'due' | 'overdue' | 'paid';

/** Where the due dates of a schedule line's installments came from. */
export type InstallmentSource =
  /** The line names an `installment_plan`; its percentages and dates split the line's amount. */
  | 'plan'
  /** The line names no plan but pins its own `due_dates`; they split the amount equally. */
  | 'line_due_dates'
  /** The line names neither; it is a single undated charge and is not split. */
  | 'whole';

/** A schedule line's installments, with the source the dates came from. */
export interface ScheduleLineInstallments {
  readonly lineId: Id<'fee_schedule_line'>;
  readonly feeItemId: Id<'fee_item'>;
  /** The line's own amount: the total every installment divides. */
  readonly amount: Money;
  readonly installmentPlanId: Id<'installment_plan'> | null;
  readonly planName: string | null;
  readonly installments: readonly DatedInstallment[];
  readonly source: InstallmentSource;
}

/** A plan to create, or the writable fields of one to replace. */
export interface InstallmentPlanInput {
  readonly institutionId: Id<'institution'>;
  readonly name: string;
  readonly academicPeriodId?: Id<'academic_period'>;
  readonly installments: readonly InstallmentPart[];
}

/** What a caller can narrow the list of plans by. */
export interface InstallmentPlanListQuery {
  readonly institutionId?: Id<'institution'>;
  readonly academicPeriodId?: Id<'academic_period'>;
}

/**
 * The write surface the installments module needs.
 *
 * The canonical `Repository` satisfies it, so the service runs against the real `installment_plan`
 * and `fee_schedule_line` tables; a test may supply a double of the same shape.
 */
export interface InstallmentPlanStore {
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
}

/** The rounding rule a percentage split is made with. Named, never defaulted, at the seam. */
export type InstallmentRounding = RoundingMode;

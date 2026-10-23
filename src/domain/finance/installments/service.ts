// ABOUTME: The installment-plan service: it reads and writes the canonical `installment_plan` rows
// ABOUTME: through the repository and derives the dated amounts a `fee_schedule_line` bills, from the
// ABOUTME: line's own amount and the plan (or the line's own due dates) it names.

import type { CreateInput, RepositoryRow } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import { isMoney, type Money, type RoundingMode } from '@/domain/money';

import { InstallmentError } from './errors';
import {
  assertPlanInstallments,
  dueDatesOf,
  inSequenceOrder,
  installmentStatus,
  installmentsForAmount,
  installmentsForDueDates,
} from './plan';
import { DEFAULT_INSTALLMENT_ROUNDING } from './split';
import type {
  DatedInstallment,
  InstallmentPart,
  InstallmentPlan,
  InstallmentPlanInput,
  InstallmentPlanListQuery,
  InstallmentPlanStore,
  InstallmentStatus,
  ScheduleLineInstallments,
} from './types';

/** The longest page the service reads; the repository caps a page at 500 rows. */
const PAGE_LIMIT = 500;

/** What the service is built with. */
export interface InstallmentPlanServiceOptions {
  /** Where the plans and schedule lines are read and written. The canonical repository satisfies it. */
  readonly store: InstallmentPlanStore;
  /** The actor recorded on the writes; the repository's own actor when omitted. */
  readonly actor?: string;
  /**
   * The rounding rule a percentage split uses. It is named here rather than defaulted inside the
   * split, so a school that wants another rule names it once and every plan follows it.
   */
  readonly rounding?: RoundingMode;
}

/**
 * The installment-plan service.
 *
 * It is not a second model of an installment plan: the canonical `installment_plan` entity is the
 * plan, and a `fee_schedule_line` names one through its own `installment_plan_id` column. This
 * service reads that row back, validates its dated percentages, and derives the amounts by splitting
 * the schedule line's own amount — so a plan carries no money and can never drift from the price.
 */
export class InstallmentPlanService {
  private readonly store: InstallmentPlanStore;
  private readonly actor: string | undefined;
  private readonly rounding: RoundingMode;

  constructor(options: InstallmentPlanServiceOptions) {
    this.store = options.store;
    this.actor = options.actor;
    this.rounding = options.rounding ?? DEFAULT_INSTALLMENT_ROUNDING;
  }

  /** The rounding rule the service splits percentages with. */
  get roundingMode(): RoundingMode {
    return this.rounding;
  }

  // ------------------------------------------------------------------ plans

  /** A plan by id, mapped from its canonical row. */
  async plan(installmentPlanId: Id<'installment_plan'>): Promise<InstallmentPlan> {
    const row = await this.store.get('installment_plan', installmentPlanId);
    if (!row) {
      throw new InstallmentError(
        'plan_not_found',
        `No installment plan answers to ${installmentPlanId}.`,
        { installmentPlanId }
      );
    }
    return toPlan(row);
  }

  /** The plans a caller narrows to, newest first by name. */
  async listPlans(
    query: InstallmentPlanListQuery = {}
  ): Promise<readonly InstallmentPlan[]> {
    const where: Record<string, unknown> = {};
    if (query.institutionId !== undefined) where.institution_id = query.institutionId;
    if (query.academicPeriodId !== undefined) where.academic_period_id = query.academicPeriodId;
    const page = await this.store.list('installment_plan', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit: PAGE_LIMIT,
    });
    return page.items.map(toPlan);
  }

  /**
   * Creates a plan.
   *
   * The installments are validated before anything is written: a sequence that is not a whole number
   * at or above one, a duplicate sequence, a malformed due date, a percentage below 0 or above 100,
   * a percentage with a third decimal, or percentages that do not sum to 100 are each refused by
   * name. A plan that does not divide the whole is the refusal this exists for.
   */
  async create(input: InstallmentPlanInput): Promise<InstallmentPlan> {
    if (!input.institutionId) {
      throw new InstallmentError('institution_missing', 'A plan needs an institution.');
    }
    if (input.name.trim() === '') {
      throw new InstallmentError('name_required', 'A plan needs a name.');
    }
    assertPlanInstallments(input.installments);
    const row = await this.store.create(
      'installment_plan',
      {
        institution_id: input.institutionId,
        name: input.name.trim(),
        ...(input.academicPeriodId === undefined
          ? {}
          : { academic_period_id: input.academicPeriodId }),
        installments: inSequenceOrder(input.installments).map((installment) => ({
          sequence: installment.sequence,
          due_date: installment.dueDate,
          percent: installment.percent,
        })),
      } satisfies CreateInput<'installment_plan'>,
      this.writeOptions()
    );
    return toPlan(row);
  }

  // ------------------------------------------------------- schedule lines

  /**
   * The installments a schedule line bills.
   *
   * The line's own `amount` is the total; where the dates come from is the line's own declaration:
   *
   * 1. the line names an `installment_plan_id` — the plan's dated percentages split the amount;
   * 2. the line names no plan but pins its own `due_dates` — the amount is split equally across them;
   * 3. the line names neither — it is a single undated charge and is returned whole, not split.
   *
   * The plan is never duplicated into the line: the line names it, and this reads it back.
   */
  async installmentsForScheduleLine(
    feeScheduleLineId: Id<'fee_schedule_line'>
  ): Promise<ScheduleLineInstallments> {
    const line = await this.store.get('fee_schedule_line', feeScheduleLineId);
    if (!line) {
      throw new InstallmentError(
        'schedule_line_not_found',
        `No fee schedule line answers to ${feeScheduleLineId}.`
      );
    }
    const amount = line.amount as Money;
    if (!isMoney(amount)) {
      throw new InstallmentError(
        'amount_not_money',
        `the schedule line ${feeScheduleLineId} carries no Money amount`
      );
    }
    const base = {
      lineId: feeScheduleLineId,
      feeItemId: asId<'fee_item'>(line.fee_item_id),
      amount,
    };

    if (line.installment_plan_id !== undefined) {
      const planId = asId<'installment_plan'>(line.installment_plan_id);
      const plan = await this.plan(planId);
      return {
        ...base,
        installmentPlanId: planId,
        planName: plan.name,
        installments: installmentsForAmount(amount, plan.installments, this.rounding),
        source: 'plan',
      };
    }

    const dueDates = line.due_dates ?? [];
    if (dueDates.length > 0) {
      return {
        ...base,
        installmentPlanId: null,
        planName: null,
        installments: installmentsForDueDates(amount, dueDates),
        source: 'line_due_dates',
      };
    }

    return {
      ...base,
      installmentPlanId: null,
      planName: null,
      installments: [],
      source: 'whole',
    };
  }

  // ------------------------------------------------------------- helpers

  /** Splits a total into a plan's dated percentages with the service's rounding rule. */
  splitAmount(total: Money, installments: readonly InstallmentPart[]): readonly DatedInstallment[] {
    return installmentsForAmount(total, installments, this.rounding);
  }

  /** The due dates of a plan, in sequence order. */
  dueDates(installments: readonly InstallmentPart[]): readonly string[] {
    return dueDatesOf(installments);
  }

  /** The state an installment is in on a day. The amount is never touched. */
  statusOf(dueDate: string, asOf: string, paidOn?: string | null): InstallmentStatus {
    return installmentStatus(dueDate, asOf, paidOn);
  }

  private writeOptions(): { actor?: string } {
    return this.actor === undefined ? {} : { actor: this.actor };
  }
}

/** Maps a canonical `installment_plan` row to the module's plan. */
export function toPlan(row: RepositoryRow<'installment_plan'>): InstallmentPlan {
  return {
    id: asId<'installment_plan'>(row.id),
    name: row.name,
    academicPeriodId: row.academic_period_id
      ? asId<'academic_period'>(row.academic_period_id)
      : null,
    installments: inSequenceOrder(
      row.installments.map((installment) => ({
        sequence: installment.sequence,
        dueDate: installment.due_date,
        percent: installment.percent,
      }))
    ),
  };
}

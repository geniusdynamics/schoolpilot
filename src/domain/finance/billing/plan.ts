// ABOUTME: Planning a billing run: for each learner in scope, the cell the schedule resolves, the
// ABOUTME: fee items it bills, the proration a mid-period enrolment implies, the one-off charges and
// ABOUTME: opening balances, and the reason a learner was skipped. Pure: it writes nothing.

import { asId } from '@/domain/ids';
import { add, isZero, zero, type Money } from '@/domain/money';
import type { RepositoryRow } from '@/data/repository';
import {
  describe,
  isScheduleError,
  resolveCell,
  type ScheduleCellAddress,
  type ScheduleProrationRule,
} from '@/domain/finance/schedules';

import type { RunFacts, ScheduleFacts, ExistingInvoiceFacts } from './facts';
import { billingRunKey } from './identity';
import {
  describeProration,
  earlierDay,
  laterDay,
  prorateAmount,
  prorationRecord,
  type ProrationWindow,
} from './proration';
import type {
  AdHocChargeInput,
  BillingLineKind,
  BillingLineSource,
  BillingPreviewItem,
  BillingPreviewLine,
  BillingRunRequest,
  BillingSkip,
  OpeningBalanceInput,
  ProrationRecord,
  SchedulePin,
} from './types';

/** One item the run would bill, with the reason it is there. */
export interface PlannedItem {
  readonly source: BillingLineSource;
  readonly feeItemId: string | null;
  readonly feeItemLabel: string | null;
  readonly description: string;
  readonly kind: BillingLineKind;
  readonly amount: Money;
  readonly listAmount: Money | null;
  readonly scheduleId: string | null;
  readonly scheduleVersion: number | null;
  readonly frequency: string | null;
  readonly proration: ProrationRecord | null;
  readonly reason: string;
}

/** One learner's billing in the plan. */
export interface PlannedLearner {
  readonly learnerId: string;
  readonly learnerName: string;
  readonly admissionNumber: string;
  readonly levelId: string | null;
  readonly residenceStatus: string | null;
  readonly isNewInvoice: boolean;
  readonly supplementary: boolean;
  readonly existingInvoiceNumber: string | null;
  readonly items: readonly PlannedItem[];
  readonly amount: Money;
  readonly schedulePins: readonly SchedulePin[];
  readonly reasons: readonly string[];
  /** The opening balances, which post as their own document rather than on the fee invoice. */
  readonly openingBalances: readonly OpeningBalanceInput[];
}

/** The whole plan of a run. */
export interface RunPlan {
  readonly key: string;
  readonly schedulePins: readonly SchedulePin[];
  readonly lines: readonly PlannedLearner[];
  readonly skips: readonly BillingSkip[];
  readonly notices: readonly string[];
  readonly learnersInScope: number;
  readonly cohortLearnerIds: readonly string[];
}

/** The name a learner is shown by. */
export function learnerNameOf(row: RepositoryRow<'learner'>): string {
  return `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim();
}

/** The pin of a schedule version. */
export function pinOf(row: RepositoryRow<'fee_schedule'>): SchedulePin {
  return {
    feeScheduleId: row.id,
    name: row.name,
    version: row.version,
    status: row.status,
  };
}

/** The learner's fee category, when the enrolment names one. */
function categoryOf(enrolment: RepositoryRow<'enrolment'>): string | null {
  const categories = enrolment.fee_category_ids ?? [];
  return categories.length > 0 ? categories[0] : null;
}

/** The days the learner was billable inside the period. */
function enrolmentWindow(
  period: RepositoryRow<'academic_period'>,
  enrolment: RepositoryRow<'enrolment'>
): ProrationWindow {
  return {
    periodStart: period.start_date,
    periodEnd: period.end_date,
    enrolledFrom: laterDay(period.start_date, enrolment.start_date),
    enrolledTo: earlierDay(period.end_date, enrolment.end_date ?? period.end_date),
  };
}

/** Why a schedule does not apply to a learner, or null when it does. */
function scheduleRejection(
  facts: RunFacts,
  request: BillingRunRequest,
  schedule: ScheduleFacts,
  learner: RepositoryRow<'learner'>,
  enrolment: RepositoryRow<'enrolment'>
): string | null {
  const row = schedule.row;
  const scope = request.scope;
  const levels = (scope.levelIds ?? []).map(String);
  const programmes = (scope.programmeIds ?? []).map(String);
  const categories = (scope.categoryIds ?? []).map(String);
  const residences = scope.residenceStatuses ?? [];
  const category = categoryOf(enrolment);

  if (levels.length > 0 && !levels.includes(enrolment.level_id)) {
    return `the run is limited to other levels, and this learner is in level ${enrolment.level_id}`;
  }
  if (residences.length > 0 && !residences.includes(learner.residence_status)) {
    return `the run is limited to other residences, and this learner is a ${learner.residence_status}`;
  }
  if (programmes.length > 0 && !programmes.includes(enrolment.programme_id)) {
    return 'the run is limited to other programmes';
  }
  if (categories.length > 0 && (category === null || !categories.includes(category))) {
    return 'the run is limited to other fee categories';
  }

  if (row.level_ids.length > 0 && !row.level_ids.includes(enrolment.level_id)) {
    return `${row.name} v${row.version} prices other levels`;
  }
  if (row.programme_ids.length > 0 && !row.programme_ids.includes(enrolment.programme_id)) {
    return `${row.name} v${row.version} prices other programmes`;
  }
  if (
    row.residence_statuses.length > 0 &&
    !row.residence_statuses.includes(learner.residence_status)
  ) {
    return `${row.name} v${row.version} prices other residences`;
  }
  // A learner whose enrolment names no fee category is left to the matrix: it resolves an omitted
  // dimension when the schedule declares exactly one value for it, and refuses with a stated reason
  // (`cell_dimension_undeclared`, `cell_ambiguous`) when the schedule declares none or several. Only a
  // category the learner *names* can be one the schedule does not price.
  if (row.fee_category_ids.length > 0 && category !== null && !row.fee_category_ids.includes(category)) {
    return `${row.name} v${row.version} prices other fee categories`;
  }
  if (row.new_learners_only) {
    const admitted = learner.admission_date ?? enrolment.start_date;
    if (admitted < facts.period.start_date) {
      return `${row.name} v${row.version} prices new learners only`;
    }
  }
  return null;
}

/** The cell address a learner addresses in a schedule. */
function addressFor(
  schedule: ScheduleFacts,
  learner: RepositoryRow<'learner'>,
  enrolment: RepositoryRow<'enrolment'>
): ScheduleCellAddress {
  const category = categoryOf(enrolment);
  return {
    levelId: asId<'level'>(enrolment.level_id),
    residence: learner.residence_status,
    ...(category === null ? {} : { feeCategoryId: asId<'fee_category'>(category) }),
    ...(schedule.row.campus_id === undefined
      ? {}
      : { campusId: asId<'campus'>(schedule.row.campus_id) }),
  };
}

/** The fee-item label an invoice line reads. */
function itemLabel(item: RepositoryRow<'fee_item'> | undefined, feeItemId: string): string {
  return item ? `${item.code} ${item.name}` : `Fee item ${feeItemId}`;
}

/** Plans a whole run from the facts it read. */
export function planRun(facts: RunFacts, request: BillingRunRequest): RunPlan {
  const runPins = facts.schedules.map((schedule) => pinOf(schedule.row));
  const learnerFilter = request.scope.learnerIds
    ? new Set(request.scope.learnerIds.map(String))
    : null;

  const lines: PlannedLearner[] = [];
  const skips: BillingSkip[] = [];
  const cohortLearnerIds: string[] = [];
  const cohort = new Set<string>();

  const known = new Map<string, RepositoryRow<'learner'>>();
  for (const learner of facts.learners) known.set(learner.id, learner);

  for (const learner of facts.learners) {
    if (learnerFilter && !learnerFilter.has(learner.id)) continue;
    cohortLearnerIds.push(learner.id);
    cohort.add(learner.id);
    const planned = planLearner(facts, request, learner);
    if ('skip' in planned) skips.push(planned.skip);
    else lines.push(planned.line);
  }

  // A one-off charge or an opening balance that names a learner outside the run's cohort is
  // reported rather than silently dropped.
  const outside = new Set<string>();
  for (const charge of request.adhocCharges ?? []) outside.add(charge.learnerId);
  for (const opening of request.openingBalances ?? []) outside.add(opening.learnerId);
  for (const learnerId of outside) {
    if (cohort.has(learnerId)) continue;
    const row = known.get(learnerId);
    skips.push({
      learnerId,
      learnerName: row ? learnerNameOf(row) : learnerId,
      code: 'out_of_scope',
      detail: row
        ? 'the learner is not in this run\u2019s cohort, so the charge or opening balance is not billed'
        : 'no learner answers to this id',
    });
  }

  let total = zero(facts.currency);
  for (const line of lines) total = add(total, line.amount);

  const key = billingRunKey({
    periodId: facts.period.id,
    schedulePins: runPins,
    cohortLearnerIds,
    adhocCharges: request.adhocCharges ?? [],
    openingBalances: request.openingBalances ?? [],
  });

  return {
    key,
    schedulePins: runPins,
    lines,
    skips,
    notices: facts.notices,
    learnersInScope: cohortLearnerIds.length,
    cohortLearnerIds,
  };
}

/** Plans one learner, or the reason they were skipped. */
function planLearner(
  facts: RunFacts,
  request: BillingRunRequest,
  learner: RepositoryRow<'learner'>
): { readonly line: PlannedLearner } | { readonly skip: BillingSkip } {
  const name = learnerNameOf(learner);
  const charges = facts.chargesByLearner.get(learner.id) ?? [];
  const openings = facts.openingsByLearner.get(learner.id) ?? [];
  const existing = facts.existingByLearner.get(learner.id) ?? null;
  const enrolment = facts.enrolmentsByLearner.get(learner.id) ?? null;

  const items: PlannedItem[] = [];
  const reasons: string[] = [];
  const pins: SchedulePin[] = [];
  const openItems: OpeningBalanceInput[] = [];
  let feeSkip: BillingSkip | null = null;

  if (!enrolment) {
    if (charges.length === 0 && openings.length === 0) {
      return {
        skip: {
          learnerId: learner.id,
          learnerName: name,
          code: 'no_enrolment',
          detail: `no enrolment in ${facts.period.academic_year_id} covers ${facts.period.name}`,
        },
      };
    }
    reasons.push('no enrolment this year: the learner is billed for the one-off items only');
  } else {
    const window = enrolmentWindow(facts.period, enrolment);
    if (window.enrolledTo < window.enrolledFrom) {
      feeSkip = {
        learnerId: learner.id,
        learnerName: name,
        code: 'not_enrolled_in_period',
        detail: `the learner's enrolment runs ${enrolment.start_date}..${enrolment.end_date ?? 'open'}, outside ${facts.period.start_date}..${facts.period.end_date}`,
      };
    } else {
      const rejected: string[] = [];
      const feeItems: PlannedItem[] = [];
      for (const schedule of facts.schedules) {
        const rejection = scheduleRejection(facts, request, schedule, learner, enrolment);
        if (rejection) {
          rejected.push(rejection);
          continue;
        }
        let cell;
        try {
          cell = resolveCell(
            schedule.header,
            schedule.lines,
            addressFor(schedule, learner, enrolment)
          );
        } catch (error) {
          if (isScheduleError(error)) {
            // A cell the matrix cannot resolve is never guessed at: the learner is reported.
            feeSkip = {
              learnerId: learner.id,
              learnerName: name,
              code: 'cell_unresolved',
              detail: `${schedule.row.name} v${schedule.row.version}: ${error.message}`,
            };
            break;
          }
          throw error;
        }
        const pin = pinOf(schedule.row);
        pins.push(pin);
        reasons.push(
          `priced from ${cell.name} v${cell.version} (${cell.status}), cell ${describe({
            levelId: cell.levelId,
            residence: cell.residence,
            feeCategoryId: cell.feeCategoryId,
            campusId: cell.campusId,
          })}`
        );
        for (const line of cell.lines) {
          const billed = scheduleItem(
            facts,
            schedule,
            cell.name,
            cell.version,
            line,
            learner,
            enrolment,
            window,
            existing,
            reasons
          );
          if (billed) feeItems.push(billed);
        }
      }

      if (feeSkip === null && facts.schedules.length === 0) {
        feeSkip = {
          learnerId: learner.id,
          learnerName: name,
          code: 'no_schedule',
          detail: 'no approved or published schedule version covers this period',
        };
      } else if (feeSkip === null && rejected.length === facts.schedules.length) {
        // Every schedule was rejected for this learner, so no schedule prices them.
        feeSkip = {
          learnerId: learner.id,
          learnerName: name,
          code: 'no_schedule',
          detail: rejected[0] ?? 'no schedule of the period applies to this learner',
        };
      } else if (feeSkip === null) {
        items.push(...feeItems);
      } else {
        reasons.length = 0;
        pins.length = 0;
      }
    }
  }

  if (feeSkip !== null) {
    // A learner who is out of the fee run but carries a one-off charge is still billed it.
    if (charges.length === 0 && openings.length === 0) return { skip: feeSkip };
    reasons.push(`fee billing skipped: ${feeSkip.detail}`);
  }

  for (const charge of charges) {
    const item = chargeItem(facts, charge, existing, reasons);
    if (item) items.push(item);
  }
  for (const opening of openings) {
    const item = openingItem(opening, existing, reasons);
    if (item) {
      items.push(item);
      openItems.push(opening);
    }
  }

  if (items.length === 0) {
    const hasExisting = existing !== null;
    return {
      skip: {
        learnerId: learner.id,
        learnerName: name,
        code: hasExisting ? 'already_billed' : 'zero_total',
        detail: hasExisting
          ? `the learner already holds invoice ${existing.invoice.number}, which bills every item this run would add`
          : 'every applicable line prorated to nothing, or was already billed',
      },
    };
  }

  const isNewInvoice = existing === null;
  if (!isNewInvoice) {
    reasons.push(
      `the learner already holds invoice ${existing.invoice.number}; this run adds the missing items on a supplementary invoice`
    );
  }

  let amount = zero(facts.currency);
  for (const item of items) amount = add(amount, item.amount);

  return {
    line: {
      learnerId: learner.id,
      learnerName: name,
      admissionNumber: learner.admission_number,
      levelId: enrolment?.level_id ?? null,
      residenceStatus: learner.residence_status,
      isNewInvoice,
      supplementary: !isNewInvoice,
      existingInvoiceNumber: existing?.invoice.number ?? null,
      items,
      amount,
      schedulePins: pins,
      reasons,
      openingBalances: openItems,
    },
  };
}

/** One schedule line as the run would bill it, or null when it is not billed this period. */
function scheduleItem(
  facts: RunFacts,
  schedule: ScheduleFacts,
  scheduleName: string,
  scheduleVersion: number,
  line: {
    readonly feeItemId: string;
    readonly amount: Money;
    readonly frequency: string;
    readonly prorationRule: ScheduleProrationRule;
  },
  learner: RepositoryRow<'learner'>,
  enrolment: RepositoryRow<'enrolment'>,
  window: ProrationWindow,
  existing: ExistingInvoiceFacts | null,
  reasons: string[]
): PlannedItem | null {
  const item = facts.feeItems.get(line.feeItemId);
  const label = itemLabel(item, line.feeItemId);

  // A posted invoice is immutable, so an item it already bills is never billed again: the run adds
  // only what is missing, on a supplementary invoice.
  if (existing?.billedFeeItemIds.has(line.feeItemId)) {
    reasons.push(`${label}: already billed on invoice ${existing.invoice.number}`);
    return null;
  }

  if (line.frequency === 'one_off_at_admission') {
    const admitted = learner.admission_date ?? enrolment.start_date;
    if (admitted < facts.period.start_date) {
      reasons.push(`${label}: a one-off admission fee, not billed to a continuing learner`);
      return null;
    }
  }
  if (line.frequency === 'per_year' && facts.firstBillingPeriodId !== facts.period.id) {
    reasons.push(`${label}: billed once a year, in the year's first billing period`);
    return null;
  }

  const record = prorationRecord(line.prorationRule, window);
  const amount = prorateAmount(line.amount, record);
  if (isZero(amount)) {
    reasons.push(`${label}: ${describeProration(record)}, so nothing is due`);
    return null;
  }

  const whole = record.numerator === record.denominator;
  return {
    source: 'schedule',
    feeItemId: line.feeItemId,
    feeItemLabel: label,
    description: `${label} (${scheduleName} v${scheduleVersion})`,
    kind: 'fee',
    amount,
    listAmount: whole ? null : line.amount,
    scheduleId: schedule.row.id,
    scheduleVersion,
    frequency: line.frequency,
    proration: whole ? null : record,
    reason: `${label} from ${scheduleName} v${scheduleVersion}${
      whole ? '' : `, ${describeProration(record)}`
    }`,
  };
}

/** One ad-hoc charge as the run would bill it, or null when it is already billed. */
function chargeItem(
  facts: RunFacts,
  charge: AdHocChargeInput,
  existing: { readonly billedDescriptions: ReadonlySet<string> } | null,
  reasons: string[]
): PlannedItem | null {
  if (existing?.billedDescriptions.has(charge.description)) {
    reasons.push(`the charge "${charge.description}" is already billed and is not repeated`);
    return null;
  }
  const label = itemLabel(facts.feeItems.get(charge.feeItemId), charge.feeItemId);
  reasons.push(`one-off charge: ${charge.description} (${label}, ${charge.kind})`);
  return {
    source: 'adhoc',
    feeItemId: charge.feeItemId,
    feeItemLabel: label,
    description: charge.description,
    kind: charge.kind,
    amount: charge.amount,
    listAmount: null,
    scheduleId: null,
    scheduleVersion: null,
    frequency: null,
    proration: null,
    reason: `ad-hoc ${charge.kind}: ${charge.description}`,
  };
}

/** One opening balance as the run would bill it, or null when it is already billed. */
function openingItem(
  opening: OpeningBalanceInput,
  existing: { readonly billedDescriptions: ReadonlySet<string> } | null,
  reasons: string[]
): PlannedItem | null {
  const description = `Opening balance as at ${opening.asOfDate}`;
  if (existing?.billedDescriptions.has(description)) {
    reasons.push(`the opening balance as at ${opening.asOfDate} is already on the learner's account`);
    return null;
  }
  reasons.push(
    `opening balance carried from a previous system: ${
      opening.side === 'debit' ? 'the learner owes' : 'the learner is in credit'
    } as at ${opening.asOfDate}`
  );
  return {
    source: 'opening_balance',
    feeItemId: null,
    feeItemLabel: null,
    description,
    kind: 'opening_balance',
    amount: opening.amount,
    listAmount: null,
    scheduleId: null,
    scheduleVersion: null,
    frequency: null,
    proration: null,
    reason: `opening balance (${opening.side}) as at ${opening.asOfDate}`,
  };
}

/** The preview item shape a planned item is shown as. */
export function previewItemOf(item: PlannedItem): BillingPreviewItem {
  return {
    source: item.source,
    feeItemId: item.feeItemId,
    feeItemLabel: item.feeItemLabel,
    description: item.description,
    kind: item.kind,
    amount: item.amount,
    listAmount: item.listAmount,
    scheduleId: item.scheduleId,
    scheduleVersion: item.scheduleVersion,
    frequency: item.frequency,
    proration: item.proration,
    reason: item.reason,
  };
}

/** The preview line shape a planned learner is shown as. */
export function previewLineOf(line: PlannedLearner): BillingPreviewLine {
  return {
    learnerId: line.learnerId,
    learnerName: line.learnerName,
    admissionNumber: line.admissionNumber,
    levelId: line.levelId,
    residenceStatus: line.residenceStatus,
    isNewInvoice: line.isNewInvoice,
    supplementary: line.supplementary,
    existingInvoiceNumber: line.existingInvoiceNumber,
    items: line.items.map(previewItemOf),
    amount: line.amount,
    schedulePins: line.schedulePins,
    reasons: line.reasons,
  };
}

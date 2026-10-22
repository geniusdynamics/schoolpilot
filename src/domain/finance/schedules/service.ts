// ABOUTME: The fee-schedule service: it writes a version of the matrix through the canonical
// ABOUTME: `fee_schedule` / `fee_schedule_line` entities, resolves a cell for a learner, derives a
// ABOUTME: new version with an uplift, and moves a version through maker-checker approval.

import type { CreateInput, RepositoryRow } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import { isCurrencyCode, isMoney, type Money } from '@/domain/money';
import type { FeeSchedule, FeeScheduleLine } from '@/domain/schema';
import type { WorkflowActor, WorkflowAvailableMove, WorkflowTransitionEntry } from '@/domain/workflows';

import { ScheduleError } from './errors';
import {
  cellKeyOf,
  effectiveLineAddress,
  headerOf,
  isEditable,
  normalizeAddress,
  resolveCell,
  type MatrixHeader,
  type ResolvedAddress,
} from './matrix';
import { upliftCells } from './uplift';
import type {
  ResolvedCell,
  ScheduleApprovalGateway,
  ScheduleCellInput,
  ScheduleCellAddress,
  ScheduleLineInput,
  ScheduleListQuery,
  ScheduleStore,
  ScheduleUplift,
  ScheduleVersion,
  ScheduleVersionInput,
} from './types';

/** What the service is built with. */
export interface FeeScheduleServiceOptions {
  /** Where a version and its lines are read and written. */
  readonly store: ScheduleStore;
  /** The maker-checker gateway of the approval workflow. */
  readonly approvals: ScheduleApprovalGateway;
}

/** The result of deriving a version: the new row and the source it came from. */
export interface DerivedVersion {
  readonly schedule: RepositoryRow<'fee_schedule'>;
  readonly from: Id<'fee_schedule'>;
  readonly fromVersion: number;
}

/**
 * The fee-schedule service.
 *
 * A version is one `fee_schedule` row; its prices are the `fee_schedule_line` rows that carry the
 * row's id. The matrix dimensions are the header's own (`level_ids`, `residence_statuses`,
 * `fee_category_ids`, `campus_id`), and each line names the point of that space it prices. Nothing
 * here is a second model: every read and write goes through the canonical repository.
 */
export class FeeScheduleService {
  private readonly store: ScheduleStore;
  private readonly approvals: ScheduleApprovalGateway;

  constructor(options: FeeScheduleServiceOptions) {
    this.store = options.store;
    this.approvals = options.approvals;
  }

  // ------------------------------------------------------------------ writing

  /**
   * Creates a version of a matrix as a draft.
   *
   * The header carries the dimensions the version spans; every cell must address a declared point
   * of them. The version number is the caller's: a new version of the same matrix is a whole new
   * row, never an edit of the old one.
   */
  async createVersion(input: ScheduleVersionInput, actor: WorkflowActor): Promise<RepositoryRow<'fee_schedule'>> {
    await this.assertInstitution(input.institutionId, input.cells);
    assertVersionInput(input);
    const header = headerOfInput(input);

    const schedule = await this.store.create(
      'fee_schedule',
      {
        institution_id: input.institutionId,
        name: input.name.trim(),
        academic_year_id: input.academicYearId,
        academic_period_ids: [...input.academicPeriodIds],
        programme_ids: [...input.programmeIds],
        level_ids: [...input.levelIds],
        residence_statuses: [...input.residenceStatuses],
        fee_category_ids: [...input.feeCategoryIds],
        ...(input.campusId === undefined ? {} : { campus_id: input.campusId }),
        new_learners_only: input.newLearnersOnly ?? false,
        version: input.version,
        status: 'draft',
      } satisfies CreateInput<'fee_schedule'>,
      { actor: actor.id }
    );

    await this.writeLines(schedule.id, input.institutionId, header, input.cells, actor);
    return schedule;
  }

  /**
   * Replaces the cells of a draft version.
   *
   * A version that is approved or published is frozen: its prices are what a learner was billed
   * from, so a correction is a new version derived from it, never an edit. This is refused with
   * `version_immutable` rather than silently ignored.
   */
  async setCells(
    feeScheduleId: Id<'fee_schedule'>,
    cells: readonly ScheduleCellInput[],
    actor: WorkflowActor
  ): Promise<void> {
    const version = await this.getVersion(feeScheduleId);
    const header = headerOf(version.schedule);
    if (!isEditable(version.schedule.status)) {
      throw new ScheduleError(
        'version_immutable',
        `${version.schedule.name} v${version.schedule.version} is ${version.schedule.status}; its prices are frozen. Derive a new version instead.`,
        { feeScheduleId }
      );
    }
    await this.assertInstitution(asId<'institution'>(version.schedule.institution_id), cells);
    assertVersionInput({ ...emptyVersionInput(version.schedule), cells });
    for (const line of version.lines) {
      await this.store.remove('fee_schedule_line', line.id, { actor: actor.id });
    }
    await this.writeLines(
      feeScheduleId,
      asId<'institution'>(version.schedule.institution_id),
      header,
      cells,
      actor
    );
  }

  /**
   * Derives a new draft version from an existing one, with an uplift applied.
   *
   * The new version copies every cell and line, raises each amount by the percentage (through the
   * money module, with the explicit rounding rule of `uplift.ts`) and then by the per-item absolute
   * change. The source version is never touched: a version in force stays readable, which is what
   * lets a historical invoice explain itself.
   */
  async copyWithUplift(
    fromScheduleId: Id<'fee_schedule'>,
    options: {
      readonly version: number;
      readonly uplift: ScheduleUplift;
      readonly actor: WorkflowActor;
      readonly name?: string;
      readonly academicYearId?: Id<'academic_year'>;
      readonly academicPeriodIds?: readonly Id<'academic_period'>[];
      readonly newLearnersOnly?: boolean;
    }
  ): Promise<DerivedVersion> {
    const source = await this.getVersion(fromScheduleId);
    const header = headerOf(source.schedule);
    const cells = cellsOf(header, source.lines);
    const uplifted = upliftCells(cells, options.uplift);
    const created = await this.createVersion(
      {
        ...scheduleHeaderInput(source.schedule),
        name: options.name ?? source.schedule.name,
        academicYearId:
          options.academicYearId ?? asId<'academic_year'>(source.schedule.academic_year_id),
        academicPeriodIds:
          options.academicPeriodIds ??
          source.schedule.academic_period_ids.map((id) => asId<'academic_period'>(id)),
        newLearnersOnly: options.newLearnersOnly ?? source.schedule.new_learners_only,
        version: options.version,
        cells: uplifted,
      },
      options.actor
    );
    return { schedule: created, from: fromScheduleId, fromVersion: source.schedule.version };
  }

  // ------------------------------------------------------------------ reading

  /** A version and its lines, or a refusal when the row does not exist. */
  async getVersion(feeScheduleId: Id<'fee_schedule'>): Promise<ScheduleVersion> {
    const schedule = await this.store.get('fee_schedule', feeScheduleId);
    if (!schedule) {
      throw new ScheduleError('not_found', `No fee schedule answers to ${feeScheduleId}.`, {
        feeScheduleId,
      });
    }
    const lines = await this.linesOf(feeScheduleId);
    return { schedule, lines };
  }

  /** The versions a caller narrows to, newest version first. */
  async listVersions(query: ScheduleListQuery = {}): Promise<readonly RepositoryRow<'fee_schedule'>[]> {
    const where: Record<string, unknown> = {};
    if (query.institutionId !== undefined) where.institution_id = query.institutionId;
    if (query.name !== undefined) where.name = query.name;
    if (query.status !== undefined) where.status = query.status;
    const page = await this.store.list('fee_schedule', {
      where,
      orderBy: [{ field: 'version', direction: 'desc' }],
      limit: 200,
    });
    return page.items;
  }

  /** The version in force for a matrix: its published version with the highest number, or null. */
  async versionInForce(
    institutionId: Id<'institution'>,
    name: string
  ): Promise<RepositoryRow<'fee_schedule'> | null> {
    const published = await this.listVersions({ institutionId, name, status: 'published' });
    return published[0] ?? null;
  }

  /**
   * Resolves the cell a learner of a population is billed.
   *
   * The result pins the version it came from, so a billing run can record which version a learner
   * was billed from. An ambiguous address, an undeclared dimension or a combination no cell prices
   * is refused by name.
   */
  async resolveForBilling(
    feeScheduleId: Id<'fee_schedule'>,
    address: ScheduleCellAddress
  ): Promise<ResolvedCell> {
    const version = await this.getVersion(feeScheduleId);
    return resolveCell(headerOf(version.schedule), version.lines, address);
  }

  // ----------------------------------------------------------------- approval

  /** The state a version is in, read through the workflow gateway. */
  async stateOf(feeScheduleId: Id<'fee_schedule'>): Promise<string> {
    return this.approvals.stateOf(feeScheduleId);
  }

  /** The moves the actor may make on a version. */
  async availableMoves(
    feeScheduleId: Id<'fee_schedule'>,
    actor: WorkflowActor
  ): Promise<readonly WorkflowAvailableMove[]> {
    return this.approvals.available(feeScheduleId, actor);
  }

  /** Submits a draft version for approval. */
  async submit(feeScheduleId: Id<'fee_schedule'>, actor: WorkflowActor): Promise<void> {
    await this.assertDraftBeforeSubmit(feeScheduleId);
    await this.approvals.submit({ feeScheduleId, actor });
  }

  /** Approves a submitted version. The maker of the submission may not do it. */
  async approve(feeScheduleId: Id<'fee_schedule'>, actor: WorkflowActor, reason?: string): Promise<void> {
    await this.approvals.approve({ feeScheduleId, actor, ...(reason === undefined ? {} : { reason }) });
  }

  /** Sends a submitted version back to draft. A reason is required. */
  async reject(feeScheduleId: Id<'fee_schedule'>, actor: WorkflowActor, reason: string): Promise<void> {
    await this.approvals.reject({ feeScheduleId, actor, reason });
  }

  /**
   * Publishes an approved version, making it the one in force.
   *
   * Any earlier published version of the same matrix is archived, so exactly one version is in
   * force; the archived version stays readable, so a historical invoice still resolves.
   */
  async publish(feeScheduleId: Id<'fee_schedule'>, actor: WorkflowActor): Promise<void> {
    const version = await this.getVersion(feeScheduleId);
    const previous = await this.listVersions({
      institutionId: asId<'institution'>(version.schedule.institution_id),
      name: version.schedule.name,
      status: 'published',
    });
    await this.approvals.publish({ feeScheduleId, actor });
    for (const other of previous) {
      if (other.id !== feeScheduleId) {
        await this.approvals.archive({ feeScheduleId: other.id, actor });
      }
    }
  }

  /** Archives a published version. */
  async archive(feeScheduleId: Id<'fee_schedule'>, actor: WorkflowActor): Promise<void> {
    await this.approvals.archive({ feeScheduleId, actor });
  }

  /** The transition trail of a version: the workflow engine's audit. */
  async history(feeScheduleId: Id<'fee_schedule'>): Promise<readonly WorkflowTransitionEntry[]> {
    return this.approvals.history(feeScheduleId);
  }

  // ------------------------------------------------------------------ internals

  private async linesOf(
    feeScheduleId: Id<'fee_schedule'>
  ): Promise<readonly RepositoryRow<'fee_schedule_line'>[]> {
    const page = await this.store.list('fee_schedule_line', {
      where: { fee_schedule_id: feeScheduleId },
      limit: 500,
    });
    return page.items;
  }

  private async assertDraftBeforeSubmit(feeScheduleId: Id<'fee_schedule'>): Promise<void> {
    const version = await this.getVersion(feeScheduleId);
    if (version.schedule.status !== 'draft') {
      throw new ScheduleError(
        'approval_denied',
        `${version.schedule.name} v${version.schedule.version} is ${version.schedule.status}, not a draft; there is nothing to submit.`,
        { feeScheduleId }
      );
    }
  }

  private async assertInstitution(
    institutionId: Id<'institution'>,
    cells: readonly ScheduleCellInput[]
  ): Promise<void> {
    const institution = await this.store.get('institution', institutionId);
    if (!institution) {
      throw new ScheduleError('institution_missing', `No institution answers to ${institutionId}.`);
    }
    const currency = institution.base_currency;
    if (!isCurrencyCode(currency)) {
      throw new ScheduleError(
        'institution_currency_invalid',
        `The institution's base currency ${String(currency)} is not one the money table holds.`
      );
    }
    for (const cell of cells) {
      for (const line of cell.lines) {
        assertAmount(line, currency);
      }
    }
  }

  private async writeLines(
    feeScheduleId: Id<'fee_schedule'>,
    institutionId: Id<'institution'>,
    header: MatrixHeader,
    cells: readonly ScheduleCellInput[],
    actor: WorkflowActor
  ): Promise<void> {
    for (const cell of cells) {
      const address = normalizeAddress(header, cell);
      for (const line of cell.lines) {
        await this.store.create(
          'fee_schedule_line',
          {
            institution_id: institutionId,
            fee_schedule_id: feeScheduleId,
            fee_item_id: line.feeItemId,
            level_id: address.levelId,
            residence_status: address.residence,
            ...(address.feeCategoryId === null ? {} : { fee_category_id: address.feeCategoryId }),
            amount: line.amount,
            mandatory: line.mandatory ?? true,
            frequency: line.frequency ?? 'per_term',
            ...(line.dueDates === undefined ? {} : { due_dates: [...line.dueDates] }),
            ...(line.installmentPlanId === undefined
              ? {}
              : { installment_plan_id: line.installmentPlanId }),
            proration_rule: line.prorationRule ?? 'full',
          } satisfies CreateInput<'fee_schedule_line'>,
          { actor: actor.id }
        );
      }
    }
  }
}

// --------------------------------------------------------------- pure helpers

/** The header of a version that is not written yet. */
function headerOfInput(input: ScheduleVersionInput): MatrixHeader {
  return {
    id: asId<'fee_schedule'>('00000000-0000-7000-8000-000000000000'),
    name: input.name.trim(),
    version: input.version,
    status: 'draft',
    levelIds: input.levelIds,
    residenceStatuses: input.residenceStatuses,
    feeCategoryIds: input.feeCategoryIds,
    campusId: input.campusId ?? null,
  };
}

/** A version input with the header of a stored version and no cells. */
function emptyVersionInput(schedule: FeeSchedule): ScheduleVersionInput {
  return {
    ...scheduleHeaderInput(schedule),
    name: schedule.name,
    version: schedule.version,
    cells: [],
  };
}

/** The Id-typed header fields of a stored `fee_schedule` row. */
function scheduleHeaderInput(
  schedule: FeeSchedule
): Pick<
  ScheduleVersionInput,
  | 'institutionId'
  | 'academicYearId'
  | 'academicPeriodIds'
  | 'programmeIds'
  | 'levelIds'
  | 'residenceStatuses'
  | 'feeCategoryIds'
  | 'campusId'
  | 'newLearnersOnly'
> {
  return {
    institutionId: asId<'institution'>(schedule.institution_id),
    academicYearId: asId<'academic_year'>(schedule.academic_year_id),
    academicPeriodIds: schedule.academic_period_ids.map((id) => asId<'academic_period'>(id)),
    programmeIds: schedule.programme_ids.map((id) => asId<'programme'>(id)),
    levelIds: schedule.level_ids.map((id) => asId<'level'>(id)),
    residenceStatuses: schedule.residence_statuses,
    feeCategoryIds: schedule.fee_category_ids.map((id) => asId<'fee_category'>(id)),
    ...(schedule.campus_id === undefined ? {} : { campusId: asId<'campus'>(schedule.campus_id) }),
    newLearnersOnly: schedule.new_learners_only,
  };
}

/** Refuses a version whose header or cells are malformed, before anything is written. */
export function assertVersionInput(input: ScheduleVersionInput): void {
  if (input.name.trim() === '') {
    throw new ScheduleError('name_required', 'A fee schedule needs a name.');
  }
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new ScheduleError('version_invalid', `A version must be a whole number at or above 1, not ${input.version}.`);
  }
  if (input.cells.length === 0) {
    throw new ScheduleError('no_cells', 'A fee schedule version needs at least one cell.');
  }
  const header = headerOfInput(input);
  const seenCells = new Set<string>();
  for (const cell of input.cells) {
    const address = normalizeAddress(header, cell);
    const key = cellKeyOf(address);
    if (seenCells.has(key)) {
      throw new ScheduleError('cell_duplicate', `Two cells of the version price ${key}.`);
    }
    seenCells.add(key);
    const seenItems = new Set<string>();
    for (const line of cell.lines) {
      if (seenItems.has(line.feeItemId)) {
        throw new ScheduleError('line_duplicate', `Cell ${key} prices fee item ${line.feeItemId} twice.`);
      }
      seenItems.add(line.feeItemId);
    }
  }
}

function assertAmount(line: ScheduleLineInput, currency: string): void {
  if (!isMoney(line.amount)) {
    throw new ScheduleError('amount_not_money', `The amount for fee item ${line.feeItemId} is not a Money value.`);
  }
  if (line.amount.currency !== currency) {
    throw new ScheduleError(
      'amount_currency_mismatch',
      `The amount for fee item ${line.feeItemId} is in ${line.amount.currency}, but the institution bills in ${currency}.`
    );
  }
}

/** Reads a stored version's lines back into the cells a caller supplied them as. */
export function cellsOf(
  header: MatrixHeader,
  lines: readonly FeeScheduleLine[]
): readonly ScheduleCellInput[] {
  const byCell = new Map<string, { address: ResolvedAddress; lines: ScheduleLineInput[] }>();
  for (const line of lines) {
    const address = effectiveLineAddress(header, line);
    if (address === null) {
      throw new ScheduleError(
        'cell_dimension_undeclared',
        `A line of ${header.name} v${header.version} names no level or residence and the schedule spans several; the cell it belongs to is unknowable.`,
        { feeScheduleId: header.id }
      );
    }
    const key = cellKeyOf(address);
    const cell = byCell.get(key) ?? { address, lines: [] };
    cell.lines.push(lineInputOf(line));
    byCell.set(key, cell);
  }
  return [...byCell.values()].map((cell) => ({
    levelId: asId<'level'>(cell.address.levelId),
    residence: cell.address.residence,
    ...(cell.address.feeCategoryId === null
      ? {}
      : { feeCategoryId: asId<'fee_category'>(cell.address.feeCategoryId) }),
    ...(cell.address.campusId === null ? {} : { campusId: asId<'campus'>(cell.address.campusId) }),
    lines: cell.lines,
  }));
}

function lineInputOf(line: FeeScheduleLine): ScheduleLineInput {
  return {
    feeItemId: asId<'fee_item'>(line.fee_item_id),
    amount: line.amount as Money,
    mandatory: line.mandatory,
    frequency: line.frequency,
    ...(line.due_dates === undefined ? {} : { dueDates: line.due_dates }),
    ...(line.installment_plan_id === undefined
      ? {}
      : { installmentPlanId: asId<'installment_plan'>(line.installment_plan_id) }),
    prorationRule: line.proration_rule,
  };
}

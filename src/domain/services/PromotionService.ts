// ABOUTME: The promotion run of spec 04 section 6: compute a per-learner suggestion from the pack's
// ABOUTME: progression rules, review it per class group with a reasoned override, approve it as the
// ABOUTME: head teacher, commit it in one transaction (close, open, carry balances, archive the class
// ABOUTME: list) and undo it until the next year has been billed.
//
// The evaluator of P2-B04 decides nothing: it returns a suggestion with its rule, metrics, reasons
// and flags. This service is where a suggestion becomes a decision, and every decision is made by a
// person (a reviewer's override, or the head teacher's approval) and recorded with its reason.
//
// The repository cannot read while a transaction is open, so every commit and every undo resolves
// the rows it needs first and the transaction only writes.

import {
  evaluatePromotion,
  type ProgressionAction,
  type ProgressionContext,
  type ProgressionDefinition,
  type ProgressionLevel,
  type ProgressionStage,
  type ProgressionSuggestion,
} from '@/domain/assessment/progression';
import { type Role } from '@/data/auth';
import {
  RepositoryPermissionError,
  type CreateInput,
  type ListQuery,
  type Repository,
  type RepositoryRow,
} from '@/data/repository';
import { asId, generateUuidv7, type Id } from '@/domain/ids';
import type { EntityName, JsonValue, Money } from '@/domain/schema';

import {
  PROMOTION_RUN_KEY,
  WorkflowEngine,
  createMemoryWorkflowStore,
  promotionRun as promotionRunWorkflow,
  resolveMove,
  type WorkflowStore,
} from '@/domain/workflows';

import {
  inTransaction,
  type EnrolmentStatus,
  type EntryReason,
  type ExitReason,
  type LearnerStatus,
  type ServiceDependencies,
} from './common';
import { ServiceError } from './errors';

/** The statuses that count as an enrolment of the closing year. */
const ACTIVE_ENROLMENT_STATUSES: readonly EnrolmentStatus[] = ['active', 'repeating'];

/** The invoice statuses that carry a real balance. */
const BILLED_INVOICE_STATUSES: readonly string[] = ['posted', 'partially_paid', 'paid'];
/** The payment statuses that count as money received. */
const RECEIVED_PAYMENT_STATUSES: readonly string[] = ['posted', 'cleared'];

/** The repository caps a page at 500 rows; a run walks the pages itself. */
const PAGE_SIZE = 500;

/** The prefix a carried-forward balance invoice carries, so it is recognisable and reversible. */
const CARRY_PREFIX = 'CARRY/';

/**
 * The roles that own the approval of a promotion run (spec 04 section 6.2 step 4: the head teacher).
 *
 * The catalogue of spec 06 section 5.2 maps the deputy (academics), the director of studies and the
 * exams officer onto `head_teacher`, and the administrator holds every permission. The gate is the
 * engine's own transition (`enrolment.promotion_run`, `approve`): the roles and the permission live
 * on the workflow, so a change to who may approve is a change to the catalogue rather than to this
 * service.
 */
export const PROMOTION_APPROVER_ROLES: readonly Role[] =
  promotionRunWorkflow.transitions.find((transition) => transition.key === 'approve')
    ?.allowed_roles ?? [];

/** True when the roles own the approval of a promotion run (spec 04 section 6.2 step 4). */
export function canApprovePromotion(roles: readonly Role[]): boolean {
  return resolveMove(promotionRunWorkflow, {
    recordKey: '',
    from: 'computed',
    to: 'approved',
    actor: { id: '', roles },
  }).allowed;
}

/** The structural facts a promotion run reads from a pack. */
export interface PromotionRules {
  readonly definition: ProgressionDefinition;
  /** The pack's levels, with the `next` of each one. */
  readonly levels: readonly ProgressionLevel[];
  /** The pack's stages, so a stage transition can name the level it enters. */
  readonly stages: readonly ProgressionStage[];
}

/** The decision a reviewer may make. A referral (`council`, `blocked`) is never a decision. */
export type PromotionDecisionAction = 'promote' | 'repeat' | 'graduate';

/** What the caller knows about one learner beyond the enrolment. */
export interface PromotionLearnerContext {
  readonly context?: ProgressionContext;
  /** Records that exist for the learner, by requirement name. */
  readonly requirements?: Readonly<Record<string, boolean | string | null>>;
  /** False when the learner's record is known to be incomplete. */
  readonly complete?: boolean;
}

/** The per-learner facts the run cannot read from the enrolment: annual results, metrics, records. */
export type PromotionContextSource = (learner: {
  readonly learnerId: Id<'learner'>;
  readonly enrolmentId: Id<'enrolment'>;
  readonly levelCode: string;
}) => PromotionLearnerContext;

/** What a compute run is given. */
export interface PromotionComputeInput {
  /** The academic year being closed. */
  readonly academicYearId: Id<'academic_year'>;
  /** The academic year being opened. */
  readonly nextAcademicYearId: Id<'academic_year'>;
  readonly rules: PromotionRules;
  /** Scope the run to one class group (the class-by-class review). */
  readonly classGroupId?: Id<'class_group'>;
  readonly contextFor?: PromotionContextSource;
}

/** One reviewer's override of a suggestion, with the reason and the actor it is recorded for. */
export interface PromotionOverride {
  readonly learnerId: Id<'learner'>;
  /** What the suggestion said, before the override. */
  readonly from: ProgressionAction;
  /** What the reviewer decided. */
  readonly action: PromotionDecisionAction;
  readonly reason: string;
  readonly actor: string;
  readonly at: string;
  readonly toLevelId: Id<'level'> | null;
  readonly toClassGroupId: Id<'class_group'> | null;
}

/** One learner of a promotion run: the suggestion, the decision, and the override when there is one. */
export interface PromotionRow {
  readonly learnerId: Id<'learner'>;
  readonly enrolmentId: Id<'enrolment'>;
  readonly learnerName: string;
  readonly admissionNumber: string;
  readonly classGroupId: Id<'class_group'>;
  readonly classGroupName: string;
  readonly levelId: Id<'level'>;
  readonly levelCode: string;
  /** The suggestion of P2-B04, verbatim; never a decision on its own. */
  readonly suggestion: ProgressionSuggestion;
  /** The decision the run would carry: the suggestion unless a reviewer overrode it. */
  readonly action: ProgressionAction;
  readonly toLevelId: Id<'level'> | null;
  readonly toStage: string | null;
  readonly override: PromotionOverride | null;
}

/** The counts a run record carries. */
export interface PromotionCounts {
  readonly total: number;
  readonly promoted: number;
  readonly repeated: number;
  readonly graduated: number;
  readonly pending: number;
  readonly overridden: number;
  readonly closed: number;
  readonly opened: number;
  readonly carried: number;
}

/** The previous state of an enrolment the run closed, so an undo can restore it. */
export interface ClosedEnrolment {
  readonly id: Id<'enrolment'>;
  readonly previousStatus: EnrolmentStatus;
  readonly previousEndDate: string | null;
  readonly previousExitReason: ExitReason | null;
}

/** The previous state of a learner the run graduated, so an undo can restore it. */
export interface GraduatedLearner {
  readonly id: Id<'learner'>;
  readonly previousStatus: LearnerStatus;
}

/** One class list the run archived, with how many learners it held. */
export interface ArchivedClassList {
  readonly classGroupId: Id<'class_group'>;
  readonly classGroupName: string;
  readonly learners: number;
}

/** The record a commit produces: who, when, the counts, and every override with its reason. */
export interface PromotionRunRecord {
  readonly runId: string;
  readonly committedAt: string;
  readonly committedBy: string;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly counts: PromotionCounts;
  readonly overrides: readonly PromotionOverride[];
  readonly closedEnrolments: readonly ClosedEnrolment[];
  readonly openedEnrolmentIds: readonly Id<'enrolment'>[];
  readonly decisionIds: readonly string[];
  readonly carriedInvoiceIds: readonly string[];
  readonly graduatedLearners: readonly GraduatedLearner[];
  readonly archivedClassLists: readonly ArchivedClassList[];
}

/** The run the page holds: computed, reviewed, approved, then committed. */
export interface PromotionRun {
  readonly runId: string;
  readonly institutionId: Id<'institution'>;
  readonly academicYearId: Id<'academic_year'>;
  readonly nextAcademicYearId: Id<'academic_year'>;
  readonly computedAt: string;
  readonly computedBy: string;
  readonly rows: readonly PromotionRow[];
  readonly approvedAt: string | null;
  readonly approvedBy: string | null;
  readonly approvedRoles: readonly Role[];
  readonly committedAt: string | null;
  readonly committedBy: string | null;
  readonly record: PromotionRunRecord | null;
}

/** One learner the run will act on, with the target the run resolved. */
export interface PromotionPlacement {
  readonly row: PromotionRow;
  readonly action: PromotionDecisionAction;
  readonly targetLevelId: Id<'level'>;
  readonly targetClassGroupId: Id<'class_group'>;
  /** The class group of the next year the learner enters; it carries the year and the programme. */
  readonly targetClassGroup: RepositoryRow<'class_group'>;
}

/** Why the run cannot act on a learner, with the code the page shows. */
export interface PromotionConflict {
  readonly learnerId: Id<'learner'>;
  readonly learnerName: string;
  readonly code: 'undecided' | 'no_target_level' | 'no_target_class_group';
  readonly detail: string;
}

/** What the run would do: the placements it can make and the learners a human has to settle first. */
export interface PromotionPlan {
  readonly placements: readonly PromotionPlacement[];
  readonly graduates: readonly PromotionRow[];
  readonly conflicts: readonly PromotionConflict[];
}

/** The result of an undo. */
export interface PromotionUndoResult {
  readonly runId: string;
  readonly undoneAt: string;
  readonly restoredEnrolments: number;
  readonly reversedEnrolments: number;
  readonly voidedInvoices: number;
  readonly restoredLearners: number;
}

export interface PromotionServiceOptions extends ServiceDependencies {
  /** The repository every read and write goes through. */
  readonly repository: Repository;
  /** Where the run's transitions are audited. Defaults to a store private to this service. */
  readonly workflows?: WorkflowStore;
}

type EnrolmentRow = RepositoryRow<'enrolment'>;
type ClassGroupRow = RepositoryRow<'class_group'>;
type LevelRow = RepositoryRow<'level'>;
type LearnerRow = RepositoryRow<'learner'>;
type InvoiceRow = RepositoryRow<'invoice'>;
type DecisionRow = RepositoryRow<'promotion_decision'>;

/**
 * The promotion run service.
 *
 * Every read and write goes through the repository of P1-B02. The commit is one transaction: a
 * failure anywhere leaves nothing half-applied. The repository cannot read while a transaction is
 * open, so the whole plan is resolved first and the transaction only writes.
 */
export class PromotionService {
  private readonly repository: Repository;
  private readonly actor: string | undefined;
  private readonly now: () => Date;
  /** The run's own transitions: `enrolment.promotion_run`, guarded by the engine. */
  private readonly workflows: WorkflowEngine;

  constructor(options: PromotionServiceOptions) {
    this.repository = options.repository;
    this.actor = options.actor;
    this.now = options.now ?? (() => new Date());
    this.workflows = new WorkflowEngine({
      store: options.workflows ?? createMemoryWorkflowStore(),
      definitions: [promotionRunWorkflow],
    });
  }

  /** The transitions of one run, oldest first, as the engine recorded them. */
  runHistory(runId: string): ReturnType<WorkflowEngine['history']> {
    return this.workflows.history(runId);
  }

  // ------------------------------------------------------------------ compute

  /**
   * Computes a suggestion for every learner of the closing year.
   *
   * The suggestion is never a decision: the evaluator's action, rule, metrics, reasons and flags
   * are carried whole, and the run records what a human does with them. A learner the evaluator
   * could not decide (an unmet requirement, incomplete data, a referral to the council) is carried
   * with that outcome, not dropped and not promoted.
   */
  async compute(input: PromotionComputeInput): Promise<PromotionRun> {
    const closingYear = await this.repository.get('academic_year', input.academicYearId);
    if (!closingYear) {
      throw new ServiceError(
        'missing_reference',
        `the academic year ${input.academicYearId} does not exist`,
        { entity: 'academic_year', id: input.academicYearId }
      );
    }
    const openingYear = await this.repository.get('academic_year', input.nextAcademicYearId);
    if (!openingYear) {
      throw new ServiceError(
        'missing_reference',
        `the academic year ${input.nextAcademicYearId} does not exist`,
        { entity: 'academic_year', id: input.nextAcademicYearId }
      );
    }

    const levels = await this.levelsByCode();
    const enrolments = await this.closingEnrolments(input);
    if (enrolments.length === 0) {
      throw new ServiceError('invalid_request', 'no active enrolment of this year matches the run');
    }

    const rows: PromotionRow[] = [];
    for (const enrolment of enrolments) {
      rows.push(await this.rowFor(enrolment, levels, input));
    }
    rows.sort(
      (a, b) =>
        a.classGroupName.localeCompare(b.classGroupName) ||
        a.learnerName.localeCompare(b.learnerName)
    );

    return {
      runId: generateUuidv7(),
      institutionId: closingYear.institution_id as Id<'institution'>,
      academicYearId: input.academicYearId,
      nextAcademicYearId: input.nextAcademicYearId,
      computedAt: this.timestamp(),
      computedBy: this.actor ?? '',
      rows,
      approvedAt: null,
      approvedBy: null,
      approvedRoles: [],
      committedAt: null,
      committedBy: null,
      record: null,
    };
  }

  // ------------------------------------------------------------------- review

  /**
   * Records a reviewer's override of one suggestion.
   *
   * The override carries the reason, the actor and the time, and keeps what the suggestion said
   * before it, so the run record can show both. A council referral or a blocked transition has no
   * decision until a reviewer overrides it: nothing is applied on the council's behalf.
   */
  override(
    run: PromotionRun,
    learnerId: Id<'learner'>,
    decision: {
      readonly action: PromotionDecisionAction;
      readonly reason: string;
      readonly toClassGroupId?: Id<'class_group'>;
      readonly actor?: string;
    }
  ): PromotionRun {
    if (run.committedAt) {
      throw new ServiceError('invalid_request', 'a committed promotion run cannot be reviewed');
    }
    const reason = decision.reason.trim();
    if (reason.length === 0) {
      throw new ServiceError('invalid_request', 'an override needs a reason');
    }
    const index = run.rows.findIndex((row) => row.learnerId === learnerId);
    if (index < 0) {
      throw new ServiceError('missing_reference', `the learner ${learnerId} is not in this run`, {
        entity: 'learner',
        id: learnerId,
      });
    }

    const row = run.rows[index];
    const override: PromotionOverride = {
      learnerId,
      from: row.action,
      action: decision.action,
      reason,
      actor: decision.actor ?? this.actor ?? '',
      at: this.timestamp(),
      toLevelId: this.overrideTargetLevel(row, decision.action),
      toClassGroupId: decision.toClassGroupId ?? null,
    };
    const rows = [...run.rows];
    rows[index] = {
      ...row,
      action: decision.action,
      toLevelId: override.toLevelId,
      override,
    };
    return { ...run, rows };
  }

  // ----------------------------------------------------------------- approve

  /**
   * Approves the run, for an actor whose roles own the approval.
   *
   * The gate is the repository's role model (`@/data/auth`): a role that does not hold
   * `enrolment.write` cannot approve, and of the roles that do, only the head's own role may. A
   * refusal is the repository's own permission error, so the caller sees the same type everywhere.
   */
  approve(
    run: PromotionRun,
    approver: { readonly actor: string; readonly roles: readonly Role[] }
  ): PromotionRun {
    if (run.committedAt) {
      throw new ServiceError('invalid_request', 'a committed promotion run cannot be approved again');
    }
    const actor = { id: approver.actor, roles: approver.roles };
    const decision = this.workflows.evaluate(PROMOTION_RUN_KEY, {
      recordKey: run.runId,
      from: 'computed',
      to: 'approved',
      actor,
    });
    if (!decision.allowed) {
      if (decision.code === 'forbidden') {
        throw new RepositoryPermissionError('promotion_decision', decision.transition ?? 'approve', {
          id: run.runId,
          cause: new ServiceError(
            'invalid_request',
            `the roles [${approver.roles.join(', ')}] do not own the approval of a promotion run`
          ),
        });
      }
      throw new ServiceError(
        'invalid_request',
        `the promotion run cannot be approved: ${decision.message}`
      );
    }

    const approvedAt = this.timestamp();
    // The engine records the move: who approved, when, and from which state. A run already approved
    // is in `approved` already, so the engine leaves the record alone and writes no second entry.
    this.workflows.apply(PROMOTION_RUN_KEY, {
      recordKey: run.runId,
      from: 'computed',
      to: 'approved',
      actor,
      at: approvedAt,
    });
    return {
      ...run,
      approvedAt,
      approvedBy: approver.actor,
      approvedRoles: [...approver.roles],
    };
  }

  // -------------------------------------------------------------------- plan

  /**
   * Resolves the run into placements and conflicts, without writing anything.
   *
   * A learner the evaluator referred (`council`) or blocked, with no override, is a conflict: the
   * run will not decide for the council. A promotion with no class group of the next year to enter
   * is a conflict too. The page shows both at review time, and the commit refuses while any remains.
   */
  async plan(run: PromotionRun): Promise<PromotionPlan> {
    const targetLevels = await this.levelsByCode();
    const levelsByProgramme = await this.levelsByProgrammeCode();
    const programmeOfClassGroup = await this.programmeByClassGroup(
      run.rows.map((row) => row.classGroupId)
    );
    const groups = await this.nextYearGroups(run.nextAcademicYearId, run.institutionId);
    const placements: PromotionPlacement[] = [];
    const graduates: PromotionRow[] = [];
    const conflicts: PromotionConflict[] = [];

    for (const row of run.rows) {
      const action = row.action;
      if (action === 'council' || action === 'blocked') {
        conflicts.push({
          learnerId: row.learnerId,
          learnerName: row.learnerName,
          code: 'undecided',
          detail:
            action === 'blocked'
              ? 'the transition is blocked: a record it requires is missing'
              : 'the class council has to decide this learner',
        });
        continue;
      }
      if (action === 'graduate') {
        graduates.push(row);
        continue;
      }

      const levelCode = action === 'repeat' ? row.levelCode : row.suggestion.to_level;
      const targetLevelId =
        levelCode === null
          ? null
          : this.levelIdFor(
              targetLevels,
              levelsByProgramme,
              levelCode,
              programmeOfClassGroup.get(row.classGroupId)
            );
      if (targetLevelId === null) {
        conflicts.push({
          learnerId: row.learnerId,
          learnerName: row.learnerName,
          code: 'no_target_level',
          detail: `no level of the school matches "${levelCode ?? row.levelCode}"`,
        });
        continue;
      }

      const target = this.targetClassGroup(row, targetLevelId, groups);
      if (target === null) {
        conflicts.push({
          learnerId: row.learnerId,
          learnerName: row.learnerName,
          code: 'no_target_class_group',
          detail: `no class group of the next year carries the level "${levelCode ?? row.levelCode}" with the stream "${row.classGroupName}"`,
        });
        continue;
      }

      placements.push({
        row,
        action,
        targetLevelId,
        targetClassGroupId: target.id,
        targetClassGroup: target,
      });
    }

    return { placements, graduates, conflicts };
  }

  // ------------------------------------------------------------------ commit

  /**
   * Commits an approved run in one transaction.
   *
   * It closes the current enrolments (`exit_reason`), opens the next-year enrolments in the mapped
   * class groups, carries each learner's outstanding balance forward as an opening-balance invoice,
   * writes the promotion decision of each learner, marks the graduates and archives the class list
   * (the closed enrolments stay queryable, so "who was in Grade 8 Blue in 2027" still answers).
   *
   * Nothing commits without approval, and nothing commits while a learner is still undecided. The
   * whole plan is resolved before the transaction opens and the transaction only writes, so a
   * failure anywhere leaves nothing half-applied. A run that is already committed is returned
   * unchanged, so a commit run twice never double-opens an enrolment or double-carries a balance.
   */
  async commit(run: PromotionRun): Promise<PromotionRun> {
    if (run.committedAt && run.record) return run;
    if (!run.approvedAt) {
      throw new ServiceError('invalid_request', 'the promotion run has not been approved');
    }

    const plan = await this.plan(run);
    if (plan.conflicts.length > 0) {
      const first = plan.conflicts[0];
      throw new ServiceError(
        'invalid_request',
        `${plan.conflicts.length} learner(s) still need a decision, starting with ${first.learnerName}: ${first.detail}`
      );
    }

    const openingYear = await this.repository.get('academic_year', run.nextAcademicYearId);
    const closingYear = await this.repository.get('academic_year', run.academicYearId);
    if (!openingYear || !closingYear) {
      throw new ServiceError(
        'missing_reference',
        'a promotion run names an academic year that does not exist',
        { entity: 'academic_year' }
      );
    }
    const closingDate = closingYear.end_date;
    const openingDate = openingYear.start_date;

    const acted = [...plan.placements.map((placement) => placement.row), ...plan.graduates];
    const enrolments = await this.enrolmentsById(acted.map((row) => row.enrolmentId));
    const learnerIds = run.rows.map((row) => row.learnerId);
    const existing = await this.nextYearEnrolments(learnerIds, run.nextAcademicYearId);
    const decided = await this.decisionsFor(acted.map((row) => row.enrolmentId));
    const carried = await this.carriedInvoices(learnerIds, run.nextAcademicYearId);
    const balances = await this.balances(learnerIds);
    const learners = await this.learnersById(learnerIds);

    const committedAt = this.timestamp();
    const actor = run.committedBy ?? run.approvedBy ?? this.actor ?? '';
    const writeOptions = { actor, reason: `promotion run ${run.runId}`, origin: 'promotion-service' };

    const closedEnrolments: ClosedEnrolment[] = [];
    const openedEnrolmentIds: Id<'enrolment'>[] = [];
    const decisionIds: string[] = [];
    const carriedInvoiceIds: string[] = [];
    const graduatedLearners: GraduatedLearner[] = [];
    let carrySequence = 0;

    await inTransaction(this.repository, async () => {
      for (const placement of plan.placements) {
        const row = placement.row;
        const enrolment = this.require(enrolments.get(row.enrolmentId), row.enrolmentId);
        closedEnrolments.push(this.closedState(enrolment));
        await this.repository.update(
          'enrolment',
          enrolment.id,
          { status: 'left', end_date: closingDate, exit_reason: 'promoted' },
          { expectedVersion: enrolment.rowVersion, ...writeOptions }
        );

        if (!existing.has(row.learnerId)) {
          const opened = await this.repository.create(
            'enrolment',
            this.nextEnrolment(row, placement, openingDate),
            writeOptions
          );
          openedEnrolmentIds.push(opened.id);
        } else {
          // A learner who already holds an enrolment of the next year (a recommit after an undo)
          // is moved into the mapped class group instead of being given a second row: the
          // enrolment's unique key is the learner, the year and the start date.
          const current = existing.get(row.learnerId) as EnrolmentRow;
          const moved = await this.repository.update(
            'enrolment',
            current.id,
            this.nextEnrolmentPatch(placement, openingDate),
            { expectedVersion: current.rowVersion, ...writeOptions }
          );
          openedEnrolmentIds.push(moved.id);
        }

        if (!decided.has(enrolment.id)) {
          const decision = await this.repository.create(
            'promotion_decision',
            {
              institution_id: run.institutionId,
              enrolment_id: enrolment.id,
              decision: placement.action,
              to_level_id: placement.targetLevelId,
              to_class_group_id: placement.targetClassGroupId,
              rule_evaluation: this.decisionEvaluation(run, row, placement.action),
              decided_by: actor,
              decided_at: committedAt,
              committed_at: committedAt,
            },
            writeOptions
          );
          decisionIds.push(decision.id);
        }

        const balance = balances.get(row.learnerId);
        if (balance && balance.amount_minor > 0) {
          const existingCarry = carried.get(row.learnerId);
          if (existingCarry) {
            // A carry of an earlier commit, reversed by an undo, is revived: the invoice number is
            // unique per institution, so the same learner is never billed the carry twice.
            if (existingCarry.status === 'void') {
              await this.repository.update(
                'invoice',
                existingCarry.id,
                { status: 'posted' },
                { expectedVersion: existingCarry.rowVersion, ...writeOptions }
              );
            }
            carriedInvoiceIds.push(existingCarry.id);
          } else {
            carrySequence += 1;
            const invoice = await this.carryInvoice(
              run,
              row,
              balance,
              openingDate,
              carrySequence,
              writeOptions
            );
            carriedInvoiceIds.push(invoice.id);
          }
        }
      }

      for (const row of plan.graduates) {
        const enrolment = this.require(enrolments.get(row.enrolmentId), row.enrolmentId);
        closedEnrolments.push(this.closedState(enrolment));
        await this.repository.update(
          'enrolment',
          enrolment.id,
          { status: 'completed', end_date: closingDate, exit_reason: 'graduated' },
          { expectedVersion: enrolment.rowVersion, ...writeOptions }
        );

        if (!decided.has(enrolment.id)) {
          const decision = await this.repository.create(
            'promotion_decision',
            {
              institution_id: run.institutionId,
              enrolment_id: enrolment.id,
              decision: 'graduate',
              rule_evaluation: this.decisionEvaluation(run, row, 'graduate'),
              decided_by: actor,
              decided_at: committedAt,
              committed_at: committedAt,
            },
            writeOptions
          );
          decisionIds.push(decision.id);
        }

        const learner = learners.get(row.learnerId);
        if (learner && learner.status !== 'graduated') {
          graduatedLearners.push({ id: learner.id, previousStatus: learner.status });
          await this.repository.update(
            'learner',
            learner.id,
            { status: 'graduated' },
            { expectedVersion: learner.rowVersion, ...writeOptions }
          );
        }

        const balance = balances.get(row.learnerId);
        if (balance && balance.amount_minor > 0) {
          const existingCarry = carried.get(row.learnerId);
          if (existingCarry) {
            // A carry of an earlier commit, reversed by an undo, is revived: the invoice number is
            // unique per institution, so the same learner is never billed the carry twice.
            if (existingCarry.status === 'void') {
              await this.repository.update(
                'invoice',
                existingCarry.id,
                { status: 'posted' },
                { expectedVersion: existingCarry.rowVersion, ...writeOptions }
              );
            }
            carriedInvoiceIds.push(existingCarry.id);
          } else {
            carrySequence += 1;
            const invoice = await this.carryInvoice(
              run,
              row,
              balance,
              openingDate,
              carrySequence,
              writeOptions
            );
            carriedInvoiceIds.push(invoice.id);
          }
        }
      }
    });

    const record: PromotionRunRecord = {
      runId: run.runId,
      committedAt,
      committedBy: actor,
      approvedBy: run.approvedBy,
      approvedAt: run.approvedAt,
      counts: this.counts(run, plan, {
        closed: closedEnrolments.length,
        opened: openedEnrolmentIds.length,
        carried: carriedInvoiceIds.length,
      }),
      overrides: run.rows
        .map((row) => row.override)
        .filter((entry): entry is PromotionOverride => entry !== null),
      closedEnrolments,
      openedEnrolmentIds,
      decisionIds,
      carriedInvoiceIds,
      graduatedLearners,
      archivedClassLists: this.archivedClassLists(run, plan),
    };

    // The rows are written; the engine records that the run moved from `approved` to `committed`,
    // with the actor and the instant. The transition is declared in the catalogue and cannot be
    // refused here, so a recorded move cannot leave the committed rows without their audit entry.
    this.workflows.apply(PROMOTION_RUN_KEY, {
      recordKey: run.runId,
      from: 'approved',
      to: 'committed',
      actor: { id: actor, roles: run.approvedRoles },
      at: committedAt,
      reason: `promotion run ${run.runId}`,
    });

    return { ...run, committedAt, committedBy: actor, record };
  }

  // -------------------------------------------------------------------- undo

  /**
   * Undoes a committed run, until the next year has been billed (spec 04 section 6.2 step 6).
   *
   * It voids the carried invoices, reverses the next-year enrolments the run opened, restores the
   * closed enrolments and the graduates, and reverses the decisions. Once the next year's first
   * billing run has posted an invoice, the undo refuses with the reason instead of failing silently,
   * because the money has moved on.
   *
   * The repository removes by soft delete, and an enrolment's unique key is the learner, the year
   * and the start date, so a soft-removed row would block a later recommit. The undo therefore ends
   * the next-year enrolment instead of removing it: it leaves the next year's class list (the active
   * enrolments) empty, and a recommit moves the same row back into the mapped class group.
   */
  async undo(run: PromotionRun): Promise<PromotionRun> {
    if (!run.committedAt || !run.record) {
      throw new ServiceError('invalid_request', 'the promotion run has not been committed');
    }
    const record = run.record;
    const billing = await this.billingRunAfter(run, record);
    if (billing) {
      throw new ServiceError(
        'invalid_request',
        `the promotion run cannot be undone: the next year has been billed (${billing})`
      );
    }

    const openingYear = await this.repository.get('academic_year', run.nextAcademicYearId);
    const openingDate = openingYear?.start_date ?? run.committedAt.slice(0, 10);
    const invoices: Map<string, InvoiceRow> = await this.rowsById('invoice', record.carriedInvoiceIds);
    const opened: Map<string, EnrolmentRow> = await this.rowsById('enrolment', record.openedEnrolmentIds);
    const closed: Map<string, EnrolmentRow> = await this.rowsById(
      'enrolment',
      record.closedEnrolments.map((entry) => entry.id)
    );
    const graduates: Map<string, LearnerRow> = await this.rowsById(
      'learner',
      record.graduatedLearners.map((entry) => entry.id)
    );
    const decisions: Map<string, DecisionRow> = await this.rowsById(
      'promotion_decision',
      record.decisionIds
    );

    const actor = run.committedBy ?? this.actor ?? '';
    const writeOptions = { actor, reason: `undo promotion run ${run.runId}`, origin: 'promotion-service' };

    await inTransaction(this.repository, async () => {
      for (const invoice of invoices.values()) {
        if (invoice.status === 'void') continue;
        await this.repository.update(
          'invoice',
          invoice.id,
          { status: 'void' },
          { expectedVersion: invoice.rowVersion, ...writeOptions }
        );
      }

      for (const enrolment of opened.values()) {
        if (enrolment.status === 'left' || enrolment.status === 'completed') continue;
        await this.repository.update(
          'enrolment',
          enrolment.id,
          { status: 'left', end_date: openingDate, exit_reason: 'withdrawn' },
          { expectedVersion: enrolment.rowVersion, ...writeOptions }
        );
      }

      for (const previous of record.closedEnrolments) {
        const enrolment = closed.get(previous.id);
        if (!enrolment) continue;
        await this.repository.update(
          'enrolment',
          enrolment.id,
          {
            status: previous.previousStatus,
            end_date: previous.previousEndDate,
            exit_reason: previous.previousExitReason,
          },
          { expectedVersion: enrolment.rowVersion, ...writeOptions }
        );
      }

      for (const previous of record.graduatedLearners) {
        const learner = graduates.get(previous.id);
        if (!learner) continue;
        await this.repository.update(
          'learner',
          learner.id,
          { status: previous.previousStatus },
          { expectedVersion: learner.rowVersion, ...writeOptions }
        );
      }

      for (const decision of decisions.values()) {
        await this.repository.remove('promotion_decision', decision.id, {
          expectedVersion: decision.rowVersion,
          ...writeOptions,
        });
      }
    });

    this.workflows.apply(PROMOTION_RUN_KEY, {
      recordKey: run.runId,
      from: 'committed',
      to: 'undone',
      actor: { id: actor, roles: run.approvedRoles },
      at: this.timestamp(),
      reason: `undo promotion run ${run.runId}`,
    });

    return { ...run, committedAt: null, committedBy: null, record: null };
  }

  /** The undo result a page shows after a successful undo. */
  undoResult(run: PromotionRun, record: PromotionRunRecord): PromotionUndoResult {
    return {
      runId: run.runId,
      undoneAt: this.timestamp(),
      restoredEnrolments: record.closedEnrolments.length,
      reversedEnrolments: record.openedEnrolmentIds.length,
      voidedInvoices: record.carriedInvoiceIds.length,
      restoredLearners: record.graduatedLearners.length,
    };
  }

  // ------------------------------------------------------------------ reads

  /** The active enrolments of the closing year, scoped to a class group when the caller asks. */
  private async closingEnrolments(input: PromotionComputeInput): Promise<EnrolmentRow[]> {
    return this.all<'enrolment'>('enrolment', {
      where: {
        academic_year_id: input.academicYearId,
        ...(input.classGroupId ? { class_group_id: input.classGroupId } : {}),
      },
      conditions: { status: { in: [...ACTIVE_ENROLMENT_STATUSES] } },
    });
  }

  /** The levels of the institution, by code. */
  private async levelsByCode(): Promise<Map<string, LevelRow>> {
    const levels = await this.all<'level'>('level', {});
    return new Map(levels.map((level) => [level.code, level] as const));
  }

  /**
   * The levels of the institution, by the programme they belong to and their code.
   *
   * A level belongs to a programme through its stage. Two programmes may declare the same level
   * code — a transitional school runs 8-4-4 beside CBE — so a code alone does not identify a level,
   * and a run must read the code inside the learner's own programme.
   */
  private async levelsByProgrammeCode(): Promise<Map<string, LevelRow>> {
    const levels = await this.all<'level'>('level', {});
    const stages = await this.all<'stage'>('stage', {});
    const programmeOfStage = new Map(stages.map((stage) => [stage.id, stage.programme_id] as const));
    const map = new Map<string, LevelRow>();
    for (const level of levels) {
      const programmeId = programmeOfStage.get(level.stage_id);
      if (programmeId === undefined) continue;
      map.set(`${programmeId}|${level.code}`, level);
    }
    return map;
  }

  /** The programme each class group belongs to, so a level code is read inside its own programme. */
  private async programmeByClassGroup(
    classGroupIds: readonly Id<'class_group'>[]
  ): Promise<Map<string, string>> {
    const groups = await this.rowsById('class_group', classGroupIds);
    return new Map([...groups.values()].map((group) => [group.id, group.programme_id] as const));
  }

  /** The level a code names, inside the learner's programme when the school runs more than one. */
  private levelIdFor(
    byCode: Map<string, LevelRow>,
    byProgrammeCode: Map<string, LevelRow>,
    levelCode: string,
    programmeId: string | undefined
  ): Id<'level'> | null {
    if (programmeId !== undefined) {
      const own = byProgrammeCode.get(`${programmeId}|${levelCode}`);
      if (own) return own.id;
    }
    return byCode.get(levelCode)?.id ?? null;
  }

  /** The class groups of the next year, keyed by level and stream name. */
  private async nextYearGroups(
    nextAcademicYearId: Id<'academic_year'>,
    institutionId: Id<'institution'>
  ): Promise<Map<string, ClassGroupRow>> {
    const groups = await this.all<'class_group'>('class_group', {
      where: { institution_id: institutionId, academic_year_id: nextAcademicYearId },
    });
    return new Map(groups.map((group) => [`${group.level_id}|${group.name}`, group] as const));
  }

  /** The enrolment rows of a run, by id. */
  private async enrolmentsById(ids: readonly Id<'enrolment'>[]): Promise<Map<string, EnrolmentRow>> {
    return this.rowsById('enrolment', ids);
  }

  /** Rows of one entity, by id, reading only what exists. */
  private async rowsById<E extends EntityName>(
    entity: E,
    ids: readonly string[]
  ): Promise<Map<string, RepositoryRow<E>>> {
    const rows = new Map<string, RepositoryRow<E>>();
    for (const id of ids) {
      if (rows.has(id)) continue;
      const row = await this.repository.get(entity, asId<E>(id));
      if (row) rows.set(id, row);
    }
    return rows;
  }

  /** The next-year enrolments a learner already holds, by learner, so a commit never double-opens. */
  private async nextYearEnrolments(
    learnerIds: readonly Id<'learner'>[],
    nextAcademicYearId: Id<'academic_year'>
  ): Promise<Map<string, EnrolmentRow>> {
    const existing = new Map<string, EnrolmentRow>();
    for (const learnerId of learnerIds) {
      const rows = await this.all<'enrolment'>('enrolment', {
        where: { learner_id: learnerId, academic_year_id: nextAcademicYearId },
      });
      if (rows.length > 0) existing.set(learnerId, rows[0]);
    }
    return existing;
  }

  /** The enrolment ids that already carry a decision, so a commit never writes it twice. */
  private async decisionsFor(enrolmentIds: readonly Id<'enrolment'>[]): Promise<Set<string>> {
    const decided = new Set<string>();
    for (const enrolmentId of enrolmentIds) {
      const rows = await this.all<'promotion_decision'>('promotion_decision', {
        where: { enrolment_id: enrolmentId },
      });
      if (rows.length > 0) decided.add(enrolmentId);
    }
    return decided;
  }

  /** The learners that already hold a carried balance of the next year, with the invoice that holds it. */
  private async carriedInvoices(
    learnerIds: readonly Id<'learner'>[],
    nextAcademicYearId: Id<'academic_year'>
  ): Promise<Map<string, InvoiceRow>> {
    const year = await this.repository.get('academic_year', nextAcademicYearId);
    const start = year?.start_date ?? '';
    const carried = new Map<string, InvoiceRow>();
    for (const learnerId of learnerIds) {
      const invoices = await this.all<'invoice'>('invoice', { where: { learner_id: learnerId } });
      const found = invoices.find(
        (invoice) => invoice.number.startsWith(CARRY_PREFIX) && invoice.issue_date >= start
      );
      if (found) carried.set(learnerId, found);
    }
    return carried;
  }

  /** The outstanding balance of each learner, in minor units, with the currency it is kept in. */
  private async balances(learnerIds: readonly Id<'learner'>[]): Promise<Map<string, Money>> {
    const balances = new Map<string, Money>();
    for (const learnerId of learnerIds) {
      const invoices = await this.all<'invoice'>('invoice', { where: { learner_id: learnerId } });
      const billed = invoices.filter((invoice) => BILLED_INVOICE_STATUSES.includes(invoice.status));
      if (billed.length === 0) continue;
      const payments = await this.all<'payment'>('payment', {
        where: { learner_id: learnerId },
      });
      const credits = await this.all<'credit_note'>('credit_note', {
        where: { learner_id: learnerId },
      });
      const billedMinor = billed.reduce((sum, invoice) => sum + invoice.total.amount_minor, 0);
      const paidMinor = payments
        .filter((payment) => RECEIVED_PAYMENT_STATUSES.includes(payment.status))
        .reduce((sum, payment) => sum + payment.amount.amount_minor, 0);
      const creditMinor = credits
        .filter((credit) => credit.status === 'posted')
        .reduce((sum, credit) => sum + credit.amount.amount_minor, 0);
      const outstanding = billedMinor - paidMinor - creditMinor;
      if (outstanding > 0) {
        balances.set(learnerId, { amount_minor: outstanding, currency: billed[0].total.currency });
      }
    }
    return balances;
  }

  /** The learner rows of a run, by id. */
  private async learnersById(learnerIds: readonly Id<'learner'>[]): Promise<Map<string, LearnerRow>> {
    return this.rowsById('learner', learnerIds);
  }

  /**
   * The billing run that has posted since the commit, or null.
   *
   * A billing run bills an academic period of the next year; the carried opening-balance invoices
   * name no period, so they are never mistaken for one.
   */
  private async billingRunAfter(
    run: PromotionRun,
    record: PromotionRunRecord
  ): Promise<string | null> {
    const periods = await this.all<'academic_period'>('academic_period', {
      where: { academic_year_id: run.nextAcademicYearId },
    });
    const carried = new Set(record.carriedInvoiceIds);
    for (const period of periods) {
      const invoices = await this.all<'invoice'>('invoice', {
        where: { academic_period_id: period.id },
      });
      const posted = invoices.find(
        (invoice) => BILLED_INVOICE_STATUSES.includes(invoice.status) && !carried.has(invoice.id)
      );
      if (posted) return `${posted.number} was posted for ${period.name}`;
    }
    return null;
  }

  /** A learner's suggestion row, from the evaluator and the learner's class group. */
  private async rowFor(
    enrolment: EnrolmentRow,
    levels: Map<string, LevelRow>,
    input: PromotionComputeInput
  ): Promise<PromotionRow> {
    const [learner, group] = await Promise.all([
      this.repository.get('learner', asId<'learner'>(enrolment.learner_id)),
      this.repository.get('class_group', asId<'class_group'>(enrolment.class_group_id)),
    ]);
    if (!learner || !group) {
      throw new ServiceError(
        'missing_reference',
        `the enrolment ${enrolment.id} names a row that does not exist`,
        { entity: 'enrolment', id: enrolment.id }
      );
    }
    const level =
      levels.get(group.level_id) ?? (await this.repository.get('level', asId<'level'>(enrolment.level_id)));
    if (!level) {
      throw new ServiceError('missing_reference', `the level ${enrolment.level_id} does not exist`, {
        entity: 'level',
        id: enrolment.level_id,
      });
    }

    const extra = input.contextFor?.({
      learnerId: learner.id,
      enrolmentId: enrolment.id,
      levelCode: level.code,
    });
    const context: ProgressionContext = {
      ...(extra?.context ?? {}),
      levels: input.rules.levels,
      stages: input.rules.stages,
    };
    const evaluation = evaluatePromotion(
      input.rules.definition,
      {
        learner: learner.id,
        level: level.code,
        ...(extra?.complete === undefined ? {} : { complete: extra.complete }),
        ...(extra?.requirements === undefined ? {} : { requirements: extra.requirements }),
      },
      context
    );
    if (!evaluation.ok) {
      throw new ServiceError(
        'invalid_request',
        `the progression rules were refused: ${evaluation.issues
          .map((issue) => `${issue.code} at ${issue.path}`)
          .join(', ')}`
      );
    }
    const suggestion = evaluation.suggestions[0];
    const toLevelId =
      suggestion.action === 'graduate' || suggestion.to_level === null
        ? null
        : levels.get(suggestion.to_level)?.id ?? null;

    return {
      learnerId: learner.id,
      enrolmentId: enrolment.id,
      learnerName: `${learner.preferred_name ?? learner.given_name} ${learner.family_name}`.trim(),
      admissionNumber: learner.admission_number,
      classGroupId: group.id,
      classGroupName: group.name,
      levelId: level.id,
      levelCode: level.code,
      suggestion,
      action: suggestion.action,
      toLevelId,
      toStage: suggestion.to_stage,
      override: null,
    };
  }

  // ------------------------------------------------------------------ writes

  /** The next-year enrolment of a placement, built from the target class group. */
  private nextEnrolment(
    row: PromotionRow,
    placement: PromotionPlacement,
    openingDate: string
  ): CreateInput<'enrolment'> {
    return {
      institution_id: placement.targetClassGroup.institution_id,
      learner_id: row.learnerId,
      ...this.nextEnrolmentPatch(placement, openingDate),
    };
  }

  /** The placement's fields, as a patch an existing next-year enrolment can take. */
  private nextEnrolmentPatch(
    placement: PromotionPlacement,
    openingDate: string
  ): Omit<CreateInput<'enrolment'>, 'institution_id' | 'learner_id'> {
    const status: EnrolmentStatus = placement.action === 'repeat' ? 'repeating' : 'active';
    const entry: EntryReason = placement.action === 'repeat' ? 'repeated' : 'promoted';
    return {
      academic_year_id: placement.targetClassGroup.academic_year_id,
      programme_id: placement.targetClassGroup.programme_id,
      level_id: placement.targetLevelId,
      class_group_id: placement.targetClassGroupId,
      status,
      start_date: openingDate,
      entry_reason: entry,
      end_date: null,
      exit_reason: null,
    };
  }

  /** The carried-forward balance invoice of a learner, posted in the next year. */
  private async carryInvoice(
    run: PromotionRun,
    row: PromotionRow,
    balance: Money,
    openingDate: string,
    sequence: number,
    options: { readonly actor: string; readonly reason: string; readonly origin: string }
  ): Promise<RepositoryRow<'invoice'>> {
    const number = `${CARRY_PREFIX}${run.runId.slice(-6)}/${String(sequence).padStart(2, '0')}`;
    const invoice = await this.repository.create(
      'invoice',
      {
        institution_id: run.institutionId,
        number,
        learner_id: row.learnerId,
        issue_date: openingDate,
        total: balance,
        status: 'posted',
      },
      options
    );
    await this.repository.create(
      'invoice_line',
      {
        institution_id: run.institutionId,
        invoice_id: invoice.id,
        description: `Balance carried forward from ${run.academicYearId}`,
        amount: balance,
        kind: 'opening_balance',
      },
      options
    );
    return invoice;
  }

  /** The compact evaluation a decision row carries, so the record shows why it was made. */
  private decisionEvaluation(
    run: PromotionRun,
    row: PromotionRow,
    action: PromotionDecisionAction
  ): Record<string, JsonValue> {
    return {
      run_id: run.runId,
      rule: row.suggestion.rule?.rule ?? null,
      suggested: row.suggestion.action,
      decided: action,
      complete: row.suggestion.complete,
      council_suggested: row.suggestion.council?.suggested ?? null,
      flags: row.suggestion.flags.map((flag) => flag.code),
      reasons: row.suggestion.reasons.map((reason) => reason.code),
      override:
        row.override === null
          ? null
          : {
              from: row.override.from,
              action: row.override.action,
              reason: row.override.reason,
              actor: row.override.actor,
              at: row.override.at,
            },
    };
  }

  // ----------------------------------------------------------------- helpers

  /** The target level id of an override, resolved from what the suggestion said. */
  private overrideTargetLevel(
    row: PromotionRow,
    action: PromotionDecisionAction
  ): Id<'level'> | null {
    if (action === 'graduate') return null;
    if (action === 'repeat') return row.levelId;
    return row.toLevelId;
  }

  /** The class group of the next year a placement enters. */
  private targetClassGroup(
    row: PromotionRow,
    targetLevelId: Id<'level'>,
    groups: Map<string, ClassGroupRow>
  ): ClassGroupRow | null {
    const named = row.override?.toClassGroupId;
    if (named) {
      for (const group of groups.values()) {
        if (group.id === named) return group;
      }
    }
    return groups.get(`${targetLevelId}|${row.classGroupName}`) ?? null;
  }

  /** The previous state of an enrolment the run is about to close. */
  private closedState(enrolment: EnrolmentRow): ClosedEnrolment {
    return {
      id: enrolment.id,
      previousStatus: enrolment.status,
      previousEndDate: enrolment.end_date ?? null,
      previousExitReason: enrolment.exit_reason ?? null,
    };
  }

  /** A row a pre-read resolved, or a loud failure. */
  private require<E extends EntityName>(
    row: RepositoryRow<E> | undefined,
    id: string
  ): RepositoryRow<E> {
    if (!row) {
      throw new ServiceError('missing_reference', `the row ${id} does not exist`, { id });
    }
    return row;
  }

  /** The counts of a run: what it decided, and what it will write. */
  private counts(
    run: PromotionRun,
    plan: PromotionPlan,
    written: { readonly closed: number; readonly opened: number; readonly carried: number }
  ): PromotionCounts {
    return {
      total: run.rows.length,
      promoted: plan.placements.filter((placement) => placement.action === 'promote').length,
      repeated: plan.placements.filter((placement) => placement.action === 'repeat').length,
      graduated: plan.graduates.length,
      pending: plan.conflicts.filter((conflict) => conflict.code === 'undecided').length,
      overridden: run.rows.filter((row) => row.override !== null).length,
      closed: written.closed,
      opened: written.opened,
      carried: written.carried,
    };
  }

  /** The class lists the run archived, per class group of the closing year. */
  private archivedClassLists(run: PromotionRun, plan: PromotionPlan): ArchivedClassList[] {
    const acted = new Set<string>([
      ...plan.placements.map((placement) => placement.row.learnerId),
      ...plan.graduates.map((row) => row.learnerId),
    ]);
    const byGroup = new Map<string, ArchivedClassList>();
    for (const row of run.rows) {
      if (!acted.has(row.learnerId)) continue;
      const current = byGroup.get(row.classGroupId);
      byGroup.set(row.classGroupId, {
        classGroupId: row.classGroupId,
        classGroupName: row.classGroupName,
        learners: (current?.learners ?? 0) + 1,
      });
    }
    return [...byGroup.values()];
  }

  /** A page of rows, walking the repository's 500-row pages. */
  private async all<E extends EntityName>(entity: E, query: ListQuery): Promise<RepositoryRow<E>[]> {
    const rows: RepositoryRow<E>[] = [];
    let offset = 0;
    for (;;) {
      const page = await this.repository.list(entity, { ...query, limit: PAGE_SIZE, offset });
      rows.push(...page.items);
      if (!page.hasMore || page.items.length === 0) break;
      offset += page.items.length;
    }
    return rows;
  }

  /** The timestamp the service records. */
  private timestamp(): string {
    return this.now().toISOString();
  }
}

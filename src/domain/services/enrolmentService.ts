// ABOUTME: The enrolment service: enrol a learner into a class group of an academic year, end an
// ABOUTME: enrolment with a reason, move a learner between class groups, and answer which class a
// ABOUTME: learner is in. Every read and write goes through the repository of P1-B02.

import type {
  CreateInput,
  Repository,
  RepositoryRow,
  UpdateInput,
  WriteOptions,
} from '@/data/repository';
import { asId, type Id } from '@/domain/ids';

import {
  inTransaction,
  type EnrolmentStatus,
  type EntryReason,
  type ExitReason,
  type LearnerStatus,
  type ServiceDependencies,
} from './common';
import { ServiceError } from './errors';

/** The far end of an open date range. */
const OPEN_END = '9999-12-31';

/** The statuses that count as an active enrolment (spec 02 §7). */
const ACTIVE_STATUSES: readonly EnrolmentStatus[] = ['active', 'repeating'];

export interface EnrolmentServiceOptions extends ServiceDependencies {
  /** The repository the service reads and writes through. */
  readonly repository: Repository;
}

/** What an enrolment needs. */
export interface EnrolmentInput {
  /** The learner the enrolment belongs to. */
  readonly learnerId: Id<'learner'>;
  /**
   * The class group the learner is placed in. The class group is year-scoped (spec 02 §5),
   * so it carries the academic year, the level and the programme of the enrolment.
   */
  readonly classGroupId: Id<'class_group'>;
  /** The day the enrolment starts. */
  readonly startDate: string;
  /** Why the learner joined; `new_admission` when the caller does not say. */
  readonly entryReason?: EntryReason;
  /** The status of the new enrolment; `active` when the caller does not say. */
  readonly status?: EnrolmentStatus;
  /** The day the enrolment ends, when it is known already. */
  readonly endDate?: string | null;
  readonly pathwayId?: Id<'pathway'>;
  /** The academic year; it has to be the year of the class group. */
  readonly academicYearId?: Id<'academic_year'>;
  /** The level; it has to be the level of the class group. */
  readonly levelId?: Id<'level'>;
  /** The programme; it has to be the programme of the class group. */
  readonly programmeId?: Id<'programme'>;
  readonly feeCategoryIds?: readonly string[];
  readonly sponsorshipId?: Id<'sponsorship'>;
}

/**
 * What an enrolment needs, apart from the learner it belongs to.
 *
 * The learner is named apart because a row that is about to be created has no id yet: the
 * admission resolves the placement of the enrolment before the learner exists, and fills the
 * learner in when the learner row is written.
 */
export type EnrolmentPlacement = Omit<EnrolmentInput, 'learnerId'>;

/**
 * An enrolment that is ready to be stored, apart from the learner it belongs to.
 *
 * The class group is year-scoped and carries the academic year, the level and the
 * programme, so the placement of an enrolment is resolved once, against its class group.
 */
export interface PreparedEnrolment {
  readonly institution_id: string;
  readonly academic_year_id: Id<'academic_year'>;
  readonly programme_id: Id<'programme'>;
  readonly level_id: Id<'level'>;
  readonly class_group_id: Id<'class_group'>;
  readonly status: EnrolmentStatus;
  readonly start_date: string;
  readonly entry_reason: EntryReason;
  readonly pathway_id?: Id<'pathway'>;
  readonly end_date?: string | null;
  readonly fee_category_ids?: string[];
  readonly sponsorship_id?: Id<'sponsorship'>;
}

/** How an enrolment ends. */
export interface EndEnrolmentInput {
  /** The day the enrolment ends. */
  readonly endDate: string;
  /** Why the learner left; the exit reason of spec 02 §7. */
  readonly exitReason: ExitReason;
  /** The status the enrolment moves to; `left` unless the caller says otherwise. */
  readonly status?: 'left' | 'completed';
  /** The status the learner moves to, when the exit changes the learner's lifecycle. */
  readonly learnerStatus?: LearnerStatus;
}

/** A move to another class group of the same year. */
export interface TransferInput {
  /** The class group the learner moves to. */
  readonly toClassGroupId: Id<'class_group'>;
  /** The day the move takes effect. */
  readonly effectiveDate: string;
  /** Why the learner moves. */
  readonly reason: string;
  /** The user who approved the move. */
  readonly approvedBy?: Id<'user'>;
}

/** The result of ending an enrolment. */
export interface EndEnrolmentResult {
  readonly enrolment: RepositoryRow<'enrolment'>;
  /** The learner, when the exit changed the learner's status. */
  readonly learner?: RepositoryRow<'learner'>;
}

/** The result of a move between class groups. */
export interface TransferResult {
  readonly enrolment: RepositoryRow<'enrolment'>;
  /** The history row of the move (spec 02 §7). */
  readonly change: RepositoryRow<'enrolment_change'>;
}

/**
 * The enrolment service.
 *
 * The class group is the anchor of an enrolment: it is year-scoped and carries the level and
 * the programme, so the service reads the year, the level and the programme from it. That is
 * how spec 02 §12.2 holds - the enrolment and its class group always agree - and the
 * repository's own guard checks the same thing on the write.
 */
export class EnrolmentService {
  private readonly repository: Repository;
  private readonly actor: string | undefined;
  private readonly now: () => Date;

  constructor(options: EnrolmentServiceOptions) {
    this.repository = options.repository;
    this.actor = options.actor;
    this.now = options.now ?? (() => new Date());
  }

  /**
   * The placement of an enrolment, resolved against its class group.
   *
   * The class group is read here, so a caller that has to write the enrolment inside a
   * transaction of its own can resolve the placement before the transaction opens: the
   * repository cannot read while a transaction is open.
   */
  async prepareEnrolment(input: EnrolmentPlacement): Promise<PreparedEnrolment> {
    const group = await this.repository.get('class_group', input.classGroupId);
    if (!group) {
      throw new ServiceError('missing_reference', `the class group ${input.classGroupId} does not exist`, {
        entity: 'class_group',
        id: input.classGroupId,
      });
    }

    const academicYearId = asId<'academic_year'>(group.academic_year_id);
    const levelId = asId<'level'>(group.level_id);
    const programmeId = asId<'programme'>(group.programme_id);

    this.assertAgrees('academic_year_id', input.academicYearId, academicYearId);
    this.assertAgrees('level_id', input.levelId, levelId);
    this.assertAgrees('programme_id', input.programmeId, programmeId);

    return {
      institution_id: group.institution_id,
      academic_year_id: academicYearId,
      programme_id: programmeId,
      level_id: levelId,
      class_group_id: input.classGroupId,
      status: input.status ?? 'active',
      start_date: input.startDate,
      entry_reason: input.entryReason ?? 'new_admission',
      ...(input.pathwayId ? { pathway_id: input.pathwayId } : {}),
      ...(input.endDate !== undefined ? { end_date: input.endDate } : {}),
      ...(input.feeCategoryIds ? { fee_category_ids: [...input.feeCategoryIds] } : {}),
      ...(input.sponsorshipId ? { sponsorship_id: input.sponsorshipId } : {}),
    };
  }

  /** The row of the enrolment of a learner, from a prepared placement. */
  enrolmentRow(
    prepared: PreparedEnrolment,
    learnerId: Id<'learner'>
  ): CreateInput<'enrolment'> {
    return {
      ...prepared,
      learner_id: learnerId,
    };
  }

  /** Stores a prepared enrolment. */
  async enrolPrepared(row: CreateInput<'enrolment'>): Promise<RepositoryRow<'enrolment'>> {
    return this.repository.create('enrolment', row, this.writeOptions('enrolment opened'));
  }

  /**
   * Enrols a learner into a class group.
   *
   * The repository enforces the invariants of spec 02 §12 on the write: a learner has at most
   * one active enrolment per year on any date (§12.1), and the class group of an enrolment
   * carries the same level and year (§12.2). A violation surfaces as the repository's own
   * `RepositoryInvariantError`.
   */
  async enrol(input: EnrolmentInput): Promise<RepositoryRow<'enrolment'>> {
    const prepared = await this.prepareEnrolment(input);
    return this.enrolPrepared(this.enrolmentRow(prepared, input.learnerId));
  }

  /**
   * Ends an enrolment, with the reason the learner left.
   *
   * The exit reason is required by the canonical schema whenever the status is `left` or
   * `completed`; the service asks for it up front, so the caller hears about a missing reason
   * before the write and not as a schema error after it. The enrolment and the learner move
   * in one transaction, so a learner never carries a status that does not match its
   * enrolment.
   */
  async end(
    enrolmentId: Id<'enrolment'>,
    input: EndEnrolmentInput
  ): Promise<EndEnrolmentResult> {
    const enrolment = await this.repository.get('enrolment', enrolmentId);
    if (!enrolment) {
      throw new ServiceError('missing_reference', `the enrolment ${enrolmentId} does not exist`, {
        entity: 'enrolment',
        id: enrolmentId,
      });
    }

    const learnerId = asId<'learner'>(enrolment.learner_id);
    const learnerStatus = input.learnerStatus;
    const learner = learnerStatus ? await this.repository.get('learner', learnerId) : undefined;
    if (learnerStatus && !learner) {
      throw new ServiceError('missing_reference', `the learner ${learnerId} does not exist`, {
        entity: 'learner',
        id: learnerId,
      });
    }

    const patch: UpdateInput<'enrolment'> = {
      status: input.status ?? 'left',
      end_date: input.endDate,
      exit_reason: input.exitReason,
    };

    return inTransaction(this.repository, async () => {
      const updated = await this.repository.update('enrolment', enrolmentId, patch, {
        expectedVersion: enrolment.rowVersion,
        ...this.writeOptions(`enrolment ended: ${input.exitReason}`),
      });

      if (!learner || !learnerStatus) return { enrolment: updated };

      const movedLearner = await this.repository.update(
        'learner',
        learnerId,
        { status: learnerStatus },
        {
          expectedVersion: learner.rowVersion,
          ...this.writeOptions(`learner status changed to ${learnerStatus}`),
        }
      );

      return { enrolment: updated, learner: movedLearner };
    });
  }

  /**
   * Moves a learner to another class group.
   *
   * The move is a change of the enrolment's class group plus a history row of kind
   * `class_change` (spec 04 §3). The learner keeps one active enrolment, so the move never
   * breaks the invariant of §12.1; the repository refuses a move into a class group of another
   * level or year, because that is a promotion and not a class change.
   */
  async transfer(
    enrolmentId: Id<'enrolment'>,
    input: TransferInput
  ): Promise<TransferResult> {
    const enrolment = await this.repository.get('enrolment', enrolmentId);
    if (!enrolment) {
      throw new ServiceError('missing_reference', `the enrolment ${enrolmentId} does not exist`, {
        entity: 'enrolment',
        id: enrolmentId,
      });
    }

    const target = await this.repository.get('class_group', input.toClassGroupId);
    if (!target) {
      throw new ServiceError(
        'missing_reference',
        `the class group ${input.toClassGroupId} does not exist`,
        { entity: 'class_group', id: input.toClassGroupId }
      );
    }

    if (enrolment.class_group_id === input.toClassGroupId) {
      throw new ServiceError(
        'invalid_request',
        `the learner is already in the class group ${input.toClassGroupId}`,
        { entity: 'class_group', id: input.toClassGroupId }
      );
    }

    return inTransaction(this.repository, async () => {
      const updated = await this.repository.update(
        'enrolment',
        enrolmentId,
        { class_group_id: input.toClassGroupId },
        {
          expectedVersion: enrolment.rowVersion,
          ...this.writeOptions(`class change: ${input.reason}`),
        }
      );

      const change = await this.repository.create(
        'enrolment_change',
        {
          institution_id: enrolment.institution_id,
          enrolment_id: enrolmentId,
          kind: 'class_change',
          from: { class_group_id: enrolment.class_group_id },
          to: { class_group_id: input.toClassGroupId },
          effective_date: input.effectiveDate,
          reason: input.reason,
          ...(input.approvedBy ? { approved_by: input.approvedBy } : {}),
        },
        this.writeOptions(`class change: ${input.reason}`)
      );

      return { enrolment: updated, change };
    });
  }

  /**
   * The class the learner is in on a date: the enrolment that runs on that date.
   *
   * "Current class" is not a field of the learner (spec 02 §6.2): it is the enrolment that
   * runs on the day, so a learner who was moved or who left is answered correctly. A live
   * enrolment wins over an ended one that still covers the day.
   */
  async currentClass(
    learnerId: Id<'learner'>,
    at?: string
  ): Promise<RepositoryRow<'enrolment'> | null> {
    const date = at ?? this.today();
    const page = await this.repository.list('enrolment', {
      where: { learner_id: learnerId },
      orderBy: [{ field: 'start_date', direction: 'desc' }],
      limit: 50,
    });

    const covering = page.items.filter(
      (row) => row.start_date <= date && (row.end_date ?? OPEN_END) >= date
    );
    const live = covering.filter((row) => ACTIVE_STATUSES.includes(row.status));
    const chosen = (live.length > 0 ? live : covering)[0];
    return chosen ?? null;
  }

  /** The enrolments of a learner, newest first. */
  async listEnrolments(
    learnerId: Id<'learner'>,
    options: { readonly academicYearId?: Id<'academic_year'>; readonly status?: EnrolmentStatus } = {}
  ): Promise<RepositoryRow<'enrolment'>[]> {
    const page = await this.repository.list('enrolment', {
      where: {
        learner_id: learnerId,
        ...(options.academicYearId ? { academic_year_id: options.academicYearId } : {}),
        ...(options.status ? { status: options.status } : {}),
      },
      orderBy: [{ field: 'start_date', direction: 'desc' }],
      limit: 100,
    });
    return [...page.items];
  }

  /** The day the service reads as today. */
  private today(): string {
    return this.now().toISOString().slice(0, 10);
  }

  /** A named value has to agree with the one the class group carries. */
  private assertAgrees(
    field: 'academic_year_id' | 'level_id' | 'programme_id',
    named: string | undefined,
    derived: string
  ): void {
    if (named === undefined || named === derived) return;
    throw new ServiceError(
      'invalid_request',
      `the class group carries a different ${field} (${derived}) than the one named (${named})`,
      { entity: 'enrolment' }
    );
  }

  /** The write options of this service: the actor, the reason and the change origin. */
  private writeOptions(reason: string): WriteOptions {
    return {
      ...(this.actor ? { actor: this.actor } : {}),
      reason,
      origin: 'enrolment-service',
    };
  }
}

// ABOUTME: The attendance service: open a register for a class group, a teaching group or a
// ABOUTME: residence, mark the learners of it, record a leave-out, a conduct incident and a health
// ABOUTME: visit. Every read and write goes through the repository of P1-B02.

import type { CreateInput, Repository, RepositoryRow, UpdateInput, WriteOptions } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';

import {
  ATTENDANCE_ABSENCE_STATUSES,
  type AttendanceReason,
  type AttendanceSessionKind,
  type AttendanceStatus,
  type ConductIncidentCategory,
  type LeaveOutKind,
  type ServiceDependencies,
} from './common';
import { ServiceError } from './errors';

export interface AttendanceServiceOptions extends ServiceDependencies {
  /** The repository the service reads and writes through. */
  readonly repository: Repository;
}

/** The scope a register covers: one class group, one teaching group or one residence. */
export type AttendanceScope =
  | { readonly kind: 'class_group'; readonly id: Id<'class_group'> }
  | { readonly kind: 'teaching_group'; readonly id: Id<'teaching_group'> }
  | { readonly kind: 'residence'; readonly id: Id<'residence'> };

/** The register to open. */
export interface OpenRegisterInput {
  /** The class group, teaching group or residence the register covers. */
  readonly scope: AttendanceScope;
  /** The day the register covers. */
  readonly date: string;
  /** The session of the day: the morning, the afternoon, a lesson or a roll-call. */
  readonly session: AttendanceSessionKind;
  /** The member of staff who took the register. */
  readonly takenBy: Id<'staff'>;
  /** When the register was taken; now when the caller does not say. */
  readonly takenAt?: string;
  /** The lesson a `period_n` register covers. */
  readonly periodNumber?: number;
  /**
   * The academic period the register belongs to. When the caller does not name one, the
   * service finds the period that covers the date.
   */
  readonly academicPeriodId?: Id<'academic_period'>;
  /** Whether the register starts locked. */
  readonly locked?: boolean;
}

/** One learner of a register. */
export interface RecordMarkInput {
  readonly sessionId: Id<'attendance_session'>;
  readonly learnerId: Id<'learner'>;
  readonly status: AttendanceStatus;
  /** The minutes a late learner came in; required for a late mark. */
  readonly minutesLate?: number;
  /** The reason the learner did not attend; required for every status but `present` and `late`. */
  readonly reason?: AttendanceReason;
  /** When the guardian was told. */
  readonly notifiedGuardianAt?: string | null;
}

/** A leave-out (exeat). */
export interface RecordLeaveOutInput {
  readonly learnerId: Id<'learner'>;
  readonly kind: LeaveOutKind;
  readonly outAt: string;
  readonly dueBackAt: string;
  readonly returnedAt?: string | null;
  readonly authorisedBy: Id<'staff'>;
  readonly collectedByGuardianId?: Id<'guardian'>;
}

/** A conduct incident. */
export interface RecordConductIncidentInput {
  readonly learnerId: Id<'learner'>;
  readonly date: string;
  readonly category: ConductIncidentCategory;
  readonly description: string;
  readonly action?: string;
  readonly points?: number;
  readonly guardianInformedAt?: string | null;
  /** Whether only the staff in charge may read the incident. */
  readonly confidential?: boolean;
}

/** A visit to the clinic. */
export interface RecordHealthVisitInput {
  readonly learnerId: Id<'learner'>;
  readonly date: string;
  readonly complaint: string;
  readonly treatment?: string;
  /** Whether the learner was referred on. */
  readonly referred?: boolean;
  readonly recordedBy: Id<'staff'>;
}

/**
 * The attendance service.
 *
 * A register is opened for a scope and a day: the service finds the register of that scope
 * and day, or opens it. The register belongs to an academic period, and its day has to lie
 * inside that period - the rule the canonical registry deferred to this task.
 */
export class AttendanceService {
  private readonly repository: Repository;
  private readonly actor: string | undefined;
  private readonly now: () => Date;

  constructor(options: AttendanceServiceOptions) {
    this.repository = options.repository;
    this.actor = options.actor;
    this.now = options.now ?? (() => new Date());
  }

  /**
   * Opens the register of a scope and a day, or returns the one that is already open.
   *
   * A register that names a lesson has to name one (`period_n` without `period_number` is
   * refused), and the day of the register has to lie inside the academic period it belongs
   * to. A register for a day no academic period covers is still written: the period is
   * optional, so a school with an open calendar is not blocked from taking a register.
   */
  async openRegister(input: OpenRegisterInput): Promise<RepositoryRow<'attendance_session'>> {
    if (input.session === 'period_n' && input.periodNumber === undefined) {
      throw new ServiceError(
        'invalid_request',
        'a period_n register has to name the lesson it covers',
        { entity: 'attendance_session' }
      );
    }

    const scope = await this.resolveScope(input.scope);
    const academicPeriodId = await this.resolvePeriod(input, scope);

    const existing = await this.findRegister(input, scope.institutionId);
    if (existing) return existing;

    const base = {
      institution_id: scope.institutionId,
      date: input.date,
      session: input.session,
      taken_by: input.takenBy,
      taken_at: input.takenAt ?? this.now().toISOString(),
      locked: input.locked ?? false,
      ...(academicPeriodId ? { academic_period_id: academicPeriodId } : {}),
      ...(input.periodNumber !== undefined ? { period_number: input.periodNumber } : {}),
    };

    const row: CreateInput<'attendance_session'> =
      input.scope.kind === 'class_group'
        ? { ...base, class_group_id: input.scope.id }
        : input.scope.kind === 'teaching_group'
          ? { ...base, teaching_group_id: input.scope.id }
          : { ...base, residence_id: input.scope.id };

    return this.repository.create(
      'attendance_session',
      row,
      this.writeOptions('register opened')
    );
  }

  /**
   * Marks one learner of a register.
   *
   * A register holds one mark per learner (the canonical schema), so a second mark for the
   * same learner is refused; and a learner who did not attend has to say why.
   */
  async recordMark(input: RecordMarkInput): Promise<RepositoryRow<'attendance_mark'>> {
    const session = await this.repository.get('attendance_session', input.sessionId);
    if (!session) {
      throw new ServiceError(
        'missing_reference',
        `the register ${input.sessionId} does not exist`,
        { entity: 'attendance_session', id: input.sessionId }
      );
    }

    if (session.locked) {
      throw new ServiceError(
        'invalid_request',
        `the register ${input.sessionId} is locked and takes no further marks`,
        { entity: 'attendance_session', id: input.sessionId }
      );
    }

    const existing = await this.repository.list('attendance_mark', {
      where: { attendance_session_id: input.sessionId, learner_id: input.learnerId },
      limit: 2,
    });
    if (existing.items.length > 0) {
      throw new ServiceError(
        'duplicate',
        `the learner ${input.learnerId} is already marked in this register`,
        { entity: 'attendance_mark', id: existing.items[0].id }
      );
    }

    if (ATTENDANCE_ABSENCE_STATUSES.includes(input.status) && input.reason === undefined) {
      throw new ServiceError(
        'invalid_request',
        `a ${input.status} mark has to carry a reason`,
        { entity: 'attendance_mark' }
      );
    }

    const row: CreateInput<'attendance_mark'> = {
      institution_id: session.institution_id,
      attendance_session_id: input.sessionId,
      learner_id: input.learnerId,
      status: input.status,
      ...(input.minutesLate !== undefined ? { minutes_late: input.minutesLate } : {}),
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.notifiedGuardianAt !== undefined
        ? { notified_guardian_at: input.notifiedGuardianAt }
        : {}),
    };

    return this.repository.create('attendance_mark', row, this.writeOptions('learner marked'));
  }

  /** Records a leave-out (exeat) of a learner. */
  async recordLeaveOut(input: RecordLeaveOutInput): Promise<RepositoryRow<'leave_out'>> {
    const learner = await this.repository.get('learner', input.learnerId);
    if (!learner) {
      throw new ServiceError('missing_reference', `the learner ${input.learnerId} does not exist`, {
        entity: 'learner',
        id: input.learnerId,
      });
    }

    const row: CreateInput<'leave_out'> = {
      institution_id: learner.institution_id,
      learner_id: input.learnerId,
      kind: input.kind,
      out_at: input.outAt,
      due_back_at: input.dueBackAt,
      authorised_by: input.authorisedBy,
      ...(input.returnedAt !== undefined ? { returned_at: input.returnedAt } : {}),
      ...(input.collectedByGuardianId
        ? { collected_by_guardian_id: input.collectedByGuardianId }
        : {}),
    };

    return this.repository.create('leave_out', row, this.writeOptions('leave-out recorded'));
  }

  /** Records a conduct incident of a learner. */
  async recordConductIncident(
    input: RecordConductIncidentInput
  ): Promise<RepositoryRow<'conduct_incident'>> {
    const learner = await this.repository.get('learner', input.learnerId);
    if (!learner) {
      throw new ServiceError('missing_reference', `the learner ${input.learnerId} does not exist`, {
        entity: 'learner',
        id: input.learnerId,
      });
    }

    const row: CreateInput<'conduct_incident'> = {
      institution_id: learner.institution_id,
      learner_id: input.learnerId,
      date: input.date,
      category: input.category,
      description: input.description,
      confidential: input.confidential ?? false,
      ...(input.action !== undefined ? { action: input.action } : {}),
      ...(input.points !== undefined ? { points: input.points } : {}),
      ...(input.guardianInformedAt !== undefined
        ? { guardian_informed_at: input.guardianInformedAt }
        : {}),
    };

    return this.repository.create(
      'conduct_incident',
      row,
      this.writeOptions('conduct incident recorded')
    );
  }

  /** Records a visit to the clinic. */
  async recordHealthVisit(input: RecordHealthVisitInput): Promise<RepositoryRow<'health_visit'>> {
    const learner = await this.repository.get('learner', input.learnerId);
    if (!learner) {
      throw new ServiceError('missing_reference', `the learner ${input.learnerId} does not exist`, {
        entity: 'learner',
        id: input.learnerId,
      });
    }

    const row: CreateInput<'health_visit'> = {
      institution_id: learner.institution_id,
      learner_id: input.learnerId,
      date: input.date,
      complaint: input.complaint,
      referred: input.referred ?? false,
      recorded_by: input.recordedBy,
      ...(input.treatment !== undefined ? { treatment: input.treatment } : {}),
    };

    return this.repository.create('health_visit', row, this.writeOptions('health visit recorded'));
  }

  /** The marks of a register, in the order they were taken. */
  async listMarks(sessionId: Id<'attendance_session'>): Promise<RepositoryRow<'attendance_mark'>[]> {
    const page = await this.repository.list('attendance_mark', {
      where: { attendance_session_id: sessionId },
      limit: 500,
    });
    return [...page.items];
  }

  /** Locks a register, so it takes no further marks. */
  async lockRegister(sessionId: Id<'attendance_session'>): Promise<RepositoryRow<'attendance_session'>> {
    const session = await this.repository.get('attendance_session', sessionId);
    if (!session) {
      throw new ServiceError(
        'missing_reference',
        `the register ${sessionId} does not exist`,
        { entity: 'attendance_session', id: sessionId }
      );
    }

    const patch: UpdateInput<'attendance_session'> = { locked: true };
    return this.repository.update('attendance_session', sessionId, patch, {
      expectedVersion: session.rowVersion,
      ...this.writeOptions('register locked'),
    });
  }

  // ---------------------------------------------------------------- internals

  /** The institution and the academic year of the scope a register covers. */
  private async resolveScope(
    scope: AttendanceScope
  ): Promise<{ institutionId: string; academicYearId?: string }> {
    if (scope.kind === 'class_group') {
      const group = await this.repository.get('class_group', scope.id);
      if (!group) {
        throw new ServiceError('missing_reference', `the class group ${scope.id} does not exist`, {
          entity: 'class_group',
          id: scope.id,
        });
      }
      return { institutionId: group.institution_id, academicYearId: group.academic_year_id };
    }

    if (scope.kind === 'teaching_group') {
      const group = await this.repository.get('teaching_group', scope.id);
      if (!group) {
        throw new ServiceError(
          'missing_reference',
          `the teaching group ${scope.id} does not exist`,
          { entity: 'teaching_group', id: scope.id }
        );
      }
      return { institutionId: group.institution_id, academicYearId: group.academic_year_id };
    }

    const residence = await this.repository.get('residence', scope.id);
    if (!residence) {
      throw new ServiceError('missing_reference', `the residence ${scope.id} does not exist`, {
        entity: 'residence',
        id: scope.id,
      });
    }
    return { institutionId: residence.institution_id };
  }

  /**
   * The academic period the register belongs to.
   *
   * A period the caller names has to cover the day of the register: that is the rule the
   * canonical registry deferred to this task. A register for a day no period covers is still
   * written, with no period at all.
   */
  private async resolvePeriod(
    input: OpenRegisterInput,
    scope: { institutionId: string; academicYearId?: string }
  ): Promise<Id<'academic_period'> | undefined> {
    if (input.academicPeriodId) {
      const period = await this.repository.get('academic_period', input.academicPeriodId);
      if (!period) {
        throw new ServiceError(
          'missing_reference',
          `the academic period ${input.academicPeriodId} does not exist`,
          { entity: 'academic_period', id: input.academicPeriodId }
        );
      }
      if (period.start_date > input.date || period.end_date < input.date) {
        throw new ServiceError(
          'out_of_period',
          `the register date ${input.date} lies outside the academic period ${period.name} (${period.start_date} to ${period.end_date})`,
          { entity: 'academic_period', id: period.id }
        );
      }
      return input.academicPeriodId;
    }

    return this.findPeriod(scope.institutionId, scope.academicYearId, input.date);
  }

  /** The period that covers the date: the outermost one, so a term reports its half-terms. */
  private async findPeriod(
    institutionId: string,
    academicYearId: string | undefined,
    date: string
  ): Promise<Id<'academic_period'> | undefined> {
    const page = await this.repository.list('academic_period', {
      where: {
        institution_id: institutionId,
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
      },
      limit: 500,
    });

    const covering = page.items.filter(
      (period) => period.start_date <= date && period.end_date >= date
    );
    if (covering.length === 0) return undefined;

    const outer = covering.filter(
      (period) => !covering.some((other) => other.parent_period_id === period.id)
    );
    const candidates = outer.length > 0 ? outer : covering;
    const chosen = [...candidates].sort((a, b) => {
      if (a.start_date !== b.start_date) return a.start_date < b.start_date ? -1 : 1;
      return a.sequence - b.sequence;
    })[0];

    return chosen ? asId<'academic_period'>(chosen.id) : undefined;
  }

  /** The register of the scope and the day, when it is already open. */
  private async findRegister(
    input: OpenRegisterInput,
    institutionId: string
  ): Promise<RepositoryRow<'attendance_session'> | null> {
    const page = await this.repository.list('attendance_session', {
      where: {
        institution_id: institutionId,
        date: input.date,
        session: input.session,
        period_number: input.periodNumber ?? null,
        ...scopeWhere(input.scope),
      },
      limit: 2,
    });
    return page.items[0] ?? null;
  }

  /** The write options of this service: the actor, the reason and the change origin. */
  private writeOptions(reason: string): WriteOptions {
    return {
      ...(this.actor ? { actor: this.actor } : {}),
      reason,
      origin: 'attendance-service',
    };
  }
}

/** The scope column of a register. */
function scopeWhere(scope: AttendanceScope): Record<string, unknown> {
  if (scope.kind === 'class_group') return { class_group_id: scope.id };
  if (scope.kind === 'teaching_group') return { teaching_group_id: scope.id };
  return { residence_id: scope.id };
}

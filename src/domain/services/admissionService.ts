// ABOUTME: The admission service: one call admits a learner, creates the guardians, the links, the
// ABOUTME: identifiers and the enrolment of spec 04 §2.2. Guardians are de-duplicated by phone, and
// ABOUTME: the five writes land in one transaction of the repository.

import type { CreateInput, Repository, RepositoryRow, WriteOptions } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import { nextSequenceNumber, sequenceYear } from '@/domain/sequences';

import {
  claimIdentifier,
  inTransaction,
  normalisePhone,
  personFields,
  type EnrolmentStatus,
  type EntryReason,
  type GuardianRelationship,
  type IdentifierClaim,
  type LearnerStatus,
  type PersonInput,
  type PreferredChannel,
  type ResidenceStatus,
  type ServiceDependencies,
} from './common';
import { EnrolmentService, type PreparedEnrolment } from './enrolmentService';
import { ServiceError } from './errors';
import { GuardianService } from './guardianService';

export interface AdmissionServiceOptions extends ServiceDependencies {
  /** The repository the service reads and writes through. */
  readonly repository: Repository;
  /** The prefix of the admission numbers the service assigns; `ADM` when the caller does not say. */
  readonly admissionNumberPrefix?: string;
}

/** The medical record of a learner, as the admission form collects it. */
export interface LearnerMedicalInput {
  readonly allergies?: readonly string[];
  readonly conditions?: readonly string[];
  readonly medications?: readonly string[];
}

/** The learner of an admission. */
export interface AdmissionLearnerInput extends PersonInput {
  /** The admission number; the service assigns the next one when the caller does not say. */
  readonly admissionNumber?: string;
  readonly admissionDate?: string;
  readonly status?: LearnerStatus;
  readonly residenceStatus?: ResidenceStatus;
  readonly houseId?: Id<'house'>;
  readonly householdId?: Id<'household'>;
  readonly specialNeeds?: readonly string[];
  readonly medical?: LearnerMedicalInput;
  readonly previousSchool?: string;
}

/** A guardian of an admission. */
export interface AdmissionGuardianInput extends PersonInput {
  readonly relationship?: GuardianRelationship;
  readonly isPrimary?: boolean;
  readonly hasParentalResponsibility?: boolean;
  readonly isFeePayer?: boolean;
  readonly feeSharePercent?: number;
  readonly canPickUp?: boolean;
  readonly receivesReports?: boolean;
  readonly receivesSms?: boolean;
  readonly preferredChannel?: PreferredChannel;
  readonly preferredLanguage?: string;
  readonly priority?: number;
  readonly occupation?: string;
  readonly employer?: string;
  readonly nationalId?: string;
}

/** An identifier created by an admission. */
export interface AdmissionIdentifierInput {
  /** The scheme of the identifier, e.g. `ke.kemis_upi`. */
  readonly scheme: string;
  /** The value of the identifier. */
  readonly value: string;
  /** Whose identifier this is. */
  readonly owner: 'learner' | 'guardian';
  /** The index of the guardian in the `guardians` array; only for a guardian owner. */
  readonly guardianIndex?: number;
}

/** The first enrolment of an admission. */
export interface AdmissionEnrolmentInput {
  /** The class group the learner is placed in. */
  readonly classGroupId: Id<'class_group'>;
  /** The day the enrolment starts. */
  readonly startDate: string;
  readonly entryReason?: EntryReason;
  readonly status?: EnrolmentStatus;
  readonly pathwayId?: Id<'pathway'>;
  readonly programmeId?: Id<'programme'>;
  readonly academicYearId?: Id<'academic_year'>;
  readonly levelId?: Id<'level'>;
  readonly feeCategoryIds?: readonly string[];
  readonly sponsorshipId?: Id<'sponsorship'>;
}

/** What an admission asks for. */
export interface AdmissionInput {
  readonly learner: AdmissionLearnerInput;
  /** The guardians of the learner; a guardian the school already knows is linked, not copied. */
  readonly guardians: readonly AdmissionGuardianInput[];
  /** The first enrolment of the learner. */
  readonly enrolment: AdmissionEnrolmentInput;
  /** The identifiers of the learner and of the guardians. */
  readonly identifiers?: readonly AdmissionIdentifierInput[];
}

/** What an admission created. */
export interface AdmissionResult {
  readonly learner: RepositoryRow<'learner'>;
  /** The guardians this admission created. */
  readonly guardians: readonly RepositoryRow<'guardian'>[];
  /** The links between the learner and the guardians. */
  readonly links: readonly RepositoryRow<'learner_guardian'>[];
  /** The identifiers of the learner and of the guardians. */
  readonly identifiers: readonly RepositoryRow<'identifier'>[];
  /** The first enrolment of the learner. */
  readonly enrolment: RepositoryRow<'enrolment'>;
  /** The guardians that already existed and were linked instead of created. */
  readonly reusedGuardianIds: readonly Id<'guardian'>[];
}

/** A guardian of the admission, as the plan resolved it. */
interface PlannedGuardian {
  /** The guardian the school already knows; null when the admission has to create it. */
  readonly existing: RepositoryRow<'guardian'> | null;
  /** The guardian input this person came from. */
  readonly sourceIndex: number;
}

/** The guardians of the admission, as the plan resolved them. */
interface GuardianPlan {
  /** The people the guardian inputs name, one entry each. */
  readonly guardians: readonly PlannedGuardian[];
  /** For every guardian input, the person it names. */
  readonly source: readonly number[];
}

/** An identifier an admission writes, with the owner it belongs to. */
interface PlannedIdentifier {
  readonly ownerType: 'learner' | 'guardian';
  /** The person the identifier belongs to; only for a guardian owner. */
  readonly guardian?: number;
  readonly scheme: string;
  readonly value: string;
}

/** What the admission resolved before it writes anything. */
interface AdmissionPlan {
  readonly institutionId: Id<'institution'>;
  readonly admissionNumber: string;
  readonly admissionDate: string;
  /** The placement of the first enrolment, resolved against the class group. */
  readonly enrolment: PreparedEnrolment;
  /** The guardians of the learner, as the plan resolved them. */
  readonly guardianPlan: GuardianPlan;
  /** The identifiers to write. */
  readonly identifiers: readonly PlannedIdentifier[];
}

/**
 * The admission service.
 *
 * One call admits a learner (spec 04 §2.2, step 6): it creates the learner, the guardians, the
 * links, the identifiers and the first enrolment, and it assigns the admission number.
 *
 * ### The atomicity
 *
 * The five writes land in one transaction of the repository, so they land together or not at
 * all: a step that fails leaves no row behind, no audit row behind, and no change event
 * behind. The transaction is what makes the admission atomic, not a compensation.
 *
 * The repository cannot read while a transaction is open, so the admission resolves what it
 * needs first - the class group, the programme, the guardian a phone belongs to, the
 * identifiers that are already recorded - and writes afterwards.
 *
 * ### The guardians
 *
 * The guardians are de-duplicated by phone (spec 02 §13): a guardian whose phone the school
 * already knows is linked to the learner instead of being created a second time, so two
 * siblings never end up with two copies of the same parent.
 */
export class AdmissionService {
  private readonly repository: Repository;
  private readonly enrolments: EnrolmentService;
  private readonly guardians: GuardianService;
  private readonly prefix: string;
  private readonly actor: string | undefined;

  constructor(options: AdmissionServiceOptions) {
    this.repository = options.repository;
    this.actor = options.actor;
    this.prefix = options.admissionNumberPrefix ?? 'ADM';
    this.enrolments = new EnrolmentService({
      repository: options.repository,
      ...(options.actor ? { actor: options.actor } : {}),
      ...(options.now ? { now: options.now } : {}),
    });
    this.guardians = new GuardianService({
      repository: options.repository,
      ...(options.actor ? { actor: options.actor } : {}),
      ...(options.now ? { now: options.now } : {}),
    });
  }

  /** Admits a learner. */
  async admit(input: AdmissionInput): Promise<AdmissionResult> {
    const plan = await this.plan(input);
    return this.write(input, plan);
  }

  // ---------------------------------------------------------------- internals

  /**
   * Resolves everything the admission needs before it writes.
   *
   * Every read of the admission happens here: the repository cannot read while a
   * transaction is open, so the plan is built first and the rows are written after.
   */
  private async plan(input: AdmissionInput): Promise<AdmissionPlan> {
    const group = await this.repository.get('class_group', input.enrolment.classGroupId);
    if (!group) {
      throw new ServiceError(
        'missing_reference',
        `the class group ${input.enrolment.classGroupId} does not exist`,
        { entity: 'class_group', id: input.enrolment.classGroupId }
      );
    }

    const programmeId = asId<'programme'>(group.programme_id);
    const programme = await this.repository.get('programme', programmeId);
    if (!programme) {
      throw new ServiceError('missing_reference', `the programme ${programmeId} does not exist`, {
        entity: 'programme',
        id: programmeId,
      });
    }

    if (input.enrolment.programmeId && input.enrolment.programmeId !== programmeId) {
      throw new ServiceError(
        'invalid_request',
        `the class group belongs to the programme ${programme.name}, not to ${input.enrolment.programmeId}`,
        { entity: 'class_group', id: group.id }
      );
    }

    const institutionId = asId<'institution'>(group.institution_id);
    const admissionDate = input.learner.admissionDate ?? input.enrolment.startDate;
    const admissionNumber =
      input.learner.admissionNumber ??
      (await this.nextAdmissionNumber(institutionId, admissionDate));

    const enrolment = await this.enrolments.prepareEnrolment({
      classGroupId: input.enrolment.classGroupId,
      startDate: input.enrolment.startDate,
      ...(input.enrolment.entryReason ? { entryReason: input.enrolment.entryReason } : {}),
      ...(input.enrolment.status ? { status: input.enrolment.status } : {}),
      ...(input.enrolment.pathwayId ? { pathwayId: input.enrolment.pathwayId } : {}),
      ...(input.enrolment.academicYearId ? { academicYearId: input.enrolment.academicYearId } : {}),
      ...(input.enrolment.levelId ? { levelId: input.enrolment.levelId } : {}),
      ...(input.enrolment.programmeId ? { programmeId: input.enrolment.programmeId } : {}),
      ...(input.enrolment.feeCategoryIds
        ? { feeCategoryIds: input.enrolment.feeCategoryIds }
        : {}),
      ...(input.enrolment.sponsorshipId ? { sponsorshipId: input.enrolment.sponsorshipId } : {}),
    });

    const guardianPlan = await this.planGuardians(input.guardians, institutionId);
    const identifiers = await this.planIdentifiers(input, guardianPlan);

    return {
      institutionId,
      admissionNumber,
      admissionDate,
      enrolment,
      guardianPlan,
      identifiers,
    };
  }

  /**
   * The guardians of the admission: the ones the school already knows are linked, the others
   * are created.
   *
   * Two guardian inputs with the same phone are the same person, whoever the school knows
   * them as: the second one is linked to the guardian of the first.
   */
  private async planGuardians(
    inputs: readonly AdmissionGuardianInput[],
    institutionId: Id<'institution'>
  ): Promise<GuardianPlan> {
    const guardians: PlannedGuardian[] = [];
    const source: number[] = [];
    const byPhone = new Map<string, number>();

    for (const [index, input] of inputs.entries()) {
      const keys = phoneKeys(input);
      const known = keys
        .map((key) => byPhone.get(key))
        .find((owner) => owner !== undefined);

      if (known !== undefined) {
        source.push(known);
        continue;
      }

      const person = guardians.length;
      guardians.push({
        existing: await this.findGuardian(input, institutionId),
        sourceIndex: index,
      });
      source.push(person);
      for (const key of keys) byPhone.set(key, person);
    }

    return { guardians, source };
  }

  /** The guardian of an input: the one the school already knows, when the phone says so. */
  private async findGuardian(
    input: AdmissionGuardianInput,
    institutionId: Id<'institution'>
  ): Promise<RepositoryRow<'guardian'> | null> {
    for (const key of phoneKeys(input)) {
      const matches = await this.guardians.findByPhone(key, { institutionId });
      if (matches.length > 0) return matches[0];
    }
    return null;
  }

  /**
   * The identifiers the admission writes.
   *
   * An identifier the owner already holds is not written again, and an identifier another
   * owner holds is refused: an identifier names one owner, and the KEMIS unique pupil
   * identifier names one learner in the national registry.
   */
  private async planIdentifiers(
    input: AdmissionInput,
    guardianPlan: GuardianPlan
  ): Promise<PlannedIdentifier[]> {
    const planned: PlannedIdentifier[] = [];
    const seen = new Set<string>();

    for (const identifier of input.identifiers ?? []) {
      const person =
        identifier.owner === 'guardian'
          ? this.personOf(identifier, guardianPlan)
          : undefined;

      const key = `${identifier.owner}:${person ?? 'learner'}:${identifier.scheme}:${identifier.value}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const ownerId =
        person === undefined
          ? undefined
          : guardianPlan.guardians[person]?.existing?.id;

      const claim = await this.claimOf(identifier.scheme, identifier.value, ownerId);
      if (claim === 'taken') {
        throw new ServiceError(
          'duplicate',
          `the ${identifier.scheme} ${identifier.value} already belongs to another owner`,
          { entity: 'identifier' }
        );
      }
      if (claim === 'already_recorded') continue;

      planned.push({
        ownerType: identifier.owner,
        ...(person !== undefined ? { guardian: person } : {}),
        scheme: identifier.scheme,
        value: identifier.value,
      });
    }

    return planned;
  }

  /** The person a guardian identifier belongs to. */
  private personOf(
    identifier: AdmissionIdentifierInput,
    guardianPlan: GuardianPlan
  ): number {
    const index = identifier.guardianIndex;
    if (index === undefined) {
      throw new ServiceError(
        'invalid_request',
        `the identifier ${identifier.scheme} names a guardian the admission does not have`,
        { entity: 'identifier' }
      );
    }

    const person = guardianPlan.source[index];
    if (person === undefined) {
      throw new ServiceError(
        'invalid_request',
        `the identifier ${identifier.scheme} names a guardian the admission does not have`,
        { entity: 'identifier' }
      );
    }
    return person;
  }

  /**
   * What the rule of an identifier says about a scheme and a value.
   *
   * An identifier names one owner. The owner is unknown when the row that holds it is about
   * to be created, and then every holder is another owner.
   */
  private async claimOf(
    scheme: string,
    value: string,
    ownerId: string | undefined
  ): Promise<IdentifierClaim> {
    const holders = await this.guardians.findIdentifierHolders(scheme, value);
    return claimIdentifier(holders, ownerId);
  }

  /**
   * Writes the rows of the admission, in one transaction.
   *
   * The rows land together or not at all: a failure rolls them back, and the change events
   * of the attempt are never delivered.
   */
  private async write(input: AdmissionInput, plan: AdmissionPlan): Promise<AdmissionResult> {
    return inTransaction(this.repository, async () => {
      const learner = await this.repository.create(
        'learner',
        this.learnerRow(
          input.learner,
          plan.institutionId,
          plan.admissionNumber,
          plan.admissionDate
        ),
        this.writeOptions('learner admitted')
      );

      const created: RepositoryRow<'guardian'>[] = [];
      const byPerson = new Map<number, RepositoryRow<'guardian'>>();
      for (const [person, planned] of plan.guardianPlan.guardians.entries()) {
        if (planned.existing) {
          byPerson.set(person, planned.existing);
          continue;
        }
        const guardian = await this.repository.create(
          'guardian',
          this.guardianRow(
            input.guardians[planned.sourceIndex],
            plan.institutionId
          ),
          this.writeOptions('guardian admitted')
        );
        created.push(guardian);
        byPerson.set(person, guardian);
      }

      const links = await this.linkGuardians(
        learner,
        input.guardians,
        plan.guardianPlan,
        byPerson,
        plan.institutionId
      );
      const identifiers = await this.createIdentifiers(
        plan.identifiers,
        learner,
        byPerson,
        plan.institutionId
      );
      const enrolment = await this.enrolments.enrolPrepared(
        this.enrolments.enrolmentRow(plan.enrolment, learner.id)
      );

      const reused: Id<'guardian'>[] = [];
      for (const guardian of plan.guardianPlan.guardians) {
        if (guardian.existing) reused.push(guardian.existing.id);
      }

      return {
        learner,
        guardians: created,
        links,
        identifiers,
        enrolment,
        reusedGuardianIds: reused,
      };
    });
  }

  /** The row of the admitted learner. */
  private learnerRow(
    learner: AdmissionLearnerInput,
    institutionId: Id<'institution'>,
    admissionNumber: string,
    admissionDate: string
  ): CreateInput<'learner'> {
    return {
      institution_id: institutionId,
      ...personFields(learner),
      admission_number: admissionNumber,
      admission_date: admissionDate,
      status: learner.status ?? 'enrolled',
      residence_status: learner.residenceStatus ?? 'day',
      ...(learner.houseId ? { house_id: learner.houseId } : {}),
      ...(learner.householdId ? { household_id: learner.householdId } : {}),
      ...(learner.specialNeeds ? { special_needs: [...learner.specialNeeds] } : {}),
      ...(learner.medical
        ? {
            medical: {
              ...(learner.medical.allergies
                ? { allergies: [...learner.medical.allergies] }
                : {}),
              ...(learner.medical.conditions
                ? { conditions: [...learner.medical.conditions] }
                : {}),
              ...(learner.medical.medications
                ? { medications: [...learner.medical.medications] }
                : {}),
            },
          }
        : {}),
      ...(learner.previousSchool ? { previous_school: learner.previousSchool } : {}),
    };
  }

  /** The row of a guardian of the admission. */
  private guardianRow(
    guardian: AdmissionGuardianInput,
    institutionId: Id<'institution'>
  ): CreateInput<'guardian'> {
    return {
      institution_id: institutionId,
      ...personFields(guardian),
      ...(guardian.occupation ? { occupation: guardian.occupation } : {}),
      ...(guardian.employer ? { employer: guardian.employer } : {}),
      ...(guardian.nationalId ? { national_id: guardian.nationalId } : {}),
    };
  }

  /** The links between the learner and the guardians; a learner has exactly one primary. */
  private async linkGuardians(
    learner: RepositoryRow<'learner'>,
    inputs: readonly AdmissionGuardianInput[],
    guardianPlan: GuardianPlan,
    byPerson: ReadonlyMap<number, RepositoryRow<'guardian'>>,
    institutionId: Id<'institution'>
  ): Promise<RepositoryRow<'learner_guardian'>[]> {
    const explicitPrimary = inputs.findIndex((input) => input.isPrimary === true);
    const links: RepositoryRow<'learner_guardian'>[] = [];
    const linked = new Set<string>();

    for (const [index, input] of inputs.entries()) {
      const guardian = byPerson.get(guardianPlan.source[index]);
      if (!guardian || linked.has(guardian.id)) continue;
      linked.add(guardian.id);

      const isPrimary = explicitPrimary >= 0 ? index === explicitPrimary : links.length === 0;
      const link = await this.repository.create(
        'learner_guardian',
        {
          institution_id: institutionId,
          learner_id: learner.id,
          guardian_id: guardian.id,
          relationship: input.relationship ?? 'guardian',
          is_primary: isPrimary,
          has_parental_responsibility: input.hasParentalResponsibility ?? true,
          is_fee_payer: input.isFeePayer ?? false,
          can_pick_up: input.canPickUp ?? true,
          receives_reports: input.receivesReports ?? true,
          receives_sms: input.receivesSms ?? true,
          preferred_channel: input.preferredChannel ?? 'sms',
          ...(input.feeSharePercent !== undefined
            ? { fee_share_percent: input.feeSharePercent }
            : {}),
          ...(input.preferredLanguage ? { preferred_language: input.preferredLanguage } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
        },
        this.writeOptions('guardian linked')
      );
      links.push(link);
    }

    return links;
  }

  /** The identifiers of the learner and of the guardians. */
  private async createIdentifiers(
    planned: readonly PlannedIdentifier[],
    learner: RepositoryRow<'learner'>,
    byPerson: ReadonlyMap<number, RepositoryRow<'guardian'>>,
    institutionId: Id<'institution'>
  ): Promise<RepositoryRow<'identifier'>[]> {
    const identifiers: RepositoryRow<'identifier'>[] = [];

    for (const plan of planned) {
      const ownerId =
        plan.ownerType === 'learner'
          ? learner.id
          : plan.guardian !== undefined
            ? byPerson.get(plan.guardian)?.id
            : undefined;
      if (!ownerId) {
        throw new ServiceError(
          'invalid_request',
          `the identifier ${plan.scheme} names a guardian the admission does not have`,
          { entity: 'identifier' }
        );
      }

      const row = await this.repository.create(
        'identifier',
        {
          institution_id: institutionId,
          owner_type: plan.ownerType,
          owner_id: ownerId,
          scheme: plan.scheme,
          value: plan.value,
        },
        this.writeOptions('identifier recorded')
      );
      identifiers.push(row);
    }

    return identifiers;
  }

  /**
   * The next admission number of the institution.
   *
   * The numbers follow the sequence of spec 04 §3 (`<PREFIX>/<YEAR>/<SEQ>`) and are never
   * reused. The number is derived from the admission numbers the repository holds, archived
   * rows included: a number that was given to a learner once is never given to another one.
   * A number that is already taken is refused by the unique constraint of the learner.
   */
  private async nextAdmissionNumber(
    institutionId: Id<'institution'>,
    date: string
  ): Promise<string> {
    const page = await this.repository.list('learner', {
      where: { institution_id: institutionId },
      includeDeleted: true,
      limit: 500,
    });
    return nextSequenceNumber(
      page.items.map((row) => row.admission_number),
      { prefix: this.prefix, year: sequenceYear(date), width: 3 }
    );
  }

  /** The write options of this service: the actor, the reason and the change origin. */
  private writeOptions(reason: string): WriteOptions {
    return {
      ...(this.actor ? { actor: this.actor } : {}),
      reason,
      origin: 'admission-service',
    };
  }
}

/** The phones of a guardian input, in the form the de-duplication compares. */
function phoneKeys(guardian: AdmissionGuardianInput): string[] {
  const keys: string[] = [];
  for (const phone of guardian.phones ?? []) {
    const key = normalisePhone(phone.number);
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

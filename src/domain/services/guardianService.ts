// ABOUTME: The guardian service: add and remove guardians, link them to learners, keep the
// ABOUTME: identifiers (the ke.kemis_upi scheme among them) and hand the UI the contact details it
// ABOUTME: needs. Every read and write goes through the repository of P1-B02.

import type { CreateInput, Repository, RepositoryRow, UpdateInput, WriteOptions } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import type { Address, Email, Phone } from '@/domain/schema';

import {
  claimIdentifier,
  inTransaction,
  normalisePhone,
  personFields,
  type AddressInput,
  type EmailInput,
  type Gender,
  type GuardianRelationship,
  type IdentifierOwnerType,
  type NameOrder,
  type PersonInput,
  type PhoneInput,
  type PreferredChannel,
  type ServiceDependencies,
} from './common';
import { ServiceError } from './errors';

export interface GuardianServiceOptions extends ServiceDependencies {
  /** The repository the service reads and writes through. */
  readonly repository: Repository;
}

/** A guardian to add. */
export interface GuardianInput extends PersonInput {
  /** The institution the guardian belongs to. */
  readonly institutionId: Id<'institution'>;
  readonly occupation?: string;
  readonly employer?: string;
  readonly nationalId?: string;
  readonly isStaffMemberId?: Id<'staff'>;
}

/** The fields a guardian may be corrected in. */
export interface GuardianPatch {
  readonly givenName?: string;
  readonly familyName?: string;
  readonly preferredName?: string;
  readonly nameOrder?: NameOrder;
  readonly gender?: Gender;
  readonly phones?: readonly PhoneInput[];
  readonly emails?: readonly EmailInput[];
  readonly address?: AddressInput;
  readonly occupation?: string;
  readonly employer?: string;
  readonly nationalId?: string;
}

/** A guardian linked to a learner. */
export interface LinkGuardianInput {
  readonly learnerId: Id<'learner'>;
  readonly guardianId: Id<'guardian'>;
  /** How the guardian is related to the learner. */
  readonly relationship: GuardianRelationship;
  /**
   * Whether this is the primary contact of the learner. When the caller does not say, the
   * link becomes the primary contact only when the learner has none yet: a learner has
   * exactly one primary contact (spec 04 §4).
   */
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
}

/** The owner of an identifier. */
export type IdentifierOwner =
  | { readonly ownerType: 'learner'; readonly ownerId: Id<'learner'> }
  | { readonly ownerType: 'guardian'; readonly ownerId: Id<'guardian'> }
  | { readonly ownerType: 'staff'; readonly ownerId: Id<'staff'> };

/** An identifier to record. */
export interface IdentifierInput {
  /** Whose identifier this is. */
  readonly owner: IdentifierOwner;
  /** The scheme of the identifier, e.g. `ke.kemis_upi`. */
  readonly scheme: string;
  /** The value of the identifier. */
  readonly value: string;
  /** Who issued it. */
  readonly issuedBy?: string;
  /** When it was verified. */
  readonly verifiedAt?: string;
}

/** What the UI shows about one guardian of a learner. */
export interface GuardianContact {
  /** The link between the learner and the guardian. */
  readonly link: RepositoryRow<'learner_guardian'>;
  /** The guardian. */
  readonly guardian: RepositoryRow<'guardian'>;
  /** The name of the guardian, ready to show. */
  readonly name: string;
  /** The phones the school may call. */
  readonly phones: readonly Phone[];
  /** The addresses the school may write to. */
  readonly emails: readonly Email[];
  /** The postal address. */
  readonly address?: Address;
  readonly relationship: GuardianRelationship;
  readonly isPrimary: boolean;
  readonly isFeePayer: boolean;
  readonly preferredChannel: PreferredChannel;
}

/**
 * The guardian service.
 *
 * The guardians of a school are shared: a guardian with a phone the school already knows is
 * the same person, however many learners they have. The service therefore finds a guardian by
 * phone before it creates one (spec 02 §13).
 */
export class GuardianService {
  private readonly repository: Repository;
  private readonly actor: string | undefined;

  constructor(options: GuardianServiceOptions) {
    this.repository = options.repository;
    this.actor = options.actor;
  }

  /** Adds a guardian. */
  async addGuardian(input: GuardianInput): Promise<RepositoryRow<'guardian'>> {
    const row: CreateInput<'guardian'> = {
      institution_id: input.institutionId,
      ...personFields(input),
      ...(input.occupation ? { occupation: input.occupation } : {}),
      ...(input.employer ? { employer: input.employer } : {}),
      ...(input.nationalId ? { national_id: input.nationalId } : {}),
      ...(input.isStaffMemberId ? { is_staff_member_id: input.isStaffMemberId } : {}),
    };

    return this.repository.create('guardian', row, this.writeOptions('guardian added'));
  }

  /** Corrects the fields of a guardian. */
  async updateGuardian(
    guardianId: Id<'guardian'>,
    patch: GuardianPatch
  ): Promise<RepositoryRow<'guardian'>> {
    const current = await this.repository.get('guardian', guardianId);
    if (!current) {
      throw new ServiceError('missing_reference', `the guardian ${guardianId} does not exist`, {
        entity: 'guardian',
        id: guardianId,
      });
    }

    const update: UpdateInput<'guardian'> = {
      ...(patch.givenName ? { given_name: patch.givenName } : {}),
      ...(patch.familyName ? { family_name: patch.familyName } : {}),
      ...(patch.preferredName ? { preferred_name: patch.preferredName } : {}),
      ...(patch.nameOrder ? { name_order: patch.nameOrder } : {}),
      ...(patch.gender ? { gender: patch.gender } : {}),
      ...(patch.phones ? { phones: patch.phones.map(toPhone) } : {}),
      ...(patch.emails ? { emails: patch.emails.map(toEmail) } : {}),
      ...(patch.address ? { address: toAddress(patch.address) } : {}),
      ...(patch.occupation !== undefined ? { occupation: patch.occupation } : {}),
      ...(patch.employer !== undefined ? { employer: patch.employer } : {}),
      ...(patch.nationalId !== undefined ? { national_id: patch.nationalId } : {}),
    };

    return this.repository.update('guardian', guardianId, update, {
      expectedVersion: current.rowVersion,
      ...this.writeOptions('guardian updated'),
    });
  }

  /**
   * Removes a guardian, and the links to the learners first.
   *
   * The links go first: a link that outlived its guardian would name a person the school no
   * longer holds. The links and the guardian go in one transaction, so the school never
   * holds a guardian without its links, nor links without their guardian.
   */
  async removeGuardian(
    guardianId: Id<'guardian'>,
    options: { readonly expectedVersion?: number } = {}
  ): Promise<{ guardian: RepositoryRow<'guardian'>; unlinked: readonly RepositoryRow<'learner_guardian'>[] }> {
    const current = await this.repository.get('guardian', guardianId);
    if (!current) {
      throw new ServiceError('missing_reference', `the guardian ${guardianId} does not exist`, {
        entity: 'guardian',
        id: guardianId,
      });
    }

    const links = await this.linksOf(guardianId);

    return inTransaction(this.repository, async () => {
      const unlinked: RepositoryRow<'learner_guardian'>[] = [];
      for (const link of links) {
        unlinked.push(
          await this.repository.remove(
            'learner_guardian',
            link.id,
            this.writeOptions('guardian unlinked')
          )
        );
      }

      const guardian = await this.repository.remove('guardian', guardianId, {
        ...(options.expectedVersion !== undefined
          ? { expectedVersion: options.expectedVersion }
          : {}),
        ...this.writeOptions('guardian removed'),
      });

      return { guardian, unlinked };
    });
  }

  /**
   * Links a guardian to a learner.
   *
   * A learner has exactly one primary contact (spec 04 §4), so a link that becomes the
   * primary demotes the one that was.
   */
  async linkGuardian(input: LinkGuardianInput): Promise<RepositoryRow<'learner_guardian'>> {
    const learner = await this.repository.get('learner', input.learnerId);
    if (!learner) {
      throw new ServiceError('missing_reference', `the learner ${input.learnerId} does not exist`, {
        entity: 'learner',
        id: input.learnerId,
      });
    }

    const guardian = await this.repository.get('guardian', input.guardianId);
    if (!guardian) {
      throw new ServiceError(
        'missing_reference',
        `the guardian ${input.guardianId} does not exist`,
        { entity: 'guardian', id: input.guardianId }
      );
    }

    const existing = await this.repository.list('learner_guardian', {
      where: { learner_id: input.learnerId, guardian_id: input.guardianId },
      limit: 2,
    });
    if (existing.items.length > 0) {
      throw new ServiceError(
        'duplicate',
        `the guardian ${input.guardianId} is already linked to the learner ${input.learnerId}`,
        { entity: 'learner_guardian', id: existing.items[0].id }
      );
    }

    const links = await this.repository.list('learner_guardian', {
      where: { learner_id: input.learnerId },
      limit: 100,
    });
    const currentPrimary = links.items.find((link) => link.is_primary);
    const isPrimary = input.isPrimary ?? !currentPrimary;

    const row: CreateInput<'learner_guardian'> = {
      institution_id: learner.institution_id,
      learner_id: input.learnerId,
      guardian_id: input.guardianId,
      relationship: input.relationship,
      is_primary: isPrimary,
      has_parental_responsibility: input.hasParentalResponsibility ?? true,
      is_fee_payer: input.isFeePayer ?? false,
      can_pick_up: input.canPickUp ?? true,
      receives_reports: input.receivesReports ?? true,
      receives_sms: input.receivesSms ?? true,
      preferred_channel: input.preferredChannel ?? 'sms',
      ...(input.feeSharePercent !== undefined ? { fee_share_percent: input.feeSharePercent } : {}),
      ...(input.preferredLanguage ? { preferred_language: input.preferredLanguage } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
    };

    return inTransaction(this.repository, async () => {
      // The learner never has two primary contacts: the old one steps down first.
      if (isPrimary && currentPrimary) {
        await this.repository.update(
          'learner_guardian',
          currentPrimary.id,
          { is_primary: false },
          {
            expectedVersion: currentPrimary.rowVersion,
            ...this.writeOptions('primary contact changed'),
          }
        );
      }

      return this.repository.create(
        'learner_guardian',
        row,
        this.writeOptions('guardian linked')
      );
    });
  }

  /** Removes the link between a learner and a guardian. */
  async unlinkGuardian(
    learnerId: Id<'learner'>,
    guardianId: Id<'guardian'>
  ): Promise<readonly RepositoryRow<'learner_guardian'>[]> {
    const page = await this.repository.list('learner_guardian', {
      where: { learner_id: learnerId, guardian_id: guardianId },
      limit: 10,
    });

    return inTransaction(this.repository, async () => {
      const removed: RepositoryRow<'learner_guardian'>[] = [];
      for (const link of page.items) {
        removed.push(
          await this.repository.remove(
            'learner_guardian',
            link.id,
            this.writeOptions('guardian unlinked')
          )
        );
      }
      return removed;
    });
  }

  /** The guardians of a learner, with the contact details the UI shows. */
  async listContacts(learnerId: Id<'learner'>): Promise<GuardianContact[]> {
    const page = await this.repository.list('learner_guardian', {
      where: { learner_id: learnerId },
      orderBy: [{ field: 'priority', direction: 'asc' }, { field: 'id', direction: 'asc' }],
      limit: 100,
    });

    const contacts: GuardianContact[] = [];
    for (const link of page.items) {
      const guardian = await this.repository.get('guardian', asId<'guardian'>(link.guardian_id));
      if (!guardian) continue;
      contacts.push({
        link,
        guardian,
        name: `${guardian.preferred_name ?? guardian.given_name} ${guardian.family_name}`,
        phones: guardian.phones ?? [],
        emails: guardian.emails ?? [],
        ...(guardian.address ? { address: guardian.address } : {}),
        relationship: link.relationship,
        isPrimary: link.is_primary,
        isFeePayer: link.is_fee_payer,
        preferredChannel: link.preferred_channel,
      });
    }
    return contacts;
  }

  /**
   * The guardians of the institution whose phone is the one given.
   *
   * The phones are a JSON column, so the search is a text match the service then narrows to
   * an exact comparison of the numbers.
   */
  async findByPhone(
    phone: string,
    options: { readonly institutionId?: Id<'institution'> } = {}
  ): Promise<RepositoryRow<'guardian'>[]> {
    const wanted = normalisePhone(phone);
    if (!wanted) return [];

    const page = await this.repository.list('guardian', {
      where: options.institutionId ? { institution_id: options.institutionId } : {},
      conditions: { phones: { contains: wanted } },
      limit: 100,
    });

    return page.items.filter((guardian) =>
      (guardian.phones ?? []).some((candidate) => normalisePhone(candidate.number) === wanted)
    );
  }

  /**
   * The identifiers that hold a scheme and a value.
   *
   * An identifier names one owner, so the rows that hold a scheme and a value decide
   * whether it may be recorded.
   */
  async findIdentifierHolders(
    scheme: string,
    value: string
  ): Promise<RepositoryRow<'identifier'>[]> {
    const page = await this.repository.list('identifier', {
      where: { scheme, value },
      limit: 100,
    });
    return [...page.items];
  }

  /**
   * Records an identifier of a learner, a guardian or a member of staff.
   *
   * An identifier names one owner: the KEMIS unique pupil identifier names one learner in
   * the national registry, and a birth certificate number or a national id names one
   * person. The service therefore refuses an identifier that is already recorded, whether
   * for the owner or for somebody else.
   */
  async addIdentifier(input: IdentifierInput): Promise<RepositoryRow<'identifier'>> {
    const ownerId = input.owner.ownerId;

    const holders = await this.findIdentifierHolders(input.scheme, input.value);
    const claim = claimIdentifier(holders, ownerId);
    if (claim === 'taken') {
      throw new ServiceError(
        'duplicate',
        `the ${input.scheme} ${input.value} already belongs to another owner`,
        { entity: 'identifier', id: holders[0].id }
      );
    }
    if (claim === 'already_recorded') {
      throw new ServiceError(
        'duplicate',
        `the ${input.scheme} ${input.value} is already recorded for this owner`,
        { entity: 'identifier', id: holders[0].id }
      );
    }

    const row: CreateInput<'identifier'> = {
      institution_id: await this.institutionOf(input.owner),
      owner_type: input.owner.ownerType,
      owner_id: ownerId,
      scheme: input.scheme,
      value: input.value,
      ...(input.issuedBy ? { issued_by: input.issuedBy } : {}),
      ...(input.verifiedAt ? { verified_at: input.verifiedAt } : {}),
    };

    return this.repository.create('identifier', row, this.writeOptions('identifier recorded'));
  }

  /** The identifiers of one owner. */
  async listIdentifiers(
    ownerType: IdentifierOwnerType,
    ownerId: string
  ): Promise<RepositoryRow<'identifier'>[]> {
    const page = await this.repository.list('identifier', {
      where: { owner_type: ownerType, owner_id: ownerId },
      limit: 100,
    });
    return [...page.items];
  }

  /** Removes an identifier. */
  async removeIdentifier(identifierId: Id<'identifier'>): Promise<RepositoryRow<'identifier'>> {
    const current = await this.repository.get('identifier', identifierId);
    if (!current) {
      throw new ServiceError(
        'missing_reference',
        `the identifier ${identifierId} does not exist`,
        { entity: 'identifier', id: identifierId }
      );
    }
    return this.repository.remove('identifier', identifierId, this.writeOptions('identifier removed'));
  }

  // ---------------------------------------------------------------- internals

  /** The institution of the owner of an identifier. */
  private async institutionOf(owner: IdentifierOwner): Promise<string> {
    if (owner.ownerType === 'learner') {
      const learner = await this.repository.get('learner', owner.ownerId);
      if (!learner) {
        throw new ServiceError('missing_reference', `the learner ${owner.ownerId} does not exist`, {
          entity: 'learner',
          id: owner.ownerId,
        });
      }
      return learner.institution_id;
    }

    if (owner.ownerType === 'guardian') {
      const guardian = await this.repository.get('guardian', owner.ownerId);
      if (!guardian) {
        throw new ServiceError('missing_reference', `the guardian ${owner.ownerId} does not exist`, {
          entity: 'guardian',
          id: owner.ownerId,
        });
      }
      return guardian.institution_id;
    }

    const staff = await this.repository.get('staff', owner.ownerId);
    if (!staff) {
      throw new ServiceError('missing_reference', `the staff row ${owner.ownerId} does not exist`, {
        entity: 'staff',
        id: owner.ownerId,
      });
    }
    return staff.institution_id;
  }

  /** The links to a guardian, wherever the guardian is linked. */
  private async linksOf(
    guardianId: Id<'guardian'>
  ): Promise<RepositoryRow<'learner_guardian'>[]> {
    const page = await this.repository.list('learner_guardian', {
      where: { guardian_id: guardianId },
      limit: 500,
    });
    return [...page.items];
  }

  /** The write options of this service: the actor, the reason and the change origin. */
  private writeOptions(reason: string): WriteOptions {
    return {
      ...(this.actor ? { actor: this.actor } : {}),
      reason,
      origin: 'guardian-service',
    };
  }
}

function toPhone(phone: PhoneInput): Phone {
  return { number: phone.number, ...(phone.label ? { label: phone.label } : {}) };
}

function toEmail(email: EmailInput): Email {
  return { address: email.address, ...(email.label ? { label: email.label } : {}) };
}

function toAddress(address: AddressInput): Address {
  return {
    ...(address.line1 ? { line1: address.line1 } : {}),
    ...(address.line2 ? { line2: address.line2 } : {}),
    ...(address.city ? { city: address.city } : {}),
    ...(address.region ? { region: address.region } : {}),
    ...(address.postal_code ? { postal_code: address.postal_code } : {}),
    ...(address.country ? { country: address.country } : {}),
  };
}

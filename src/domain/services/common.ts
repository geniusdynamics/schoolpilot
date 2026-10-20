// ABOUTME: The shapes the four domain services share: the dependencies they take, the person
// ABOUTME: fields an admission collects, the value types the canonical schemas name, the phone
// ABOUTME: normalisation the guardian de-duplication compares, and the transaction the writes of
// ABOUTME: a service land in.

import { RepositoryError, RepositoryStorageError, type Repository, type RepositoryRow, type WritableFields } from '@/data/repository';
import {
  ATTENDANCE_ABSENCE_STATUSES,
  ATTENDANCE_REASONS,
  ATTENDANCE_SESSION_KINDS,
  CONDUCT_INCIDENT_CATEGORIES,
  ENROLMENT_STATUSES,
  ENTRY_REASONS,
  EXIT_REASONS,
  GENDERS,
  GUARDIAN_RELATIONSHIPS,
  IDENTIFIER_OWNER_TYPES,
  LEARNER_STATUSES,
  LEAVE_OUT_KINDS,
  NAME_ORDERS,
  PREFERRED_CHANNELS,
  RESIDENCE_STATUSES,
  type Address,
  type Email,
  type Phone,
} from '@/domain/schema';

import { ServiceError } from './errors';

export type { AttendanceStatus } from '@/domain/schema';

// ---------------------------------------------------------------- value types

export type Gender = (typeof GENDERS)[number];
export type NameOrder = (typeof NAME_ORDERS)[number];
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];
export type PreferredChannel = (typeof PREFERRED_CHANNELS)[number];
export type LearnerStatus = (typeof LEARNER_STATUSES)[number];
export type ResidenceStatus = (typeof RESIDENCE_STATUSES)[number];
export type EnrolmentStatus = (typeof ENROLMENT_STATUSES)[number];
export type EntryReason = (typeof ENTRY_REASONS)[number];
export type ExitReason = (typeof EXIT_REASONS)[number];
export type IdentifierOwnerType = (typeof IDENTIFIER_OWNER_TYPES)[number];
export type AttendanceSessionKind = (typeof ATTENDANCE_SESSION_KINDS)[number];
export type AttendanceReason = (typeof ATTENDANCE_REASONS)[number];
export type LeaveOutKind = (typeof LEAVE_OUT_KINDS)[number];
export type ConductIncidentCategory = (typeof CONDUCT_INCIDENT_CATEGORIES)[number];

/** The statuses that mean the learner did not attend; each of them needs a reason. */
export { ATTENDANCE_ABSENCE_STATUSES };

/** The KEMIS unique pupil identifier, the scheme the national registry of Kenya uses. */
export const KEMIS_UPI_SCHEME = 'ke.kemis_upi';

// --------------------------------------------------------------- transactions

/**
 * Runs the writes of a service inside one transaction of the repository.
 *
 * The rows land together or not at all: a failure inside the callback rolls the rows and
 * their audit rows back, and the change events of the writes that joined are never
 * delivered. The repository cannot read while a transaction is open, so a service resolves
 * what it needs (the class group of an enrolment, the guardian a phone belongs to) before
 * it opens the transaction, and writes afterwards.
 *
 * The error of a failed callback keeps its own type: an error of the repository stays an
 * error of the repository, an error of a service stays an error of that service, and
 * anything else becomes a service error.
 */
export async function inTransaction<T>(
  repository: Repository,
  work: () => Promise<T>
): Promise<T> {
  try {
    return await repository.transaction(async () => work());
  } catch (error) {
    throw asServiceError(error);
  }
}

/**
 * The error of a failed transaction, with the type it had before the transaction wrapped it.
 *
 * The repository wraps an error that is not one of its own when a transaction rolls back,
 * so a service error comes back as the cause of a storage error.
 */
export function asServiceError(error: unknown): Error {
  if (error instanceof ServiceError) return error;
  if (error instanceof RepositoryStorageError && error.cause instanceof ServiceError) {
    return error.cause;
  }
  if (error instanceof RepositoryError) return error;
  return new ServiceError(
    'failed',
    error instanceof Error ? error.message : String(error),
    { cause: error }
  );
}

// ---------------------------------------------------------------- identifiers

/** What the rule of an identifier says about a scheme and a value. */
export type IdentifierClaim =
  /** The identifier may be recorded for the owner. */
  | 'record'
  /** The owner already holds the identifier; it does not have to be written again. */
  | 'already_recorded'
  /** Another owner holds the identifier; it may not be recorded. */
  | 'taken';

/**
 * The rule of an identifier: a scheme and a value name one owner.
 *
 * The owner is unknown when the row that holds it is about to be created, and then every
 * holder is another owner.
 */
export function claimIdentifier(
  holders: readonly Pick<RepositoryRow<'identifier'>, 'owner_id'>[],
  ownerId: string | undefined
): IdentifierClaim {
  if (holders.length === 0) return 'record';
  if (ownerId !== undefined && holders.some((holder) => holder.owner_id === ownerId)) {
    return 'already_recorded';
  }
  return 'taken';
}

// ------------------------------------------------------------- dependencies

/**
 * What every service needs.
 *
 * The repository is the only way in: a service never touches the storage and never reads the
 * legacy collections. A `ScopedRepository` (P1-B03) judges the permission and the scope of
 * every read and write, so a service never has to.
 */
export interface ServiceDependencies {
  /** The repository every read and write goes through. */
  readonly repository: Repository;
  /** The actor recorded on the writes of this service; the repository's own actor when omitted. */
  readonly actor?: string;
  /** The clock of the service; the system clock when omitted. */
  readonly now?: () => Date;
}

// ------------------------------------------------------------------- people

export interface PhoneInput {
  /** The number in E.164 form, e.g. `+254711000000`. */
  readonly number: string;
  readonly label?: string;
}

export interface EmailInput {
  readonly address: string;
  readonly label?: string;
}

export interface AddressInput {
  readonly line1?: string;
  readonly line2?: string;
  readonly city?: string;
  readonly region?: string;
  readonly postal_code?: string;
  readonly country?: string;
}

/** The person fields of spec 02 §6.1, as a caller collects them. */
export interface PersonInput {
  readonly givenName: string;
  readonly middleNames?: readonly string[];
  readonly familyName: string;
  readonly preferredName?: string;
  readonly nameOrder?: NameOrder;
  readonly gender?: Gender;
  readonly dateOfBirth?: string;
  readonly nationality?: string;
  readonly languages?: readonly string[];
  readonly phones?: readonly PhoneInput[];
  readonly emails?: readonly EmailInput[];
  readonly address?: AddressInput;
}

/** The names of the person fields of the canonical person shape. */
export type PersonFieldName =
  | 'given_name'
  | 'middle_names'
  | 'family_name'
  | 'preferred_name'
  | 'name_order'
  | 'gender'
  | 'date_of_birth'
  | 'nationality'
  | 'languages'
  | 'phones'
  | 'emails'
  | 'address';

/** The person fields, as the canonical person shape holds them. */
export type PersonFields = Pick<WritableFields<'learner'>, PersonFieldName>;

/** The person fields of the canonical person shape, ready for a create or a patch. */
export function personFields(person: PersonInput): PersonFields {
  return {
    given_name: person.givenName,
    family_name: person.familyName,
    name_order: person.nameOrder ?? 'given_first',
    gender: person.gender ?? 'not_stated',
    ...(person.middleNames ? { middle_names: [...person.middleNames] } : {}),
    ...(person.preferredName ? { preferred_name: person.preferredName } : {}),
    ...(person.dateOfBirth ? { date_of_birth: person.dateOfBirth } : {}),
    ...(person.nationality ? { nationality: person.nationality } : {}),
    ...(person.languages ? { languages: [...person.languages] } : {}),
    ...(person.phones ? { phones: person.phones.map(toPhone) } : {}),
    ...(person.emails ? { emails: person.emails.map(toEmail) } : {}),
    ...(person.address ? { address: toAddress(person.address) } : {}),
  };
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

/**
 * The form a phone number is compared in.
 *
 * The canonical schema stores E.164, but a caller may collect `+254 711 000 000`. The
 * comparison drops the separators, so the same number written twice is the same number.
 */
export function normalisePhone(phone: string): string {
  return phone.trim().replace(/[\s().-]/g, '');
}

/** The phones of a row, in their comparison form. */
export function normalisedPhones(phones: readonly Phone[] | undefined): string[] {
  return (phones ?? []).map((phone) => normalisePhone(phone.number));
}

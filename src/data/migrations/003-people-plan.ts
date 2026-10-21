// ABOUTME: The plan that turns the legacy students and guardians into canonical learners,
// ABOUTME: guardians, links, identifiers and enrolments, de-duplicating guardians by phone.

import { generateUuidv7 } from '@/domain/ids';
import {
  jsonValueSchema,
  type Address,
  type Enrolment,
  type Guardian,
  type Identifier,
  type Learner,
  type LearnerGuardian,
} from '@/domain/schema';

import { canonicalTimestamp } from './001-legacy-calendar';
import type {
  LegacyGuardian,
  LegacyGuardianLink,
  LegacyLearner,
  PeoplePlanSource,
} from './003-legacy-people';
import {
  carriesParentalResponsibility,
  enrolmentStartDate,
  entryReason,
  guardianRelationship,
  learnerGender,
  learnerStatus,
  legacyNameParts,
  normaliseLegacyPhone,
  PHONE_COUNTRY,
  PHONE_NORMALISATION_RULE,
  type PersonNameParts,
} from './003-people-rules';

/** The canonical entities migration M3 writes. */
export const PEOPLE_ENTITIES = [
  'learner',
  'guardian',
  'learner_guardian',
  'identifier',
  'enrolment',
] as const;

export type PeopleEntity = (typeof PEOPLE_ENTITIES)[number];

/** The scheme the legacy UPI becomes (spec 02 §6.2, the country pack's KEMIS scheme). */
export const UPI_SCHEME = 'ke.kemis_upi';

/** The scheme a guardian's national id becomes; the scheme the rest of the build uses. */
export const NATIONAL_ID_SCHEME = 'national_id';

/** The label the migrated phones carry. */
const PHONE_LABEL = 'legacy';

/** A legacy row the plan could not map onto a canonical row. */
export interface PeopleUnmappableRow {
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalEntity: PeopleEntity;
  readonly reason: string;
  readonly detail?: string;
}

/** A problem the plan found. An error stops the migration; a warning is reported. */
export interface PeopleIssue {
  readonly code: string;
  readonly severity: 'warning' | 'error';
  readonly entity: PeopleEntity;
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly message: string;
}

/** The mapping between a legacy row and the canonical row it became. */
export interface PeopleMapEntry {
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalEntity: PeopleEntity;
  readonly canonicalId: string;
}

/** A canonical row the migration wrote, so the rollback knows what to remove. */
export interface CreatedRow {
  readonly entity: PeopleEntity;
  readonly id: string;
}

/** The rows one entity holds, counted before and after the migration. */
export type PeopleCounts = Record<PeopleEntity, number>;

/** The class group an enrolment was written into. */
export interface LearnerResolution {
  readonly learnerId: string;
  readonly legacyStreamId: string | null;
  readonly classGroupId: string;
  readonly levelId: string;
  readonly academicYearId: string;
  readonly programmeId: string;
}

/** Everything the plan decided. */
export interface PeopleMigrationPlan {
  readonly referenceTimestamp: string;
  readonly learners: readonly Learner[];
  readonly guardians: readonly Guardian[];
  readonly links: readonly LearnerGuardian[];
  readonly identifiers: readonly Identifier[];
  readonly enrolments: readonly Enrolment[];
  readonly mapping: readonly PeopleMapEntry[];
  readonly unmappable: readonly PeopleUnmappableRow[];
  readonly issues: readonly PeopleIssue[];
  readonly assumptions: readonly string[];
  readonly created: readonly CreatedRow[];
  readonly resolutions: readonly LearnerResolution[];
  readonly counts: {
    /** The legacy rows that could become a row of the entity. */
    readonly before: PeopleCounts;
    readonly planned: PeopleCounts;
  };
}

/** The options the plan needs. */
export interface PeoplePlanOptions {
  /** The timestamp the canonical audit columns carry. */
  readonly referenceTimestamp: string;
}

/** What the plan collects while it walks the legacy rows. */
interface PlanContext {
  readonly options: PeoplePlanOptions;
  readonly unmappable: PeopleUnmappableRow[];
  readonly issues: PeopleIssue[];
  readonly assumptions: string[];
  readonly mapping: PeopleMapEntry[];
}

function createPlanContext(options: PeoplePlanOptions): PlanContext {
  return { options, unmappable: [], issues: [], assumptions: [], mapping: [] };
}

function addUnmappable(
  context: PlanContext,
  legacyTable: string,
  legacyId: string,
  entity: PeopleEntity,
  reason: string,
  detail?: string
): void {
  // The same legacy row is read twice: once from its own table and once from the copy a
  // student row embeds. The report names the row once.
  const duplicate = context.unmappable.some(
    (row) => row.legacyId === legacyId && row.canonicalEntity === entity && row.reason === reason
  );
  if (duplicate) return;
  context.unmappable.push({
    legacyTable,
    legacyId,
    canonicalEntity: entity,
    reason,
    ...(detail === undefined ? {} : { detail }),
  });
}

function addIssue(
  context: PlanContext,
  severity: 'warning' | 'error',
  code: string,
  entity: PeopleEntity,
  legacyTable: string,
  legacyId: string,
  message: string
): void {
  const duplicate = context.issues.some(
    (issue) => issue.code === code && issue.legacyId === legacyId && issue.message === message
  );
  if (duplicate) return;
  context.issues.push({ code, severity, entity, legacyTable, legacyId, message });
}

/** A text column cut to the canonical column's limit, and whether it had to be cut. */
interface FittedText {
  readonly text: string;
  readonly cut: boolean;
}

function fitText(value: string, max: number): FittedText {
  const trimmed = value.trim();
  if (trimmed.length <= max) return { text: trimmed, cut: false };
  return { text: trimmed.slice(0, max).trim(), cut: true };
}

/** The email form the canonical person shape accepts. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The name the report and the canonical row use for a learner. */
function learnerLabel(learner: LegacyLearner): string {
  return learner.admissionNumber ?? learner.id;
}

/** The label the report uses for a guardian. */
export function guardianLabel(guardian: LegacyGuardian): string {
  return guardian.name ?? guardian.id;
}

/** The canonical learner status, with a warning when the legacy status is one M3 does not name. */
function learnerStatusOrWarn(
  context: PlanContext,
  learner: LegacyLearner
): ReturnType<typeof learnerStatus> {
  const mapping = learnerStatus(learner.status);
  if (!mapping.known) {
    addIssue(
      context,
      'warning',
      'learner_status_unknown',
      'learner',
      'students',
      learner.id,
      `the learner "${learnerLabel(learner)}" carries the status "${learner.status ?? ''}", which the canonical model does not name; the learner is written as enrolled`
    );
  }
  return mapping;
}

/** The residence status a legacy student category names. */
function residenceStatus(context: PlanContext, learner: LegacyLearner): Learner['residence_status'] {
  const category = learner.categoryName === null ? '' : learner.categoryName.toLowerCase();
  if (category.includes('weekly')) return 'weekly_boarder';
  if (category.includes('board')) return 'boarder';
  if (category.includes('day')) return 'day';
  if (learner.categoryName !== null) {
    addIssue(
      context,
      'warning',
      'residence_status_unreadable',
      'learner',
      'students',
      learner.id,
      `the learner "${learnerLabel(learner)}" carries the category "${learner.categoryName}", which names neither a boarder nor a day learner; the learner is written as a day learner`
    );
  }
  return 'day';
}

/** The attribute object the legacy learner's extra columns become. */
function learnerAttributes(learner: LegacyLearner): NonNullable<Learner['attributes']> | null {
  const attributes: NonNullable<Learner['attributes']> = {};
  if (learner.remarks !== null) attributes['legacy.remarks'] = learner.remarks;
  if (learner.religion !== null) attributes['legacy.religion'] = learner.religion;
  if (learner.categoryName !== null) attributes['legacy.student_category'] = learner.categoryName;
  if (learner.dormitoryName !== null) attributes['legacy.dormitory'] = learner.dormitoryName;
  if (learner.examSummary !== null) {
    try {
      const parsed = jsonValueSchema.safeParse(JSON.parse(learner.examSummary));
      if (parsed.success) attributes['ke.kcpe'] = parsed.data;
    } catch {
      // The legacy summary is not JSON. It stays in the legacy row; the migration does not
      // invent a shape for it.
    }
  }
  return Object.keys(attributes).length === 0 ? null : attributes;
}

/** The structured address a legacy free-text address becomes. */
function learnerAddress(learner: LegacyLearner, country: string | null): Address | null {
  const address: Address = {};
  if (learner.address !== null) address.line1 = fitText(learner.address, 200).text;
  if (learner.district !== null) address.line2 = fitText(learner.district, 200).text;
  if (learner.county !== null) address.region = fitText(learner.county, 100).text;
  if (country !== null && /^[A-Za-z]{2}$/.test(country)) address.country = country.toUpperCase();
  return Object.keys(address).length === 0 ? null : address;
}

/** The medical notes a legacy installation's column carries, as canonical conditions. */
function learnerMedical(learner: LegacyLearner): Learner['medical'] {
  if (learner.medicalNotes === null) return undefined;
  const conditions = learner.medicalNotes
    .split(/[;\n]/)
    .map((condition) => condition.trim())
    .filter((condition) => condition !== '');
  return conditions.length === 0 ? undefined : { conditions };
}

/** The phones a legacy text holds, in canonical form; an unreadable number is reported. */
function personPhones(
  context: PlanContext,
  raw: string | null,
  entity: 'learner' | 'guardian',
  legacyTable: string,
  legacyId: string,
  label: string
): NonNullable<Learner['phones']> {
  if (raw === null) return [];
  const normalised = normaliseLegacyPhone(raw);
  if (normalised.value !== null) return [{ number: normalised.value, label: PHONE_LABEL }];
  addIssue(
    context,
    'warning',
    'phone_not_normalisable',
    entity,
    legacyTable,
    legacyId,
    `the ${entity} "${label}": ${normalised.rule}; the number is not carried into the canonical row`
  );
  return [];
}

/** The emails a legacy text holds, in canonical form; an unreadable address is reported. */
function personEmails(
  context: PlanContext,
  raw: string | null,
  entity: 'learner' | 'guardian',
  legacyTable: string,
  legacyId: string,
  label: string
): NonNullable<Learner['emails']> {
  if (raw === null) return [];
  const address = raw.trim();
  if (EMAIL.test(address)) return [{ address }];
  addIssue(
    context,
    'warning',
    'email_not_valid',
    entity,
    legacyTable,
    legacyId,
    `the ${entity} "${label}" carries the email "${address}", which is not a valid address; it is not carried into the canonical row`
  );
  return [];
}

/**
 * What a legacy learner row can become, and why it cannot when it cannot.
 *
 * The admission number is the canonical learner's unique key, so the first learner that names
 * one keeps it and a later row that names the same number is reported, never merged.
 */
export interface LearnerVerdict {
  readonly learner: LegacyLearner;
  readonly admissionNumber: string | null;
  readonly givenName: string | null;
  readonly middleNames: readonly string[];
  readonly familyName: string | null;
  /** Why the row cannot become a learner; null when it can. */
  readonly problem: string | null;
  /** What the row names, for the unmappable report. */
  readonly detail: string;
}

/** Judges every legacy learner row, in the order the migration walks them. */
export function judgeLearners(learners: readonly LegacyLearner[]): LearnerVerdict[] {
  const admissionOwners = new Map<string, string>();
  const verdicts: LearnerVerdict[] = [];
  for (const learner of learners) {
    const admissionNumber = learner.admissionNumber === null ? null : learner.admissionNumber.trim();
    const firstName = learner.firstName === null ? '' : learner.firstName.trim();
    const lastName = learner.lastName === null ? '' : learner.lastName.trim();
    const middleName = learner.middleName === null ? '' : learner.middleName.trim();
    const name = `${firstName} ${lastName}`.trim();

    let problem: string | null = null;
    if (admissionNumber === null || admissionNumber === '') {
      problem = `the learner "${learner.id}" carries no admission number, which the canonical learner requires`;
    } else {
      const key = admissionNumber.toLowerCase();
      const owner = admissionOwners.get(key);
      if (owner !== undefined) {
        problem = `the admission number "${admissionNumber}" is already held by the learner "${owner}"`;
      } else {
        admissionOwners.set(key, admissionNumber);
      }
    }
    if (problem === null && firstName === '') {
      problem = `the learner "${learnerLabel(learner)}" carries no first name`;
    }
    if (problem === null && lastName === '') {
      problem = `the learner "${learnerLabel(learner)}" carries no last name`;
    }

    verdicts.push({
      learner,
      admissionNumber,
      givenName: firstName === '' ? null : firstName,
      middleNames: middleName === '' ? [] : [middleName],
      familyName: lastName === '' ? null : lastName,
      problem,
      detail: name === '' ? `the legacy row is "${learner.id}"` : `the legacy row names "${name}"`,
    });
  }
  return verdicts;
}

/** What a legacy guardian row can become, and why it cannot when it cannot. */
export interface GuardianVerdict {
  readonly guardian: LegacyGuardian;
  readonly name: PersonNameParts | null;
  /** Why the row cannot become a guardian; null when it can. */
  readonly problem: string | null;
}

/**
 * The identity the guardian count and the plan share: the normalised phone when the row has
 * one, and the legacy row itself when it does not. Two rows with one phone are one guardian;
 * a row with no phone is never merged into a bucket of the others.
 */
export function guardianIdentityKey(guardian: LegacyGuardian): string {
  return guardian.normalisedPhone ?? `legacy:${guardian.id}`;
}

/** Judges every legacy guardian row. */
export function judgeGuardians(guardians: readonly LegacyGuardian[]): GuardianVerdict[] {
  return guardians.map((guardian) => {
    const name = legacyNameParts(guardian.name);
    let problem: string | null = null;
    if (name === null) {
      problem = `the guardian "${guardian.id}" carries no name`;
    } else if (name.familyName === null) {
      problem = `the guardian name "${guardian.name ?? ''}" is one word, so the migration cannot read a family name`;
    }
    if (problem === null && guardian.normalisedPhone === null) {
      const normalised = normaliseLegacyPhone(guardian.phone);
      problem = `the guardian "${guardianLabel(guardian)}" has no phone the migration can normalise (${normalised.rule}), so it cannot be told apart from the guardian another row names`;
    }
    return { guardian, name, problem };
  });
}

/** One learner-and-guardian statement, after the relationship and embedded copies are merged. */
export interface MergedLegacyLink {
  readonly learnerId: string;
  readonly guardianId: string;
  readonly isPrimary: boolean;
  readonly relationshipType: string | null;
  readonly canPickUp: boolean | null;
  readonly receivesCommunication: boolean | null;
  /** The relationship row that named the pair; null when only an embedded copy did. */
  readonly relationshipRowId: string | null;
  /** Relationship rows that named the same pair and were folded into it. */
  readonly foldedRelationshipRowIds: readonly string[];
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/**
 * Folds every statement that one learner has one guardian into a single link.
 *
 * The canonical model holds one learner_guardian row per learner and guardian, so the
 * relationship table and the student's embedded copy are one statement, not two. The first
 * flag a source carries wins; a flag no source carries stays null.
 */
export function mergeLegacyLinks(links: readonly LegacyGuardianLink[]): MergedLegacyLink[] {
  const byPair = new Map<string, MergedLegacyLink>();
  for (const link of links) {
    const key = `${link.learnerId}::${link.guardianId}`;
    const existing = byPair.get(key);
    if (existing === undefined) {
      byPair.set(key, {
        learnerId: link.learnerId,
        guardianId: link.guardianId,
        isPrimary: link.isPrimary,
        relationshipType: link.relationshipType,
        canPickUp: link.canPickUp,
        receivesCommunication: link.receivesCommunication,
        relationshipRowId: link.id,
        foldedRelationshipRowIds: [],
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      });
      continue;
    }
    const folded =
      link.id !== null && link.id !== existing.relationshipRowId
        ? [...existing.foldedRelationshipRowIds, link.id]
        : existing.foldedRelationshipRowIds;
    byPair.set(key, {
      ...existing,
      isPrimary: existing.isPrimary || link.isPrimary,
      relationshipType: existing.relationshipType ?? link.relationshipType,
      canPickUp: existing.canPickUp ?? link.canPickUp,
      receivesCommunication: existing.receivesCommunication ?? link.receivesCommunication,
      relationshipRowId: existing.relationshipRowId ?? link.id,
      foldedRelationshipRowIds: folded,
      createdAt: existing.createdAt ?? link.createdAt,
      updatedAt: existing.updatedAt ?? link.updatedAt,
    });
  }

  const merged = [...byPair.values()];
  merged.sort((left, right) => {
    const byLearner = left.learnerId.localeCompare(right.learnerId);
    if (byLearner !== 0) return byLearner;
    if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
    return left.guardianId.localeCompare(right.guardianId);
  });
  return merged;
}

/** The learner rows the plan wrote, with the legacy row each came from. */
interface PlannedLearners {
  readonly rows: readonly Learner[];
  readonly idByLegacyId: ReadonlyMap<string, string>;
}

/** Writes a canonical learner for every legacy student the plan can name. */
function planLearners(
  context: PlanContext,
  source: PeoplePlanSource,
  institutionId: string
): PlannedLearners {
  const timestamp = context.options.referenceTimestamp;
  const rows: Learner[] = [];
  const idByLegacyId = new Map<string, string>();

  for (const verdict of judgeLearners(source.learners)) {
    const learner = verdict.learner;
    if (verdict.problem !== null || verdict.givenName === null || verdict.familyName === null) {
      addUnmappable(
        context,
        'students',
        learner.id,
        'learner',
        verdict.problem ?? `the learner "${learner.id}" carries no name`,
        verdict.detail
      );
      continue;
    }

    const given = fitText(verdict.givenName, 100);
    const family = fitText(verdict.familyName, 100);
    const middles = verdict.middleNames
      .map((middle) => fitText(middle, 100))
      .filter((middle) => middle.text !== '');
    if (given.cut || family.cut || middles.some((middle) => middle.cut)) {
      addIssue(
        context,
        'warning',
        'name_truncated',
        'learner',
        'students',
        learner.id,
        `the learner "${learnerLabel(learner)}" carries a name longer than 100 characters; it is cut to the canonical column's length`
      );
    }

    const status = learnerStatusOrWarn(context, learner);
    const phones = personPhones(context, learner.phone, 'learner', 'students', learner.id, learnerLabel(learner));
    const emails = personEmails(context, learner.email, 'learner', 'students', learner.id, learnerLabel(learner));
    const address = learnerAddress(learner, source.institutionCountry);
    const attributes = learnerAttributes(learner);
    const medical = learnerMedical(learner);
    const previousSchool =
      learner.previousSchool === null ? null : fitText(learner.previousSchool, 200).text;

    const row: Learner = {
      id: generateUuidv7(),
      institution_id: institutionId,
      given_name: given.text,
      ...(middles.length === 0 ? {} : { middle_names: middles.map((middle) => middle.text) }),
      family_name: family.text,
      name_order: 'given_first',
      gender: learnerGender(learner.gender),
      ...(learner.dateOfBirth === null ? {} : { date_of_birth: learner.dateOfBirth }),
      ...(phones.length === 0 ? {} : { phones }),
      ...(emails.length === 0 ? {} : { emails }),
      ...(address === null ? {} : { address }),
      ...(attributes === null ? {} : { attributes }),
      admission_number: verdict.admissionNumber ?? learner.id,
      ...(learner.admissionDate === null ? {} : { admission_date: learner.admissionDate }),
      status: status.learnerStatus,
      residence_status: residenceStatus(context, learner),
      ...(medical === undefined ? {} : { medical }),
      ...(previousSchool === null ? {} : { previous_school: previousSchool }),
      created_at: canonicalTimestamp(learner.createdAt, timestamp),
      updated_at: canonicalTimestamp(learner.updatedAt, timestamp),
    };

    rows.push(row);
    idByLegacyId.set(learner.id, row.id);
    context.mapping.push({
      legacyTable: 'students',
      legacyId: learner.id,
      canonicalEntity: 'learner',
      canonicalId: row.id,
    });
  }

  return { rows, idByLegacyId };
}

/** A canonical guardian and the legacy row it came from. */
interface PlannedGuardians {
  readonly rows: readonly Guardian[];
  readonly idByLegacyId: ReadonlyMap<string, string>;
  /** The legacy guardians that have no canonical row, for any reason. */
  readonly unmappableIds: ReadonlySet<string>;
}

/** Claims one identifier value for one owner; a value another owner holds is reported. */
function claimIdentifier(
  context: PlanContext,
  owners: Map<string, { ownerId: string; label: string }>,
  rows: Identifier[],
  institutionId: string,
  claim: {
    scheme: string;
    value: string;
    ownerType: Identifier['owner_type'];
    ownerId: string;
    legacyTable: string;
    legacyId: string;
    label: string;
  }
): void {
  const key = `${claim.scheme}::${claim.value}`;
  const holder = owners.get(key);
  if (holder !== undefined) {
    if (holder.ownerId === claim.ownerId) return;
    addUnmappable(
      context,
      claim.legacyTable,
      claim.legacyId,
      'identifier',
      `the ${claim.scheme} identifier "${claim.value}" is already held by ${holder.label}; one value names one owner`,
      `the row names ${claim.label}`
    );
    return;
  }
  owners.set(key, { ownerId: claim.ownerId, label: claim.label });

  const timestamp = context.options.referenceTimestamp;
  const row: Identifier = {
    id: generateUuidv7(),
    institution_id: institutionId,
    owner_type: claim.ownerType,
    owner_id: claim.ownerId,
    scheme: claim.scheme,
    value: claim.value,
    created_at: timestamp,
    updated_at: timestamp,
  };
  rows.push(row);
  context.mapping.push({
    legacyTable: claim.legacyTable,
    legacyId: claim.legacyId,
    canonicalEntity: 'identifier',
    canonicalId: row.id,
  });
}

/** Writes a canonical guardian per phone. */
function planGuardians(
  context: PlanContext,
  source: PeoplePlanSource,
  institutionId: string
): PlannedGuardians {
  const timestamp = context.options.referenceTimestamp;
  const rows: Guardian[] = [];
  const idByLegacyId = new Map<string, string>();
  const unmappableIds = new Set<string>();
  const idByPhone = new Map<string, string>();
  const ownerByPhone = new Map<string, string>();

  for (const verdict of judgeGuardians(source.guardians)) {
    const guardian = verdict.guardian;
    if (verdict.problem !== null || verdict.name === null || verdict.name.familyName === null) {
      unmappableIds.add(guardian.id);
      addUnmappable(
        context,
        guardian.legacyTable,
        guardian.id,
        'guardian',
        verdict.problem ?? `the guardian "${guardian.id}" carries no name`,
        guardian.learnerId === null
          ? undefined
          : `the guardian is the one the learner "${guardian.learnerId}" carries`
      );
      continue;
    }

    const phone = guardian.normalisedPhone;
    if (phone === null) continue;

    const owner = idByPhone.get(phone);
    if (owner !== undefined) {
      // One phone is one guardian. The copy is not lost: the merge is reported with the name
      // each row carried, so an operator can see that the legacy data named the person twice.
      idByLegacyId.set(guardian.id, owner);
      if (guardian.id !== ownerByPhone.get(phone)) {
        addIssue(
          context,
          'warning',
          'guardian_merged',
          'guardian',
          guardian.legacyTable,
          guardian.id,
          `the guardian "${guardianLabel(guardian)}" shares the phone "${phone}" with "${ownerByPhone.get(phone) ?? ''}"; the migration wrote one guardian`
        );
      }
      continue;
    }

    const given = fitText(verdict.name.givenName, 100);
    const family = fitText(verdict.name.familyName, 100);
    const middles = verdict.name.middleNames
      .map((middle) => fitText(middle, 100))
      .filter((middle) => middle.text !== '');
    if (given.cut || family.cut || middles.some((middle) => middle.cut)) {
      addIssue(
        context,
        'warning',
        'name_truncated',
        'guardian',
        guardian.legacyTable,
        guardian.id,
        `the guardian "${guardianLabel(guardian)}" carries a name longer than 100 characters; it is cut to the canonical column's length`
      );
    }

    const emails = personEmails(
      context,
      guardian.email,
      'guardian',
      guardian.legacyTable,
      guardian.id,
      guardianLabel(guardian)
    );
    const address: Address = {};
    if (guardian.address !== null) address.line1 = fitText(guardian.address, 200).text;
    if (guardian.location !== null) address.city = fitText(guardian.location, 100).text;
    if (source.institutionCountry !== null && /^[A-Za-z]{2}$/.test(source.institutionCountry)) {
      address.country = source.institutionCountry.toUpperCase();
    }

    const row: Guardian = {
      id: generateUuidv7(),
      institution_id: institutionId,
      given_name: given.text,
      ...(middles.length === 0 ? {} : { middle_names: middles.map((middle) => middle.text) }),
      family_name: family.text,
      name_order: 'given_first',
      gender: 'not_stated',
      phones: [{ number: phone, label: PHONE_LABEL }],
      ...(emails.length === 0 ? {} : { emails }),
      ...(Object.keys(address).length === 0 ? {} : { address }),
      ...(guardian.nationalId === null ? {} : { national_id: guardian.nationalId }),
      created_at: canonicalTimestamp(guardian.createdAt, timestamp),
      updated_at: canonicalTimestamp(guardian.updatedAt, timestamp),
    };

    rows.push(row);
    idByPhone.set(phone, row.id);
    ownerByPhone.set(phone, guardian.id);
    idByLegacyId.set(guardian.id, row.id);
    context.mapping.push({
      legacyTable: guardian.legacyTable,
      legacyId: guardian.id,
      canonicalEntity: 'guardian',
      canonicalId: row.id,
    });
  }

  return { rows, idByLegacyId, unmappableIds };
}

/** The identifiers each learner's UPI becomes. */
function planLearnerIdentifiers(
  context: PlanContext,
  source: PeoplePlanSource,
  learners: PlannedLearners,
  identifiers: Identifier[],
  owners: Map<string, { ownerId: string; label: string }>,
  institutionId: string
): void {
  for (const verdict of judgeLearners(source.learners)) {
    const learner = verdict.learner;
    const learnerId = learners.idByLegacyId.get(learner.id);
    if (learnerId === undefined || learner.upi === null) continue;
    claimIdentifier(context, owners, identifiers, institutionId, {
      scheme: UPI_SCHEME,
      value: learner.upi,
      ownerType: 'learner',
      ownerId: learnerId,
      legacyTable: 'students',
      legacyId: learner.id,
      label: `the learner "${learnerLabel(learner)}"`,
    });
  }
}

/** The identifiers each guardian's national id becomes. */
function planGuardianIdentifiers(
  context: PlanContext,
  source: PeoplePlanSource,
  guardians: PlannedGuardians,
  identifiers: Identifier[],
  owners: Map<string, { ownerId: string; label: string }>,
  institutionId: string
): void {
  for (const verdict of judgeGuardians(source.guardians)) {
    const guardian = verdict.guardian;
    const guardianId = guardians.idByLegacyId.get(guardian.id);
    if (guardianId === undefined || guardian.nationalId === null) continue;
    claimIdentifier(context, owners, identifiers, institutionId, {
      scheme: NATIONAL_ID_SCHEME,
      value: guardian.nationalId,
      ownerType: 'guardian',
      ownerId: guardianId,
      legacyTable: guardian.legacyTable,
      legacyId: guardian.id,
      label: `the guardian "${guardianLabel(guardian)}"`,
    });
  }
}

/** One link, with the canonical guardian the legacy rows resolve to. */
interface CandidateLink {
  readonly learnerId: string;
  readonly guardianId: string;
  readonly legacyGuardianIds: readonly string[];
  readonly isPrimary: boolean;
  readonly relationshipType: string | null;
  readonly canPickUp: boolean | null;
  readonly receivesCommunication: boolean | null;
  readonly relationshipRowId: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/** Folds the links that resolve to one canonical learner and guardian into one candidate. */
function candidateLinks(
  context: PlanContext,
  source: PeoplePlanSource,
  learners: PlannedLearners,
  guardians: PlannedGuardians
): Map<string, CandidateLink[]> {
  const byLearner = new Map<string, CandidateLink[]>();
  const byKey = new Map<string, CandidateLink>();

  for (const link of mergeLegacyLinks(source.links)) {
    if (!learners.idByLegacyId.has(link.learnerId)) continue;
    const guardianId = guardians.idByLegacyId.get(link.guardianId);
    if (guardianId === undefined) {
      if (guardians.unmappableIds.has(link.guardianId)) {
        addUnmappable(
          context,
          link.relationshipRowId === null ? 'students' : 'student_guardian_relationships',
          link.relationshipRowId ?? link.learnerId,
          'learner_guardian',
          `the guardian "${link.guardianId}" could not be migrated, so the learner's link to it could not be written`,
          `the learner "${link.learnerId}" names the guardian`
        );
      } else {
        addUnmappable(
          context,
          link.relationshipRowId === null ? 'students' : 'student_guardian_relationships',
          link.relationshipRowId ?? link.learnerId,
          'learner_guardian',
          `the legacy database holds no guardian "${link.guardianId}" for the relationship`,
          `the learner "${link.learnerId}" names the guardian`
        );
      }
      continue;
    }
    for (const folded of link.foldedRelationshipRowIds) {
      addIssue(
        context,
        'warning',
        'learner_guardian_merged',
        'learner_guardian',
        'student_guardian_relationships',
        folded,
        `the relationship "${folded}" names a pair the migration had already read; one learner_guardian row links the learner "${link.learnerId}" and the guardian "${link.guardianId}"`
      );
    }

    const key = `${link.learnerId}::${guardianId}`;
    const existing = byKey.get(key);
    if (existing === undefined) {
      const candidate: CandidateLink = {
        learnerId: link.learnerId,
        guardianId,
        legacyGuardianIds: [link.guardianId],
        isPrimary: link.isPrimary,
        relationshipType: link.relationshipType,
        canPickUp: link.canPickUp,
        receivesCommunication: link.receivesCommunication,
        relationshipRowId: link.relationshipRowId,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      };
      byKey.set(key, candidate);
      const list = byLearner.get(link.learnerId) ?? [];
      list.push(candidate);
      byLearner.set(link.learnerId, list);
      continue;
    }
    // Two legacy guardian rows can name one guardian (the same phone). The canonical model
    // holds one link, so the second statement is folded in and reported.
    addIssue(
      context,
      'warning',
      'learner_guardian_merged',
      'learner_guardian',
      'parents_guardians',
      link.guardianId,
      `the guardian "${link.guardianId}" is the guardian "${existing.legacyGuardianIds[0]}" the learner "${link.learnerId}" already names; the migration wrote one link`
    );
    const merged: CandidateLink = {
      ...existing,
      legacyGuardianIds: [...existing.legacyGuardianIds, link.guardianId],
      isPrimary: existing.isPrimary || link.isPrimary,
      relationshipType: existing.relationshipType ?? link.relationshipType,
      canPickUp: existing.canPickUp ?? link.canPickUp,
      receivesCommunication: existing.receivesCommunication ?? link.receivesCommunication,
      relationshipRowId: existing.relationshipRowId ?? link.relationshipRowId,
      createdAt: existing.createdAt ?? link.createdAt,
      updatedAt: existing.updatedAt ?? link.updatedAt,
    };
    byKey.set(key, merged);
    const list = byLearner.get(link.learnerId) ?? [];
    const position = list.findIndex((entry) => entry.guardianId === guardianId);
    if (position >= 0) list[position] = merged;
    else list.push(merged);
    byLearner.set(link.learnerId, list);
  }

  return byLearner;
}

/** Writes one learner_guardian row per learner and guardian. */
function planLinks(
  context: PlanContext,
  source: PeoplePlanSource,
  institutionId: string,
  learners: PlannedLearners,
  guardians: PlannedGuardians
): LearnerGuardian[] {
  const timestamp = context.options.referenceTimestamp;
  const rows: LearnerGuardian[] = [];
  const byLearner = candidateLinks(context, source, learners, guardians);

  for (const [learnerLegacyId, links] of byLearner) {
    const learnerId = learners.idByLegacyId.get(learnerLegacyId);
    if (learnerId === undefined) continue;

    // The canonical model names one primary guardian: a second one is reported and kept as a
    // secondary link, and a learner with no primary gets the first link as its primary.
    const primaries = links.filter((link) => link.isPrimary);
    let primaryId = primaries[0]?.guardianId ?? null;
    if (primaries.length > 1) {
      for (const extra of primaries.slice(1)) {
        addIssue(
          context,
          'warning',
          'learner_guardian_multiple_primary',
          'learner_guardian',
          'parents_guardians',
          extra.legacyGuardianIds[0],
          `the learner "${learnerLegacyId}" names two primary guardians; "${primaries[0]?.legacyGuardianIds[0] ?? ''}" stays primary and "${extra.legacyGuardianIds[0]}" is written as a secondary link`
        );
      }
    } else if (primaries.length === 0 && links.length > 0) {
      primaryId = links[0].guardianId;
      addIssue(
        context,
        'warning',
        'learner_guardian_no_primary',
        'learner_guardian',
        'parents_guardians',
        links[0].legacyGuardianIds[0],
        `no guardian of the learner "${learnerLegacyId}" is marked primary; "${links[0].legacyGuardianIds[0]}" is written as the primary guardian`
      );
    }

    links.forEach((link, index) => {
      const relationship = guardianRelationship(link.relationshipType);
      const isPrimary = link.guardianId === primaryId;
      const row: LearnerGuardian = {
        id: generateUuidv7(),
        institution_id: institutionId,
        learner_id: learnerId,
        guardian_id: link.guardianId,
        relationship,
        is_primary: isPrimary,
        has_parental_responsibility: carriesParentalResponsibility(relationship, isPrimary),
        is_fee_payer: isPrimary,
        can_pick_up: link.canPickUp ?? link.isPrimary,
        receives_reports: link.receivesCommunication ?? true,
        receives_sms: link.receivesCommunication ?? true,
        preferred_channel: 'sms',
        priority: index,
        created_at: canonicalTimestamp(link.createdAt, timestamp),
        updated_at: canonicalTimestamp(link.updatedAt, timestamp),
      };
      rows.push(row);
      // Every link is in the id map: the relationship row that named it when there is one,
      // and the student row whose embedded guardian it came from when there is not.
      context.mapping.push({
        legacyTable:
          link.relationshipRowId === null ? 'students' : 'student_guardian_relationships',
        legacyId: link.relationshipRowId ?? learnerLegacyId,
        canonicalEntity: 'learner_guardian',
        canonicalId: row.id,
      });
    });
  }

  return rows;
}

/** Writes the enrolment of a learner into the class group its stream became. */
function planEnrolments(
  context: PlanContext,
  source: PeoplePlanSource,
  learners: PlannedLearners,
  institutionId: string
): { rows: Enrolment[]; resolutions: LearnerResolution[] } {
  const timestamp = context.options.referenceTimestamp;
  const rows: Enrolment[] = [];
  const resolutions: LearnerResolution[] = [];
  const classGroupById = new Map(source.classGroups.map((group) => [group.id, group]));
  const yearById = new Map(source.years.map((year) => [year.id, year]));

  for (const legacy of source.learners) {
    const learnerId = learners.idByLegacyId.get(legacy.id);
    if (learnerId === undefined) continue;

    if (legacy.streamId === null) {
      addUnmappable(
        context,
        'students',
        legacy.id,
        'enrolment',
        `the learner "${learnerLabel(legacy)}" points at no class stream, so the migration cannot place them in a class`,
        legacy.className === null ? undefined : `the legacy row names the class "${legacy.className}"`
      );
      continue;
    }
    const classGroupId = source.classGroupByStream.get(legacy.streamId);
    if (classGroupId === undefined) {
      addUnmappable(
        context,
        'students',
        legacy.id,
        'enrolment',
        `the class stream "${legacy.streamId}" is not one migration M2 mapped to a class group`,
        legacy.className === null
          ? undefined
          : `the legacy row names the class "${legacy.className}" and the stream "${legacy.streamName ?? ''}"`
      );
      continue;
    }
    const classGroup = classGroupById.get(classGroupId);
    if (classGroup === undefined) {
      addUnmappable(
        context,
        'students',
        legacy.id,
        'enrolment',
        `the class group "${classGroupId}" of the class stream "${legacy.streamId}" is not one the database holds`
      );
      continue;
    }
    const year = yearById.get(classGroup.academicYearId);
    if (year === undefined) {
      addUnmappable(
        context,
        'students',
        legacy.id,
        'enrolment',
        `the academic year "${classGroup.academicYearId}" of the class group "${classGroup.name}" is not one the database holds`
      );
      continue;
    }

    const status = learnerStatus(legacy.status);
    const row: Enrolment = {
      id: generateUuidv7(),
      institution_id: institutionId,
      learner_id: learnerId,
      academic_year_id: classGroup.academicYearId,
      programme_id: classGroup.programmeId,
      level_id: classGroup.levelId,
      class_group_id: classGroup.id,
      status: status.enrolmentStatus,
      start_date: enrolmentStartDate(
        legacy.admissionDate,
        year.startDate,
        year.endDate,
        status.exitReason !== null
      ),
      end_date: status.exitReason === null ? null : year.endDate,
      entry_reason: entryReason(legacy.admissionDate, year.startDate),
      exit_reason: status.exitReason,
      created_at: canonicalTimestamp(legacy.createdAt, timestamp),
      updated_at: canonicalTimestamp(legacy.updatedAt, timestamp),
    };
    rows.push(row);
    resolutions.push({
      learnerId: legacy.id,
      legacyStreamId: legacy.streamId,
      classGroupId: classGroup.id,
      levelId: classGroup.levelId,
      academicYearId: classGroup.academicYearId,
      programmeId: classGroup.programmeId,
    });
    context.mapping.push({
      legacyTable: 'students',
      legacyId: legacy.id,
      canonicalEntity: 'enrolment',
      canonicalId: row.id,
    });
  }

  return { rows, resolutions };
}

/** The distinct identifier values the legacy rows name. */
export function legacyIdentifierValues(source: PeoplePlanSource): Set<string> {
  const values = new Set<string>();
  for (const verdict of judgeLearners(source.learners)) {
    if (verdict.problem !== null || verdict.learner.upi === null) continue;
    values.add(`${UPI_SCHEME}::${verdict.learner.upi}`);
  }
  for (const verdict of judgeGuardians(source.guardians)) {
    if (verdict.problem !== null || verdict.guardian.nationalId === null) continue;
    values.add(`${NATIONAL_ID_SCHEME}::${verdict.guardian.nationalId}`);
  }
  return values;
}

/** The links one learner's legacy rows name, for the count check. */
export function legacyLinkPairs(
  source: PeoplePlanSource,
  learners: readonly LearnerVerdict[]
): readonly MergedLegacyLink[] {
  const writable = new Set(
    learners.filter((verdict) => verdict.problem === null).map((verdict) => verdict.learner.id)
  );
  return mergeLegacyLinks(source.links).filter((link) => writable.has(link.learnerId));
}

/**
 * Plans the learners, guardians, links, identifiers and enrolments.
 *
 * The function is pure: it reads nothing and writes nothing, so the same legacy rows and the
 * same canonical class groups always produce the same plan. Nothing is invented: a student
 * without a name is reported rather than half-written, a guardian without a phone is reported
 * rather than merged into a bucket of the others, and a class stream migration M2 did not map
 * is reported rather than guessed at.
 */
export function planPeopleMigration(
  source: PeoplePlanSource,
  options: PeoplePlanOptions
): PeopleMigrationPlan {
  const context = createPlanContext(options);

  if (source.institutionId === null) {
    addIssue(
      context,
      'error',
      'no_institution',
      'learner',
      'institution',
      '',
      'the canonical institution table is empty, so no learner can be attached to a school; migration M1 has to run first'
    );
    return {
      referenceTimestamp: options.referenceTimestamp,
      learners: [],
      guardians: [],
      links: [],
      identifiers: [],
      enrolments: [],
      mapping: [],
      unmappable: [],
      issues: context.issues,
      assumptions: [],
      created: [],
      resolutions: [],
      counts: {
        before: { learner: 0, guardian: 0, learner_guardian: 0, identifier: 0, enrolment: 0 },
        planned: { learner: 0, guardian: 0, learner_guardian: 0, identifier: 0, enrolment: 0 },
      },
    };
  }

  const institutionId = source.institutionId;
  context.assumptions.push(PHONE_NORMALISATION_RULE);
  if (
    source.institutionCountry !== null &&
    source.institutionCountry.toUpperCase() !== PHONE_COUNTRY
  ) {
    addIssue(
      context,
      'warning',
      'phone_rule_assumes_kenya',
      'guardian',
      'parents_guardians',
      '',
      `the institution's country is "${source.institutionCountry}"; the national phone format the guardian de-duplication reads is ${PHONE_COUNTRY}'s (+254 numbers take the country code)`
    );
  }

  const learners = planLearners(context, source, institutionId);
  const guardians = planGuardians(context, source, institutionId);

  const identifiers: Identifier[] = [];
  const identifierOwners = new Map<string, { ownerId: string; label: string }>();
  planLearnerIdentifiers(context, source, learners, identifiers, identifierOwners, institutionId);
  planGuardianIdentifiers(context, source, guardians, identifiers, identifierOwners, institutionId);

  const links = planLinks(context, source, institutionId, learners, guardians);
  const enrolments = planEnrolments(context, source, learners, institutionId);

  context.assumptions.push(
    'the legacy rows carry no per-year enrolment history: one enrolment is written per learner, in the academic year of the class group the learner\'s class stream became'
  );
  context.assumptions.push(
    'an enrolment starts on the admission date the legacy learner row carries, and on the academic year start when it carries none or carries a date after the year the enrolment belongs to'
  );
  context.assumptions.push(
    'learner_guardian.has_parental_responsibility is true for the primary guardian and for a mother, father or guardian relationship: the legacy row carries no such flag'
  );
  context.assumptions.push(
    'learner_guardian.is_fee_payer is true for the primary guardian; the legacy row expresses no fee payer'
  );
  context.assumptions.push(
    'learner_guardian.preferred_channel is sms, and receives_reports and receives_sms follow the legacy receives_communication flag: the legacy school reaches guardians by SMS'
  );
  context.assumptions.push(
    'learner.residence_status is read from the legacy student category (Boarder, Day Scholar, Weekly Boarder)'
  );
  context.assumptions.push(
    'the legacy student_type, class_admitted, stream_admitted and marks_attained_primary columns are not carried into the canonical row; the legacy row keeps them'
  );

  const before: PeopleCounts = {
    learner: source.learners.length,
    guardian: new Set(source.guardians.map(guardianIdentityKey)).size,
    learner_guardian: legacyLinkPairs(source, judgeLearners(source.learners)).length,
    identifier: legacyIdentifierValues(source).size,
    enrolment: learners.rows.length,
  };
  const planned: PeopleCounts = {
    learner: learners.rows.length,
    guardian: guardians.rows.length,
    learner_guardian: links.length,
    identifier: identifiers.length,
    enrolment: enrolments.rows.length,
  };

  const created: CreatedRow[] = [
    ...learners.rows.map((row) => ({ entity: 'learner' as const, id: row.id })),
    ...guardians.rows.map((row) => ({ entity: 'guardian' as const, id: row.id })),
    ...identifiers.map((row) => ({ entity: 'identifier' as const, id: row.id })),
    ...links.map((row) => ({ entity: 'learner_guardian' as const, id: row.id })),
    ...enrolments.rows.map((row) => ({ entity: 'enrolment' as const, id: row.id })),
  ];

  return {
    referenceTimestamp: options.referenceTimestamp,
    learners: learners.rows,
    guardians: guardians.rows,
    links,
    identifiers,
    enrolments: enrolments.rows,
    mapping: context.mapping,
    unmappable: context.unmappable,
    issues: context.issues,
    assumptions: context.assumptions,
    created,
    resolutions: enrolments.resolutions,
    counts: { before, planned },
  };
}

// ABOUTME: The admission form: the values the registrar collects, the validation the canonical
// ABOUTME: schemas give them, the admission input the service takes, and the field a refusal names.

import { z } from 'zod/v4';

import {
  RepositoryConflictError,
  RepositoryInvariantError,
  RepositoryValidationError,
} from '@/data/repository';
import { identifierSchemesFor, validateIdentifier, type OwnerType } from '@/domain/country';
import { asId } from '@/domain/ids';
import {
  GENDERS,
  GUARDIAN_RELATIONSHIPS,
  classGroupSchema,
  guardianSchema,
  learnerSchema,
  levelSchema,
  programmeSchema,
  phoneSchema,
} from '@/domain/schema';
import { ENTRY_REASONS } from '@/domain/schema';
import {
  ServiceError,
  type EntryReason,
  type GuardianRelationship,
  type ResidenceStatus,
} from '@/domain/services';
import type {
  AdmissionGuardianInput,
  AdmissionIdentifierInput,
  AdmissionInput,
} from '@/domain/services';

/** The guardian fields of one row of the admission form. */
export interface GuardianDraftValues {
  /** The guardian the school already knows; empty when the admission creates the person. */
  readonly id: string;
  readonly given_name: string;
  readonly family_name: string;
  readonly relationship: string;
  readonly phone: string;
}

/** What the registrar types into the admission form. */
export interface AdmissionFormValues {
  readonly given_name: string;
  readonly family_name: string;
  readonly gender: string;
  readonly date_of_birth: string;
  readonly residence_status: string;
  readonly previous_school: string;
  readonly programme_id: string;
  readonly level_id: string;
  readonly class_group_id: string;
  readonly start_date: string;
  readonly entry_reason: string;
  readonly guardians: readonly GuardianDraftValues[];
  readonly identifier_scheme: string;
  readonly identifier_value: string;
  readonly guardian_identifier_scheme: string;
  readonly guardian_identifier_value: string;
}

/** An empty guardian row. */
export function emptyGuardianDraft(): GuardianDraftValues {
  return {
    id: '',
    given_name: '',
    family_name: '',
    relationship: 'mother',
    phone: '',
  };
}

/** The empty admission form. */
export function emptyAdmissionForm(today = new Date()): AdmissionFormValues {
  return {
    given_name: '',
    family_name: '',
    gender: 'female',
    date_of_birth: '',
    residence_status: 'day',
    previous_school: '',
    programme_id: '',
    level_id: '',
    class_group_id: '',
    start_date: today.toISOString().slice(0, 10),
    entry_reason: 'new_admission',
    guardians: [emptyGuardianDraft()],
    identifier_scheme: '',
    identifier_value: '',
    guardian_identifier_scheme: '',
    guardian_identifier_value: '',
  };
}

/** A field the form shows, and the label the refusal names it by. */
export const ADMISSION_FIELD_LABELS: Readonly<Record<string, string>> = {
  given_name: 'First name',
  family_name: 'Family name',
  gender: 'Gender',
  date_of_birth: 'Date of birth',
  residence_status: 'Residence',
  previous_school: 'Previous school',
  programme_id: 'Programme',
  level_id: 'Level',
  class_group_id: 'Class group',
  start_date: 'Start date',
  entry_reason: 'Entry reason',
  identifier_value: 'Learner identifier',
  guardian_identifier_value: 'Guardian identifier',
  guardians: 'Guardians',
};

const GUARDIAN_FIELD_LABELS: Readonly<Record<string, string>> = {
  id: 'selection',
  given_name: 'first name',
  family_name: 'family name',
  relationship: 'relationship',
  phone: 'phone',
};

/** The label of a form field, including a guardian row (`guardians.0.phone`). */
export function admissionFieldLabel(field: string): string {
  const match = /^guardians\.(\d+)\.(\w+)$/.exec(field);
  if (match) {
    const row = Number(match[1]) + 1;
    return `Guardian ${row} ${GUARDIAN_FIELD_LABELS[match[2] ?? ''] ?? match[2]}`;
  }
  return ADMISSION_FIELD_LABELS[field] ?? 'Admission';
}

/**
 * The validation of the admission form.
 *
 * The fields that come straight from an entity keep that entity's own schema, so the form
 * and the repository agree on what a name, a gender or a phone number is; a blank optional
 * field is the form's empty slot, never a value the entity accepts.
 */
const guardianDraftSchema = z.object({
  id: z.union([guardianSchema.shape.id, z.literal('')]),
  given_name: z.union([guardianSchema.shape.given_name, z.literal('')]),
  family_name: z.union([guardianSchema.shape.family_name, z.literal('')]),
  relationship: z.enum(GUARDIAN_RELATIONSHIPS),
  phone: z.union([phoneSchema.shape.number, z.literal('')]),
});

export const admissionFormSchema = z
  .object({
    given_name: learnerSchema.shape.given_name,
    family_name: learnerSchema.shape.family_name,
    gender: learnerSchema.shape.gender,
    date_of_birth: z.union([learnerSchema.shape.date_of_birth, z.literal('')]),
    residence_status: learnerSchema.shape.residence_status,
    previous_school: z.union([learnerSchema.shape.previous_school, z.literal('')]),
    programme_id: programmeSchema.shape.id,
    level_id: levelSchema.shape.id,
    class_group_id: classGroupSchema.shape.id,
    start_date: z.iso.date(),
    entry_reason: z.enum(ENTRY_REASONS),
    guardians: z.array(guardianDraftSchema).min(1),
    identifier_scheme: z.string().max(100),
    identifier_value: z.string().max(200),
    guardian_identifier_scheme: z.string().max(100),
    guardian_identifier_value: z.string().max(200),
  })
  .superRefine((values, ctx) => {
    // A guardian is either picked from the school or entered here: a picked guardian is
    // linked by the phone the service de-duplicates on, so a new guardian needs one too.
    values.guardians.forEach((guardian, index) => {
      if (guardian.id !== '') return;
      if (!guardian.given_name) {
        ctx.addIssue({
          code: 'custom',
          path: ['guardians', index, 'given_name'],
          message: 'Required',
        });
      }
      if (!guardian.family_name) {
        ctx.addIssue({
          code: 'custom',
          path: ['guardians', index, 'family_name'],
          message: 'Required',
        });
      }
      if (!guardian.phone) {
        ctx.addIssue({
          code: 'custom',
          path: ['guardians', index, 'phone'],
          message: 'Required, in international form (+254…).',
        });
      }
    });

    // An identifier is a scheme and a value; half of one is not an identifier.
    if ((values.identifier_scheme === '') !== (values.identifier_value === '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['identifier_value'],
        message: 'Choose a scheme and enter the value, or leave both empty.',
      });
    }
    if ((values.guardian_identifier_scheme === '') !== (values.guardian_identifier_value === '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['guardian_identifier_value'],
        message: 'Choose a scheme and enter the value, or leave both empty.',
      });
    }

    // A whole identifier is checked against the format its scheme's country pack states.
    addIdentifierValueIssue(ctx, 'identifier_value', values.identifier_scheme, values.identifier_value);
    addIdentifierValueIssue(
      ctx,
      'guardian_identifier_value',
      values.guardian_identifier_scheme,
      values.guardian_identifier_value
    );
  });

/** The country a scheme id belongs to: the prefix of `ke.national_id` is `KE`. */
function countryOfScheme(scheme: string): string {
  return scheme.split('.')[0]?.toUpperCase() ?? '';
}

/** Adds the pack's refusal of an identifier value to the field that holds it. */
function addIdentifierValueIssue(
  ctx: z.RefinementCtx,
  field: 'identifier_value' | 'guardian_identifier_value',
  scheme: string,
  value: string
): void {
  if (scheme === '' || value === '') return;
  const result = validateIdentifier(countryOfScheme(scheme), scheme, value);
  if (!result.ok) ctx.addIssue({ code: 'custom', path: [field], message: result.message });
}

/** A field problem, addressed by the form field it belongs to. */
export interface AdmissionFormIssue {
  readonly field: string;
  readonly message: string;
}

/** The validation result of the admission form. */
export type AdmissionFormValidation =
  | { readonly ok: true; readonly values: AdmissionFormValues }
  | { readonly ok: false; readonly issues: readonly AdmissionFormIssue[] };

/** Validates the form and reports every problem against the field it belongs to. */
export function validateAdmissionForm(values: AdmissionFormValues): AdmissionFormValidation {
  const result = admissionFormSchema.safeParse(values);
  if (result.success) return { ok: true, values };

  const issues: AdmissionFormIssue[] = [];
  for (const issue of result.error.issues) {
    const field = issue.path.map(String).join('.') || 'form';
    if (issues.some((existing) => existing.field === field)) continue;
    issues.push({ field, message: issue.message });
  }
  return { ok: false, issues };
}

/** The guardian the admission links or creates. */
export interface GuardianSource {
  readonly givenName: string;
  readonly familyName: string;
  readonly phones: readonly { readonly number: string; readonly label?: string }[];
  readonly nationalId?: string;
}

/** The guardian of a typed guardian row. */
export function typedGuardianSource(guardian: GuardianDraftValues): GuardianSource {
  return {
    givenName: guardian.given_name,
    familyName: guardian.family_name,
    phones: guardian.phone ? [{ number: guardian.phone }] : [],
  };
}

/** The value an identifier is stored as: its country pack's normalised form, else the trimmed text. */
function storedIdentifierValue(scheme: string, value: string): string {
  const result = validateIdentifier(countryOfScheme(scheme), scheme, value);
  return result.ok ? result.value : value.trim();
}

/** The identifiers the form collects. */
function identifiersOf(values: AdmissionFormValues): AdmissionIdentifierInput[] {
  const identifiers: AdmissionIdentifierInput[] = [];
  if (values.identifier_scheme && values.identifier_value) {
    identifiers.push({
      scheme: values.identifier_scheme,
      value: storedIdentifierValue(values.identifier_scheme, values.identifier_value),
      owner: 'learner',
    });
  }
  if (values.guardian_identifier_scheme && values.guardian_identifier_value) {
    identifiers.push({
      scheme: values.guardian_identifier_scheme,
      value: storedIdentifierValue(values.guardian_identifier_scheme, values.guardian_identifier_value),
      owner: 'guardian',
      guardianIndex: 0,
    });
  }
  return identifiers;
}

/**
 * The admission the service is asked for.
 *
 * The form never writes the rows itself: it names what the registrar collected, and
 * `AdmissionService.admit` creates the learner, the guardians, the links, the identifiers
 * and the enrolment in one call. The first guardian is the primary contact.
 */
export function toAdmissionInput(
  values: AdmissionFormValues,
  guardianSources: readonly GuardianSource[]
): AdmissionInput {
  const learner: AdmissionInput['learner'] = {
    givenName: values.given_name,
    familyName: values.family_name,
    gender: values.gender as (typeof GENDERS)[number],
    residenceStatus: values.residence_status as ResidenceStatus,
    ...(values.date_of_birth ? { dateOfBirth: values.date_of_birth } : {}),
    ...(values.previous_school ? { previousSchool: values.previous_school } : {}),
  };

  const guardians: AdmissionGuardianInput[] = guardianSources.map((source, index) => ({
    givenName: source.givenName,
    familyName: source.familyName,
    relationship: (values.guardians[index]?.relationship ??
      'guardian') as GuardianRelationship,
    isPrimary: index === 0,
    ...(source.phones.length > 0 ? { phones: [...source.phones] } : {}),
    ...(source.nationalId ? { nationalId: source.nationalId } : {}),
  }));

  const identifiers = identifiersOf(values);

  return {
    learner,
    guardians,
    enrolment: {
      classGroupId: asId<'class_group'>(values.class_group_id),
      startDate: values.start_date,
      entryReason: values.entry_reason as EntryReason,
      programmeId: asId<'programme'>(values.programme_id),
      levelId: asId<'level'>(values.level_id),
    },
    ...(identifiers.length > 0 ? { identifiers } : {}),
  };
}

/** The entity field of a refusal, mapped onto the form field that collects it. */
const LEARNER_FIELDS: Readonly<Record<string, string>> = {
  given_name: 'given_name',
  family_name: 'family_name',
  gender: 'gender',
  date_of_birth: 'date_of_birth',
  residence_status: 'residence_status',
  previous_school: 'previous_school',
};

const GUARDIAN_FIELDS: Readonly<Record<string, string>> = {
  given_name: 'guardians.0.given_name',
  family_name: 'guardians.0.family_name',
  gender: 'guardians.0.id',
  phones: 'guardians.0.phone',
  national_id: 'guardians.0.id',
};

const ENROLMENT_FIELDS: Readonly<Record<string, string>> = {
  class_group_id: 'class_group_id',
  programme_id: 'programme_id',
  level_id: 'level_id',
  academic_year_id: 'class_group_id',
  start_date: 'start_date',
  entry_reason: 'entry_reason',
};

/** The form field of an entity issue path, following the entity the write was about. */
function fieldOfIssue(entity: string | undefined, path: string): string {
  const head = path.split('.')[0] ?? path;
  if (entity === 'guardian') return GUARDIAN_FIELDS[head] ?? 'guardians.0.id';
  if (entity === 'enrolment') return ENROLMENT_FIELDS[head] ?? 'class_group_id';
  if (entity === 'identifier') return 'identifier_value';
  return LEARNER_FIELDS[head] ?? 'form';
}

/**
 * The field a refusal names, and the sentence the registrar reads.
 *
 * A refusal is never collapsed into "something went wrong": a missing class group belongs
 * to the class group field, a programme the class group does not belong to to the
 * programme field, an identifier another owner holds to the identifier field.
 */
export function describeAdmissionFailure(
  error: unknown,
  submitted?: Pick<AdmissionFormValues, 'identifier_value' | 'guardian_identifier_value'>
): AdmissionFormIssue {
  if (error instanceof ServiceError) {
    if (error.code === 'missing_reference' && error.entity === 'class_group') {
      return {
        field: 'class_group_id',
        message: 'This class group no longer exists. Choose another one.',
      };
    }
    if (error.code === 'missing_reference' && error.entity === 'programme') {
      return {
        field: 'programme_id',
        message: 'The programme of this class group no longer exists.',
      };
    }
    if (error.code === 'duplicate' && error.entity === 'identifier') {
      const heldGuardianIdentifier =
        submitted !== undefined &&
        submitted.guardian_identifier_value !== '' &&
        error.message.includes(submitted.guardian_identifier_value);
      return {
        field: heldGuardianIdentifier ? 'guardian_identifier_value' : 'identifier_value',
        message: 'This identifier already belongs to another person.',
      };
    }
    if (error.code === 'invalid_request') {
      if (error.message.includes('programme')) {
        return {
          field: 'programme_id',
          message: 'This class group belongs to another programme. Choose its programme.',
        };
      }
      if (error.message.includes('level_id')) {
        return {
          field: 'level_id',
          message: 'This class group belongs to another level. Choose its level.',
        };
      }
      if (error.message.includes('academic_year_id')) {
        return {
          field: 'class_group_id',
          message: 'This class group belongs to another academic year.',
        };
      }
      return { field: 'class_group_id', message: error.message };
    }
    return { field: 'form', message: error.message };
  }

  if (error instanceof RepositoryInvariantError) {
    const path = error.issues[0]?.path ?? '';
    if (error.invariant === 'enrolment.single_active_per_calendar') {
      return {
        field: 'start_date',
        message: 'The learner already has an enrolment for this date.',
      };
    }
    return {
      field: fieldOfIssue(error.entity, path),
      message: `The ${error.entity ?? 'record'} breaks ${error.invariant}.`,
    };
  }

  if (error instanceof RepositoryValidationError) {
    const issue = error.issues[0];
    return {
      field: fieldOfIssue(error.entity, issue?.path ?? ''),
      message: issue?.message ?? `The ${error.entity ?? 'record'} is not valid.`,
    };
  }

  if (error instanceof RepositoryConflictError) {
    return {
      field: 'form',
      message:
        error.reason === 'unique'
          ? `Another record already holds this ${error.columns.join(', ') || 'value'}.`
          : 'The record changed while the admission was being saved. Reload and try again.',
    };
  }

  return {
    field: 'form',
    message: error instanceof Error && error.message ? error.message : 'The admission failed.',
  };
}

/** The country whose identifier schemes the admission form offers. */
const ADMISSION_COUNTRY = 'KE';

/** The schemes of the country pack that apply to one kind of owner, as the form's select lists them. */
function offeredSchemes(ownerType: OwnerType): readonly { readonly value: string; readonly label: string }[] {
  return identifierSchemesFor(ADMISSION_COUNTRY, ownerType).map(({ value, label }) => ({ value, label }));
}

/** The identifier schemes the country pack records for a learner. */
export const LEARNER_IDENTIFIER_SCHEMES = offeredSchemes('learner');

/** The identifier schemes a guardian commonly holds. */
export const GUARDIAN_IDENTIFIER_SCHEMES = offeredSchemes('guardian');

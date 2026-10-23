// ABOUTME: Admit a learner: the registrar collects the learner, the guardians and the placement,
// ABOUTME: and AdmissionService.admit creates the learner, guardians, links, identifiers and enrolment.

import React, { useCallback, useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { EntityPicker } from '@/components/ui/EntityPicker';
import FormActions from '@/components/ui/forms/FormActions';
import FormContainer from '@/components/ui/forms/FormContainer';
import FormField from '@/components/ui/forms/FormField';
import FormHeader from '@/components/ui/forms/FormHeader';
import FormSection from '@/components/ui/forms/FormSection';
import { CanonicalRepositoryProvider, useCanonicalRepository } from '@/data/canonicalRepository';
import type { RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';
import {
  ENTRY_REASONS,
  GENDERS,
  GUARDIAN_RELATIONSHIPS,
  RESIDENCE_STATUSES,
} from '@/domain/schema';
import { AdmissionService, type AdmissionResult } from '@/domain/services';
import {
  GUARDIAN_IDENTIFIER_SCHEMES,
  LEARNER_IDENTIFIER_SCHEMES,
  admissionFieldLabel,
  describeAdmissionFailure,
  emptyAdmissionForm,
  emptyGuardianDraft,
  toAdmissionInput,
  typedGuardianSource,
  validateAdmissionForm,
  type AdmissionFormIssue,
  type AdmissionFormValues,
  type GuardianDraftValues,
  type GuardianSource,
} from '../data/admissionForm';
import { selectedGuardianRow, useAdmissionLookups } from '../data/useCanonicalAdmissions';
import { writableRepository } from '../data/writableRepository';

/** The person fields of a guardian the school already knows. */
function guardianSourceOf(row: RepositoryRow<'guardian'>): GuardianSource {
  return {
    givenName: row.preferred_name ?? row.given_name,
    familyName: row.family_name,
    phones: row.phones ?? [],
    ...(row.national_id ? { nationalId: row.national_id } : {}),
  };
}

/** The refusal, named by the field it belongs to. */
const FailureAlert: React.FC<{ readonly failure: AdmissionFormIssue }> = ({ failure }) => (
  <div
    role="alert"
    data-field={failure.field}
    data-testid="admission-failure"
    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
  >
    <p className="font-medium">
      {admissionFieldLabel(failure.field)}: {failure.message}
    </p>
    <p className="mt-1 text-xs">
      The admission was refused and nothing was written; correct the field and submit again.
    </p>
  </div>
);

export const AdmitLearnerPageContent: React.FC = () => {
  const repository = useCanonicalRepository();
  const lookups = useAdmissionLookups();
  const [values, setValues] = useState<AdmissionFormValues>(() => emptyAdmissionForm());
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [failure, setFailure] = useState<AdmissionFormIssue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AdmissionResult | null>(null);

  /** The guardian row each guardian field picked, when it picked one. */
  const guardianRows = useMemo(
    () => values.guardians.map((guardian) => selectedGuardianRow(lookups.guardians, guardian.id)),
    [values.guardians, lookups.guardians]
  );

  const clearError = useCallback((field: string) => {
    setErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFailure(null);
  }, []);

  /** Updates one field and clears the refusal it carried. */
  const setField = useCallback(
    (field: keyof AdmissionFormValues) => (value: string) => {
      setValues((current) => ({ ...current, [field]: value }));
      clearError(field);
    },
    [clearError]
  );

  /** Updates one field of one guardian row. */
  const setGuardianField = useCallback(
    (index: number, field: keyof GuardianDraftValues) => (value: string) => {
      setValues((current) => ({
        ...current,
        guardians: current.guardians.map((guardian, row) =>
          row === index ? { ...guardian, [field]: value } : guardian
        ),
      }));
      clearError(`guardians.${index}.${field}`);
    },
    [clearError]
  );

  const addGuardian = () => {
    setValues((current) => ({
      ...current,
      guardians: [...current.guardians, emptyGuardianDraft()],
    }));
  };

  const removeGuardian = (index: number) => {
    setValues((current) => ({
      ...current,
      guardians:
        current.guardians.length > 1
          ? current.guardians.filter((_, row) => row !== index)
          : current.guardians,
    }));
    setErrors({});
    setFailure(null);
  };

  /** The class groups the chosen programme and level allow. */
  const classGroupFilter = useMemo(() => {
    const programmeId = values.programme_id;
    const levelId = values.level_id;
    return (row: RepositoryRow<'class_group'>) =>
      (programmeId === '' || row.programme_id === programmeId) &&
      (levelId === '' || row.level_id === levelId);
  }, [values.programme_id, values.level_id]);

  /**
   * The levels the chosen programme declares, or null when no programme is chosen yet.
   *
   * A level belongs to a programme through its stage. Two programmes may both declare a "Form 1"
   * (a transitional 8-4-4 secondary beside a CBE primary), so the level picker is scoped to the
   * chosen programme and the placement can never land on the other programme's level.
   */
  const programmeLevelIds = useMemo(() => {
    if (values.programme_id === '') return null;
    const ids = new Set<string>();
    for (const level of lookups.levels.options) {
      const stage = lookups.stages.resolve(asId<'stage'>(level.stage_id));
      // A level whose stage is not loaded yet stays visible: the filter must not hide the whole
      // picker while the stage read is still in flight.
      if (stage === undefined || stage.programme_id === values.programme_id) ids.add(level.id);
    }
    return ids;
  }, [values.programme_id, lookups.levels.options, lookups.stages]);

  const levelFilter = useCallback(
    (row: RepositoryRow<'level'>) => programmeLevelIds === null || programmeLevelIds.has(row.id),
    [programmeLevelIds]
  );

  const classGroupLabel = values.class_group_id
    ? lookups.classGroups.label(asId<'class_group'>(values.class_group_id), '')
    : '';

  const reset = () => {
    setValues(emptyAdmissionForm());
    setErrors({});
    setFailure(null);
    setResult(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const validation = validateAdmissionForm(values);
    if (!validation.ok) {
      const next: Record<string, string> = {};
      for (const issue of validation.issues) next[issue.field] = issue.message;
      setErrors(next);
      setFailure(validation.issues[0] ?? null);
      return;
    }

    const guardianSources: GuardianSource[] = [];
    for (const [index, guardian] of values.guardians.entries()) {
      const picked = guardianRows[index];
      if (guardian.id && !picked) {
        const issue = {
          field: `guardians.${index}.id`,
          message: 'This guardian no longer exists. Choose another one, or enter a new guardian.',
        };
        setErrors({ [issue.field]: issue.message });
        setFailure(issue);
        return;
      }
      // The service links a guardian by phone; a guardian without one would be copied.
      if (picked && (picked.phones ?? []).length === 0) {
        const issue = {
          field: `guardians.${index}.id`,
          message:
            'This guardian has no phone number on record, so the admission cannot link them. Record one on the guardian first.',
        };
        setErrors({ [issue.field]: issue.message });
        setFailure(issue);
        return;
      }
      guardianSources.push(picked ? guardianSourceOf(picked) : typedGuardianSource(guardian));
    }

    const input = toAdmissionInput(values, guardianSources);

    setSubmitting(true);
    setErrors({});
    setFailure(null);
    try {
      const admissions = new AdmissionService({ repository: writableRepository(repository) });
      setResult(await admissions.admit(input));
    } catch (error) {
      const refusal = describeAdmissionFailure(error, values);
      setFailure(refusal);
      if (refusal.field !== 'form') setErrors({ [refusal.field]: refusal.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-3">
        <Card title="Learner admitted">
          <div role="status" data-testid="admission-result" className="space-y-3">
            <p className="text-lg font-semibold text-surface-foreground">
              {result.learner.given_name} {result.learner.family_name}
            </p>
            <p className="text-sm text-surface-muted-fg">
              Admission number{' '}
              <span className="font-mono text-surface-foreground">
                {result.learner.admission_number}
              </span>
            </p>
            <p className="text-sm text-surface-muted-fg">
              Placed in {classGroupLabel || 'the class group you chose'}.
            </p>
            <p className="text-sm text-surface-muted-fg">
              {result.guardians.length > 0
                ? `${result.guardians.length} guardian${result.guardians.length === 1 ? '' : 's'} created and linked.`
                : 'The guardians the school already knew were linked; nobody was copied.'}
            </p>
            <p className="text-sm text-surface-muted-fg">
              {result.links.length > 0
                ? `${result.links.length} guardian link${result.links.length === 1 ? '' : 's'} written.`
                : 'No guardian link was written.'}
            </p>
            <p className="text-sm text-surface-muted-fg">
              {result.identifiers.length > 0
                ? `${result.identifiers.length} identifier${result.identifiers.length === 1 ? '' : 's'} recorded.`
                : 'No identifier was recorded.'}
            </p>
          </div>
          <div className="mt-6">
            <Button onClick={reset}>Admit another learner</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-xl">
        <FormContainer onSubmit={(event) => void handleSubmit(event)}>
          <FormHeader
            title="Admit learner"
            description="The admission creates the learner, the guardians, the identifiers and the first enrolment in one transaction."
          />
          <div className="space-y-6">
            {failure ? <FailureAlert failure={failure} /> : null}

            <FormSection title="Learner" columns={2}>
              <FormField label="First name" required error={errors.given_name}>
                <Input
                  name="given_name"
                  value={values.given_name}
                  onChange={(event) => setField('given_name')(event.target.value)}
                  disabled={submitting}
                />
              </FormField>
              <FormField label="Family name" required error={errors.family_name}>
                <Input
                  name="family_name"
                  value={values.family_name}
                  onChange={(event) => setField('family_name')(event.target.value)}
                  disabled={submitting}
                />
              </FormField>
              <FormField label="Gender" required error={errors.gender}>
                <select
                  name="gender"
                  value={values.gender}
                  onChange={(event) => setField('gender')(event.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-surface-border px-3 py-2"
                >
                  {GENDERS.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Date of birth" optional error={errors.date_of_birth}>
                <Input
                  type="date"
                  name="date_of_birth"
                  value={values.date_of_birth}
                  onChange={(event) => setField('date_of_birth')(event.target.value)}
                  disabled={submitting}
                />
              </FormField>
              <FormField label="Residence" required error={errors.residence_status}>
                <select
                  name="residence_status"
                  value={values.residence_status}
                  onChange={(event) => setField('residence_status')(event.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-surface-border px-3 py-2"
                >
                  {RESIDENCE_STATUSES.map((residence) => (
                    <option key={residence} value={residence}>
                      {residence.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Previous school" optional error={errors.previous_school}>
                <Input
                  name="previous_school"
                  value={values.previous_school}
                  onChange={(event) => setField('previous_school')(event.target.value)}
                  disabled={submitting}
                />
              </FormField>
            </FormSection>

            {values.guardians.map((guardian, index) => {
              const picked = guardianRows[index];
              return (
                <FormSection
                  key={index}
                  title={`Guardian ${index + 1}${index === 0 ? ' (primary contact)' : ''}`}
                  description="Link a guardian the school already knows, or enter the guardian of the learner."
                  columns={2}
                >
                  <div className="md:col-span-2">
                    <FormField
                      label="Link an existing guardian"
                      optional
                      error={errors[`guardians.${index}.id`]}
                    >
                      <EntityPicker
                        value={guardian.id ? asId<'guardian'>(guardian.id) : null}
                        onChange={(id) => setGuardianField(index, 'id')(id ?? '')}
                        lookup={lookups.guardians}
                        placeholder="Search the guardians of the school"
                        allowClear
                        disabled={submitting}
                        data-testid={`guardian-picker-${index}`}
                        aria-label={`Link an existing guardian (${index + 1})`}
                      />
                    </FormField>
                  </div>
                  <FormField
                    label="Guardian first name"
                    required={!picked}
                    error={errors[`guardians.${index}.given_name`]}
                  >
                    <Input
                      name={`guardians.${index}.given_name`}
                      value={picked ? picked.given_name : guardian.given_name}
                      onChange={(event) =>
                        setGuardianField(index, 'given_name')(event.target.value)
                      }
                      disabled={submitting || picked !== undefined}
                    />
                  </FormField>
                  <FormField
                    label="Guardian family name"
                    required={!picked}
                    error={errors[`guardians.${index}.family_name`]}
                  >
                    <Input
                      name={`guardians.${index}.family_name`}
                      value={picked ? picked.family_name : guardian.family_name}
                      onChange={(event) =>
                        setGuardianField(index, 'family_name')(event.target.value)
                      }
                      disabled={submitting || picked !== undefined}
                    />
                  </FormField>
                  <FormField
                    label="Relationship"
                    required
                    error={errors[`guardians.${index}.relationship`]}
                  >
                    <select
                      name={`guardians.${index}.relationship`}
                      value={guardian.relationship}
                      onChange={(event) =>
                        setGuardianField(index, 'relationship')(event.target.value)
                      }
                      disabled={submitting}
                      className="w-full rounded-lg border border-surface-border px-3 py-2"
                    >
                      {GUARDIAN_RELATIONSHIPS.map((relationship) => (
                        <option key={relationship} value={relationship}>
                          {relationship.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField
                    label="Guardian phone"
                    required={!picked}
                    helperText="International form, for example +254711000000."
                    error={errors[`guardians.${index}.phone`]}
                  >
                    <Input
                      name={`guardians.${index}.phone`}
                      value={picked ? (picked.phones?.[0]?.number ?? '') : guardian.phone}
                      onChange={(event) => setGuardianField(index, 'phone')(event.target.value)}
                      disabled={submitting || picked !== undefined}
                    />
                  </FormField>
                  {values.guardians.length > 1 ? (
                    <div className="md:col-span-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeGuardian(index)}
                        disabled={submitting}
                      >
                        Remove guardian {index + 1}
                      </Button>
                    </div>
                  ) : null}
                </FormSection>
              );
            })}

            <div>
              <Button
                type="button"
                variant="outline"
                onClick={addGuardian}
                disabled={submitting}
              >
                Add another guardian
              </Button>
            </div>

            <FormSection
              title="Placement"
              description="The class group carries the academic year, the level and the programme of the enrolment."
              columns={2}
            >
              <FormField label="Programme" required error={errors.programme_id}>
                <EntityPicker
                  value={values.programme_id ? asId<'programme'>(values.programme_id) : null}
                  onChange={(id) => setField('programme_id')(id ?? '')}
                  lookup={lookups.programmes}
                  placeholder="Choose a programme"
                  disabled={submitting}
                  data-testid="programme-picker"
                  aria-label="Programme"
                />
              </FormField>
              <FormField label="Level" required error={errors.level_id}>
                <EntityPicker
                  value={values.level_id ? asId<'level'>(values.level_id) : null}
                  onChange={(id) => setField('level_id')(id ?? '')}
                  lookup={lookups.levels}
                  filter={levelFilter}
                  placeholder="Choose a level"
                  disabled={submitting}
                  data-testid="level-picker"
                  aria-label="Level"
                />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Class group" required error={errors.class_group_id}>
                  <EntityPicker
                    value={values.class_group_id ? asId<'class_group'>(values.class_group_id) : null}
                    onChange={(id) => setField('class_group_id')(id ?? '')}
                    lookup={lookups.classGroups}
                    filter={classGroupFilter}
                    placeholder="Choose a class group"
                    emptyState="No class group of this programme and level."
                    disabled={submitting}
                    data-testid="class-group-picker"
                    aria-label="Class group"
                  />
                </FormField>
              </div>
              <FormField label="Start date" required error={errors.start_date}>
                <Input
                  type="date"
                  name="start_date"
                  value={values.start_date}
                  onChange={(event) => setField('start_date')(event.target.value)}
                  disabled={submitting}
                />
              </FormField>
              <FormField label="Entry reason" required error={errors.entry_reason}>
                <select
                  name="entry_reason"
                  value={values.entry_reason}
                  onChange={(event) => setField('entry_reason')(event.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-surface-border px-3 py-2"
                >
                  {ENTRY_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </FormField>
            </FormSection>

            <FormSection
              title="Identifiers"
              description="The national identifiers of the learner and the primary guardian, when the school holds them."
              columns={2}
            >
              <FormField label="Learner identifier scheme" optional error={errors.identifier_scheme}>
                <select
                  name="identifier_scheme"
                  value={values.identifier_scheme}
                  onChange={(event) => setField('identifier_scheme')(event.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-surface-border px-3 py-2"
                >
                  <option value="">No learner identifier</option>
                  {LEARNER_IDENTIFIER_SCHEMES.map((scheme) => (
                    <option key={scheme.value} value={scheme.value}>
                      {scheme.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Learner identifier value" optional error={errors.identifier_value}>
                <Input
                  name="identifier_value"
                  value={values.identifier_value}
                  onChange={(event) => setField('identifier_value')(event.target.value)}
                  disabled={submitting}
                />
              </FormField>
              <FormField
                label="Guardian identifier scheme"
                optional
                error={errors.guardian_identifier_scheme}
              >
                <select
                  name="guardian_identifier_scheme"
                  value={values.guardian_identifier_scheme}
                  onChange={(event) => setField('guardian_identifier_scheme')(event.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-surface-border px-3 py-2"
                >
                  <option value="">No guardian identifier</option>
                  {GUARDIAN_IDENTIFIER_SCHEMES.map((scheme) => (
                    <option key={scheme.value} value={scheme.value}>
                      {scheme.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Guardian identifier value"
                optional
                error={errors.guardian_identifier_value}
              >
                <Input
                  name="guardian_identifier_value"
                  value={values.guardian_identifier_value}
                  onChange={(event) => setField('guardian_identifier_value')(event.target.value)}
                  disabled={submitting}
                />
              </FormField>
            </FormSection>

            {submitting ? (
              <div className="flex items-center gap-2 text-sm text-surface-muted-fg" role="status">
                <Spinner size="sm" />
                <span>Admitting the learner…</span>
              </div>
            ) : null}

            <FormActions>
              <Button type="button" variant="secondary" onClick={reset} disabled={submitting}>
                Clear
              </Button>
              <Button type="submit" loading={submitting} data-testid="admit-learner">
                Admit learner
              </Button>
            </FormActions>
          </div>
        </FormContainer>
      </Card>
    </div>
  );
};

const AdmitLearnerPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <AdmitLearnerPageContent />
  </CanonicalRepositoryProvider>
);

export default AdmitLearnerPage;

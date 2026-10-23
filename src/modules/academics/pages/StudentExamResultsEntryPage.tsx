// ABOUTME: Marks entry for a canonical assessment: pick the assessment and the teaching group,
// ABOUTME: then enter one mark per member. Every save goes through the repository, and the
// ABOUTME: refusals it raises - a duplicate, a learner outside the group, a stale write - are
// ABOUTME: shown on the row and in the summary instead of being swallowed.

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { useTranslation } from 'react-i18next';
import { useLookup } from '@/data/query';
import { asId, type Id } from '@/domain/ids';
import { MARK_STATUSES } from '@/domain/schema';
import { useToast } from '@/hooks/useToast';

import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { markWriteMessage } from '../data/errors';
import {
  personName,
  useCanonicalAcademics,
  type AssessmentRow,
  type EnrolmentRow,
  type LearnerRow,
  type MarkRow,
  type TeachingGroupMemberRow,
} from '../data/useCanonicalAcademics';

const SCORE_PATTERN = /^\d+(\.\d+)?$/;

type MarkStatus = (typeof MARK_STATUSES)[number];

interface Entry {
  readonly score: string;
  readonly status: MarkStatus;
}

interface EntryProblem {
  readonly enrolmentId: string;
  readonly message: string;
}

/** Today as the register's date, so a member list is never filtered by a missing window. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The date the marks are judged on, resolved the way the repository resolves it. */
function assessmentDate(
  assessment: AssessmentRow | undefined,
  periodStart: string | undefined
): string {
  return assessment?.date_window?.start_date ?? periodStart ?? today();
}

/** The entry a row starts with: its stored mark, or an empty present entry. */
function entryFor(mark: MarkRow | undefined): Entry {
  if (!mark) return { score: '', status: 'present' };
  return { score: mark.score ?? '', status: mark.status_code };
}

const MarksEntryContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const toast = useToast();
  const {
    repository,
    isLoading,
    assessments,
    teachingGroups,
    teachingGroupMembers,
    marks,
    academicPeriods,
    learningAreaById,
    enrolmentById,
    learnerById,
  } = useCanonicalAcademics();

  const assessmentLookup = useLookup(repository, 'assessment', {
    label: (row) => `${row.name} (${row.kind.replace(/_/g, ' ')})`,
  });
  const groupLookup = useLookup(repository, 'teaching_group', { label: (row) => row.name });

  const [assessmentId, setAssessmentId] = useState<Id<'assessment'> | null>(null);
  const [groupId, setGroupId] = useState<Id<'teaching_group'> | null>(null);
  const [draft, setDraft] = useState<{
    key: string;
    entries: Record<string, Entry>;
    edited: readonly string[];
  }>({
    key: '',
    entries: {},
    edited: [],
  });
  const [problems, setProblems] = useState<readonly EntryProblem[]>([]);
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const assessment = useMemo(
    () => assessments.find((row) => row.id === assessmentId),
    [assessments, assessmentId]
  );
  const group = useMemo(
    () => teachingGroups.find((row) => row.id === groupId),
    [teachingGroups, groupId]
  );
  const period = useMemo(
    () => academicPeriods.find((row) => row.id === assessment?.academic_period_id),
    [academicPeriods, assessment]
  );
  const date = assessmentDate(assessment, period?.start_date);
  const learningAreaId = group?.learning_area_id ?? null;

  const members = useMemo<readonly TeachingGroupMemberRow[]>(() => {
    if (!group) return [];
    return teachingGroupMembers.filter(
      (member) =>
        member.teaching_group_id === group.id &&
        member.valid_from <= date &&
        (member.valid_to == null || member.valid_to >= date)
    );
  }, [teachingGroupMembers, group, date]);

  const marksForAssessment = useMemo(() => {
    if (!assessment || !learningAreaId) return new Map<string, MarkRow>();
    return new Map(
      marks
        .filter(
          (mark) =>
            mark.assessment_id === assessment.id && mark.learning_area_id === learningAreaId
        )
        .map((mark) => [mark.enrolment_id, mark] as const)
    );
  }, [marks, assessment, learningAreaId]);

  // A new selection starts from the stored marks: the form always shows what the database holds.
  const selectionKey = `${assessmentId ?? ''}|${groupId ?? ''}|${date}`;
  const storedEntries = useMemo(() => {
    const next: Record<string, Entry> = {};
    for (const member of members) {
      next[member.enrolment_id] = entryFor(marksForAssessment.get(member.enrolment_id));
    }
    return next;
  }, [members, marksForAssessment]);
  const entries = draft.key === selectionKey ? draft.entries : storedEntries;
  const touched = (enrolmentId: string) =>
    draft.key === selectionKey && draft.edited.includes(enrolmentId);
  const shouldValidate = (enrolmentId: string) =>
    touched(enrolmentId) || marksForAssessment.has(enrolmentId);

  const rows = useMemo(
    () =>
      members.map((member) => {
        const enrolment = enrolmentById.get(member.enrolment_id);
        const learner = enrolment ? learnerById.get(enrolment.learner_id) : undefined;
        return { member, enrolment, learner, mark: marksForAssessment.get(member.enrolment_id) };
      }),
    [members, enrolmentById, learnerById, marksForAssessment]
  );

  const learnerName = (learner: LearnerRow | undefined, enrolment: EnrolmentRow | undefined) =>
    learner ? personName(learner) : (enrolment?.learner_id ?? 'Unknown learner');

  const setEntry = (enrolmentId: string, patch: Partial<Entry>) => {
    setDraft((current) => {
      const base = current.key === selectionKey ? current.entries : storedEntries;
      const edited = current.key === selectionKey ? current.edited : [];
      return {
        key: selectionKey,
        entries: {
          ...base,
          [enrolmentId]: {
            ...(base[enrolmentId] ?? { score: '', status: 'present' }),
            ...patch,
          },
        },
        edited: edited.includes(enrolmentId) ? edited : [...edited, enrolmentId],
      };
    });
    setProblems((current) => current.filter((problem) => problem.enrolmentId !== enrolmentId));
    setSummaryMessage(null);
  };

  /** The problems of one row, in the order the repository would raise them. */
  const rowProblems = (enrolmentId: string): string[] => {
    if (!shouldValidate(enrolmentId)) return [];
    const entry = entries[enrolmentId];
    if (!entry) return [];
    const found: string[] = [];
    const stored = marksForAssessment.get(enrolmentId);
    const max = assessment?.max_score;

    if (entry.status === 'present' && entry.score.trim() === '') {
      found.push('Enter a score, or record the learner with a status such as absent.');
    }
    if (entry.score.trim() !== '' && !SCORE_PATTERN.test(entry.score.trim())) {
      found.push('A score is a number, for example 78 or 78.5.');
    }
    if (entry.score.trim() !== '' && SCORE_PATTERN.test(entry.score.trim()) && max !== undefined) {
      if (Number(entry.score) > max) found.push(`A score cannot be above the assessment maximum of ${max}.`);
    }
    if (stored && entry.score.trim() === '' && stored.score !== undefined) {
      found.push(
        'The stored score cannot be cleared: a mark keeps its score once entered. Enter a corrected score, or record a status such as absent.'
      );
    }
    return found;
  };

  const save = async () => {
    if (!assessment || !group || !learningAreaId) return;

    const found: EntryProblem[] = [];
    for (const { member } of rows) {
      for (const message of rowProblems(member.enrolment_id)) {
        found.push({ enrolmentId: member.enrolment_id, message });
      }
    }
    if (found.length > 0) {
      setProblems([]);
      setSummaryMessage('Some rows need a valid score before the marks can be saved.');
      return;
    }

    setSaving(true);
    setSummaryMessage(null);
    const failures: EntryProblem[] = [];
    for (const { member, mark } of rows) {
      if (!shouldValidate(member.enrolment_id)) continue;
      const entry = entries[member.enrolment_id];
      if (!entry) continue;
      const score = entry.score.trim() === '' ? undefined : entry.score.trim();
      const stored = mark ? entryFor(mark) : undefined;
      if (stored && stored.score === (score ?? '') && stored.status === entry.status) continue;

      try {
        if (mark) {
          await repository.update(
            'mark',
            asId<'mark'>(mark.id),
            {
              score,
              status_code: entry.status,
              version: mark.version + 1,
              entered_at: new Date().toISOString(),
            },
            { expectedVersion: mark.rowVersion }
          );
        } else {
          await repository.create('mark', {
            institution_id: group.institution_id,
            assessment_id: assessment.id,
            enrolment_id: member.enrolment_id,
            learning_area_id: learningAreaId,
            status_code: entry.status,
            ...(score === undefined ? {} : { score }),
            version: 1,
            entered_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        failures.push({ enrolmentId: member.enrolment_id, message: markWriteMessage(error) });
      }
    }

    setProblems(failures);
    setSaving(false);
    if (failures.length > 0) {
      setSummaryMessage('The marks were not all saved.');
    } else {
      toast.showSuccess('Marks saved through the canonical repository.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  const selectableGroups = teachingGroups.filter((row) => {
    if (!assessment) return true;
    const inYear = period ? row.academic_year_id === period.academic_year_id : true;
    const coversArea =
      assessment.learning_area_ids.length === 0 ||
      assessment.learning_area_ids.includes(row.learning_area_id);
    return inYear && coversArea;
  });

  const summary = summaryMessage !== null && (
    <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
      <p className="font-medium">{summaryMessage}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <Card
        title={t('studentExamResultsEntry.title', 'Marks entry')}
        info="A mark belongs to one learner enrolment, one assessment and one learning area. The repository refuses a second mark for the same three, a learner outside the chosen teaching group, and a write made against a version someone else has moved on."
      >
        <div className="grid grid-cols-1 gap-4 border rounded-md bg-surface-muted p-4 md:grid-cols-2">
          <EntityPicker
            label="Assessment"
            value={assessmentId}
            onChange={(next) => {
              setAssessmentId(next);
              setGroupId(null);
            }}
            lookup={assessmentLookup}
            placeholder="Select an assessment"
            allowClear
          />
          <EntityPicker
            label="Teaching group"
            value={groupId}
            onChange={setGroupId}
            lookup={groupLookup}
            filter={(row) => selectableGroups.some((group) => group.id === row.id)}
            placeholder="Select a teaching group"
            disabled={!assessment}
            allowClear
            helperText={
              group
                ? `Learning area: ${learningAreaById.get(group.learning_area_id)?.name ?? group.learning_area_id}`
                : 'The group fixes the learning area and its members.'
            }
          />
        </div>

        {!assessment || !group ? (
          <p className="py-6 text-center text-surface-muted-fg">
            Choose an assessment and a teaching group to enter marks.
          </p>
        ) : members.length === 0 ? (
          <p className="py-6 text-center text-surface-muted-fg">
            This teaching group has no members on {date}. Add memberships on the teaching groups
            screen first.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {summary}
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Members of {group.name} and their marks for {assessment.name}
              </caption>
              <thead>
                <tr className="border-b border-surface-border">
                  <th scope="col" className="py-2 pr-3">Learner</th>
                  <th scope="col" className="py-2 pr-3">Admission number</th>
                  <th scope="col" className="py-2 pr-3">
                    Score{assessment.max_score !== undefined ? ` (out of ${assessment.max_score})` : ''}
                  </th>
                  <th scope="col" className="py-2 pr-3">Status</th>
                  <th scope="col" className="py-2">Save</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ member, enrolment, learner, mark }) => {
                  const name = learnerName(learner, enrolment);
                  const entry = entries[member.enrolment_id] ?? entryFor(mark);
                  const current = rowProblems(member.enrolment_id);
                  const failed = problems.filter(
                    (problem) => problem.enrolmentId === member.enrolment_id
                  );
                  return (
                    <tr key={member.id} className="border-b border-surface-border last:border-b-0">
                      <td className="py-2 pr-3">{name}</td>
                      <td className="py-2 pr-3">{learner?.admission_number ?? '—'}</td>
                      <td className="py-2 pr-3">
                        <Input
                          aria-label={`Score for ${name}`}
                          inputMode="decimal"
                          className="w-24"
                          value={entry.score}
                          onChange={(event) =>
                            setEntry(member.enrolment_id, { score: event.target.value })
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          aria-label={`Status for ${name}`}
                          className="rounded-md border border-surface-border bg-surface px-2 py-1.5 text-sm"
                          value={entry.status}
                          onChange={(event) =>
                            setEntry(member.enrolment_id, {
                              status: event.target.value as MarkStatus,
                            })
                          }
                        >
                          {MARK_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2">
                        {failed.length > 0 ? (
                          <span role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                            {failed.map((problem) => problem.message).join(' ')}
                          </span>
                        ) : current.length > 0 ? (
                          <span className="text-xs text-amber-700 dark:text-amber-400">
                            {current.join(' ')}
                          </span>
                        ) : mark ? (
                          <span className="text-xs text-surface-muted-fg">
                            Stored revision {mark.version}
                          </span>
                        ) : (
                          <span className="text-xs text-surface-muted-fg">New mark</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex justify-end">
              <Button onClick={() => void save()} loading={saving}>
                {saving ? 'Saving marks...' : 'Save marks'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export const StudentExamResultsEntryPageContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <MarksEntryContent />
  </CanonicalRepositoryProvider>
);

const StudentExamResultsEntryPage: React.FC = () => (
  <div className="space-y-3">
    <StudentExamResultsEntryPageContent />
  </div>
);

export default StudentExamResultsEntryPage;

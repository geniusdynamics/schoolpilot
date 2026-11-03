// ABOUTME: Exam sessions page — a session is a canonical assessment, the row marks are entered
// ABOUTME: against. Listing, creating, editing and status changes all go through the repository;
// ABOUTME: the date window and the papers of a session are set on the Scheduling tab.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useLookup } from '@/data/query';
import { type CreateInput, type UpdateInput } from '@/data/repository';
import { ASSESSMENT_KINDS, ASSESSMENT_STATUSES } from '@/domain/schema';
import { asId, type Id } from '@/domain/ids';
import { useCan } from '@/data/auth/useCan';
import { useToast } from '@/hooks/useToast';
import { classGroupLabel, periodLabel } from '@/utils/academicLabels';

import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { messageOf } from '../data/errors';
import {
  useCanonicalAcademics,
  type AcademicPeriodRow,
  type AssessmentRow,
} from '../data/useCanonicalAcademics';

type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];
type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

interface SessionDraft {
  readonly name: string;
  readonly academicPeriodId: Id<'academic_period'> | null;
  readonly kind: AssessmentKind;
  readonly status: AssessmentStatus;
  readonly levelIds: readonly string[];
  readonly classGroupIds: readonly string[];
  readonly learningAreaIds: readonly string[];
}

/** A new session starts open: marks entry offers every assessment that is not a draft. */
const EMPTY_DRAFT: SessionDraft = {
  name: '',
  academicPeriodId: null,
  kind: 'end_term',
  status: 'open',
  levelIds: [],
  classGroupIds: [],
  learningAreaIds: [],
};

/** The same list with `id` added or removed, so a checkbox list stays a set of ids. */
function toggled(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id];
}

const ExamSessionList: React.FC = () => {
  const { t } = useTranslation('academics');
  const toast = useToast();
  const confirm = useConfirm();
  const {
    repository,
    institutionId,
    isLoading,
    assessments,
    academicPeriods,
    academicYearById,
    levels,
    classGroups,
    learningAreas,
  } = useCanonicalAcademics();

  // An assessment is the school's exam setup, so assessment.write gates the controls.
  const canEdit = useCan('assessment.write');

  const periodLookup = useLookup(repository, 'academic_period', {
    label: (row) =>
      periodLabel({
        name: row.name,
        academicYear: academicYearById.get(row.academic_year_id)?.name,
      }),
  });

  const [editing, setEditing] = useState<AssessmentRow | null>(null);
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const academicPeriodById = useMemo<ReadonlyMap<string, AcademicPeriodRow>>(
    () => new Map(academicPeriods.map((period) => [period.id, period] as const)),
    [academicPeriods]
  );
  const categoryName = (id: string) => {
    const period = academicPeriodById.get(id);
    return period
      ? periodLabel({
          name: period.name,
          academicYear: academicYearById.get(period.academic_year_id)?.name,
        })
      : id;
  };
  const levelName = (id: string) => levels.find((level) => level.id === id)?.name ?? id;
  const classGroupName = (id: string) => {
    const group = classGroups.find((row) => row.id === id);
    return group
      ? classGroupLabel({ gradeLevel: levelName(group.level_id), name: group.name })
      : id;
  };
  const learningAreaName = (id: string) => learningAreas.find((area) => area.id === id)?.name ?? id;

  const startNew = () => {
    setEditing(null);
    setFormError(null);
    setDraft(EMPTY_DRAFT);
  };

  const startEdit = (row: AssessmentRow) => {
    setEditing(row);
    setFormError(null);
    setDraft({
      name: row.name,
      academicPeriodId: asId<'academic_period'>(row.academic_period_id),
      kind: row.kind,
      status: row.status,
      levelIds: row.level_ids,
      classGroupIds: row.class_group_ids,
      learningAreaIds: row.learning_area_ids,
    });
  };

  const closeForm = () => {
    setDraft(null);
    setEditing(null);
    setFormError(null);
  };

  const submit = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (name === '') {
      setFormError('Name the session.');
      return;
    }
    if (!draft.academicPeriodId) {
      setFormError('Choose the academic period the session runs in.');
      return;
    }
    if (draft.learningAreaIds.length === 0) {
      setFormError(
        'Choose at least one learning area: marks entry offers a session per learning area.'
      );
      return;
    }
    if (institutionId === null) {
      setFormError(
        'The canonical database holds no institution row, so a session cannot be saved yet.'
      );
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const patch: UpdateInput<'assessment'> = {
          academic_period_id: draft.academicPeriodId,
          kind: draft.kind,
          name,
          level_ids: [...draft.levelIds],
          class_group_ids: [...draft.classGroupIds],
          learning_area_ids: [...draft.learningAreaIds],
          status: draft.status,
        };
        await repository.update('assessment', asId<'assessment'>(editing.id), patch, {
          expectedVersion: editing.rowVersion,
        });
        toast.showSuccess('Exam session saved.');
      } else {
        const payload: CreateInput<'assessment'> = {
          institution_id: institutionId,
          academic_period_id: draft.academicPeriodId,
          kind: draft.kind,
          name,
          level_ids: [...draft.levelIds],
          class_group_ids: [...draft.classGroupIds],
          learning_area_ids: [...draft.learningAreaIds],
          component_ids: [],
          status: draft.status,
        };
        await repository.create('assessment', payload);
        toast.showSuccess('Exam session created.');
      }
      closeForm();
    } catch (error) {
      setFormError(messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: AssessmentRow) => {
    const confirmed = await confirm({
      variant: 'danger',
      message: `Delete the session ${row.name}? Marks already entered against it are not deleted with it.`,
    });
    if (!confirmed) return;
    try {
      await repository.remove('assessment', asId<'assessment'>(row.id), {
        expectedVersion: row.rowVersion,
      });
      toast.showSuccess('Exam session deleted.');
    } catch (error) {
      toast.showError(messageOf(error));
    }
  };

  const columns: DataGridColumn<AssessmentRow>[] = [
    { key: 'name', header: 'Session', sortable: true, filterable: true },
    {
      key: 'academic_period_id',
      header: 'Period',
      sortable: true,
      filterable: true,
      render: (_value: unknown, row: AssessmentRow) => categoryName(row.academic_period_id),
    },
    {
      key: 'kind',
      header: 'Kind',
      render: (_value: unknown, row: AssessmentRow) => row.kind.replace(/_/g, ' '),
    },
    {
      key: 'level_ids',
      header: 'Levels',
      render: (_value: unknown, row: AssessmentRow) =>
        row.level_ids.length > 0 ? row.level_ids.map(levelName).join(', ') : 'All levels',
    },
    {
      key: 'class_group_ids',
      header: 'Classes',
      render: (_value: unknown, row: AssessmentRow) =>
        row.class_group_ids.length > 0
          ? row.class_group_ids.map(classGroupName).join(', ')
          : 'All classes',
    },
    {
      key: 'learning_area_ids',
      header: 'Learning areas',
      render: (_value: unknown, row: AssessmentRow) =>
        row.learning_area_ids.length > 0
          ? row.learning_area_ids.map(learningAreaName).join(', ')
          : '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (_value: unknown, row: AssessmentRow) => (
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-surface-foreground">
          {row.status.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'date_window',
      header: 'Window',
      render: (_value: unknown, row: AssessmentRow) =>
        row.date_window ? `${row.date_window.start_date} → ${row.date_window.end_date}` : '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: unknown, row: AssessmentRow) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => startEdit(row)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            {t('common:edit', 'Edit')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => void remove(row)}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            {t('common:delete', 'Delete')}
          </Button>
        </div>
      ),
    },
  ].filter((column) => canEdit || column.key !== 'actions') as DataGridColumn<AssessmentRow>[];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {institutionId === null && (
        <p
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
        >
          The canonical database holds no institution row, so a session cannot be saved yet.
        </p>
      )}

      <Card
        title={t('examSessions.title', 'Exam Sessions Management')}
        info="A session is an assessment: marks enter against it once its status is Open or Closed. Its date window and the papers it covers are set on the Scheduling tab."
        bodyClassName="p-0"
        actions={
          canEdit ? (
            <Button onClick={startNew} leftIcon={<PlusIcon className="w-5 h-5" />}>
              Add exam session
            </Button>
          ) : undefined
        }
      >
        <div className="border-t border-surface-border">
          <DataGrid
            columns={columns}
            data={[...assessments]}
            sortable
            filterable
            pagination
            emptyState="No exam sessions yet. Add the first one; marks entry offers it once it is open."
          />
        </div>
      </Card>

      {draft && (
        <Card title={editing ? `Edit ${editing.name}` : 'New exam session'}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Name"
                name="name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, name: event.target.value } : current))
                }
                placeholder="e.g. End of term examination"
              />
              <EntityPicker
                label="Academic period"
                value={draft.academicPeriodId}
                onChange={(next) =>
                  setDraft((current) =>
                    current ? { ...current, academicPeriodId: next } : current
                  )
                }
                lookup={periodLookup}
                placeholder="Select an academic period"
                allowClear
              />
              <label className="block text-sm font-medium text-surface-foreground">
                Kind
                <select
                  className="mt-1.5 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
                  value={draft.kind}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, kind: event.target.value as AssessmentKind }
                        : current
                    )
                  }
                >
                  {ASSESSMENT_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-surface-foreground">
                Status
                <select
                  className="mt-1.5 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, status: event.target.value as AssessmentStatus }
                        : current
                    )
                  }
                >
                  {ASSESSMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <fieldset className="rounded-md border border-surface-border p-3">
                <legend className="px-1 text-sm font-semibold text-surface-foreground">Levels</legend>
                {levels.length === 0 ? (
                  <p className="text-sm text-surface-muted-fg">No levels exist yet.</p>
                ) : (
                  <div className="space-y-2">
                    {levels.map((level) => (
                      <Checkbox
                        key={level.id}
                        checked={draft.levelIds.includes(level.id)}
                        onChange={() =>
                          setDraft((current) =>
                            current
                              ? { ...current, levelIds: toggled(current.levelIds, level.id) }
                              : current
                          )
                        }
                      >
                        {level.name}
                      </Checkbox>
                    ))}
                  </div>
                )}
              </fieldset>

              <fieldset className="rounded-md border border-surface-border p-3">
                <legend className="px-1 text-sm font-semibold text-surface-foreground">
                  Class groups
                </legend>
                {classGroups.length === 0 ? (
                  <p className="text-sm text-surface-muted-fg">No class groups exist yet.</p>
                ) : (
                  <div className="space-y-2">
                    {classGroups.map((group) => (
                      <Checkbox
                        key={group.id}
                        checked={draft.classGroupIds.includes(group.id)}
                        onChange={() =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  classGroupIds: toggled(current.classGroupIds, group.id),
                                }
                              : current
                          )
                        }
                      >
                        {classGroupLabel({ gradeLevel: levelName(group.level_id), name: group.name })}
                      </Checkbox>
                    ))}
                  </div>
                )}
              </fieldset>

              <fieldset className="rounded-md border border-surface-border p-3">
                <legend className="px-1 text-sm font-semibold text-surface-foreground">
                  Learning areas
                </legend>
                {learningAreas.length === 0 ? (
                  <p className="text-sm text-surface-muted-fg">No learning areas exist yet.</p>
                ) : (
                  <div className="space-y-2">
                    {learningAreas.map((area) => (
                      <Checkbox
                        key={area.id}
                        checked={draft.learningAreaIds.includes(area.id)}
                        onChange={() =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  learningAreaIds: toggled(current.learningAreaIds, area.id),
                                }
                              : current
                          )
                        }
                      >
                        {area.name}
                      </Checkbox>
                    ))}
                  </div>
                )}
              </fieldset>
            </div>

            <p className="text-xs text-surface-muted-fg">
              Leaving levels and class groups empty applies the session to the whole school. Marks
              entry offers it for each learning area chosen here.
            </p>

            {formError && (
              <p
                role="alert"
                className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
              >
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeForm}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} loading={saving}>
                {editing ? 'Save session' : 'Create session'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export const ExamSessionsPageContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <ExamSessionList />
  </CanonicalRepositoryProvider>
);

const ExamSessionsPage: React.FC = () => <ExamSessionsPageContent />;

export default ExamSessionsPage;

// ABOUTME: Exam scheduling page — the date window and the learning areas (papers) an assessment
// ABOUTME: covers. Both live on the canonical assessment row, so this screen and Exam Sessions read
// ABOUTME: and write the same record. Per-paper times and rooms are not modelled.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { EditIcon } from '@/components/ui/icons';
import { type UpdateInput } from '@/data/repository';
import { asId } from '@/domain/ids';
import { useCan } from '@/data/auth/useCan';
import { useToast } from '@/hooks/useToast';
import { periodLabel } from '@/utils/academicLabels';

import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { messageOf } from '../data/errors';
import {
  useCanonicalAcademics,
  type AcademicPeriodRow,
  type AssessmentRow,
} from '../data/useCanonicalAcademics';

interface WindowDraft {
  readonly startDate: string;
  readonly endDate: string;
  readonly learningAreaIds: readonly string[];
}

/** The model holds one window for the assessment, not a time for each paper. */
const WINDOW_NOTE =
  'The model holds one date window for the assessment; per-paper times and rooms are not modelled yet.';

function toggled(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id];
}

const ExamWindowList: React.FC = () => {
  const { t } = useTranslation('academics');
  const toast = useToast();
  const {
    repository,
    institutionId,
    isLoading,
    assessments,
    academicPeriods,
    academicYearById,
    learningAreas,
  } = useCanonicalAcademics();

  // Scheduling edits the assessment, so the same assessment.write permission gates it.
  const canEdit = useCan('assessment.write');

  const [editing, setEditing] = useState<AssessmentRow | null>(null);
  const [draft, setDraft] = useState<WindowDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const academicPeriodById = useMemo<ReadonlyMap<string, AcademicPeriodRow>>(
    () => new Map(academicPeriods.map((period) => [period.id, period] as const)),
    [academicPeriods]
  );
  const periodName = (id: string) => {
    const period = academicPeriodById.get(id);
    return period
      ? periodLabel({
          name: period.name,
          academicYear: academicYearById.get(period.academic_year_id)?.name,
        })
      : id;
  };
  const learningAreaName = (id: string) => learningAreas.find((area) => area.id === id)?.name ?? id;

  const startEdit = (row: AssessmentRow) => {
    setEditing(row);
    setFormError(null);
    setDraft({
      startDate: row.date_window?.start_date ?? '',
      endDate: row.date_window?.end_date ?? '',
      learningAreaIds: row.learning_area_ids,
    });
  };

  const closeForm = () => {
    setDraft(null);
    setEditing(null);
    setFormError(null);
  };

  const submit = async () => {
    if (!draft || !editing) return;
    if (!draft.startDate || !draft.endDate) {
      setFormError('Set both the first and the last day of the window.');
      return;
    }
    if (draft.endDate < draft.startDate) {
      setFormError('The window must end on or after the day it starts.');
      return;
    }
    if (draft.learningAreaIds.length === 0) {
      setFormError('Choose at least one learning area: a window with no paper covers nothing.');
      return;
    }
    if (institutionId === null) {
      setFormError(
        'The canonical database holds no institution row, so the window cannot be saved yet.'
      );
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const patch: UpdateInput<'assessment'> = {
        date_window: { start_date: draft.startDate, end_date: draft.endDate },
        learning_area_ids: [...draft.learningAreaIds],
      };
      await repository.update('assessment', asId<'assessment'>(editing.id), patch, {
        expectedVersion: editing.rowVersion,
      });
      toast.showSuccess('Exam window saved.');
      closeForm();
    } catch (error) {
      setFormError(messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  const columns: DataGridColumn<AssessmentRow>[] = [
    { key: 'name', header: 'Session', sortable: true, filterable: true },
    {
      key: 'academic_period_id',
      header: 'Period',
      sortable: true,
      filterable: true,
      render: (_value: unknown, row: AssessmentRow) => periodName(row.academic_period_id),
    },
    {
      key: 'date_window',
      header: 'Window',
      render: (_value: unknown, row: AssessmentRow) =>
        row.date_window ? `${row.date_window.start_date} → ${row.date_window.end_date}` : 'Not set',
    },
    {
      key: 'learning_area_ids',
      header: 'Papers covered',
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
      key: 'actions',
      header: 'Actions',
      render: (_value: unknown, row: AssessmentRow) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => startEdit(row)}
          leftIcon={<EditIcon className="w-4 h-4" />}
        >
          Schedule
        </Button>
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
          The canonical database holds no institution row, so the window cannot be saved yet.
        </p>
      )}

      <Card
        title={t('examScheduling.title', 'Exam Scheduling Management')}
        info="Set the window an assessment runs in and the learning areas it covers. Marks entry reads the same assessment."
        bodyClassName="p-0"
      >
        <p className="border-t border-surface-border p-4 text-sm text-surface-muted-fg">
          {WINDOW_NOTE}
        </p>
        <DataGrid
          columns={columns}
          data={[...assessments]}
          sortable
          filterable
          pagination
          emptyState="No exam sessions yet. Create one on the Exam Sessions tab first."
        />
      </Card>

      {draft && editing && (
        <Card title={`Schedule ${editing.name}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Window start"
                name="window_start"
                type="date"
                value={draft.startDate}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, startDate: event.target.value } : current
                  )
                }
              />
              <Input
                label="Window end"
                name="window_end"
                type="date"
                value={draft.endDate}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, endDate: event.target.value } : current
                  )
                }
              />
            </div>

            <fieldset className="rounded-md border border-surface-border p-3">
              <legend className="px-1 text-sm font-semibold text-surface-foreground">
                Learning areas covered
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
                Save window
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export const ExamSchedulingPageContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <ExamWindowList />
  </CanonicalRepositoryProvider>
);

const ExamSchedulingPage: React.FC = () => <ExamSchedulingPageContent />;

export default ExamSchedulingPage;

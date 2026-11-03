// ABOUTME: Timetable periods page — the school day's timetable slots, one per weekday and start
// ABOUTME: time, read and written as canonical timetable_slot rows. A slot is school configuration,
// ABOUTME: so reference.write gates the controls and the repository still judges every write.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { type CreateInput, type UpdateInput } from '@/data/repository';
import { WEEKDAYS } from '@/domain/schema';
import { asId } from '@/domain/ids';
import { useCan } from '@/data/auth/useCan';
import { useToast } from '@/hooks/useToast';
import { weekdayLabel } from '@/utils/academicLabels';

import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { messageOf } from '../data/errors';
import { useCanonicalAcademics, type TimetableSlotRow } from '../data/useCanonicalAcademics';

interface SlotDraft {
  readonly dayOfWeek: (typeof WEEKDAYS)[number];
  readonly periodNumber: string;
  readonly startTime: string;
  readonly endTime: string;
}

const EMPTY_DRAFT: SlotDraft = {
  dayOfWeek: 'monday',
  periodNumber: '',
  startTime: '08:00',
  endTime: '08:40',
};

/** Order slots by weekday, then by the time the school day reaches them. */
function byDayAndStart(left: TimetableSlotRow, right: TimetableSlotRow): number {
  const dayOrder =
    WEEKDAYS.indexOf(left.day_of_week) - WEEKDAYS.indexOf(right.day_of_week);
  return dayOrder !== 0 ? dayOrder : left.start_time.localeCompare(right.start_time);
}

const TimetableSlotsContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const toast = useToast();
  const confirm = useConfirm();
  const { repository, institutionId, isLoading, timetableSlots } = useCanonicalAcademics();

  // The school day is the school's configuration, not a teacher's: a role that cannot write it
  // does not see the controls. The repository decides whether a write lands.
  const canEdit = useCan('reference.write');

  const [editing, setEditing] = useState<TimetableSlotRow | null>(null);
  const [draft, setDraft] = useState<SlotDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const slots = useMemo(() => [...timetableSlots].sort(byDayAndStart), [timetableSlots]);

  const startNew = () => {
    setEditing(null);
    setFormError(null);
    setDraft(EMPTY_DRAFT);
  };

  const startEdit = (row: TimetableSlotRow) => {
    setEditing(row);
    setFormError(null);
    setDraft({
      dayOfWeek: row.day_of_week,
      periodNumber: row.period_number === undefined ? '' : String(row.period_number),
      startTime: row.start_time,
      endTime: row.end_time,
    });
  };

  const closeForm = () => {
    setDraft(null);
    setEditing(null);
    setFormError(null);
  };

  const submit = async () => {
    if (!draft) return;
    if (!draft.startTime || !draft.endTime) {
      setFormError('A start time and an end time are required.');
      return;
    }
    if (draft.endTime <= draft.startTime) {
      setFormError('The end time must be after the start time.');
      return;
    }
    if (institutionId === null) {
      setFormError(
        'The canonical database holds no institution row, so a period cannot be saved yet.'
      );
      return;
    }
    const periodNumber = draft.periodNumber.trim() === '' ? undefined : Number(draft.periodNumber);
    if (periodNumber !== undefined && (!Number.isInteger(periodNumber) || periodNumber < 0)) {
      setFormError('The period number must be a whole number, zero or more.');
      return;
    }
    const duplicate = slots.some(
      (slot) =>
        slot.id !== editing?.id &&
        slot.day_of_week === draft.dayOfWeek &&
        slot.start_time === draft.startTime
    );
    if (duplicate) {
      setFormError('A period already starts at this time on this day.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const patch: UpdateInput<'timetable_slot'> = {
          day_of_week: draft.dayOfWeek,
          period_number: periodNumber,
          start_time: draft.startTime,
          end_time: draft.endTime,
        };
        await repository.update('timetable_slot', asId<'timetable_slot'>(editing.id), patch, {
          expectedVersion: editing.rowVersion,
        });
        toast.showSuccess('Timetable period saved.');
      } else {
        const payload: CreateInput<'timetable_slot'> = {
          institution_id: institutionId,
          day_of_week: draft.dayOfWeek,
          period_number: periodNumber,
          start_time: draft.startTime,
          end_time: draft.endTime,
        };
        await repository.create('timetable_slot', payload);
        toast.showSuccess('Timetable period added.');
      }
      closeForm();
    } catch (error) {
      setFormError(messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: TimetableSlotRow) => {
    const confirmed = await confirm({
      variant: 'danger',
      message: `Delete the ${weekdayLabel(row.day_of_week)} period starting ${row.start_time}? Timetable entries placed in it are not deleted with it.`,
    });
    if (!confirmed) return;
    try {
      await repository.remove('timetable_slot', asId<'timetable_slot'>(row.id), {
        expectedVersion: row.rowVersion,
      });
      toast.showSuccess('Timetable period deleted.');
    } catch (error) {
      toast.showError(messageOf(error));
    }
  };

  const columns: DataGridColumn<TimetableSlotRow>[] = [
    {
      key: 'day_of_week',
      header: 'Day',
      sortable: true,
      filterable: true,
      render: (_value: unknown, row: TimetableSlotRow) => weekdayLabel(row.day_of_week),
    },
    {
      key: 'period_number',
      header: 'Period',
      align: 'right',
      render: (_value: unknown, row: TimetableSlotRow) => row.period_number ?? '—',
    },
    { key: 'start_time', header: 'Start', sortable: true },
    { key: 'end_time', header: 'End' },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: unknown, row: TimetableSlotRow) => (
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
  ].filter((column) => canEdit || column.key !== 'actions') as DataGridColumn<TimetableSlotRow>[];

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
          The canonical database holds no institution row, so a period cannot be saved yet.
        </p>
      )}

      <Card
        title={t('timetablePeriods.title', 'Timetable Periods Definition')}
        info="The periods of the school day, one row per weekday and start time. Timetable entries place a teaching group in one of these periods."
        bodyClassName="p-0"
        actions={
          canEdit ? (
            <Button onClick={startNew} leftIcon={<PlusIcon className="w-5 h-5" />}>
              Add period
            </Button>
          ) : undefined
        }
      >
        <div className="border-t border-surface-border">
          <DataGrid
            columns={columns}
            data={slots}
            sortable
            filterable
            pagination
            emptyState="No timetable periods yet. Add the first one to define the school day."
          />
        </div>
      </Card>

      {draft && (
        <Card
          title={editing ? `Edit the ${weekdayLabel(editing.day_of_week)} period` : 'New period'}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-surface-foreground">
                Day
                <select
                  className="mt-1.5 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
                  value={draft.dayOfWeek}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, dayOfWeek: event.target.value as SlotDraft['dayOfWeek'] }
                        : current
                    )
                  }
                >
                  {WEEKDAYS.map((day) => (
                    <option key={day} value={day}>
                      {weekdayLabel(day)}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Period number"
                name="period_number"
                type="number"
                min={0}
                step={1}
                value={draft.periodNumber}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, periodNumber: event.target.value } : current
                  )
                }
                helperText="Optional; the position of the period in the day."
              />
              <Input
                label="Start time"
                name="start_time"
                type="time"
                value={draft.startTime}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, startTime: event.target.value } : current
                  )
                }
              />
              <Input
                label="End time"
                name="end_time"
                type="time"
                value={draft.endTime}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, endTime: event.target.value } : current
                  )
                }
              />
            </div>

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
                {editing ? 'Save period' : 'Create period'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export const TimetablePeriodsContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <TimetableSlotsContent />
  </CanonicalRepositoryProvider>
);

const TimetablePeriodsPage: React.FC = () => <TimetablePeriodsContent />;

export default TimetablePeriodsPage;

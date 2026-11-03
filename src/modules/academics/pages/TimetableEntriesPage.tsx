// ABOUTME: Timetable entries page — each entry places one canonical teaching group in one
// ABOUTME: canonical timetable slot, optionally naming a room. Rows read and write timetable_entry
// ABOUTME: only; the slots themselves are defined on the Periods tab.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useLookup } from '@/data/query';
import { type CreateInput, type UpdateInput } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import { WEEKDAYS } from '@/domain/schema';
import { useCan } from '@/data/auth/useCan';
import { useToast } from '@/hooks/useToast';
import { weekdayLabel } from '@/utils/academicLabels';

import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { messageOf } from '../data/errors';
import {
  useCanonicalAcademics,
  type TeachingGroupRow,
  type TimetableEntryRow,
  type TimetableSlotRow,
} from '../data/useCanonicalAcademics';

interface EntryDraft {
  readonly slotId: Id<'timetable_slot'> | null;
  readonly teachingGroupId: Id<'teaching_group'> | null;
  readonly room: string;
}

const EMPTY_DRAFT: EntryDraft = { slotId: null, teachingGroupId: null, room: '' };

/** The slot as a picker names it: its weekday and the time it starts. */
const slotLabel = (slot: TimetableSlotRow): string =>
  `${weekdayLabel(slot.day_of_week)} ${slot.start_time}`;

/** The slot as a grid names it: its weekday and the window it covers. */
const slotWindowLabel = (slot: TimetableSlotRow): string =>
  `${weekdayLabel(slot.day_of_week)} ${slot.start_time}–${slot.end_time}`;

/** Order entries by weekday, then by the time the school day reaches them. */
function byDayAndStart(
  left: TimetableEntryRow,
  right: TimetableEntryRow,
  slotById: ReadonlyMap<string, TimetableSlotRow>
): number {
  const leftSlot = slotById.get(left.slot_id);
  const rightSlot = slotById.get(right.slot_id);
  if (!leftSlot || !rightSlot) return left.slot_id.localeCompare(right.slot_id);
  const dayOrder =
    WEEKDAYS.indexOf(leftSlot.day_of_week) - WEEKDAYS.indexOf(rightSlot.day_of_week);
  return dayOrder !== 0 ? dayOrder : leftSlot.start_time.localeCompare(rightSlot.start_time);
}

const TimetableEntryList: React.FC = () => {
  const { t } = useTranslation('academics');
  const toast = useToast();
  const confirm = useConfirm();
  const { repository, institutionId, isLoading, timetableSlots, timetableEntries, teachingGroups } =
    useCanonicalAcademics();

  // Placing a group in a period is teaching configuration, so teaching.write gates the controls.
  const canEdit = useCan('teaching.write');

  const slotLookup = useLookup(repository, 'timetable_slot', { label: slotLabel });
  const teachingGroupLookup = useLookup(repository, 'teaching_group', { label: (row) => row.name });

  const [editing, setEditing] = useState<TimetableEntryRow | null>(null);
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const slotById = useMemo<ReadonlyMap<string, TimetableSlotRow>>(
    () => new Map(timetableSlots.map((slot) => [slot.id, slot] as const)),
    [timetableSlots]
  );
  const teachingGroupById = useMemo<ReadonlyMap<string, TeachingGroupRow>>(
    () => new Map(teachingGroups.map((group) => [group.id, group] as const)),
    [teachingGroups]
  );
  const entries = useMemo(
    () => [...timetableEntries].sort((left, right) => byDayAndStart(left, right, slotById)),
    [timetableEntries, slotById]
  );

  const noSlots = timetableSlots.length === 0;
  const noGroups = teachingGroups.length === 0;
  const canPlace = canEdit && !noSlots && !noGroups;

  const startNew = () => {
    setEditing(null);
    setFormError(null);
    setDraft({ ...EMPTY_DRAFT, slotId: timetableSlots[0] ? asId<'timetable_slot'>(timetableSlots[0].id) : null });
  };

  const startEdit = (row: TimetableEntryRow) => {
    setEditing(row);
    setFormError(null);
    setDraft({
      slotId: asId<'timetable_slot'>(row.slot_id),
      teachingGroupId: asId<'teaching_group'>(row.teaching_group_id),
      room: row.room ?? '',
    });
  };

  const closeForm = () => {
    setDraft(null);
    setEditing(null);
    setFormError(null);
  };

  const submit = async () => {
    if (!draft) return;
    if (!draft.slotId || !draft.teachingGroupId) {
      setFormError('A period and a teaching group are both required.');
      return;
    }
    if (institutionId === null) {
      setFormError('The canonical database holds no institution row, so an entry cannot be saved yet.');
      return;
    }
    const duplicate = entries.some(
      (entry) =>
        entry.id !== editing?.id &&
        entry.slot_id === draft.slotId &&
        entry.teaching_group_id === draft.teachingGroupId
    );
    if (duplicate) {
      setFormError('This teaching group is already placed in that period.');
      return;
    }

    const room = draft.room.trim() === '' ? undefined : draft.room.trim();
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const patch: UpdateInput<'timetable_entry'> = {
          slot_id: draft.slotId,
          teaching_group_id: draft.teachingGroupId,
          room,
        };
        await repository.update('timetable_entry', asId<'timetable_entry'>(editing.id), patch, {
          expectedVersion: editing.rowVersion,
        });
        toast.showSuccess('Timetable entry saved.');
      } else {
        const payload: CreateInput<'timetable_entry'> = {
          institution_id: institutionId,
          slot_id: draft.slotId,
          teaching_group_id: draft.teachingGroupId,
          room,
        };
        await repository.create('timetable_entry', payload);
        toast.showSuccess('Timetable entry added.');
      }
      closeForm();
    } catch (error) {
      setFormError(messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: TimetableEntryRow) => {
    const confirmed = await confirm({
      variant: 'danger',
      message: 'Remove this teaching group from the period? The group and the period stay.',
    });
    if (!confirmed) return;
    try {
      await repository.remove('timetable_entry', asId<'timetable_entry'>(row.id), {
        expectedVersion: row.rowVersion,
      });
      toast.showSuccess('Timetable entry removed.');
    } catch (error) {
      toast.showError(messageOf(error));
    }
  };

  const columns: DataGridColumn<TimetableEntryRow>[] = [
    {
      key: 'slot_id',
      header: 'Period',
      sortable: true,
      filterable: true,
      render: (_value: unknown, row: TimetableEntryRow) => {
        const slot = slotById.get(row.slot_id);
        return slot ? slotWindowLabel(slot) : row.slot_id;
      },
    },
    {
      key: 'teaching_group_id',
      header: 'Teaching group',
      sortable: true,
      filterable: true,
      render: (_value: unknown, row: TimetableEntryRow) =>
        teachingGroupById.get(row.teaching_group_id)?.name ?? row.teaching_group_id,
    },
    {
      key: 'room',
      header: 'Room',
      render: (_value: unknown, row: TimetableEntryRow) => row.room ?? '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: unknown, row: TimetableEntryRow) => (
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
  ].filter((column) => canEdit || column.key !== 'actions') as DataGridColumn<TimetableEntryRow>[];

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
          The canonical database holds no institution row, so an entry cannot be saved yet.
        </p>
      )}

      <Card
        title={t('timetableEntries.title', 'Class Timetable Management')}
        info="Each row places one teaching group in one of the school-day periods. A period may hold several groups at once when they run in parallel, such as elective sets."
        bodyClassName="p-0"
        actions={
          canPlace ? (
            <Button onClick={startNew} leftIcon={<PlusIcon className="w-5 h-5" />}>
              Add entry
            </Button>
          ) : undefined
        }
      >
        {canEdit && noSlots && (
          <p className="border-t border-surface-border p-4 text-sm text-surface-muted-fg">
            The school day has no periods yet. Add them on the Periods tab first.
          </p>
        )}
        {canEdit && !noSlots && noGroups && (
          <p className="border-t border-surface-border p-4 text-sm text-surface-muted-fg">
            No teaching groups exist yet. Create them on the Teaching groups screen first.
          </p>
        )}
        <div className="border-t border-surface-border">
          <DataGrid
            columns={columns}
            data={entries}
            sortable
            filterable
            pagination
            emptyState="No timetable entries yet. Define the school-day periods first, then place a teaching group in one."
          />
        </div>
      </Card>

      {draft && (
        <Card title={editing ? 'Edit timetable entry' : 'New timetable entry'}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <EntityPicker
                label="Period"
                value={draft.slotId}
                onChange={(next) =>
                  setDraft((current) => (current ? { ...current, slotId: next } : current))
                }
                lookup={slotLookup}
                placeholder="Select a period"
                allowClear
              />
              <EntityPicker
                label="Teaching group"
                value={draft.teachingGroupId}
                onChange={(next) =>
                  setDraft((current) => (current ? { ...current, teachingGroupId: next } : current))
                }
                lookup={teachingGroupLookup}
                placeholder="Select a teaching group"
                allowClear
              />
              <Input
                label="Room"
                name="room"
                value={draft.room}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, room: event.target.value } : current
                  )
                }
                helperText="Optional."
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
                {editing ? 'Save entry' : 'Create entry'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export const TimetableEntriesContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <TimetableEntryList />
  </CanonicalRepositoryProvider>
);

const TimetableEntriesPage: React.FC = () => <TimetableEntriesContent />;

export default TimetableEntriesPage;

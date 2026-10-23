// ABOUTME: Teaching groups page — the canonical replacement for class-subject allocations: one
// ABOUTME: group per class group, learning area and academic year. Rows read and write through
// ABOUTME: the repository, and every reference is chosen with an EntityPicker. The group's id
// ABOUTME: arrays (levels, class groups) are built from the selected class group, because the
// ABOUTME: schema form edits scalar fields only.

import React, { useState } from 'react';
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
import { TEACHING_GROUP_KINDS } from '@/domain/schema';
import { useToast } from '@/hooks/useToast';

import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { messageOf } from '../data/errors';
import { useCanonicalAcademics, type TeachingGroupRow } from '../data/useCanonicalAcademics';

interface GroupDraft {
  readonly name: string;
  readonly classGroupId: Id<'class_group'> | null;
  readonly learningAreaId: Id<'learning_area'> | null;
  readonly academicYearId: Id<'academic_year'> | null;
  readonly campusId: Id<'campus'> | null;
  readonly kind: (typeof TEACHING_GROUP_KINDS)[number];
}

const EMPTY_DRAFT: GroupDraft = {
  name: '',
  classGroupId: null,
  learningAreaId: null,
  academicYearId: null,
  campusId: null,
  kind: 'whole_class',
};

const TeachingGroupsContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const toast = useToast();
  const confirm = useConfirm();
  const {
    repository,
    institutionId,
    isLoading,
    teachingGroups,
    teachingGroupMembers,
    teachingAssignments,
    classGroups,
    levels,
    campuses,
    classGroupById,
    learningAreaById,
    academicYearById,
  } = useCanonicalAcademics();

  const classGroupLookup = useLookup(repository, 'class_group', {
    label: (row) => `${levels.find((level) => level.id === row.level_id)?.name ?? ''} ${row.name}`.trim(),
  });
  const learningAreaLookup = useLookup(repository, 'learning_area', { label: (row) => row.name });
  const academicYearLookup = useLookup(repository, 'academic_year', { label: (row) => row.name });
  const campusLookup = useLookup(repository, 'campus', { label: (row) => row.name });

  const [editing, setEditing] = useState<TeachingGroupRow | null>(null);
  const [draft, setDraft] = useState<GroupDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const startNew = () => {
    setEditing(null);
    setFormError(null);
    setDraft({
      ...EMPTY_DRAFT,
      campusId: campuses.find((campus) => campus.is_main)?.id ?? campuses[0]?.id ?? null,
    });
  };

  const startEdit = (row: TeachingGroupRow) => {
    setEditing(row);
    setFormError(null);
    setDraft({
      name: row.name,
      classGroupId: row.class_group_ids[0] ? asId<'class_group'>(row.class_group_ids[0]) : null,
      learningAreaId: asId<'learning_area'>(row.learning_area_id),
      academicYearId: asId<'academic_year'>(row.academic_year_id),
      campusId: asId<'campus'>(row.campus_id),
      kind: row.kind,
    });
  };

  const closeForm = () => {
    setDraft(null);
    setEditing(null);
    setFormError(null);
  };

  const changeClassGroup = (classGroupId: Id<'class_group'> | null) => {
    const classGroup = classGroups.find((row) => row.id === classGroupId);
    setDraft((current) =>
      current
        ? {
            ...current,
            classGroupId,
            academicYearId: classGroup
              ? asId<'academic_year'>(classGroup.academic_year_id)
              : current.academicYearId,
            campusId: classGroup ? asId<'campus'>(classGroup.campus_id) : current.campusId,
          }
        : current
    );
  };

  const submit = async () => {
    if (!draft) return;
    const classGroup = classGroups.find((row) => row.id === draft.classGroupId);
    if (!draft.name.trim() || !classGroup || !draft.learningAreaId || !draft.academicYearId || !draft.campusId) {
      setFormError('Name, class group, learning area, academic year and campus are required.');
      return;
    }
    if (institutionId === null) {
      setFormError('The canonical database holds no institution row, so a teaching group cannot be saved yet.');
      return;
    }
    if (
      teachingGroups.some(
        (row) =>
          row.id !== editing?.id &&
          row.campus_id === draft.campusId &&
          row.academic_year_id === draft.academicYearId &&
          row.learning_area_id === draft.learningAreaId &&
          row.name === draft.name.trim()
      )
    ) {
      setFormError('A teaching group with this name already exists for that learning area and year.');
      return;
    }

    const payload: CreateInput<'teaching_group'> = {
      institution_id: institutionId,
      campus_id: draft.campusId,
      academic_year_id: draft.academicYearId,
      learning_area_id: draft.learningAreaId,
      name: draft.name.trim(),
      level_ids: [classGroup.level_id],
      class_group_ids: [classGroup.id],
      teacher_ids: editing?.teacher_ids ?? [],
      kind: draft.kind,
    };

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const patch: UpdateInput<'teaching_group'> = {
          campus_id: payload.campus_id,
          academic_year_id: payload.academic_year_id,
          learning_area_id: payload.learning_area_id,
          name: payload.name,
          level_ids: payload.level_ids,
          class_group_ids: payload.class_group_ids,
          kind: payload.kind,
        };
        await repository.update('teaching_group', asId<'teaching_group'>(editing.id), patch, {
          expectedVersion: editing.rowVersion,
        });
        toast.showSuccess('Teaching group saved.');
      } else {
        await repository.create('teaching_group', payload);
        toast.showSuccess('Teaching group created.');
      }
      closeForm();
    } catch (error) {
      setFormError(messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: TeachingGroupRow) => {
    const confirmed = await confirm({
      variant: 'danger',
      message: `Delete the teaching group ${row.name}? Its memberships and assignments are not deleted with it.`,
    });
    if (!confirmed) return;
    try {
      await repository.remove('teaching_group', asId<'teaching_group'>(row.id), {
        expectedVersion: row.rowVersion,
      });
      toast.showSuccess('Teaching group deleted.');
    } catch (error) {
      toast.showError(messageOf(error));
    }
  };

  const classGroupName = (id: string) => classGroupById.get(id)?.name ?? id;
  const columns: DataGridColumn<TeachingGroupRow>[] = [
    {
      key: 'name',
      header: t('classSubjectAllocations.title', 'Teaching group'),
      sortable: true,
      filterable: true,
    },
    {
      key: 'class_group_ids',
      header: 'Class group',
      render: (_value: unknown, row: TeachingGroupRow) =>
        row.class_group_ids.length > 0 ? row.class_group_ids.map(classGroupName).join(', ') : '—',
    },
    {
      key: 'learning_area_id',
      header: t('classSubjectAllocations.subjectLabel', 'Learning area'),
      render: (_value: unknown, row: TeachingGroupRow) =>
        learningAreaById.get(row.learning_area_id)?.name ?? row.learning_area_id,
    },
    {
      key: 'academic_year_id',
      header: t('classSubjectAllocations.academicYearLabel', 'Academic year'),
      render: (_value: unknown, row: TeachingGroupRow) =>
        academicYearById.get(row.academic_year_id)?.name ?? row.academic_year_id,
    },
    { key: 'kind', header: 'Kind' },
    {
      key: 'members',
      header: 'Members',
      align: 'right',
      render: (_value: unknown, row: TeachingGroupRow) =>
        teachingGroupMembers.filter((member) => member.teaching_group_id === row.id).length,
    },
    {
      key: 'teachers',
      header: 'Teachers',
      align: 'right',
      render: (_value: unknown, row: TeachingGroupRow) =>
        teachingAssignments.filter((assignment) => assignment.teaching_group_id === row.id).length,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: unknown, row: TeachingGroupRow) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => startEdit(row)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => void remove(row)}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card
        title={t('classSubjectAllocations.title', 'Teaching groups')}
        bodyClassName="p-0"
        actions={
          <Button onClick={startNew} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add teaching group
          </Button>
        }
      >
        <p className="border-t border-surface-border p-4 text-sm text-surface-muted-fg">
          A teaching group joins one class group and one learning area for an academic year. Its
          members are the learners taught it; its assignments are the teachers.
        </p>
        <DataGrid
          columns={columns}
          data={[...teachingGroups]}
          sortable
          filterable
          pagination
          emptyState="No teaching groups yet. Add the first one."
        />
      </Card>

      {draft && (
        <Card title={editing ? `Edit ${editing.name}` : 'New teaching group'}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, name: event.target.value } : current))
                }
                placeholder="e.g. Grade 7 East Mathematics"
              />
              <EntityPicker
                label="Class group"
                value={draft.classGroupId}
                onChange={changeClassGroup}
                lookup={classGroupLookup}
                placeholder="Select a class group"
                allowClear
              />
              <EntityPicker
                label={t('classSubjectAllocations.subjectLabel', 'Learning area')}
                value={draft.learningAreaId}
                onChange={(next) =>
                  setDraft((current) => (current ? { ...current, learningAreaId: next } : current))
                }
                lookup={learningAreaLookup}
                placeholder="Select a learning area"
                allowClear
              />
              <EntityPicker
                label={t('classSubjectAllocations.academicYearLabel', 'Academic year')}
                value={draft.academicYearId}
                onChange={(next) =>
                  setDraft((current) => (current ? { ...current, academicYearId: next } : current))
                }
                lookup={academicYearLookup}
                placeholder="Select an academic year"
                allowClear
              />
              <EntityPicker
                label="Campus"
                value={draft.campusId}
                onChange={(next) =>
                  setDraft((current) => (current ? { ...current, campusId: next } : current))
                }
                lookup={campusLookup}
                placeholder="Select a campus"
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
                        ? { ...current, kind: event.target.value as GroupDraft['kind'] }
                        : current
                    )
                  }
                >
                  {TEACHING_GROUP_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {formError && (
              <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeForm}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} loading={saving}>
                {editing ? 'Save teaching group' : 'Create teaching group'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export const ClassSubjectAllocationsContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <TeachingGroupsContent />
  </CanonicalRepositoryProvider>
);

const ClassSubjectAllocationsPage: React.FC = () => <ClassSubjectAllocationsContent />;

export default ClassSubjectAllocationsPage;

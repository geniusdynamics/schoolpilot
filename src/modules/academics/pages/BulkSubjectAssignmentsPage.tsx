// ABOUTME: Bulk curriculum assignments: one row per subject for a class's teachers, and one matrix of
// ABOUTME: learners x subjects for subject registration. Both save through the canonical repository.

import React, { useEffect, useMemo, useState } from 'react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { useToast } from '@/hooks/useToast';
import { asId } from '@/domain/ids';

import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import {
  personName,
  useCanonicalAcademics,
  type EnrolmentRow,
  type TeachingGroupRow,
} from '../data/useCanonicalAcademics';

const today = (): string => new Date().toISOString().slice(0, 10);

const effective = (row: { valid_from: string; valid_to: string | null }, at: string): boolean =>
  row.valid_from <= at && (row.valid_to === null || row.valid_to >= at);

/**
 * A class group's label for a picker.
 *
 * A stream is named `A` or `B`; the same name repeats in every level, so a picker that shows only
 * the stream cannot say which class it is choosing.
 */
const classGroupLabel = (
  group: { readonly name: string; readonly level_id?: string },
  levelNameOf: ReadonlyMap<string, string>
): string => {
  const level = group.level_id === undefined ? undefined : levelNameOf.get(group.level_id);
  return level === undefined ? group.name : `${level} · ${group.name}`;
};

/* -------------------------------------------------------------------------- */
/* Teacher grid                                                               */
/* -------------------------------------------------------------------------- */

export const TeacherGridInner: React.FC = () => {
  const toast = useToast();
  const {
    repository,
    institutionId,
    isLoading,
    teachingGroups,
    teachingAssignments,
    staff,
    staffById,
    academicYears,
    classGroups,
    levels,
    learningAreaById,
  } = useCanonicalAcademics();

  const [yearId, setYearId] = useState<string>('');
  const [classGroupId, setClassGroupId] = useState<string>('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const levelNameOf = useMemo(
    () => new Map(levels.map((level) => [String(level.id), level.name] as const)),
    [levels]
  );

  useEffect(() => {
    if (yearId) return;
    const current = academicYears.find((year) => year.status === 'current') ?? academicYears[0];
    if (current) setYearId(current.id);
  }, [yearId, academicYears]);

  useEffect(() => {
    if (classGroupId) return;
    const first = classGroups[0];
    if (first) setClassGroupId(first.id);
  }, [classGroupId, classGroups]);

  const groups = useMemo(
    () =>
      teachingGroups
        .filter((group) => group.academic_year_id === yearId)
        .filter((group) => typeGroupClass(group, classGroupId))
        .sort((left, right) =>
          (learningAreaById.get(left.learning_area_id)?.name ?? left.name).localeCompare(
            learningAreaById.get(right.learning_area_id)?.name ?? right.name
          )
        ),
    [teachingGroups, yearId, classGroupId, learningAreaById]
  );

  const existingByGroup = useMemo(() => {
    const map = new Map<string, (typeof teachingAssignments)[number]>();
    for (const assignment of teachingAssignments) {
      if (!effective({ ...assignment, valid_to: assignment.valid_to ?? null }, today())) continue;
      if (!map.has(assignment.teaching_group_id) || assignment.role === 'main') {
        map.set(assignment.teaching_group_id, assignment);
      }
    }
    return map;
  }, [teachingAssignments]);

  const currentTeacher = (groupId: string): string =>
    draft[groupId] ?? existingByGroup.get(groupId)?.staff_id ?? '';

  const rows = groups.map((group) => ({
    id: group.id,
    subject: learningAreaById.get(group.learning_area_id)?.name ?? group.learning_area_id,
    groupName: group.name,
    teacherId: currentTeacher(group.id),
  }));

  const columns: DataGridColumn<(typeof rows)[number]>[] = [
    { key: 'subject', header: 'Subject', sortable: true, filterable: true },
    { key: 'groupName', header: 'Teaching group', sortable: true, filterable: true },
    {
      key: 'teacherId',
      header: 'Subject teacher',
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <select
          aria-label={`Teacher for ${row.subject}`}
          value={currentTeacher(row.id)}
          onChange={(event) =>
            setDraft((current) => ({ ...current, [row.id]: event.target.value }))
          }
          className="h-8 min-w-[14rem] rounded border border-surface-input bg-surface-card px-2 text-sm"
        >
          <option value="">Not assigned</option>
          {staff
            .slice()
            .sort((left, right) => personName(left).localeCompare(personName(right)))
            .map((member) => (
              <option key={member.id} value={member.id}>
                {personName(member)}
              </option>
            ))}
        </select>
      ),
    },
  ];

  const save = async () => {
    if (!institutionId) return;
    const year = academicYears.find((row) => row.id === yearId);
    const validFrom = year?.start_date ?? today();
    setSaving(true);
    let saved = 0;
    const failures: string[] = [];
    for (const [groupId, teacherId] of Object.entries(draft)) {
      const existing = existingByGroup.get(groupId);
      try {
        if (teacherId === '') {
          if (existing) {
            await repository.remove('teaching_assignment', asId<'teaching_assignment'>(existing.id), {
              expectedVersion: existing.rowVersion,
            });
            saved += 1;
          }
          continue;
        }
        if (existing) {
          if (existing.staff_id === teacherId) continue;
          await repository.update(
            'teaching_assignment',
            asId<'teaching_assignment'>(existing.id),
            { staff_id: asId<'staff'>(teacherId) },
            { expectedVersion: existing.rowVersion }
          );
        } else {
          await repository.create('teaching_assignment', {
            institution_id: asId<'institution'>(institutionId),
            staff_id: asId<'staff'>(teacherId),
            teaching_group_id: asId<'teaching_group'>(groupId),
            role: 'main',
            valid_from: validFrom,
          });
        }
        saved += 1;
      } catch (error) {
        failures.push(`${groupId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    setSaving(false);
    setDraft({});
    if (failures.length > 0) toast.showError(`${saved} saved, ${failures.length} failed. ${failures[0]}`);
    else toast.showSuccess(`${saved} teacher assignment(s) saved.`);
  };

  if (isLoading && teachingGroups.length === 0) {
    return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;
  }

  return (
    <Card
      title="Teacher subject grid"
      info="One row per subject of the chosen class. Saving sets the subject teacher for each teaching group; the teacher's marks scope follows this assignment."
      actions={
        <Button onClick={() => void save()} loading={saving} disabled={Object.keys(draft).length === 0}>
          Save assignments ({Object.keys(draft).length})
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-surface-foreground">Academic year</span>
          <select
            value={yearId}
            onChange={(event) => setYearId(event.target.value)}
            className="w-full rounded-md border border-surface-border px-3 py-2"
          >
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>{year.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-surface-foreground">Class / stream</span>
          <select
            value={classGroupId}
            onChange={(event) => setClassGroupId(event.target.value)}
            className="w-full rounded-md border border-surface-border px-3 py-2"
          >
            {classGroups.map((group) => (
              <option key={group.id} value={group.id}>{classGroupLabel(group, levelNameOf)}</option>
            ))}
          </select>
        </label>
      </div>
      <DataGrid
        columns={columns}
        data={rows}
        sortable
        filterable
        emptyState={{
          title: 'No teaching groups for this class',
          description: 'Create the class subject allocations first, then assign a teacher to each.',
        }}
      />
      <p className="mt-3 text-xs text-surface-muted-fg">
        {staffById.size} staff member(s) available.
      </p>
    </Card>
  );
};

function typeGroupClass(group: TeachingGroupRow, classGroupId: string): boolean {
  return classGroupId === '' || (group.class_group_ids ?? []).includes(classGroupId);
}

/* -------------------------------------------------------------------------- */
/* Student subject matrix                                                     */
/* -------------------------------------------------------------------------- */

interface MatrixRow {
  readonly id: string;
  readonly learnerName: string;
  readonly admissionNumber: string;
  readonly enrolment: EnrolmentRow;
}

export const StudentMatrixInner: React.FC = () => {
  const toast = useToast();
  const {
    repository,
    institutionId,
    isLoading,
    teachingGroups,
    teachingGroupMembers,
    classGroups,
    academicYears,
    levels,
    enrolments,
    learnerById,
    learningAreaById,
  } = useCanonicalAcademics();

  const [yearId, setYearId] = useState('');
  const [classGroupId, setClassGroupId] = useState('');
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const levelNameOf = useMemo(
    () => new Map(levels.map((level) => [String(level.id), level.name] as const)),
    [levels]
  );

  useEffect(() => {
    if (yearId) return;
    const current = academicYears.find((year) => year.status === 'current') ?? academicYears[0];
    if (current) setYearId(current.id);
  }, [yearId, academicYears]);

  useEffect(() => {
    if (classGroupId) return;
    if (classGroups[0]) setClassGroupId(classGroups[0].id);
  }, [classGroupId, classGroups]);

  const year = academicYears.find((row) => row.id === yearId);
  const groups = useMemo(
    () =>
      teachingGroups
        .filter((group) => group.academic_year_id === yearId)
        .filter((group) => (group.class_group_ids ?? []).includes(classGroupId))
        .filter(
          (group) => subjectFilter === '' || group.learning_area_id === subjectFilter
        )
        .sort((left, right) =>
          (learningAreaById.get(left.learning_area_id)?.name ?? left.name).localeCompare(
            learningAreaById.get(right.learning_area_id)?.name ?? right.name
          )
        ),
    [teachingGroups, yearId, classGroupId, subjectFilter, learningAreaById]
  );

  const existing = useMemo(() => {
    const set = new Set<string>();
    const at = year?.start_date ?? today();
    for (const membership of teachingGroupMembers) {
      if (!effective({ ...membership, valid_to: membership.valid_to ?? null }, at)) continue;
      set.add(`${membership.enrolment_id}|${membership.teaching_group_id}`);
    }
    return set;
  }, [teachingGroupMembers, year]);

  const membershipOf = (enrolmentId: string, groupId: string) => {
    const key = `${enrolmentId}|${groupId}`;
    return draft[key] ?? existing.has(key);
  };

  const rows = useMemo<MatrixRow[]>(
    () =>
      enrolments
        .filter((enrolment) => enrolment.class_group_id === classGroupId)
        .filter((enrolment) => enrolment.status === 'active' || enrolment.status === 'repeating')
        .map((enrolment) => {
          const learner = learnerById.get(enrolment.learner_id);
          return {
            id: enrolment.id,
            learnerName: learner ? personName(learner) : enrolment.learner_id,
            admissionNumber: learner?.admission_number ?? '',
            enrolment,
          };
        })
        .filter(
          (row) =>
            search.trim() === '' ||
            row.learnerName.toLowerCase().includes(search.trim().toLowerCase()) ||
            row.admissionNumber.toLowerCase().includes(search.trim().toLowerCase())
        )
        .sort((left, right) => left.learnerName.localeCompare(right.learnerName)),
    [enrolments, classGroupId, learnerById, search]
  );

  const gridRows = rows.map((row) => ({
    ...row,
    ...Object.fromEntries(groups.map((group) => [`v:${group.id}`, membershipOf(row.id, group.id)])),
  }));

  const columns: DataGridColumn<(typeof gridRows)[number]>[] = [
    {
      key: 'learnerName',
      header: 'Learner',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-medium">{String(value)}</span>,
    },
    { key: 'admissionNumber', header: 'Adm no', sortable: true, filterable: true },
    ...groups.map((group) => ({
      key: `v:${group.id}`,
      header: learningAreaById.get(group.learning_area_id)?.name ?? group.name,
      align: 'center' as const,
      sortable: false,
      filterable: false,
      render: (_value: unknown, row: (typeof gridRows)[number]) => (
        <input
          type="checkbox"
          aria-label={`${learningAreaById.get(group.learning_area_id)?.name ?? group.name} for ${row.learnerName}`}
          checked={membershipOf(row.id, group.id)}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              [`${row.id}|${group.id}`]: event.target.checked,
            }))
          }
          className="h-4 w-4 rounded border-surface-border"
        />
      ),
    })),
  ];

  const changed = Object.entries(draft).filter(
    ([key, value]) => existing.has(key) !== value
  );

  const save = async () => {
    if (!institutionId || !year) return;
    setSaving(true);
    let saved = 0;
    const failures: string[] = [];
    for (const [key, checked] of changed) {
      const [enrolmentId, groupId] = key.split('|');
      const previous = teachingGroupMembers.find(
        (membership) =>
          membership.enrolment_id === enrolmentId &&
          membership.teaching_group_id === groupId &&
          effective({ ...membership, valid_to: membership.valid_to ?? null }, year.start_date)
      );
      try {
        if (checked && !previous) {
          await repository.create('teaching_group_member', {
            institution_id: asId<'institution'>(institutionId),
            teaching_group_id: asId<'teaching_group'>(groupId),
            enrolment_id: asId<'enrolment'>(enrolmentId),
            valid_from: year.start_date,
          });
          saved += 1;
        } else if (!checked && previous) {
          await repository.remove('teaching_group_member', asId<'teaching_group_member'>(previous.id), {
            expectedVersion: previous.rowVersion,
          });
          saved += 1;
        }
      } catch (error) {
        failures.push(`${key}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    setSaving(false);
    setDraft({});
    if (failures.length > 0) toast.showError(`${saved} saved, ${failures.length} failed. ${failures[0]}`);
    else toast.showSuccess(`${saved} subject registration(s) saved.`);
  };

  if (isLoading && teachingGroups.length === 0) {
    return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;
  }

  return (
    <Card
      title="Student subject matrix"
      info="Tick the subjects each learner takes for the class and year. A tick creates a teaching-group membership; clearing it removes the membership, which is what the marks grid uses to decide who may be marked."
      actions={
        <Button onClick={() => void save()} loading={saving} disabled={changed.length === 0}>
          Save registrations ({changed.length})
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-surface-foreground">Academic year</span>
          <select
            value={yearId}
            onChange={(event) => setYearId(event.target.value)}
            className="w-full rounded-md border border-surface-border px-3 py-2"
          >
            {academicYears.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-surface-foreground">Class / stream</span>
          <select
            value={classGroupId}
            onChange={(event) => setClassGroupId(event.target.value)}
            className="w-full rounded-md border border-surface-border px-3 py-2"
          >
            {classGroups.map((group) => (
              <option key={group.id} value={group.id}>{classGroupLabel(group, levelNameOf)}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-surface-foreground">Subject</span>
          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            className="w-full rounded-md border border-surface-border px-3 py-2"
          >
            <option value="">All subjects</option>
            {[...new Map(teachingGroups.map((group) => [group.learning_area_id, group])).values()].map(
              (group) => (
                <option key={group.learning_area_id} value={group.learning_area_id}>
                  {learningAreaById.get(group.learning_area_id)?.name ?? group.learning_area_id}
                </option>
              )
            )}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-surface-foreground">Search</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or admission number"
          />
        </label>
      </div>

      <DataGrid
        columns={columns}
        data={gridRows}
        sortable
        filterable
        emptyState={{
          title: 'No learners or subjects',
          description: 'Choose a class with active learners and teaching groups.',
        }}
      />
      {changed.length > 0 ? (
        <p className="mt-3 text-sm text-surface-muted-fg">
          <Badge variant="info" size="sm">{changed.length} change(s) not saved</Badge>
        </p>
      ) : null}
      <p className="mt-2 text-xs text-surface-muted-fg">
        Registration is a teaching-group membership valid from {year?.start_date ?? 'the year start'}.
      </p>
    </Card>
  );
};

export const TeacherAssignmentGridContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <TeacherGridInner />
  </CanonicalRepositoryProvider>
);

export const StudentSubjectMatrixContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <StudentMatrixInner />
  </CanonicalRepositoryProvider>
);

export default TeacherAssignmentGridContent;

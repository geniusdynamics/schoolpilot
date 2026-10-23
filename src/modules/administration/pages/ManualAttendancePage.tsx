// ABOUTME: Manual daily roll-call: pick a class group, mark learners Present/Absent/Late and save.
// ABOUTME: The register and its marks are written through AttendanceService; the roster is the canonical enrolment.

import React, { useCallback, useMemo, useState } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { EntityPicker } from '@/components/ui/EntityPicker';
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  XCircleIcon,
} from '@/components/ui/icons';
import { useToast } from '@/hooks/useToast';
import { asId } from '@/domain/ids';
import { AttendanceService } from '@/domain/services';
import { logger } from '@/utils/logging';

import { useWritableRepository } from '../data/useWritableRepository';
import { useCanonicalClassGroups } from '../data/useCanonicalClassGroups';
import { useCanonicalLearners } from '../data/useCanonicalLearners';
import { useCanonicalStaff } from '../data/useCanonicalStaff';

type AttendanceStatus = 'Present' | 'Absent' | 'Late';

interface RollCallRow {
  readonly id: string;
  readonly learner_id: string;
  readonly student_name: string;
  readonly admission_no: string;
  readonly class_name: string;
  readonly status: AttendanceStatus;
}

const CANONICAL_STATUS: Record<AttendanceStatus, 'present' | 'absent' | 'late'> = {
  Present: 'present',
  Absent: 'absent',
  Late: 'late',
};

export const ManualAttendanceContent: React.FC = () => {
  const repository = useWritableRepository();
  const { classGroups, classGroupsLookup } = useCanonicalClassGroups();
  const { learners } = useCanonicalLearners();
  const { staff } = useCanonicalStaff();
  const toast = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0] as string);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);

  const classLabelById = useMemo(
    () => new Map(classGroups.map((group) => [group.id, group.display_name])),
    [classGroups]
  );

  const rollCallRows = useMemo<RollCallRow[]>(() => {
    const rows = learners
      .filter((learner) => !learner.deleted_at)
      .filter((learner) => (selectedClass ? learner.class_group_id === selectedClass : false))
      .map((learner) => ({
        id: learner.id,
        learner_id: learner.id,
        student_name: learner.name,
        admission_no: learner.admission_no,
        class_name: (learner.class_group_id
          ? classLabelById.get(learner.class_group_id)
          : undefined) ?? '—',
        status: attendanceData[learner.id] ?? 'Present',
      }));

    if (!searchTerm) return rows;
    const needle = searchTerm.toLowerCase();
    return rows.filter(
      (row) =>
        row.student_name.toLowerCase().includes(needle) ||
        row.admission_no.toLowerCase().includes(needle)
    );
  }, [learners, selectedClass, classLabelById, attendanceData, searchTerm]);

  const handleStatusChange = (learnerId: string, status: AttendanceStatus) => {
    setAttendanceData((previous) => ({ ...previous, [learnerId]: status }));
  };

  const handleSaveAttendance = useCallback(async () => {
    if (!selectedClass || rollCallRows.length === 0) {
      toast.showWarning('Select a class group with at least one learner before saving.');
      return;
    }

    // The register names the member of staff who took it. The manual entry screen has no
    // staff picker, so it uses the first active member of the school.
    const takenBy = staff.find((member) => member.is_active) ?? staff[0];
    if (!takenBy) {
      toast.showError('The school has no member of staff, so the register cannot be taken.');
      return;
    }

    setIsSaving(true);
    try {
      const attendance = new AttendanceService({ repository });
      const session = await attendance.openRegister({
        scope: { kind: 'class_group', id: asId<'class_group'>(selectedClass) },
        date: selectedDate,
        session: 'day',
        takenBy: asId<'staff'>(takenBy.id),
      });

      for (const row of rollCallRows) {
        const status = attendanceData[row.learner_id] ?? 'Present';
        await attendance.recordMark({
          sessionId: asId<'attendance_session'>(session.id),
          learnerId: asId<'learner'>(row.learner_id),
          status: CANONICAL_STATUS[status],
          ...(status === 'Present' ? {} : { reason: 'other' as const }),
        });
      }

      toast.showSuccess(`Saved ${rollCallRows.length} attendance record(s).`);
      setAttendanceData({});
    } catch (caught) {
      logger.error('Failed to save attendance:', caught);
      toast.showError('Failed to save attendance.');
    } finally {
      setIsSaving(false);
    }
  }, [repository, selectedClass, selectedDate, rollCallRows, attendanceData, staff, toast]);

  const columns: DataGridColumn<RollCallRow>[] = [
    { key: 'student_name', header: 'Student Name', sortable: true, filterable: true },
    { key: 'admission_no', header: 'Admission No', sortable: true, filterable: true },
    { key: 'class_name', header: 'Class', sortable: true, filterable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_value, record) => (
        <div className="flex gap-2">
          {(['Present', 'Absent', 'Late'] as const).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(record.learner_id, status)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                record.status === status &&
                (attendanceData[record.learner_id] === status ||
                  (!attendanceData[record.learner_id] && status === 'Present'))
                  ? status === 'Present'
                    ? 'bg-green-500 text-white'
                    : status === 'Absent'
                      ? 'bg-red-500 text-white'
                      : 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-surface-foreground'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      ),
    },
  ];

  const totals = useMemo(
    () => ({
      total: rollCallRows.length,
      present: rollCallRows.filter((row) => row.status === 'Present').length,
      absent: rollCallRows.filter((row) => row.status === 'Absent').length,
      late: rollCallRows.filter((row) => row.status === 'Late').length,
    }),
    [rollCallRows]
  );

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-emerald-600" />
            <span>Manual Attendance</span>
          </div>
        }
        actions={
          <Button onClick={() => void handleSaveAttendance()} variant="primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Attendance'}
          </Button>
        }
        info="Record one full-day register for a class group. Learners not marked are saved as present."
      >

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <UserIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Total Students</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-surface-foreground">{totals.total}</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Present</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-600">{totals.present}</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <XCircleIcon className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium">Absent</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-600">{totals.absent}</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ClockIcon className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium">Late</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-yellow-600">{totals.late}</p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-surface-foreground" htmlFor="attendance-date">
              Date
            </label>
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </div>
          <div className="flex-1">
            <EntityPicker
              id="attendance-class"
              name="class_group_id"
              label="Class"
              value={selectedClass ? asId<'class_group'>(selectedClass) : null}
              onChange={(id) => setSelectedClass(id)}
              lookup={classGroupsLookup}
              placeholder="Select class group"
              data-testid="attendance-class-picker"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-surface-foreground" htmlFor="attendance-search">
              Search
            </label>
            <input
              id="attendance-search"
              type="text"
              placeholder="Student, admission..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </div>
        </div>

        <DataGrid data={rollCallRows} columns={columns} />
      </Card>
    </div>
  );
};

const ManualAttendancePage: React.FC = () => (
  <div className="space-y-3">
    <ManualAttendanceContent />
  </div>
);

const ManualAttendancePageWithRepository = withCanonicalRepository(ManualAttendancePage);
export default ManualAttendancePageWithRepository;

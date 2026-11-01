// ABOUTME: Daily staff attendance register over the canonical staff directory, persisted in staff_attendance_records.
// ABOUTME: The register defaults to the selected date, filters by department and writes one row per staff member.

import React, { useEffect, useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { useToast } from '@/hooks/useToast';
import { CheckCircleIcon, ClockIcon, UserIcon, XCircleIcon } from '@/components/ui/icons';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

import { useCanonicalStaff } from '../data/useCanonicalStaff';
import type { StaffAttendanceRecord, StaffAttendanceStatus } from '../data/types';

const STATUS_OPTIONS: readonly StaffAttendanceStatus[] = ['Present', 'Absent', 'Late', 'On Leave'];

interface AttendanceRow {
  readonly id: string;
  readonly staff_id: string;
  readonly staff_name: string;
  readonly employee_id: string;
  readonly department: string;
  readonly designation: string;
}

export const StaffAttendanceContent: React.FC = () => {
  const { staff, isLoading } = useCanonicalStaff();
  const records = useDatabaseCollection<StaffAttendanceRecord>('staff_attendance_records');
  const toast = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, StaffAttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const rows = useMemo<AttendanceRow[]>(
    () =>
      staff.map((member) => ({
        id: member.id,
        staff_id: member.id,
        staff_name: member.display_name || member.name,
        employee_id: member.employee_number || member.staff_no,
        department: member.department || member.department_name || '',
        designation: member.designation_title || member.job_title || '',
      })),
    [staff]
  );

  const existing = useMemo(
    () => records.data.filter((record) => record.date === selectedDate),
    [records.data, selectedDate]
  );

  useEffect(() => {
    const next: Record<string, StaffAttendanceStatus> = {};
    for (const record of existing) next[record.staff_id] = record.status;
    setAttendanceData(next);
  }, [existing]);

  const departments = useMemo(
    () => [...new Set(rows.map((row) => row.department).filter(Boolean))].sort(),
    [rows]
  );

  const visible = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!selectedDepartment || row.department === selectedDepartment) &&
        (!term ||
          row.staff_name.toLowerCase().includes(term) ||
          row.employee_id.toLowerCase().includes(term))
    );
  }, [rows, selectedDepartment, searchTerm]);

  const counts = useMemo(() => {
    const values = Object.values(attendanceData);
    return {
      present: values.filter((status) => status === 'Present').length,
      absent: values.filter((status) => status === 'Absent').length,
      late: values.filter((status) => status === 'Late').length,
      leave: values.filter((status) => status === 'On Leave').length,
    };
  }, [attendanceData]);

  const save = async () => {
    const marked = Object.entries(attendanceData).filter(([, status]) => Boolean(status));
    if (marked.length === 0) {
      toast.showWarning('Mark at least one staff member before saving.');
      return;
    }
    setSaving(true);
    try {
      for (const [staffId, status] of marked) {
        const row = rows.find((candidate) => candidate.staff_id === staffId);
        if (!row) continue;
        const record = existing.find((candidate) => candidate.staff_id === staffId);
        const payload = {
          staff_id: staffId,
          staff_name: row.staff_name,
          employee_id: row.employee_id,
          department: row.department,
          designation: row.designation,
          date: selectedDate,
          status,
          updated_at: new Date().toISOString(),
        };
        if (record) {
          await records.update(record.id, payload);
        } else {
          await records.insert({ ...payload, created_at: new Date().toISOString() } as Omit<
            StaffAttendanceRecord,
            'id'
          >);
        }
      }
      toast.showSuccess(`Staff attendance saved for ${selectedDate}.`);
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : 'Could not save staff attendance.');
    } finally {
      setSaving(false);
    }
  };

  const columns: DataGridColumn<AttendanceRow>[] = [
    { key: 'staff_name', header: 'Staff Name', sortable: true, filterable: false },
    { key: 'employee_id', header: 'Employee No', sortable: true, filterable: false },
    { key: 'department', header: 'Department', sortable: true, filterable: false },
    { key: 'designation', header: 'Designation', sortable: true, filterable: false },
    {
      key: 'staff_id',
      header: 'Status',
      sortable: false,
      filterable: false,
      render: (_value, row) => (
        <select
          aria-label={`Attendance for ${row.staff_name}`}
          value={attendanceData[row.staff_id] ?? ''}
          onChange={(event) =>
            setAttendanceData((current) => ({
              ...current,
              [row.staff_id]: event.target.value as StaffAttendanceStatus,
            }))
          }
          className="rounded-md border border-surface-border bg-surface px-2 py-1.5 text-sm"
        >
          <option value="">Not marked</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      ),
    },
  ];

  if (isLoading && rows.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
        <span className="ml-2">Loading staff attendance...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card
        title="Staff Attendance"
        info="One register per day. Statuses write to staff_attendance_records and overwrite the same staff/date row instead of duplicating it."
        actions={
          <Button onClick={() => void save()} loading={saving} disabled={visible.length === 0}>
            Save Register
          </Button>
        }
      >
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <UserIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Marked</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-surface-foreground">
              {Object.keys(attendanceData).length}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Present</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-600">{counts.present}</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <XCircleIcon className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium">Absent</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-600">{counts.absent}</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ClockIcon className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium">Late / Leave</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-yellow-600">{counts.late + counts.leave}</p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          <label className="min-w-[180px] flex-1 text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </label>
          <label className="min-w-[180px] flex-1 text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Department</span>
            <select
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </label>
          <label className="min-w-[180px] flex-1 text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Search</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Name or employee number"
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </label>
          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={() => setAttendanceData({})} disabled={saving}>
              Clear
            </Button>
          </div>
        </div>

        <DataGrid
          data={visible}
          columns={columns}
          pagination={{ pageSize: 25 }}
          sortable
          filterable={false}
          emptyState={{
            title: 'No staff match the filters',
            description: 'Change the department or search, or add staff to the directory.',
          }}
        />
      </Card>
    </div>
  );
};

const StaffAttendancePage: React.FC = () => <StaffAttendanceContent />;

export default StaffAttendancePage;

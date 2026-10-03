import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { CalendarIcon, UserIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';

type AttendanceStatus = 'Present' | 'Absent' | 'Late';

/** Shape of a row in the manual attendance grid (derived from live students). */
interface ManualAttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  class_id: string;
  class_name: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
}

export const ManualAttendanceContent: React.FC = () => {
  const { students, loading, saveStudentAttendance } = useAppData();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Live student roster rows for the selected day
  const attendanceRows: ManualAttendanceRecord[] = useMemo(() => {
    let rows: ManualAttendanceRecord[] = (students || [])
      .filter(s => !s.deleted_at)
      .map(s => ({
        id: String(s.id),
        student_id: String(s.id),
        student_name: s.display_name || `${s.first_name} ${s.last_name}`.trim(),
        admission_no: s.admission_no,
        class_id: String(s.current_class_stream_id ?? ''),
        class_name: [s.current_class_name, s.current_class_stream_name].filter(Boolean).join(' - ') || '-',
        date: selectedDate,
        status: attendanceData[String(s.id)] || 'Present',
        notes: ''
      }));

    if (selectedClass) {
      rows = rows.filter(r => r.class_id === selectedClass);
    }

    if (searchTerm) {
      rows = rows.filter(r =>
        (r.student_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (r.admission_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return rows;
  }, [students, selectedDate, selectedClass, searchTerm, attendanceData]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const toast = useToast();
  const handleSaveAttendance = async () => {
    if (Object.keys(attendanceData).length === 0) {
      toast.showWarning('Mark at least one student before saving.');
      return;
    }
    setIsSaving(true);
    logger.info('Saving attendance:', attendanceData);
    try {
      const records = Object.entries(attendanceData).map(([studentId, status]) => {
        const row = attendanceRows.find(r => r.student_id === studentId);
        return {
          student_id: studentId,
          period_id: 0, // Manual full-day entry (no timetable period)
          period_name: 'Manual Entry',
          date: selectedDate,
          status,
          reason_for_absence: status === 'Absent' ? 'Marked absent manually' : '',
          student_name: row?.student_name || ''
        };
      });
      await saveStudentAttendance(records);
      toast.showSuccess(`Saved ${records.length} attendance record(s).`);
      setAttendanceData({});
    } catch (err) {
      logger.error('Failed to save attendance:', err);
      toast.showError('Failed to save attendance.');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const styles = {
      'Present': 'bg-green-100 text-green-800',
      'Absent': 'bg-red-100 text-red-800',
      'Late': 'bg-yellow-100 text-yellow-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const columns: DataGridColumn<ManualAttendanceRecord>[] = [
    {
      key: 'student_name',
      header: 'Student Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'admission_no',
      header: 'Admission No',
      sortable: true,
      filterable: true
    },
    {
      key: 'class_name',
      header: 'Class',
      sortable: true,
      filterable: true
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value, record) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusChange(record.student_id, 'Present')}
            className={`px-3 py-1 rounded text-xs font-medium ${attendanceData[record.student_id] === 'Present' || (attendanceData[record.student_id] === undefined && value === 'Present') ? 'bg-green-500 text-white' : 'bg-gray-200 text-surface-foreground'}`}
          >
            Present
          </button>
          <button
            onClick={() => handleStatusChange(record.student_id, 'Absent')}
            className={`px-3 py-1 rounded text-xs font-medium ${attendanceData[record.student_id] === 'Absent' ? 'bg-red-500 text-white' : 'bg-gray-200 text-surface-foreground'}`}
          >
            Absent
          </button>
          <button
            onClick={() => handleStatusChange(record.student_id, 'Late')}
            className={`px-3 py-1 rounded text-xs font-medium ${attendanceData[record.student_id] === 'Late' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-surface-foreground'}`}
          >
            Late
          </button>
        </div>
      )
    },
    {
      key: 'notes',
      header: 'Notes',
      sortable: false,
      render: (value) => value || '-'
    }
  ];

  const uniqueClasses = useMemo(() => {
    const classNames = [...new Set(attendanceRows.map(r => r.class_name))];
    return classNames.filter(name => name !== '-');
  }, [attendanceRows]);

  const totals = useMemo(() => {
    return {
      total: attendanceRows.length,
      present: attendanceRows.filter(r => attendanceData[r.student_id] === 'Present' || (attendanceData[r.student_id] === undefined && r.status === 'Present')).length,
      absent: attendanceRows.filter(r => attendanceData[r.student_id] === 'Absent').length,
      late: attendanceRows.filter(r => attendanceData[r.student_id] === 'Late').length
    };
  }, [attendanceRows, attendanceData]);

  if (loading?.all && attendanceRows.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading attendance data...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            <span>Manual Attendance</span>
          </div>
        }
        extra={
          <Button onClick={() => void handleSaveAttendance()} variant="primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Attendance'}
          </Button>
        }
      >
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-emerald-800">Daily Roll-Call Entry</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Manually record daily attendance for students. Mark students as Present, Absent, or Late
                with optional notes for each attendance record.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Students</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Present</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.present}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <XCircleIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Absent</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {totals.absent}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ClockIcon className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium">Late</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {totals.late}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClass(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Student, admission..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={attendanceRows}
          columns={columns}
        />
      </Card>
    </div>
  );
};

const ManualAttendancePage: React.FC = () => (
  <div className="space-y-6">
    <ManualAttendanceContent />
  </div>
);

export default ManualAttendancePage;

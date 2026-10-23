import React, { useState, useMemo } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useCanonicalLearners } from '../data/useCanonicalLearners';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { DocumentTextIcon, CalendarIcon, UserIcon, ChartBarIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import type { AttendanceReport } from '../data/types';
import type { StudentAttendance } from '@/core/types';
import { AttendanceStatus } from '@/core/types';

export const AttendanceReportsContent: React.FC = () => {

  const { learners: students, isLoading } = useCanonicalLearners();
  const attendanceCollection = useDatabaseCollection<StudentAttendance>('student_attendance');

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Monthly per-student aggregates derived from live attendance records
  const reports: AttendanceReport[] = useMemo(() => {
    const studentById = new Map((students || []).map(s => [String(s.id), s]));
    const monthPrefix = selectedMonth;

    interface Bucket {
      present: number;
      absent: number;
      late: number;
    }
    const buckets = new Map<string, Bucket>();

    attendanceCollection.data.forEach(record => {
      if (!record.date || !record.date.startsWith(monthPrefix)) return;
      if (record.student_id == null) return;

      let bucket = buckets.get(String(record.student_id));
      if (!bucket) {
        bucket = { present: 0, absent: 0, late: 0 };
        buckets.set(String(record.student_id), bucket);
      }
      if (record.status === AttendanceStatus.PRESENT) bucket.present += 1;
      else if (record.status === AttendanceStatus.ABSENT) bucket.absent += 1;
      else if (record.status === AttendanceStatus.LATE) bucket.late += 1;
    });

    const year = parseInt(selectedMonth.slice(0, 4), 10) || new Date().getFullYear();
    const derived: AttendanceReport[] = [];

    buckets.forEach((bucket, studentId) => {
      const student = studentById.get(studentId);
      const classNameParts = [
        student?.current_class_name,
        student?.current_class_stream_name
      ].filter(Boolean);
      const totalDays = bucket.present + bucket.absent + bucket.late;
      derived.push({
        id: `${studentId}-${monthPrefix}`,
        student_id: studentId,
        student_name: student
          ? (student.display_name || `${student.first_name} ${student.last_name}`.trim())
          : (attendanceCollection.data.find(r => String(r.student_id) === studentId)?.student_name ?? 'Unknown'),
        admission_no: student?.admission_no ?? '-',
        class_id: String(student?.current_class_stream_id ?? ''),
        class_name: classNameParts.length > 0 ? classNameParts.join(' - ') : '-',
        month: monthPrefix,
        year,
        total_days: totalDays,
        present_days: bucket.present,
        absent_days: bucket.absent,
        late_days: bucket.late,
        percentage: totalDays > 0 ? Math.round((bucket.present / totalDays) * 1000) / 10 : 0
      });
    });

    let filtered = derived;

    if (selectedClass) {
      filtered = filtered.filter(r => r.class_name === selectedClass);
    }

    if (searchTerm) {
      filtered = filtered.filter(r =>
        (r.student_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (r.admission_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [attendanceCollection.data, students, selectedMonth, selectedClass, searchTerm]);

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const columns: DataGridColumn<AttendanceReport>[] = [
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
      key: 'month',
      header: 'Month',
      sortable: true,
      render: (value) => {
        const date = new Date(value + '-01');
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
    },
    {
      key: 'total_days',
      header: 'Total Days',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'present_days',
      header: 'Present',
      sortable: true,
      render: (value) => <span className="text-green-600 font-semibold">{value}</span>
    },
    {
      key: 'absent_days',
      header: 'Absent',
      sortable: true,
      render: (value) => <span className="text-red-600 font-semibold">{value}</span>
    },
    {
      key: 'late_days',
      header: 'Late',
      sortable: true,
      render: (value) => <span className="text-yellow-600 font-semibold">{value}</span>
    },
    {
      key: 'percentage',
      header: 'Attendance %',
      sortable: true,
      render: (value) => (
        <span className={`font-semibold ${getPercentageColor(value)}`}>
          {value.toFixed(1)}%
        </span>
      )
    }
  ];

  const uniqueClasses = useMemo(() => {
    const classNames = [...new Set(reports.map(r => r.class_name))];
    return classNames.filter(name => name !== '-');
  }, [reports]);

  const totals = useMemo(() => {
    return {
      total_students: reports.length,
      avg_percentage: reports.length > 0 ? reports.reduce((sum, r) => sum + r.percentage, 0) / reports.length : 0,
      total_present: reports.reduce((sum, r) => sum + r.present_days, 0),
      total_absent: reports.reduce((sum, r) => sum + r.absent_days, 0)
    };
  }, [reports]);

  if (isLoading && attendanceCollection.loading && reports.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading attendance reports...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6 text-violet-600" />
            <span>Attendance Reports</span>
          </div>
        }
        info="View comprehensive attendance reports including monthly summaries, class-wise attendance, and individual student attendance records with detailed statistics."
      >
        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Students</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">
              {totals.total_students}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ChartBarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Avg Attendance</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.avg_percentage.toFixed(1)}%
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CalendarIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Total Present</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.total_present}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CalendarIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Total Absent</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {totals.total_absent}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedMonth(e.target.value)}
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
          data={reports}
          columns={columns}
        />
      </Card>
    </div>
  );
};

const AttendanceReportsPage: React.FC = () => (
  <div className="space-y-3">
    <AttendanceReportsContent />
  </div>
);

const AttendanceReportsPageWithRepository = withCanonicalRepository(AttendanceReportsPage);
export default AttendanceReportsPageWithRepository;

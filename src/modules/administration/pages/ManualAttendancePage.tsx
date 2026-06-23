import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { CalendarIcon, UserIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type AttendanceStatus = 'Present' | 'Absent' | 'Late';

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
  const { t } = useTranslation('administration');
  const { students, classes, loading } = useAppData();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});

  // Mock data for manual attendance (in production, this would come from useAppData)
  const mockAttendance: ManualAttendanceRecord[] = useMemo(() => {
    const records: ManualAttendanceRecord[] = [
      {
        id: 'ma-1',
        student_id: '1',
        student_name: 'John Doe',
        admission_no: 'ADM-001',
        class_id: '1',
        class_name: 'Grade 10 - A',
        date: selectedDate,
        status: 'Present',
        notes: ''
      },
      {
        id: 'ma-2',
        student_id: '2',
        student_name: 'Jane Smith',
        admission_no: 'ADM-002',
        class_id: '1',
        class_name: 'Grade 10 - A',
        date: selectedDate,
        status: 'Present',
        notes: ''
      },
      {
        id: 'ma-3',
        student_id: '3',
        student_name: 'Michael Johnson',
        admission_no: 'ADM-003',
        class_id: '2',
        class_name: 'Grade 10 - B',
        date: selectedDate,
        status: 'Absent',
        notes: 'Sick leave'
      },
      {
        id: 'ma-4',
        student_id: '4',
        student_name: 'Emily Davis',
        admission_no: 'ADM-004',
        class_id: '2',
        class_name: 'Grade 10 - B',
        date: selectedDate,
        status: 'Late',
        notes: 'Traffic delay'
      },
      {
        id: 'ma-5',
        student_id: '5',
        student_name: 'Robert Wilson',
        admission_no: 'ADM-005',
        class_id: '3',
        class_name: 'Grade 11 - A',
        date: selectedDate,
        status: 'Present',
        notes: ''
      }
    ];

    let filtered = records;

    if (selectedClass) {
      filtered = filtered.filter(r => r.class_id === selectedClass);
    }

    if (searchTerm) {
      filtered = filtered.filter(r => 
        (r.student_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (r.admission_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [selectedDate, selectedClass, searchTerm]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = () => {
    console.log('Saving attendance:', attendanceData);
    // In production, this would save the attendance data
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
            className={`px-3 py-1 rounded text-xs font-medium ${attendanceData[record.student_id] === 'Present' || (attendanceData[record.student_id] === undefined && value === 'Present') ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Present
          </button>
          <button
            onClick={() => handleStatusChange(record.student_id, 'Absent')}
            className={`px-3 py-1 rounded text-xs font-medium ${attendanceData[record.student_id] === 'Absent' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Absent
          </button>
          <button
            onClick={() => handleStatusChange(record.student_id, 'Late')}
            className={`px-3 py-1 rounded text-xs font-medium ${attendanceData[record.student_id] === 'Late' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'}`}
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
    const classIds = [...new Set(mockAttendance.map(r => r.class_id))];
    return classIds.map(id => mockAttendance.find(r => r.class_id === id)?.class_name || id);
  }, [mockAttendance]);

  const totals = useMemo(() => {
    return {
      total: mockAttendance.length,
      present: mockAttendance.filter(r => attendanceData[r.student_id] === 'Present' || (attendanceData[r.student_id] === undefined && r.status === 'Present')).length,
      absent: mockAttendance.filter(r => attendanceData[r.student_id] === 'Absent').length,
      late: mockAttendance.filter(r => attendanceData[r.student_id] === 'Late').length
    };
  }, [mockAttendance, attendanceData]);

  if (loading?.all && mockAttendance.length === 0) {
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
          <Button onClick={handleSaveAttendance} variant="primary">
            Save Attendance
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
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Students</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Present</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.present}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <XCircleIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Absent</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {totals.absent}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClass(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Student, admission..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockAttendance}
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

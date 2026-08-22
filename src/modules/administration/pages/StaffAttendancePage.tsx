import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { CalendarIcon, UserIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { StaffAttendanceRecord, StaffAttendanceStatus } from '../data/types';

import { logger } from '@/utils/logging';

const StaffAttendancePage: React.FC = () => {
  const { t } = useTranslation('administration');
  const { staffAttendanceRecords, staff, loading } = useAppData();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, StaffAttendanceStatus>>({});

  const mockAttendance: StaffAttendanceRecord[] = useMemo(() => {
    let filtered = (staffAttendanceRecords || []).map((r: StaffAttendanceRecord) => ({ ...r, date: selectedDate }));

    if (selectedDepartment) {
      filtered = filtered.filter(r => r.department === selectedDepartment);
    }

    if (searchTerm) {
      filtered = filtered.filter(r =>
        (r.staff_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (r.employee_id?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [selectedDate, selectedDepartment, searchTerm]);

  const handleStatusChange = (staffId: string, status: StaffAttendanceStatus) => {
    setAttendanceData(prev => ({ ...prev, [staffId]: status }));
  };

  const handleSaveAttendance = () => {
    logger.info('Saving staff attendance:', attendanceData);
  };

  const getStatusBadge = (status: StaffAttendanceStatus) => {
    const styles = {
      'Present': 'bg-green-100 text-green-800',
      'Absent': 'bg-red-100 text-red-800',
      'Late': 'bg-yellow-100 text-yellow-800',
      'On Leave': 'bg-blue-100 text-blue-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const columns: DataGridColumn<StaffAttendanceRecord>[] = [
    {
      key: 'staff_name',
      header: 'Staff Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'employee_id',
      header: 'Employee ID',
      sortable: true,
      filterable: true
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      filterable: true
    },
    {
      key: 'designation',
      header: 'Designation',
      sortable: true,
      filterable: true
    },
    {
      key: 'check_in_time',
      header: 'Check In',
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'check_out_time',
      header: 'Check Out',
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value, record) => (
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => handleStatusChange(record.staff_id, 'Present')}
            className={`px-2 py-1 rounded text-xs font-medium ${attendanceData[record.staff_id] === 'Present' || (attendanceData[record.staff_id] === undefined && value === 'Present') ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Present
          </button>
          <button
            onClick={() => handleStatusChange(record.staff_id, 'Absent')}
            className={`px-2 py-1 rounded text-xs font-medium ${attendanceData[record.staff_id] === 'Absent' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Absent
          </button>
          <button
            onClick={() => handleStatusChange(record.staff_id, 'Late')}
            className={`px-2 py-1 rounded text-xs font-medium ${attendanceData[record.staff_id] === 'Late' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Late
          </button>
          <button
            onClick={() => handleStatusChange(record.staff_id, 'On Leave')}
            className={`px-2 py-1 rounded text-xs font-medium ${attendanceData[record.staff_id] === 'On Leave' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Leave
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

  const uniqueDepartments = useMemo(() => {
    const depts = [...new Set(mockAttendance.map(r => r.department))];
    return depts;
  }, [mockAttendance]);

  const totals = useMemo(() => {
    return {
      total: mockAttendance.length,
      present: mockAttendance.filter(r => attendanceData[r.staff_id] === 'Present' || (attendanceData[r.staff_id] === undefined && r.status === 'Present')).length,
      absent: mockAttendance.filter(r => attendanceData[r.staff_id] === 'Absent').length,
      late: mockAttendance.filter(r => attendanceData[r.staff_id] === 'Late').length,
      onLeave: mockAttendance.filter(r => attendanceData[r.staff_id] === 'On Leave' || (attendanceData[r.staff_id] === undefined && r.status === 'On Leave')).length
    };
  }, [mockAttendance, attendanceData]);

  if (loading?.all && mockAttendance.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading staff attendance data...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Staff Attendance</h1>
        <Button onClick={handleSaveAttendance} variant="primary">
          Save Attendance
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-indigo-800">Daily Staff Attendance Tracking</h3>
              <p className="text-sm text-indigo-700 mt-1">
                Record daily staff attendance with check-in/check-out times. Mark staff as Present, Absent, Late, or On Leave with optional notes.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Staff</span>
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
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">On Leave</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {totals.onLeave}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Staff, employee ID..."
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

export default StaffAttendancePage;

export const StaffAttendanceContent = StaffAttendancePage;


import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { ClockIcon, UserIcon, CheckCircleIcon, XCircleIcon, PlayIcon, StopIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { initialMockSessionAttendance } from '../data/mockData';
import type { SessionAttendance, DynamicAttendanceStatus } from '../data/types';

export const DynamicAttendanceContent: React.FC = () => {
  const { t } = useTranslation('administration');
  const { students, classes, loading } = useAppData();

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);

  // Use centralized mock data (in production, this would come from useAppData)
  const mockAttendance: SessionAttendance[] = useMemo(() => {
    let filtered = initialMockSessionAttendance;

    if (selectedSession) {
      filtered = filtered.filter(r => r.session_id === selectedSession);
    }

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
  }, [selectedSession, selectedClass, searchTerm]);

  const handleStartSession = () => {
    setIsSessionActive(true);
    setSessionStartTime(new Date().toISOString());
    console.log('Starting session...');
  };

  const handleStopSession = () => {
    setIsSessionActive(false);
    setSessionStartTime(null);
    console.log('Stopping session...');
  };

  const handleCheckIn = (record: SessionAttendance) => {
    console.log('Check in student:', record.student_id);
    // In production, this would record the check-in time
  };

  const handleCheckOut = (record: SessionAttendance) => {
    console.log('Check out student:', record.student_id);
    // In production, this would record the check-out time
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

  const columns: DataGridColumn<SessionAttendance>[] = [
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
      key: 'session_name',
      header: 'Session',
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
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_, record) => (
        <div className="flex gap-2">
          {!record.check_in_time && (
            <Button size="sm" variant="secondary" onClick={() => handleCheckIn(record)}>
              Check In
            </Button>
          )}
          {record.check_in_time && !record.check_out_time && (
            <Button size="sm" variant="secondary" onClick={() => handleCheckOut(record)}>
              Check Out
            </Button>
          )}
        </div>
      )
    }
  ];

  const uniqueSessions = useMemo(() => {
    const sessionIds = [...new Set(mockAttendance.map(r => r.session_id))];
    return sessionIds.map(id => mockAttendance.find(r => r.session_id === id)?.session_name || id);
  }, [mockAttendance]);

  const uniqueClasses = useMemo(() => {
    const classIds = [...new Set(mockAttendance.map(r => r.class_id))];
    return classIds.map(id => mockAttendance.find(r => r.class_id === id)?.class_name || id);
  }, [mockAttendance]);

  const totals = useMemo(() => {
    return {
      total: mockAttendance.length,
      present: mockAttendance.filter(r => r.status === 'Present').length,
      absent: mockAttendance.filter(r => r.status === 'Absent').length,
      late: mockAttendance.filter(r => r.status === 'Late').length
    };
  }, [mockAttendance]);

  if (loading?.all && mockAttendance.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading session attendance...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <ClockIcon className="w-6 h-6 text-rose-600" />
            <span>Dynamic Attendance</span>
          </div>
        }
        extra={
          <div className="flex gap-2">
            {!isSessionActive ? (
              <Button onClick={handleStartSession} variant="primary">
                <PlayIcon className="w-4 h-4 mr-2" />
                Start Session
              </Button>
            ) : (
              <Button onClick={handleStopSession} variant="secondary">
                <StopIcon className="w-4 h-4 mr-2" />
                Stop Session
              </Button>
            )}
          </div>
        }
      >
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ClockIcon className="w-5 h-5 text-rose-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-rose-800">Real-Time Session Tracking</h3>
              <p className="text-sm text-rose-700 mt-1">
                Track attendance in real-time with session-based check-in/check-out functionality. 
                Start a session to enable live attendance tracking for students.
              </p>
              {isSessionActive && sessionStartTime && (
                <p className="text-sm text-rose-600 mt-2 font-semibold">
                  Session active since: {new Date(sessionStartTime).toLocaleTimeString()}
                </p>
              )}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
            <select
              value={selectedSession}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSession(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Sessions</option>
              {uniqueSessions.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
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

const DynamicAttendancePage: React.FC = () => (
  <div className="space-y-6">
    <DynamicAttendanceContent />
  </div>
);

export default DynamicAttendancePage;

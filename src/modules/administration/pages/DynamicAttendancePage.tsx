import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { ClockIcon, UserIcon, CheckCircleIcon, XCircleIcon, PlayIcon, StopIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import type { SessionAttendance, DynamicAttendanceStatus } from '../data/types';
import { logger } from '@/utils/logging';

export const DynamicAttendanceContent: React.FC = () => {
  const sessionAttendanceCollection = useDatabaseCollection<SessionAttendance>('session_attendance');

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);

  // Live session attendance records from the database
  const attendanceRecords: SessionAttendance[] = useMemo(() => {
    let filtered = sessionAttendanceCollection.data;

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
  }, [sessionAttendanceCollection.data, selectedSession, selectedClass, searchTerm]);

  const handleStartSession = () => {
    setIsSessionActive(true);
    setSessionStartTime(new Date().toISOString());
    logger.info('Starting session...');
  };

  const handleStopSession = () => {
    setIsSessionActive(false);
    setSessionStartTime(null);
    logger.info('Stopping session...');
  };

  const currentTime = () => new Date().toTimeString().slice(0, 5);

  const handleCheckIn = (record: SessionAttendance) => {
    logger.info('Check in student:', record.student_id);
    void sessionAttendanceCollection.update(record.id, {
      check_in_time: currentTime(),
      status: 'Present'
    }).catch((err: unknown) => logger.error('Failed to check in student:', err));
  };

  const handleCheckOut = (record: SessionAttendance) => {
    logger.info('Check out student:', record.student_id);
    void sessionAttendanceCollection.update(record.id, {
      check_out_time: currentTime()
    }).catch((err: unknown) => logger.error('Failed to check out student:', err));
  };

  const getStatusBadge = (status: DynamicAttendanceStatus) => {
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
    const sessionIds = [...new Set(attendanceRecords.map(r => r.session_id))];
    return sessionIds.map(id => attendanceRecords.find(r => r.session_id === id)?.session_name || id);
  }, [attendanceRecords]);

  const uniqueClasses = useMemo(() => {
    const classIds = [...new Set(attendanceRecords.map(r => r.class_id))];
    return classIds.map(id => attendanceRecords.find(r => r.class_id === id)?.class_name || id);
  }, [attendanceRecords]);

  const totals = useMemo(() => {
    return {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(r => r.status === 'Present').length,
      absent: attendanceRecords.filter(r => r.status === 'Absent').length,
      late: attendanceRecords.filter(r => r.status === 'Late').length
    };
  }, [attendanceRecords]);

  if (sessionAttendanceCollection.loading && attendanceRecords.length === 0) {
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
            <label className="block text-sm font-medium text-surface-foreground mb-1">Session</label>
            <select
              value={selectedSession}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSession(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            >
              <option value="">All Sessions</option>
              {uniqueSessions.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
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
          data={attendanceRecords}
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

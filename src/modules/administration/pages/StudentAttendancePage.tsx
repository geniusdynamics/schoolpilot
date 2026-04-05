import React, { useState, useEffect, useMemo } from 'react';
import { Student, ClassStream, TimetablePeriodDef } from '@/types';
import { AdminStudentAttendanceType as StudentAttendance, AttendanceStatus } from '@/modules/administration/data/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { CalendarDaysIcon, CheckCircleIcon, XCircleIcon, ClockIcon, MinusCircleIcon } from '@/components/ui/icons';
import { useStudentAttendanceData } from '@/modules/administration/data/useStudentAttendanceData';
import { useAppData } from '@/hooks/useAppData'; // For other data sources
import Spinner from '@/components/ui/Spinner';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { useTranslation } from 'react-i18next';

interface AttendanceData {
  [studentId: string]: AttendanceStatus;
}

const StudentAttendancePage: React.FC = () => {
  const { t } = useTranslation();
  const { studentAttendance, addStudentAttendance } = useStudentAttendanceData();
  const {
    students = [],
    classStreams = [],
    timetablePeriodDefs = [], // This is the raw list of all period definitions
  } = useAppData(); // For other data sources

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClassStreamId, setSelectedClassStreamId] = useState<number | undefined>(undefined);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | undefined>(undefined);
  
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
  const [pageLoading, setPageLoading] = useState(false); // For fetching students/attendance
  const [saving, setSaving] = useState(false);

  const availablePeriods = useMemo(() => timetablePeriodDefs || [], [timetablePeriodDefs]);

  const studentsInSelectedStream = useMemo(() => {
    if (!selectedClassStreamId) return [];
    return students.filter(s => s.current_class_stream_id === selectedClassStreamId);
  }, [students, selectedClassStreamId]);

  // Helper function to filter attendance records
  const getStudentAttendanceByFilters = (date: string, classStreamId: number, periodId: number) => {
    return studentAttendance.filter(record =>
      record.date === date &&
      record.period_id === periodId &&
      studentsInSelectedStream.some(student => student.id === record.student_id)
    );
  };

  useEffect(() => {
    if (selectedDate && selectedClassStreamId && selectedPeriodId) {
      setPageLoading(true);
      // Get existing attendance records
      const existingRecords = getStudentAttendanceByFilters(selectedDate, selectedClassStreamId, selectedPeriodId);
      const newAttendanceData: AttendanceData = {};
      studentsInSelectedStream.forEach(student => {
        const record = existingRecords.find((ar: StudentAttendance) => ar.student_id === student.id);
        newAttendanceData[student.id] = record ? record.status : AttendanceStatus.PRESENT; // Default to present
      });
      setAttendanceData(newAttendanceData);
      setPageLoading(false);
    } else {
      setAttendanceData({}); // Clear data if filters are not set
    }
  }, [selectedDate, selectedClassStreamId, selectedPeriodId, studentsInSelectedStream, studentAttendance]);


  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedDate || !selectedClassStreamId || !selectedPeriodId || studentsInSelectedStream.length === 0) {
      alert(t('validation.pleaseSelectDateClassStreamPeriodAndEnsureStudentsAreLoaded'));
      return;
    }
    setSaving(true);
    
    // Save each attendance record
    studentsInSelectedStream.forEach(student => {
      const attendanceRecord: Omit<StudentAttendance, 'id'> = {
        student_id: student.id,
        date: selectedDate,
        period_id: selectedPeriodId!,
        status: attendanceData[student.id] || AttendanceStatus.PRESENT,
        student_name: `${student.first_name} ${student.last_name}`,
        period_name: availablePeriods.find(p => p.id === selectedPeriodId)?.period_name,
      };
      addStudentAttendance(attendanceRecord);
    });
    
    setSaving(false);
    alert(t('messages.attendanceSavedSuccessfully'));
  };
  
  const attendanceColumns: DataGridColumn<Student>[] = [
    { 
      key: 'admission_no',
      header: 'Adm No.', 
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, item) => item.admission_no
    },
    { 
      key: 'student_name',
      header: 'Student Name', 
      sortable: true,
      filterable: true,
      width: 200,
      render: (value, item) => `${item.first_name} ${item.last_name}`
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      filterable: false,
      width: 400,
      render: (value, student) => (
        <div className="flex space-x-2 items-center">
          {Object.values(AttendanceStatus).map(status => (
            <label key={status} className="flex items-center space-x-1 cursor-pointer text-sm">
              <input
                type="radio"
                name={`attendance-${student.id}`}
                value={status}
                checked={attendanceData[student.id] === status}
                onChange={() => handleStatusChange(student.id, status)}
                className="form-radio h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
              />
              <span>{status}</span>
            </label>
          ))}
        </div>
      ),
    },
  ];


  return (
    <div className="space-y-6">
      <Card title="Student Attendance" icon={<CalendarDaysIcon className="w-6 h-6 text-orange-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-gray-50">
          <Input
            label="Attendance Date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <Select
            label="Class Stream"
            value={selectedClassStreamId || ''}
            onChange={(e) => setSelectedClassStreamId(e.target.value ? parseInt(e.target.value) : undefined)}
          >
            <option value="">Select Class Stream</option>
            {classStreams.map(cs => (
              <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.name}</option>
            ))}
          </Select>
          <Select
            label="Lesson Period"
            value={selectedPeriodId || ''}
            onChange={(e) => setSelectedPeriodId(e.target.value ? parseInt(e.target.value) : undefined)}
          >
            <option value="">Select Period</option>
            {availablePeriods.map(tp => (
              <option key={tp.id} value={tp.id}>{tp.period_name} ({tp.start_time} - {tp.end_time})</option>
            ))}
          </Select>
        </div>

        {pageLoading ? (
          <div className="flex justify-center items-center py-10">
            <Spinner /> <span className="ml-2">Loading students & attendance...</span>
          </div>
        ) : selectedDate && selectedClassStreamId && selectedPeriodId ? (
          studentsInSelectedStream.length > 0 ? (
            <>
              <DataGrid 
                columns={attendanceColumns} 
                data={studentsInSelectedStream}
                sortable
                filterable
                emptyState={
                  <div className="text-center py-12">
                    <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                    <p className="mt-1 text-sm text-gray-500">No students are enrolled in the selected class stream.</p>
                  </div>
                }
              />
              <div className="mt-6 text-right">
                <Button onClick={handleSaveAttendance} disabled={saving} leftIcon={saving ? <Spinner size="sm"/> : undefined}>
                  {saving ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-4">No students found for the selected class stream, or selection criteria not fully met.</p>
          )
        ) : (
          <p className="text-center text-gray-500 py-4">Please select date, class stream, and lesson period to mark attendance.</p>
        )}
      </Card>
    </div>
  );
};

export default StudentAttendancePage;

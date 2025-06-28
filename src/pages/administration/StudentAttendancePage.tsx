
import React, { useState, useEffect, useMemo } from 'react';
import { Student, ClassStream, TimetablePeriodDef, StudentAttendance, AttendanceStatus } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { CalendarDaysIcon, CheckCircleIcon, XCircleIcon, ClockIcon, MinusCircleIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';
import Table from '../../components/ui/Table';

interface AttendanceData {
  [studentId: string]: AttendanceStatus;
}

const StudentAttendancePage: React.FC = () => {
  const {
    students,
    classStreams,
    timetablePeriodDefs, // This is the raw list of all period definitions
    studentAttendance, // This is the raw list of all attendance records
    loading,
    getTimetablePeriodDefs,
    getStudentAttendanceByFilters,
    saveStudentAttendance,
  } = useAppData(); // Updated

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClassStreamId, setSelectedClassStreamId] = useState<number | undefined>(undefined);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | undefined>(undefined);
  
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
  const [pageLoading, setPageLoading] = useState(false); // For fetching students/attendance
  const [saving, setSaving] = useState(false);

  const availablePeriods = useMemo(() => getTimetablePeriodDefs(), [getTimetablePeriodDefs]);

  const studentsInSelectedStream = useMemo(() => {
    if (!selectedClassStreamId) return [];
    return students.filter(s => s.current_class_stream_id === selectedClassStreamId);
  }, [students, selectedClassStreamId]);

  useEffect(() => {
    if (selectedDate && selectedClassStreamId && selectedPeriodId) {
      setPageLoading(true);
      // Simulate fetching existing attendance
      const existingRecords = getStudentAttendanceByFilters(selectedDate, selectedClassStreamId, selectedPeriodId);
      const newAttendanceData: AttendanceData = {};
      studentsInSelectedStream.forEach(student => {
        const record = existingRecords.find(ar => ar.student_id === student.id);
        newAttendanceData[student.id] = record ? record.status : AttendanceStatus.PRESENT; // Default to present
      });
      setAttendanceData(newAttendanceData);
      setPageLoading(false);
    } else {
      setAttendanceData({}); // Clear data if filters are not set
    }
  }, [selectedDate, selectedClassStreamId, selectedPeriodId, studentsInSelectedStream, getStudentAttendanceByFilters]);


  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedDate || !selectedClassStreamId || !selectedPeriodId || studentsInSelectedStream.length === 0) {
      alert("Please select date, class stream, period, and ensure students are loaded.");
      return;
    }
    setSaving(true);
    const recordsToSave: Array<Omit<StudentAttendance, 'id' | 'created_at'>> = studentsInSelectedStream.map(student => ({
      student_id: student.id,
      date: selectedDate,
      period_id: selectedPeriodId!,
      status: attendanceData[student.id] || AttendanceStatus.PRESENT, // Default if somehow missing
    }));
    
    await saveStudentAttendance(recordsToSave);
    setSaving(false);
    alert("Attendance saved successfully!");
    // Optionally refetch or update local state if saveStudentAttendance doesn't do it
  };
  
  const attendanceColumns = [
    { header: 'Adm No.', accessor: 'admission_no' as keyof Student },
    { header: 'Student Name', accessor: ((item: Student) => `${item.first_name} ${item.last_name}`) },
    {
      header: 'Status',
      accessor: 'id' as keyof Student,
      render: (student: Student) => (
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


  if (loading.students || loading.classStreams || loading.timetablePeriodDefs) {
      return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

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
              <Table columns={attendanceColumns} data={studentsInSelectedStream} />
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

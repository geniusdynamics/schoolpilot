// ABOUTME: Displays the exam scheduling calendar with daily filtering and conflict visibility.
// ABOUTME: Provides a scheduling modal that captures class stream, room, and invigilator selections.

import React, { useState } from 'react';
import { useAppData } from '@/hooks/useAppData';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import type { ExamSchedule } from '@/core/types';
import { PlusIcon, UserIcon, BuildingOffice2Icon } from '@/components/ui/icons';

const SchedulingCalendar: React.FC = () => {
  const {
    examSessions = [],
    classStreams = [],
    timetablePeriodDefs = [],
    staff = [],
  } = useAppData();

  // Exam schedules are managed locally; the global data context does not yet
  // expose an exam-schedule collection or CRUD operations.
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedClassStream, setSelectedClassStream] = useState<number | null>(null);
  const [selectedExamSession, setSelectedExamSession] = useState<string>('');
  const [scheduledClassStream, setScheduledClassStream] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedInvigilator, setSelectedInvigilator] = useState<string>('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const availableRooms = ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Lab 1', 'Lab 2'];

  const getPeriodTime = (periodId: number): string => {
    const period = (timetablePeriodDefs || []).find(p => p.id === periodId);
    return period ? `${period.start_time} - ${period.end_time}` : 'Unknown';
  };

  const getClassStreamName = (classStreamId: number): string => {
    const classStream = classStreams.find(cs => cs.id === classStreamId);
    return classStream ? `${classStream.class_name ?? ''} ${classStream.name}` : 'Unknown';
  };

  const getExamSessionName = (examSessionId: string): string => {
    const session = examSessions.find(es => es.id === examSessionId);
    return session ? session.name : 'Unknown';
  };

  const dailySchedule = examSchedules.filter(schedule =>
    schedule.date === selectedDate &&
    (selectedClassStream === null || schedule.class_stream_id === selectedClassStream)
  );

  const conflicts = checkConflicts(dailySchedule);

  function checkConflicts(schedules: ExamSchedule[]): string[] {
    const conflicts: string[] = [];
    const roomBookings: { [key: string]: string[] } = {};
    const invigilatorBookings: { [key: string]: string[] } = {};

    schedules.forEach(schedule => {
      const roomKey = `${schedule.room}-${schedule.date}-${schedule.period_id}`;
      const invigilatorKey = `${schedule.invigilator}-${schedule.date}-${schedule.period_id}`;

      if (roomBookings[roomKey]) {
        conflicts.push(`Room ${schedule.room} is double-booked for period ${getPeriodTime(schedule.period_id)}`);
      }
      roomBookings[roomKey] = [...(roomBookings[roomKey] || []), schedule.id];

      if (invigilatorBookings[invigilatorKey]) {
        conflicts.push(`Invigilator ${schedule.invigilator} is double-booked for period ${getPeriodTime(schedule.period_id)}`);
      }
      invigilatorBookings[invigilatorKey] = [...(invigilatorBookings[invigilatorKey] || []), schedule.id];
    });

    return conflicts;
  }

  const openScheduleModal = () => {
    setSelectedExamSession('');
    setScheduledClassStream(selectedClassStream);
    setSelectedRoom('');
    setSelectedInvigilator('');
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setSelectedExamSession('');
    setScheduledClassStream(null);
    setSelectedRoom('');
    setSelectedInvigilator('');
  };

  const handleScheduleExam = (scheduleData: Partial<ExamSchedule>) => {
    const newSchedule: ExamSchedule = {
      id: `schedule_${Date.now()}`,
      exam_session_id: scheduleData.exam_session_id || '',
      class_stream_id: scheduleData.class_stream_id || 0,
      period_id: scheduleData.period_id || 0,
      room: scheduleData.room || '',
      invigilator: scheduleData.invigilator || '',
      date: scheduleData.date || selectedDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setExamSchedules(prev => [...prev, newSchedule]);
    closeScheduleModal();
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Exam Scheduling Calendar</h2>
          <Button onClick={openScheduleModal}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Schedule New Exam
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters */}
          <div className="lg:col-span-1">
            <Card variant="outlined" className="p-4">
              <h3 className="font-semibold mb-4">Filters</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Class Stream</label>
                  <Select
                    value={selectedClassStream?.toString() || ''}
                    onValueChange={(value) =>
                      setSelectedClassStream(
                        typeof value === 'string' && value ? parseInt(value, 10) : null
                      )
                    }
                    options={[
                      { value: '', label: 'All Classes' },
                      ...classStreams.map(cs => ({ value: cs.id.toString(), label: `${cs.class_name ?? ''} ${cs.name}` }))
                    ]}
                  />
                </div>
              </div>
            </Card>

            {/* Conflicts */}
            {conflicts.length > 0 && (
              <Card variant="outlined" className="p-4 mt-4">
                <h3 className="font-semibold mb-2 text-red-600">Conflicts</h3>
                <ul className="text-sm space-y-1">
                  {conflicts.map((conflict, index) => (
                    <li key={index} className="text-red-600">â€¢ {conflict}</li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Calendar View */}
          <div className="lg:col-span-3">
            <Card variant="outlined" className="p-4">
              <h3 className="font-semibold mb-4">
                Schedule for {new Date(selectedDate).toLocaleDateString()}
              </h3>

              <div className="space-y-4">
                {(timetablePeriodDefs || []).map(period => {
                  const periodSchedule = dailySchedule.filter(s => s.period_id === period.id);
                  
                  return (
                    <div key={period.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{period.period_name}</h4>
                        <span className="text-sm text-gray-600">
                          {period.start_time} - {period.end_time}
                        </span>
                      </div>

                      {periodSchedule.length === 0 ? (
                        <p className="text-gray-500 text-sm">No exams scheduled</p>
                      ) : (
                        <div className="space-y-2">
                          {periodSchedule.map(schedule => (
                            <div key={schedule.id} className="bg-gray-50 p-3 rounded">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">
                                    {getExamSessionName(schedule.exam_session_id ?? '')}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {getClassStreamName(schedule.class_stream_id)}
                                  </p>
                                </div>
                                <div className="text-right text-sm">
                                  <p className="flex items-center">
                                    <BuildingOffice2Icon className="w-4 h-4 mr-1" />
                                    {schedule.room}
                                  </p>
                                  <p className="flex items-center">
                                    <UserIcon className="w-4 h-4 mr-1" />
                                    {schedule.invigilator}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </Card>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Schedule Exam</h3>
            
            <div className="space-y-4">
              <Select
                label="Exam Session"
                value={selectedExamSession}
                onValueChange={(value) => setSelectedExamSession(typeof value === 'string' ? value : '')}
                options={examSessions.map(es => ({ value: String(es.id), label: es.name }))}
              />
              
              <Select
                label="Class Stream"
                value={scheduledClassStream?.toString() || ''}
                onValueChange={(value) =>
                  setScheduledClassStream(
                    typeof value === 'string' && value ? parseInt(value, 10) : null
                  )
                }
                options={classStreams.map(cs => ({ value: cs.id.toString(), label: `${cs.class_name ?? ''} ${cs.name}` }))}
              />

              <Select
                label="Room"
                value={selectedRoom}
                onValueChange={(value) => setSelectedRoom(typeof value === 'string' ? value : '')}
                options={availableRooms.map(room => ({ value: room, label: room }))}
              />

              <Select
                label="Invigilator"
                value={selectedInvigilator}
                onValueChange={(value) => setSelectedInvigilator(typeof value === 'string' ? value : '')}
                options={staff.map(member => ({
                  value: [member.first_name, member.last_name].filter(Boolean).join(' ') || member.staff_no || '',
                  label: [member.first_name, member.last_name].filter(Boolean).join(' ') || member.staff_no || '—',
                }))}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={closeScheduleModal}
                >
                  Cancel
                </Button>
                <Button
                  disabled={
                    !selectedExamSession ||
                    !scheduledClassStream ||
                    !selectedRoom ||
                    !selectedInvigilator
                  }
                  onClick={() => handleScheduleExam({
                    exam_session_id: selectedExamSession,
                    class_stream_id: scheduledClassStream || 0,
                    room: selectedRoom,
                    invigilator: selectedInvigilator,
                    date: selectedDate
                  })}
                >
                  Schedule
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SchedulingCalendar;

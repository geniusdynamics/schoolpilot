import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/forms/FormField';
import Select, { SelectOption } from '@/components/ui/Select';

interface ExamSchedule {
  id: string;
  examId: string;
  examName: string;
  date: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  invigilator: string;
  classStream: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface SchedulingCalendarProps {
  schedules: ExamSchedule[];
  onSelectSchedule: (schedule: ExamSchedule) => void;
  onAddSchedule: (schedule: Partial<ExamSchedule>) => void;
  onDeleteSchedule: (id: string) => void;
  loading?: boolean;
}

export const SchedulingCalendar: React.FC<SchedulingCalendarProps> = ({
  schedules,
  onSelectSchedule,
  onAddSchedule,
  onDeleteSchedule,
  loading = false,
}) => {
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSelectSchedule = (schedule: ExamSchedule) => {
    setSelectedSchedule(schedule);
    onSelectSchedule(schedule);
  };

  const handleAddSchedule = (schedule: Partial<ExamSchedule>) => {
    onAddSchedule(schedule);
    setShowAddForm(false);
  };

  const handleDeleteSchedule = (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      onDeleteSchedule(id);
    }
  };

  const statusOptions: SelectOption[] = [
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Exam Scheduling Calendar</h2>
          <p className="text-sm text-gray-500 mt-1">Manage exam schedules</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowAddForm(true)}
          disabled={loading}
        >
          Add Schedule
        </Button>
      </div>

      {showAddForm && (
        <Card title="Add New Schedule">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Exam Name"
              type="text"
              placeholder="Enter exam name"
            />
            <FormField
              label="Date"
              type="date"
            />
            <FormField
              label="Start Time"
              type="time"
            />
            <FormField
              label="End Time"
              type="time"
            />
            <FormField
              label="Room Number"
              type="text"
              placeholder="Enter room number"
            />
            <FormField
              label="Invigilator"
              type="text"
              placeholder="Enter invigilator name"
            />
            <FormField
              label="Class Stream"
              type="text"
              placeholder="Enter class stream"
            />
            <FormField
              label="Status"
              type="select"
              options={statusOptions}
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setShowAddForm(false)}>
              Add Schedule
            </Button>
          </div>
        </Card>
      )}

      <Card title="Schedules">
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => handleSelectSchedule(schedule)}
            >
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{schedule.examName}</h3>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                  <span>{formatDate(schedule.date)}</span>
                  <span>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                  <span>{schedule.roomNumber}</span>
                  <span>{schedule.invigilator}</span>
                  <span>{schedule.classStream}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  schedule.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  schedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {schedule.status}
                </span>
                <Button
                  variant="danger"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSchedule(schedule.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {selectedSchedule && (
        <Card title="Schedule Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Exam Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Exam Name:</span>
                  <span className="font-medium">{selectedSchedule.examName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium">{formatDate(selectedSchedule.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time:</span>
                  <span className="font-medium">{formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Location Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Room Number:</span>
                  <span className="font-medium">{selectedSchedule.roomNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Invigilator:</span>
                  <span className="font-medium">{selectedSchedule.invigilator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Class Stream:</span>
                  <span className="font-medium">{selectedSchedule.classStream}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium">{selectedSchedule.status}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SchedulingCalendar;
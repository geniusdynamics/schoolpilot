// ABOUTME: This file provides the React component for the Exam Scheduling UI
// ABOUTME: allowing users to create, edit, and manage exam schedules with conflict detection

import React, { useState, useEffect } from 'react';
import { ExamSchedule, ExamSession } from '../data/types';
import { ExamScheduleManager } from '../services/ExamScheduleManager';
import { ConflictDetectionEngine } from '../services/ConflictDetectionEngine';
import { TimetableIntegrationService } from '../services/TimetableIntegrationService';
import { useAppData } from '@/hooks/useAppData';

interface ExamSchedulingUIProps {
  examId?: string;
  onScheduleComplete?: (schedule: ExamSchedule) => void;
  onCancel?: () => void;
}

interface FormData {
  exam_session_id: number;
  class_stream_id: number;
  subject_id: number;
  room_number: string;
  period_id: number;
  invigilator_id: string;
  start_time: string;
  duration_minutes: number;
  max_students: number;
  notes?: string;
}

const ExamSchedulingUI: React.FC<ExamSchedulingUIProps> = ({
  examId,
  onScheduleComplete,
  onCancel
}) => {
  const [formData, setFormData] = useState<FormData>({
    exam_session_id: 0,
    class_stream_id: 0,
    subject_id: 0,
    room_number: '',
    period_id: 0,
    invigilator_id: '',
    start_time: '',
    duration_minutes: 120,
    max_students: 30,
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  const [availableInvigilators, setAvailableInvigilators] = useState<string[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  const [classStreams, setClassStreams] = useState<any[]>([]);
  const { examSessions: appExamSessions = [], classStreams: appClassStreams = [] } = useAppData();

  const scheduleManager = new ExamScheduleManager();
  const conflictEngine = new ConflictDetectionEngine();
  const timetableService = new TimetableIntegrationService();

  useEffect(() => {
    loadInitialData();
  }, [appExamSessions, appClassStreams]);

  useEffect(() => {
    if (formData.period_id > 0 && formData.room_number) {
      checkConflicts();
    }
  }, [formData]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Use data from useAppData
      setExamSessions(appExamSessions);
      setClassStreams(appClassStreams);

      // Load available rooms and invigilators
      const availableSlots = await conflictEngine.getAvailableSlots({
        period_id: formData.period_id || 1
      });
      
      setAvailableRooms(availableSlots.availableRooms);
      setAvailableInvigilators(availableSlots.availableInvigilators);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = async () => {
    try {
      const schedule: ExamSchedule = {
        id: examId || `temp-${Date.now()}`,
        exam_session_id: formData.exam_session_id,
        class_stream_id: formData.class_stream_id,
        subject_id: formData.subject_id,
        subject_name: `Subject ${formData.subject_id}`,
        room_number: formData.room_number,
        period_id: formData.period_id,
        invigilator_id: formData.invigilator_id,
        start_time: formData.start_time,
        duration_minutes: formData.duration_minutes,
        max_students: formData.max_students,
        status: 'SCHEDULED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: formData.notes || ''
      };

      const validation = await conflictEngine.validateSchedule(schedule);
      setConflicts(validation.conflicts);
      setWarnings(validation.warnings);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      const schedule: ExamSchedule = {
        id: examId || `schedule-${Date.now()}`,
        exam_session_id: formData.exam_session_id,
        class_stream_id: formData.class_stream_id,
        subject_id: formData.subject_id,
        subject_name: `Subject ${formData.subject_id}`,
        room_number: formData.room_number,
        period_id: formData.period_id,
        invigilator_id: formData.invigilator_id,
        start_time: formData.start_time,
        duration_minutes: formData.duration_minutes,
        max_students: formData.max_students,
        status: 'SCHEDULED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: formData.notes || ''
      };

      const validation = await conflictEngine.validateSchedule(schedule);
      if (!validation.isValid) {
        setConflicts(validation.conflicts);
        return;
      }

      // Check timetable integration
      const timetableCheck = await timetableService.checkTimetableConflicts(schedule);
      if (!timetableCheck.canSchedule) {
        setConflicts(timetableCheck.conflicts);
        return;
      }

      let result;
      if (examId) {
        result = await scheduleManager.update(schedule.id, schedule);
      } else {
        result = await scheduleManager.create(schedule);
      }

      if (result) {
        // Reserve timetable slot
        await timetableService.reserveTimetableSlot(schedule);
        
        onScheduleComplete?.(schedule);
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      const err = error as Error;
      setConflicts([err.message || 'Error saving schedule']);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="exam-scheduling-ui">
      <h2>{examId ? 'Edit Exam Schedule' : 'Create Exam Schedule'}</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Exam Session</label>
            <select
              value={formData.exam_session_id}
              onChange={(e) => handleInputChange('exam_session_id', parseInt(e.target.value))}
              required
            >
              <option value="0">Select Exam Session</option>
              {examSessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Class Stream</label>
            <select
              value={formData.class_stream_id}
              onChange={(e) => handleInputChange('class_stream_id', parseInt(e.target.value))}
              required
            >
              <option value="0">Select Class Stream</option>
              {classStreams.map(stream => (
                <option key={stream.id} value={stream.id}>
                  {stream.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Subject</label>
            <input
              type="number"
              value={formData.subject_id}
              onChange={(e) => handleInputChange('subject_id', parseInt(e.target.value))}
              placeholder="Subject ID"
              required
            />
          </div>

          <div className="form-group">
            <label>Room Number</label>
            <input
              type="text"
              value={formData.room_number}
              onChange={(e) => handleInputChange('room_number', e.target.value)}
              placeholder="Room Number"
              required
            />
          </div>

          <div className="form-group">
            <label>Period</label>
            <input
              type="number"
              value={formData.period_id}
              onChange={(e) => handleInputChange('period_id', parseInt(e.target.value))}
              placeholder="Period ID"
              required
            />
          </div>

          <div className="form-group">
            <label>Invigilator</label>
            <input
              type="text"
              value={formData.invigilator_id}
              onChange={(e) => handleInputChange('invigilator_id', e.target.value)}
              placeholder="Invigilator ID"
              required
            />
          </div>

          <div className="form-group">
            <label>Start Time</label>
            <input
              type="time"
              value={formData.start_time}
              onChange={(e) => handleInputChange('start_time', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Duration (minutes)</label>
            <input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value))}
              min="30"
              max="300"
              required
            />
          </div>

          <div className="form-group">
            <label>Max Students</label>
            <input
              type="number"
              value={formData.max_students}
              onChange={(e) => handleInputChange('max_students', parseInt(e.target.value))}
              min="1"
              max="100"
              required
            />
          </div>

          <div className="form-group full-width">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="alert alert-danger">
            <h4>Conflicts Detected:</h4>
            <ul>
              {conflicts.map((conflict, index) => (
                <li key={index}>{conflict}</li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="alert alert-warning">
            <h4>Warnings:</h4>
            <ul>
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={loading || conflicts.length > 0}>
            {loading ? 'Saving...' : examId ? 'Update Schedule' : 'Create Schedule'}
          </button>
          <button type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </form>

      <style jsx>{`
        .exam-scheduling-ui {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .alert {
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
        }

        .alert-danger {
          background-color: #f8d7da;
          border-color: #f5c6cb;
          color: #721c24;
        }

        .alert-warning {
          background-color: #fff3cd;
          border-color: #ffeaa7;
          color: #856404;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .form-actions button {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .form-actions button[type="submit"] {
          background-color: #007bff;
          color: white;
        }

        .form-actions button[type="submit"]:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }

        .form-actions button[type="button"] {
          background-color: #6c757d;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default ExamSchedulingUI;
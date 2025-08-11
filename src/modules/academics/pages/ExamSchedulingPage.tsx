// ABOUTME: This file provides the main Exam Scheduling Page component
// ABOUTME: with calendar view, schedule listing, and management functionality

import React, { useState, useEffect } from 'react';
import { ExamSchedule } from '../data/types';
import { ExamScheduleManager } from '../services/ExamScheduleManager';
import { ExamSchedulingUI } from '../components/ExamSchedulingUI';
import SchedulingCalendar from '../components/SchedulingCalendar';
import { useAppData } from '@/hooks/useAppData';

interface ExamSchedulingPageProps {
  examSessionId?: string;
}

const ExamSchedulingPage: React.FC<ExamSchedulingPageProps> = ({ examSessionId }) => {
  const { classStreams = [] } = useAppData();
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExamSchedule | null>(null);
  const [filterClassStream, setFilterClassStream] = useState<string>('');
  const [filterRoom, setFilterRoom] = useState<string>('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const scheduleManager = new ExamScheduleManager();

  useEffect(() => {
    loadSchedules();
  }, [examSessionId]);

  useEffect(() => {
    applyFilters();
  }, [schedules, filterClassStream, filterRoom]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      let allSchedules;
      
      if (examSessionId) {
        allSchedules = await scheduleManager.getByExamSession(parseInt(examSessionId));
      } else {
        allSchedules = await scheduleManager.getAllExamSchedules();
      }
      
      setSchedules(allSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...schedules];

    if (filterClassStream) {
      filtered = filtered.filter(s => 
        s.class_stream_id.toString() === filterClassStream
      );
    }

    if (filterRoom) {
      filtered = filtered.filter(s => 
        s.room_number.toLowerCase().includes(filterRoom.toLowerCase())
      );
    }

    setFilteredSchedules(filtered);
  };

  const handleCreateSchedule = async (schedule: ExamSchedule) => {
    try {
      const newSchedule = await scheduleManager.createExamSchedule(schedule);
      if (newSchedule) {
        setSchedules(prev => [...prev, newSchedule]);
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const handleUpdateSchedule = async (schedule: ExamSchedule) => {
    try {
      const updated = await scheduleManager.updateExamSchedule(schedule.id, schedule);
      if (updated) {
        setSchedules(prev => 
          prev.map(s => s.id === schedule.id ? updated : s)
        );
        setEditingSchedule(null);
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const success = await scheduleManager.deleteExamSchedule(scheduleId);
      if (success) {
        setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return '#007bff';
      case 'IN_PROGRESS': return '#ffc107';
      case 'COMPLETED': return '#28a745';
      case 'CANCELLED': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const renderCalendarView = () => (
    <div className="calendar-view">
      <SchedulingCalendar
        schedules={filteredSchedules}
        onScheduleClick={setEditingSchedule}
      />
    </div>
  );

  const renderListView = () => (
    <div className="list-view">
      <div className="schedules-list">
        {filteredSchedules.length === 0 ? (
          <div className="no-schedules">
            No exam schedules found. Create one to get started!
          </div>
        ) : (
          filteredSchedules.map(schedule => (
            <div key={schedule.id} className="schedule-item">
              <div className="schedule-info">
                <h4>{schedule.subject_name}</h4>
                <p><strong>Class:</strong> {schedule.class_stream_id}</p>
                <p><strong>Room:</strong> {schedule.room_number}</p>
                <p><strong>Time:</strong> {schedule.start_time}</p>
                <p><strong>Duration:</strong> {schedule.duration_minutes} minutes</p>
                <p><strong>Max Students:</strong> {schedule.max_students}</p>
                <p><strong>Status:</strong> 
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(schedule.status) }}
                  >
                    {schedule.status}
                  </span>
                </p>
              </div>
              <div className="schedule-actions">
                <button onClick={() => setEditingSchedule(schedule)}>Edit</button>
                <button onClick={() => handleDeleteSchedule(schedule.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="exam-scheduling-page">
      <div className="page-header">
        <h1>Exam Scheduling Management</h1>
        <div className="header-actions">
          <button onClick={() => setShowCreateModal(true)}>
            Create New Schedule
          </button>
          <div className="view-toggle">
            <button 
              className={viewMode === 'calendar' ? 'active' : ''}
              onClick={() => setViewMode('calendar')}
            >
              Calendar
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Filter by Class Stream:</label>
          <select 
            value={filterClassStream} 
            onChange={(e) => setFilterClassStream(e.target.value)}
          >
            <option value="">All Classes</option>
            {classStreams.map(stream => (
              <option key={stream.id} value={stream.id.toString()}>
                {stream.class_name} {stream.stream_name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Filter by Room:</label>
          <input 
            type="text" 
            placeholder="Room number..."
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading schedules...</div>
      ) : (
        <>
          {viewMode === 'calendar' ? renderCalendarView() : renderListView()}
        </>
      )}

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              className="close-button" 
              onClick={() => setShowCreateModal(false)}
            >
              ×
            </button>
            <ExamSchedulingUI
              onScheduleComplete={handleCreateSchedule}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}

      {editingSchedule && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              className="close-button" 
              onClick={() => setEditingSchedule(null)}
            >
              ×
            </button>
            <ExamSchedulingUI
              examId={editingSchedule.id}
              onScheduleComplete={handleUpdateSchedule}
              onCancel={() => setEditingSchedule(null)}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .exam-scheduling-page {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }

        .header-actions {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .view-toggle {
          display: flex;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }

        .view-toggle button {
          padding: 8px 16px;
          border: none;
          background: white;
          cursor: pointer;
        }

        .view-toggle button.active {
          background: #007bff;
          color: white;
        }

        .filters {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .filter-group label {
          font-weight: bold;
          font-size: 14px;
        }

        .filter-group input,
        .filter-group select {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          font-size: 18px;
          color: #666;
        }

        .schedules-list {
          display: grid;
          gap: 15px;
        }

        .schedule-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }

        .schedule-info h4 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .schedule-info p {
          margin: 5px 0;
          font-size: 14px;
        }

        .status-badge {
          padding: 2px 8px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }

        .schedule-actions {
          display: flex;
          gap: 10px;
        }

        .schedule-actions button {
          padding: 5px 10px;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          border-radius: 4px;
          font-size: 12px;
        }

        .schedule-actions button:hover {
          background: #f8f9fa;
        }

        .no-schedules {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .close-button {
          position: absolute;
          top: 10px;
          right: 15px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }

        .close-button:hover {
          color: #000;
        }
      `}</style>
    </div>
  );
};

export default ExamSchedulingPage;


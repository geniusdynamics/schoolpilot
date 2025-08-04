// ABOUTME: This file provides the ConflictDetectionEngine for detecting scheduling conflicts
// ABOUTME: in exam schedules including room, invigilator, and student conflicts

import { ExamSchedule } from '../data/types';
import { RxDatabase } from 'rxdb';

export interface ConflictDetectionOptions {
  excludeScheduleId?: string;
  checkRoomConflicts?: boolean;
  checkInvigilatorConflicts?: boolean;
  checkStudentConflicts?: boolean;
  timeWindowMinutes?: number;
}

export class ConflictDetectionEngine {
  private db: RxDatabase;
  private defaultTimeWindow = 120; // 2 hours default

  constructor(db?: RxDatabase) {
    this.db = db;
  }

  async detect(schedule: ExamSchedule, options: ConflictDetectionOptions = {}): Promise<string[]> {
    const conflicts: string[] = [];
    const opts = {
      checkRoomConflicts: true,
      checkInvigilatorConflicts: true,
      checkStudentConflicts: true,
      timeWindowMinutes: this.defaultTimeWindow,
      ...options
    };

    // Room conflict
    if (opts.checkRoomConflicts) {
      const roomConflict = await this.detectRoomConflict(schedule, opts);
      if (roomConflict) {
        conflicts.push(roomConflict);
      }
    }

    // Invigilator conflict
    if (opts.checkInvigilatorConflicts) {
      const invigilatorConflict = await this.detectInvigilatorConflict(schedule, opts);
      if (invigilatorConflict) {
        conflicts.push(invigilatorConflict);
      }
    }

    // Student conflict
    if (opts.checkStudentConflicts) {
      const studentConflict = await this.detectStudentConflict(schedule, opts);
      if (studentConflict) {
        conflicts.push(studentConflict);
      }
    }

    return conflicts;
  }

  private async detectRoomConflict(schedule: ExamSchedule, options: ConflictDetectionOptions): Promise<string | null> {
    try {
      if (!this.db || !schedule.room_number) return null;

      const collection = this.db.collections['exam_schedules'];
      if (!collection) return null;

      // Find conflicting schedules for the same room
      const conflictingSchedules = await collection.find({
        selector: {
          room_number: schedule.room_number,
          period_id: schedule.period_id,
          ...(options.excludeScheduleId && { id: { $ne: options.excludeScheduleId } })
        }
      }).exec();

      if (conflictingSchedules.length > 0) {
        return `Room ${schedule.room_number} is already scheduled for this period`;
      }

      return null;
    } catch (error) {
      console.error('Error detecting room conflict:', error);
      return null;
    }
  }

  private async detectInvigilatorConflict(schedule: ExamSchedule, options: ConflictDetectionOptions): Promise<string | null> {
    try {
      if (!this.db || !schedule.invigilator_id) return null;

      const collection = this.db.collections['exam_schedules'];
      if (!collection) return null;

      // Find conflicting schedules for the same invigilator
      const conflictingSchedules = await collection.find({
        selector: {
          invigilator_id: schedule.invigilator_id,
          period_id: schedule.period_id,
          ...(options.excludeScheduleId && { id: { $ne: options.excludeScheduleId } })
        }
      }).exec();

      if (conflictingSchedules.length > 0) {
        return `Invigilator ${schedule.invigilator_id} is already assigned to another exam at this time`;
      }

      return null;
    } catch (error) {
      console.error('Error detecting invigilator conflict:', error);
      return null;
    }
  }

  private async detectStudentConflict(schedule: ExamSchedule, options: ConflictDetectionOptions): Promise<string | null> {
    try {
      if (!this.db) return null;

      // For now, student conflicts would require knowing which students are in each class stream
      // This is a placeholder for more sophisticated student conflict detection
      
      // Get students in the class stream
      const classStreamCollection = this.db.collections['class_streams'];
      const studentCollection = this.db.collections['students'];
      
      if (!classStreamCollection || !studentCollection) return null;

      // Find students in this class stream
      const classStream = await classStreamCollection.findOne({
        selector: { id: schedule.class_stream_id }
      }).exec();

      if (!classStream) return null;

      // Check if any students in this class have conflicting schedules
      // This would need more sophisticated logic based on student enrollment
      const conflictingStudents = await this.getConflictingStudents(schedule, options);
      
      if (conflictingStudents.length > 0) {
        return `Students ${conflictingStudents.slice(0, 3).join(', ')} ${conflictingStudents.length > 3 ? 'and others' : ''} have conflicting schedules`;
      }

      return null;
    } catch (error) {
      console.error('Error detecting student conflict:', error);
      return null;
    }
  }

  private async getConflictingStudents(schedule: ExamSchedule, options: ConflictDetectionOptions): Promise<string[]> {
    try {
      if (!this.db) return [];

      // This is a simplified implementation
      // In a real system, you'd need to check student enrollments and existing schedules
      
      const collection = this.db.collections['exam_schedules'];
      if (!collection) return [];

      // Find other schedules for the same class stream at the same time
      const conflictingSchedules = await collection.find({
        selector: {
          class_stream_id: schedule.class_stream_id,
          period_id: schedule.period_id,
          ...(options.excludeScheduleId && { id: { $ne: options.excludeScheduleId } })
        }
      }).exec();

      // Return student IDs that would be affected (simplified)
      // In practice, you'd need to query actual student enrollment data
      return conflictingSchedules.length > 0 ? ['conflicting_students'] : [];
    } catch (error) {
      console.error('Error getting conflicting students:', error);
      return [];
    }
  }

  async validateSchedule(schedule: ExamSchedule, options: ConflictDetectionOptions = {}): Promise<{
    isValid: boolean;
    conflicts: string[];
    warnings: string[];
  }> {
    const conflicts = await this.detect(schedule, options);
    const warnings: string[] = [];

    // Additional validation
    if (!schedule.room_number) {
      warnings.push('Room number is required');
    }

    if (!schedule.invigilator_id) {
      warnings.push('Invigilator is required');
    }

    if (!schedule.class_stream_id) {
      warnings.push('Class stream is required');
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings
    };
  }

  async getAvailableSlots(options: {
    period_id: number;
    room_number?: string;
    invigilator_id?: string;
    class_stream_id?: number;
  }): Promise<{
    availableRooms: string[];
    availableInvigilators: string[];
    conflictingSchedules: ExamSchedule[];
  }> {
    try {
      if (!this.db) {
        return {
          availableRooms: [],
          availableInvigilators: [],
          conflictingSchedules: []
        };
      }

      const collection = this.db.collections['exam_schedules'];
      if (!collection) {
        return {
          availableRooms: [],
          availableInvigilators: [],
          conflictingSchedules: []
        };
      }

      // Get all schedules for this period
      const conflictingSchedules = await collection.find({
        selector: { period_id: options.period_id }
      }).exec();

      const schedules = conflictingSchedules.map(doc => doc.toJSON());

      // In a real system, you'd query available rooms and invigilators from your database
      // For now, return empty arrays as placeholders
      return {
        availableRooms: [],
        availableInvigilators: [],
        conflictingSchedules: schedules
      };
    } catch (error) {
      console.error('Error getting available slots:', error);
      return {
        availableRooms: [],
        availableInvigilators: [],
        conflictingSchedules: []
      };
    }
  }
}


// ABOUTME: This file provides the ConflictDetectionEngine for detecting scheduling conflicts
// ABOUTME: in exam schedules including room, invigilator, and student conflicts

import { ExamSchedule } from '../data/types';
import { databaseService } from '@/services/database/databaseService';

export interface ConflictDetectionOptions {
  excludeScheduleId?: string;
  checkRoomConflicts?: boolean;
  checkInvigilatorConflicts?: boolean;
  checkStudentConflicts?: boolean;
  timeWindowMinutes?: number;
}

export class ConflictDetectionEngine {
  private defaultTimeWindow = 120; // 2 hours default

  constructor() {
    // Database access is now handled through databaseService
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
      if (!schedule.room_number) return null;

      const db = await databaseService.getDatabase();
      if (!db.exam_schedules) return null;

      // Find conflicting schedules for the same room
      const conflictingSchedules = await db.exam_schedules.find({
        selector: {
          room_number: schedule.room_number,
          period_id: schedule.period_id,
          ...(options.excludeScheduleId && { id: { $ne: options.excludeScheduleId } })
        }
      }) || [];

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
      if (!schedule.invigilator_id) return null;

      const db = await databaseService.getDatabase();
      if (!db.exam_schedules) return null;

      // Find conflicting schedules for the same invigilator
      const conflictingSchedules = await db.exam_schedules.find({
        selector: {
          invigilator_id: schedule.invigilator_id,
          period_id: schedule.period_id,
          ...(options.excludeScheduleId && { id: { $ne: options.excludeScheduleId } })
        }
      }) || [];

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
      const db = await databaseService.getDatabase();

      // For now, student conflicts would require knowing which students are in each class stream
      // This is a placeholder for more sophisticated student conflict detection
      
      // Get students in the class stream
      if (!db.class_streams || !db.students) return null;

      // Find students in this class stream
      const classStream = await db.class_streams.findById(schedule.class_stream_id.toString());

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
      const db = await databaseService.getDatabase();

      // This is a simplified implementation
      // In a real system, you'd need to check student enrollments and existing schedules
      
      if (!db.exam_schedules) return [];

      // Find other schedules for the same class stream at the same time
      const conflictingSchedules = await db.exam_schedules.find({
        selector: {
          class_stream_id: schedule.class_stream_id,
          period_id: schedule.period_id,
          ...(options.excludeScheduleId && { id: { $ne: options.excludeScheduleId } })
        }
      }) || [];

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
      const db = await databaseService.getDatabase();
      if (!db.exam_schedules) {
        return {
          availableRooms: [],
          availableInvigilators: [],
          conflictingSchedules: []
        };
      }

      // Get all schedules for this period
      const conflictingSchedules = await db.exam_schedules.find({
        selector: { period_id: options.period_id }
      }) || [];

      // Extract used rooms and invigilators
      const usedRooms = new Set(conflictingSchedules.map(s => s.room_number).filter(Boolean) as string[]);
      const usedInvigilators = new Set(conflictingSchedules.map(s => s.invigilator_id).filter(Boolean) as string[]);

      // Define default available rooms and invigilators if not provided by database
      // In a production system, these would be fetched from their respective collections
      const allRooms = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Lab A', 'Lab B', 'Main Hall'];
      
      // For invigilators, we could fetch from staff collection
      let allInvigilators: string[] = [];
      if (db.staff) {
        const staff = await db.staff.find({ selector: {} }) || [];
        allInvigilators = staff.map((s: any) => `${s.first_name} ${s.last_name}`);
      } else {
        allInvigilators = ['Invigilator 1', 'Invigilator 2', 'Invigilator 3'];
      }

      const availableRooms = allRooms.filter(room => !usedRooms.has(room));
      const availableInvigilators = allInvigilators.filter(name => !usedInvigilators.has(name));

      return {
        availableRooms,
        availableInvigilators,
        conflictingSchedules: conflictingSchedules as ExamSchedule[]
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


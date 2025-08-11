// ABOUTME: This file provides the TimetableIntegrationService for integrating exam schedules
// ABOUTME: with the school timetable system and checking for timetable conflicts

import { ExamSchedule } from '../data/types';
import { databaseService } from '../../../services/databaseService';

export interface TimetableSlot {
  id: string;
  period_id: number;
  day: string;
  start_time: string;
  end_time: string;
  room?: string;
  class_stream_id?: number;
  subject?: string;
  teacher_id?: string;
}

export interface IntegrationResult {
  canSchedule: boolean;
  conflicts: string[];
  suggestedSlots: TimetableSlot[];
  warnings: string[];
}

export class TimetableIntegrationService {
  constructor() {
    // No longer need to pass database instance
  }

  async checkTimetableConflicts(examSchedule: ExamSchedule): Promise<IntegrationResult> {
    try {
      const db = await databaseService.getDatabase();
      const conflicts: string[] = [];
      const warnings: string[] = [];

      // Check for existing timetable slots
      if (!db.timetable_slots) {
        return {
          canSchedule: true,
          conflicts: [],
          suggestedSlots: [],
          warnings: ['Timetable data not available']
        };
      }

      // Find conflicting timetable slots
      const conflictingSlots = await db.timetable_slots.find({
        selector: {
          period_id: examSchedule.period_id,
          $or: [
            { room: examSchedule.room_number },
            { class_stream_id: examSchedule.class_stream_id }
          ]
        }
      }) || [];

      if (conflictingSlots.length > 0) {
        conflicts.push(
          `Timetable conflict detected: ${conflictingSlots.length} existing slots conflict with this exam schedule`
        );
      }

      // Check room availability
      const roomConflicts = await this.checkRoomAvailability(examSchedule);
      conflicts.push(...roomConflicts);

      // Check class stream availability
      const classConflicts = await this.checkClassStreamAvailability(examSchedule);
      conflicts.push(...classConflicts);

      // Generate suggested slots
      const suggestedSlots = await this.generateSuggestedSlots(examSchedule);

      return {
        canSchedule: conflicts.length === 0,
        conflicts,
        suggestedSlots,
        warnings
      };
    } catch (error) {
      console.error('Error checking timetable conflicts:', error);
      return {
        canSchedule: false,
        conflicts: ['Error checking timetable conflicts'],
        suggestedSlots: [],
        warnings: [error.message]
      };
    }
  }

  private async checkRoomAvailability(examSchedule: ExamSchedule): Promise<string[]> {
    const conflicts: string[] = [];
    
    try {
      if (!examSchedule.room_number) return conflicts;

      const db = await databaseService.getDatabase();
      if (!db.timetable_slots) return conflicts;

      // Check if room is already booked
      const roomSlots = await db.timetable_slots.find({
        selector: {
          room: examSchedule.room_number,
          period_id: examSchedule.period_id
        }
      }) || [];

      if (roomSlots.length > 0) {
        conflicts.push(
          `Room ${examSchedule.room_number} is already booked in timetable for period ${examSchedule.period_id}`
        );
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking room availability:', error);
      return ['Error checking room availability'];
    }
  }

  private async checkClassStreamAvailability(examSchedule: ExamSchedule): Promise<string[]> {
    const conflicts: string[] = [];
    
    try {
      const db = await databaseService.getDatabase();
      if (!db.timetable_slots) return conflicts;

      // Check if class stream has existing timetable
      const classSlots = await db.timetable_slots.find({
        selector: {
          class_stream_id: examSchedule.class_stream_id,
          period_id: examSchedule.period_id
        }
      }) || [];

      if (classSlots.length > 0) {
        conflicts.push(
          `Class stream ${examSchedule.class_stream_id} has ${classSlots.length} existing timetable slots for this period`
        );
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking class stream availability:', error);
      return ['Error checking class stream availability'];
    }
  }

  private async generateSuggestedSlots(examSchedule: ExamSchedule): Promise<TimetableSlot[]> {
    try {
      const db = await databaseService.getDatabase();
      if (!db.timetable_slots) return [];

      // Generate suggested time slots based on availability
      const suggestedSlots: TimetableSlot[] = [];
      
      // In a real system, this would query available time slots
      // For now, return a basic suggestion structure
      
      const baseSlot: TimetableSlot = {
        id: `suggested-${Date.now()}`,
        period_id: examSchedule.period_id,
        day: 'MONDAY', // Default day
        start_time: '09:00',
        end_time: '11:00',
        room: examSchedule.room_number,
        class_stream_id: examSchedule.class_stream_id,
        subject: examSchedule.subject_name,
        teacher_id: examSchedule.invigilator_id
      };

      suggestedSlots.push(baseSlot);

      return suggestedSlots;
    } catch (error) {
      console.error('Error generating suggested slots:', error);
      return [];
    }
  }

  async reserveTimetableSlot(examSchedule: ExamSchedule): Promise<{
    success: boolean;
    slotId?: string;
    error?: string;
  }> {
    try {
      const db = await databaseService.getDatabase();
      if (!db.timetable_slots) {
        return { success: false, error: 'Timetable collection not available' };
      }

      // Check conflicts before reserving
      const conflictCheck = await this.checkTimetableConflicts(examSchedule);
      if (!conflictCheck.canSchedule) {
        return { success: false, error: `Timetable conflicts: ${conflictCheck.conflicts.join(', ')}` };
      }

      // Create timetable slot
      const slotId = `exam-${examSchedule.id}-${Date.now()}`;
      
      const timetableSlot = {
        id: slotId,
        period_id: examSchedule.period_id,
        day: this.getDayFromPeriod(examSchedule.period_id),
        start_time: this.getStartTimeFromPeriod(examSchedule.period_id),
        end_time: this.getEndTimeFromPeriod(examSchedule.period_id),
        room: examSchedule.room_number,
        class_stream_id: examSchedule.class_stream_id,
        subject: examSchedule.subject_name,
        teacher_id: examSchedule.invigilator_id,
        type: 'EXAM',
        exam_schedule_id: examSchedule.id
      };

      await db.timetable_slots.insert(timetableSlot);

      return { success: true, slotId };
    } catch (error) {
      console.error('Error reserving timetable slot:', error);
      return { success: false, error: error.message };
    }
  }

  async releaseTimetableSlot(examScheduleId: string): Promise<boolean> {
    try {
      const db = await databaseService.getDatabase();
      if (!db.timetable_slots) return false;

      // Find and remove exam timetable slots
      const examSlots = await db.timetable_slots.find({
        selector: {
          exam_schedule_id: examScheduleId
        }
      }) || [];

      for (const slot of examSlots) {
        await db.timetable_slots.remove(slot.id);
      }

      return true;
    } catch (error) {
      console.error('Error releasing timetable slot:', error);
      return false;
    }
  }

  async getTimetableConflictsForPeriod(periodId: number): Promise<TimetableSlot[]> {
    try {
      const db = await databaseService.getDatabase();
      if (!db.timetable_slots) return [];

      const slots = await db.timetable_slots.find({
        selector: { period_id: periodId }
      }) || [];

      return slots;
    } catch (error) {
      console.error('Error getting timetable conflicts:', error);
      return [];
    }
  }

  private getDayFromPeriod(periodId: number): string {
    // Map period ID to day (simplified)
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    return days[periodId % days.length] || 'MONDAY';
  }

  private getStartTimeFromPeriod(periodId: number): string {
    // Map period ID to start time (simplified)
    const startTimes = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];
    return startTimes[periodId % startTimes.length] || '09:00';
  }

  private getEndTimeFromPeriod(periodId: number): string {
    // Map period ID to end time (simplified)
    const endTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00'];
    return endTimes[periodId % endTimes.length] || '11:00';
  }
}
import { logger } from '@/utils/logging';

// ABOUTME: This file provides the ExamScheduleManager service for managing exam schedules
// ABOUTME: with CRUD operations and conflict detection for the Akademiko exams system

import { ExamSchedule } from '../data/types';
import { ConflictDetectionEngine } from './ConflictDetectionEngine';
import { databaseService } from '@/services/database/databaseService';

export interface CreateExamScheduleDto {
  exam_id: string;
  period_id: number;
  class_stream_id: number;
  invigilator_id: string;
  room_number: string;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateExamScheduleDto {
  exam_id?: string;
  period_id?: number;
  class_stream_id?: number;
  invigilator_id?: string;
  room_number?: string;
  updated_at?: string;
}

export interface ExamScheduleQuery {
  exam_id?: string;
  period_id?: number;
  class_stream_id?: number;
  invigilator_id?: string;
  room_number?: string;
  start_date?: string;
  end_date?: string;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: string[];
}

export class ExamScheduleManager {
  private conflictDetector: ConflictDetectionEngine;

  constructor() {
    this.conflictDetector = new ConflictDetectionEngine();
  }

  async createExamSchedule(scheduleData: CreateExamScheduleDto): Promise<ExamSchedule> {
    try {
      // Validate required fields
      this.validateScheduleData(scheduleData);

      // Check for conflicts before creation
      const conflicts = await this.conflictDetector.detect({
        ...scheduleData,
        id: '', // Temporary ID for conflict detection
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (conflicts.length > 0) {
        throw new Error(`Cannot create schedule due to conflicts: ${conflicts.join(', ')}`);
      }

      // Generate unique ID
      const id = this.generateId();
      
      const newSchedule: ExamSchedule = {
        id,
        ...scheduleData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to database
      const db = await databaseService.getDatabase();
      await db.exam_schedules?.insert(newSchedule);

      return newSchedule;
    } catch (error) {
      logger.error('Error creating exam schedule:', error);
      throw error;
    }
  }

  async getExamSchedule(id: string): Promise<ExamSchedule | null> {
    try {
      const db = await databaseService.getDatabase();
      const schedule = await db.exam_schedules?.findById(id);
      return schedule || null;
    } catch (error) {
      logger.error('Error fetching exam schedule:', error);
      throw error;
    }
  }

  async getAllExamSchedules(query?: ExamScheduleQuery): Promise<ExamSchedule[]> {
    try {
      const db = await databaseService.getDatabase();
      const selector: any = {};

      if (query) {
        if (query.exam_id) selector.exam_id = query.exam_id;
        if (query.period_id) selector.period_id = query.period_id;
        if (query.class_stream_id) selector.class_stream_id = query.class_stream_id;
        if (query.invigilator_id) selector.invigilator_id = query.invigilator_id;
        if (query.room_number) selector.room_number = query.room_number;
        
        if (query.start_date && query.end_date) {
          selector.created_at = {
            $gte: query.start_date,
            $lte: query.end_date
          };
        }
      }

      const schedules = await db.exam_schedules?.find({ selector }) || [];
      return schedules;
    } catch (error) {
      logger.error('Error fetching exam schedules:', error);
      throw error;
    }
  }

  async updateExamSchedule(id: string, updateData: UpdateExamScheduleDto): Promise<ExamSchedule> {
    try {
      const existingSchedule = await this.getExamSchedule(id);
      if (!existingSchedule) {
        throw new Error(`Exam schedule with ID ${id} not found`);
      }

      // Merge existing data with updates
      const updatedSchedule: ExamSchedule = {
        ...existingSchedule,
        ...updateData,
        updated_at: new Date().toISOString()
      };

      // Check for conflicts with updated data
      const conflicts = await this.conflictDetector.detect(updatedSchedule);
      if (conflicts.length > 0) {
        throw new Error(`Cannot update schedule due to conflicts: ${conflicts.join(', ')}`);
      }

      // Update in database
      const db = await databaseService.getDatabase();
      await db.exam_schedules?.update(id, updatedSchedule);

      return updatedSchedule;
    } catch (error) {
      logger.error('Error updating exam schedule:', error);
      throw error;
    }
  }

  async deleteExamSchedule(id: string): Promise<boolean> {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.exam_schedules?.remove(id);
      return !!result;
    } catch (error) {
      logger.error('Error deleting exam schedule:', error);
      throw error;
    }
  }

  async checkConflicts(schedule: Partial<ExamSchedule>): Promise<ConflictCheckResult> {
    try {
      const conflicts = await this.conflictDetector.detect({
        ...schedule,
        id: schedule.id || '',
        created_at: schedule.created_at || new Date().toISOString(),
        updated_at: schedule.updated_at || new Date().toISOString()
      } as ExamSchedule);

      return {
        hasConflicts: conflicts.length > 0,
        conflicts
      };
    } catch (error) {
      logger.error('Error checking conflicts:', error);
      throw error;
    }
  }

  async bulkCreateSchedules(schedules: CreateExamScheduleDto[]): Promise<ExamSchedule[]> {
    try {
      const results: ExamSchedule[] = [];
      const errors: string[] = [];

      for (const scheduleData of schedules) {
        try {
          const schedule = await this.createExamSchedule(scheduleData);
          results.push(schedule);
        } catch (error) {
          const err = error as Error;
          errors.push(`Failed to create schedule: ${err.message}`);
        }
      }

      if (errors.length > 0) {
        logger.warn('Bulk create completed with errors:', errors);
      }

      return results;
    } catch (error) {
      logger.error('Error in bulk create:', error);
      throw error;
    }
  }

  async getSchedulesByExam(examId: string): Promise<ExamSchedule[]> {
    return this.getAllExamSchedules({ exam_id: examId });
  }

  async getSchedulesByClassStream(classStreamId: number): Promise<ExamSchedule[]> {
    return this.getAllExamSchedules({ class_stream_id: classStreamId });
  }

  async getSchedulesByInvigilator(invigilatorId: string): Promise<ExamSchedule[]> {
    return this.getAllExamSchedules({ invigilator_id: invigilatorId });
  }

  async getSchedulesByRoom(roomNumber: string): Promise<ExamSchedule[]> {
    return this.getAllExamSchedules({ room_number: roomNumber });
  }

  async getScheduleCounts(): Promise<{
    total: number;
    byExam: Record<string, number>;
    byClassStream: Record<string, number>;
    byInvigilator: Record<string, number>;
  }> {
    try {
      const allSchedules = await this.getAllExamSchedules();
      
      const byExam: Record<string, number> = {};
      const byClassStream: Record<string, number> = {};
      const byInvigilator: Record<string, number> = {};

      allSchedules.forEach(schedule => {
        byExam[schedule.exam_id ?? ''] = (byExam[schedule.exam_id ?? ''] || 0) + 1;
        byClassStream[schedule.class_stream_id.toString()] = (byClassStream[schedule.class_stream_id.toString()] || 0) + 1;
        byInvigilator[schedule.invigilator_id ?? ''] = (byInvigilator[schedule.invigilator_id ?? ''] || 0) + 1;
      });

      return {
        total: allSchedules.length,
        byExam,
        byClassStream,
        byInvigilator
      };
    } catch (error) {
      logger.error('Error getting schedule counts:', error);
      throw error;
    }
  }

  private validateScheduleData(data: CreateExamScheduleDto): void {
    const requiredFields: (keyof CreateExamScheduleDto)[] = [
      'exam_id',
      'period_id',
      'class_stream_id',
      'invigilator_id',
      'room_number'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  private generateId(): string {
    return `exam_schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const examScheduleManager = new ExamScheduleManager();

export default examScheduleManager;


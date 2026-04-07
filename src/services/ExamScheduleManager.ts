/**
 * Exam Schedule Manager
 * Handles exam schedule management operations
 */

export interface ExamSchedule {
  id: string;
  exam_id: string;
  period_id: number;
  class_stream_id: number;
  invigilator_id: string;
  room_number: string;
  created_at: string;
  updated_at: string;
}

export interface ExamScheduleManager {
  schedules: ExamSchedule[];
  loading: boolean;
  error: string | null;

  // CRUD operations
  createSchedule(schedule: Partial<ExamSchedule>): Promise<ExamSchedule>;
  updateSchedule(id: string, updates: Partial<ExamSchedule>): Promise<ExamSchedule>;
  deleteSchedule(id: string): Promise<void>;
  getSchedule(id: string): Promise<ExamSchedule | null>;

  // Query operations
  getSchedulesByExam(examId: string): ExamSchedule[];
  getSchedulesByClass(classStreamId: number): ExamSchedule[];
  getSchedulesByRoom(roomNumber: string): ExamSchedule[];
  getSchedulesByInvigilator(invigilatorId: string): ExamSchedule[];

  // Bulk operations
  createBulkSchedules(schedules: Partial<ExamSchedule>[]): Promise<ExamSchedule[]>;
  updateBulkSchedules(updates: Array<{ id: string; changes: Partial<ExamSchedule> }>): Promise<ExamSchedule[]>;
  deleteBulkSchedules(ids: string[]): Promise<void>;
}

export class ExamScheduleManager implements ExamScheduleManager {
  schedules: ExamSchedule[] = [];
  loading = false;
  error: string | null = null;

  async createSchedule(schedule: Partial<ExamSchedule>): Promise<ExamSchedule> {
    this.loading = true;
    try {
      const newSchedule: ExamSchedule = {
        id: `schedule-${Date.now()}`,
        exam_id: schedule.exam_id || '',
        period_id: schedule.period_id || 0,
        class_stream_id: schedule.class_stream_id || 0,
        invigilator_id: schedule.invigilator_id || '',
        room_number: schedule.room_number || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.schedules.push(newSchedule);
      return newSchedule;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to create schedule';
      throw err;
    } finally {
      this.loading = false;
    }
  }

  async updateSchedule(id: string, updates: Partial<ExamSchedule>): Promise<ExamSchedule> {
    this.loading = true;
    try {
      const index = this.schedules.findIndex(s => s.id === id);
      if (index === -1) {
        throw new Error('Schedule not found');
      }

      const updatedSchedule = {
        ...this.schedules[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      this.schedules[index] = updatedSchedule;
      return updatedSchedule;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to update schedule';
      throw err;
    } finally {
      this.loading = false;
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    this.loading = true;
    try {
      this.schedules = this.schedules.filter(s => s.id !== id);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to delete schedule';
      throw err;
    } finally {
      this.loading = false;
    }
  }

  async getSchedule(id: string): Promise<ExamSchedule | null> {
    return this.schedules.find(s => s.id === id) || null;
  }

  getSchedulesByExam(examId: string): ExamSchedule[] {
    return this.schedules.filter(s => s.exam_id === examId);
  }

  getSchedulesByClass(classStreamId: number): ExamSchedule[] {
    return this.schedules.filter(s => s.class_stream_id === classStreamId);
  }

  getSchedulesByRoom(roomNumber: string): ExamSchedule[] {
    return this.schedules.filter(s => s.room_number === roomNumber);
  }

  getSchedulesByInvigilator(invigilatorId: string): ExamSchedule[] {
    return this.schedules.filter(s => s.invigilator_id === invigilatorId);
  }

  async createBulkSchedules(schedules: Partial<ExamSchedule>[]): Promise<ExamSchedule[]> {
    this.loading = true;
    try {
      const newSchedules = schedules.map(schedule => ({
        id: `schedule-${Date.now()}-${Math.random()}`,
        exam_id: schedule.exam_id || '',
        period_id: schedule.period_id || 0,
        class_stream_id: schedule.class_stream_id || 0,
        invigilator_id: schedule.invigilator_id || '',
        room_number: schedule.room_number || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      this.schedules.push(...newSchedules);
      return newSchedules;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to create bulk schedules';
      throw err;
    } finally {
      this.loading = false;
    }
  }

  async updateBulkSchedules(updates: Array<{ id: string; changes: Partial<ExamSchedule> }>): Promise<ExamSchedule[]> {
    this.loading = true;
    try {
      return updates.map(({ id, changes }) => {
        const index = this.schedules.findIndex(s => s.id === id);
        if (index === -1) {
          throw new Error('Schedule not found');
        }

        this.schedules[index] = {
          ...this.schedules[index],
          ...changes,
          updated_at: new Date().toISOString(),
        };

        return this.schedules[index];
      });
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to update bulk schedules';
      throw err;
    } finally {
      this.loading = false;
    }
  }

  async deleteBulkSchedules(ids: string[]): Promise<void> {
    this.loading = true;
    try {
      this.schedules = this.schedules.filter(s => !ids.includes(s.id));
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to delete bulk schedules';
      throw err;
    } finally {
      this.loading = false;
    }
  }
}

// Export singleton instance
export const examScheduleManager = new ExamScheduleManager();

export default examScheduleManager;
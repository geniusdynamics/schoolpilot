// ABOUTME: StudentPromotionService - Business logic for student class promotion
// ABOUTME: Replaces sp_adm_promoteStudent stored procedure from Akademico DB
// ABOUTME: Maintains immutable history in student_class_history while updating current class

import type { StudentClassHistoryEntry } from '../data/types';
import { AuditLoggerService } from './AuditLoggerService';
import { logger } from '@/utils/logging';

/**
 * Parameters for promoting a student
 */
export interface PromotionParams {
  studentId: string;
  newClassStreamId: string;
  academicYearId: string;
  promotionDate: string; // ISO date string
  userId?: string | null;
  userName?: string | null;
}

/**
 * Result of a promotion operation
 */
export interface PromotionResult {
  success: boolean;
  studentId: string;
  previousClassStreamId?: string | null;
  newClassStreamId: string;
  historyEntryId?: string;
  errors?: string[];
}

/**
 * Minimal interface for database collection operations.
 * This allows the service to work with any database provider
 * (RxDB, PouchDB, SQLite, etc.) without tight coupling.
 */
export interface ICollectionAdapter {
  find(query: Record<string, unknown>): Promise<unknown[]>;
  findOne(id: string): Promise<Record<string, unknown> | null>;
  insert(doc: Record<string, unknown>): Promise<unknown>;
  update(id: string, changes: Record<string, unknown>): Promise<unknown>;
}

/**
 * StudentPromotionService - Handles student class transfers and promotions.
 *
 * Replaces the MySQL stored procedure `sp_adm_promoteStudent` and the
 * PgSQL function `adm.promote_student`. Ensures:
 * 1. Previous class history is closed (end_date set)
 * 2. New class history entry is created
 * 3. Student's current_class_stream_id is updated
 * 4. Audit trail is maintained via AuditLoggerService
 *
 * Usage:
 * ```typescript
 * const service = new StudentPromotionService(studentsColl, historyColl, classStreamsColl);
 * const result = await service.promoteStudent({
 *   studentId: 'stu_123',
 *   newClassStreamId: 'cs_456',
 *   academicYearId: 'ay_2025',
 *   promotionDate: '2025-01-15',
 *   userId: 'user_1',
 *   userName: 'Admin'
 * });
 * ```
 */
export class StudentPromotionService {
  private studentsCollection: ICollectionAdapter | null;
  private historyCollection: ICollectionAdapter | null;
  private classStreamsCollection: ICollectionAdapter | null;
  private auditLogger: AuditLoggerService;

  constructor(
    studentsCollection: ICollectionAdapter | null,
    historyCollection: ICollectionAdapter | null,
    classStreamsCollection: ICollectionAdapter | null
  ) {
    this.studentsCollection = studentsCollection;
    this.historyCollection = historyCollection;
    this.classStreamsCollection = classStreamsCollection;
    this.auditLogger = AuditLoggerService.getInstance();
  }

  /**
   * Promote a student to a new class/stream.
   *
   * This mirrors the original stored procedure:
   * 1. Find the student's current (open-ended) class history record
   * 2. Close it by setting end_date = promotion_date
   * 3. Create a new history record with the new class/stream
   * 4. Update student's current_class_stream_id
   * 5. Log the change to audit trail
   */
  async promoteStudent(params: PromotionParams): Promise<PromotionResult> {
    const { studentId, newClassStreamId, academicYearId, promotionDate, userId, userName } = params;

    try {
      // Step 1: Find current student data
      const student = await this.findStudent(studentId);
      if (!student) {
        return {
          success: false,
          studentId,
          newClassStreamId,
          errors: [`Student not found: ${studentId}`]
        };
      }

      const studentStatus = student.status as string;

      // Validate student is active
      if (studentStatus === 'Suspended' || studentStatus === 'Transferred') {
        return {
          success: false,
          studentId,
          newClassStreamId,
          errors: [`Cannot promote student with status: ${studentStatus}`]
        };
      }

      // Validate new class stream exists
      const classStreamExists = await this.classStreamExists(newClassStreamId);
      if (!classStreamExists) {
        return {
          success: false,
          studentId,
          newClassStreamId,
          errors: [`Class stream not found: ${newClassStreamId}`]
        };
      }

      // Check if student is already in this class stream
      const currentClassStreamId = student.current_class_stream_id as string | null | undefined;
      if (currentClassStreamId === newClassStreamId) {
        return {
          success: false,
          studentId,
          newClassStreamId,
          errors: ['Student is already in this class stream']
        };
      }

      const previousClassStreamId = currentClassStreamId ?? null;

      // Step 2: Close current class history (set end_date)
      await this.closeCurrentHistory(studentId, promotionDate);

      // Step 3: Create new class history entry
      const historyEntryId = await this.createNewHistory({
        student_id: studentId,
        class_stream_id: newClassStreamId,
        academic_year_id: academicYearId,
        start_date: promotionDate
      });

      // Step 4: Update student's current_class_stream_id
      await this.updateStudentClass(studentId, newClassStreamId);

      // Step 5: Log to audit trail
      await this.auditLogger.logUpdate(
        'students',
        studentId,
        { status: studentStatus, current_class_stream_id: previousClassStreamId },
        { status: studentStatus, current_class_stream_id: newClassStreamId },
        userId,
        userName
      );

      return {
        success: true,
        studentId,
        previousClassStreamId,
        newClassStreamId,
        historyEntryId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[StudentPromotionService] Error promoting student ${studentId}:`, error);
      return {
        success: false,
        studentId,
        newClassStreamId,
        errors: [`Promotion failed: ${errorMessage}`]
      };
    }
  }

  /**
   * Bulk promote multiple students (e.g., promote an entire class to the next level)
   */
  async promoteStudents(paramsList: PromotionParams[]): Promise<PromotionResult[]> {
    const results: PromotionResult[] = [];
    for (const params of paramsList) {
      const result = await this.promoteStudent(params);
      results.push(result);
    }
    return results;
  }

  /**
   * Soft-delete a student (replaces the SOFT_DELETE branch of the trigger).
   * Sets deleted_at timestamp and logs to audit trail.
   */
  async softDeleteStudent(
    studentId: string,
    identifyingData: { admission_no: string; [key: string]: unknown },
    userId?: string | null,
    userName?: string | null
  ): Promise<boolean> {
    try {
      if (this.studentsCollection && typeof this.studentsCollection.update === 'function') {
        await this.studentsCollection.update(studentId, {
          deleted_at: new Date().toISOString(),
          status: 'Transferred'
        });
      }

      // Log soft delete to audit
      await this.auditLogger.logSoftDelete(
        'students',
        studentId,
        identifyingData,
        userId,
        userName
      );

      return true;
    } catch (error) {
      logger.error(`[StudentPromotionService] Error soft-deleting student ${studentId}:`, error);
      return false;
    }
  }

  /**
   * Get the full class history for a student
   */
  async getStudentClassHistory(studentId: string): Promise<StudentClassHistoryEntry[]> {
    if (!this.historyCollection || typeof this.historyCollection.find !== 'function') {
      return [];
    }

    try {
      const results = await this.historyCollection.find({
        selector: { student_id: studentId }
      });
      const entries: StudentClassHistoryEntry[] = Array.isArray(results)
        ? results as StudentClassHistoryEntry[]
        : [];

      // Sort by start_date descending (most recent first)
      return entries.sort((a, b) =>
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );
    } catch (error) {
      logger.error(`[StudentPromotionService] Error fetching class history for student ${studentId}:`, error);
      return [];
    }
  }

  /**
   * Revert a promotion (undo the last promotion, moving student back)
   */
  async revertPromotion(
    studentId: string,
    userId?: string | null,
    userName?: string | null
  ): Promise<PromotionResult> {
    try {
      const student = await this.findStudent(studentId);
      if (!student) {
        return {
          success: false,
          studentId,
          newClassStreamId: '',
          errors: [`Student not found: ${studentId}`]
        };
      }

      // Find the most recent history entry (current class)
      const history = await this.getStudentClassHistory(studentId);
      if (history.length === 0) {
        return {
          success: false,
          studentId,
          newClassStreamId: '',
          errors: ['No class history found for student']
        };
      }

      const currentEntry = history[0];
      const previousClassStreamId = history.length > 1
        ? (history[1].class_stream_id as string)
        : null;

      if (!previousClassStreamId) {
        return {
          success: false,
          studentId,
          newClassStreamId: '',
          errors: ['No previous class history found to revert to']
        };
      }

      // Delete the current history entry
      const currentClassStreamId = student.current_class_stream_id as string | null;

      // Revert student to previous class
      await this.updateStudentClass(studentId, previousClassStreamId);

      // Re-open the previous history entry by clearing its end_date
      if (this.historyCollection && typeof this.historyCollection.update === 'function') {
        await this.historyCollection.update(history[1].id, {
          end_date: null
        });
      }

      // Close the reverted entry
      if (this.historyCollection && typeof this.historyCollection.update === 'function') {
        await this.historyCollection.update(currentEntry.id, {
          end_date: new Date().toISOString()
        });
      }

      // Log to audit trail
      await this.auditLogger.logUpdate(
        'students',
        studentId,
        { current_class_stream_id: currentClassStreamId },
        { current_class_stream_id: previousClassStreamId },
        userId,
        userName
      );

      return {
        success: true,
        studentId,
        previousClassStreamId: currentClassStreamId,
        newClassStreamId: previousClassStreamId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        studentId,
        newClassStreamId: '',
        errors: [`Revert failed: ${errorMessage}`]
      };
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Private helper methods
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private async findStudent(studentId: string): Promise<Record<string, unknown> | null> {
    if (!this.studentsCollection || typeof this.studentsCollection.findOne !== 'function') {
      logger.warn('[StudentPromotionService] Students collection not available');
      return null;
    }

    try {
      return await this.studentsCollection.findOne(studentId);
    } catch {
      return null;
    }
  }

  private async classStreamExists(classStreamId: string): Promise<boolean> {
    if (!this.classStreamsCollection || typeof this.classStreamsCollection.findOne !== 'function') {
      logger.warn('[StudentPromotionService] Class streams collection not available, skipping validation');
      return true; // Skip validation if collection not available
    }

    try {
      const result = await this.classStreamsCollection.findOne(classStreamId);
      return result !== null;
    } catch {
      return false;
    }
  }

  private async closeCurrentHistory(studentId: string, promotionDate: string): Promise<void> {
    if (!this.historyCollection || typeof this.historyCollection.find !== 'function') {
      logger.warn('[StudentPromotionService] History collection not available');
      return;
    }

    try {
      // Find the current (open-ended) history record
      const allHistory = await this.historyCollection.find({
        selector: {
          student_id: studentId,
          end_date: null
        }
      });

      const historyEntries: Record<string, unknown>[] = Array.isArray(allHistory)
        ? allHistory as Record<string, unknown>[]
        : [];

      // Close all open-ended history records for this student
      for (const entry of historyEntries) {
        if (entry.end_date === null || entry.end_date === undefined) {
          if (this.historyCollection && typeof this.historyCollection.update === 'function') {
            await this.historyCollection.update(entry.id as string, {
              end_date: promotionDate
            });
          }
        }
      }
    } catch (error) {
      logger.warn('[StudentPromotionService] Could not close history records:', error);
    }
  }

  private async createNewHistory(entry: Omit<StudentClassHistoryEntry, 'id' | 'created_at'>): Promise<string> {
    const id = `sch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    if (!this.historyCollection || typeof this.historyCollection.insert !== 'function') {
      logger.warn('[StudentPromotionService] History collection not available, skipping insert');
      return id;
    }

    try {
      await this.historyCollection.insert({
        id,
        ...entry,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('[StudentPromotionService] Failed to create history entry:', error);
    }

    return id;
  }

  private async updateStudentClass(studentId: string, newClassStreamId: string): Promise<void> {
    if (!this.studentsCollection || typeof this.studentsCollection.update !== 'function') {
      logger.warn('[StudentPromotionService] Students collection not available');
      return;
    }

    await this.studentsCollection.update(studentId, {
      current_class_stream_id: newClassStreamId
    });
  }
}

export default StudentPromotionService;
import { logger } from '@/utils/logging';

/**
 * ERPNext Client
 * 
 * Specialized client for ERPNext integration.
 * Extends the generic BackendClient with ERPNext-specific methods.
 */

import { BackendClient } from '../backend/BackendClient';
import type { ERPNextConfig, ERPNextEntity, ERPNextDocResponse, ERPNextListResponse } from './types';

export class ERPNextClient extends BackendClient {
  private erpnextConfig: ERPNextConfig;

  constructor(config: ERPNextConfig) {
    super(config);
    this.erpnextConfig = config;
  }

  // ============================================================================
  // ERPNext Authentication
  // ============================================================================

  async authenticate(): Promise<boolean> {
    try {
      // ERPNext uses either API key/secret or username/password
      if (this.erpnextConfig.auth.type === 'apikey' && this.erpnextConfig.auth.apiKey) {
        // Test the API key by making a request
        const response = await this.get('/api/method/frappe.auth.get_logged_user');
        return response.success;
      }

      // For username/password, we need to use the login method
      if (this.erpnextConfig.auth.username && this.erpnextConfig.auth.password) {
        const response = await this.rawRequest({
          method: 'POST',
          endpoint: '/api/method/login',
          body: {
            usr: this.erpnextConfig.auth.username,
            pwd: this.erpnextConfig.auth.password,
          },
        });

        if (response.success) {
          // Store the session cookie info
          this.setAuthToken({
            accessToken: 'session', // ERPNext uses cookies, not tokens
            tokenType: 'Session',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
          });
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('ERPNext authentication failed:', error);
      return false;
    }
  }

  // ============================================================================
  // DocType Operations
  // ============================================================================

  async getDoc<T>(doctype: ERPNextEntity, name: string): Promise<T | null> {
    const response = await this.get<ERPNextDocResponse<T>>(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
    );

    if (!response.success) {
      if (response.error?.statusCode === 404) {
        return null;
      }
      throw new Error(response.error?.message || `Failed to get ${doctype}`);
    }

    return response.data?.data || null;
  }

  async getDocList<T>(
    doctype: ERPNextEntity,
    options: {
      filters?: Record<string, any>;
      fields?: string[];
      limit?: number;
      limit_start?: number;
      order_by?: string;
    } = {}
  ): Promise<T[]> {
    const params: Record<string, any> = {};

    if (options.filters) {
      params.filters = JSON.stringify(options.filters);
    }
    if (options.fields) {
      params.fields = JSON.stringify(options.fields);
    }
    if (options.limit) {
      params.limit_page_length = options.limit;
    }
    if (options.limit_start !== undefined) {
      params.limit_start = options.limit_start;
    }
    if (options.order_by) {
      params.order_by = options.order_by;
    }

    const response = await this.get<ERPNextListResponse<T>>(
      `/api/resource/${encodeURIComponent(doctype)}`,
      params
    );

    if (!response.success) {
      throw new Error(response.error?.message || `Failed to list ${doctype}`);
    }

    return response.data?.data || [];
  }

  async createDoc<T>(doctype: ERPNextEntity, data: Partial<T>): Promise<T> {
    const response = await this.post<ERPNextDocResponse<T>>(
      `/api/resource/${encodeURIComponent(doctype)}`,
      data
    );

    if (!response.success) {
      throw new Error(response.error?.message || `Failed to create ${doctype}`);
    }

    return response.data!.data;
  }

  async updateDoc<T>(doctype: ERPNextEntity, name: string, data: Partial<T>): Promise<T> {
    const response = await this.put<ERPNextDocResponse<T>>(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      data
    );

    if (!response.success) {
      throw new Error(response.error?.message || `Failed to update ${doctype}`);
    }

    return response.data!.data;
  }

  async deleteDoc(doctype: ERPNextEntity, name: string): Promise<void> {
    const response = await this.delete(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
    );

    if (!response.success) {
      throw new Error(response.error?.message || `Failed to delete ${doctype}`);
    }
  }

  // ============================================================================
  // Method Calls
  // ============================================================================

  async callMethod<T>(method: string, args?: Record<string, any>): Promise<T> {
    const response = await this.post<{ message: T }>(
      `/api/method/${method}`,
      args
    );

    if (!response.success) {
      throw new Error(response.error?.message || `Method call failed: ${method}`);
    }

    return response.data!.message;
  }

  // ============================================================================
  // ERPNext-Specific Helpers
  // ============================================================================

  async getStudent(studentId: string) {
    return this.getDoc('Student', studentId);
  }

  async getStudents(filters?: Record<string, any>, limit = 100) {
    return this.getDocList('Student', { filters, limit });
  }

  async createStudent(studentData: any) {
    return this.createDoc('Student', studentData);
  }

  async updateStudent(studentId: string, studentData: any) {
    return this.updateDoc('Student', studentId, studentData);
  }

  async getEmployee(employeeId: string) {
    return this.getDoc('Employee', employeeId);
  }

  async getEmployees(filters?: Record<string, any>, limit = 100) {
    return this.getDocList('Employee', { filters, limit });
  }

  async getCourse(courseId: string) {
    return this.getDoc('Course', courseId);
  }

  async getCourses(filters?: Record<string, any>, limit = 100) {
    return this.getDocList('Course', { filters, limit });
  }

  async getStudentGroup(groupId: string) {
    return this.getDoc('Student Group', groupId);
  }

  async getStudentGroups(filters?: Record<string, any>, limit = 100) {
    return this.getDocList('Student Group', { filters, limit });
  }

  async getProgram(programId: string) {
    return this.getDoc('Program', programId);
  }

  async getPrograms(filters?: Record<string, any>, limit = 100) {
    return this.getDocList('Program', { filters, limit });
  }

  async getAttendance(studentId: string, date: string) {
    return this.getDocList('Student Attendance', {
      filters: { student: studentId, date },
      limit: 1,
    });
  }

  async getAttendanceForGroup(studentGroup: string, date: string) {
    return this.getDocList('Student Attendance', {
      filters: { student_group: studentGroup, date },
      limit: 1000,
    });
  }

  async markAttendance(attendanceData: any) {
    return this.createDoc('Student Attendance', attendanceData);
  }

  async updateAttendance(attendanceId: string, attendanceData: any) {
    return this.updateDoc('Student Attendance', attendanceId, attendanceData);
  }

  async getFeeStructure(feeStructureId: string) {
    return this.getDoc('Fee Structure', feeStructureId);
  }

  async getFeesForStudent(studentId: string) {
    return this.getDocList('Fees', {
      filters: { student: studentId },
      order_by: 'posting_date desc',
    });
  }

  async createFees(feesData: any) {
    return this.createDoc('Fees', feesData);
  }

  async getAssessmentResult(studentId: string, assessmentPlan: string) {
    const results = await this.getDocList('Assessment Result', {
      filters: { student: studentId, assessment_plan: assessmentPlan },
      limit: 1,
    });
    return results[0] || null;
  }

  async createAssessmentResult(resultData: any) {
    return this.createDoc('Assessment Result', resultData);
  }

  async updateAssessmentResult(resultId: string, resultData: any) {
    return this.updateDoc('Assessment Result', resultId, resultData);
  }

  // ============================================================================
  // Sync Helpers
  // ============================================================================

  async getChangesSince(doctype: ERPNextEntity, since: Date): Promise<any[]> {
    // ERPNext doesn't have a built-in changes API
    // We use the modified timestamp field
    return this.getDocList(doctype, {
      filters: {
        modified: ['>=', since.toISOString()],
      },
      fields: ['name', 'modified', 'creation', 'modified_by'],
      limit: 1000,
    });
  }

  async getFullDoc(doctype: ERPNextEntity, name: string) {
    // Get all fields including child tables
    return this.getDoc(doctype, name);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  async getDoctypes(): Promise<string[]> {
    const response = await this.get<{ message: string[] }>('/api/method/frappe.desk.reportview.get_doctypes');
    return response.data?.message || [];
  }

  async getDocFields(doctype: ERPNextEntity): Promise<any[]> {
    const response = await this.get<{ message: any[] }>(
      '/api/method/frappe.desk.form.load.getdoctype',
      { doctype, with_parent: 1 }
    );
    return response.data?.message?.docs || [];
  }

  async getLinkFields(doctype: ERPNextEntity, fieldname: string): Promise<any[]> {
    const response = await this.get<{ message: any[] }>(
      '/api/method/frappe.desk.search.search_link',
      { txt: '', doctype: fieldname }
    );
    return response.data?.message || [];
  }

  // ============================================================================
  // Health Check Override
  // ============================================================================

  async checkHealth(): Promise<any> {
    try {
      const startTime = Date.now();
      const response = await this.get('/api/method/frappe.auth.get_logged_user');
      const latency = Date.now() - startTime;

      return {
        connected: response.success,
        authenticated: response.success,
        latency,
        version: this.erpnextConfig.version,
        user: response.data?.message,
      };
    } catch (error) {
      return {
        connected: false,
        authenticated: false,
        error: (error as Error).message,
      };
    }
  }
}

export default ERPNextClient;

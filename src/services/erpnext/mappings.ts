/**
 * ERPNext Entity Mappings
 * 
 * Defines how SchoolPilot3 entities map to ERPNext DocTypes.
 * Includes field mappings, transforms, and sync directions.
 */

import type { ERPNextSyncMapping, FieldMapping } from './types';

// ============================================================================
// Default Field Mappings
// ============================================================================

/**
 * Student entity mapping
 */
export const studentMapping: ERPNextSyncMapping = {
  localEntity: 'students',
  erpnextDocType: 'Student',
  direction: 'bidirectional',
  fieldMappings: {
    id: 'name',
    firstName: 'first_name',
    middleName: 'middle_name',
    lastName: 'last_name',
    email: 'student_email_id',
    phone: 'student_mobile_number',
    dateOfBirth: 'date_of_birth',
    gender: 'gender',
    bloodGroup: 'blood_group',
    nationality: 'nationality',
    photo: 'image',
    status: 'status',
  },
  transforms: {
    dateOfBirth: (value: string) => value ? new Date(value).toISOString().split('T')[0] : null,
    gender: (value: string) => {
      const map: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' };
      return map[value?.toLowerCase()] || value;
    },
  },
};

/**
 * Teacher entity mapping (maps to Employee with designation)
 */
export const teacherMapping: ERPNextSyncMapping = {
  localEntity: 'teachers',
  erpnextDocType: 'Employee',
  direction: 'bidirectional',
  fieldMappings: {
    id: 'name',
    firstName: 'first_name',
    middleName: 'middle_name',
    lastName: 'last_name',
    email: 'company_email',
    personalEmail: 'personal_email',
    phone: 'cell_number',
    emergencyPhone: 'emergency_phone_number',
    dateOfBirth: 'date_of_birth',
    gender: 'gender',
    hireDate: 'date_of_joining',
    designation: 'designation',
    department: 'department',
    employeeNumber: 'employee_number',
    photo: 'image',
    status: 'status',
  },
  transforms: {
    dateOfBirth: (value: string) => value ? new Date(value).toISOString().split('T')[0] : null,
    hireDate: (value: string) => value ? new Date(value).toISOString().split('T')[0] : null,
    gender: (value: string) => {
      const map: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' };
      return map[value?.toLowerCase()] || value;
    },
    designation: () => 'Teacher', // Default designation for teachers
  },
};

/**
 * Class/Course mapping (maps to Student Group)
 */
export const classMapping: ERPNextSyncMapping = {
  localEntity: 'classes',
  erpnextDocType: 'Student Group',
  direction: 'bidirectional',
  fieldMappings: {
    id: 'name',
    name: 'student_group_name',
    academicYear: 'academic_year',
    academicTerm: 'academic_term',
    program: 'program',
    maxStudents: 'max_strength',
  },
  transforms: {
    group_based_on: () => 'Batch', // Default to Batch for classes
  },
};

/**
 * Subject mapping (maps to Course)
 */
export const subjectMapping: ERPNextSyncMapping = {
  localEntity: 'subjects',
  erpnextDocType: 'Course',
  direction: 'bidirectional',
  fieldMappings: {
    id: 'name',
    name: 'course_name',
    code: 'course_code',
    department: 'department',
    abbreviation: 'course_abbreviation',
    description: 'description',
    image: 'course_image',
  },
};

/**
 * Attendance mapping
 */
export const attendanceMapping: ERPNextSyncMapping = {
  localEntity: 'attendance',
  erpnextDocType: 'Student Attendance',
  direction: 'to-erpnext', // SchoolPilot is source of truth for daily attendance
  fieldMappings: {
    id: 'name',
    studentId: 'student',
    date: 'date',
    status: 'status',
    courseScheduleId: 'course_schedule',
    courseId: 'course',
    instructorId: 'instructor',
  },
  transforms: {
    status: (value: string) => {
      const map: Record<string, string> = {
        present: 'Present',
        absent: 'Absent',
        late: 'Half Day',
        excused: 'Present', // Map excused to present in ERPNext
      };
      return map[value?.toLowerCase()] || 'Present';
    },
    date: (value: string) => value ? new Date(value).toISOString().split('T')[0] : null,
  },
};

/**
 * Fee structure mapping
 */
export const feeStructureMapping: ERPNextSyncMapping = {
  localEntity: 'feeStructures',
  erpnextDocType: 'Fee Structure',
  direction: 'from-erpnext', // ERPNext is source of truth for fee structures
  fieldMappings: {
    id: 'name',
    programId: 'program',
    studentCategory: 'student_category',
    academicYear: 'academic_year',
    totalAmount: 'total_amount',
  },
};

/**
 * Fee invoice mapping (maps to Fees)
 */
export const feeInvoiceMapping: ERPNextSyncMapping = {
  localEntity: 'feeInvoices',
  erpnextDocType: 'Fees',
  direction: 'to-erpnext', // Push invoices to ERPNext
  fieldMappings: {
    id: 'name',
    studentId: 'student',
    feeStructureId: 'fee_structure',
    postingDate: 'posting_date',
    dueDate: 'due_date',
    grandTotal: 'grand_total',
    outstandingAmount: 'outstanding_amount',
    status: 'status',
  },
  transforms: {
    postingDate: (value: string) => value ? new Date(value).toISOString().split('T')[0] : null,
    dueDate: (value: string) => value ? new Date(value).toISOString().split('T')[0] : null,
  },
};

/**
 * Assessment/Grade mapping
 */
export const assessmentMapping: ERPNextSyncMapping = {
  localEntity: 'assessments',
  erpnextDocType: 'Assessment Result',
  direction: 'bidirectional',
  fieldMappings: {
    id: 'name',
    studentId: 'student',
    assessmentPlanId: 'assessment_plan',
    assessmentGroupId: 'assessment_group',
    courseId: 'course',
    totalScore: 'total_score',
    maximumScore: 'maximum_score',
    grade: 'grade',
  },
};

/**
 * Timetable/Course schedule mapping
 */
export const timetableMapping: ERPNextSyncMapping = {
  localEntity: 'timetable',
  erpnextDocType: 'Course Schedule',
  direction: 'to-erpnext',
  fieldMappings: {
    id: 'name',
    studentGroupId: 'student_group',
    courseId: 'course',
    instructorId: 'instructor',
    scheduleDate: 'schedule_date',
    fromTime: 'from_time',
    toTime: 'to_time',
    room: 'room',
    title: 'title',
  },
  transforms: {
    scheduleDate: (value: string) => value ? new Date(value).toISOString().split('T')[0] : null,
    fromTime: (value: string) => value, // Expected format: "HH:mm:ss"
    toTime: (value: string) => value,
  },
};

// ============================================================================
// All Mappings
// ============================================================================

export const defaultMappings: ERPNextSyncMapping[] = [
  studentMapping,
  teacherMapping,
  classMapping,
  subjectMapping,
  attendanceMapping,
  feeStructureMapping,
  feeInvoiceMapping,
  assessmentMapping,
  timetableMapping,
];

/**
 * Get mapping for a local entity
 */
export function getMapping(localEntity: string): ERPNextSyncMapping | undefined {
  return defaultMappings.find(m => m.localEntity === localEntity);
}

/**
 * Get mapping for an ERPNext DocType
 */
export function getMappingByDocType(doctype: string): ERPNextSyncMapping | undefined {
  return defaultMappings.find(m => m.erpnextDocType === doctype);
}

// ============================================================================
// Transform Helpers
// ============================================================================

/**
 * Transform local entity to ERPNext format
 */
export function toERPNext<T extends Record<string, any>>(
  localData: T,
  mapping: ERPNextSyncMapping
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [localField, erpnextField] of Object.entries(mapping.fieldMappings)) {
    let value = localData[localField];

    // Apply transform if exists
    const transform = mapping.transforms?.[localField];
    if (transform && value !== undefined) {
      value = transform(value);
    }

    if (value !== undefined) {
      result[erpnextField] = value;
    }
  }

  return result;
}

/**
 * Transform ERPNext data to local format
 */
export function fromERPNext<T extends Record<string, any>>(
  erpnextData: Record<string, any>,
  mapping: ERPNextSyncMapping
): T {
  const result: Record<string, any> = {};

  // Reverse the field mappings
  for (const [localField, erpnextField] of Object.entries(mapping.fieldMappings)) {
    const value = erpnextData[erpnextField];
    if (value !== undefined) {
      result[localField] = value;
    }
  }

  return result as T;
}

// ============================================================================
// Child Table Mappings
// ============================================================================

/**
 * Map student group students to child table format
 */
export function mapStudentGroupStudents(students: { id: string; name: string; active?: boolean }[]) {
  return students.map(s => ({
    student: s.id,
    student_name: s.name,
    active: s.active !== false ? 1 : 0,
  }));
}

/**
 * Map student group instructors to child table format
 */
export function mapStudentGroupInstructors(instructors: { id: string; name: string }[]) {
  return instructors.map(i => ({
    instructor: i.id,
    instructor_name: i.name,
  }));
}

/**
 * Map fee components to child table format
 */
export function mapFeeComponents(components: { category: string; amount: number; description?: string }[]) {
  return components.map(c => ({
    fees_category: c.category,
    amount: c.amount,
    description: c.description,
  }));
}

/**
 * Map assessment details to child table format
 */
export function mapAssessmentDetails(details: { criteria: string; score: number; maxScore?: number; grade?: string }[]) {
  return details.map(d => ({
    assessment_criteria: d.criteria,
    score: d.score,
    maximum_score: d.maxScore,
    grade: d.grade,
  }));
}

// ============================================================================
// Sync Configuration Helpers
// ============================================================================

/**
 * Get default sync config for an entity
 */
export function getDefaultSyncConfig(entity: string) {
  const configs: Record<string, { priority: number; batchSize: number; interval?: number }> = {
    students: { priority: 10, batchSize: 100 },
    teachers: { priority: 9, batchSize: 50 },
    classes: { priority: 8, batchSize: 50 },
    subjects: { priority: 7, batchSize: 50 },
    attendance: { priority: 10, batchSize: 500, interval: 300 }, // 5 minutes
    feeStructures: { priority: 5, batchSize: 20 },
    feeInvoices: { priority: 6, batchSize: 100 },
    assessments: { priority: 7, batchSize: 100 },
    timetable: { priority: 6, batchSize: 100 },
  };

  return configs[entity] || { priority: 5, batchSize: 100 };
}

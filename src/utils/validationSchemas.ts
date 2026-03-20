// ABOUTME: Validation schemas for core entities in the SchoolPilot system
// ABOUTME: Defines field validation rules, relationships, and business rules for each entity

import { 
  EntityValidationSchema, 
  ConsistencyCheck,
  ValidationError,
  CommonValidations,
  globalDataValidator 
} from './dataValidation';
import { 
  PersonGender, 
  StudentStatus, 
  FinancialYearStatus, 
  InvoiceStatus
} from '../core/types';
import { 
  ExamSessionStatus
} from '../modules/academics/data/enums';

// Student validation schema
const studentSchema: EntityValidationSchema = {
  entityName: 'students',
  fields: {
    id: { required: true, type: 'string' },
    admission_no: { required: true, type: 'string', minLength: 1, maxLength: 50 },
    first_name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    last_name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    middle_name: { type: 'string', maxLength: 100 },
    gender: { required: true, enum: Object.values(PersonGender) },
    date_of_birth: { 
      type: 'date',
      custom: (value) => {
        if (value && new Date(value) >= new Date()) {
          return {
            field: 'date_of_birth',
            message: 'Date of birth must be in the past',
            code: 'INVALID_DOB',
            severity: 'error'
          };
        }
        return null;
      }
    },
    email: { 
      type: 'email',
      custom: (value) => value ? CommonValidations.email(value) : null
    },
    phone: {
      type: 'phone',
      custom: (value) => value ? CommonValidations.phone(value) : null
    },
    status: { required: true, enum: Object.values(StudentStatus) },
    current_class_stream_id: { type: 'number' },
    student_category_id: { type: 'number' },
    dormitory_id: { type: 'number' }
  },
  relationships: {
    current_class_stream_id: {
      type: 'many-to-one',
      targetEntity: 'classStreams',
      targetField: 'id',
      required: false
    },
    student_category_id: {
      type: 'many-to-one',
      targetEntity: 'studentCategories',
      targetField: 'id',
      required: false
    },
    dormitory_id: {
      type: 'many-to-one',
      targetEntity: 'dormitories',
      targetField: 'id',
      required: false
    }
  },
  businessRules: [
    {
      name: 'unique_admission_number',
      description: 'Admission number must be unique within the school',
      validate: (student, context) => {
        if (context && context.allStudents) {
          const duplicate = context.allStudents.find((s: any) => 
            s.admission_no === student.admission_no && s.id !== student.id
          );
          if (duplicate) {
            return {
              field: 'admission_no',
              message: `Admission number ${student.admission_no} is already in use`,
              code: 'DUPLICATE_ADMISSION_NO',
              severity: 'error'
            };
          }
        }
        return null;
      }
    },
    {
      name: 'age_validation',
      description: 'Student age should be reasonable for school attendance',
      validate: (student) => {
        if (student.date_of_birth) {
          const age = new Date().getFullYear() - new Date(student.date_of_birth).getFullYear();
          if (age < 3 || age > 25) {
            return {
              field: 'date_of_birth',
              message: `Student age (${age}) seems unusual for school attendance`,
              code: 'UNUSUAL_AGE',
              severity: 'error'
            };
          }
        }
        return null;
      }
    }
  ]
};

// Staff validation schema
const staffSchema: EntityValidationSchema = {
  entityName: 'staff',
  fields: {
    id: { required: true, type: 'string' },
    staff_no: { required: true, type: 'string', minLength: 1, maxLength: 50 },
    first_name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    last_name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    phone: { 
      type: 'phone',
      custom: (value) => value ? CommonValidations.phone(value) : null
    },
    email: { 
      type: 'email',
      custom: (value) => value ? CommonValidations.email(value) : null
    },
    department_id: { type: 'string' },
    designation_id: { type: 'number' },
    is_active: { required: true, type: 'boolean' }
  },
  relationships: {
    department_id: {
      type: 'many-to-one',
      targetEntity: 'departments',
      targetField: 'id',
      required: false
    },
    designation_id: {
      type: 'many-to-one',
      targetEntity: 'designations',
      targetField: 'id',
      required: false
    }
  },
  businessRules: [
    {
      name: 'unique_staff_number',
      description: 'Staff number must be unique',
      validate: (staff, context) => {
        if (context && context.allStaff) {
          const duplicate = context.allStaff.find((s: any) => 
            s.staff_no === staff.staff_no && s.id !== staff.id
          );
          if (duplicate) {
            return {
              field: 'staff_no',
              message: `Staff number ${staff.staff_no} is already in use`,
              code: 'DUPLICATE_STAFF_NO',
              severity: 'error'
            };
          }
        }
        return null;
      }
    }
  ]
};

// Financial Year validation schema
const financialYearSchema: EntityValidationSchema = {
  entityName: 'financialYears',
  fields: {
    id: { required: true, type: 'number' },
    name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    start_date: { required: true, type: 'date' },
    end_date: { required: true, type: 'date' },
    status: { required: true, enum: Object.values(FinancialYearStatus) }
  },
  businessRules: [
    {
      name: 'date_range_validation',
      description: 'End date must be after start date',
      validate: (financialYear) => {
        if (financialYear.start_date && financialYear.end_date) {
          if (new Date(financialYear.end_date) <= new Date(financialYear.start_date)) {
            return {
              field: 'end_date',
              message: 'End date must be after start date',
              code: 'INVALID_DATE_RANGE',
              severity: 'error'
            };
          }
        }
        return null;
      }
    },
    {
      name: 'overlapping_years',
      description: 'Financial years should not overlap',
      validate: (financialYear, context) => {
        if (context && context.allFinancialYears) {
          const overlapping = context.allFinancialYears.find((fy: any) => {
            if (fy.id === financialYear.id) return false;
            
            const currentStart = new Date(financialYear.start_date);
            const currentEnd = new Date(financialYear.end_date);
            const existingStart = new Date(fy.start_date);
            const existingEnd = new Date(fy.end_date);
            
            return (currentStart < existingEnd && currentEnd > existingStart);
          });
          
          if (overlapping) {
            return {
              field: 'start_date',
              message: `Financial year overlaps with ${overlapping.name}`,
              code: 'OVERLAPPING_FINANCIAL_YEAR',
              severity: 'error'
            };
          }
        }
        return null;
      }
    }
  ]
};

// Student Invoice validation schema
const studentInvoiceSchema: EntityValidationSchema = {
  entityName: 'studentInvoices',
  fields: {
    id: { required: true, type: 'string' },
    student_id: { required: true, type: 'string' },
    invoice_number: { required: true, type: 'string', minLength: 1, maxLength: 50 },
    school_period_id: { required: true, type: 'number' },
    issue_date: { required: true, type: 'date' },
    due_date: { required: true, type: 'date' },
    total_amount_billed: { 
      required: true, 
      type: 'number',
      min: 0,
      custom: CommonValidations.positiveNumber
    },
    amount_paid: { 
      required: true, 
      type: 'number',
      min: 0,
      custom: CommonValidations.positiveNumber
    },
    status: { required: true, enum: Object.values(InvoiceStatus) }
  },
  relationships: {
    student_id: {
      type: 'many-to-one',
      targetEntity: 'students',
      targetField: 'id',
      required: true
    },
    school_period_id: {
      type: 'many-to-one',
      targetEntity: 'schoolPeriods',
      targetField: 'id',
      required: true
    }
  },
  businessRules: [
    {
      name: 'due_date_after_issue',
      description: 'Due date must be after issue date',
      validate: (invoice) => {
        if (invoice.issue_date && invoice.due_date) {
          if (new Date(invoice.due_date) <= new Date(invoice.issue_date)) {
            return {
              field: 'due_date',
              message: 'Due date must be after issue date',
              code: 'INVALID_DUE_DATE',
              severity: 'error'
            };
          }
        }
        return null;
      }
    },
    {
      name: 'payment_not_exceed_billed',
      description: 'Amount paid cannot exceed amount billed',
      validate: (invoice) => {
        if (invoice.amount_paid > invoice.total_amount_billed) {
          return {
            field: 'amount_paid',
            message: 'Amount paid cannot exceed amount billed',
            code: 'OVERPAYMENT',
            severity: 'error'
          };
        }
        return null;
      }
    },
    {
      name: 'unique_invoice_number',
      description: 'Invoice number must be unique',
      validate: (invoice, context) => {
        if (context && context.allInvoices) {
          const duplicate = context.allInvoices.find((inv: any) => 
            inv.invoice_number === invoice.invoice_number && inv.id !== invoice.id
          );
          if (duplicate) {
            return {
              field: 'invoice_number',
              message: `Invoice number ${invoice.invoice_number} is already in use`,
              code: 'DUPLICATE_INVOICE_NUMBER',
              severity: 'error'
            };
          }
        }
        return null;
      }
    }
  ]
};

// School Period validation schema
const schoolPeriodSchema: EntityValidationSchema = {
  entityName: 'schoolPeriods',
  fields: {
    id: { required: true, type: 'number' },
    name: { required: true, type: 'string', minLength: 1, maxLength: 200 },
    start_date: { type: 'string' },
    end_date: { type: 'string' },
    academic_year_id: { type: 'number' },
    status: { type: 'string' }
  },
  businessRules: [
    {
      name: 'unique_period_name',
      description: 'School period name must be unique within academic year',
      validate: (period, context) => {
        if (context && context.allSchoolPeriods) {
          const duplicate = context.allSchoolPeriods.find((p: any) => 
            p.name === period.name && p.id !== period.id && p.academic_year_id === period.academic_year_id
          );
          if (duplicate) {
            return {
              field: 'name',
              message: `School period name '${period.name}' is already in use for this academic year`,
              code: 'DUPLICATE_PERIOD_NAME',
              severity: 'error'
            };
          }
        }
        return null;
      }
    }
  ]
};

// Exam Session validation schema
const examSessionSchema: EntityValidationSchema = {
  entityName: 'examSessions',
  fields: {
    id: { required: true, type: 'string' },
    name: { required: true, type: 'string', minLength: 1, maxLength: 200 },
    school_period_id: { required: true, type: 'number' },
    status: { required: true, enum: Object.values(ExamSessionStatus) }
  },
  relationships: {
    school_period_id: {
      type: 'many-to-one',
      targetEntity: 'schoolPeriods',
      targetField: 'id',
      required: true
    }
  }
};

// Consistency checks
const studentFinancialConsistency: ConsistencyCheck = {
  name: 'student_financial_consistency',
  description: 'Ensure student financial records are consistent',
  entities: ['students', 'studentInvoices', 'studentPayments'],
  check: (data) => {
    const errors: ValidationError[] = [];
    const students = data.students || [];
    const invoices = data.studentInvoices || [];
    const payments = data.studentPayments || [];

    // Check that all invoices reference existing students
    for (const invoice of invoices) {
      const student = students.find(s => s.id === invoice.student_id);
      if (!student) {
        errors.push({
          field: 'student_id',
          message: `Invoice ${invoice.invoice_number} references non-existent student ${invoice.student_id}`,
          code: 'ORPHANED_INVOICE',
          severity: 'error'
        });
      }
    }

    // Check that all payments reference existing students
    for (const payment of payments) {
      const student = students.find(s => s.id === payment.student_id);
      if (!student) {
        errors.push({
          field: 'student_id',
          message: `Payment ${payment.receipt_no} references non-existent student ${payment.student_id}`,
          code: 'ORPHANED_PAYMENT',
          severity: 'error'
        });
      }
    }

    return errors;
  }
};

const academicEnrollmentConsistency: ConsistencyCheck = {
  name: 'academic_enrollment_consistency',
  description: 'Ensure academic enrollment records are consistent',
  entities: ['students', 'studentSubjectEnrollments', 'classSubjectAllocations'],
  check: (data) => {
    const errors: ValidationError[] = [];
    const students = data.students || [];
    const enrollments = data.studentSubjectEnrollments || [];
    const allocations = data.classSubjectAllocations || [];

    // Check that all enrollments reference existing students
    for (const enrollment of enrollments) {
      const student = students.find(s => s.id === enrollment.student_id);
      if (!student) {
        errors.push({
          field: 'student_id',
          message: `Enrollment ${enrollment.id} references non-existent student ${enrollment.student_id}`,
          code: 'ORPHANED_ENROLLMENT',
          severity: 'error'
        });
      }

      // Check that enrollment references existing allocation
      const allocation = allocations.find(a => a.id === enrollment.class_subject_allocation_id);
      if (!allocation) {
        errors.push({
          field: 'class_subject_allocation_id',
          message: `Enrollment ${enrollment.id} references non-existent allocation ${enrollment.class_subject_allocation_id}`,
          code: 'ORPHANED_ALLOCATION_REF',
          severity: 'error'
        });
      }
    }

    return errors;
  }
};

const dataIntegrityConsistency: ConsistencyCheck = {
  name: 'data_integrity_consistency',
  description: 'Ensure basic data integrity across all entities',
  entities: ['*'], // All entities
  check: (data) => {
    const errors: ValidationError[] = [];

    // Check for duplicate IDs within each entity type
    for (const [entityName, entityData] of Object.entries(data)) {
      if (!Array.isArray(entityData)) continue;

      const ids = new Set();
      for (const item of entityData) {
        if (item.id) {
          if (ids.has(item.id)) {
            errors.push({
              field: 'id',
              message: `Duplicate ID ${item.id} found in ${entityName}`,
              code: 'DUPLICATE_ID',
              severity: 'critical'
            });
          }
          ids.add(item.id);
        }
      }
    }

    return errors;
  }
};

// Register all schemas and consistency checks
export function registerCoreValidationSchemas(): void {
  globalDataValidator.registerSchema(studentSchema);
  globalDataValidator.registerSchema(staffSchema);
  globalDataValidator.registerSchema(financialYearSchema);
  globalDataValidator.registerSchema(studentInvoiceSchema);
  globalDataValidator.registerSchema(schoolPeriodSchema);
  globalDataValidator.registerSchema(examSessionSchema);

  globalDataValidator.registerConsistencyCheck(studentFinancialConsistency);
  globalDataValidator.registerConsistencyCheck(academicEnrollmentConsistency);
  globalDataValidator.registerConsistencyCheck(dataIntegrityConsistency);
}

// Export schemas for module-specific registration
export {
  studentSchema,
  staffSchema,
  financialYearSchema,
  studentInvoiceSchema,
  schoolPeriodSchema,
  examSessionSchema,
  studentFinancialConsistency,
  academicEnrollmentConsistency,
  dataIntegrityConsistency
};
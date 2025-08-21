// LiveStore Schema Definitions
// Based on the existing SchoolPilot3 data structure

import { State, Events } from '@livestore/livestore';
import type {
  Student,
  Staff,
  Class,
  ClassStream,
  Subject,
  Department,
  Designation,
  StudentCategory,
  Dormitory,
  AcademicYear,
  SchoolPeriod,
  FinancialYear,
  Role,
  User,
  SchoolDetails,
  SubjectPaper,
  ExamSession,
  ChartOfAccount,
  ExpenseCategory,
  Bank,
  Supplier,
  FeeTemplate,
  ParentsGuardian
} from '../core/types';

// Define the LiveStore schema for SchoolPilot3
export const schema = {
  // Core School Information
  schoolDetails: State.SQLite.table<SchoolDetails>({
    name: 'school_details',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT NOT NULL',
      telephone: 'TEXT',
      email: 'TEXT',
      postal_address: 'TEXT',
      town: 'TEXT',
      motto: 'TEXT',
      logo_path: 'TEXT',
      school_gender: 'TEXT',
      school_type: 'TEXT',
      head_teacher_name: 'TEXT',
      school_code: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  }),

  // User Management
  users: State.SQLite.table<User>({
    name: 'users',
    columns: {
      id: 'TEXT PRIMARY KEY',
      username: 'TEXT NOT NULL UNIQUE',
      hashed_password: 'TEXT',
      email: 'TEXT NOT NULL',
      role_id: 'INTEGER',
      role: 'TEXT',
      display_name: 'TEXT',
      userType: 'TEXT NOT NULL',
      isActive: 'INTEGER NOT NULL DEFAULT 1'
    }
  }),

  roles: State.SQLite.table<Role>({
    name: 'roles',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT NOT NULL',
      description: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  }),

  // Academic Structure
  academicYears: State.SQLite.table<AcademicYear>({
    name: 'academic_years',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT NOT NULL',
      structure_id: 'TEXT NOT NULL',
      start_date: 'TEXT NOT NULL',
      end_date: 'TEXT NOT NULL',
      structure_name: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  }),

  schoolPeriods: State.SQLite.table<SchoolPeriod>({
    name: 'school_periods',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      academic_year_id: 'INTEGER NOT NULL',
      period_definition_id: 'TEXT NOT NULL',
      financial_year_id: 'INTEGER NOT NULL',
      start_date: 'TEXT NOT NULL',
      end_date: 'TEXT NOT NULL',
      mid_break_start: 'TEXT',
      mid_break_end: 'TEXT',
      is_active: 'INTEGER NOT NULL DEFAULT 1',
      name: 'TEXT',
      academic_year_name: 'TEXT',
      period_definition_name: 'TEXT',
      financial_year_name: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  }),

  financialYears: State.SQLite.table<FinancialYear>({
    name: 'financial_years',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT NOT NULL',
      start_date: 'TEXT NOT NULL',
      end_date: 'TEXT NOT NULL',
      status: 'TEXT NOT NULL',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  }),

  // Core Entities
  students: State.SQLite.table<Student>({
    name: 'students',
    columns: {
      id: 'TEXT PRIMARY KEY',
      admission_no: 'TEXT NOT NULL UNIQUE',
      upi_no: 'TEXT',
      first_name: 'TEXT NOT NULL',
      middle_name: 'TEXT',
      last_name: 'TEXT NOT NULL',
      gender: 'TEXT NOT NULL',
      date_of_birth: 'TEXT',
      photo_path: 'TEXT',
      current_class_stream_id: 'INTEGER',
      student_category_id: 'INTEGER',
      dormitory_id: 'INTEGER',
      admission_date: 'TEXT',
      status: 'TEXT NOT NULL',
      address: 'TEXT',
      remarks: 'TEXT',
      religion: 'TEXT',
      county: 'TEXT',
      district: 'TEXT',
      student_type: 'TEXT',
      primary_school: 'TEXT',
      marks_attained_primary: 'TEXT',
      class_admitted: 'TEXT',
      stream_admitted: 'TEXT',
      email: 'TEXT',
      phone: 'TEXT',
      display_name: 'TEXT',
      user_id: 'TEXT',
      current_class_name: 'TEXT',
      current_class_stream_name: 'TEXT',
      student_category_name: 'TEXT',
      dormitory_name: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL',
      deleted_at: 'TEXT'
    }
  }),

  staff: State.SQLite.table<Staff>({
    name: 'staff',
    columns: {
      id: 'TEXT PRIMARY KEY',
      user_id: 'TEXT',
      staff_no: 'TEXT NOT NULL UNIQUE',
      first_name: 'TEXT NOT NULL',
      last_name: 'TEXT NOT NULL',
      phone: 'TEXT',
      department_id: 'TEXT',
      designation_id: 'INTEGER',
      hod_of_department_id: 'TEXT',
      is_active: 'INTEGER NOT NULL DEFAULT 1',
      department_name: 'TEXT',
      designation_title: 'TEXT',
      hod_of_department_name: 'TEXT',
      user_username: 'TEXT',
      email: 'TEXT',
      display_name: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL',
      deleted_at: 'TEXT'
    }
  }),

  classes: State.SQLite.table<Class>({
    name: 'classes',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT NOT NULL'
    }
  }),

  classStreams: State.SQLite.table<ClassStream>({
    name: 'class_streams',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      class_id: 'INTEGER NOT NULL',
      name: 'TEXT NOT NULL',
      class_teacher_id: 'TEXT',
      class_name: 'TEXT',
      class_teacher_name: 'TEXT'
    }
  }),

  subjects: State.SQLite.table<Subject>({
    name: 'subjects',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      subject_code: 'TEXT NOT NULL',
      abbreviation: 'TEXT NOT NULL',
      name: 'TEXT NOT NULL',
      department_id: 'TEXT',
      is_compulsory: 'INTEGER',
      grouping: 'TEXT NOT NULL',
      department_name: 'TEXT'
    }
  }),

  departments: State.SQLite.table<Department>({
    name: 'departments',
    columns: {
      id: 'TEXT PRIMARY KEY',
      name: 'TEXT NOT NULL',
      is_academic: 'INTEGER NOT NULL',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  }),

  designations: State.SQLite.table<Designation>({
    name: 'designations',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      title: 'TEXT NOT NULL',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  }),

  studentCategories: State.SQLite.table<StudentCategory>({
    name: 'student_categories',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT NOT NULL'
    }
  }),

  dormitories: State.SQLite.table<Dormitory>({
    name: 'dormitories',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT NOT NULL',
      master_id: 'TEXT',
      master_name: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  }),

  parentsGuardians: State.SQLite.table<ParentsGuardian>({
    name: 'parents_guardians',
    columns: {
      id: 'TEXT PRIMARY KEY',
      user_id: 'TEXT',
      name: 'TEXT NOT NULL',
      phone: 'TEXT NOT NULL',
      email: 'TEXT',
      relationship_type: 'TEXT',
      location: 'TEXT',
      address: 'TEXT',
      photo_path: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL',
      deleted_at: 'TEXT'
    }
  }),

  // Academic Management
  subjectPapers: State.SQLite.table<SubjectPaper>({
    name: 'subject_papers',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      subject_id: 'INTEGER NOT NULL',
      paper_code: 'TEXT NOT NULL',
      name: 'TEXT NOT NULL',
      subject_name: 'TEXT'
    }
  }),

  examSessions: State.SQLite.table<ExamSession>({
    name: 'exam_sessions',
    columns: {
      id: 'TEXT PRIMARY KEY',
      name: 'TEXT NOT NULL',
      school_period_id: 'INTEGER NOT NULL',
      start_date: 'TEXT',
      end_date: 'TEXT',
      status: 'TEXT NOT NULL',
      school_period_name: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  }),

  // Finance
  chartOfAccounts: State.SQLite.table<ChartOfAccount>({
    name: 'chart_of_accounts',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      account_code: 'TEXT NOT NULL',
      name: 'TEXT NOT NULL',
      type: 'TEXT NOT NULL',
      template_type: 'TEXT NOT NULL',
      is_active: 'INTEGER NOT NULL DEFAULT 1',
      expense_category_id: 'INTEGER',
      expense_category_name: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  }),

  expenseCategories: State.SQLite.table<ExpenseCategory>({
    name: 'expense_categories',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT NOT NULL'
    }
  }),

  banks: State.SQLite.table<Bank>({
    name: 'banks',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT NOT NULL',
      account_no: 'TEXT',
      gl_account_id: 'INTEGER NOT NULL',
      gl_account_name: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  }),

  suppliers: State.SQLite.table<Supplier>({
    name: 'suppliers',
    columns: {
      id: 'TEXT PRIMARY KEY',
      name: 'TEXT NOT NULL',
      phone: 'TEXT',
      email: 'TEXT',
      address: 'TEXT',
      contract_expiry_date: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  }),

  feeTemplates: State.SQLite.table<FeeTemplate>({
    name: 'fee_templates',
    columns: {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT NOT NULL',
      school_period_id: 'INTEGER NOT NULL',
      student_category_id: 'INTEGER',
      school_period_name: 'TEXT',
      student_category_name: 'TEXT',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    }
  })
};

// Define events for data mutations
export const events = {
  // Student events
  studentCreated: Events.synced<{ student: Student }>(),
  studentUpdated: Events.synced<{ id: string; updates: Partial<Student> }>(),
  studentDeleted: Events.synced<{ id: string }>(),

  // Staff events
  staffCreated: Events.synced<{ staff: Staff }>(),
  staffUpdated: Events.synced<{ id: string; updates: Partial<Staff> }>(),
  staffDeleted: Events.synced<{ id: string }>(),

  // Class events
  classCreated: Events.synced<{ class: Class }>(),
  classUpdated: Events.synced<{ id: number; updates: Partial<Class> }>(),
  classDeleted: Events.synced<{ id: number }>(),

  // Class Stream events
  classStreamCreated: Events.synced<{ classStream: ClassStream }>(),
  classStreamUpdated: Events.synced<{ id: number; updates: Partial<ClassStream> }>(),
  classStreamDeleted: Events.synced<{ id: number }>(),

  // Subject events
  subjectCreated: Events.synced<{ subject: Subject }>(),
  subjectUpdated: Events.synced<{ id: number; updates: Partial<Subject> }>(),
  subjectDeleted: Events.synced<{ id: number }>(),

  // Department events
  departmentCreated: Events.synced<{ department: Department }>(),
  departmentUpdated: Events.synced<{ id: string; updates: Partial<Department> }>(),
  departmentDeleted: Events.synced<{ id: string }>(),

  // Academic Year events
  academicYearCreated: Events.synced<{ academicYear: AcademicYear }>(),
  academicYearUpdated: Events.synced<{ id: number; updates: Partial<AcademicYear> }>(),
  academicYearDeleted: Events.synced<{ id: number }>(),

  // School Period events
  schoolPeriodCreated: Events.synced<{ schoolPeriod: SchoolPeriod }>(),
  schoolPeriodUpdated: Events.synced<{ id: number; updates: Partial<SchoolPeriod> }>(),
  schoolPeriodDeleted: Events.synced<{ id: number }>(),

  // Financial Year events
  financialYearCreated: Events.synced<{ financialYear: FinancialYear }>(),
  financialYearUpdated: Events.synced<{ id: number; updates: Partial<FinancialYear> }>(),
  financialYearDeleted: Events.synced<{ id: number }>(),

  // User events
  userCreated: Events.synced<{ user: User }>(),
  userUpdated: Events.synced<{ id: string; updates: Partial<User> }>(),
  userDeleted: Events.synced<{ id: string }>(),

  // Role events
  roleCreated: Events.synced<{ role: Role }>(),
  roleUpdated: Events.synced<{ id: number; updates: Partial<Role> }>(),
  roleDeleted: Events.synced<{ id: number }>(),

  // Parent/Guardian events
  parentGuardianCreated: Events.synced<{ parentGuardian: ParentsGuardian }>(),
  parentGuardianUpdated: Events.synced<{ id: string; updates: Partial<ParentsGuardian> }>(),
  parentGuardianDeleted: Events.synced<{ id: string }>(),

  // Finance events
  chartOfAccountCreated: Events.synced<{ account: ChartOfAccount }>(),
  chartOfAccountUpdated: Events.synced<{ id: number; updates: Partial<ChartOfAccount> }>(),
  chartOfAccountDeleted: Events.synced<{ id: number }>(),

  expenseCategoryCreated: Events.synced<{ category: ExpenseCategory }>(),
  expenseCategoryUpdated: Events.synced<{ id: number; updates: Partial<ExpenseCategory> }>(),
  expenseCategoryDeleted: Events.synced<{ id: number }>(),

  bankCreated: Events.synced<{ bank: Bank }>(),
  bankUpdated: Events.synced<{ id: number; updates: Partial<Bank> }>(),
  bankDeleted: Events.synced<{ id: number }>(),

  supplierCreated: Events.synced<{ supplier: Supplier }>(),
  supplierUpdated: Events.synced<{ id: string; updates: Partial<Supplier> }>(),
  supplierDeleted: Events.synced<{ id: string }>(),

  feeTemplateCreated: Events.synced<{ feeTemplate: FeeTemplate }>(),
  feeTemplateUpdated: Events.synced<{ id: number; updates: Partial<FeeTemplate> }>(),
  feeTemplateDeleted: Events.synced<{ id: number }>()
};

// Export the complete schema
export default {
  schema,
  events
};
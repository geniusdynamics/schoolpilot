// LiveStore Schema Definitions
// Based on the existing SchoolPilot3 data structure

import { State } from '@livestore/livestore';
import type {
  Student,
  Staff,
  Class,
  ClassStream,
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
  schoolDetails: State.SQLite.table({
    name: 'school_details',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      telephone: State.SQLite.text(),
      email: State.SQLite.text(),
      postal_address: State.SQLite.text(),
      town: State.SQLite.text(),
      motto: State.SQLite.text(),
      logo_path: State.SQLite.text(),
      school_gender: State.SQLite.text(),
      school_type: State.SQLite.text(),
      head_teacher_name: State.SQLite.text(),
      school_code: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  }),

  // User Management
  users: State.SQLite.table({
    name: 'users',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      username: State.SQLite.text({ nullable: false }),
      hashed_password: State.SQLite.text(),
      email: State.SQLite.text({ nullable: false }),
      role_id: State.SQLite.integer(),
      role: State.SQLite.text(),
      display_name: State.SQLite.text(),
      userType: State.SQLite.text({ nullable: false }),
      isActive: State.SQLite.integer({ nullable: false, default: 1 })
    }
  }),

  roles: State.SQLite.table({
    name: 'roles',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      description: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  }),

  // Academic Structure
  academicYears: State.SQLite.table({
    name: 'academic_years',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      structure_id: State.SQLite.text({ nullable: false }),
      start_date: State.SQLite.text({ nullable: false }),
      end_date: State.SQLite.text({ nullable: false }),
      structure_name: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  }),

  schoolPeriods: State.SQLite.table({
    name: 'school_periods',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      academic_year_id: State.SQLite.integer({ nullable: false }),
      period_definition_id: State.SQLite.text({ nullable: false }),
      financial_year_id: State.SQLite.integer({ nullable: false }),
      start_date: State.SQLite.text({ nullable: false }),
      end_date: State.SQLite.text({ nullable: false }),
      mid_break_start: State.SQLite.text(),
      mid_break_end: State.SQLite.text(),
      is_active: State.SQLite.integer({ nullable: false, default: 1 }),
      name: State.SQLite.text(),
      academic_year_name: State.SQLite.text(),
      period_definition_name: State.SQLite.text(),
      financial_year_name: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  }),

  financialYears: State.SQLite.table({
    name: 'financial_years',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      start_date: State.SQLite.text({ nullable: false }),
      end_date: State.SQLite.text({ nullable: false }),
      status: State.SQLite.text({ nullable: false }),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  }),

  // Core Entities
  students: State.SQLite.table({
    name: 'students',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      admission_no: State.SQLite.text({ nullable: false }),
      upi_no: State.SQLite.text(),
      first_name: State.SQLite.text({ nullable: false }),
      middle_name: State.SQLite.text(),
      last_name: State.SQLite.text({ nullable: false }),
      gender: State.SQLite.text({ nullable: false }),
      date_of_birth: State.SQLite.text(),
      photo_path: State.SQLite.text(),
      current_class_stream_id: State.SQLite.integer(),
      student_category_id: State.SQLite.integer(),
      dormitory_id: State.SQLite.integer(),
      admission_date: State.SQLite.text(),
      status: State.SQLite.text({ nullable: false }),
      address: State.SQLite.text(),
      remarks: State.SQLite.text(),
      religion: State.SQLite.text(),
      county: State.SQLite.text(),
      district: State.SQLite.text(),
      student_type: State.SQLite.text(),
      primary_school: State.SQLite.text(),
      marks_attained_primary: State.SQLite.text(),
      class_admitted: State.SQLite.text(),
      stream_admitted: State.SQLite.text(),
      email: State.SQLite.text(),
      phone: State.SQLite.text(),
      display_name: State.SQLite.text(),
      user_id: State.SQLite.text(),
      current_class_name: State.SQLite.text(),
      current_class_stream_name: State.SQLite.text(),
      student_category_name: State.SQLite.text(),
      dormitory_name: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false }),
      deleted_at: State.SQLite.text()
    }
  }),

  staff: State.SQLite.table({
    name: 'staff',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      user_id: State.SQLite.text(),
      staff_no: State.SQLite.text({ nullable: false }),
      first_name: State.SQLite.text({ nullable: false }),
      last_name: State.SQLite.text({ nullable: false }),
      phone: State.SQLite.text(),
      department_id: State.SQLite.text(),
      designation_id: State.SQLite.integer(),
      hod_of_department_id: State.SQLite.text(),
      is_active: State.SQLite.integer({ nullable: false, default: 1 }),
      department_name: State.SQLite.text(),
      designation_title: State.SQLite.text(),
      hod_of_department_name: State.SQLite.text(),
      user_username: State.SQLite.text(),
      email: State.SQLite.text(),
      display_name: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false }),
      deleted_at: State.SQLite.text()
    }
  }),

  classes: State.SQLite.table({
    name: 'classes',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false })
    }
  }),

  classStreams: State.SQLite.table({
    name: 'class_streams',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      class_id: State.SQLite.integer({ nullable: false }),
      name: State.SQLite.text({ nullable: false }),
      class_teacher_id: State.SQLite.text(),
      class_name: State.SQLite.text(),
      class_teacher_name: State.SQLite.text()
    }
  }),

  subjects: State.SQLite.table({
    name: 'subjects',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      subject_code: State.SQLite.text({ nullable: false }),
      abbreviation: State.SQLite.text({ nullable: false }),
      name: State.SQLite.text({ nullable: false }),
      department_id: State.SQLite.text(),
      is_compulsory: State.SQLite.integer(),
      grouping: State.SQLite.text({ nullable: false }),
      department_name: State.SQLite.text()
    }
  }),

  departments: State.SQLite.table({
    name: 'departments',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      is_academic: State.SQLite.integer({ nullable: false }),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  }),

  designations: State.SQLite.table({
    name: 'designations',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      title: State.SQLite.text({ nullable: false }),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  }),

  studentCategories: State.SQLite.table({
    name: 'student_categories',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false })
    }
  }),

  dormitories: State.SQLite.table({
    name: 'dormitories',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      master_id: State.SQLite.text(),
      master_name: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  }),

  parentsGuardians: State.SQLite.table({
    name: 'parents_guardians',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      user_id: State.SQLite.text(),
      name: State.SQLite.text({ nullable: false }),
      phone: State.SQLite.text({ nullable: false }),
      email: State.SQLite.text(),
      relationship_type: State.SQLite.text(),
      location: State.SQLite.text(),
      address: State.SQLite.text(),
      photo_path: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false }),
      deleted_at: State.SQLite.text()
    }
  }),

  // Academic Management
  subjectPapers: State.SQLite.table({
    name: 'subject_papers',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      subject_id: State.SQLite.integer({ nullable: false }),
      paper_code: State.SQLite.text({ nullable: false }),
      name: State.SQLite.text({ nullable: false }),
      subject_name: State.SQLite.text()
    }
  }),

  examSessions: State.SQLite.table({
    name: 'exam_sessions',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      school_period_id: State.SQLite.integer({ nullable: false }),
      start_date: State.SQLite.text(),
      end_date: State.SQLite.text(),
      status: State.SQLite.text({ nullable: false }),
      school_period_name: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  }),

  // Finance
  chartOfAccounts: State.SQLite.table({
    name: 'chart_of_accounts',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      account_code: State.SQLite.text({ nullable: false }),
      name: State.SQLite.text({ nullable: false }),
      type: State.SQLite.text({ nullable: false }),
      template_type: State.SQLite.text({ nullable: false }),
      is_active: State.SQLite.integer({ nullable: false, default: 1 }),
      expense_category_id: State.SQLite.integer(),
      expense_category_name: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  }),

  expenseCategories: State.SQLite.table({
    name: 'expense_categories',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false })
    }
  }),

  banks: State.SQLite.table({
    name: 'banks',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      account_no: State.SQLite.text(),
      gl_account_id: State.SQLite.integer({ nullable: false }),
      gl_account_name: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  }),

  suppliers: State.SQLite.table({
    name: 'suppliers',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      phone: State.SQLite.text(),
      email: State.SQLite.text(),
      address: State.SQLite.text(),
      contract_expiry_date: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  }),

  feeTemplates: State.SQLite.table({
    name: 'fee_templates',
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      school_period_id: State.SQLite.integer({ nullable: false }),
      student_category_id: State.SQLite.integer(),
      school_period_name: State.SQLite.text(),
      student_category_name: State.SQLite.text(),
      created_at: State.SQLite.text({ nullable: false }),
      updated_at: State.SQLite.text({ nullable: false })
    }
  })
};

// Define events for data mutations
// Note: Events require Schema objects from @livestore/livestore which provides Schema from @livestore/utils/effect
// Using type assertions for schema compatibility
const makeEvent = <T, Name extends string>(name: Name, _args?: T) =>
  ({ name, schema: {} } as unknown as { name: Name; schema: T });

export const events = {
  // Student events
  studentCreated: makeEvent<{ student: Student }, 'studentCreated'>('studentCreated'),
  studentUpdated: makeEvent<{ id: string; updates: Partial<Student> }, 'studentUpdated'>('studentUpdated'),
  studentDeleted: makeEvent<{ id: string }, 'studentDeleted'>('studentDeleted'),

  // Staff events
  staffCreated: makeEvent<{ staff: Staff }, 'staffCreated'>('staffCreated'),
  staffUpdated: makeEvent<{ id: string; updates: Partial<Staff> }, 'staffUpdated'>('staffUpdated'),
  staffDeleted: makeEvent<{ id: string }, 'staffDeleted'>('staffDeleted'),

  // Class events
  classCreated: makeEvent<{ class: Class }, 'classCreated'>('classCreated'),
  classUpdated: makeEvent<{ id: number; updates: Partial<Class> }, 'classUpdated'>('classUpdated'),
  classDeleted: makeEvent<{ id: number }, 'classDeleted'>('classDeleted'),

  // Class Stream events
  classStreamCreated: makeEvent<{ classStream: ClassStream }, 'classStreamCreated'>('classStreamCreated'),
  classStreamUpdated: makeEvent<{ id: number; updates: Partial<ClassStream> }, 'classStreamUpdated'>('classStreamUpdated'),
  classStreamDeleted: makeEvent<{ id: number }, 'classStreamDeleted'>('classStreamDeleted'),

  // Subject events
  subjectCreated: makeEvent<{ subject: { id: number; name: string } }, 'subjectCreated'>('subjectCreated'),
  subjectUpdated: makeEvent<{ id: number; updates: Record<string, unknown> }, 'subjectUpdated'>('subjectUpdated'),
  subjectDeleted: makeEvent<{ id: number }, 'subjectDeleted'>('subjectDeleted'),

  // Department events
  departmentCreated: makeEvent<{ department: Department }, 'departmentCreated'>('departmentCreated'),
  departmentUpdated: makeEvent<{ id: string; updates: Partial<Department> }, 'departmentUpdated'>('departmentUpdated'),
  departmentDeleted: makeEvent<{ id: string }, 'departmentDeleted'>('departmentDeleted'),

  // Academic Year events
  academicYearCreated: makeEvent<{ academicYear: AcademicYear }, 'academicYearCreated'>('academicYearCreated'),
  academicYearUpdated: makeEvent<{ id: number; updates: Partial<AcademicYear> }, 'academicYearUpdated'>('academicYearUpdated'),
  academicYearDeleted: makeEvent<{ id: number }, 'academicYearDeleted'>('academicYearDeleted'),

  // School Period events
  schoolPeriodCreated: makeEvent<{ schoolPeriod: SchoolPeriod }, 'schoolPeriodCreated'>('schoolPeriodCreated'),
  schoolPeriodUpdated: makeEvent<{ id: number; updates: Partial<SchoolPeriod> }, 'schoolPeriodUpdated'>('schoolPeriodUpdated'),
  schoolPeriodDeleted: makeEvent<{ id: number }, 'schoolPeriodDeleted'>('schoolPeriodDeleted'),

  // Financial Year events
  financialYearCreated: makeEvent<{ financialYear: FinancialYear }, 'financialYearCreated'>('financialYearCreated'),
  financialYearUpdated: makeEvent<{ id: number; updates: Partial<FinancialYear> }, 'financialYearUpdated'>('financialYearUpdated'),
  financialYearDeleted: makeEvent<{ id: number }, 'financialYearDeleted'>('financialYearDeleted'),

  // User events
  userCreated: makeEvent<{ user: User }, 'userCreated'>('userCreated'),
  userUpdated: makeEvent<{ id: string; updates: Partial<User> }, 'userUpdated'>('userUpdated'),
  userDeleted: makeEvent<{ id: string }, 'userDeleted'>('userDeleted'),

  // Role events
  roleCreated: makeEvent<{ role: Role }, 'roleCreated'>('roleCreated'),
  roleUpdated: makeEvent<{ id: number; updates: Partial<Role> }, 'roleUpdated'>('roleUpdated'),
  roleDeleted: makeEvent<{ id: number }, 'roleDeleted'>('roleDeleted'),

  // Parent/Guardian events
  parentGuardianCreated: makeEvent<{ parentGuardian: ParentsGuardian }, 'parentGuardianCreated'>('parentGuardianCreated'),
  parentGuardianUpdated: makeEvent<{ id: string; updates: Partial<ParentsGuardian> }, 'parentGuardianUpdated'>('parentGuardianUpdated'),
  parentGuardianDeleted: makeEvent<{ id: string }, 'parentGuardianDeleted'>('parentGuardianDeleted'),

  // Finance events
  chartOfAccountCreated: makeEvent<{ account: ChartOfAccount }, 'chartOfAccountCreated'>('chartOfAccountCreated'),
  chartOfAccountUpdated: makeEvent<{ id: number; updates: Partial<ChartOfAccount> }, 'chartOfAccountUpdated'>('chartOfAccountUpdated'),
  chartOfAccountDeleted: makeEvent<{ id: number }, 'chartOfAccountDeleted'>('chartOfAccountDeleted'),

  expenseCategoryCreated: makeEvent<{ category: ExpenseCategory }, 'expenseCategoryCreated'>('expenseCategoryCreated'),
  expenseCategoryUpdated: makeEvent<{ id: number; updates: Partial<ExpenseCategory> }, 'expenseCategoryUpdated'>('expenseCategoryUpdated'),
  expenseCategoryDeleted: makeEvent<{ id: number }, 'expenseCategoryDeleted'>('expenseCategoryDeleted'),

  bankCreated: makeEvent<{ bank: Bank }, 'bankCreated'>('bankCreated'),
  bankUpdated: makeEvent<{ id: number; updates: Partial<Bank> }, 'bankUpdated'>('bankUpdated'),
  bankDeleted: makeEvent<{ id: number }, 'bankDeleted'>('bankDeleted'),

  supplierCreated: makeEvent<{ supplier: Supplier }, 'supplierCreated'>('supplierCreated'),
  supplierUpdated: makeEvent<{ id: string; updates: Partial<Supplier> }, 'supplierUpdated'>('supplierUpdated'),
  supplierDeleted: makeEvent<{ id: string }, 'supplierDeleted'>('supplierDeleted'),

  feeTemplateCreated: makeEvent<{ feeTemplate: FeeTemplate }, 'feeTemplateCreated'>('feeTemplateCreated'),
  feeTemplateUpdated: makeEvent<{ id: number; updates: Partial<FeeTemplate> }, 'feeTemplateUpdated'>('feeTemplateUpdated'),
  feeTemplateDeleted: makeEvent<{ id: number }, 'feeTemplateDeleted'>('feeTemplateDeleted')
};

// Export the complete schema
export default {
  schema,
  events
};

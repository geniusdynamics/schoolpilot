// services/rxdbService.ts
import {
  createRxDatabase, addRxPlugin, RxDatabase, RxCollection, RxJsonSchema, toTypedRxJsonSchema, PrimaryKey, RxDocumentData
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/dexie';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

import * as allTypes from '../types';
import { RXDB_DB_NAME, RXDB_LEADER_ELECTION_DISABLED, APP_MODE, RXDB_SETTINGS_COLLECTION_NAME, RXDB_DUMMY_DATA_FLAG_ID } from '../contexts/config';

// Import module collections
import { academicsCollections } from '../modules/academics/data/collections';
import { administrationCollections } from '../modules/administration/data/collections';
import { financeCollections } from '../modules/finance/data/collections';
import { hrCollections } from '../modules/hr/data/collections';
import { inventoryCollections } from '../modules/inventory/data/collections';
import { libraryCollections } from '../modules/library/data/collections';
import { nutritionCollections } from '../modules/nutrition/data/collections';

// Import module types for SchoolDatabaseCollections
import * as academicTypes from '../modules/academics/data/types';
import * as adminTypes from '../modules/administration/data/types';
import * as financeTypes from '../modules/finance/data/types';
import * as hrTypes from '../modules/hr/data/types';
import * as inventoryTypes from '../modules/inventory/data/types';
import * as libraryTypes from '../modules/library/data/types';
import * as nutritionTypes from '../modules/nutrition/data/types';


console.log('rxdbService.ts: Script loaded. Attempting RxDB setup.');

addRxPlugin(RxDBMigrationPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
  if (!RXDB_LEADER_ELECTION_DISABLED) {
    addRxPlugin(RxDBLeaderElectionPlugin);
  }
}

// ID Generation
export const generateId = (): string => crypto.randomUUID(); 
let numericIdCounter = Date.now();
export const generateNumericId = (): number => ++numericIdCounter; 

export const createEntitySchema = <T extends { [key: string]: any }>(
  title: string,
  propertiesInput: RxJsonSchema<T>['properties'],
  primaryKeyDefinition: { key: keyof T & string; type: 'string' | 'number'; final?: boolean; maxLength?: number },
  requiredFields: ReadonlyArray<Extract<keyof T, string>>,
  indexes?: ReadonlyArray<Extract<keyof T, string>> | ReadonlyArray<ReadonlyArray<Extract<keyof T, string>>>
): RxJsonSchema<T> => {
  const properties: RxJsonSchema<T>['properties'] = { ...propertiesInput };
  const pkName = primaryKeyDefinition.key;

  (properties as any)[pkName] = {
    type: primaryKeyDefinition.type,
    ...(primaryKeyDefinition.type === 'string' && primaryKeyDefinition.final !== undefined && { final: primaryKeyDefinition.final }),
    ...(primaryKeyDefinition.maxLength !== undefined && { maxLength: primaryKeyDefinition.maxLength }),
    ...((properties as any)[pkName] || {}),
  };

  const schemaDefinitionInternal: RxJsonSchema<T> = {
    title: `${title} schema`,
    version: 0,
    primaryKey: pkName as PrimaryKey<T>,
    type: 'object' as const,
    properties,
    required: [...requiredFields] as (Extract<keyof T, string>)[],
    indexes: indexes ? (
        Array.isArray(indexes[0])
            ? (indexes as ReadonlyArray<ReadonlyArray<Extract<keyof T, string>>>).map(idx => [...idx])
            : [...(indexes as ReadonlyArray<Extract<keyof T, string>>)]
      ) : []
  };
  return toTypedRxJsonSchema(schemaDefinitionInternal as any);
};


// --- CORE Schema Definitions (Non-modularized entities) ---

const appSettingsSchema: RxJsonSchema<allTypes.AppSetting> = createEntitySchema<allTypes.AppSetting>( RXDB_SETTINGS_COLLECTION_NAME, { id: { type: 'string' }, using_dummy_data: { type: 'boolean' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id']);
const schoolDetailsSchema: RxJsonSchema<allTypes.SchoolDetails> = createEntitySchema<allTypes.SchoolDetails>('school_details', { id: { type: 'number' }, name: { type: 'string', maxLength: 200 }, telephone: { type: ['string', 'null'] }, email: { type: ['string', 'null'], format: 'email' }, postal_address: { type: ['string', 'null'] }, town: { type: ['string', 'null'] }, motto: { type: ['string', 'null'] }, logo_path: { type: ['string', 'null'] }, school_gender: { type: ['string', 'null'], enum: ['Mixed', 'Boys Only', 'Girls Only', null] }, school_type: { type: ['string', 'null'], enum: ['Public', 'Private', 'International', null] }, head_teacher_name: { type: ['string', 'null'] }, school_code: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id','name', 'created_at', 'updated_at']);
const userSchema: RxJsonSchema<allTypes.User> = createEntitySchema<allTypes.User>('user', { id: { type: 'string' }, username: { type: 'string', maxLength: 100 }, hashed_password: { type: ['string', 'null'] }, password: { type: ['string', 'null'] }, email: { type: 'string', format: 'email', maxLength: 150 }, user_type: { type: 'string', enum: Object.values(allTypes.UserType) }, is_active: { type: 'boolean' }, last_login_at: { type: ['string', 'null'], format: 'date-time' }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, role_id: { type: ['number', 'null'], ref: 'roles' }, role: { type: ['string', 'null'] }, display_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'username', 'email', 'user_type', 'is_active', 'created_at', 'updated_at'], ['username', 'email', 'user_type', 'role_id']);
const roleSchema: RxJsonSchema<allTypes.Role> = createEntitySchema<allTypes.Role>('role', { id: { type: 'number' }, name: { type: 'string', maxLength: 100 }, description: { type: ['string', 'null'] }, permissions: { type: ['array', 'null'], items: { type: 'string' } },  created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at'], ['name']);
const academicYearStructureSchema: RxJsonSchema<allTypes.AcademicYearStructure> = createEntitySchema<allTypes.AcademicYearStructure>('academic_year_structure', { id: { type: 'number' }, name: { type: 'string' } }, { key: 'id', type: 'number' }, ['id','name']);
const academicPeriodDefinitionSchema: RxJsonSchema<allTypes.AcademicPeriodDefinition> = createEntitySchema<allTypes.AcademicPeriodDefinition>('academic_period_definition', { id: { type: 'number' }, structure_id: { type: 'number', ref: 'academic_year_structures' }, name: { type: 'string' }, sequence_order: { type: 'number' }, structure_name: { type: ['string', 'null'] } }, { key: 'id', type: 'number' }, ['id', 'structure_id', 'name', 'sequence_order'], ['structure_id']);
const academicYearSchema: RxJsonSchema<allTypes.AcademicYear> = createEntitySchema<allTypes.AcademicYear>('academic_year', { id: { type: 'number' }, name: { type: 'string' }, structure_id: { type: 'number', ref: 'academic_year_structures' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' }, structure_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'structure_id', 'start_date', 'end_date', 'created_at', 'updated_at']);
const workflowStateProperties: RxJsonSchema<allTypes.WorkflowState>['properties'] = { id: { type: 'number' }, workflow_id: { type: 'number' }, name: { type: 'string' }, sequence_order: { type: 'number' } };
const workflowSchema: RxJsonSchema<allTypes.Workflow> = createEntitySchema<allTypes.Workflow>('workflow', { id: { type: 'number' }, name: { type: 'string' }, states: { type: 'array', items: { type: 'object', properties: workflowStateProperties } as RxJsonSchema<any> }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const auditLogSchema: RxJsonSchema<allTypes.AuditLog> = createEntitySchema<allTypes.AuditLog>('audit_log', { id: { type: 'string' }, user_id: { type: ['string', 'null'], ref: 'users' }, user_name: { type: ['string', 'null'] }, action: { type: 'string', enum: Object.values(allTypes.AuditAction) }, table_name: { type: ['string', 'null'] }, record_pk: { type: ['string', 'null'] }, old_data: { type: ['object', 'null'], additionalProperties: true }, new_data: { type: ['object', 'null'], additionalProperties: true }, changed_at: { type: 'string', format: 'date-time' }, ip_address: { type: ['string', 'null'] }, user_agent: { type: ['string', 'null'] } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'action', 'changed_at']);
const parentGuardianSchemaProperties: RxJsonSchema<allTypes.ParentGuardian>['properties'] = { id: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' }, user_id: { type: ['string', 'null'] }, email: { type: ['string', 'null'] }, relationship_type: { type: ['string', 'null'] }, location: { type: ['string', 'null'] }, address: { type: ['string', 'null'] }, photo_path: { type: ['string', 'null'] }, deleted_at: { type: ['string', 'null'] }, created_at: { type: 'string' }, updated_at: { type: 'string' } };
const parentGuardianSchema: RxJsonSchema<allTypes.ParentGuardian> = createEntitySchema<allTypes.ParentGuardian>('parents_guardian', parentGuardianSchemaProperties, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'phone', 'created_at', 'updated_at']);
const examResultSummaryProperties: RxJsonSchema<allTypes.AcademicsExamResultSummaryType>['properties'] = { exam_name: { type: ['string', 'null'] }, english: { type: ['string', 'null'] }, kiswahili: { type: ['string', 'null'] }, mathematics: { type: ['string', 'null'] }, science: { type: ['string', 'null'] }, social_studies_religious_education: { type: ['string', 'null'] }, total_marks: { type: ['number', 'null'] } };
const studentSchema: RxJsonSchema<allTypes.Student> = createEntitySchema<allTypes.Student>('student', { id: { type: 'string' }, admission_no: { type: 'string', maxLength: 50 }, upi_no: { type: ['string', 'null'], maxLength: 50 }, first_name: { type: 'string' }, middle_name: { type: ['string', 'null'] }, last_name: { type: 'string' }, gender: { type: 'string', enum: Object.values(allTypes.PersonGender) }, date_of_birth: { type: ['string', 'null'], format: 'date' }, photo_path: { type: ['string', 'null'] }, current_class_stream_id: { type: ['number', 'null'], ref: 'class_streams' }, student_category_id: { type: ['number', 'null'], ref: 'student_categories' }, dormitory_id: { type: ['number', 'null'], ref: 'dormitories' }, admission_date: { type: ['string', 'null'], format: 'date' }, status: { type: 'string', enum: Object.values(allTypes.StudentStatus) }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, current_class_name: { type: ['string', 'null'] }, current_class_stream_name: { type: ['string', 'null'] }, student_category_name: { type: ['string', 'null'] }, dormitory_name: { type: ['string', 'null'] }, primary_guardian: { type: ['object', 'null'], properties: parentGuardianSchemaProperties as RxJsonSchema<any>['properties'] }, exam_result_summary: { type: ['object', 'null'], properties: examResultSummaryProperties as RxJsonSchema<any>['properties'] }, email: { type: ['string', 'null'], format: 'email' }, phone: { type: ['string', 'null'] }, address: { type: ['string', 'null'] }, remarks: { type: ['string', 'null'] }, religion: { type: ['string', 'null'] }, county: { type: ['string', 'null'] }, district: { type: ['string', 'null'] }, student_type: { type: ['string', 'null'] }, primary_school: { type: ['string', 'null'] }, marks_attained_primary: { type: ['string', 'null'] }, class_admitted: { type: ['string', 'null'] }, stream_admitted: { type: ['string', 'null'] }, user_id: { type: ['string', 'null'], ref: 'users' }, display_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'admission_no', 'first_name', 'last_name', 'gender', 'status', 'created_at', 'updated_at'], ['admission_no', 'current_class_stream_id', 'status']);
const studentGuardianRelationshipSchema: RxJsonSchema<allTypes.StudentGuardianRelationship> = createEntitySchema<allTypes.StudentGuardianRelationship>('student_guardian_relationship', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, guardian_id: { type: 'string', ref: 'parents_guardians' }, is_primary: { type: 'boolean' }, relationship_type: { type: 'string' }, can_pickup: { type: 'boolean', default: false }, receives_communication: { type: 'boolean', default: true }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'guardian_id', 'is_primary', 'relationship_type', 'created_at', 'updated_at']);
const staffSchema: RxJsonSchema<allTypes.Staff> = createEntitySchema<allTypes.Staff>('staff', { id: { type: 'string' }, staff_no: { type: 'string' }, first_name: { type: 'string' }, last_name: { type: 'string' }, is_active: { type: 'boolean' }, user_id: { type: ['string', 'null'], ref: 'users' }, phone: { type: ['string', 'null'] }, email: { type: ['string', 'null'], format: 'email' }, department_id: { type: ['number', 'null'], ref: 'departments' }, designation_id: { type: ['number', 'null'], ref: 'designations' }, hod_of_department_id: { type: ['number', 'null'], ref: 'departments' }, date_of_employment: { type: ['string', 'null'], format: 'date' }, contract_expiry_date: { type: ['string', 'null'], format: 'date' }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, department_name: { type: ['string', 'null'] }, designation_title: { type: ['string', 'null'] }, hod_of_department_name: { type: ['string', 'null'] }, user_username: { type: ['string', 'null'] }, display_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'staff_no', 'first_name', 'last_name', 'is_active', 'created_at', 'updated_at']);
const departmentSchema: RxJsonSchema<allTypes.Department> = createEntitySchema<allTypes.Department>('department', { id: { type: 'number' }, name: { type: 'string' }, is_academic: { type: 'boolean' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'is_academic', 'created_at', 'updated_at']);
const designationSchema: RxJsonSchema<allTypes.Designation> = createEntitySchema<allTypes.Designation>('designation', { id: { type: 'number' }, title: { type: 'string' }, description: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'title', 'created_at', 'updated_at']);
const studentCategorySchema: RxJsonSchema<allTypes.StudentCategory> = createEntitySchema<allTypes.StudentCategory>('student_category', { id: { type: 'number' }, name: { type: 'string' } }, { key: 'id', type: 'number' }, ['id', 'name']);
const dormitorySchema: RxJsonSchema<allTypes.Dormitory> = createEntitySchema<allTypes.Dormitory>('dormitory', { id: { type: 'number' }, name: { type: 'string' }, master_id: { type: ['string', 'null'], ref: 'staff' }, capacity: { type: ['number', 'null'] }, master_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const classStreamItemProperties: RxJsonSchema<Omit<allTypes.ClassStream, 'class_name'|'class_teacher_name'>>['properties'] = { id: { type: 'number' }, class_id: { type: 'number' }, name: { type: 'string' }, class_teacher_id: { type:['string','null'] } };
const classSchema: RxJsonSchema<allTypes.Class> = createEntitySchema<allTypes.Class>('class', { id: { type: 'number' }, name: { type: 'string' }, streams: { type: ['array', 'null'], default: [], items: { type: 'object', properties: classStreamItemProperties } as RxJsonSchema<any> } }, { key: 'id', type: 'number' }, ['id', 'name']);
const classStreamSchema: RxJsonSchema<allTypes.ClassStream> = createEntitySchema<allTypes.ClassStream>('class_stream', { id: { type: 'number' }, class_id: { type: 'number', ref: 'classes' }, name: { type: 'string' }, class_teacher_id: { type: ['string', 'null'], ref: 'staff' }, class_name: { type: ['string', 'null'] }, class_teacher_name: { type: ['string', 'null'] }, }, { key: 'id', type: 'number' }, ['id', 'class_id', 'name']);
const studentInvoiceItemSchema: RxJsonSchema<allTypes.FinStudentInvoiceItemType> = createEntitySchema<allTypes.FinStudentInvoiceItemType>('student_invoice_item', { id: { type: 'string' }, invoice_id: { type: 'string' }, description: { type: 'string' }, amount: { type: 'number' }, fee_template_item_id: {type: ['string', 'null']}, student_transport_assignment_id: {type: ['string', 'null']}, fine_id: {type: ['string', 'null']}}, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'invoice_id', 'description', 'amount']);


// --- Master Collections Definition (to be dynamically populated) ---
export const collectionsDefinition: Record<string, { schema: RxJsonSchema<any>}> = { 
  app_settings: { schema: appSettingsSchema },
  school_details: { schema: schoolDetailsSchema },
  users: { schema: userSchema },
  roles: { schema: roleSchema },
  academic_year_structures: { schema: academicYearStructureSchema },
  academic_period_definitions: { schema: academicPeriodDefinitionSchema },
  academic_years: { schema: academicYearSchema },
  workflows: { schema: workflowSchema },
  audit_logs: { schema: auditLogSchema },
  parents_guardians: { schema: parentGuardianSchema },
  students: { schema: studentSchema },
  student_guardian_relationships: { schema: studentGuardianRelationshipSchema },
  staff: { schema: staffSchema },
  departments: { schema: departmentSchema },
  designations: { schema: designationSchema },
  student_categories: { schema: studentCategorySchema },
  dormitories: { schema: dormitorySchema },
  classes: { schema: classSchema },
  class_streams: { schema: classStreamSchema },
  student_invoice_items: { schema: studentInvoiceItemSchema }, 
  
  // Module collections are merged below
  ...academicsCollections,
  ...administrationCollections,
  ...financeCollections,
  ...hrCollections,
  ...inventoryCollections,
  ...libraryCollections,
  ...nutritionCollections,
};

// Type for the database instance, mapping collection names to RxCollection types
export type SchoolDatabaseCollections = {
  app_settings: RxCollection<allTypes.AppSetting>;
  school_details: RxCollection<allTypes.SchoolDetails>;
  users: RxCollection<allTypes.User>;
  roles: RxCollection<allTypes.Role>;
  academic_year_structures: RxCollection<allTypes.AcademicYearStructure>;
  academic_period_definitions: RxCollection<allTypes.AcademicPeriodDefinition>;
  academic_years: RxCollection<allTypes.AcademicYear>;
  financial_years: RxCollection<financeTypes.FinFinancialYearType>;
  school_periods: RxCollection<allTypes.SchoolPeriod>;
  workflows: RxCollection<allTypes.Workflow>;
  audit_logs: RxCollection<allTypes.AuditLog>;
  parents_guardians: RxCollection<allTypes.ParentGuardian>;
  students: RxCollection<allTypes.Student>;
  student_guardian_relationships: RxCollection<allTypes.StudentGuardianRelationship>;
  staff: RxCollection<allTypes.Staff>;
  departments: RxCollection<allTypes.Department>;
  designations: RxCollection<allTypes.Designation>;
  student_categories: RxCollection<allTypes.StudentCategory>;
  dormitories: RxCollection<allTypes.Dormitory>;
  classes: RxCollection<allTypes.Class>;
  class_streams: RxCollection<allTypes.ClassStream>;
  student_invoice_items: RxCollection<allTypes.FinStudentInvoiceItemType>; 
  
  // Module collections
  partners: RxCollection<adminTypes.AdminPartnerType>;
  clubs: RxCollection<adminTypes.AdminClubAndSocietyType>;
  customers: RxCollection<adminTypes.AdminCustomerType>;
  student_health_records: RxCollection<adminTypes.AdminStudentHealthRecordType>;
  student_attendance: RxCollection<adminTypes.AdminStudentAttendanceType>;
  communication_templates: RxCollection<adminTypes.AdminTemplateCommType>;
  message_campaigns: RxCollection<adminTypes.AdminCampaignType>;

  chart_of_accounts: RxCollection<financeTypes.FinChartOfAccountType>;
  expense_categories: RxCollection<financeTypes.FinExpenseCategoryType>;
  banks: RxCollection<financeTypes.FinBankType>;
  suppliers: RxCollection<financeTypes.FinSupplierType>;
  fee_templates: RxCollection<financeTypes.FinFeeTemplateType>;
  // fee_template_items are nested
  expense_claims: RxCollection<financeTypes.FinExpenseClaimType>;
  student_opening_balances: RxCollection<financeTypes.FinStudentOpeningBalanceType>;
  fee_adjustments: RxCollection<financeTypes.FinFeeAdjustmentType>;
  transport_routes: RxCollection<financeTypes.FinTransportRouteType>;
  student_transport_assignments: RxCollection<financeTypes.FinStudentTransportAssignmentType>;
  student_invoices: RxCollection<financeTypes.FinStudentInvoiceType>;
  student_payments: RxCollection<financeTypes.FinStudentPaymentType>;
  invoice_payment_applications: RxCollection<financeTypes.FinInvoicePaymentApplicationType>;
  customer_invoices: RxCollection<financeTypes.FinCustomerInvoiceType>;
  // customer_invoice_items are nested
  supplier_invoices: RxCollection<financeTypes.FinSupplierInvoiceType>;
  general_payments: RxCollection<financeTypes.FinGeneralPaymentType>;
  // general_payment_items are nested
  general_ledger_entries: RxCollection<financeTypes.FinGeneralLedgerEntryType>;

  payroll_periods: RxCollection<hrTypes.HRPayrollPeriodType>;
  payroll_item_types: RxCollection<hrTypes.HRPayrollItemTypeType>;
  staff_salary_settings: RxCollection<hrTypes.HRStaffSalarySettingType>;
  payslips: RxCollection<hrTypes.HRPayslipType>;
  
  subjects: RxCollection<academicTypes.AcademicsSubjectType>;
  subject_papers: RxCollection<academicTypes.AcademicsSubjectPaperType>;
  exam_sessions: RxCollection<academicTypes.AcademicsExamSessionType>;
  grading_schemes: RxCollection<academicTypes.AcademicsGradingSchemeType>;
  student_exam_results: RxCollection<academicTypes.AcademicsStudentExamResultWithDetailsType>;
  class_subject_allocations: RxCollection<academicTypes.AcademicsClassSubjectAllocationType>;
  teacher_subject_assignments: RxCollection<academicTypes.AcademicsTeacherSubjectAssignmentType>;
  student_subject_enrollments: RxCollection<academicTypes.AcademicsStudentSubjectEnrollmentType>;
  timetable_period_definitions: RxCollection<academicTypes.AcademicsTimetablePeriodDefType>;
  timetable_entries: RxCollection<academicTypes.AcademicsTimetableEntryType>;

  book_categories: RxCollection<libraryTypes.LibBookCategoryType>;
  books: RxCollection<libraryTypes.LibBookType>;
  loans: RxCollection<libraryTypes.LibLoanType>;
  fines: RxCollection<libraryTypes.LibFineType>;

  warehouses: RxCollection<inventoryTypes.InvWarehouseType>;
  item_categories_inv: RxCollection<inventoryTypes.InvItemCategoryType>;
  items_inv: RxCollection<inventoryTypes.InvItemType>;
  fixed_assets: RxCollection<inventoryTypes.InvFixedAssetType>;
  asset_depreciation_logs: RxCollection<inventoryTypes.InvAssetDepreciationLogType>;
  requisitions: RxCollection<inventoryTypes.InvRequisitionType>;
  purchase_orders: RxCollection<inventoryTypes.InvPurchaseOrderType>;
  stock_levels: RxCollection<inventoryTypes.InvStockLevelType>;
  stock_transactions: RxCollection<inventoryTypes.InvStockTransactionType>;
  rfqs: RxCollection<inventoryTypes.InvRFQType>;
  
  meal_plans: RxCollection<nutritionTypes.NutrMealPlanType>;
  student_meal_plans: RxCollection<nutritionTypes.NutrStudentMealPlanType>;
  menus: RxCollection<nutritionTypes.NutrMenuType>;
  meal_consumption_logs: RxCollection<nutritionTypes.NutrMealConsumptionLogType>;
  merchants: RxCollection<nutritionTypes.NutrMerchantType>;
  student_wallets: RxCollection<nutritionTypes.NutrStudentWalletType>;
  wallet_transactions: RxCollection<nutritionTypes.NutrWalletTransactionType>;
};

export type SchoolDatabase = RxDatabase<SchoolDatabaseCollections>;

let dbPromise: Promise<SchoolDatabase> | null = null;

const initializeDatabaseInternal = async (): Promise<SchoolDatabase> => {
  console.log("RxDB: Initializing database...");
  const db = await createRxDatabase<SchoolDatabaseCollections>({
    name: RXDB_DB_NAME,
    storage: getRxStorageDexie(),
    multiInstance: !RXDB_LEADER_ELECTION_DISABLED,
  });
  console.log("RxDB: Database created.");
  
  const finalCollectionsDefinition: Record<string, { schema: RxJsonSchema<any>}> = {};
  for (const key in collectionsDefinition) {
    if (Object.prototype.hasOwnProperty.call(collectionsDefinition, key)) {
        finalCollectionsDefinition[key] = { schema: collectionsDefinition[key].schema };
    }
  }

  await db.addCollections(finalCollectionsDefinition);
  console.log("RxDB: Collections added.");
  
  if (typeof window !== 'undefined') {
    (window as any).APP_DB = db;
  }
  return db;
};

export const getDatabase = (): Promise<SchoolDatabase> => {
  if (!dbPromise) {
    dbPromise = initializeDatabaseInternal();
  }
  return dbPromise;
};

export const seedDatabaseWithMockData = async (db: SchoolDatabase, mockData: allTypes.RawInitialData): Promise<void> => {
    console.log("RxDB: Demo mode - Seeding database with mock data...");
    for (const collectionName in collectionsDefinition) {
        if (Object.prototype.hasOwnProperty.call(collectionsDefinition, collectionName)) {
            const rawDataKey = `initialMock${collectionName.charAt(0).toUpperCase() + collectionName.slice(1).replace(/Inv$/, 'Inv')}`; // Adjust for 'Inv' suffix
            
            const mockDataArray = mockData[rawDataKey as keyof allTypes.RawInitialData];
            
            const collection = db[collectionName as keyof SchoolDatabaseCollections] as RxCollection<any>;

            if (collection) { 
                try {
                    console.log(`RxDB: Clearing collection ${collectionName}...`);
                    await collection.find().remove(); 
                    
                    if (mockDataArray && Array.isArray(mockDataArray) && mockDataArray.length > 0) {
                        console.log(`RxDB: Seeding ${collectionName} with ${mockDataArray.length} items...`);
                        await collection.bulkInsert(mockDataArray);
                    } else if (mockDataArray && !Array.isArray(mockDataArray) && mockDataArray !== null && collectionName !== RXDB_SETTINGS_COLLECTION_NAME) { 
                        console.log(`RxDB: Seeding ${collectionName} with 1 item...`);
                        await collection.insert(mockDataArray); 
                    } else if (collectionName === RXDB_SETTINGS_COLLECTION_NAME && mockDataArray) {
                         console.log(`RxDB: Upserting ${collectionName} data...`);
                         await collection.upsert(mockDataArray as RxDocumentData<allTypes.AppSetting>);
                    }
                } catch (error) {
                    console.error(`RxDB: Error seeding collection ${collectionName}:`, error);
                }
            } else {
                 console.warn(`RxDB: Collection ${collectionName} not found in DB instance during seeding.`);
            }
        }
    }
    const settingsCollection = db.app_settings;
    if (settingsCollection) {
        await settingsCollection.upsert({ id: RXDB_DUMMY_DATA_FLAG_ID, using_dummy_data: true });
        console.log("RxDB: Dummy data flag set to true.");
    }
    console.log("RxDB: Database seeding complete.");
};

export const clearDatabase = async (db: SchoolDatabase): Promise<void> => {
  console.log("RxDB: Clearing all collections...");
  await Promise.all(
    Object.keys(db.collections).map(colName => 
      (db[colName as keyof SchoolDatabaseCollections] as RxCollection<any>).find().remove()
    )
  );
   const settingsCollection = db.app_settings;
    if (settingsCollection) {
        await settingsCollection.upsert({ id: RXDB_DUMMY_DATA_FLAG_ID, using_dummy_data: false });
        console.log("RxDB: Dummy data flag set to false.");
    }
  console.log("RxDB: All collections cleared.");
};

export const getUsingDummyDataFlag = async (db: SchoolDatabase): Promise<boolean> => {
    const settingsCollection = db.app_settings;
    if (settingsCollection) {
        const doc = await settingsCollection.findOne(RXDB_DUMMY_DATA_FLAG_ID).exec();
        return !!doc?.using_dummy_data;
    }
    return false; 
};

// services/rxdbService.ts
import {
  createRxDatabase, addRxPlugin, RxDatabase, RxCollection, RxJsonSchema, toTypedRxJsonSchema, PrimaryKey, RxDocumentData
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';

import * as allTypes from '../types';
import { 
  unifiedConfigManager,
  RXDB_DB_NAME,
  RXDB_LEADER_ELECTION_DISABLED,
  RXDB_SETTINGS_COLLECTION_NAME,
  RXDB_DUMMY_DATA_FLAG_ID
} from '../config/unifiedConfig';

// Import module collections
import { academicsCollections } from '../modules/academics/data/collections';
import { administrationCollections } from '../modules/administration/data/collections';
import { financeCollections } from '../modules/finance/data/collections';
import { hrCollections } from '../modules/hr/data/collections';
import { inventoryCollections } from '../modules/inventory/data/collections';
import { libraryCollections } from '../modules/library/data/collections';
import { nutritionCollections } from '../modules/nutrition/data/collections';

// Debug: Check if module collections are properly imported
console.log('=== MODULE COLLECTIONS DEBUG ===');
console.log('academicsCollections:', academicsCollections);
console.log('administrationCollections:', administrationCollections);
console.log('financeCollections:', financeCollections);
console.log('hrCollections:', hrCollections);
console.log('inventoryCollections:', inventoryCollections);
console.log('libraryCollections:', libraryCollections);
console.log('nutritionCollections:', nutritionCollections);
console.log('=== END MODULE COLLECTIONS DEBUG ===');

// Import module types for SchoolDatabaseCollections
import * as academicTypes from '../modules/academics/data/types';
import * as adminTypes from '../modules/administration/data/types';
import * as financeTypes from '../modules/finance/data/types';
import * as hrTypes from '../modules/hr/data/types';
import * as inventoryTypes from '../modules/inventory/data/types';
import * as libraryTypes from '../modules/library/data/types';
import * as nutritionTypes from '../modules/nutrition/data/types';

import { createEntitySchema } from '../utils/schemaUtils';

console.log('rxdbService.ts: Script loaded. Attempting RxDB setup.');

addRxPlugin(RxDBMigrationPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBDevModePlugin);
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

// rxdbService object will be defined after function declarations 

// --- CORE Schema Definitions (Non-modularized entities) ---

const appSettingsSchema: RxJsonSchema<allTypes.AppSetting> = createEntitySchema<allTypes.AppSetting>( RXDB_SETTINGS_COLLECTION_NAME, { id: { type: 'string' }, using_dummy_data: { type: 'boolean' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id']);
const schoolDetailsSchema: RxJsonSchema<allTypes.SchoolDetails> = createEntitySchema<allTypes.SchoolDetails>('school_details', { id: { type: 'string' }, name: { type: 'string', maxLength: 200 }, telephone: { type: ['string', 'null'], maxLength: 50 }, email: { type: ['string', 'null'], format: 'email', maxLength: 255 }, postal_address: { type: ['string', 'null'], maxLength: 500 }, town: { type: ['string', 'null'], maxLength: 100 }, motto: { type: ['string', 'null'], maxLength: 500 }, logo_path: { type: ['string', 'null'], maxLength: 500 }, school_gender: { type: ['string', 'null'], enum: ['Mixed', 'Boys Only', 'Girls Only', null] }, school_type: { type: ['string', 'null'], enum: ['Public', 'Private', 'International', null] }, head_teacher_name: { type: ['string', 'null'], maxLength: 200 }, school_code: { type: ['string', 'null'], maxLength: 50 }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id','name', 'created_at', 'updated_at']);
const userSchema: RxJsonSchema<allTypes.User> = createEntitySchema<allTypes.User>('user', { id: { type: 'string' }, username: { type: 'string', maxLength: 100 }, hashed_password: { type: ['string', 'null'], maxLength: 255 }, password: { type: ['string', 'null'], maxLength: 255 }, email: { type: 'string', format: 'email', maxLength: 150 }, role_id: { type: ['string', 'null'], ref: 'roles', maxLength: 100 }, is_active: { type: 'boolean' }, last_login_at: { type: ['string', 'null'], format: 'date-time' }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, role: { type: ['string', 'null'], maxLength: 100 }, display_name: { type: ['string', 'null'], maxLength: 200 }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'username', 'email', 'role_id', 'is_active', 'created_at', 'updated_at'], ['username', 'email', 'role_id']);
const roleSchema: RxJsonSchema<allTypes.Role> = createEntitySchema<allTypes.Role>('role', { id: { type: 'string' }, name: { type: 'string', maxLength: 100 }, description: { type: ['string', 'null'], maxLength: 500 }, permissions: { type: ['array', 'null'], items: { type: 'string' } },  created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'created_at', 'updated_at'], ['name']);
const academicYearStructureSchema: RxJsonSchema<allTypes.AcademicYearStructure> = createEntitySchema<allTypes.AcademicYearStructure>('academic_year_structure', { id: { type: 'string' }, name: { type: 'string', maxLength: 200 } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id','name']);
const academicPeriodDefinitionSchema: RxJsonSchema<allTypes.AcademicPeriodDefinition> = createEntitySchema<allTypes.AcademicPeriodDefinition>('academic_period_definition', { id: { type: 'string' }, structure_id: { type: 'string', ref: 'academic_year_structures' }, name: { type: 'string', maxLength: 200 }, sequence_order: { type: 'number' }, structure_name: { type: ['string', 'null'], maxLength: 200 } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'structure_id', 'name', 'sequence_order'], ['structure_id']);
const academicYearSchema: RxJsonSchema<allTypes.AcademicYear> = createEntitySchema<allTypes.AcademicYear>('academic_year', { id: { type: 'string' }, name: { type: 'string', maxLength: 200 }, structure_id: { type: 'string', ref: 'academic_year_structures' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' }, structure_name: { type: ['string', 'null'], maxLength: 200 }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'structure_id', 'start_date', 'end_date', 'created_at', 'updated_at']);
const workflowStateProperties: RxJsonSchema<allTypes.WorkflowState>['properties'] = { id: { type: 'string', maxLength: 100 }, workflow_id: { type: 'string', maxLength: 100 }, name: { type: 'string', maxLength: 200 }, sequence_order: { type: 'number' } };
const workflowSchema: RxJsonSchema<allTypes.Workflow> = createEntitySchema<allTypes.Workflow>('workflow', { id: { type: 'string' }, name: { type: 'string' }, states: { type: 'array', items: { type: 'object', properties: workflowStateProperties } as RxJsonSchema<any> }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'created_at', 'updated_at']);
const workflowStateSchema: RxJsonSchema<allTypes.WorkflowState> = createEntitySchema<allTypes.WorkflowState>('workflow_state', { id: { type: 'string' }, workflow_id: { type: 'string', ref: 'workflows', maxLength: 100 }, name: { type: 'string', maxLength: 200 }, sequence_order: { type: 'number' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'workflow_id', 'name', 'sequence_order', 'created_at', 'updated_at']);
const educationSystemConfigurationSchema: RxJsonSchema<any> = createEntitySchema<any>('education_system_configuration', { id: { type: 'string' }, name: { type: 'string', maxLength: 200 }, description: { type: ['string', 'null'], maxLength: 500 }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'created_at', 'updated_at']);
const auditLogSchema: RxJsonSchema<allTypes.AuditLog> = createEntitySchema<allTypes.AuditLog>('audit_log', { id: { type: 'string' }, user_id: { type: ['string', 'null'], ref: 'users' }, user_name: { type: ['string', 'null'], maxLength: 200 }, action: { type: 'string', enum: Object.values(allTypes.AuditAction) }, table_name: { type: ['string', 'null'], maxLength: 100 }, record_pk: { type: ['string', 'null'], maxLength: 100 }, old_data: { type: ['object', 'null'], additionalProperties: true }, new_data: { type: ['object', 'null'], additionalProperties: true }, changed_at: { type: 'string', format: 'date-time' }, ip_address: { type: ['string', 'null'], maxLength: 45 }, user_agent: { type: ['string', 'null'], maxLength: 500 } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'action', 'changed_at']);
const parentGuardianSchemaProperties: RxJsonSchema<allTypes.ParentGuardian>['properties'] = { id: { type: 'string', maxLength: 100 }, name: { type: 'string', maxLength: 200 }, phone: { type: 'string', maxLength: 50 }, user_id: { type: ['string', 'null'], maxLength: 100 }, email: { type: ['string', 'null'], maxLength: 255 }, relationship_type: { type: ['string', 'null'], maxLength: 100 }, location: { type: ['string', 'null'], maxLength: 200 }, address: { type: ['string', 'null'], maxLength: 500 }, photo_path: { type: ['string', 'null'], maxLength: 500 }, deleted_at: { type: ['string', 'null'], maxLength: 50 }, created_at: { type: 'string', maxLength: 50 }, updated_at: { type: 'string', maxLength: 50 } };
const parentGuardianSchema: RxJsonSchema<allTypes.ParentGuardian> = createEntitySchema<allTypes.ParentGuardian>('parents_guardian', parentGuardianSchemaProperties, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'phone', 'created_at', 'updated_at']);
const examResultSummaryProperties: RxJsonSchema<allTypes.AcademicsExamResultSummaryType>['properties'] = { exam_name: { type: ['string', 'null'], maxLength: 200 }, english: { type: ['string', 'null'], maxLength: 10 }, kiswahili: { type: ['string', 'null'], maxLength: 10 }, mathematics: { type: ['string', 'null'], maxLength: 10 }, science: { type: ['string', 'null'], maxLength: 10 }, social_studies_religious_education: { type: ['string', 'null'], maxLength: 10 }, total_marks: { type: ['number', 'null'] } };
const studentSchema: RxJsonSchema<allTypes.Student> = createEntitySchema<allTypes.Student>('student', { id: { type: 'string' }, admission_no: { type: 'string', maxLength: 50 }, upi_no: { type: ['string', 'null'], maxLength: 50 }, first_name: { type: 'string', maxLength: 100 }, middle_name: { type: ['string', 'null'], maxLength: 100 }, last_name: { type: 'string', maxLength: 100 }, gender: { type: 'string', enum: Object.values(allTypes.PersonGender) }, date_of_birth: { type: ['string', 'null'], format: 'date' }, photo_path: { type: ['string', 'null'], maxLength: 500 }, current_class_stream_id: { type: ['string', 'null'], ref: 'class_streams', maxLength: 100 }, student_category_id: { type: ['string', 'null'], ref: 'student_categories', maxLength: 100 }, dormitory_id: { type: ['string', 'null'], ref: 'dormitories', maxLength: 100 }, admission_date: { type: ['string', 'null'], format: 'date' }, status: { type: 'string', enum: Object.values(allTypes.StudentStatus) }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, current_class_name: { type: ['string', 'null'], maxLength: 200 }, current_class_stream_name: { type: ['string', 'null'], maxLength: 200 }, student_category_name: { type: ['string', 'null'], maxLength: 200 }, dormitory_name: { type: ['string', 'null'], maxLength: 200 }, primary_guardian: { type: ['object', 'null'], properties: parentGuardianSchemaProperties as RxJsonSchema<any>['properties'] }, exam_result_summary: { type: ['object', 'null'], properties: examResultSummaryProperties as RxJsonSchema<any>['properties'] }, email: { type: ['string', 'null'], format: 'email', maxLength: 255 }, phone: { type: ['string', 'null'], maxLength: 50 }, address: { type: ['string', 'null'], maxLength: 500 }, remarks: { type: ['string', 'null'], maxLength: 1000 }, religion: { type: ['string', 'null'], maxLength: 100 }, county: { type: ['string', 'null'], maxLength: 100 }, district: { type: ['string', 'null'], maxLength: 100 }, student_type: { type: ['string', 'null'], maxLength: 100 }, primary_school: { type: ['string', 'null'], maxLength: 200 }, marks_attained_primary: { type: ['string', 'null'], maxLength: 50 }, class_admitted: { type: ['string', 'null'], maxLength: 100 }, stream_admitted: { type: ['string', 'null'], maxLength: 100 }, user_id: { type: ['string', 'null'], ref: 'users', maxLength: 100 }, display_name: { type: ['string', 'null'], maxLength: 200 }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'admission_no', 'first_name', 'last_name', 'gender', 'status', 'created_at', 'updated_at'], ['admission_no', 'current_class_stream_id', 'status']);
const studentGuardianRelationshipSchema: RxJsonSchema<allTypes.StudentGuardianRelationship> = createEntitySchema<allTypes.StudentGuardianRelationship>('student_guardian_relationship', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, guardian_id: { type: 'string', ref: 'parents_guardians' }, is_primary: { type: 'boolean' }, relationship_type: { type: 'string', maxLength: 100 }, can_pickup: { type: 'boolean', default: false }, receives_communication: { type: 'boolean', default: true }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'guardian_id', 'is_primary', 'relationship_type', 'created_at', 'updated_at']);
const staffSchema: RxJsonSchema<allTypes.Staff> = createEntitySchema<allTypes.Staff>('staff', { id: { type: 'string' }, staff_no: { type: 'string', maxLength: 50 }, first_name: { type: 'string', maxLength: 100 }, last_name: { type: 'string', maxLength: 100 }, is_active: { type: 'boolean' }, user_id: { type: ['string', 'null'], ref: 'users' }, phone: { type: ['string', 'null'], maxLength: 50 }, email: { type: ['string', 'null'], format: 'email', maxLength: 255 }, department_id: { type: ['string', 'null'], ref: 'departments' }, designation_id: { type: ['string', 'null'], ref: 'designations' }, hod_of_department_id: { type: ['string', 'null'], ref: 'departments' }, date_of_employment: { type: ['string', 'null'], format: 'date' }, contract_expiry_date: { type: ['string', 'null'], format: 'date' }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, department_name: { type: ['string', 'null'], maxLength: 200 }, designation_title: { type: ['string', 'null'], maxLength: 200 }, hod_of_department_name: { type: ['string', 'null'], maxLength: 200 }, user_username: { type: ['string', 'null'], maxLength: 100 }, display_name: { type: ['string', 'null'], maxLength: 200 }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'staff_no', 'first_name', 'last_name', 'is_active', 'created_at', 'updated_at']);
const departmentSchema: RxJsonSchema<allTypes.Department> = createEntitySchema<allTypes.Department>('department', { id: { type: 'string' }, name: { type: 'string', maxLength: 200 }, is_academic: { type: 'boolean' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'is_academic', 'created_at', 'updated_at']);
const designationSchema: RxJsonSchema<allTypes.Designation> = createEntitySchema<allTypes.Designation>('designation', { id: { type: 'string' }, title: { type: 'string', maxLength: 200 }, description: { type: ['string', 'null'], maxLength: 500 }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'title', 'created_at', 'updated_at']);
const studentCategorySchema: RxJsonSchema<allTypes.StudentCategory> = createEntitySchema<allTypes.StudentCategory>('student_category', { id: { type: 'string' }, name: { type: 'string', maxLength: 200 } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name']);
const dormitorySchema: RxJsonSchema<allTypes.Dormitory> = createEntitySchema<allTypes.Dormitory>('dormitory', { id: { type: 'string' }, name: { type: 'string', maxLength: 200 }, master_id: { type: ['string', 'null'], ref: 'staff' }, capacity: { type: ['number', 'null'] }, master_name: { type: ['string', 'null'], maxLength: 200 }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'created_at', 'updated_at']);
const classStreamItemProperties: RxJsonSchema<Omit<allTypes.ClassStream, 'class_name'|'class_teacher_name'>>['properties'] = { id: { type: 'string', maxLength: 100 }, class_id: { type: 'string', maxLength: 100 }, name: { type: 'string', maxLength: 200 }, class_teacher_id: { type:['string','null'], maxLength: 100 } };
const classSchema: RxJsonSchema<allTypes.Class> = createEntitySchema<allTypes.Class>('class', { id: { type: 'string' }, name: { type: 'string', maxLength: 200 }, streams: { type: ['array', 'null'], default: [], items: { type: 'object', properties: classStreamItemProperties } as RxJsonSchema<any> } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name']);
const classStreamSchema: RxJsonSchema<allTypes.ClassStream> = createEntitySchema<allTypes.ClassStream>('class_stream', { id: { type: 'string' }, class_id: { type: 'string', ref: 'classes' }, name: { type: 'string', maxLength: 200 }, class_teacher_id: { type: ['string', 'null'], ref: 'staff' }, class_name: { type: ['string', 'null'], maxLength: 200 }, class_teacher_name: { type: ['string', 'null'], maxLength: 200 }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'class_id', 'name']);
const studentInvoiceItemSchema: RxJsonSchema<allTypes.FinStudentInvoiceItemType> = createEntitySchema<allTypes.FinStudentInvoiceItemType>('student_invoice_item', { id: { type: 'string' }, invoice_id: { type: 'string', maxLength: 100 }, description: { type: 'string', maxLength: 500 }, amount: { type: 'number' }, fee_template_item_id: {type: ['string', 'null'], maxLength: 100}, student_transport_assignment_id: {type: ['string', 'null'], maxLength: 100}, fine_id: {type: ['string', 'null'], maxLength: 100}}, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'invoice_id', 'description', 'amount']);

// RBAC Schemas
const permissionSchema: RxJsonSchema = createEntitySchema(
  'permission',
  {
    id: { type: 'string' },
    name: { type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 500 },
    resource: { type: 'string', maxLength: 100 },
    action: { type: 'string', maxLength: 100 },
    moduleId: { type: 'string', maxLength: 100 },
    feature: { type: 'string', maxLength: 100 }
  },
  { key: 'id', type: 'string', final: true, maxLength: 100 },
  ['id', 'name', 'resource', 'action', 'moduleId']
);

const rbacRoleSchema: RxJsonSchema = createEntitySchema(
  'rbac_role',
  {
    id: { type: 'string' },
    name: { type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 500 },
    permissions: { type: 'array', items: { type: 'string' } },
    isActive: { type: 'boolean' },
    isSystem: { type: 'boolean' },
    moduleAccess: { type: 'object', additionalProperties: true }
  },
  { key: 'id', type: 'string', final: true, maxLength: 100 },
  ['id', 'name', 'permissions', 'isActive', 'isSystem', 'moduleAccess']
);

const userRoleSchema: RxJsonSchema = createEntitySchema(
  'user_role',
  {
    id: { type: 'string', maxLength: 200 },
    userId: { type: 'string', maxLength: 100 },
    roleId: { type: 'string', maxLength: 100 },
    assignedAt: { type: 'string', maxLength: 50 },
    assignedBy: { type: 'string', maxLength: 100 },
    expiresAt: { type: 'string', maxLength: 50 }
  },
  { key: 'id', type: 'string', final: true, maxLength: 200 },
  ['id', 'userId', 'roleId', 'assignedAt', 'assignedBy'],
  ['userId', 'roleId', 'assignedAt', 'assignedBy']
);

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
  workflow_states: { schema: workflowStateSchema },
  education_system_configurations: { schema: educationSystemConfigurationSchema },
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
  permissions: { schema: permissionSchema },
  rbac_roles: { schema: rbacRoleSchema },
  user_roles: { schema: userRoleSchema },
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
  // RBAC collections
  permissions: RxCollection<any>;
  rbac_roles: RxCollection<any>;
  user_roles: RxCollection<any>;
};

export type SchoolDatabase = RxDatabase<SchoolDatabaseCollections>;

let dbPromise: Promise<SchoolDatabase> | null = null;

export const initializeDatabase = async (): Promise<SchoolDatabase> => {
  console.log("RxDB: Initializing database...");
  
  // Debug module collections before merging
  console.log("RxDB: Checking module collections...");
  console.log("academicsCollections:", academicsCollections);
  console.log("administrationCollections:", administrationCollections);
  console.log("financeCollections:", financeCollections);
  console.log("hrCollections:", hrCollections);
  console.log("inventoryCollections:", inventoryCollections);
  console.log("libraryCollections:", libraryCollections);
  console.log("nutritionCollections:", nutritionCollections);
  
  const db = await createRxDatabase<SchoolDatabaseCollections>({
    name: RXDB_DB_NAME,
    storage: wrappedValidateAjvStorage({
      storage: getRxStorageDexie()
    }),
    multiInstance: !RXDB_LEADER_ELECTION_DISABLED,
  });
  console.log("RxDB: Database created.");
  
  const finalCollectionsDefinition: Record<string, { schema: RxJsonSchema<any>}> = {};
  for (const key in collectionsDefinition) {
    if (Object.prototype.hasOwnProperty.call(collectionsDefinition, key)) {
        const collectionDef = collectionsDefinition[key];
        try {
          console.log(`RxDB: Processing collection: ${key}`);
          if (!collectionDef || !collectionDef.schema) {
            console.error(`RxDB: Collection '${key}' has undefined schema:`, collectionDef);
            throw new Error(`Collection '${key}' has undefined schema`);
          }
          if (!collectionDef.schema.type) {
            console.error(`RxDB: Collection '${key}' schema missing 'type' property:`, collectionDef.schema);
            throw new Error(`Collection '${key}' schema missing 'type' property`);
          }
          finalCollectionsDefinition[key] = { schema: collectionDef.schema };
          console.log(`RxDB: Successfully processed collection: ${key}`);
        } catch (error) {
          console.error(`RxDB: Failed to process collection '${key}':`, error);
          console.error(`RxDB: Collection definition:`, collectionDef);
          throw error;
        }
    }
  }

  try {
    console.log(`RxDB: Adding ${Object.keys(finalCollectionsDefinition).length} collections to database`);
    await db.addCollections(finalCollectionsDefinition);
    console.log(`RxDB: Successfully added all collections`);
  } catch (error) {
    console.error(`RxDB: Failed to add collections to database:`, error);
    throw error;
  }
  console.log("RxDB: Collections added.");
  
  if (typeof window !== 'undefined') {
    (window as any).APP_DB = db;
  }
  return db;
};

export const getDatabase = (): Promise<SchoolDatabase> => {
  if (!dbPromise) {
    dbPromise = initializeDatabase();
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

// Export the rxdbService object after all function declarations
let database: SchoolDatabase | null = null;

export const rxdbService = {
  get collections() {
    if (!database) {
      throw new Error('Database not initialized. Call initializeDatabase first.');
    }
    return database.collections;
  },
  generateId,
  generateNumericId,
  initializeDatabase: async (): Promise<SchoolDatabase> => {
    if (!database) {
      database = await initializeDatabase();
      dbPromise = Promise.resolve(database);
    }
    return database;
  },
  getDatabase: (): Promise<SchoolDatabase> => {
    if (!database) {
      return rxdbService.initializeDatabase();
    }
    return Promise.resolve(database);
  },
  clearDatabase: async (): Promise<void> => {
    if (!database) {
      database = await rxdbService.initializeDatabase();
    }
    return clearDatabase(database);
  },
  getUsingDummyDataFlag: async (): Promise<boolean> => {
    if (!database) {
      database = await rxdbService.initializeDatabase();
    }
    return getUsingDummyDataFlag(database);
  },
  seedDatabaseWithMockData: async (): Promise<void> => {
    try {
      // Import mock data dynamically
      const mockDataModule = await import('../hooks/useModularMockData');
      const mockData = mockDataModule.rawInitialData;
      
      if (!database) {
        database = await rxdbService.initializeDatabase();
      }
      
      if (mockData) {
        return seedDatabaseWithMockData(database, mockData);
      } else {
        console.warn('No mock data available for seeding');
      }
    } catch (error) {
      console.error('Failed to seed database with mock data:', error);
      throw error;
    }
  },
};

// Initialize database on module load with proper error handling
rxdbService.initializeDatabase().catch(error => {
  console.error('RxDB: Failed to initialize database:', error);
  // Don't throw here as it would prevent the module from loading
});

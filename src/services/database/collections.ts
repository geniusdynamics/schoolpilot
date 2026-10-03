// src/services/database/collections.ts
// ABOUTME: Provider-agnostic collection definitions - extracted from rxdbService.ts
// ABOUTME: Supports PouchDB, SQLite, and other providers without RXDB dependency

import { DatabaseSchema, createDatabaseSchema } from '@/utils/databaseAgnosticSchema';
import {
  RXDB_SETTINGS_COLLECTION_NAME,
} from '@/config/unifiedConfig';

// Import module collections
import { academicsCollections } from '@/modules/academics/data/collections';
import { administrationCollections } from '@/modules/administration/data/collections';
import { financeCollections } from '@/modules/finance/data/collections';
import { hrCollections } from '@/modules/hr/data/collections';
import { inventoryCollections } from '@/modules/inventory/data/collections';
import { libraryCollections } from '@/modules/library/data/collections';
import { nutritionCollections } from '@/modules/nutrition/data/collections';
import { housesCollections } from '@/modules/administration/data/houses/collections';
import { pickupCollections } from '@/modules/administration/data/pickup/collections';
import { portalCollections } from '@/modules/portal/data/collections';

// Re-export module types for convenience
export * from './types';

// --- CORE Schema Definitions (Provider-agnostic) ---

const appSettingsSchema: DatabaseSchema = createDatabaseSchema({
  title: RXDB_SETTINGS_COLLECTION_NAME,
  properties: {
    id: { type: 'string', maxLength: 100 },
    using_dummy_data: { type: 'boolean' }
  },
  primaryKey: { key: 'id', type: 'string', final: true, maxLength: 100 },
  required: ['id']
});

const schoolDetailsSchema: DatabaseSchema = createDatabaseSchema({
  title: 'school_details',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    telephone: { type: 'string', maxLength: 50 },
    email: { type: 'string', format: 'email', maxLength: 255 },
    postal_address: { type: 'string', maxLength: 500 },
    town: { type: 'string', maxLength: 100 },
    motto: { type: 'string', maxLength: 500 },
    logo_path: { type: 'string', maxLength: 500 },
    school_gender: { type: 'string', enum: ['Mixed', 'Boys Only', 'Girls Only'] },
    school_type: { type: 'string', enum: ['Public', 'Private', 'International'] },
    head_teacher_name: { type: 'string', maxLength: 200 },
    school_code: { type: 'string', maxLength: 50 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'name', 'created_at', 'updated_at'],
  indexes: ['id', 'name', 'created_at', 'updated_at']
});

const userSchema: DatabaseSchema = createDatabaseSchema({
  title: 'user',
  properties: {
    id: { type: 'string', maxLength: 100 },
    username: { type: 'string', maxLength: 100 },
    hashed_password: { type: 'string', maxLength: 255 },
    password: { type: 'string', maxLength: 255 },
    email: { type: 'string', format: 'email', maxLength: 150 },
    role_id: { type: 'ref', ref: 'roles', maxLength: 100 },
    is_active: { type: 'boolean' },
    last_login_at: { type: 'string', format: 'date-time' },
    deleted_at: { type: 'string', format: 'date-time' },
    role: { type: 'string', maxLength: 100 },
    display_name: { type: 'string', maxLength: 200 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'username', 'email', 'role_id', 'is_active', 'created_at', 'updated_at'],
  indexes: ['username', 'email', 'role_id']
});

const roleSchema: DatabaseSchema = createDatabaseSchema({
  title: 'role',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    permissions: { type: 'array', items: { type: 'string' } },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'name', 'created_at', 'updated_at'],
  indexes: ['name']
});

const academicYearStructureSchema: DatabaseSchema = createDatabaseSchema({
  title: 'academic_year_structure',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 }
  },
  primaryKey: 'id',
  required: ['id', 'name']
});

const academicPeriodDefinitionSchema: DatabaseSchema = createDatabaseSchema({
  title: 'academic_period_definition',
  properties: {
    id: { type: 'string', maxLength: 100 },
    structure_id: { type: 'ref', ref: 'academic_year_structures', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    sequence_order: { type: 'integer', minimum: 0, maximum: 9999 },
    structure_name: { type: 'string', maxLength: 200 }
  },
  primaryKey: 'id',
  required: ['id', 'structure_id', 'name', 'sequence_order'],
  indexes: ['structure_id']
});

const academicYearSchema: DatabaseSchema = createDatabaseSchema({
  title: 'academic_year',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    structure_id: { type: 'ref', ref: 'academic_year_structures', maxLength: 100 },
    start_date: { type: 'string', format: 'date' },
    end_date: { type: 'string', format: 'date' },
    structure_name: { type: 'string', maxLength: 200 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'name', 'structure_id', 'start_date', 'end_date', 'created_at', 'updated_at']
});

const workflowStateProperties = {
  id: { type: 'string', maxLength: 100 },
  workflow_id: { type: 'string', maxLength: 100 },
  name: { type: 'string', maxLength: 200 },
  sequence_order: { type: 'integer', minimum: 0, maximum: 9999 }
};

const workflowSchema: DatabaseSchema = createDatabaseSchema({
  title: 'workflow',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    states: { type: 'array', items: { type: 'object', properties: workflowStateProperties } },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'name', 'created_at', 'updated_at']
});

const workflowStateSchema: DatabaseSchema = createDatabaseSchema({
  title: 'workflow_state',
  properties: {
    id: { type: 'string', maxLength: 100 },
    workflow_id: { type: 'ref', ref: 'workflows', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    sequence_order: { type: 'integer', minimum: 0, maximum: 9999 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'workflow_id', 'name', 'sequence_order', 'created_at', 'updated_at'],
  indexes: ['workflow_id']
});

const educationSystemConfigurationSchema: DatabaseSchema = createDatabaseSchema({
  title: 'education_system_configuration',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 500 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'name', 'created_at', 'updated_at']
});

const auditLogSchema: DatabaseSchema = createDatabaseSchema({
  title: 'audit_log',
  properties: {
    id: { type: 'string', maxLength: 100 },
    user_id: { type: 'ref', ref: 'users', maxLength: 100 },
    user_name: { type: 'string', maxLength: 200 },
    action: { type: 'string', enum: ['INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE'] },
    table_name: { type: 'string', maxLength: 100 },
    record_pk: { type: 'string', maxLength: 100 },
    old_data: { type: 'object' },
    new_data: { type: 'object' },
    changed_at: { type: 'string', format: 'date-time' },
    ip_address: { type: 'string', maxLength: 45 },
    user_agent: { type: 'string', maxLength: 500 }
  },
  primaryKey: 'id',
  required: ['id', 'action', 'changed_at']
});

const parentGuardianSchemaProperties = {
  id: { type: 'string', maxLength: 100 },
  name: { type: 'string', maxLength: 200 },
  phone: { type: 'string', maxLength: 50 },
  user_id: { type: 'string', nullable: true, maxLength: 100 },
  email: { type: 'string', nullable: true, maxLength: 255 },
  relationship_type: { type: 'string', nullable: true, maxLength: 100 },
  location: { type: 'string', nullable: true, maxLength: 200 },
  address: { type: 'string', nullable: true, maxLength: 500 },
  photo_path: { type: 'string', nullable: true, maxLength: 500 },
  deleted_at: { type: 'string', nullable: true, maxLength: 50 },
  created_at: { type: 'string', maxLength: 50 },
  updated_at: { type: 'string', maxLength: 50 }
};

const parentGuardianSchema: DatabaseSchema = createDatabaseSchema({
  title: 'parents_guardian',
  properties: parentGuardianSchemaProperties,
  primaryKey: 'id',
  required: ['id', 'name', 'phone', 'created_at', 'updated_at']
});

const examResultSummaryProperties = {
  exam_name: { type: 'string', nullable: true, maxLength: 200 },
  english: { type: 'string', nullable: true, maxLength: 10 },
  kiswahili: { type: 'string', nullable: true, maxLength: 10 },
  mathematics: { type: 'string', nullable: true, maxLength: 10 },
  science: { type: 'string', nullable: true, maxLength: 10 },
  social_studies_religious_education: { type: 'string', nullable: true, maxLength: 10 },
  total_marks: { type: 'number', nullable: true }
};

const studentSchema: DatabaseSchema = createDatabaseSchema({
  title: 'student',
  properties: {
    id: { type: 'string', maxLength: 100 },
    admission_no: { type: 'string', maxLength: 50 },
    upi_no: { type: 'string', maxLength: 50 },
    first_name: { type: 'string', maxLength: 100 },
    middle_name: { type: 'string', maxLength: 100 },
    last_name: { type: 'string', maxLength: 100 },
    gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
    date_of_birth: { type: 'string', format: 'date' },
    photo_path: { type: 'string', maxLength: 500 },
    current_class_stream_id: { type: 'ref', ref: 'class_streams', maxLength: 100 },
    student_category_id: { type: 'ref', ref: 'student_categories', maxLength: 100 },
    dormitory_id: { type: 'ref', ref: 'dormitories', maxLength: 100 },
    admission_date: { type: 'string', format: 'date' },
    status: { type: 'string', enum: ['Active', 'Alumni', 'Transferred', 'Suspended', 'Expelled', 'Withdrawn'] },
    deleted_at: { type: 'string', format: 'date-time' },
    current_class_name: { type: 'string', maxLength: 200 },
    current_class_stream_name: { type: 'string', maxLength: 200 },
    student_category_name: { type: 'string', maxLength: 200 },
    dormitory_name: { type: 'string', maxLength: 200 },
    primary_guardian: { type: 'object', properties: parentGuardianSchemaProperties },
    exam_result_summary: { type: 'object', properties: examResultSummaryProperties },
    email: { type: 'string', format: 'email', maxLength: 255 },
    phone: { type: 'string', maxLength: 50 },
    address: { type: 'string', maxLength: 500 },
    remarks: { type: 'string', maxLength: 1000 },
    religion: { type: 'string', maxLength: 100 },
    county: { type: 'string', maxLength: 100 },
    district: { type: 'string', maxLength: 100 },
    student_type: { type: 'string', maxLength: 100 },
    primary_school: { type: 'string', maxLength: 200 },
    marks_attained_primary: { type: 'string', maxLength: 50 },
    class_admitted: { type: 'string', maxLength: 100 },
    stream_admitted: { type: 'string', maxLength: 100 },
    user_id: { type: 'ref', ref: 'users', maxLength: 100 },
    display_name: { type: 'string', maxLength: 200 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'admission_no', 'first_name', 'last_name', 'gender', 'status', 'created_at', 'updated_at'],
  indexes: ['admission_no', 'current_class_stream_id', 'status']
});

const studentGuardianRelationshipSchema: DatabaseSchema = createDatabaseSchema({
  title: 'student_guardian_relationship',
  properties: {
    id: { type: 'string', maxLength: 100 },
    student_id: { type: 'ref', ref: 'students', maxLength: 100 },
    guardian_id: { type: 'ref', ref: 'parents_guardians', maxLength: 100 },
    is_primary: { type: 'boolean' },
    relationship_type: { type: 'string', maxLength: 100 },
    can_pickup: { type: 'boolean', default: false },
    receives_communication: { type: 'boolean', default: true },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'student_id', 'guardian_id', 'is_primary', 'relationship_type', 'created_at', 'updated_at']
});

const staffSchema: DatabaseSchema = createDatabaseSchema({
  title: 'staff',
  properties: {
    id: { type: 'string', maxLength: 100 },
    staff_no: { type: 'string', maxLength: 50 },
    first_name: { type: 'string', maxLength: 100 },
    last_name: { type: 'string', maxLength: 100 },
    is_active: { type: 'boolean' },
    user_id: { type: 'ref', ref: 'users', maxLength: 100 },
    phone: { type: 'string', maxLength: 50 },
    email: { type: 'string', format: 'email', maxLength: 255 },
    department_id: { type: 'ref', ref: 'departments', maxLength: 100 },
    designation_id: { type: 'ref', ref: 'designations', maxLength: 100 },
    hod_of_department_id: { type: 'ref', ref: 'departments', maxLength: 100 },
    date_of_employment: { type: 'string', format: 'date' },
    contract_expiry_date: { type: 'string', format: 'date' },
    deleted_at: { type: 'string', format: 'date-time' },
    department_name: { type: 'string', maxLength: 200 },
    designation_title: { type: 'string', maxLength: 200 },
    hod_of_department_name: { type: 'string', maxLength: 200 },
    user_username: { type: 'string', maxLength: 100 },
    display_name: { type: 'string', maxLength: 200 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'staff_no', 'first_name', 'last_name', 'is_active', 'created_at', 'updated_at']
});

const departmentSchema: DatabaseSchema = createDatabaseSchema({
  title: 'department',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    is_academic: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'name', 'is_academic', 'created_at', 'updated_at']
});

const designationSchema: DatabaseSchema = createDatabaseSchema({
  title: 'designation',
  properties: {
    id: { type: 'string', maxLength: 100 },
    title: { type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 500 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'title', 'created_at', 'updated_at']
});

const studentCategorySchema: DatabaseSchema = createDatabaseSchema({
  title: 'student_category',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 }
  },
  primaryKey: 'id',
  required: ['id', 'name']
});

const dormitorySchema: DatabaseSchema = createDatabaseSchema({
  title: 'dormitory',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    master_id: { type: 'ref', ref: 'staff', maxLength: 100 },
    capacity: { type: 'integer' },
    master_name: { type: 'string', maxLength: 200 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'name', 'created_at', 'updated_at']
});

const classStreamItemProperties = {
  id: { type: 'string', maxLength: 100 },
  class_id: { type: 'string', maxLength: 100 },
  name: { type: 'string', maxLength: 200 },
  class_teacher_id: { type: 'string', maxLength: 100 }
};

const classSchema: DatabaseSchema = createDatabaseSchema({
  title: 'class',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    streams: { type: 'array', items: { type: 'object', properties: classStreamItemProperties } }
  },
  primaryKey: 'id',
  required: ['id', 'name']
});

const classStreamSchema: DatabaseSchema = createDatabaseSchema({
  title: 'class_stream',
  properties: {
    id: { type: 'string', maxLength: 100 },
    class_id: { type: 'ref', ref: 'classes', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    class_teacher_id: { type: 'ref', ref: 'staff', maxLength: 100 },
    class_name: { type: 'string', maxLength: 200 },
    class_teacher_name: { type: 'string', maxLength: 200 }
  },
  primaryKey: 'id',
  required: ['id', 'class_id', 'name']
});

const studentInvoiceItemSchema: DatabaseSchema = createDatabaseSchema({
  title: 'student_invoice_item',
  properties: {
    id: { type: 'string', maxLength: 100 },
    invoice_id: { type: 'string', maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    amount: { type: 'number', minimum: 0, maximum: 999999.99 },
    fee_template_item_id: { type: 'string', maxLength: 100 },
    student_transport_assignment_id: { type: 'string', maxLength: 100 },
    fine_id: { type: 'string', maxLength: 100 }
  },
  primaryKey: 'id',
  required: ['id', 'invoice_id', 'description', 'amount']
});

// RBAC Schemas
const permissionSchema: DatabaseSchema = createDatabaseSchema({
  title: 'permission',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    resource: { type: 'string', maxLength: 100 },
    action: { type: 'string', maxLength: 100 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'name', 'resource', 'action', 'created_at', 'updated_at']
});

const rbacRoleSchema: DatabaseSchema = createDatabaseSchema({
  title: 'rbac_role',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'name', 'created_at', 'updated_at']
});

const userRoleSchema: DatabaseSchema = createDatabaseSchema({
  title: 'user_role',
  properties: {
    id: { type: 'string', maxLength: 100 },
    user_id: { type: 'ref', ref: 'users', maxLength: 100 },
    role_id: { type: 'ref', ref: 'rbac_roles', maxLength: 100 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'user_id', 'role_id', 'created_at', 'updated_at']
});

// --- Master Collections Definition (Provider-agnostic) ---
export const collectionsDefinition: Record<string, { schema: DatabaseSchema }> = {
  // Core Collections (24 total)
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
  permissions: { schema: permissionSchema },
  rbac_roles: { schema: rbacRoleSchema },
  user_roles: { schema: userRoleSchema },

  // Module Collections (64 total) - All enabled with PouchDB
  // Academics Collections
  ...academicsCollections,

  // Administration Collections  
  ...administrationCollections,

  // Finance Collections
  ...financeCollections,

  // HR Collections
  ...hrCollections,

  // Inventory Collections
  ...inventoryCollections,

  // Library Collections
  ...libraryCollections,

  // Nutrition Collections
  ...nutritionCollections,

  // New Module Collections
  ...housesCollections,
  ...pickupCollections,
  ...portalCollections,
};

// ID Generation utilities (moved from rxdbService.ts)
export const generateId = (): string => crypto.randomUUID();

let numericIdCounter = Date.now();
export const generateNumericId = (): number => ++numericIdCounter;

// Export collection names for convenience
export const collectionNames = Object.keys(collectionsDefinition);

// Export core collection names
export const coreCollectionNames = [
  'app_settings',
  'school_details',
  'users',
  'roles',
  'academic_year_structures',
  'academic_period_definitions',
  'academic_years',
  'workflows',
  'workflow_states',
  'education_system_configurations',
  'audit_logs',
  'parents_guardians',
  'students',
  'student_guardian_relationships',
  'staff',
  'departments',
  'designations',
  'student_categories',
  'dormitories',
  'classes',
  'class_streams',
  'student_invoice_items',
  'permissions',
  'rbac_roles',
  'user_roles',
];

// Constants re-exported for compatibility
export {
  RXDB_SETTINGS_COLLECTION_NAME,
  RXDB_DUMMY_DATA_FLAG_ID,
} from '@/config/unifiedConfig';

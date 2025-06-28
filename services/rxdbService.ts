
// services/rxdbService.ts
import {
  createRxDatabase, addRxPlugin, RxDatabase, RxCollection, RxJsonSchema, toTypedRxJsonSchema, PrimaryKey
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/dexie';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

import * as allTypes from '../types';
import { RXDB_DB_NAME, RXDB_LEADER_ELECTION_DISABLED, APP_MODE, RXDB_SETTINGS_COLLECTION_NAME, RXDB_DUMMY_DATA_FLAG_ID } from '../config';
// RawInitialData is now passed as a parameter to seedDatabaseWithMockData

console.log('rxdbService.ts: Script loaded. Attempting RxDB setup.');

addRxPlugin(RxDBMigrationPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
  if (!RXDB_LEADER_ELECTION_DISABLED) {
    addRxPlugin(RxDBLeaderElectionPlugin);
  }
}

// --- Helper to create schemas ---
const createEntitySchema = <T extends { [key: string]: any }>(
  title: string,
  propertiesInput: RxJsonSchema<T>['properties'], 
  primaryKeyDefinition: { key: Extract<keyof T, string>; type: 'string' | 'number'; final?: boolean; maxLength?: number },
  requiredFields: ReadonlyArray<Extract<keyof T, string>>,
  indexes?: ReadonlyArray<Extract<keyof T, string>> | ReadonlyArray<ReadonlyArray<Extract<keyof T, string>>> 
): RxJsonSchema<T> => {
  const properties = { ...propertiesInput } as RxJsonSchema<T>['properties'];
  const pkName = primaryKeyDefinition.key;
  
  properties[pkName] = {
    type: primaryKeyDefinition.type,
    ...(primaryKeyDefinition.type === 'string' && primaryKeyDefinition.final !== undefined && { final: primaryKeyDefinition.final }),
    ...(primaryKeyDefinition.maxLength !== undefined && { maxLength: primaryKeyDefinition.maxLength }), 
    ...(properties[pkName] || {}), 
  } as any;

  // RxJsonSchema's primaryKey is `keyof DocType | CompositePrimaryKey<DocType>`
  // pkName is `Extract<keyof T, string>`, which is compatible with `keyof T`
  const schemaDefinitionInternal = { 
    title: `${title} schema`,
    version: 0,
    primaryKey: pkName as keyof T, // Use 'keyof T' which is valid for single field primary keys
    type: 'object' as const, // Ensure type is 'object' literal for stricter checking by toTypedRxJsonSchema
    properties,
    required: [...requiredFields] as (Extract<keyof T, string>)[],
    indexes: indexes ? (
        typeof (indexes as any)[0] === 'string' 
            ? [...(indexes as ReadonlyArray<string>)] as Extract<keyof T, string>[]
            : (indexes as ReadonlyArray<ReadonlyArray<string>>).map(idx => [...idx]) as Extract<keyof T, string>[][]
      ) : []
  };
  
  // Using 'as any' temporarily if toTypedRxJsonSchema is overly strict with deep generics.
  // Or ensure schemaDefinitionInternal strictly matches what toTypedRxJsonSchema expects.
  return toTypedRxJsonSchema(schemaDefinitionInternal as any); 
};

// --- ALL Schema Definitions (Using createEntitySchema where appropriate) ---

const appSettingsSchema: RxJsonSchema<allTypes.AppSetting> = createEntitySchema<allTypes.AppSetting>( RXDB_SETTINGS_COLLECTION_NAME, { id: { type: 'string' }, using_dummy_data: { type: 'boolean' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id']);
const schoolDetailsSchema: RxJsonSchema<allTypes.SchoolDetails> = createEntitySchema<allTypes.SchoolDetails>('school_details', { id: { type: 'number' }, name: { type: 'string', maxLength: 200 }, telephone: { type: ['string', 'null'] }, email: { type: ['string', 'null'], format: 'email' }, postal_address: { type: ['string', 'null'] }, town: { type: ['string', 'null'] }, motto: { type: ['string', 'null'] }, logo_path: { type: ['string', 'null'] }, school_gender: { type: ['string', 'null'], enum: ['Mixed', 'Boys Only', 'Girls Only', null] }, school_type: { type: ['string', 'null'], enum: ['Public', 'Private', 'International', null] }, head_teacher_name: { type: ['string', 'null'] }, school_code: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id','name', 'created_at', 'updated_at']);
const userSchema: RxJsonSchema<allTypes.User> = createEntitySchema<allTypes.User>('user', { id: { type: 'string' }, username: { type: 'string', maxLength: 100 }, hashed_password: { type: ['string', 'null'] }, password: { type: ['string', 'null'] }, email: { type: 'string', format: 'email', maxLength: 150 }, user_type: { type: 'string', enum: Object.values(allTypes.UserType) }, is_active: { type: 'boolean' }, last_login_at: { type: ['string', 'null'], format: 'date-time' }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, role_id: { type: ['number', 'null'], ref: 'roles' }, role: { type: ['string', 'null'] }, display_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'username', 'email', 'user_type', 'is_active', 'created_at', 'updated_at'], ['username', 'email', 'user_type', 'role_id']);
const roleSchema: RxJsonSchema<allTypes.Role> = createEntitySchema<allTypes.Role>('role', { id: { type: 'number' }, name: { type: 'string', maxLength: 100 }, description: { type: ['string', 'null'] }, permissions: { type: ['array', 'null'], items: { type: 'string' } },  created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at'], ['name']);
const academicYearStructureSchema: RxJsonSchema<allTypes.AcademicYearStructure> = createEntitySchema<allTypes.AcademicYearStructure>('academic_year_structure', { id: { type: 'number' }, name: { type: 'string' } }, { key: 'id', type: 'number' }, ['id','name']);
const academicPeriodDefinitionSchema: RxJsonSchema<allTypes.AcademicPeriodDefinition> = createEntitySchema<allTypes.AcademicPeriodDefinition>('academic_period_definition', { id: { type: 'number' }, structure_id: { type: 'number', ref: 'academic_year_structures' }, name: { type: 'string' }, sequence_order: { type: 'number' }, structure_name: { type: ['string', 'null'] } }, { key: 'id', type: 'number' }, ['id', 'structure_id', 'name', 'sequence_order'], ['structure_id']);
const academicYearSchema: RxJsonSchema<allTypes.AcademicYear> = createEntitySchema<allTypes.AcademicYear>('academic_year', { id: { type: 'number' }, name: { type: 'string' }, structure_id: { type: 'number', ref: 'academic_year_structures' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' }, structure_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'structure_id', 'start_date', 'end_date', 'created_at', 'updated_at']);
const financialYearSchema: RxJsonSchema<allTypes.FinancialYear> = createEntitySchema<allTypes.FinancialYear>('financial_year', { id: { type: 'number' }, name: { type: 'string' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' }, status: { type: 'string', enum: Object.values(allTypes.FinancialYearStatus) }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'start_date', 'end_date', 'status', 'created_at', 'updated_at']);
const schoolPeriodSchema: RxJsonSchema<allTypes.SchoolPeriod> = createEntitySchema<allTypes.SchoolPeriod>('school_period', { id: { type: 'number' }, academic_year_id: { type: 'number', ref: 'academic_years' }, period_definition_id: { type: 'number', ref: 'academic_period_definitions' }, financial_year_id: { type: 'number', ref: 'financial_years' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' }, is_active: { type: 'boolean' }, mid_break_start: { type: ['string', 'null'], format: 'date' }, mid_break_end: { type: ['string', 'null'], format: 'date' }, name: { type: ['string', 'null'] }, academic_year_name: { type: ['string', 'null'] }, period_definition_name: { type: ['string', 'null'] }, financial_year_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'academic_year_id', 'period_definition_id', 'financial_year_id', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at']);
const workflowStateProperties: RxJsonSchema<allTypes.WorkflowState>['properties'] = { id: { type: 'number' }, workflow_id: { type: 'number' }, name: { type: 'string' }, sequence_order: { type: 'number' } };
const workflowSchema: RxJsonSchema<allTypes.Workflow> = createEntitySchema<allTypes.Workflow>('workflow', { id: { type: 'number' }, name: { type: 'string' }, states: { type: 'array', items: { type: 'object', properties: workflowStateProperties } }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const auditLogSchema: RxJsonSchema<allTypes.AuditLog> = createEntitySchema<allTypes.AuditLog>('audit_log', { id: { type: 'string' }, user_id: { type: ['string', 'null'], ref: 'users' }, user_name: { type: ['string', 'null'] }, action: { type: 'string', enum: Object.values(allTypes.AuditAction) }, table_name: { type: ['string', 'null'] }, record_pk: { type: ['string', 'null'] }, old_data: { type: ['object', 'null'], additionalProperties: true }, new_data: { type: ['object', 'null'], additionalProperties: true }, changed_at: { type: 'string', format: 'date-time' }, ip_address: { type: ['string', 'null'] }, user_agent: { type: ['string', 'null'] } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'action', 'changed_at']);
const parentGuardianSchema: RxJsonSchema<allTypes.ParentGuardian> = createEntitySchema<allTypes.ParentGuardian>('parents_guardian', { id: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' }, user_id: { type: ['string', 'null'], ref: 'users' }, email: { type: ['string', 'null'], format: 'email' }, relationship_type: { type: ['string', 'null'] }, location: { type: ['string', 'null'] }, address: { type: ['string', 'null'] }, photo_path: { type: ['string', 'null'] }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'phone', 'created_at', 'updated_at']);
const examResultSummaryProperties: RxJsonSchema<allTypes.ExamResultSummary>['properties'] = { exam_name: { type: ['string', 'null'] }, english: { type: ['string', 'null'] }, kiswahili: { type: ['string', 'null'] }, mathematics: { type: ['string', 'null'] }, science: { type: ['string', 'null'] }, social_studies_religious_education: { type: ['string', 'null'] }, total_marks: { type: ['number', 'null'] } };
const studentSchema: RxJsonSchema<allTypes.Student> = createEntitySchema<allTypes.Student>('student', { id: { type: 'string' }, admission_no: { type: 'string', maxLength: 50 }, upi_no: { type: ['string', 'null'], maxLength: 50 }, first_name: { type: 'string' }, middle_name: { type: ['string', 'null'] }, last_name: { type: 'string' }, gender: { type: 'string', enum: Object.values(allTypes.PersonGender) }, date_of_birth: { type: ['string', 'null'], format: 'date' }, photo_path: { type: ['string', 'null'] }, current_class_stream_id: { type: ['number', 'null'], ref: 'class_streams' }, student_category_id: { type: ['number', 'null'], ref: 'student_categories' }, dormitory_id: { type: ['number', 'null'], ref: 'dormitories' }, admission_date: { type: ['string', 'null'], format: 'date' }, status: { type: 'string', enum: Object.values(allTypes.StudentStatus) }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, current_class_name: { type: ['string', 'null'] }, current_class_stream_name: { type: ['string', 'null'] }, student_category_name: { type: ['string', 'null'] }, dormitory_name: { type: ['string', 'null'] }, primary_guardian: { type: ['object', 'null'], properties: { id: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' }, relationship_type: { type: ['string', 'null'] }, created_at: { type: 'string' }, updated_at: { type: 'string' } } as RxJsonSchema<allTypes.ParentGuardian>['properties'] }, exam_result_summary: { type: ['object', 'null'], properties: examResultSummaryProperties }, email: { type: ['string', 'null'], format: 'email' }, phone: { type: ['string', 'null'] }, address: { type: ['string', 'null'] }, remarks: { type: ['string', 'null'] }, religion: { type: ['string', 'null'] }, county: { type: ['string', 'null'] }, district: { type: ['string', 'null'] }, student_type: { type: ['string', 'null'] }, primary_school: { type: ['string', 'null'] }, marks_attained_primary: { type: ['string', 'null'] }, class_admitted: { type: ['string', 'null'] }, stream_admitted: { type: ['string', 'null'] }, user_id: { type: ['string', 'null'], ref: 'users' }, display_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'admission_no', 'first_name', 'last_name', 'gender', 'status', 'created_at', 'updated_at'], ['admission_no', 'current_class_stream_id', 'status']);
const studentGuardianRelationshipSchema: RxJsonSchema<allTypes.StudentGuardianRelationship> = createEntitySchema<allTypes.StudentGuardianRelationship>('student_guardian_relationship', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, guardian_id: { type: 'string', ref: 'parents_guardians' }, is_primary: { type: 'boolean' }, relationship_type: { type: 'string' }, can_pickup: { type: 'boolean', default: false }, receives_communication: { type: 'boolean', default: true }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'guardian_id', 'is_primary', 'relationship_type', 'created_at', 'updated_at']);
const staffSchema: RxJsonSchema<allTypes.Staff> = createEntitySchema<allTypes.Staff>('staff', { id: { type: 'string' }, staff_no: { type: 'string' }, first_name: { type: 'string' }, last_name: { type: 'string' }, is_active: { type: 'boolean' }, user_id: { type: ['string', 'null'], ref: 'users' }, phone: { type: ['string', 'null'] }, email: { type: ['string', 'null'], format: 'email' }, department_id: { type: ['number', 'null'], ref: 'departments' }, designation_id: { type: ['number', 'null'], ref: 'designations' }, hod_of_department_id: { type: ['number', 'null'], ref: 'departments' }, date_of_employment: { type: ['string', 'null'], format: 'date' }, contract_expiry_date: { type: ['string', 'null'], format: 'date' }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, department_name: { type: ['string', 'null'] }, designation_title: { type: ['string', 'null'] }, hod_of_department_name: { type: ['string', 'null'] }, user_username: { type: ['string', 'null'] }, display_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'staff_no', 'first_name', 'last_name', 'is_active', 'created_at', 'updated_at']);
const departmentSchema: RxJsonSchema<allTypes.Department> = createEntitySchema<allTypes.Department>('department', { id: { type: 'number' }, name: { type: 'string' }, is_academic: { type: 'boolean' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'is_academic', 'created_at', 'updated_at']);
const designationSchema: RxJsonSchema<allTypes.Designation> = createEntitySchema<allTypes.Designation>('designation', { id: { type: 'number' }, title: { type: 'string' }, description: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'title', 'created_at', 'updated_at']);
const studentCategorySchema: RxJsonSchema<allTypes.StudentCategory> = createEntitySchema<allTypes.StudentCategory>('student_category', { id: { type: 'number' }, name: { type: 'string' } }, { key: 'id', type: 'number' }, ['id', 'name']);
const dormitorySchema: RxJsonSchema<allTypes.Dormitory> = createEntitySchema<allTypes.Dormitory>('dormitory', { id: { type: 'number' }, name: { type: 'string' }, master_id: { type: ['string', 'null'], ref: 'staff' }, capacity: { type: ['number', 'null'] }, master_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const classSchema: RxJsonSchema<allTypes.Class> = createEntitySchema<allTypes.Class>('class', { id: { type: 'number' }, name: { type: 'string' }, streams: { type: ['array', 'null'], default: [], items: { type: 'object', properties: createEntitySchema<Omit<allTypes.ClassStream, 'class_name'|'class_teacher_name'>>('nested_stream', {id:{type:'number'}, class_id:{type:'number'}, name:{type:'string'}, class_teacher_id:{type:['string','null']}}, {key:'id',type:'number'},['id','name']).properties } } }, { key: 'id', type: 'number' }, ['id', 'name']);
const classStreamSchema: RxJsonSchema<allTypes.ClassStream> = createEntitySchema<allTypes.ClassStream>('class_stream', { id: { type: 'number' }, class_id: { type: 'number', ref: 'classes' }, name: { type: 'string' }, class_teacher_id: { type: ['string', 'null'], ref: 'staff' }, class_name: { type: ['string', 'null'] }, class_teacher_name: { type: ['string', 'null'] }, }, { key: 'id', type: 'number' }, ['id', 'class_id', 'name']);
const partnerSchema: RxJsonSchema<allTypes.Partner> = createEntitySchema<allTypes.Partner>('partner', { id: { type: 'string' }, name: { type: 'string' }, partner_type: { type: 'string', enum: Object.values(allTypes.PartnerType) }, contact_person: { type: ['string', 'null'] }, email: { type: ['string', 'null'], format: 'email' }, phone: { type: ['string', 'null'] }, address: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'partner_type', 'created_at', 'updated_at']);
const clubAndSocietySchema: RxJsonSchema<allTypes.ClubAndSociety> = createEntitySchema<allTypes.ClubAndSociety>('club', { id: { type: 'number' }, name: { type: 'string' }, type: { type: 'string', enum: Object.values(allTypes.ClubType) }, patron_id: { type: ['string', 'null'], ref: 'staff' }, description: { type: ['string', 'null'] }, patron_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'type', 'created_at', 'updated_at']);
const customerSchema: RxJsonSchema<allTypes.Customer> = createEntitySchema<allTypes.Customer>('customer', { id: { type: 'number' }, name: { type: 'string' }, phone: { type: ['string', 'null'] }, email: { type: ['string', 'null'], format: 'email' }, address: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const studentHealthRecordSchema: RxJsonSchema<allTypes.StudentHealthRecord> = createEntitySchema<allTypes.StudentHealthRecord>('student_health_record', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, blood_type: { type: ['string', 'null'] }, allergies: { type: ['string', 'null'] }, medical_conditions: { type: ['string', 'null'] }, emergency_contact_override: { type: ['string', 'null'] }, student_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'created_at', 'updated_at']);
const studentAttendanceSchema: RxJsonSchema<allTypes.StudentAttendance> = createEntitySchema<allTypes.StudentAttendance>('student_attendance', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, period_id: { type: 'number', ref: 'timetable_period_definitions' }, date: { type: 'string', format: 'date' }, status: { type: 'string', enum: Object.values(allTypes.AttendanceStatus) }, reason_for_absence: { type: ['string', 'null'] }, student_name: { type: ['string', 'null'] }, period_name: { type: ['string', 'null'] }, created_at: { type: ['string', 'null'], format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'period_id', 'date', 'status']);
const timetablePeriodDefSchema: RxJsonSchema<allTypes.TimetablePeriodDef> = createEntitySchema<allTypes.TimetablePeriodDef>('timetable_period_definition', { id: { type: 'number' }, period_name: { type: 'string' }, start_time: { type: 'string' }, end_time: { type: 'string' }, is_teaching_period: { type: 'boolean', default: true } }, { key: 'id', type: 'number' }, ['id', 'period_name', 'start_time', 'end_time']);
const templateCommSchema: RxJsonSchema<allTypes.TemplateComm> = createEntitySchema<allTypes.TemplateComm>('communication_template', { id: { type: 'number' }, name: { type: 'string' }, type: { type: 'string', enum: Object.values(allTypes.TemplateType) }, subject: { type: ['string', 'null'] }, body_template: { type: 'string' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'type', 'body_template', 'created_at', 'updated_at']);
const campaignSchema: RxJsonSchema<allTypes.Campaign> = createEntitySchema<allTypes.Campaign>('message_campaign', { id: { type: 'string' }, name: { type: 'string' }, template_id: { type: ['number', 'null'], ref: 'communication_templates' }, subject: { type: ['string', 'null'] }, body: { type: ['string', 'null'] }, status: { type: 'string', enum: Object.values(allTypes.CampaignStatus) }, target_audience_type: { type: ['string', 'null'], enum: Object.values(allTypes.CampaignAudienceType) }, target_id: { type: ['string', 'null'] }, scheduled_for: { type: ['string', 'null'], format: 'date-time' }, sent_at: { type: ['string', 'null'], format: 'date-time' }, created_by: { type: 'string', ref: 'users' }, approved_by: { type: ['string', 'null'], ref: 'users' }, template_name: { type: ['string', 'null'] }, created_by_name: { type: ['string', 'null'] }, approved_by_name: { type: ['string', 'null'] }, target_audience_display: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'status', 'created_by', 'created_at', 'updated_at']);
const subjectPaperProperties: RxJsonSchema<allTypes.SubjectPaper>['properties'] = { id: { type: 'number' }, subject_id: { type: 'number' }, name: { type: 'string' }, subject_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, };
const subjectSchema: RxJsonSchema<allTypes.Subject> = createEntitySchema<allTypes.Subject>('subject', { id: { type: 'number' }, subject_code: { type: 'string' }, abbreviation: { type: 'string' }, name: { type: 'string' }, department_id: { type: ['number', 'null'], ref: 'departments' }, is_compulsory: { type: 'boolean', default: false }, grouping: { type: 'string', enum: Object.values(allTypes.SubjectGrouping) }, department_name: { type: ['string', 'null'] }, papers: { type: ['array', 'null'], default: [], items: { type: 'object', properties: subjectPaperProperties } }, }, { key: 'id', type: 'number' }, ['id', 'subject_code', 'name']);
const subjectPaperSchema: RxJsonSchema<allTypes.SubjectPaper> = createEntitySchema<allTypes.SubjectPaper>('subject_paper', subjectPaperProperties, { key: 'id', type: 'number' }, ['id', 'subject_id', 'name', 'created_at', 'updated_at']);
const examPaperSettingProperties: RxJsonSchema<allTypes.ExamPaperSetting>['properties'] = { id: { type: 'string' }, exam_session_id: { type: 'string' }, subject_paper_id: { type: 'number' }, marks_out_of: { type: 'number' }, weight_percentage: { type: 'number' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, subject_paper_name: { type: ['string', 'null'] }, subject_name: { type: ['string', 'null'] }, };
const examSessionSchema: RxJsonSchema<allTypes.ExamSession> = createEntitySchema<allTypes.ExamSession>('exam_session', { id: { type: 'string' }, name: { type: 'string' }, school_period_id: { type: 'number', ref: 'school_periods' }, status: { type: 'string', enum: Object.values(allTypes.ExamSessionStatus) }, result_publication_date: { type: ['string', 'null'], format: 'date-time' }, school_period_name: { type: ['string', 'null'] }, paper_settings: { type: ['array', 'null'], default: [], items: { type: 'object', properties: examPaperSettingProperties } }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'school_period_id', 'status', 'created_at', 'updated_at']);
const gradingSchemeLevelProperties: RxJsonSchema<allTypes.GradingSchemeLevel>['properties'] = { id: { type: 'number' }, scheme_id: { type: 'number' }, grade: { type: 'string' }, min_score: { type: 'number' }, max_score: { type: ['number', 'null'] }, points: { type: ['number', 'null'] }, comment: { type: ['string', 'null'] } };
const gradingSchemeSchema: RxJsonSchema<allTypes.GradingScheme> = createEntitySchema<allTypes.GradingScheme>('grading_scheme', { id: { type: 'number' }, name: { type: 'string' }, is_default: { type: 'boolean' }, levels: { type: 'array', items: { type: 'object', properties: gradingSchemeLevelProperties } }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'number' }, ['id', 'name', 'is_default', 'created_at', 'updated_at']);
const studentPaperMarkProperties: RxJsonSchema<allTypes.StudentPaperMarkWithDetails>['properties'] = { id: { type: 'string' }, student_exam_result_id: { type: 'string' }, paper_setting_id: { type: 'string' }, score: { type: ['number', 'null'] }, subject_paper_name: { type: ['string', 'null'] }, subject_name: { type: ['string', 'null'] }, marks_out_of: { type: ['number', 'null'] }, };
const studentExamResultSchema: RxJsonSchema<allTypes.StudentExamResultWithDetails> = createEntitySchema<allTypes.StudentExamResultWithDetails>('student_exam_result', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, exam_session_id: { type: 'string', ref: 'exam_sessions' }, total_marks: { type: ['number', 'null'] }, mean_grade: { type: ['string', 'null'] }, class_rank: { type: ['number', 'null'] }, stream_rank: { type: ['number', 'null'] }, overall_comment: { type: ['string', 'null'] }, marks: { type: ['array', 'null'], default: [], items: { type: 'object', properties: studentPaperMarkProperties } }, student_name: { type: ['string', 'null'] }, admission_no: { type: ['string', 'null'] }, class_name: { type: ['string', 'null'] }, stream_name: { type: ['string', 'null'] }, exam_session_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'exam_session_id', 'created_at', 'updated_at']);
const classSubjectAllocationSchema: RxJsonSchema<allTypes.ClassSubjectAllocation> = createEntitySchema<allTypes.ClassSubjectAllocation>('class_subject_allocation', { id: { type: 'string' }, class_stream_id: { type: 'number', ref: 'class_streams' }, subject_id: { type: 'number', ref: 'subjects' }, academic_year_id: { type: 'number', ref: 'academic_years' }, class_stream_name: { type: ['string', 'null'] }, subject_name: { type: ['string', 'null'] }, academic_year_name: { type: ['string', 'null'] }, is_enrolled: { type: 'boolean', default: true } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'class_stream_id', 'subject_id', 'academic_year_id']);
const teacherSubjectAssignmentSchema: RxJsonSchema<allTypes.TeacherSubjectAssignment> = createEntitySchema<allTypes.TeacherSubjectAssignment>('teacher_subject_assignment', { id: { type: 'string' }, allocation_id: { type: 'string', ref: 'class_subject_allocations' }, teacher_id: { type: 'string', ref: 'staff' }, class_stream_name: { type: ['string', 'null'] }, subject_name: { type: ['string', 'null'] }, academic_year_name: { type: ['string', 'null'] }, teacher_name: { type: ['string', 'null'] } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'allocation_id', 'teacher_id']);
const studentSubjectEnrollmentSchema: RxJsonSchema<allTypes.StudentSubjectEnrollment> = createEntitySchema<allTypes.StudentSubjectEnrollment>('student_subject_enrollment', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, class_subject_allocation_id: { type: 'string', ref: 'class_subject_allocations' }, enrollment_date: { type: 'string', format: 'date' }, status: { type: 'string', enum: Object.values(allTypes.StudentEnrollmentStatus) }, student_name: { type: ['string', 'null'] }, class_name: { type: ['string', 'null'] }, stream_name: { type: ['string', 'null'] }, subject_name: { type: ['string', 'null'] }, academic_year_name: { type: ['string', 'null'] }, enrollment_status_display: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'class_subject_allocation_id', 'enrollment_date', 'status', 'created_at', 'updated_at']);
const timetableEntrySchema: RxJsonSchema<allTypes.TimetableEntry> = createEntitySchema<allTypes.TimetableEntry>('timetable_entry', { id: { type: 'string' }, class_stream_id: { type: 'number', ref: 'class_streams' }, day_of_week: { type: 'string', enum: Object.values(allTypes.DayOfWeek) }, period_id: { type: 'number', ref: 'timetable_period_definitions' }, subject_id: { type: 'number', ref: 'subjects' }, teacher_id: { type: 'string', ref: 'staff' }, class_stream_name: { type: ['string', 'null'] }, period_name: { type: ['string', 'null'] }, subject_name: { type: ['string', 'null'] }, teacher_name: { type: ['string', 'null'] } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'class_stream_id', 'day_of_week', 'period_id', 'subject_id', 'teacher_id']);
const chartOfAccountsSchema: RxJsonSchema<allTypes.ChartOfAccount> = createEntitySchema<allTypes.ChartOfAccount>('chart_of_account', { id: { type: 'number' }, account_code: { type: 'string' }, name: { type: 'string' }, type: { type: 'string', enum: Object.values(allTypes.AccountType) }, template_type: { type: 'string', enum: Object.values(allTypes.AccountTemplateType) }, is_active: { type: 'boolean' }, expense_category_id: { type: ['number', 'null'], ref: 'expense_categories' }, expense_category_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'number' }, ['id', 'account_code', 'name', 'type', 'template_type', 'is_active', 'created_at', 'updated_at']);
const expenseCategoriesSchema: RxJsonSchema<allTypes.ExpenseCategory> = createEntitySchema<allTypes.ExpenseCategory>('expense_category', { id: { type: 'number' }, name: { type: 'string' } }, { key: 'id', type: 'number' }, ['id', 'name']);
const banksSchema: RxJsonSchema<allTypes.Bank> = createEntitySchema<allTypes.Bank>('bank', { id: { type: 'number' }, name: { type: 'string' }, account_no: { type: ['string', 'null'] }, gl_account_id: { type: 'number', ref: 'chart_of_accounts' }, gl_account_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'number' }, ['id', 'name', 'gl_account_id', 'created_at', 'updated_at']);
const suppliersSchema: RxJsonSchema<allTypes.Supplier> = createEntitySchema<allTypes.Supplier>('supplier', { id: { type: 'number' }, name: { type: 'string' }, phone: { type: ['string', 'null'] }, email: { type: ['string', 'null'], format: 'email' }, address: { type: ['string', 'null'] }, contact_person: { type: ['string', 'null'] }, kra_pin: { type: ['string', 'null'] }, contract_expiry_date: { type: ['string', 'null'], format: 'date' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const feeTemplateItemProperties: RxJsonSchema<allTypes.FeeTemplateItem>['properties'] = { id: { type: 'string' }, fee_template_id: { type: 'number' }, description: { type: 'string' }, amount: { type: 'number' }, revenue_account_id: { type: 'number' }, linked_expense_category_id: { type: ['number', 'null'] }, linked_meal_plan_id: { type: ['number', 'null'] }, linked_transport_route_id: { type: ['number', 'null'] }, revenue_account_name: { type: ['string', 'null'] }, linked_expense_category_name: { type: ['string', 'null'] } };
const feeTemplatesSchema: RxJsonSchema<allTypes.FeeTemplate> = createEntitySchema<allTypes.FeeTemplate>('fee_template', { id: { type: 'number' }, name: { type: 'string' }, school_period_id: { type: 'number', ref: 'school_periods' }, student_category_id: { type: ['number', 'null'], ref: 'student_categories' }, school_period_name: { type: ['string', 'null'] }, student_category_name: { type: ['string', 'null'] }, items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: feeTemplateItemProperties } }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'school_period_id', 'created_at', 'updated_at']);
const expenseClaimsSchema: RxJsonSchema<allTypes.ExpenseClaim> = createEntitySchema<allTypes.ExpenseClaim>('expense_claim', { id: { type: 'string' }, claimant_type: { type: 'string', enum: Object.values(allTypes.ExpenseClaimantType) }, claimant_id: { type: 'string' }, claim_date: { type: 'string', format: 'date' }, description: { type: 'string' }, amount: { type: 'number' }, expense_category_id: { type: 'number', ref: 'expense_categories' }, workflow_state_id: { type: ['number', 'null'], ref: 'workflow_states' }, workflow_status_name: { type: ['string', 'null'] }, approved_by: { type: ['string', 'null'], ref: 'users' }, paid_date: { type: ['string', 'null'], format: 'date' }, payment_reference: { type: ['string', 'null'] }, claimant_name: { type: ['string', 'null'] }, expense_category_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'claimant_type', 'claimant_id', 'claim_date', 'description', 'amount', 'expense_category_id', 'created_at', 'updated_at']);
const warehousesSchema: RxJsonSchema<allTypes.Warehouse> = createEntitySchema<allTypes.Warehouse>('warehouse', { id: { type: 'number' }, name: { type: 'string' }, location: { type: ['string', 'null'] } }, { key: 'id', type: 'number' }, ['id', 'name']);
const itemCategoriesInvSchema: RxJsonSchema<allTypes.ItemCategoryInv> = createEntitySchema<allTypes.ItemCategoryInv>('item_category_inv', { id: { type: 'number' }, name: { type: 'string' } }, { key: 'id', type: 'number' }, ['id', 'name']);
const itemsInvSchema: RxJsonSchema<allTypes.ItemInv> = createEntitySchema<allTypes.ItemInv>('item_inv', { id: { type: 'string' }, name: { type: 'string' }, description: { type: ['string', 'null'] }, category_id: { type: ['number', 'null'], ref: 'item_categories_inv' }, unit_of_measure: { type: ['string', 'null'] }, item_type: { type: 'string', enum: Object.values(allTypes.ItemTypeInv) }, current_price: { type: ['number', 'null'] }, reorder_level: { type: ['number', 'null'] }, category_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'item_type', 'created_at', 'updated_at']);
const fixedAssetsSchema: RxJsonSchema<allTypes.FixedAsset> = createEntitySchema<allTypes.FixedAsset>('fixed_asset', { id: { type: 'string' }, item_id: { type: 'string', ref: 'items_inv' }, asset_tag: { type: 'string' }, serial_number: { type: ['string', 'null'] }, purchase_date: { type: ['string', 'null'], format: 'date' }, purchase_cost: { type: ['number', 'null'] }, current_value: { type: ['number', 'null'] }, depreciation_method: { type: ['string', 'null'], enum: [...Object.values(allTypes.DepreciationMethod), null] }, depreciation_rate_pa: { type: ['number', 'null'] }, useful_life_years: { type: ['number', 'null'] }, assigned_to_staff_id: { type: ['string', 'null'], ref: 'staff' }, location: { type: ['string', 'null'] }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, item_name: { type: ['string', 'null'] }, assigned_to_staff_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'item_id', 'asset_tag', 'created_at', 'updated_at']);
const assetDepreciationLogsSchema: RxJsonSchema<allTypes.AssetDepreciationLog> = createEntitySchema<allTypes.AssetDepreciationLog>('asset_depreciation_log', { id: { type: 'string' }, asset_id: { type: 'string', ref: 'fixed_assets' }, depreciation_date: { type: 'string', format: 'date' }, amount_depreciated: { type: 'number' }, book_value_after: { type: 'number' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'asset_id', 'depreciation_date', 'amount_depreciated', 'book_value_after']);
const requisitionItemProperties: RxJsonSchema<allTypes.RequisitionItem>['properties'] = { id: { type: 'string' }, requisition_id: { type: 'string' }, item_id: { type: 'string' }, quantity_requested: { type: 'number' }, unit_price: { type: ['number', 'null'] }, quantity_issued: { type: ['number', 'null'] }, fulfillment_stock_transaction_id: { type: ['string', 'null'] }, item_name: { type: ['string', 'null'] }, line_total: { type: ['number', 'null'] } };
const requisitionsSchema: RxJsonSchema<allTypes.Requisition> = createEntitySchema<allTypes.Requisition>('requisition', { id: { type: 'string' }, requesting_staff_id: { type: 'string', ref: 'staff' }, request_date: { type: 'string', format: 'date' }, status: { type: 'string', enum: Object.values(allTypes.RequisitionStatus) }, notes: { type: ['string', 'null'] }, items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: requisitionItemProperties } }, requesting_staff_name: { type: ['string', 'null'] }, department_name: { type: ['string', 'null'] }, total_requested_value: { type: ['number', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'requesting_staff_id', 'request_date', 'status', 'created_at', 'updated_at']);
const purchaseOrderItemProperties: RxJsonSchema<allTypes.PurchaseOrderItem>['properties'] = { id: { type: 'string' }, purchase_order_id: { type: 'string' }, item_id: { type: 'string' }, quantity_ordered: { type: 'number' }, unit_price: { type: 'number' }, quantity_received: { type: ['number', 'null'] }, item_name: { type: ['string', 'null'] }, line_total: { type: ['number', 'null'] } };
const purchaseOrdersSchema: RxJsonSchema<allTypes.PurchaseOrder> = createEntitySchema<allTypes.PurchaseOrder>('purchase_order', { id: { type: 'string' }, supplier_id: { type: 'number', ref: 'suppliers' }, order_date: { type: 'string', format: 'date' }, expected_delivery_date: { type: ['string', 'null'], format: 'date' }, status: { type: 'string', enum: Object.values(allTypes.PurchaseOrderStatus) }, notes: { type: ['string', 'null'] }, requisition_id: { type: ['string', 'null'], ref: 'requisitions' }, items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: purchaseOrderItemProperties } }, supplier_name: { type: ['string', 'null'] }, total_value: { type: ['number', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'supplier_id', 'order_date', 'status', 'created_at', 'updated_at']);
const stockLevelsSchema: RxJsonSchema<allTypes.StockLevel> = createEntitySchema<allTypes.StockLevel>('stock_level', { compositeId: { type: 'string' }, item_id: { type: 'string', ref: 'items_inv' }, warehouse_id: { type: 'number', ref: 'warehouses' }, quantity: { type: 'number' }, last_updated: { type: ['string', 'null'], format: 'date-time' }, item_name: { type: ['string', 'null'] }, warehouse_name: { type: ['string', 'null'] }, category_name: { type: ['string', 'null'] } }, { key: 'compositeId', type: 'string', final: true, maxLength: 200 }, ['compositeId', 'item_id', 'warehouse_id', 'quantity'], [['item_id', 'warehouse_id']]);
const stockTransactionsSchema: RxJsonSchema<allTypes.StockTransaction> = createEntitySchema<allTypes.StockTransaction>('stock_transaction', { id: { type: 'string' }, item_id: { type: 'string', ref: 'items_inv' }, warehouse_id: { type: 'number', ref: 'warehouses' }, transaction_type: { type: 'string', enum: Object.values(allTypes.StockTransactionType) }, quantity: { type: 'number' }, source_table: { type: ['string', 'null'] }, source_id: { type: ['string', 'null'] }, transaction_date: { type: ['string', 'null'], format: 'date-time' }, notes: { type: ['string', 'null'] }, item_name: { type: ['string', 'null'] }, warehouse_name: { type: ['string', 'null'] } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'item_id', 'warehouse_id', 'transaction_type', 'quantity']);
const payrollPeriodsSchema: RxJsonSchema<allTypes.PayrollPeriod> = createEntitySchema<allTypes.PayrollPeriod>('payroll_period', { id: { type: 'number' }, name: { type: 'string' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' }, financial_year_id: { type: 'number', ref: 'financial_years' }, school_period_id: { type: ['number', 'null'], ref: 'school_periods' }, status: { type: ['string', 'null'], enum: Object.values(allTypes.PayrollPeriodStatus) }, financial_year_name: { type: ['string', 'null'] }, school_period_name: { type: ['string', 'null'] } }, { key: 'id', type: 'number' }, ['id', 'name', 'start_date', 'end_date', 'financial_year_id']);
const payrollItemTypesSchema: RxJsonSchema<allTypes.PayrollItemType> = createEntitySchema<allTypes.PayrollItemType>('payroll_item_type', { id: { type: 'number' }, name: { type: 'string' }, category: { type: 'string', enum: Object.values(allTypes.PayrollItemCategory) }, tax_implication: { type: 'string', enum: Object.values(allTypes.PayrollTaxImplication) }, gl_account_expense_id: { type: ['number', 'null'], ref: 'chart_of_accounts' }, gl_account_liability_id: { type: ['number', 'null'], ref: 'chart_of_accounts' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'number' }, ['id', 'name', 'category', 'tax_implication', 'created_at', 'updated_at']);
const staffRecurringItemProperties: RxJsonSchema<allTypes.StaffRecurringItem>['properties'] = { id: { type: 'string' }, staff_salary_setting_id: { type: 'string' }, item_type_id: { type: 'number' }, amount: { type: 'number' }, created_at: { type: ['string', 'null'], format: 'date-time' }, item_type_name: { type: ['string', 'null'] }, item_category: { type: ['string', 'null'], enum: Object.values(allTypes.PayrollItemCategory) } };
const staffSalarySettingsSchema: RxJsonSchema<allTypes.StaffSalarySetting> = createEntitySchema<allTypes.StaffSalarySetting>('staff_salary_setting', { id: { type: 'string' }, staff_id: { type: 'string', ref: 'staff' }, basic_salary: { type: 'number' }, payment_bank: { type: ['string', 'null'] }, bank_account_no: { type: ['string', 'null'] }, max_advance_amount: { type: ['number', 'null'] }, recurring_items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: staffRecurringItemProperties } }, staff_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'staff_id', 'basic_salary', 'created_at', 'updated_at']);
const payslipItemProperties: RxJsonSchema<allTypes.PayslipItem>['properties'] = { id: { type: 'string' }, payslip_id: { type: 'string' }, item_type_id: { type: 'number' }, description: { type: ['string', 'null'] }, amount: { type: ['number', 'null'] }, item_type_name: { type: ['string', 'null'] }, item_category: { type: ['string', 'null'], enum: Object.values(allTypes.PayrollItemCategory) } };
const payslipsSchema: RxJsonSchema<allTypes.Payslip> = createEntitySchema<allTypes.Payslip>('payslip', { id: { type: 'string' }, staff_id: { type: 'string', ref: 'staff' }, payroll_period_id: { type: 'number', ref: 'payroll_periods' }, gross_salary: { type: ['number', 'null'] }, total_deductions: { type: ['number', 'null'] }, net_salary: { type: ['number', 'null'] }, status: { type: ['string', 'null'], enum: Object.values(allTypes.PayslipStatus) }, processed_at: { type: ['string', 'null'], format: 'date-time' }, paid_at: { type: ['string', 'null'], format: 'date-time' }, items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: payslipItemProperties } }, staff_name: { type: ['string', 'null'] }, payroll_period_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'staff_id', 'payroll_period_id', 'status', 'created_at', 'updated_at']);
const bookCategoriesSchema: RxJsonSchema<allTypes.BookCategory> = createEntitySchema<allTypes.BookCategory>('book_category', { id: { type: 'number' }, name: { type: 'string' } }, { key: 'id', type: 'number' }, ['id', 'name']);
const booksSchema: RxJsonSchema<allTypes.Book> = createEntitySchema<allTypes.Book>('book', { id: { type: 'string' }, category_id: { type: ['number', 'null'], ref: 'book_categories' }, title: { type: 'string' }, author: { type: ['string', 'null'] }, publisher: { type: ['string', 'null'] }, isbn: { type: ['string', 'null'] }, accession_no: { type: 'string' }, publication_year: { type: ['number', 'null'] }, edition: { type: ['string', 'null'] }, purchase_cost: { type: ['number', 'null'] }, status: { type: 'string', enum: Object.values(allTypes.BookStatus) }, location_shelf: { type: ['string', 'null'] }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, category_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'title', 'accession_no', 'status', 'created_at', 'updated_at']);
const loansSchema: RxJsonSchema<allTypes.Loan> = createEntitySchema<allTypes.Loan>('loan', { id: { type: 'string' }, book_id: { type: 'string', ref: 'books' }, user_id: { type: 'string', ref: 'users' }, user_type: { type: 'string', enum: Object.values(allTypes.UserType) }, loan_date: { type: 'string', format: 'date' }, due_date: { type: 'string', format: 'date' }, return_date: { type: ['string', 'null'], format: 'date' }, extended_due_date: { type: ['string', 'null'], format: 'date' }, book_title: { type: ['string', 'null'] }, user_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'book_id', 'user_id', 'loan_date', 'due_date', 'created_at', 'updated_at']);
const finesSchema: RxJsonSchema<allTypes.Fine> = createEntitySchema<allTypes.Fine>('fine', { id: { type: 'string' }, loan_id: { type: 'string', ref: 'loans' }, amount: { type: 'number' }, status: { type: 'string', enum: Object.values(allTypes.FineStatus) }, reason: { type: ['string', 'null'] }, fee_adjustment_id: { type: ['string', 'null'], ref: 'fee_adjustments' }, paid_date: { type: ['string', 'null'], format: 'date' }, payment_reference: { type: ['string', 'null'] }, book_title: { type: ['string', 'null'] }, user_name: { type: ['string', 'null'] }, loan_due_date: { type: ['string', 'null'], format: 'date' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'loan_id', 'amount', 'status', 'created_at', 'updated_at']);
const customerInvoiceItemProperties: RxJsonSchema<allTypes.CustomerInvoiceItem>['properties'] = { id: { type: 'string' }, invoice_id: { type: 'string' }, description: { type: ['string', 'null'] }, quantity: { type: ['number', 'null'] }, unit_price: { type: ['number', 'null'] }, amount: { type: ['number', 'null'] }, revenue_account_id: { type: ['number', 'null'] }, revenue_account_name: { type: ['string', 'null'] } };
const customerInvoicesSchema: RxJsonSchema<allTypes.CustomerInvoice> = createEntitySchema<allTypes.CustomerInvoice>('customer_invoice', { id: { type: 'string' }, customer_id: { type: 'number', ref: 'customers' }, invoice_number: { type: 'string' }, issue_date: { type: 'string', format: 'date' }, due_date: { type: ['string', 'null'], format: 'date' }, total_amount: { type: ['number', 'null'] }, status: { type: ['string', 'null'], enum: Object.values(allTypes.CustomerInvoiceStatus) }, notes: { type: ['string', 'null'] }, items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: customerInvoiceItemProperties } }, customer_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'customer_id', 'invoice_number', 'issue_date', 'status', 'created_at', 'updated_at']);
const supplierInvoicesSchema: RxJsonSchema<allTypes.SupplierInvoice> = createEntitySchema<allTypes.SupplierInvoice>('supplier_invoice', { id: { type: 'string' }, supplier_id: { type: 'number', ref: 'suppliers' }, invoice_number: { type: 'string' }, invoice_date: { type: 'string', format: 'date' }, due_date: { type: ['string', 'null'], format: 'date' }, total_amount: { type: 'number' }, amount_paid: { type: ['number', 'null'] }, status: { type: ['string', 'null'], enum: Object.values(allTypes.SupplierInvoiceStatus) }, purchase_order_id: { type: ['string', 'null'], ref: 'purchase_orders' }, notes: { type: ['string', 'null'] }, supplier_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'supplier_id', 'invoice_number', 'invoice_date', 'total_amount', 'status', 'created_at', 'updated_at']);
const studentOpeningBalancesSchema: RxJsonSchema<allTypes.StudentOpeningBalance> = createEntitySchema<allTypes.StudentOpeningBalance>('student_opening_balance', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, balance_type: { type: 'string', enum: Object.values(allTypes.OpeningBalanceType) }, amount: { type: 'number' }, as_of_date: { type: 'string', format: 'date' }, is_billed: { type: 'boolean' }, student_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'balance_type', 'amount', 'as_of_date', 'created_at', 'updated_at']);
const feeAdjustmentsSchema: RxJsonSchema<allTypes.FeeAdjustment> = createEntitySchema<allTypes.FeeAdjustment>('fee_adjustment', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, school_period_id: { type: 'number', ref: 'school_periods' }, adjustment_type: { type: 'string', enum: Object.values(allTypes.FeeAdjustmentType) }, amount: { type: 'number' }, reason: { type: ['string', 'null'] }, applied_invoice_id: { type: ['string', 'null'], ref: 'student_invoices' }, student_name: { type: ['string', 'null'] }, school_period_name: { type: ['string', 'null'] }, created_at: { type: ['string', 'null'], format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'school_period_id', 'adjustment_type', 'amount']);
const transportRoutesSchema: RxJsonSchema<allTypes.TransportRoute> = createEntitySchema<allTypes.TransportRoute>('transport_route', { id: { type: 'number' }, name: { type: 'string' }, cost_per_period: { type: 'number' }, gl_revenue_account_id: { type: 'number', ref: 'chart_of_accounts' }, gl_revenue_account_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'number' }, ['id', 'name', 'cost_per_period', 'gl_revenue_account_id', 'created_at', 'updated_at']);
const studentTransportAssignmentsSchema: RxJsonSchema<allTypes.StudentTransportAssignment> = createEntitySchema<allTypes.StudentTransportAssignment>('student_transport_assignment', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, route_id: { type: 'number', ref: 'transport_routes' }, school_period_id: { type: 'number', ref: 'school_periods' }, status: { type: 'string', enum: Object.values(allTypes.TransportAssignmentStatus) }, invoice_id: { type: ['string', 'null'], ref: 'student_invoices' }, cost_override: { type: ['number', 'null'] }, student_name: { type: ['string', 'null'] }, route_name: { type: ['string', 'null'] }, school_period_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'route_id', 'school_period_id', 'status', 'created_at', 'updated_at']);
const studentInvoiceItemProperties: RxJsonSchema<allTypes.StudentInvoiceItem>['properties'] = { id: { type: 'string' }, invoice_id: { type: 'string' }, description: { type: 'string' }, amount: { type: 'number' }, fee_template_item_id: { type: ['string', 'null'] }, student_transport_assignment_id: { type: ['string', 'null'] }, fine_id: { type: ['string', 'null'] } };
const studentInvoicesSchema: RxJsonSchema<allTypes.StudentInvoice> = createEntitySchema<allTypes.StudentInvoice>('student_invoice', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, invoice_number: { type: 'string' }, school_period_id: { type: 'number', ref: 'school_periods' }, issue_date: { type: 'string', format: 'date' }, due_date: { type: 'string', format: 'date' }, total_amount_billed: { type: 'number' }, amount_paid: { type: 'number', default: 0 }, status: { type: 'string', enum: Object.values(allTypes.InvoiceStatus) }, items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: studentInvoiceItemProperties } }, student_name: { type: ['string', 'null'] }, school_period_name: { type: ['string', 'null'] }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'invoice_number', 'school_period_id', 'issue_date', 'status', 'created_at', 'updated_at']);
const studentPaymentsSchema: RxJsonSchema<allTypes.StudentPayment> = createEntitySchema<allTypes.StudentPayment>('student_payment', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, receipt_no: { type: 'string' }, total_amount_paid: { type: 'number' }, payment_method: { type: ['string', 'null'] }, transaction_date: { type: 'string', format: 'date-time' }, reference_no: { type: ['string', 'null'] }, notes: { type: ['string', 'null'] }, student_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'receipt_no', 'total_amount_paid', 'transaction_date', 'created_at', 'updated_at']);
const invoicePaymentApplicationsSchema: RxJsonSchema<allTypes.InvoicePaymentApplication> = createEntitySchema<allTypes.InvoicePaymentApplication>('invoice_payment_application', { id: { type: 'string' }, payment_id: { type: 'string', ref: 'student_payments' }, invoice_item_id: { type: 'string', ref: 'student_invoice_items' }, amount_applied: { type: 'number' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'payment_id', 'invoice_item_id', 'amount_applied']);
const mealPlansSchema: RxJsonSchema<allTypes.MealPlan> = createEntitySchema<allTypes.MealPlan>('meal_plan', { id: { type: 'number' }, name: { type: 'string' }, description: { type: ['string', 'null'] }, cost_per_period: { type: ['number', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'number' }, ['id', 'name']);
const menusSchema: RxJsonSchema<allTypes.Menu> = createEntitySchema<allTypes.Menu>('menu', { id: { type: 'string' }, menu_date: { type: 'string', format: 'date' }, meal_type: { type: 'string', enum: Object.values(allTypes.MealType) }, description: { type: 'string' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'menu_date', 'meal_type']);
const studentMealPlansSchema: RxJsonSchema<allTypes.StudentMealPlan> = createEntitySchema<allTypes.StudentMealPlan>('student_meal_plan', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, school_period_id: { type: 'number', ref: 'school_periods' }, meal_plan_id: { type: 'number', ref: 'meal_plans' }, status: { type: 'string', enum: Object.values(allTypes.StudentMealPlanStatus) }, start_date: { type: ['string', 'null'], format: 'date' }, end_date: { type: ['string', 'null'], format: 'date' }, student_name: { type: ['string', 'null'] }, school_period_name: { type: ['string', 'null'] }, meal_plan_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'school_period_id', 'meal_plan_id', 'status', 'created_at', 'updated_at']);
const mealConsumptionLogsSchema: RxJsonSchema<allTypes.MealConsumptionLog> = createEntitySchema<allTypes.MealConsumptionLog>('meal_consumption_log', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, menu_id: { type: 'string', ref: 'menus' }, consumption_time: { type: 'string', format: 'date-time' }, charged_amount: { type: ['number', 'null'] }, wallet_transaction_id: { type: ['string', 'null'], ref: 'wallet_transactions' }, student_name: { type: ['string', 'null'] }, menu_description: { type: ['string', 'null'] }, menu_meal_type: { type: ['string', 'null'], enum: Object.values(allTypes.MealType) }, menu_date: { type: ['string', 'null'], format: 'date' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'menu_id', 'consumption_time']);
const merchantsSchema: RxJsonSchema<allTypes.Merchant> = createEntitySchema<allTypes.Merchant>('merchant', { id: { type: 'number' }, name: { type: 'string' }, gl_account_id: { type: ['number', 'null'], ref: 'chart_of_accounts' }, gl_account_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'number' }, ['id', 'name']);
const studentWalletsSchema: RxJsonSchema<allTypes.StudentWallet> = createEntitySchema<allTypes.StudentWallet>('student_wallet', { student_id: { type: 'string', ref: 'students' }, balance: { type: 'number' }, last_updated: { type: 'string', format: 'date-time' }, student_name: { type: ['string', 'null'] } }, { key: 'student_id', type: 'string', final: true, maxLength: 100 }, ['student_id', 'balance', 'last_updated']);
const walletTransactionsSchema: RxJsonSchema<allTypes.WalletTransaction> = createEntitySchema<allTypes.WalletTransaction>('wallet_transaction', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, transaction_date: { type: 'string', format: 'date-time' }, transaction_type: { type: 'string', enum: Object.values(allTypes.WalletTransactionType) }, amount: { type: 'number' }, description: { type: 'string' }, reference_id: { type: ['string', 'null'] }, reference_type: { type: ['string', 'null'] }, running_balance: { type: 'number' }, student_name: { type: ['string', 'null'] } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'transaction_date']);
const generalPaymentItemProperties: RxJsonSchema<allTypes.GeneralPaymentItem>['properties'] = { id: { type: 'string' }, general_payment_id: { type: 'string' }, description: { type: 'string' }, amount: { type: 'number' }, revenue_account_id: { type: 'number' }, revenue_account_name: { type: ['string', 'null'] } };
const generalPaymentsSchema: RxJsonSchema<allTypes.GeneralPayment> = createEntitySchema<allTypes.GeneralPayment>('general_payment', { id: { type: 'string' }, payer_type: { type: 'string', enum: Object.values(allTypes.GeneralPayerType) }, payer_id: { type: ['string', 'null'] }, payer_name_external: { type: ['string', 'null'] }, payment_date: { type: 'string', format: 'date-time' }, total_amount_paid: { type: 'number' }, payment_method: { type: ['string', 'null'] }, reference_no: { type: ['string', 'null'] }, notes: { type: ['string', 'null'] }, items: { type: 'array', default: [], items: { type: 'object', properties: generalPaymentItemProperties } }, payer_name_resolved: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'payer_type', 'payment_date', 'total_amount_paid', 'created_at', 'updated_at']);
const generalLedgerEntriesSchema: RxJsonSchema<allTypes.GeneralLedgerEntry> = createEntitySchema<allTypes.GeneralLedgerEntry>(
  'general_ledger_entry', 
  { 
    id: { type: 'string' }, 
    transaction_date: { type: 'string', format: 'date-time' }, 
    effective_date: { type: 'string', format: 'date' },
    financial_year_id: { type: 'number', ref: 'financial_years' }, 
    account_id: { type: 'number', ref: 'chart_of_accounts' },
    debit: { type: ['number', 'null'] },
    credit: { type: ['number', 'null'] },
    description: { type: 'string' },
    source_table: { type: ['string', 'null'] },
    source_id: { type: ['string', 'null'] }
  }, 
  { key: 'id', type: 'string', final: true, maxLength: 100 }, 
  ['id', 'transaction_date', 'effective_date', 'financial_year_id', 'account_id', 'description']
);
const rfqsSchema: RxJsonSchema<allTypes.RFQ> = createEntitySchema<allTypes.RFQ>('rfq', { id: { type: 'string' }, title: { type: 'string' }, description: { type: ['string', 'null'] }, issue_date: { type: 'string', format: 'date' }, closing_date: { type: 'string', format: 'date' }, status: { type: 'string', enum: Object.values(allTypes.RFQStatus) }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'title', 'issue_date', 'closing_date', 'status', 'created_at', 'updated_at']);


// --- Collections Definition (for addCollections) ---
export const collectionsDefinition = {
  app_settings: { schema: appSettingsSchema },
  school_details: { schema: schoolDetailsSchema },
  users: { schema: userSchema },
  roles: { schema: roleSchema },
  academic_year_structures: { schema: academicYearStructureSchema },
  academic_period_definitions: { schema: academicPeriodDefinitionSchema },
  academic_years: { schema: academicYearSchema },
  financial_years: { schema: financialYearSchema },
  school_periods: { schema: schoolPeriodSchema },
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
  partners: { schema: partnerSchema },
  clubs: { schema: clubAndSocietySchema },
  customers: { schema: customerSchema },
  student_health_records: { schema: studentHealthRecordSchema },
  student_attendance: { schema: studentAttendanceSchema },
  timetable_period_definitions: { schema: timetablePeriodDefSchema },
  communication_templates: { schema: templateCommSchema },
  message_campaigns: { schema: campaignSchema },
  subjects: { schema: subjectSchema },
  subject_papers: { schema: subjectPaperSchema },
  exam_sessions: { schema: examSessionSchema },
  grading_schemes: { schema: gradingSchemeSchema },
  student_exam_results: { schema: studentExamResultSchema },
  class_subject_allocations: { schema: classSubjectAllocationSchema },
  teacher_subject_assignments: { schema: teacherSubjectAssignmentSchema },
  student_subject_enrollments: { schema: studentSubjectEnrollmentSchema },
  timetable_entries: { schema: timetableEntrySchema },
  chart_of_accounts: { schema: chartOfAccountsSchema },
  expense_categories: { schema: expenseCategoriesSchema },
  banks: { schema: banksSchema },
  suppliers: { schema: suppliersSchema },
  fee_templates: { schema: feeTemplatesSchema },
  expense_claims: { schema: expenseClaimsSchema },
  warehouses: { schema: warehousesSchema },
  item_categories_inv: { schema: itemCategoriesInvSchema },
  items_inv: { schema: itemsInvSchema },
  fixed_assets: { schema: fixedAssetsSchema },
  asset_depreciation_logs: { schema: assetDepreciationLogsSchema },
  requisitions: { schema: requisitionsSchema },
  purchase_orders: { schema: purchaseOrdersSchema },
  stock_levels: { schema: stockLevelsSchema },
  stock_transactions: { schema: stockTransactionsSchema },
  payroll_periods: { schema: payrollPeriodsSchema },
  payroll_item_types: { schema: payrollItemTypesSchema },
  staff_salary_settings: { schema: staffSalarySettingsSchema },
  payslips: { schema: payslipsSchema },
  book_categories: { schema: bookCategoriesSchema },
  books: { schema: booksSchema },
  loans: { schema: loansSchema },
  fines: { schema: finesSchema },
  customer_invoices: { schema: customerInvoicesSchema },
  supplier_invoices: { schema: supplierInvoicesSchema },
  student_opening_balances: { schema: studentOpeningBalancesSchema },
  fee_adjustments: { schema: feeAdjustmentsSchema },
  transport_routes: { schema: transportRoutesSchema },
  student_transport_assignments: { schema: studentTransportAssignmentsSchema },
  student_invoices: { schema: studentInvoicesSchema },
  student_invoice_items: { schema: createEntitySchema<allTypes.StudentInvoiceItem>('student_invoice_item', studentInvoiceItemProperties, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'invoice_id', 'description', 'amount']) },
  student_payments: { schema: studentPaymentsSchema },
  invoice_payment_applications: { schema: invoicePaymentApplicationsSchema },
  meal_plans: { schema: mealPlansSchema },
  menus: { schema: menusSchema },
  student_meal_plans: { schema: studentMealPlansSchema },
  meal_consumption_logs: { schema: mealConsumptionLogsSchema },
  merchants: { schema: merchantsSchema },
  student_wallets: { schema: studentWalletsSchema },
  wallet_transactions: { schema: walletTransactionsSchema },
  general_payments: { schema: generalPaymentsSchema },
  general_ledger_entries: { schema: generalLedgerEntriesSchema },
  rfqs: { schema: rfqsSchema },
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
  financial_years: RxCollection<allTypes.FinancialYear>;
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
  partners: RxCollection<allTypes.Partner>;
  clubs: RxCollection<allTypes.ClubAndSociety>;
  customers: RxCollection<allTypes.Customer>;
  student_health_records: RxCollection<allTypes.StudentHealthRecord>;
  student_attendance: RxCollection<allTypes.StudentAttendance>;
  timetable_period_definitions: RxCollection<allTypes.TimetablePeriodDef>;
  communication_templates: RxCollection<allTypes.TemplateComm>;
  message_campaigns: RxCollection<allTypes.Campaign>;
  subjects: RxCollection<allTypes.Subject>;
  subject_papers: RxCollection<allTypes.SubjectPaper>;
  exam_sessions: RxCollection<allTypes.ExamSession>;
  grading_schemes: RxCollection<allTypes.GradingScheme>;
  student_exam_results: RxCollection<allTypes.StudentExamResultWithDetails>;
  class_subject_allocations: RxCollection<allTypes.ClassSubjectAllocation>;
  teacher_subject_assignments: RxCollection<allTypes.TeacherSubjectAssignment>;
  student_subject_enrollments: RxCollection<allTypes.StudentSubjectEnrollment>;
  timetable_entries: RxCollection<allTypes.TimetableEntry>;
  chart_of_accounts: RxCollection<allTypes.ChartOfAccount>;
  expense_categories: RxCollection<allTypes.ExpenseCategory>;
  banks: RxCollection<allTypes.Bank>;
  suppliers: RxCollection<allTypes.Supplier>;
  fee_templates: RxCollection<allTypes.FeeTemplate>;
  expense_claims: RxCollection<allTypes.ExpenseClaim>;
  warehouses: RxCollection<allTypes.Warehouse>;
  item_categories_inv: RxCollection<allTypes.ItemCategoryInv>;
  items_inv: RxCollection<allTypes.ItemInv>;
  fixed_assets: RxCollection<allTypes.FixedAsset>;
  asset_depreciation_logs: RxCollection<allTypes.AssetDepreciationLog>;
  requisitions: RxCollection<allTypes.Requisition>;
  purchase_orders: RxCollection<allTypes.PurchaseOrder>;
  stock_levels: RxCollection<allTypes.StockLevel>;
  stock_transactions: RxCollection<allTypes.StockTransaction>;
  payroll_periods: RxCollection<allTypes.PayrollPeriod>;
  payroll_item_types: RxCollection<allTypes.PayrollItemType>;
  staff_salary_settings: RxCollection<allTypes.StaffSalarySetting>;
  payslips: RxCollection<allTypes.Payslip>;
  book_categories: RxCollection<allTypes.BookCategory>;
  books: RxCollection<allTypes.Book>;
  loans: RxCollection<allTypes.Loan>;
  fines: RxCollection<allTypes.Fine>;
  customer_invoices: RxCollection<allTypes.CustomerInvoice>;
  supplier_invoices: RxCollection<allTypes.SupplierInvoice>;
  student_opening_balances: RxCollection<allTypes.StudentOpeningBalance>;
  fee_adjustments: RxCollection<allTypes.FeeAdjustment>;
  transport_routes: RxCollection<allTypes.TransportRoute>;
  student_transport_assignments: RxCollection<allTypes.StudentTransportAssignment>;
  student_invoices: RxCollection<allTypes.StudentInvoice>;
  student_invoice_items: RxCollection<allTypes.StudentInvoiceItem>;
  student_payments: RxCollection<allTypes.StudentPayment>;
  invoice_payment_applications: RxCollection<allTypes.InvoicePaymentApplication>;
  meal_plans: RxCollection<allTypes.MealPlan>;
  menus: RxCollection<allTypes.Menu>;
  student_meal_plans: RxCollection<allTypes.StudentMealPlan>;
  meal_consumption_logs: RxCollection<allTypes.MealConsumptionLog>;
  merchants: RxCollection<allTypes.Merchant>;
  student_wallets: RxCollection<allTypes.StudentWallet>;
  wallet_transactions: RxCollection<allTypes.WalletTransaction>;
  general_payments: RxCollection<allTypes.GeneralPayment>;
  general_ledger_entries: RxCollection<allTypes.GeneralLedgerEntry>;
  rfqs: RxCollection<allTypes.RFQ>;
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
  // Type assertion for addCollections as its argument type is complex
  await db.addCollections(collectionsDefinition as any);
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
            const rawDataKey = `initialMock${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}`;
            
            const mockDataArray = mockData[rawDataKey as keyof allTypes.RawInitialData];
            
            const collection = db[collectionName as keyof SchoolDatabaseCollections];

            if (mockDataArray && collection) {
                try {
                    console.log(`RxDB: Clearing collection ${collectionName}...`);
                    await collection.find().remove(); 
                    
                    if (Array.isArray(mockDataArray) && mockDataArray.length > 0) {
                        console.log(`RxDB: Seeding ${collectionName} with ${mockDataArray.length} items...`);
                        await collection.bulkInsert(mockDataArray as any); // Cast to any
                    } else if (!Array.isArray(mockDataArray) && mockDataArray !== null && collectionName !== RXDB_SETTINGS_COLLECTION_NAME) { 
                        console.log(`RxDB: Seeding ${collectionName} with 1 item...`);
                        await collection.insert(mockDataArray as any); // Cast to any
                    } else if (collectionName === RXDB_SETTINGS_COLLECTION_NAME && mockDataArray) {
                         console.log(`RxDB: Upserting ${collectionName} settings...`);
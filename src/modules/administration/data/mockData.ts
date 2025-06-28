// ABOUTME: Provides initial mock data for entities specific to the Administration module.
// ABOUTME: This data is used in "demo" mode and for seeding RxDB in "production" mode.

import * as types from './types';
import { generateId, generateNumericId } from '../../../hooks/useMockData';
import { PersonGender, StudentStatus, UserType } from '../../../types';

// These entities are core but managed under Administration
export const initialMockAcademicYearStructures: any[] = [
    { id: 1, name: 'Standard 3-Term System'},
    { id: 2, name: 'Semester System (2 Semesters)'},
];
export const initialMockAcademicPeriodDefinitions: any[] = [
  { id: 1, structure_id: 1, name: 'Term 1', sequence_order: 1, structure_name: 'Standard 3-Term System' },
  { id: 2, structure_id: 1, name: 'Term 2', sequence_order: 2, structure_name: 'Standard 3-Term System' },
  { id: 3, structure_id: 1, name: 'Term 3', sequence_order: 3, structure_name: 'Standard 3-Term System' },
  { id: 4, structure_id: 2, name: 'Semester 1', sequence_order: 1, structure_name: 'Semester System (2 Semesters)' },
  { id: 5, structure_id: 2, name: 'Semester 2', sequence_order: 2, structure_name: 'Semester System (2 Semesters)' },
];
export const initialMockAcademicYears: any[] = [
  { id: 1, name: 'AY 2023/2024', structure_id: 1, start_date: '2023-09-01', end_date: '2024-06-30', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), structure_name: 'Standard 3-Term System' },
  { id: 2, name: 'AY 2024/2025', structure_id: 1, start_date: '2024-09-01', end_date: '2025-06-30', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), structure_name: 'Standard 3-Term System' },
];
export const initialMockSchoolPeriods: any[] = [
  { id: 1, academic_year_id: 1, period_definition_id: 1, financial_year_id: 1, start_date: '2023-09-01', end_date: '2023-12-15', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 1 - AY 2023/2024', academic_year_name:'AY 2023/2024', period_definition_name: 'Term 1', financial_year_name: 'FY 2023' },
  { id: 2, academic_year_id: 1, period_definition_id: 2, financial_year_id: 1, start_date: '2024-01-08', end_date: '2024-04-05', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 2 - AY 2023/2024', academic_year_name:'AY 2023/2024', period_definition_name: 'Term 2', financial_year_name: 'FY 2023' },
  { id: 3, academic_year_id: 1, period_definition_id: 3, financial_year_id: 1, start_date: '2024-05-06', end_date: '2024-07-26', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 3 - AY 2023/2024', academic_year_name:'AY 2023/2024', period_definition_name: 'Term 3', financial_year_name: 'FY 2023' },
  { id: 4, academic_year_id: 2, period_definition_id: 1, financial_year_id: 2, start_date: '2024-09-01', end_date: '2024-12-15', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 1 - AY 2024/2025', academic_year_name:'AY 2024/2025', period_definition_name: 'Term 1', financial_year_name: 'FY 2024' },
];
export const initialMockDepartments: any[] = [
    { id: 1, name: 'Academics', is_academic: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'Administration', is_academic: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'Sciences', is_academic: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: 'Humanities', is_academic: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, name: 'Languages', is_academic: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, name: 'Finance', is_academic: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, name: 'Human Resources', is_academic: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];
export const initialMockDesignations: any[] = [
    { id: 1, title: 'Principal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, title: 'Deputy Principal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, title: 'Teacher', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, title: 'Head of Department', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, title: 'Accountant', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, title: 'Secretary', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, title: 'Librarian', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 8, title: 'Store Keeper', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 9, title: 'HR Manager', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];
export const initialMockStudentCategories: any[] = [
    { id: 1, name: 'Boarder' },
    { id: 2, name: 'Day Scholar' },
    { id: 3, name: 'Special Needs' },
];
export const initialMockDormitories: any[] = [
    { id: 1, name: 'Simba House', master_id: 'STF002', master_name: 'Dwight Schrute', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    { id: 2, name: 'Twiga Block', master_id: 'STF005', master_name: 'Kevin Malone', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
];
export const initialMockClasses: any[] = [
  { id: 1, name: 'Form 1' },
  { id: 2, name: 'Form 2' },
  { id: 3, name: 'Form 3'},
  { id: 4, name: 'Form 4'},
];
export const initialMockClassStreams: any[] = [
  { id: 1, class_id: 1, name: 'A', class_teacher_id: 'STF002', class_name: 'Form 1', class_teacher_name: 'Dwight Schrute' },
  { id: 2, class_id: 1, name: 'B', class_teacher_id: 'STF005', class_name: 'Form 1', class_teacher_name: 'Kevin Malone' },
  { id: 3, class_id: 2, name: 'A', class_teacher_id: 'STF008', class_name: 'Form 2', class_teacher_name: 'Phyllis Lapin-Vance' },
  { id: 4, class_id: 2, name: 'B', class_teacher_id: 'STF001', class_name: 'Form 2', class_teacher_name: 'Michael Scott' },
  { id: 5, class_id: 3, name: 'North', class_teacher_id: 'STF002', class_name: 'Form 3', class_teacher_name: 'Dwight Schrute'},
  { id: 6, class_id: 4, name: 'East', class_teacher_id: 'STF005', class_name: 'Form 4', class_teacher_name: 'Kevin Malone'},
];
// Update classes with streams
initialMockClasses.forEach(cls => {
    (cls as any).streams = initialMockClassStreams.filter(cs => cs.class_id === cls.id);
});

export const initialMockSchoolDetails: any = { id: 1, name: 'Greenwood High International', email: 'info@greenwood.int', telephone: '+254-722-123456', motto: 'Excellence and Integrity', postal_address: 'P.O. Box 100-00100', town: 'Nairobi', logo_path: '/img/logo_placeholder.png', school_gender: 'Mixed', school_type: 'International', head_teacher_name: 'Dr. Evelyn Reed', school_code: 'GHI001', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), };
export const initialMockRoles: any[] = [{ id: 1, name: 'Administrator', description: 'Full system access', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), permissions: ['manage_all'] }, { id: 2, name: 'Teacher', description: 'Access to academic modules', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), permissions: ['view_students', 'manage_grades'] },];
export const initialMockUsers: any[] = [{ id: 'USR001', username: 'admin', email: 'admin@example.com', user_type: UserType.STAFF, is_active: true, role_id: 1, role: 'Administrator', display_name: 'Admin User', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },];
export const initialMockStaff: any[] = [{ id: 'STF001', user_id: 'USR001', staff_no: 'EMP001', first_name: 'Michael', last_name: 'Scott', department_id: 2, designation_id: 1, is_active: true, phone: '123-456-7890', created_at: '2023-01-01T10:00:00Z', updated_at: '2023-01-01T10:00:00Z', email: 'm.scott@example.com', department_name: 'Administration', designation_title: 'Principal', display_name: 'Michael Scott' }, { id: 'STF002', user_id: 'USR002', staff_no: 'EMP002', first_name: 'Dwight', last_name: 'Schrute', department_id: 1, designation_id: 3, is_active: true, phone: '123-456-7891', created_at: '2023-01-01T10:00:00Z', updated_at: '2023-01-01T10:00:00Z', email: 'd.schrute@example.com', department_name: 'Academics', designation_title: 'Teacher', hod_of_department_id: 3, hod_of_department_name: 'Sciences', display_name: 'Dwight Schrute' }, { id: 'STF003', user_id: 'USR003', staff_no: 'EMP003', first_name: 'Pam', last_name: 'Beesly', department_id: 2, designation_id: 6, is_active: true, phone: '123-456-7892', created_at: '2023-01-01T10:00:00Z', updated_at: '2023-01-01T10:00:00Z', email: 'p.beesly@example.com', department_name: 'Administration', designation_title: 'Secretary', display_name: 'Pam Beesly' }, { id: 'STF004', staff_no: 'EMP004', first_name: 'Angela', last_name: 'Martin', department_id: 6, designation_id: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Finance', designation_title: 'Accountant', display_name: 'Angela Martin' }, { id: 'STF005', staff_no: 'EMP005', first_name: 'Kevin', last_name: 'Malone', department_id: 1, designation_id: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Academics', designation_title: 'Teacher', display_name: 'Kevin Malone' }, { id: 'STF006', staff_no: 'EMP006', first_name: 'Toby', last_name: 'Flenderson', department_id: 7, designation_id: 9, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Human Resources', designation_title: 'HR Manager', display_name: 'Toby Flenderson' }, { id: 'STF007', user_id: 'USR007', staff_no: 'EMP007', first_name: 'Oscar', last_name: 'Martinez', department_id: 6, designation_id: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Finance', designation_title: 'Accountant', display_name: 'Oscar Martinez', email: 'o.martinez@example.com'}, { id: 'STF008', user_id: 'USR008', staff_no: 'EMP008', first_name: 'Phyllis', last_name: 'Lapin-Vance', department_id: 1, designation_id: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Academics', designation_title: 'Teacher', display_name: 'Phyllis Vance', email: 'p.vance@example.com' }, { id: 'STF009', user_id: 'USR009', staff_no: 'EMP009', first_name: 'Erin', last_name: 'Hannon', department_id: 2, designation_id: 6, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'e.hannon@example.com', department_name: 'Administration', designation_title: 'Secretary', display_name: 'Erin Hannon' },];
export const initialMockStudents: any[] = [{ id: 'S001', admission_no: 'ADM001', first_name: 'Jim', last_name: 'Halpert', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Jim Halpert' }, { id: 'S002', admission_no: 'ADM002', first_name: 'Michael', last_name: 'Scofield', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Michael Scofield' }, { id: 'S003', admission_no: 'ADM003', first_name: 'Sara', last_name: 'Tancredi', gender: PersonGender.FEMALE, current_class_stream_id: 3, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 2', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', display_name: 'Sara Tancredi' },];
export const initialMockParentsGuardians: any[] = [];
export const initialMockStudentGuardianRelationships: any[] = [];
export const initialMockWorkflows: any[] = [];
export const initialMockAuditLogs: any[] = [];
export const initialMockAppSettings: any = { id: 'config', using_dummy_data: true };


export const initialMockPartners: types.AdminPartnerType[] = [
  { id: generateId(), name: 'Ministry of Education', partner_type: types.PartnerType.GOVERNMENT_AGENCY, contact_person: 'Director of Basic Education', email: 'director@education.gov', phone: '020-111222', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), name: 'Safaricom Foundation', partner_type: types.PartnerType.SPONSOR, contact_person: 'Ms. Jane Foundation', email: 'foundation@safaricom.co.ke', phone: '0722-000000', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockClubs: types.AdminClubAndSocietyType[] = [
  { id: 1, name: 'Debate Club', type: types.ClubType.CLUB, patron_id: 'STF002', patron_name: 'Dwight Schrute', description: 'Hones critical thinking and public speaking.', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, name: 'Science Society', type: types.ClubType.SOCIETY, patron_id: 'STF005', patron_name: 'Kevin Malone', description: 'Explores the wonders of science.', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockCustomers: types.AdminCustomerType[] = [
  { id: 1, name: 'Local Community Hall User', phone: '0712-345678', email: 'community.hall@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockStudentHealthRecords: types.AdminStudentHealthRecordType[] = [
  { id: generateId(), student_id: 'S001', blood_type: 'O+', allergies: 'Peanuts', medical_conditions: 'Asthma (Mild)', student_name: 'Jim Halpert', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockStudentAttendance: types.AdminStudentAttendanceType[] = [];

export const initialMockTemplatesComm: types.AdminTemplateCommType[] = [
  { id: 1, name: 'Fee Reminder SMS', type: types.TemplateType.SMS, body_template: 'Dear {{parent_name}}, kindly note that fees of KES {{balance}} for {{student_name}} are due on {{due_date}}. Thank you, {{school_name}}.', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, name: 'Event Invitation Email', type: types.TemplateType.EMAIL, subject: 'Invitation to {{event_name}}', body_template: 'Dear {{parent_name}},\n\nYou are cordially invited to {{event_name}} on {{event_date}} at {{event_time}}.\n\nRegards,\n{{school_name}}', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockCampaigns: types.AdminCampaignType[] = [
  { id: generateId(), name: 'Term 2 Fee Reminder', template_id: 1, status: types.CampaignStatus.DRAFT, target_audience_type: types.CampaignAudienceType.ALL_PARENTS, created_by: 'USR001', created_by_name: 'Admin User', scheduled_for: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];
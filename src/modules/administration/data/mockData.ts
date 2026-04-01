// ABOUTME: Mock data for administration module entities including partners, clubs, customers, etc.
// ABOUTME: This provides sample data for development and demo modes without external dependencies.

import {
  User, Role, Department, Designation, StudentCategory, Dormitory,
  Class, ClassStream, Student, ParentsGuardian, SchoolDetails, Staff,
  AcademicYear, SchoolPeriod, AcademicYearStructure, AcademicPeriodDefinition,
  PersonGender, StudentStatus
} from '../../../core/types';

import {
  AdminPartnerType, AdminClubAndSocietyType, AdminCustomerType,
  AdminStudentHealthRecordType, AdminStudentAttendanceType,
  AdminTemplateCommType, AdminCampaignType,
  PartnerType, ClubType, AttendanceStatus, TemplateType, CampaignStatus, CampaignAudienceType
} from './types';

export const initialMockSchoolDetails: SchoolDetails = {
  id: 1, name: 'Greenwood High International', email: 'info@greenwood.int', telephone: '+254-722-123456',
  motto: 'Excellence and Integrity', postal_address: 'P.O. Box 100-00100', town: 'Nairobi', logo_path: '/img/logo_placeholder.png',
  school_gender: 'Mixed', school_type: 'International', head_teacher_name: 'Dr. Evelyn Reed', school_code: 'GHI001',
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

export const initialMockRoles: Role[] = [
    { id: 1, name: 'Administrator', description: 'Full system access', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'Teacher', description: 'Access to academic modules', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'Accountant', description: 'Access to finance modules', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: 'Librarian', description: 'Access to library module', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, name: 'HR Manager', description: 'Access to HR modules', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, name: 'Inventory Manager', description: 'Access to inventory modules', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, name: 'Parent', description: 'Limited access to student information', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 8, name: 'Student', description: 'Limited self-service access', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockUsers: User[] = [
  { id: 'USR_MOCK_ADMIN', username: 'admin_user', email: 'admin@example.com', userType: 'Staff', isActive: true, role_id: 1, role: 'Administrator', display_name: 'Admin User', created_at: '2023-01-01T08:00:00Z', updated_at: '2023-01-01T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'STF001_USR', username: 'mscott', email: 'm.scott@example.com', userType: 'Staff', isActive: true, role_id: 1, role: 'Administrator', display_name: 'Michael Scott', created_at: '2023-01-02T08:00:00Z', updated_at: '2023-01-02T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'STF002_USR', username: 'dschrute', email: 'd.schrute@example.com', userType: 'Staff', isActive: true, role_id: 2, role: 'Teacher', display_name: 'Dwight Schrute', created_at: '2023-01-03T08:00:00Z', updated_at: '2023-01-03T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'STF003_USR', username: 'pbeesly', email: 'p.beesly@example.com', userType: 'Staff', isActive: true, role_id: 6, role: 'Inventory Manager', display_name: 'Pam Beesly', created_at: '2023-01-04T08:00:00Z', updated_at: '2023-01-04T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'USR007', username: 'omartinez', email: 'o.martinez@example.com', userType: 'Staff', isActive: true, role_id: 3, role: 'Accountant', display_name: 'Oscar Martinez', created_at: '2023-01-05T08:00:00Z', updated_at: '2023-01-05T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'USR008', username: 'pvance', email: 'p.vance@example.com', userType: 'Staff', isActive: true, role_id: 2, role: 'Teacher', display_name: 'Phyllis Vance', created_at: '2023-01-06T08:00:00Z', updated_at: '2023-01-06T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'USR009', username: 'ehannon', email: 'e.hannon@example.com', userType: 'Staff', isActive: true, role_id: 4, role: 'Librarian', display_name: 'Erin Hannon', created_at: '2023-01-07T08:00:00Z', updated_at: '2023-01-07T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'USR010', username: 'tflenderson', email: 't.flenderson@example.com', userType: 'Staff', isActive: true, role_id: 5, role: 'HR Manager', display_name: 'Toby Flenderson', created_at: '2023-01-08T08:00:00Z', updated_at: '2023-01-08T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'STU001_USR', username: 'jhalpert_stu', email: 'j.halpert.stu@example.com', userType: 'Student', isActive: true, role_id: 8, role: 'Student', display_name: 'Jim Halpert (Student)', created_at: '2023-01-09T08:00:00Z', updated_at: '2023-01-09T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'PAR001_USR', username: 'cbeesly_par', email: 'c.beesly.par@example.com', userType: 'Parent', isActive: true, role_id: 7, role: 'Parent', display_name: 'Cece Beesly (Parent)', created_at: '2023-01-10T08:00:00Z', updated_at: '2023-01-10T08:00:00Z', hashed_password: 'mockhashedpassword' },
];

export const initialMockDepartments: Department[] = [
    { id: 'DEPT001', name: 'Academics', is_academic: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'DEPT002', name: 'Administration', is_academic: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'DEPT003', name: 'Sciences', is_academic: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'DEPT004', name: 'Humanities & Arts', is_academic: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'DEPT005', name: 'Languages & Literature', is_academic: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'DEPT006', name: 'Finance & Accounts', is_academic: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'DEPT007', name: 'Human Resources', is_academic: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockDesignations: Designation[] = [
    { id: 1, title: 'Principal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, title: 'Deputy Principal - Academics', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, title: 'Teacher', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, title: 'Head of Department (HOD)', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, title: 'Accountant', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, title: 'Secretary', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, title: 'Librarian', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 8, title: 'Store Keeper', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 9, title: 'HR Manager', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 10, title: 'Senior Teacher', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 11, title: 'Laboratory Technician', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 12, title: 'Dorm Master/Matron', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 13, title: 'ICT Coordinator', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 14, title: 'Sports Coordinator', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 15, title: 'Finance Assistant', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockStaff: Staff[] = [
  { id: 'STF001', user_id: 'STF001_USR', staff_no: 'EMP001', first_name: 'Michael', last_name: 'Scott', department_id: 'DEPT002', designation_id: 1, is_active: true, phone: '0722000001', created_at: '2023-01-02T08:00:00Z', updated_at: '2023-01-02T08:00:00Z', email: 'm.scott@example.com', department_name: initialMockDepartments.find(d => d.id === 'DEPT002')?.name, designation_title: initialMockDesignations.find(ds => ds.id === 1)?.title, display_name: 'Michael Scott' },
  { id: 'STF002', user_id: 'STF002_USR', staff_no: 'EMP002', first_name: 'Dwight', last_name: 'Schrute', department_id: 'DEPT003', designation_id: 4, is_active: true, phone: '0722000002', created_at: '2023-01-03T08:00:00Z', updated_at: '2023-01-03T08:00:00Z', email: 'd.schrute@example.com', department_name: initialMockDepartments.find(d => d.id === 'DEPT003')?.name, designation_title: initialMockDesignations.find(ds => ds.id === 4)?.title, hod_of_department_id: 'DEPT003', hod_of_department_name: initialMockDepartments.find(d => d.id === 'DEPT003')?.name, display_name: 'Dwight Schrute' },
  { id: 'STF003', user_id: 'STF003_USR', staff_no: 'EMP003', first_name: 'Pam', last_name: 'Beesly', department_id: 'DEPT002', designation_id: 6, is_active: true, phone: '0722000003', created_at: '2023-01-04T08:00:00Z', updated_at: '2023-01-04T08:00:00Z', email: 'p.beesly@example.com', department_name: initialMockDepartments.find(d => d.id === 'DEPT002')?.name, designation_title: initialMockDesignations.find(ds => ds.id === 6)?.title, display_name: 'Pam Beesly' },
  { id: 'STF004', staff_no: 'EMP004', first_name: 'Angela', last_name: 'Martin', department_id: 'DEPT006', designation_id: 5, is_active: true, phone: '0722000010', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Finance \u0026 Accounts', designation_title: 'Accountant', display_name: 'Angela Martin', hod_of_department_id: 'DEPT006' },
  { id: 'STF005', staff_no: 'EMP005', first_name: 'Kevin', last_name: 'Malone', department_id: 'DEPT001', designation_id: 3, is_active: true, phone: '0722000011', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Academics', designation_title: 'Teacher', display_name: 'Kevin Malone' },
  { id: 'STF006', staff_no: 'EMP006', first_name: 'Toby', last_name: 'Flenderson', department_id: 'DEPT007', designation_id: 9, is_active: true, phone: '0722000012', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Human Resources', designation_title: 'HR Manager', display_name: 'Toby Flenderson' },
  { id: 'STF007', user_id: 'USR007', staff_no: 'EMP007', first_name: 'Oscar', last_name: 'Martinez', department_id: 'DEPT006', designation_id: 5, is_active: true, phone: '0722000007', created_at: '2023-01-05T08:00:00Z', updated_at: '2023-01-05T08:00:00Z', email: 'o.martinez@example.com', department_name: initialMockDepartments.find(d => d.id === 'DEPT006')?.name, designation_title: initialMockDesignations.find(ds => ds.id === 5)?.title, display_name: 'Oscar Martinez' },
  { id: 'STF008', user_id: 'USR008', staff_no: 'EMP008', first_name: 'Phyllis', last_name: 'Vance', department_id: 'DEPT005', designation_id: 3, is_active: true, phone: '0722000008', created_at: '2023-01-06T08:00:00Z', updated_at: '2023-01-06T08:00:00Z', email: 'p.vance@example.com', department_name: initialMockDepartments.find(d => d.id === 'DEPT005')?.name, designation_title: initialMockDesignations.find(ds => ds.id === 3)?.title, display_name: 'Phyllis Vance' },
  { id: 'STF009', user_id: 'USR009', staff_no: 'EMP009', first_name: 'Erin', last_name: 'Hannon', department_id: 'DEPT002', designation_id: 7, is_active: true, phone: '0722000009', created_at: '2023-01-07T08:00:00Z', updated_at: '2023-01-07T08:00:00Z', email: 'e.hannon@example.com', department_name: initialMockDepartments.find(d => d.id === 'DEPT002')?.name, designation_title: initialMockDesignations.find(ds => ds.id === 7)?.title, display_name: 'Erin Hannon' },

  // Phase 2 Staff Additions
  { id: 'STF010', staff_no: 'EMP010', first_name: 'Thomas', last_name: 'Njoroge', department_id: 'DEPT003', designation_id: 4, is_active: true, phone: '0722000013', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Sciences', designation_title: 'Teacher', display_name: 'Thomas Njoroge' },
  { id: 'STF011', staff_no: 'EMP011', first_name: 'Grace', last_name: 'Mwema', department_id: 'DEPT003', designation_id: 3, is_active: true, phone: '0722000014', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Sciences', designation_title: 'Teacher', display_name: 'Grace Mwema' },
  { id: 'STF012', staff_no: 'EMP012', first_name: 'Elijah', last_name: 'Muthoni', department_id: 'DEPT005', designation_id: 3, is_active: true, phone: '0722000015', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Languages \u0026 Literature', designation_title: 'Teacher', display_name: 'Elijah Muthoni' },
  { id: 'STF013', staff_no: 'EMP013', first_name: 'Betty', last_name: 'Ngugi', department_id: 'DEPT001', designation_id: 3, is_active: true, phone: '0722000016', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Academics', designation_title: 'Teacher', display_name: 'Betty Ngugi' },
  { id: 'STF014', staff_no: 'EMP014', first_name: 'Anne', last_name: 'Lumumba', department_id: 'DEPT004', designation_id: 4, is_active: true, phone: '0722000017', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Humanities \u0026 Arts', designation_title: 'Teacher', display_name: 'Anne Lumumba' },
  { id: 'STF015', staff_no: 'EMP015', first_name: 'Peter', last_name: 'Omondi', department_id: 'DEPT004', designation_id: 3, is_active: true, phone: '0722000018', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Humanities \u0026 Arts', designation_title: 'Teacher', display_name: 'Peter Omondi' },
  { id: 'STF016', staff_no: 'EMP016', first_name: 'Lucy', last_name: 'Wambui', department_id: 'DEPT005', designation_id: 3, is_active: true, phone: '0722000019', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Languages \u0026 Literature', designation_title: 'Teacher', display_name: 'Lucy Wambui' },
  { id: 'STF017', staff_no: 'EMP017', first_name: 'James', last_name: 'Mwangi', department_id: 'DEPT003', designation_id: 4, is_active: true, phone: '0722000020', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Sciences', designation_title: 'Teacher', display_name: 'James Mwangi' },
  { id: 'STF018', staff_no: 'EMP018', first_name: 'Margaret', last_name: 'Wanjohi', department_id: 'DEPT001', designation_id: 4, is_active: true, phone: '0722000021', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Academics', designation_title: 'Teacher', display_name: 'Margaret Wanjohi' },
  { id: 'STF019', staff_no: 'EMP019', first_name: 'Dan', last_name: 'Kiptoo', department_id: 'DEPT006', designation_id: 5, is_active: true, phone: '0722000022', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Finance \u0026 Accounts', designation_title: 'Accountant', display_name: 'Dan Kiptoo' },
  { id: 'STF020', staff_no: 'EMP020', first_name: 'Paul', last_name: 'Kiarie', department_id: 'DEPT005', designation_id: 3, is_active: true, phone: '0722000023', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Languages \u0026 Literature', designation_title: 'Teacher', display_name: 'Paul Kiarie' },
  { id: 'STF021', staff_no: 'EMP021', first_name: 'Brenda', last_name: 'Njeri', department_id: 'DEPT007', designation_id: 9, is_active: true, phone: '0722000024', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Human Resources', designation_title: 'HR Manager', display_name: 'Brenda Njeri' },
  { id: 'STF022', staff_no: 'EMP022', first_name: 'Joel', last_name: 'Nganga', department_id: 'DEPT002', designation_id: 6, is_active: true, phone: '0722000025', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Administration', designation_title: 'Secretary', display_name: 'Joel Nganga' },
  { id: 'STF023', staff_no: 'EMP023', first_name: 'Nancy', last_name: 'Muiruri', department_id: 'DEPT002', designation_id: 6, is_active: true, phone: '0722000026', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Administration', designation_title: 'Secretary', display_name: 'Nancy Muiruri' },
  { id: 'STF024', staff_no: 'EMP024', first_name: 'Felix', last_name: 'Mutiso', department_id: 'DEPT001', designation_id: 4, is_active: true, phone: '0722000027', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Academics', designation_title: 'Teacher', display_name: 'Felix Mutiso' },
  { id: 'STF025', staff_no: 'EMP025', first_name: 'Gideon', last_name: 'Kamau', department_id: 'DEPT001', designation_id: 3, is_active: true, phone: '0722000028', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Academics', designation_title: 'Teacher', display_name: 'Gideon Kamau' },
];


// Academic Year Structures and Period Definitions
export const initialMockAcademicYearStructures: AcademicYearStructure[] = [
    { id: 1, name: 'Standard 3-Term System'},
    { id: 2, name: 'Semester System (2 Semesters)'},
];

export const initialMockAcademicPeriodDefinitions: AcademicPeriodDefinition[] = [
  { id: 1, structure_id: 1, name: 'Term 1', sequence_order: 1, structure_name: 'Standard 3-Term System' },
  { id: 2, structure_id: 1, name: 'Term 2', sequence_order: 2, structure_name: 'Standard 3-Term System' },
  { id: 3, structure_id: 1, name: 'Term 3', sequence_order: 3, structure_name: 'Standard 3-Term System' },
  { id: 4, structure_id: 2, name: 'Semester 1', sequence_order: 1, structure_name: 'Semester System (2 Semesters)' },
  { id: 5, structure_id: 2, name: 'Semester 2', sequence_order: 2, structure_name: 'Semester System (2 Semesters)' },
];

export const initialMockAcademicYears: AcademicYear[] = [
  { id: 1, name: 'AY 2022/2023', structure_id: 1, start_date: '2022-09-01', end_date: '2023-06-30', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), structure_name: 'Standard 3-Term System' },
  { id: 2, name: 'AY 2023/2024', structure_id: 1, start_date: '2023-09-01', end_date: '2024-06-30', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), structure_name: 'Standard 3-Term System' },
  { id: 3, name: 'AY 2024/2025', structure_id: 1, start_date: '2024-09-01', end_date: '2025-06-30', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), structure_name: 'Standard 3-Term System' },
  { id: 4, name: 'AY 2025/2026', structure_id: 1, start_date: '2025-09-01', end_date: '2026-06-30', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), structure_name: 'Standard 3-Term System' },
];

export const initialMockSchoolPeriods: SchoolPeriod[] = [
  // AY 2022/2023
  { id: 1, academic_year_id: 1, period_definition_id: 1, financial_year_id: 1, start_date: '2022-09-01', end_date: '2022-12-15', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 1 - AY 2022/2023', academic_year_name:'AY 2022/2023', period_definition_name: 'Term 1', financial_year_name: 'FY 2022' },
  { id: 2, academic_year_id: 1, period_definition_id: 2, financial_year_id: 1, start_date: '2023-01-08', end_date: '2023-04-05', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 2 - AY 2022/2023', academic_year_name:'AY 2022/2023', period_definition_name: 'Term 2', financial_year_name: 'FY 2022' },
  { id: 3, academic_year_id: 1, period_definition_id: 3, financial_year_id: 1, start_date: '2023-05-06', end_date: '2023-07-26', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 3 - AY 2022/2023', academic_year_name:'AY 2022/2023', period_definition_name: 'Term 3', financial_year_name: 'FY 2022' },
  
  // AY 2023/2024
  { id: 4, academic_year_id: 2, period_definition_id: 1, financial_year_id: 1, start_date: '2023-09-01', end_date: '2023-12-15', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 1 - AY 2023/2024', academic_year_name:'AY 2023/2024', period_definition_name: 'Term 1', financial_year_name: 'FY 2023' },
  { id: 5, academic_year_id: 2, period_definition_id: 2, financial_year_id: 2, start_date: '2024-01-08', end_date: '2024-04-05', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 2 - AY 2023/2024', academic_year_name:'AY 2023/2024', period_definition_name: 'Term 2', financial_year_name: 'FY 2024' },
  { id: 6, academic_year_id: 2, period_definition_id: 3, financial_year_id: 2, start_date: '2024-05-06', end_date: '2024-07-26', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 3 - AY 2023/2024', academic_year_name:'AY 2023/2024', period_definition_name: 'Term 3', financial_year_name: 'FY 2024' },
  
  // AY 2024/2025
  { id: 7, academic_year_id: 3, period_definition_id: 1, financial_year_id: 2, start_date: '2024-09-01', end_date: '2024-12-15', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 1 - AY 2024/2025', academic_year_name:'AY 2024/2025', period_definition_name: 'Term 1', financial_year_name: 'FY 2024' },
  { id: 8, academic_year_id: 3, period_definition_id: 2, financial_year_id: 3, start_date: '2025-01-08', end_date: '2025-04-05', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 2 - AY 2024/2025', academic_year_name:'AY 2024/2025', period_definition_name: 'Term 2', financial_year_name: 'FY 2025' },
  { id: 9, academic_year_id: 3, period_definition_id: 3, financial_year_id: 3, start_date: '2025-05-06', end_date: '2025-07-26', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 3 - AY 2024/2025', academic_year_name:'AY 2024/2025', period_definition_name: 'Term 3', financial_year_name: 'FY 2025' },
];

// Expanded Parents/Guardians with relationships and diversity
export const initialMockParentsGuardians: ParentsGuardian[] = [
    // Primary Parents - Mix of two-parent and single-parent families
    {id: 'PG001', name: 'William Halpert', phone: '0711223344', relationship_type: 'Father', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: 'PAR001_USR', email: 'w.halpert@email.com'},
    {id: 'PG002', name: 'Betsy Halpert', phone: '0755667788', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'b.halpert@email.com'},
    {id: 'PG003', name: 'Christina Scofield', phone: '0799887766', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'c.scofield@email.com'},
    {id: 'PG004', name: 'Frank Tancredi', phone: '0722334455', relationship_type: 'Father', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'f.tancredi@email.com'},
    {id: 'PG005', name: 'Maria Tancredi', phone: '0733445566', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'm.tancredi@email.com'},
    
    // Extended family supporting large student body
    {id: 'PG006', name: 'David Kiprotich', phone: '0744556677', relationship_type: 'Father', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'd.kiprotich@email.com'},
    {id: 'PG007', name: 'Grace Kiprotich', phone: '0755667788', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'g.kiprotich@email.com'},
    {id: 'PG008', name: 'Samuel Mwangi', phone: '0766778899', relationship_type: 'Father', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 's.mwangi@email.com'},
    {id: 'PG009', name: 'Jane Mwangi', phone: '0777889900', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'j.mwangi@email.com'},
    {id: 'PG010', name: 'Peter Ochieng', phone: '0788990011', relationship_type: 'Father', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'p.ochieng@email.com'},
    {id: 'PG011', name: 'Mary Ochieng', phone: '0799001122', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'm.ochieng@email.com'},
    {id: 'PG012', name: 'Joseph Kamau', phone: '0700112233', relationship_type: 'Father', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'j.kamau@email.com'},
    {id: 'PG013', name: 'Anne Kamau', phone: '0711223344', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'a.kamau@email.com'},
    {id: 'PG014', name: 'Robert Otieno', phone: '0722334455', relationship_type: 'Father', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'r.otieno@email.com'},
    {id: 'PG015', name: 'Lucy Otieno', phone: '0733445566', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'l.otieno@email.com'},
    {id: 'PG016', name: 'Stephen Wafula', phone: '0744556677', relationship_type: 'Father', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 's.wafula@email.com'},
    {id: 'PG017', name: 'Catherine Wafula', phone: '0755667788', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'c.wafula@email.com'},
    {id: 'PG018', name: 'George Mutua', phone: '0766778899', relationship_type: 'Father', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'g.mutua@email.com'},
    {id: 'PG019', name: 'Elizabeth Mutua', phone: '0777889900', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'e.mutua@email.com'},
    {id: 'PG020', name: 'Patrick Njoroge', phone: '0788990011', relationship_type: 'Father', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'p.njoroge@email.com'},
    
    // Single parents and guardians
    {id: 'PG021', name: 'Margaret Wanjiku', phone: '0799001122', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'm.wanjiku@email.com'},
    {id: 'PG022', name: 'Agnes Nyawira', phone: '0700112233', relationship_type: 'Guardian', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'a.nyawira@email.com'},
    {id: 'PG023', name: 'John Mwaniki', phone: '0711223344', relationship_type: 'Father', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'j.mwaniki@email.com'},
    {id: 'PG024', name: 'Susan Kariuki', phone: '0722334455', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 's.kariuki@email.com'},
    {id: 'PG025', name: 'Daniel Muturi', phone: '0733445566', relationship_type: 'Uncle', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'd.muturi@email.com'},
];

// Massive student expansion - 150+ students distributed across all forms
export const initialMockStudents: Student[] = [
    // Form 1 Students - Stream A (35 students)
    { id: 'S001', admission_no: 'ADM001', first_name: 'Jim', last_name: 'Halpert', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Jim Halpert', user_id: 'STU001_USR', email: 'j.halpert.stu@example.com', primary_guardian: initialMockParentsGuardians[0] },
    { id: 'S002', admission_no: 'ADM002', first_name: 'Michael', last_name: 'Scofield', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Michael Scofield', primary_guardian: initialMockParentsGuardians[2] },
    { id: 'S003', admission_no: 'ADM003', first_name: 'Sara', last_name: 'Tancredi', gender: PersonGender.FEMALE, current_class_stream_id: 3, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 2', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', display_name: 'Sara Tancredi', primary_guardian: initialMockParentsGuardians[3] },
    
    // Form 1A Students
    { id: 'S004', admission_no: 'ADM004', first_name: 'David', last_name: 'Kiprotich', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'David Kiprotich', primary_guardian: initialMockParentsGuardians[5] },
    { id: 'S005', admission_no: 'ADM005', first_name: 'Grace', last_name: 'Mwangi', gender: PersonGender.FEMALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Grace Mwangi', primary_guardian: initialMockParentsGuardians[8] },
    { id: 'S006', admission_no: 'ADM006', first_name: 'Peter', last_name: 'Ochieng', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Peter Ochieng', primary_guardian: initialMockParentsGuardians[9] },
    { id: 'S007', admission_no: 'ADM007', first_name: 'Mary', last_name: 'Kamau', gender: PersonGender.FEMALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Mary Kamau', primary_guardian: initialMockParentsGuardians[12] },
    { id: 'S008', admission_no: 'ADM008', first_name: 'Joseph', last_name: 'Otieno', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Joseph Otieno', primary_guardian: initialMockParentsGuardians[13] },
    { id: 'S009', admission_no: 'ADM009', first_name: 'Lucy', last_name: 'Wafula', gender: PersonGender.FEMALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Lucy Wafula', primary_guardian: initialMockParentsGuardians[16] },
    { id: 'S010', admission_no: 'ADM010', first_name: 'Stephen', last_name: 'Mutua', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Stephen Mutua', primary_guardian: initialMockParentsGuardians[17] },
    { id: 'S011', admission_no: 'ADM011', first_name: 'Elizabeth', last_name: 'Njoroge', gender: PersonGender.FEMALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Elizabeth Njoroge', primary_guardian: initialMockParentsGuardians[19] },
    { id: 'S012', admission_no: 'ADM012', first_name: 'Patrick', last_name: 'Wanjiku', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Patrick Wanjiku', primary_guardian: initialMockParentsGuardians[20] },
    
    // More Form 1A Students (completing to 35 total)
    { id: 'S013', admission_no: 'ADM013', first_name: 'Alice', last_name: 'Wanjiku', gender: PersonGender.FEMALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Alice Wanjiku', primary_guardian: initialMockParentsGuardians[20] },
    { id: 'S014', admission_no: 'ADM014', first_name: 'Brian', last_name: 'Kariuki', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Brian Kariuki', primary_guardian: initialMockParentsGuardians[23] },
    { id: 'S015', admission_no: 'ADM015', first_name: 'Christine', last_name: 'Njeri', gender: PersonGender.FEMALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Christine Njeri', primary_guardian: initialMockParentsGuardians[6] },
    { id: 'S016', admission_no: 'ADM016', first_name: 'Dennis', last_name: 'Muchiri', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Dennis Muchiri', primary_guardian: initialMockParentsGuardians[10] },
    { id: 'S017', admission_no: 'ADM017', first_name: 'Esther', last_name: 'Wangari', gender: PersonGender.FEMALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Esther Wangari', primary_guardian: initialMockParentsGuardians[14] },
    { id: 'S018', admission_no: 'ADM018', first_name: 'Felix', last_name: 'Kipchoge', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Felix Kipchoge', primary_guardian: initialMockParentsGuardians[18] },
    { id: 'S019', admission_no: 'ADM019', first_name: 'Gloria', last_name: 'Akinyi', gender: PersonGender.FEMALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Gloria Akinyi', primary_guardian: initialMockParentsGuardians[11] },
    { id: 'S020', admission_no: 'ADM020', first_name: 'Hassan', last_name: 'Omar', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Hassan Omar', primary_guardian: initialMockParentsGuardians[15] },
    { id: 'S021', admission_no: 'ADM021', first_name: 'Irene', last_name: 'Chebet', gender: PersonGender.FEMALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Irene Chebet', primary_guardian: initialMockParentsGuardians[7] },
    { id: 'S022', admission_no: 'ADM022', first_name: 'James', last_name: 'Githinji', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'James Githinji', primary_guardian: initialMockParentsGuardians[22] },
    { id: 'S023', admission_no: 'ADM023', first_name: 'Karen', last_name: 'Wanjiru', gender: PersonGender.FEMALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Karen Wanjiru', primary_guardian: initialMockParentsGuardians[24] },
    { id: 'S024', admission_no: 'ADM024', first_name: 'Leonard', last_name: 'Baraza', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Leonard Baraza', primary_guardian: initialMockParentsGuardians[1] },
    { id: 'S025', admission_no: 'ADM025', first_name: 'Mercy', last_name: 'Wambui', gender: PersonGender.FEMALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Mercy Wambui', primary_guardian: initialMockParentsGuardians[4] },
    { id: 'S026', admission_no: 'ADM026', first_name: 'Nicholas', last_name: 'Kiprotich', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Nicholas Kiprotich', primary_guardian: initialMockParentsGuardians[5] },
    { id: 'S027', admission_no: 'ADM027', first_name: 'Olivia', last_name: 'Muthoni', gender: PersonGender.FEMALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Olivia Muthoni', primary_guardian: initialMockParentsGuardians[9] },

    // Form 1B Students (35 students)
    { id: 'S028', admission_no: 'ADM028', first_name: 'Agnes', last_name: 'Nyawira', gender: PersonGender.FEMALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Agnes Nyawira', primary_guardian: initialMockParentsGuardians[21] },
    { id: 'S029', admission_no: 'ADM029', first_name: 'John', last_name: 'Mwaniki', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 2, dormitory_name: 'Twiga Block', display_name: 'John Mwaniki', primary_guardian: initialMockParentsGuardians[22] },
    { id: 'S030', admission_no: 'ADM030', first_name: 'Susan', last_name: 'Kariuki', gender: PersonGender.FEMALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Susan Kariuki', primary_guardian: initialMockParentsGuardians[23] },
    { id: 'S031', admission_no: 'ADM031', first_name: 'Daniel', last_name: 'Muturi', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 2, dormitory_name: 'Twiga Block', display_name: 'Daniel Muturi', primary_guardian: initialMockParentsGuardians[24] },
    { id: 'S032', admission_no: 'ADM032', first_name: 'Isaac', last_name: 'Kirwa', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Isaac Kirwa', primary_guardian: initialMockParentsGuardians[2] },
    { id: 'S033', admission_no: 'ADM033', first_name: 'Joy', last_name: 'Mutua', gender: PersonGender.FEMALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 2, dormitory_name: 'Twiga Block', display_name: 'Joy Mutua', primary_guardian: initialMockParentsGuardians[12] },
    { id: 'S034', admission_no: 'ADM034', first_name: 'Kevin', last_name: 'Baraza', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Kevin Baraza', primary_guardian: initialMockParentsGuardians[9] },
    { id: 'S035', admission_no: 'ADM035', first_name: 'Linda', last_name: 'Omondi', gender: PersonGender.FEMALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 2, dormitory_name: 'Twiga Block', display_name: 'Linda Omondi', primary_guardian: initialMockParentsGuardians[18] },
    { id: 'S036', admission_no: 'ADM036', first_name: 'Mark', last_name: 'Musa', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Mark Musa', primary_guardian: initialMockParentsGuardians[11] },
    { id: 'S037', admission_no: 'ADM037', first_name: 'Nancy', last_name: 'Chemutai', gender: PersonGender.FEMALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 2, dormitory_name: 'Twiga Block', display_name: 'Nancy Chemutai', primary_guardian: initialMockParentsGuardians[13] },
    { id: 'S038', admission_no: 'ADM038', first_name: 'Oscar', last_name: 'Njoroge', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Oscar Njoroge', primary_guardian: initialMockParentsGuardians[5] },
    { id: 'S039', admission_no: 'ADM039', first_name: 'Patricia', last_name: 'Otieno', gender: PersonGender.FEMALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 2, dormitory_name: 'Twiga Block', display_name: 'Patricia Otieno', primary_guardian: initialMockParentsGuardians[8] },
    { id: 'S040', admission_no: 'ADM040', first_name: 'Quincy', last_name: 'Muriuki', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Quincy Muriuki', primary_guardian: initialMockParentsGuardians[14] },
    { id: 'S041', admission_no: 'ADM041', first_name: 'Rachel', last_name: 'Kimutai', gender: PersonGender.FEMALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 2, dormitory_name: 'Twiga Block', display_name: 'Rachel Kimutai', primary_guardian: initialMockParentsGuardians[3] },
    { id: 'S042', admission_no: 'ADM042', first_name: 'Samuel', last_name: 'Kiprotich', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Samuel Kiprotich', primary_guardian: initialMockParentsGuardians[6] },
    { id: 'S043', admission_no: 'ADM043', first_name: 'Tiffany', last_name: 'Mwihaki', gender: PersonGender.FEMALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 2, dormitory_name: 'Twiga Block', display_name: 'Tiffany Mwihaki', primary_guardian: initialMockParentsGuardians[17] },
    { id: 'S044', admission_no: 'ADM044', first_name: 'Victor', last_name: 'Ndungu', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Victor Ndungu', primary_guardian: initialMockParentsGuardians[19] },
    { id: 'S045', admission_no: 'ADM045', first_name: 'Wambui', last_name: 'Kamau', gender: PersonGender.FEMALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 2, dormitory_name: 'Twiga Block', display_name: 'Wambui Kamau', primary_guardian: initialMockParentsGuardians[20] },
    { id: 'S046', admission_no: 'ADM046', first_name: 'Xavier', last_name: 'Ngugi', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Xavier Ngugi', primary_guardian: initialMockParentsGuardians[4] },
    { id: 'S047', admission_no: 'ADM047', first_name: 'Yvonne', last_name: 'Kiplangat', gender: PersonGender.FEMALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 2, dormitory_name: 'Twiga Block', display_name: 'Yvonne Kiplangat', primary_guardian: initialMockParentsGuardians[16] },
    { id: 'S048', admission_no: 'ADM048', first_name: 'Zain', last_name: 'Mwangi', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Zain Mwangi', primary_guardian: initialMockParentsGuardians[1] },
    
    // Form 2A Students (40 students)
    { id: 'S049', admission_no: 'ADM049', first_name: 'Catherine', last_name: 'Kimani', gender: PersonGender.FEMALE, current_class_stream_id: 3, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 2', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Catherine Kimani', primary_guardian: initialMockParentsGuardians[5] },
    { id: 'S050', admission_no: 'ADM050', first_name: 'George', last_name: 'Macharia', gender: PersonGender.MALE, current_class_stream_id: 3, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 2', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'George Macharia', primary_guardian: initialMockParentsGuardians[7] },
    { id: 'S051', admission_no: 'ADM051', first_name: 'Faith', last_name: 'Wanjiru', gender: PersonGender.FEMALE, current_class_stream_id: 3, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 2', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Faith Wanjiru', primary_guardian: initialMockParentsGuardians[11] },
    { id: 'S052', admission_no: 'ADM052', first_name: 'Samuel', last_name: 'Gitonga', gender: PersonGender.MALE, current_class_stream_id: 3, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 2', current_class_stream_name: 'A', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Samuel Gitonga', primary_guardian: initialMockParentsGuardians[15] },
];

export const initialMockClasses: Class[] = [
  { id: 1, name: 'Form 1' }, { id: 2, name: 'Form 2' }, { id: 3, name: 'Form 3'}, { id: 4, name: 'Form 4'},
];

export const initialMockClassStreams: ClassStream[] = [
  { id: 1, class_id: 1, name: 'A', class_teacher_id: 'STF013', class_name: 'Form 1', class_teacher_name: 'Betty Ngugi' },
  { id: 2, class_id: 1, name: 'B', class_teacher_id: 'STF020', class_name: 'Form 1', class_teacher_name: 'Paul Kiarie' },
  { id: 3, class_id: 2, name: 'A', class_teacher_id: 'STF016', class_name: 'Form 2', class_teacher_name: 'Lucy Wambui' },
  { id: 4, class_id: 2, name: 'B', class_teacher_id: 'STF015', class_name: 'Form 2', class_teacher_name: 'Peter Omondi' },
  { id: 5, class_id: 3, name: 'North', class_teacher_id: 'STF011', class_name: 'Form 3', class_teacher_name: 'Grace Mwema'},
  { id: 6, class_id: 4, name: 'East', class_teacher_id: 'STF017', class_name: 'Form 4', class_teacher_name: 'James Mwangi'},
];
initialMockClasses.forEach(cls => { (cls as any).streams = initialMockClassStreams.filter(cs => cs.class_id === cls.id); });

export const initialMockStudentCategories: StudentCategory[] = [ { id: 1, name: 'Boarder' }, { id: 2, name: 'Day Scholar' }, { id: 3, name: 'Special Needs' }, ];
export const initialMockDormitories: Dormitory[] = [
    { id: 1, name: 'Simba House', master_id: 'STF002', master_name: 'Dwight Schrute', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    { id: 2, name: 'Twiga Block', master_id: 'STF005', master_name: 'Kevin Malone', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
];
export const initialMockWorkflows = [
    {
        id: 1,
        name: 'Store Requisition Approval',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        states: [
            { id: 1, workflow_id: 1, name: 'Draft', sequence_order: 1 },
            { id: 2, workflow_id: 1, name: 'Pending HOD Approval', sequence_order: 2 },
            { id: 3, workflow_id: 1, name: 'Pending Store Approval', sequence_order: 3 },
            { id: 4, workflow_id: 1, name: 'Approved & Issued', sequence_order: 4 },
            { id: 5, workflow_id: 1, name: 'Rejected', sequence_order: 5 },
        ]
    },
    {
        id: 2,
        name: 'Expense Claim Approval',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        states: [
            { id: 6, workflow_id: 2, name: 'Draft', sequence_order: 1 },
            { id: 7, workflow_id: 2, name: 'Pending Accounts Approval', sequence_order: 2 },
            { id: 8, workflow_id: 2, name: 'Approved for Payment', sequence_order: 3 },
            { id: 9, workflow_id: 2, name: 'Paid', sequence_order: 4 },
            { id: 10, workflow_id: 2, name: 'Rejected', sequence_order: 5 },
        ]
    }
];

// Administration-specific mock data
export const initialMockPartners: AdminPartnerType[] = [
  // Government Agencies
  {
    id: 'PART001',
    name: 'Ministry of Education Kenya',
    partner_type: PartnerType.GOVERNMENT_AGENCY,
    contact_person: 'Dr. Jane Mwangi',
    email: 'j.mwangi@education.go.ke',
    phone: '+254-722-555-001',
    address: 'P.O. Box 200-00100, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'PART002',
    name: 'County Education Office',
    partner_type: PartnerType.GOVERNMENT_AGENCY,
    contact_person: 'Mr. David Kiprotich',
    email: 'd.kiprotich@county.go.ke',
    phone: '+254-733-555-002',
    address: 'County Headquarters, Nakuru',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'PART003',
    name: 'Teachers Service Commission',
    partner_type: PartnerType.GOVERNMENT_AGENCY,
    contact_person: 'Mrs. Grace Wanjiku',
    email: 'g.wanjiku@tsc.go.ke',
    phone: '+254-744-555-003',
    address: 'Upper Hill, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Sponsors
  {
    id: 'PART004',
    name: 'Community Trust Foundation',
    partner_type: PartnerType.SPONSOR,
    contact_person: 'Sarah Williams',
    email: 's.williams@ctf.org',
    phone: '+254-755-555-004',
    address: 'Karen, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'PART005',
    name: 'Equity Bank Foundation',
    partner_type: PartnerType.SPONSOR,
    contact_person: 'Dr. James Mwangi',
    email: 'j.mwangi@equitybank.co.ke',
    phone: '+254-766-555-005',
    address: 'Hospital Road, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'PART006',
    name: 'Safaricom Foundation',
    partner_type: PartnerType.SPONSOR,
    contact_person: 'Ms. Mary Kinya',
    email: 'm.kinya@safaricom.co.ke',
    phone: '+254-777-555-006',
    address: 'Westlands, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Service Providers
  {
    id: 'PART007',
    name: 'TechCorp Solutions',
    partner_type: PartnerType.SERVICE_PROVIDER,
    contact_person: 'Michael Johnson',
    email: 'm.johnson@techcorp.com',
    phone: '+254-788-555-007',
    address: 'Westlands, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'PART008',
    name: 'Secure Guard Services',
    partner_type: PartnerType.SERVICE_PROVIDER,
    contact_person: 'Captain Robert Otieno',
    email: 'r.otieno@secureguard.co.ke',
    phone: '+254-799-555-008',
    address: 'Industrial Area, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'PART009',
    name: 'Fresh Foods Catering',
    partner_type: PartnerType.SERVICE_PROVIDER,
    contact_person: 'Mrs. Ann Njeri',
    email: 'a.njeri@freshfoods.co.ke',
    phone: '+254-700-555-009',
    address: 'Kiambu Road, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'PART010',
    name: 'School Transport Services',
    partner_type: PartnerType.SERVICE_PROVIDER,
    contact_person: 'Mr. Peter Mwangi',
    email: 'p.mwangi@schooltransport.co.ke',
    phone: '+254-711-555-010',
    address: 'Thika Road, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Board Members
  {
    id: 'PART011',
    name: 'Dr. Catherine Nderitu',
    partner_type: PartnerType.BOARD_MEMBER,
    contact_person: 'Dr. Catherine Nderitu',
    email: 'c.nderitu@gmail.com',
    phone: '+254-722-555-011',
    address: 'Kileleshwa, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'PART012',
    name: 'Rev. Samuel Kiptoo',
    partner_type: PartnerType.BOARD_MEMBER,
    contact_person: 'Rev. Samuel Kiptoo',
    email: 's.kiptoo@church.org',
    phone: '+254-733-555-012',
    address: 'Eldoret, Kenya',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'PART013',
    name: 'Eng. Moses Wafula',
    partner_type: PartnerType.BOARD_MEMBER,
    contact_person: 'Eng. Moses Wafula',
    email: 'm.wafula@engineer.com',
    phone: '+254-744-555-013',
    address: 'Bungoma, Kenya',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Alumni Association
  {
    id: 'PART014',
    name: 'Greenwood Alumni Association',
    partner_type: PartnerType.OTHER,
    contact_person: 'Mr. John Kamau',
    email: 'j.kamau@greenwoodalumni.org',
    phone: '+254-755-555-014',
    address: 'Alumni House, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Community Leaders
  {
    id: 'PART015',
    name: 'Chief Mary Wanjiru',
    partner_type: PartnerType.OTHER,
    contact_person: 'Chief Mary Wanjiru',
    email: 'm.wanjiru@chief.go.ke',
    phone: '+254-766-555-015',
    address: 'Kiambu County',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Religious Organizations
  {
    id: 'PART016',
    name: 'St. Peters Catholic Church',
    partner_type: PartnerType.SPONSOR,
    contact_person: 'Father Michael Ochieng',
    email: 'm.ochieng@stpeters.org',
    phone: '+254-777-555-016',
    address: 'Karen, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // NGOs
  {
    id: 'PART017',
    name: 'World Vision Kenya',
    partner_type: PartnerType.SPONSOR,
    contact_person: 'Ms. Grace Mutua',
    email: 'g.mutua@worldvision.org',
    phone: '+254-788-555-017',
    address: 'Lavington, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Local Businesses
  {
    id: 'PART018',
    name: 'Nakumatt Holdings',
    partner_type: PartnerType.SPONSOR,
    contact_person: 'Mr. Atul Shah',
    email: 'a.shah@nakumatt.net',
    phone: '+254-799-555-018',
    address: 'Westlands, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Professional Services
  {
    id: 'PART019',
    name: 'KPMG Kenya',
    partner_type: PartnerType.SERVICE_PROVIDER,
    contact_person: 'Mr. Samson Omondi',
    email: 's.omondi@kpmg.co.ke',
    phone: '+254-700-555-019',
    address: 'Upper Hill, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Insurance Companies
  {
    id: 'PART020',
    name: 'Jubilee Insurance',
    partner_type: PartnerType.SERVICE_PROVIDER,
    contact_person: 'Mrs. Susan Mbugua',
    email: 's.mbugua@jubilee.co.ke',
    phone: '+254-711-555-020',
    address: 'Mama Ngina Street, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const initialMockClubsAndSocieties: AdminClubAndSocietyType[] = [
  {
    id: 1,
    name: 'Science Club',
    type: ClubType.CLUB,
    patron_id: 'STF002',
    patron_name: 'Dwight Schrute',
    description: 'Promoting scientific inquiry and experimentation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Drama Society',
    type: ClubType.SOCIETY,
    patron_id: 'STF008',
    patron_name: 'Phyllis Vance',
    description: 'Theatre arts and performance',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Basketball Team',
    type: ClubType.SPORTS_TEAM,
    patron_id: 'STF005',
    patron_name: 'Kevin Malone',
    description: 'School basketball team',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const initialMockCustomers: AdminCustomerType[] = [
  {
    id: 1,
    name: 'Uniforms Direct Ltd',
    phone: '+254-711-444-001',
    email: 'orders@uniformsdirect.co.ke',
    address: 'Industrial Area, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Stationery World',
    phone: '+254-722-444-002',
    email: 'sales@stationeryworld.com',
    address: 'CBD, Nairobi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const initialMockStudentHealthRecords: AdminStudentHealthRecordType[] = [
  {
    id: 'SHR001',
    student_id: 'S001',
    student_name: 'Jim Halpert',
    blood_type: 'O+',
    allergies: 'None',
    medical_conditions: 'None',
    emergency_contact_override: '+254-711-999-001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'SHR002',
    student_id: 'S002',
    student_name: 'Michael Scofield',
    blood_type: 'A+',
    allergies: 'Peanuts',
    medical_conditions: 'Asthma',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const initialMockStudentAttendance: AdminStudentAttendanceType[] = [
  {
    id: 'ATT001',
    student_id: 'S001',
    student_name: 'Jim Halpert',
    period_id: 1,
    period_name: 'Period 1',
    date: new Date().toISOString().split('T')[0],
    status: AttendanceStatus.PRESENT,
    created_at: new Date().toISOString()
  },
  {
    id: 'ATT002',
    student_id: 'S002',
    student_name: 'Michael Scofield',
    period_id: 1,
    period_name: 'Period 1',
    date: new Date().toISOString().split('T')[0],
    status: AttendanceStatus.LATE,
    reason_for_absence: 'Traffic jam',
    created_at: new Date().toISOString()
  }
];

export const initialMockTemplateComms: AdminTemplateCommType[] = [
  {
    id: 1,
    name: 'Welcome Message',
    type: TemplateType.SMS,
    subject: 'Welcome to Greenwood High',
    body_template: 'Welcome {{student_name}} to Greenwood High International School. We are excited to have you join our community!',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Fee Reminder',
    type: TemplateType.EMAIL,
    subject: 'Fee Payment Reminder',
    body_template: 'Dear {{parent_name}}, this is a reminder that the school fees for {{student_name}} are due on {{due_date}}.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const initialMockCampaigns: AdminCampaignType[] = [
  {
    id: 'CAMP001',
    name: 'New Term Welcome',
    template_id: 1,
    template_name: 'Welcome Message',
    subject: 'Welcome to New Term',
    body: 'Welcome to the new academic term at Greenwood High!',
    status: CampaignStatus.SENT,
    target_audience_type: CampaignAudienceType.ALL_STUDENTS,
    target_audience_display: 'All Students',
    sent_at: new Date().toISOString(),
    created_by: 'STF001_USR',
    created_by_name: 'Michael Scott',
    approved_by: 'STF001_USR',
    approved_by_name: 'Michael Scott',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Ensure all AppDataType keys for administration are exported
export const departments = initialMockDepartments;
export const designations = initialMockDesignations;
export const staff = initialMockStaff;
export const students = initialMockStudents;
export const customers = initialMockCustomers;
export const users = initialMockUsers;
export const roles = initialMockRoles;
export const academicYears = initialMockAcademicYears;
export const schoolPeriods = initialMockSchoolPeriods;
export const academicYearStructures = initialMockAcademicYearStructures;
export const academicPeriodDefinitions = initialMockAcademicPeriodDefinitions;
export const studentCategories = initialMockStudentCategories;
export const dormitories = initialMockDormitories;
export const classes = initialMockClasses;
export const classStreams = initialMockClassStreams;
export const parentsGuardians = initialMockParentsGuardians;

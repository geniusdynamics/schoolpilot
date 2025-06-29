// src/modules/administration/data/mockData.ts
import {
  User, Role, Department, Designation, StudentCategory, Dormitory,
  Class, ClassStream, Student, ParentsGuardian, SchoolDetails, Staff,
  AcademicYear, SchoolPeriod, AcademicYearStructure, AcademicPeriodDefinition,
  FinancialYear, FinancialYearStatus,
  UserType, PersonGender, StudentStatus
} from '../../../core/types';

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
  { id: 'USR_MOCK_ADMIN', username: 'admin_user', email: 'admin@example.com', user_type: UserType.STAFF, is_active: true, role_id: 1, role: 'Administrator', display_name: 'Admin User', created_at: '2023-01-01T08:00:00Z', updated_at: '2023-01-01T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'STF001_USR', username: 'mscott', email: 'm.scott@example.com', user_type: UserType.STAFF, is_active: true, role_id: 1, role: 'Administrator', display_name: 'Michael Scott', created_at: '2023-01-02T08:00:00Z', updated_at: '2023-01-02T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'STF002_USR', username: 'dschrute', email: 'd.schrute@example.com', user_type: UserType.STAFF, is_active: true, role_id: 2, role: 'Teacher', display_name: 'Dwight Schrute', created_at: '2023-01-03T08:00:00Z', updated_at: '2023-01-03T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'STF003_USR', username: 'pbeesly', email: 'p.beesly@example.com', user_type: UserType.STAFF, is_active: true, role_id: 6, role: 'Inventory Manager', display_name: 'Pam Beesly', created_at: '2023-01-04T08:00:00Z', updated_at: '2023-01-04T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'USR007', username: 'omartinez', email: 'o.martinez@example.com', user_type: UserType.STAFF, is_active: true, role_id: 3, role: 'Accountant', display_name: 'Oscar Martinez', created_at: '2023-01-05T08:00:00Z', updated_at: '2023-01-05T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'USR008', username: 'pvance', email: 'p.vance@example.com', user_type: UserType.STAFF, is_active: true, role_id: 2, role: 'Teacher', display_name: 'Phyllis Vance', created_at: '2023-01-06T08:00:00Z', updated_at: '2023-01-06T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'USR009', username: 'ehannon', email: 'e.hannon@example.com', user_type: UserType.STAFF, is_active: true, role_id: 4, role: 'Librarian', display_name: 'Erin Hannon', created_at: '2023-01-07T08:00:00Z', updated_at: '2023-01-07T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'USR010', username: 'tflenderson', email: 't.flenderson@example.com', user_type: UserType.STAFF, is_active: true, role_id: 5, role: 'HR Manager', display_name: 'Toby Flenderson', created_at: '2023-01-08T08:00:00Z', updated_at: '2023-01-08T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'STU001_USR', username: 'jhalpert_stu', email: 'j.halpert.stu@example.com', user_type: UserType.STUDENT, is_active: true, role_id: 8, role: 'Student', display_name: 'Jim Halpert (Student)', created_at: '2023-01-09T08:00:00Z', updated_at: '2023-01-09T08:00:00Z', hashed_password: 'mockhashedpassword' },
  { id: 'PAR001_USR', username: 'cbeesly_par', email: 'c.beesly.par@example.com', user_type: UserType.PARENT, is_active: true, role_id: 7, role: 'Parent', display_name: 'Cece Beesly (Parent)', created_at: '2023-01-10T08:00:00Z', updated_at: '2023-01-10T08:00:00Z', hashed_password: 'mockhashedpassword' },
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
];

export const initialMockStaff: Staff[] = [
  { id: 'STF001', user_id: 'STF001_USR', staff_no: 'EMP001', first_name: 'Michael', last_name: 'Scott', department_id: 'DEPT002', designation_id: 1, is_active: true, phone: '0722000001', created_at: '2023-01-02T08:00:00Z', updated_at: '2023-01-02T08:00:00Z', email: 'm.scott@example.com', department_name: initialMockDepartments.find(d=>d.id==='DEPT002')?.name, designation_title: initialMockDesignations.find(ds=>ds.id===1)?.title, display_name: 'Michael Scott' },
  { id: 'STF002', user_id: 'STF002_USR', staff_no: 'EMP002', first_name: 'Dwight', last_name: 'Schrute', department_id: 'DEPT003', designation_id: 4, is_active: true, phone: '0722000002', created_at: '2023-01-03T08:00:00Z', updated_at: '2023-01-03T08:00:00Z', email: 'd.schrute@example.com', department_name: initialMockDepartments.find(d=>d.id==='DEPT003')?.name, designation_title: initialMockDesignations.find(ds=>ds.id===4)?.title, hod_of_department_id: 'DEPT003', hod_of_department_name: initialMockDepartments.find(d=>d.id==='DEPT003')?.name, display_name: 'Dwight Schrute' },
  { id: 'STF003', user_id: 'STF003_USR', staff_no: 'EMP003', first_name: 'Pam', last_name: 'Beesly', department_id: 'DEPT002', designation_id: 6, is_active: true, phone: '0722000003', created_at: '2023-01-04T08:00:00Z', updated_at: '2023-01-04T08:00:00Z', email: 'p.beesly@example.com', department_name: initialMockDepartments.find(d=>d.id==='DEPT002')?.name, designation_title: initialMockDesignations.find(ds=>ds.id===6)?.title, display_name: 'Pam Beesly' },
  { id: 'STF004', staff_no: 'EMP004', first_name: 'Angela', last_name: 'Martin', department_id: 'DEPT006', designation_id: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Finance & Accounts', designation_title: 'Accountant', display_name: 'Angela Martin', hod_of_department_id: 'DEPT006' },
  { id: 'STF005', staff_no: 'EMP005', first_name: 'Kevin', last_name: 'Malone', department_id: 'DEPT001', designation_id: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Academics', designation_title: 'Teacher', display_name: 'Kevin Malone' },
  { id: 'STF006', staff_no: 'EMP006', first_name: 'Toby', last_name: 'Flenderson', department_id: 'DEPT007', designation_id: 9, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Human Resources', designation_title: 'HR Manager', display_name: 'Toby Flenderson' },
  { id: 'STF007', user_id: 'USR007', staff_no: 'EMP007', first_name: 'Oscar', last_name: 'Martinez', department_id: 'DEPT006', designation_id: 5, is_active: true, phone: '0722000007', created_at: '2023-01-05T08:00:00Z', updated_at: '2023-01-05T08:00:00Z', email: 'o.martinez@example.com', department_name: initialMockDepartments.find(d=>d.id==='DEPT006')?.name, designation_title: initialMockDesignations.find(ds=>ds.id===5)?.title, display_name: 'Oscar Martinez' },
  { id: 'STF008', user_id: 'USR008', staff_no: 'EMP008', first_name: 'Phyllis', last_name: 'Vance', department_id: 'DEPT005', designation_id: 3, is_active: true, phone: '0722000008', created_at: '2023-01-06T08:00:00Z', updated_at: '2023-01-06T08:00:00Z', email: 'p.vance@example.com', department_name: initialMockDepartments.find(d=>d.id==='DEPT005')?.name, designation_title: initialMockDesignations.find(ds=>ds.id===3)?.title, display_name: 'Phyllis Vance' },
  { id: 'STF009', user_id: 'USR009', staff_no: 'EMP009', first_name: 'Erin', last_name: 'Hannon', department_id: 'DEPT002', designation_id: 7, is_active: true, phone: '0722000009', created_at: '2023-01-07T08:00:00Z', updated_at: '2023-01-07T08:00:00Z', email: 'e.hannon@example.com', department_name: initialMockDepartments.find(d=>d.id==='DEPT002')?.name, designation_title: initialMockDesignations.find(ds=>ds.id===7)?.title, display_name: 'Erin Hannon' },
];

export const initialMockParentsGuardians: ParentsGuardian[] = [
    {id: 'PG001', name: 'William Halpert', phone: '0711223344', relationship_type: 'Father', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: 'PAR001_USR'},
    {id: 'PG002', name: 'Betsy Halpert', phone: '0755667788', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'PG003', name: 'Christina Scofield', phone: '0799887766', relationship_type: 'Mother', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
];

export const initialMockStudents: Student[] = [
    { id: 'S001', admission_no: 'ADM001', first_name: 'Jim', last_name: 'Halpert', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Jim Halpert', user_id: 'STU001_USR', email: 'j.halpert.stu@example.com', primary_guardian: initialMockParentsGuardians[0] },
    { id: 'S002', admission_no: 'ADM002', first_name: 'Michael', last_name: 'Scofield', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Michael Scofield', primary_guardian: initialMockParentsGuardians[2] },
    { id: 'S003', admission_no: 'ADM003', first_name: 'Sara', last_name: 'Tancredi', gender: PersonGender.FEMALE, current_class_stream_id: 3, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 2', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', display_name: 'Sara Tancredi' },
];

export const initialMockClasses: Class[] = [
  { id: 1, name: 'Form 1' }, { id: 2, name: 'Form 2' }, { id: 3, name: 'Form 3'}, { id: 4, name: 'Form 4'},
];

export const initialMockClassStreams: ClassStream[] = [
  { id: 1, class_id: 1, name: 'A', class_teacher_id: 'STF002', class_name: 'Form 1', class_teacher_name: 'Dwight Schrute' },
  { id: 2, class_id: 1, name: 'B', class_teacher_id: 'STF005', class_name: 'Form 1', class_teacher_name: 'Kevin Malone' },
  { id: 3, class_id: 2, name: 'A', class_teacher_id: 'STF008', class_name: 'Form 2', class_teacher_name: 'Phyllis Vance' },
  { id: 4, class_id: 2, name: 'B', class_teacher_id: 'STF001', class_name: 'Form 2', class_teacher_name: 'Michael Scott' },
  { id: 5, class_id: 3, name: 'North', class_teacher_id: 'STF002', class_name: 'Form 3', class_teacher_name: 'Dwight Schrute'},
  { id: 6, class_id: 4, name: 'East', class_teacher_id: 'STF005', class_name: 'Form 4', class_teacher_name: 'Kevin Malone'},
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
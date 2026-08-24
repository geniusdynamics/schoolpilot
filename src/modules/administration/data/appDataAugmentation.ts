// ABOUTME: TypeScript module augmentation for Administration collections in AppData
// ABOUTME: Extends AppDataType and AppDataContextType with administration-specific properties
// ABOUTME: This is the compile-time equivalent of Frappe's DocType self-registration

import type {
  AcademicYearStructure,
  AcademicPeriodDefinition,
  AcademicYear,
  SchoolPeriod,
  Student,
  Staff,
  ParentsGuardian,
  Class,
  ClassStream,
  Department,
  Designation,
  StudentCategory,
  Dormitory,
  TimetablePeriodDef,
  StudentAttendance,
  AdminPartnerType,
  AdminClubAndSocietyType,
  AdminCustomerType,
  AdminStudentHealthRecordType,
  AdminTemplateCommType,
  AdminCampaignType,
} from './types';

declare module '@/core/types' {
  export interface AppDataType {
    // Core administration entities
    students: Student[];
    staff: Staff[];
    classes: Class[];
    classStreams: ClassStream[];
    departments: Department[];
    designations: Designation[];
    studentCategories: StudentCategory[];
    dormitories: Dormitory[];
    parentsGuardians: ParentsGuardian[];
    academicYears: AcademicYear[];
    schoolPeriods: SchoolPeriod[];
    academicYearStructures: AcademicYearStructure[];
    academicPeriodDefinitions: AcademicPeriodDefinition[];
    timetablePeriodDefs: TimetablePeriodDef[];
    // Administration-specific entities
    partners: AdminPartnerType[];
    clubs: AdminClubAndSocietyType[];
    customers: AdminCustomerType[];
    studentHealthRecords: AdminStudentHealthRecordType[];
    studentAttendance: StudentAttendance[];
    templatesComm: AdminTemplateCommType[];
    campaigns: AdminCampaignType[];
    // Report / View collections
    staffAttendanceRecords: any[];
    staffIDCards: any[];
    studentBioData: any[];
    studentIDCards: any[];
    transferCertificateStudents: any[];
  }

  export interface AppDataContextType {
    // Student CRUD
    addStudent: (
      data: Omit<Student, 'id' | 'created_at' | 'updated_at'>,
      guardian?: { name: string; phone?: string; relationship_type: string; id?: string }
    ) => Promise<Student>;
    updateStudent: (
      id: string,
      data: Partial<Student>,
      guardian?: { name: string; phone?: string; relationship_type: string; id?: string }
    ) => Promise<Student>;
    deleteStudent: (id: string) => Promise<void>;
    // Staff CRUD
    addStaff: (data: Omit<Staff, 'id'>) => Promise<Staff>;
    updateStaff: (id: string, data: Partial<Staff>) => Promise<Staff>;
    deleteStaff: (id: string) => Promise<void>;
    // Class CRUD
    addClass: (data: Omit<Class, 'id' | 'created_at' | 'updated_at'>) => Promise<Class>;
    updateClass: (id: string, data: Partial<Class>) => Promise<Class>;
    deleteClass: (id: string) => Promise<void>;
    // Class Stream CRUD
    addClassStream: (data: Omit<ClassStream, 'id' | 'created_at' | 'updated_at'>) => Promise<ClassStream>;
    updateClassStream: (id: string, data: Partial<ClassStream>) => Promise<ClassStream>;
    deleteClassStream: (id: string) => Promise<void>;
    // Department CRUD
    addDepartment: (data: Omit<Department, 'id'>) => Promise<Department>;
    updateDepartment: (id: string, data: Partial<Department>) => Promise<Department>;
    deleteDepartment: (id: string) => Promise<void>;
    // Academic Year CRUD
    addAcademicYear: (data: any) => Promise<any>;
    updateAcademicYear: (id: string, data: any) => Promise<any>;
    deleteAcademicYear: (id: string) => Promise<void>;
    // Academic Period Definition CRUD
    addAcademicPeriodDefinition: (data: any) => Promise<any>;
    updateAcademicPeriodDefinition: (id: string, data: any) => Promise<any>;
    deleteAcademicPeriodDefinition: (id: string) => Promise<void>;
    academicPeriodDefinitions: any[];
    // Partner CRUD
    addPartner: (data: any) => Promise<void>;
    updatePartner: (data: any) => Promise<void>;
    deletePartner: (id: string) => Promise<void>;
    // Club CRUD
    addClub: (data: any) => Promise<void>;
    updateClub: (data: any) => Promise<void>;
    deleteClub: (id: number) => Promise<void>;
    // Customer CRUD
    addCustomer: (data: any) => Promise<void>;
    updateCustomer: (data: any) => Promise<void>;
    deleteCustomer: (id: number) => Promise<void>;
    // Student Health Record CRUD
    addStudentHealthRecord: (data: any) => Promise<void>;
    updateStudentHealthRecord: (data: any) => Promise<void>;
    deleteStudentHealthRecord: (id: string) => Promise<void>;
    // Communication Templates CRUD
    addTemplateComm: (template: any) => Promise<void>;
    updateTemplateComm: (template: any) => Promise<void>;
    deleteTemplateComm: (id: number) => Promise<void>;
    // Campaign CRUD
    addCampaign: (campaign: any) => Promise<void>;
    updateCampaign: (campaign: any) => Promise<void>;
    deleteCampaign: (id: string) => Promise<void>;
    // School Period CRUD
    addSchoolPeriod: (period: any) => Promise<void>;
    updateSchoolPeriod: (period: any) => Promise<void>;
    deleteSchoolPeriod: (id: number) => Promise<void>;
    // Timetable Period Def CRUD
    addTimetablePeriodDef: (periodDef: any) => Promise<void>;
    updateTimetablePeriodDef: (periodDef: any) => Promise<void>;
    deleteTimetablePeriodDef: (id: number) => Promise<void>;
    // Attendance functions
    saveStudentAttendance: (records: any[]) => Promise<void>;
    getStudentAttendanceByFilters: (date: string, classStreamId: number, periodId: number) => any[];
    getTimetablePeriodDefs: () => TimetablePeriodDef[];
  }
}

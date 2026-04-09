// ABOUTME: Administration Module Collection Configuration
import type { ModuleCollectionsConfig } from '@/core/types/moduleCollections';

export const administrationModuleCollections: ModuleCollectionsConfig = {
  moduleName: 'administration',
  aliases: {
    // Core entities
    students: 'students',
    staff: 'staff',
    parents_guardians: 'parentsGuardians',
    
    // Class structure
    classes: 'classes',
    class_streams: 'classStreams',
    student_categories: 'studentCategories',
    
    // School structure
    departments: 'departments',
    designations: 'designations',
    dormitories: 'dormitories',
    
    // Academic
    academic_years: 'academicYears',
    school_periods: 'schoolPeriods',
    academic_year_structures: 'academicYearStructures',
    academic_period_definitions: 'academicPeriodDefinitions',
    
    // Co-curricular
    partners: 'partners',
    clubs: 'clubs',
    customers: 'customers',
    
    // Student records
    student_health_records: 'studentHealthRecords',
    student_attendance: 'studentAttendance',
    timetable_period_defs: 'timetablePeriodDefs',
    
    // Communication
    templates_comm: 'templatesComm',
    campaigns: 'campaigns',
    
    // Discipline
    disciplinary_cases: 'disciplinaryCases',
    disciplinary_records: 'disciplinaryRecords',
    
    // Clearance
    student_clearances: 'studentClearances',
    student_clearance_requests: 'studentClearanceRequests',
    
    // Imports
    student_import_sessions: 'studentImportSessions',
    student_import_records: 'studentImportRecords',
  },
};

export default administrationModuleCollections;

// ABOUTME: Dynamically loads and aggregates all modular mock data for the app.
// ABOUTME: Used as the only source of mock data for AppDataContext in mock/demo mode.
// ABOUTME: Delegates CRUD operations to module-specific hooks to respect modular architecture.

import { useState, useEffect } from 'react';
import type { AppDataType, AppDataContextType, AppDataLoadingStates } from '../core/types';

// Import module-specific hooks to get live data
import { usePartnerData } from '../modules/administration/data/usePartnerData';
import { useCustomerData } from '../modules/administration/data/useCustomerData';
import { useClubAndSocietyData } from '../modules/administration/data/useClubAndSocietyData';
import { useStudentHealthRecordData } from '../modules/administration/data/useStudentHealthRecordData';
import { useStudentAttendanceData } from '../modules/administration/data/useStudentAttendanceData';
import { useTemplateCommData } from '../modules/administration/data/useTemplateCommData';
import { useCampaignData } from '../modules/administration/data/useCampaignData';
import { useSchoolPeriodData } from '../modules/administration/data/useSchoolPeriodData';
import { useAcademicYearData } from '../modules/administration/data/useAcademicYearData';
import { useAcademicPeriodDefinitionData } from '../modules/administration/data/useAcademicPeriodDefinitionData';
import { useDesignationData } from '../modules/administration/data/useDesignationData';
import { useTimetablePeriodDefData } from '../modules/academics/data/useTimetablePeriodDefData';
import { useFinancialYearData } from '../modules/finance/data/useFinancialYearData';
import { useDepartmentData } from '../modules/administration/data/useDepartmentData';
import { useSubjectData } from '../modules/academics/data/useSubjectData';
import { useTimetableEntryData } from '../modules/academics/data/useTimetableEntryData';
import { useTeacherSubjectAssignmentData } from '../modules/academics/data/useTeacherSubjectAssignmentData';
import { useClassSubjectAllocationData } from '../modules/academics/data/useClassSubjectAllocationData';
import { useClassData } from '../modules/administration/data/useClassData';
import { useClassStreamData } from '../modules/administration/data/useClassStreamData';

// Dynamically import all mockData.ts files from modules for fallback data
const mockDataModules = import.meta.glob('../modules/*/data/mockData.ts', { eager: true });

// Aggregate all exported mock data into a single object for fallback
const rawInitialData: Partial<AppDataType> = {};
for (const mod of Object.values(mockDataModules)) {
  if (typeof mod === 'object' && mod !== null) {
    Object.entries(mod).forEach(([key, value]) => {
      // Only add if not already present (last-in wins for duplicate keys)
      rawInitialData[key as keyof AppDataType] = value;
    });
  }
}

// Helper to create loading states for all entities
const createLoadingStates = (): AppDataLoadingStates => {
  const keys = Object.keys(rawInitialData) as Array<keyof AppDataType>;
  const states = keys.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {} as Record<keyof AppDataType, boolean>);
  return { ...states, all: true };
};

// Dynamically collect all keys from all loaded mockData modules
const allMockKeys = Array.from(
  new Set(
    Object.values(mockDataModules)
      .flatMap(mod => (typeof mod === 'object' && mod !== null ? Object.keys(mod) : []))
  )
);

// Helper to determine if a value is an array (for defaulting to [])
const isArrayType = (val: any) => Array.isArray(val);

export const useModularMockData = (): AppDataContextType => {
  // Use module-specific hooks to get live data
  const { partners, addPartner, updatePartner, deletePartner } = usePartnerData();
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomerData();
  const { clubsAndSocieties, addClubAndSociety, updateClubAndSociety, deleteClubAndSociety } = useClubAndSocietyData();
  const { studentHealthRecords, addStudentHealthRecord, updateStudentHealthRecord, deleteStudentHealthRecord } = useStudentHealthRecordData();
  const { studentAttendance, addStudentAttendance, updateStudentAttendance, deleteStudentAttendance } = useStudentAttendanceData();
  const { templateComms, addTemplateComm, updateTemplateComm, deleteTemplateComm } = useTemplateCommData();
  const { campaigns, addCampaign, updateCampaign, deleteCampaign } = useCampaignData();
  const { schoolPeriods, addSchoolPeriod, updateSchoolPeriod, deleteSchoolPeriod } = useSchoolPeriodData();
  const { academicYears, addAcademicYear, updateAcademicYear, deleteAcademicYear } = useAcademicYearData();
  const { academicPeriodDefinitions, addAcademicPeriodDefinition, updateAcademicPeriodDefinition, deleteAcademicPeriodDefinition } = useAcademicPeriodDefinitionData();
  const { designations, addDesignation, updateDesignation, deleteDesignation } = useDesignationData();
  const { data: timetablePeriodDefs, create: addTimetablePeriodDef, update: updateTimetablePeriodDef, remove: deleteTimetablePeriodDef } = useTimetablePeriodDefData();
  const { data: financialYears, create: addFinancialYear, update: updateFinancialYear, remove: deleteFinancialYear } = useFinancialYearData();
  const { departments, addDepartment, updateDepartment, deleteDepartment } = useDepartmentData();
  const { subjects, addSubject, updateSubject, deleteSubject } = useSubjectData();
  const { data: timetableEntries, create: addTimetableEntry, update: updateTimetableEntry, remove: deleteTimetableEntry } = useTimetableEntryData();
  const { data: teacherSubjectAssignments, create: addTeacherSubjectAssignment, update: updateTeacherSubjectAssignment, remove: deleteTeacherSubjectAssignment } = useTeacherSubjectAssignmentData();
  const { classSubjectAllocations, addClassSubjectAllocation, updateClassSubjectAllocation, deleteClassSubjectAllocation } = useClassSubjectAllocationData();
  const { classes, addClass, updateClass, deleteClass } = useClassData();
  const { classStreams, addClassStream, updateClassStream, deleteClassStream } = useClassStreamData();

  const [loading, setLoading] = useState<AppDataLoadingStates>(createLoadingStates());

  useEffect(() => {
    // Simulate async loading
    const timer = setTimeout(() => {
      setLoading(prev => {
        // Set all loading states to false
        const newLoading = { ...prev };
        Object.keys(newLoading).forEach(key => {
          newLoading[key as keyof AppDataLoadingStates] = false;
        });
        return newLoading;
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Combine live data from hooks with fallback data
  const fullData: any = {
    // Live data from module hooks
    partners,
    customers,
    clubs: clubsAndSocieties, // Map clubsAndSocieties to clubs for backward compatibility
    clubsAndSocieties,
    studentHealthRecords,
    studentAttendance,
    templateComms,
    templatesComm: templateComms, // Alias for backward compatibility
    campaigns,
    schoolPeriods,
    academicYears,
    academicPeriodDefinitions,
    designations,
    timetablePeriodDefs,
    financialYears,
    departments,
    subjects,
    timetableEntries,
    teacherSubjectAssignments,
    classSubjectAllocations,
    classes,
    classStreams,
    // Fallback to static data for other entities (includes staff, etc.)
    ...rawInitialData
  };

  // Dynamically fill in missing keys with [] or null based on the type in rawInitialData
  for (const key of allMockKeys) {
    if (fullData[key] === undefined) {
      // If any module's value for this key is an array, default to []
      const sample = Object.values(mockDataModules)
        .map(mod => (typeof mod === 'object' && mod !== null ? (mod as any)[key] : undefined))
        .find(val => val !== undefined);
      fullData[key] = isArrayType(sample) ? [] : null;
    }
  }

  return {
    ...fullData,
    loading,
    rawInitialData: fullData,
    // Provide no-op implementations for required context methods
    // NOTE: CRUD operations should be handled by module-specific hooks, not here
    getStudentDetailsById: async (studentId: string) => {
      // Find student in the mock data
      const student = fullData.students?.find((s: any) => s.id === studentId);
      if (!student) {
        console.warn(`Student with ID ${studentId} not found`);
        return null;
      }

      // Create a detailed student profile with all required fields
      const studentProfile = {
        ...student,
        // Ensure all required fields are present
        photo_path: student.photo_path || null,
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        admission_no: student.admission_no || '',
        current_class_name: student.current_class_name || '',
        current_class_stream_name: student.current_class_stream_name || '',
        email: student.email || '',
        phone: student.phone || '',
        date_of_birth: student.date_of_birth || null,
        gender: student.gender || '',
        address: student.address || '',
        religion: student.religion || '',
        remarks: student.remarks || '',
        primary_guardian: student.primary_guardian || null,
        
        // Mock enrolled subjects
        enrolled_subjects: [
          {
            id: 1,
            courseName: 'Mathematics',
            professorInstructorName: 'Dr. Smith',
            status: 'Active'
          },
          {
            id: 2,
            courseName: 'English Literature',
            professorInstructorName: 'Ms. Johnson',
            status: 'Active'
          },
          {
            id: 3,
            courseName: 'Physics',
            professorInstructorName: 'Prof. Wilson',
            status: 'Active'
          },
          {
            id: 4,
            courseName: 'Chemistry',
            professorInstructorName: 'Dr. Brown',
            status: 'Active'
          }
        ],
        
        // Mock payment history
        payment_history: [
          {
            id: `PAY_${studentId}_001`,
            transactionId: `TXN${studentId}001`,
            paymentDate: '2024-01-15',
            amount: 25000,
            paymentMethod: 'Bank Transfer',
            description: 'Term 1 School Fees'
          },
          {
            id: `PAY_${studentId}_002`,
            transactionId: `TXN${studentId}002`,
            paymentDate: '2024-04-10',
            amount: 25000,
            paymentMethod: 'M-Pesa',
            description: 'Term 2 School Fees'
          },
          {
            id: `PAY_${studentId}_003`,
            transactionId: `TXN${studentId}003`,
            paymentDate: '2024-08-20',
            amount: 25000,
            paymentMethod: 'Cash',
            description: 'Term 3 School Fees'
          }
        ]
      };

      console.log(`✅ Found student details for ID ${studentId}:`, studentProfile.first_name, studentProfile.last_name);
      return studentProfile;
    },
    getStudentFinancialDetailsById: async (studentId: string) => {
      // Find student in the mock data
      const student = fullData.students?.find((s: any) => s.id === studentId);
      if (!student) {
        console.warn(`Student with ID ${studentId} not found for financial details`);
        return null;
      }

      // Create mock financial details
      const financialDetails = {
        student_id: studentId,
        student_name: `${student.first_name} ${student.last_name}`,
        admission_no: student.admission_no,
        current_class_name: student.current_class_name,
        current_class_stream_name: student.current_class_stream_name,
        
        // Financial summary
        total_fees_charged: 75000,
        total_amount_paid: 65000,
        outstanding_balance: 10000,
        overpayment: 0,
        
        // Invoice/charges breakdown
        invoices_charges: [
          {
            id: `INV_${studentId}_001`,
            description: 'Term 1 Tuition Fees',
            amount: 25000,
            due_date: '2024-01-31',
            status: 'Paid'
          },
          {
            id: `INV_${studentId}_002`,
            description: 'Term 2 Tuition Fees',
            amount: 25000,
            due_date: '2024-04-30',
            status: 'Paid'
          },
          {
            id: `INV_${studentId}_003`,
            description: 'Term 3 Tuition Fees',
            amount: 25000,
            due_date: '2024-08-31',
            status: 'Partially Paid'
          }
        ],
        
        // Payment history (same as in student details)
        payment_history: [
          {
            id: `PAY_${studentId}_001`,
            transactionId: `TXN${studentId}001`,
            paymentDate: '2024-01-15',
            amount: 25000,
            paymentMethod: 'Bank Transfer',
            description: 'Term 1 School Fees'
          },
          {
            id: `PAY_${studentId}_002`,
            transactionId: `TXN${studentId}002`,
            paymentDate: '2024-04-10',
            amount: 25000,
            paymentMethod: 'M-Pesa',
            description: 'Term 2 School Fees'
          },
          {
            id: `PAY_${studentId}_003`,
            transactionId: `TXN${studentId}003`,
            paymentDate: '2024-08-20',
            amount: 15000,
            paymentMethod: 'Cash',
            description: 'Partial Term 3 School Fees'
          }
        ]
      };

      console.log(`✅ Found financial details for student ID ${studentId}`);
      return financialDetails;
    },
    saveStudentAttendance: async () => {},
    getStudentAttendanceByFilters: () => [],
    getTimetablePeriodDefs: () => fullData.timetablePeriodDefs || [],
    getTimetableEntries: () => fullData.timetableEntries || [],
    addTimetableEntry: async () => {},
    updateTimetableEntry: async () => {},
    deleteTimetableEntry: async () => {},
    // CRUD methods - these should delegate to module-specific hooks
    // For now, providing no-op implementations to maintain interface compatibility
    addPartner: async () => {},
    updatePartner: async () => {},
    deletePartner: async () => {},
    addClub: async () => {},
    updateClub: async () => {},
    deleteClub: async () => {},
    addCustomer: async () => {},
    updateCustomer: async () => {},
    deleteCustomer: async () => {},
    addStudentHealthRecord: async () => {},
    updateStudentHealthRecord: async () => {},
    deleteStudentHealthRecord: async () => {},
    addTemplateComm: async () => {},
    updateTemplateComm: async () => {},
    deleteTemplateComm: async () => {},
    addCampaign: async () => {},
    updateCampaign: async () => {},
    deleteCampaign: async () => {},
    addSchoolPeriod: async () => {},
    updateSchoolPeriod: async () => {},
    deleteSchoolPeriod: async () => {},
    addTimetablePeriodDef: async () => {},
    updateTimetablePeriodDef: async () => {},
    deleteTimetablePeriodDef: async () => {},
    addClass: addClass,
    updateClass: updateClass,
    deleteClass: deleteClass,
    addClassStream: addClassStream,
    updateClassStream: updateClassStream,
    deleteClassStream: deleteClassStream,
    generateStudentInvoices: async () => [],
    permissions: [],
    roles: [],
    userRoles: [],
    addPermission: async () => {},
    updatePermission: async () => {},
    deletePermission: async () => {},
    addRole: async () => {},
    updateRole: async () => {},
    deleteRole: async () => {},
    assignRoleToUser: async () => {},
    removeRoleFromUser: async () => {},
  };
};

export { rawInitialData }; 
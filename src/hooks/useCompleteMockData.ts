// hooks/useCompleteMockData.ts
import { useState, useEffect } from 'react';
import { 
    AppDataContextType, 
    AppDataLoadingStates, 
    AppDataType,
    StudentPaperMark, 
    StudentHealthRecord, 
    ClubAndSociety, 
    Partner, 
    TemplateComm, 
    Campaign, 
    RFQ, 
    Customer, 
    SupplierInvoice, 
    Workflow, 
    AuditLog,
    StudentAttendance,
    AcademicPeriodDefinition,
    AcademicYear,
    AcademicYearStructure,
    SchoolPeriod
} from '../core/types';
import { MOCK_API_DELAY } from '../constants';

// --- Import Modular Mock Data ---
// Administration
import {
    initialMockSchoolDetails,
    initialMockUsers,
    initialMockRoles,
    initialMockStaff,
    initialMockParentsGuardians,
    initialMockStudents,
    initialMockClasses,
    initialMockClassStreams,
    initialMockDepartments,
    initialMockDesignations,
    initialMockStudentCategories,
    initialMockDormitories,
    initialMockWorkflows,
} from '../modules/administration/data/mockData';

// Academics
import {
    initialMockSubjects,
    initialMockSubjectPapers,
    initialMockGradingSchemes,
    initialMockExamSessions,
    initialMockExamPaperSettings,
    initialMockStudentExamResults,
    initialMockClassSubjectAllocations,
    initialMockTeacherSubjectAssignments,
    initialMockStudentSubjectEnrollments,
    initialMockTimetablePeriodDefs,
    initialMockTimetableEntries,
} from '../modules/academics/data/mockData';

// Finance
import {
    initialMockFinancialYears,
    initialMockExpenseCategories,
    initialMockChartOfAccounts,
    initialMockBanks,
    initialMockSuppliers,
    initialMockFeeTemplates,
    initialMockFeeTemplateItems,
    initialMockStudentInvoices,
    initialMockStudentInvoiceItems,
    initialMockStudentPayments,
    initialMockInvoicePaymentApplications,
    initialMockExpenseClaims,
    initialMockStudentOpeningBalances,
    initialMockFeeAdjustments,
    initialMockTransportRoutes,
    initialMockStudentTransportAssignments,
    initialMockCustomerInvoices,
    initialMockGeneralPayments,
    initialMockGeneralLedgerEntries,
} from '../modules/finance/data/mockData';

// HR
import {
    initialMockPayrollPeriods,
    initialMockPayrollItemTypes,
    initialMockStaffSalarySettings,
    initialMockStaffRecurringItems,
    initialMockPayslips,
    initialMockPayslipItems,
} from '../modules/hr/data/mockData';

// Inventory
import {
    initialMockWarehouses,
    initialMockItemCategoriesInv,
    initialMockItemsInv,
    initialMockFixedAssets,
    initialMockAssetDepreciationLogs,
    initialMockStockLevels,
    initialMockStockTransactions,
    initialMockRequisitions,
    initialMockRequisitionItems,
    initialMockPurchaseOrders,
    initialMockPurchaseOrderItems,
} from '../modules/inventory/data/mockData';

// Library
import {
    initialMockBookCategories,
    initialMockBooks,
    initialMockLoans,
    initialMockFines,
} from '../modules/library/data/mockData';

// Nutrition
import {
    initialMockMealPlans,
    initialMockStudentMealPlans,
    initialMockMenus,
    initialMockMealConsumptionLogs,
    initialMockMerchants,
    initialMockStudentWallets,
    initialMockWalletTransactions,
} from '../modules/nutrition/data/mockData';

// Simulating a delay for API calls
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to create loading states for all entities
const createLoadingStates = (): AppDataLoadingStates => {
    const keys = Object.keys(rawInitialData) as Array<keyof AppDataType>;
    const states = keys.reduce((acc, key) => {
        acc[key] = true;
        return acc;
    }, {} as Record<keyof AppDataType, boolean>);
    return { ...states, all: true };
};


// Combine all imported mock data into a single object
export const rawInitialData: AppDataType = {
    // Administration
    schoolDetails: initialMockSchoolDetails,
    users: initialMockUsers,
    roles: initialMockRoles,
    staff: initialMockStaff,
    parentsGuardians: initialMockParentsGuardians,
    students: initialMockStudents,
    classes: initialMockClasses,
    classStreams: initialMockClassStreams,
    departments: initialMockDepartments,
    designations: initialMockDesignations,
    studentCategories: initialMockStudentCategories,
    dormitories: initialMockDormitories,
    
    // Academics
    subjects: initialMockSubjects,
    subjectPapers: initialMockSubjectPapers,
    gradingSchemes: initialMockGradingSchemes,
    examSessions: initialMockExamSessions,
    examPaperSettings: initialMockExamPaperSettings,
    studentExamResults: initialMockStudentExamResults,
    classSubjectAllocations: initialMockClassSubjectAllocations,
    teacherSubjectAssignments: initialMockTeacherSubjectAssignments,
    studentSubjectEnrollments: initialMockStudentSubjectEnrollments,
    timetablePeriodDefs: initialMockTimetablePeriodDefs,
    timetableEntries: initialMockTimetableEntries,
    
    // Finance
    financialYears: initialMockFinancialYears,
    chartOfAccounts: initialMockChartOfAccounts,
    expenseCategories: initialMockExpenseCategories,
    banks: initialMockBanks,
    suppliers: initialMockSuppliers,
    feeTemplates: initialMockFeeTemplates,
    feeTemplateItems: initialMockFeeTemplateItems,
    studentInvoices: initialMockStudentInvoices,
    studentInvoiceItems: initialMockStudentInvoiceItems,
    studentPayments: initialMockStudentPayments,
    invoicePaymentApplications: initialMockInvoicePaymentApplications,
    expenseClaims: initialMockExpenseClaims,
    customerInvoices: initialMockCustomerInvoices,
    studentOpeningBalances: initialMockStudentOpeningBalances,
    feeAdjustments: initialMockFeeAdjustments,
    transportRoutes: initialMockTransportRoutes,
    studentTransportAssignments: initialMockStudentTransportAssignments,
    generalPayments: initialMockGeneralPayments,
    generalLedgerEntries: initialMockGeneralLedgerEntries,

    // HR
    payrollPeriods: initialMockPayrollPeriods,
    payrollItemTypes: initialMockPayrollItemTypes,
    staffSalarySettings: initialMockStaffSalarySettings,
    payslips: initialMockPayslips,

    // Inventory
    warehouses: initialMockWarehouses,
    itemCategoriesInv: initialMockItemCategoriesInv,
    itemsInv: initialMockItemsInv,
    fixedAssets: initialMockFixedAssets,
    requisitions: initialMockRequisitions,
    purchaseOrders: initialMockPurchaseOrders,
    stockLevels: initialMockStockLevels,
    stockTransactions: initialMockStockTransactions,

    // Library
    bookCategories: initialMockBookCategories,
    books: initialMockBooks,
    loans: initialMockLoans,
    fines: initialMockFines,

    // Nutrition
    mealPlans: initialMockMealPlans,
    menus: initialMockMenus,
    merchants: initialMockMerchants,
    studentMealPlans: initialMockStudentMealPlans,
    mealConsumptionLogs: initialMockMealConsumptionLogs,
    walletTransactions: initialMockWalletTransactions,
    studentWallets: initialMockStudentWallets,

    // Placeholders for data not yet modularized or empty
    academicYearStructures: [] as AcademicYearStructure[],
    academicPeriodDefinitions: [] as AcademicPeriodDefinition[],
    academicYears: [] as AcademicYear[],
    schoolPeriods: [] as SchoolPeriod[],
    partners: [] as Partner[],
    clubs: [] as ClubAndSociety[],
    customers: [] as Customer[],
    studentHealthRecords: [] as StudentHealthRecord[],
    studentAttendance: [] as StudentAttendance[],
    templatesComm: [] as TemplateComm[],
    campaigns: [] as Campaign[],
    supplierInvoices: [] as SupplierInvoice[],
    workflows: initialMockWorkflows,
    auditLogs: [] as AuditLog[],
    rfqs: [] as RFQ[],
};

export const useMockData = (): AppDataContextType => {
  const [data, setData] = useState<Partial<AppDataType>>(rawInitialData);
  const [loading, setLoading] = useState<AppDataLoadingStates>(createLoadingStates());

  useEffect(() => {
    const loadAllData = async () => {
      console.log("useMockData: Starting to load all modular mock data...");
      setLoading(createLoadingStates());

      await delay(MOCK_API_DELAY);

      // Set all data at once from the composed rawInitialData object
      setData(rawInitialData);

      // Turn off all loading flags
      const newLoadingStates = createLoadingStates();
      Object.keys(newLoadingStates).forEach(key => {
        (newLoadingStates as any)[key] = false;
      });
      setLoading(newLoadingStates);

      console.log("useMockData: All mock data loaded and context is set.");
    };

    loadAllData();
  }, []);

  // --- CRUD Stubs ---
  const unimplementedAsync = async (..._args: any[]): Promise<any> => { console.warn("Mock function not implemented yet."); return null; };
  const unimplementedSync = (..._args: any[]): any[] => { console.warn("Mock getter not implemented yet."); return []; };

  // Student Detail Functions
  const getStudentDetailsById = async (id: string) => {
    await delay(MOCK_API_DELAY);
    const student = (data.students || []).find((s: any) => s.id === id);
    if (!student) return null;

    const mockEnrolledSubjects = [
      { courseName: 'Mathematics Core', professorInstructorName: 'Dr. E. Noether', status: 'Enrolled' },
      { courseName: 'English Literature', professorInstructorName: 'Prof. W. Shakespeare', status: 'Enrolled' },
    ];
    const mockPaymentHistory = (data.studentPayments || [])
      .filter((p: any) => p.student_id === id)
      .map((p: any) => ({
          id: p.id,
          transactionId: p.receipt_no,
          paymentDate: p.transaction_date,
          amount: p.total_amount_paid,
          paymentMethod: p.payment_method,
          description: p.reference_no || 'Fee Payment',
      }));
    const mockFinancialSummary = {
        currentBalance: ((data.studentInvoices || []).filter((inv: any) => inv.student_id === id).reduce((sum: number, inv: any) => sum + inv.total_amount_billed, 0)) - ((data.studentPayments || []).filter((p: any) => p.student_id === id).reduce((sum: number, p: any) => sum + p.total_amount_paid, 0)),
        totalFees: (data.studentInvoices || []).filter((inv: any) => inv.student_id === id).reduce((sum: number, inv: any) => sum + inv.total_amount_billed, 0),
        totalPaid: (data.studentPayments || []).filter((p: any) => p.student_id === id).reduce((sum: number, p: any) => sum + p.total_amount_paid, 0),
        totalDiscount: (data.feeAdjustments || []).filter((adj: any) => adj.student_id === id && adj.amount < 0).reduce((sum: number, adj: any) => sum + Math.abs(adj.amount), 0),
        totalFine: (data.feeAdjustments || []).filter((adj: any) => adj.student_id === id && adj.amount > 0).reduce((sum: number, adj: any) => sum + adj.amount, 0),
    };
    const mockInvoicesCharges = (data.studentInvoices || [])
        .filter((inv: any) => inv.student_id === id)
        .flatMap((inv: any) => (inv.items || []).map((item: any) => ({
            id: item.id,
            invoiceId: inv.invoice_number,
            feeTypeDescription: item.description,
            dueDate: inv.due_date,
            amount: item.amount,
            status: inv.status
        })));

    return {
      ...student,
      enrolled_subjects: mockEnrolledSubjects,
      payment_history: mockPaymentHistory,
      financial_summary: mockFinancialSummary,
      invoices_charges: mockInvoicesCharges,
      address: student.address || '123 Main St, Anytown',
      remarks: student.remarks || 'A dedicated and hardworking student.',
      religion: student.religion || 'Christian',
      email: student.email || `${student.first_name.toLowerCase()}@example.com`,
      phone: student.phone || '0700111222',
    };
  };

  const getStudentFinancialDetailsById = getStudentDetailsById;

  // Student Attendance Functions
  const saveStudentAttendance = async (attendanceRecords: any[]) => {
    await delay(MOCK_API_DELAY);
    const newRecords = attendanceRecords.map(record => ({
      ...record,
      id: `ATT${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    }));
    setData(prev => ({
      ...prev,
      studentAttendance: [...(prev.studentAttendance || []), ...newRecords]
    }));
  };

  const getStudentAttendanceByFilters = (date: string, classStreamId: number, periodId: number) => {
    return (data.studentAttendance || []).filter((record: any) => 
      record.date === date && 
      record.class_stream_id === classStreamId && 
      record.period_id === periodId
    );
  };

  const getTimetablePeriodDefs = () => data.timetablePeriodDefs || [];

  // Timetable Functions
  const getTimetableEntries = (classStreamId: number) => {
    return (data.timetableEntries || []).filter((entry: any) => entry.class_stream_id === classStreamId);
  };

  const addTimetableEntry = async (entryData: any) => {
    await delay(MOCK_API_DELAY);
    const newEntry = {
      ...entryData,
      id: `TTE${Date.now()}`,
      // Denormalized fields
      class_stream_name: (data.classStreams || []).find((cs: any) => cs.id === entryData.class_stream_id)?.name || 'Unknown',
      period_name: (data.timetablePeriodDefs || []).find((p: any) => p.id === entryData.period_id)?.period_name || 'Unknown',
      subject_name: (data.subjects || []).find((s: any) => s.id === entryData.subject_id)?.name || 'Unknown',
      teacher_name: (data.staff || []).find((t: any) => t.id === entryData.teacher_id)?.display_name || 
                   `${(data.staff || []).find((t: any) => t.id === entryData.teacher_id)?.first_name || ''} ${(data.staff || []).find((t: any) => t.id === entryData.teacher_id)?.last_name || ''}`.trim() || 'Unknown'
    };
    setData(prev => ({
      ...prev,
      timetableEntries: [...(prev.timetableEntries || []), newEntry]
    }));
  };

  const updateTimetableEntry = async (updatedEntry: any) => {
    await delay(MOCK_API_DELAY);
    const entryWithDenormalized = {
      ...updatedEntry,
      class_stream_name: (data.classStreams || []).find((cs: any) => cs.id === updatedEntry.class_stream_id)?.name || 'Unknown',
      period_name: (data.timetablePeriodDefs || []).find((p: any) => p.id === updatedEntry.period_id)?.period_name || 'Unknown',
      subject_name: (data.subjects || []).find((s: any) => s.id === updatedEntry.subject_id)?.name || 'Unknown',
      teacher_name: (data.staff || []).find((t: any) => t.id === updatedEntry.teacher_id)?.display_name || 
                   `${(data.staff || []).find((t: any) => t.id === updatedEntry.teacher_id)?.first_name || ''} ${(data.staff || []).find((t: any) => t.id === updatedEntry.teacher_id)?.last_name || ''}`.trim() || 'Unknown'
    };
    setData(prev => ({
      ...prev,
      timetableEntries: (prev.timetableEntries || []).map((entry: any) => 
        entry.id === updatedEntry.id ? entryWithDenormalized : entry
      )
    }));
  };

  const deleteTimetableEntry = async (entryId: string) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      timetableEntries: (prev.timetableEntries || []).filter((entry: any) => entry.id !== entryId)
    }));
  };

  // Partner CRUD operations
  const addPartner = async (partnerData: Omit<Partner, 'id' | 'created_at' | 'updated_at'>) => {
    await delay(MOCK_API_DELAY);
    const newPartner: Partner = {
      ...partnerData,
      id: `PTN${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      partners: [...(prev.partners || []), newPartner]
    }));
  };

  const updatePartner = async (updatedPartner: Partner) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      partners: (prev.partners || []).map(p => 
        p.id === updatedPartner.id 
          ? { ...updatedPartner, updated_at: new Date().toISOString() }
          : p
      )
    }));
  };

  const deletePartner = async (partnerId: string) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      partners: (prev.partners || []).filter(p => p.id !== partnerId)
    }));
  };

  return {
    ...(data as AppDataType),
    loading,
    rawInitialData,
    // Student Detail Functions
    getStudentDetailsById,
    getStudentFinancialDetailsById,
    // Student Attendance Functions
    saveStudentAttendance,
    getStudentAttendanceByFilters,
    getTimetablePeriodDefs,
    // Timetable Functions
    getTimetableEntries,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
    // Partner CRUD operations
    addPartner,
    updatePartner,
    deletePartner,
  } as AppDataContextType;
};

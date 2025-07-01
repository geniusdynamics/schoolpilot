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
    SchoolPeriod,
    Permission,
    Role,
    UserRole
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
    initialMockPartners,
    initialMockClubsAndSocieties,
    initialMockCustomers,
    initialMockStudentHealthRecords,
    initialMockStudentAttendance,
    initialMockTemplateComms,
    initialMockCampaigns,
    initialMockAcademicYearStructures,
    initialMockAcademicPeriodDefinitions,
    initialMockAcademicYears,
    initialMockSchoolPeriods,
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

    // Administration-specific data
    partners: initialMockPartners,
    clubs: initialMockClubsAndSocieties,
    customers: initialMockCustomers,
    studentHealthRecords: initialMockStudentHealthRecords,
    studentAttendance: initialMockStudentAttendance,
    templatesComm: initialMockTemplateComms,
    campaigns: initialMockCampaigns,
    workflows: initialMockWorkflows,
    
    // Academic Year Data from Administration Module
    academicYearStructures: initialMockAcademicYearStructures,
    academicPeriodDefinitions: initialMockAcademicPeriodDefinitions,
    academicYears: initialMockAcademicYears,
    schoolPeriods: initialMockSchoolPeriods,
    supplierInvoices: [] as SupplierInvoice[],
    auditLogs: [] as AuditLog[],
    rfqs: [] as RFQ[],
};

// --- Mock RBAC Data ---
const mockPermissions: Permission[] = [
  // Example: { id: 'mock.permission', name: 'Mock Permission', description: 'A mock permission', resource: 'mock', action: 'read', moduleId: 'mock' }
];
const mockRoles: Role[] = [
  // Example: { id: 'mock_role', name: 'Mock Role', description: 'A mock role', permissions: ['mock.permission'], isActive: true, isSystem: false, moduleAccess: { mock: { enabled: true, permissions: ['mock.permission'] } } }
];
const mockUserRoles: UserRole[] = [
  // Example: { userId: 'mock_user', roleId: 'mock_role', assignedAt: new Date(), assignedBy: 'system' }
];

export const useMockData = (): AppDataContextType => {
  const [data, setData] = useState<Partial<AppDataType>>(rawInitialData);
  const [loading, setLoading] = useState<AppDataLoadingStates>(createLoadingStates());
  const [permissions, setPermissions] = useState<Permission[]>(mockPermissions);
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [userRoles, setUserRoles] = useState<UserRole[]>(mockUserRoles);

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

  // Subject CRUD operations
  const addSubject = async (subjectData: any) => {
    await delay(MOCK_API_DELAY);
    const newSubject = {
      ...subjectData,
      id: Date.now(),
      department_name: (data.departments || []).find((d: any) => d.id === subjectData.department_id)?.name,
      papers: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      subjects: [...(prev.subjects || []), newSubject]
    }));
  };

  const updateSubject = async (updatedSubject: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      subjects: (prev.subjects || []).map((sub: any) => 
        sub.id === updatedSubject.id 
          ? { ...updatedSubject, updated_at: new Date().toISOString() }
          : sub
      )
    }));
  };

  const deleteSubject = async (subjectId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      subjects: (prev.subjects || []).filter(sub => sub.id !== subjectId)
    }));
  };
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

  // Club/Society CRUD operations
  const addClub = async (clubData: Omit<ClubAndSociety, 'id' | 'created_at' | 'updated_at' | 'patron_name'>) => {
    await delay(MOCK_API_DELAY);
    const newClub: ClubAndSociety = {
      ...clubData,
      id: Date.now(),
      patron_name: clubData.patron_id ? (data.staff || []).find((s: any) => s.id === clubData.patron_id)?.display_name || 
                   `${(data.staff || []).find((s: any) => s.id === clubData.patron_id)?.first_name || ''} ${(data.staff || []).find((s: any) => s.id === clubData.patron_id)?.last_name || ''}`.trim() : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      clubs: [...(prev.clubs || []), newClub]
    }));
  };

  const updateClub = async (updatedClub: ClubAndSociety) => {
    await delay(MOCK_API_DELAY);
    const clubWithDenormalized = {
      ...updatedClub,
      patron_name: updatedClub.patron_id ? (data.staff || []).find((s: any) => s.id === updatedClub.patron_id)?.display_name || 
                   `${(data.staff || []).find((s: any) => s.id === updatedClub.patron_id)?.first_name || ''} ${(data.staff || []).find((s: any) => s.id === updatedClub.patron_id)?.last_name || ''}`.trim() : undefined,
      updated_at: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      clubs: (prev.clubs || []).map(c => 
        c.id === updatedClub.id ? clubWithDenormalized : c
      )
    }));
  };

  const deleteClub = async (clubId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      clubs: (prev.clubs || []).filter(c => c.id !== clubId)
    }));
  };

  // Customer CRUD operations
  const addCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    await delay(MOCK_API_DELAY);
    const newCustomer: Customer = {
      ...customerData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      customers: [...(prev.customers || []), newCustomer]
    }));
  };

  const updateCustomer = async (updatedCustomer: Customer) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      customers: (prev.customers || []).map(c => 
        c.id === updatedCustomer.id 
          ? { ...updatedCustomer, updated_at: new Date().toISOString() }
          : c
      )
    }));
  };

  const deleteCustomer = async (customerId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      customers: (prev.customers || []).filter(c => c.id !== customerId)
    }));
  };

  // Student Health Record CRUD operations
  const addStudentHealthRecord = async (healthData: Omit<StudentHealthRecord, 'id' | 'created_at' | 'updated_at' | 'student_name'>) => {
    await delay(MOCK_API_DELAY);
    const newRecord: StudentHealthRecord = {
      ...healthData,
      id: `SHR${Date.now()}`,
      student_name: (data.students || []).find((s: any) => s.id === healthData.student_id)?.display_name ||
                   `${(data.students || []).find((s: any) => s.id === healthData.student_id)?.first_name || ''} ${(data.students || []).find((s: any) => s.id === healthData.student_id)?.last_name || ''}`.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      studentHealthRecords: [...(prev.studentHealthRecords || []), newRecord]
    }));
  };

  const updateStudentHealthRecord = async (updatedRecord: StudentHealthRecord) => {
    await delay(MOCK_API_DELAY);
    const recordWithDenormalized = {
      ...updatedRecord,
      student_name: (data.students || []).find((s: any) => s.id === updatedRecord.student_id)?.display_name ||
                   `${(data.students || []).find((s: any) => s.id === updatedRecord.student_id)?.first_name || ''} ${(data.students || []).find((s: any) => s.id === updatedRecord.student_id)?.last_name || ''}`.trim(),
      updated_at: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      studentHealthRecords: (prev.studentHealthRecords || []).map(r => 
        r.id === updatedRecord.id ? recordWithDenormalized : r
      )
    }));
  };

  // Communication Template CRUD operations
  const addTemplateComm = async (templateData: Omit<TemplateComm, 'id' | 'created_at' | 'updated_at'>) => {
    await delay(MOCK_API_DELAY);
    const newTemplate: TemplateComm = {
      ...templateData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      templatesComm: [...(prev.templatesComm || []), newTemplate]
    }));
  };

  const updateTemplateComm = async (updatedTemplate: TemplateComm) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      templatesComm: (prev.templatesComm || []).map(t => 
        t.id === updatedTemplate.id 
          ? { ...updatedTemplate, updated_at: new Date().toISOString() }
          : t
      )
    }));
  };

  const deleteTemplateComm = async (templateId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      templatesComm: (prev.templatesComm || []).filter(t => t.id !== templateId)
    }));
  };

  // Campaign CRUD operations
  const addCampaign = async (campaignData: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'template_name' | 'created_by_name' | 'approved_by_name' | 'target_audience_display'>) => {
    await delay(MOCK_API_DELAY);
    const newCampaign: Campaign = {
      ...campaignData,
      id: `CAMP${Date.now()}`,
      template_name: campaignData.template_id ? (data.templatesComm || []).find((t: any) => t.id === campaignData.template_id)?.name : undefined,
      created_by_name: campaignData.created_by ? (data.users || []).find((u: any) => u.id === campaignData.created_by)?.display_name : undefined,
      approved_by_name: campaignData.approved_by ? (data.users || []).find((u: any) => u.id === campaignData.approved_by)?.display_name : undefined,
      target_audience_display: campaignData.target_audience_type || 'All Students', // Default value
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      campaigns: [...(prev.campaigns || []), newCampaign]
    }));
  };

  const updateCampaign = async (updatedCampaign: Campaign) => {
    await delay(MOCK_API_DELAY);
    const campaignWithDenormalized = {
      ...updatedCampaign,
      template_name: updatedCampaign.template_id ? (data.templatesComm || []).find((t: any) => t.id === updatedCampaign.template_id)?.name : undefined,
      created_by_name: updatedCampaign.created_by ? (data.users || []).find((u: any) => u.id === updatedCampaign.created_by)?.display_name : undefined,
      approved_by_name: updatedCampaign.approved_by ? (data.users || []).find((u: any) => u.id === updatedCampaign.approved_by)?.display_name : undefined,
      updated_at: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      campaigns: (prev.campaigns || []).map(c => 
        c.id === updatedCampaign.id ? campaignWithDenormalized : c
      )
    }));
  };

  const deleteCampaign = async (campaignId: string) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      campaigns: (prev.campaigns || []).filter(c => c.id !== campaignId)
    }));
  };

  // Bank CRUD operations
  const addBank = async (bankData: any) => {
    await delay(MOCK_API_DELAY);
    const newBank = {
      ...bankData,
      id: Date.now(),
      gl_account_name: (data.chartOfAccounts || []).find((coa: any) => coa.id === bankData.gl_account_id)?.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      banks: [...(prev.banks || []), newBank]
    }));
  };

  const updateBank = async (updatedBank: any) => {
    await delay(MOCK_API_DELAY);
    const bankWithDenormalized = {
      ...updatedBank,
      gl_account_name: (data.chartOfAccounts || []).find((coa: any) => coa.id === updatedBank.gl_account_id)?.name,
      updated_at: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      banks: (prev.banks || []).map((b: any) => 
        b.id === updatedBank.id ? bankWithDenormalized : b
      )
    }));
  };

  const deleteBank = async (bankId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      banks: (prev.banks || []).filter((b: any) => b.id !== bankId)
    }));
  };

  // Supplier CRUD operations
  const addSupplier = async (supplierData: any) => {
    await delay(MOCK_API_DELAY);
    const newSupplier = {
      ...supplierData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      suppliers: [...(prev.suppliers || []), newSupplier]
    }));
  };

  const updateSupplier = async (updatedSupplier: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      suppliers: (prev.suppliers || []).map((s: any) => 
        s.id === updatedSupplier.id 
          ? { ...updatedSupplier, updated_at: new Date().toISOString() }
          : s
      )
    }));
  };

  const deleteSupplier = async (supplierId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      suppliers: (prev.suppliers || []).filter((s: any) => s.id !== supplierId)
    }));
  };

  // Chart of Account CRUD operations
  const addChartOfAccount = async (accountData: any) => {
    await delay(MOCK_API_DELAY);
    const newAccount = {
      ...accountData,
      id: Date.now(),
      expense_category_name: accountData.expense_category_id ? (data.expenseCategories || []).find((ec: any) => ec.id === accountData.expense_category_id)?.name : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      chartOfAccounts: [...(prev.chartOfAccounts || []), newAccount]
    }));
  };

  const updateChartOfAccount = async (updatedAccount: any) => {
    await delay(MOCK_API_DELAY);
    const accountWithDenormalized = {
      ...updatedAccount,
      expense_category_name: updatedAccount.expense_category_id ? (data.expenseCategories || []).find((ec: any) => ec.id === updatedAccount.expense_category_id)?.name : undefined,
      updated_at: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      chartOfAccounts: (prev.chartOfAccounts || []).map((acc: any) => 
        acc.id === updatedAccount.id ? accountWithDenormalized : acc
      )
    }));
  };

  const deleteChartOfAccount = async (accountId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      chartOfAccounts: (prev.chartOfAccounts || []).filter((acc: any) => acc.id !== accountId)
    }));
  };

  // Student Exam Result Helper Functions
  const getStudentsForExamEntry = (classStreamId: number) => {
    return (data.students || []).filter((student: any) => student.class_stream_id === classStreamId);
  };

  const getExamPaperSettingsForSession = (sessionId: string) => {
    return (data.examPaperSettings || []).filter((setting: any) => setting.exam_session_id === sessionId);
  };

  const saveStudentExamResult = async (resultData: any, marks: any[]) => {
    await delay(MOCK_API_DELAY);
    // First create or update the student exam result
    const newResult = {
      ...resultData,
      id: `SER${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Create student paper marks
    const paperMarks = marks.map(mark => ({
      ...mark,
      id: `SPM${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      student_exam_result_id: newResult.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setData(prev => ({
      ...prev,
      studentExamResults: [...(prev.studentExamResults || []), newResult],
      studentPaperMarks: [...(prev.studentPaperMarks || []), ...paperMarks]
    }));
  };

  // Generate Student Invoices Function
  const generateStudentInvoices = async (feeTemplateId: number, schoolPeriodId: number, studentCriteria: any) => {
    await delay(MOCK_API_DELAY);
    
    // Get the fee template
    const feeTemplate = (data.feeTemplates || []).find((ft: any) => ft.id === feeTemplateId);
    if (!feeTemplate) {
      throw new Error('Fee template not found');
    }
    
    // Filter students based on criteria
    let filteredStudents = data.students || [];
    if (studentCriteria.categoryId) {
      filteredStudents = filteredStudents.filter((s: any) => s.student_category_id === studentCriteria.categoryId);
    }
    if (studentCriteria.classStreamId) {
      filteredStudents = filteredStudents.filter((s: any) => s.current_class_stream_id === studentCriteria.classStreamId);
    }
    
    // Generate invoices
    const generatedInvoices = [];
    for (const student of filteredStudents) {
      const totalAmount = (feeTemplate.items || []).reduce((sum: number, item: any) => sum + item.amount, 0);
      
      const newInvoice = {
        id: `INV${Date.now()}_${student.id}`,
        student_id: student.id,
        invoice_number: `INV${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
        school_period_id: schoolPeriodId,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        total_amount_billed: totalAmount,
        amount_paid: 0,
        status: 'DUE',
        items: (feeTemplate.items || []).map((item: any) => ({
          id: `ITEM${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          invoice_id: `INV${Date.now()}_${student.id}`,
          description: item.description,
          amount: item.amount,
          fee_template_item_id: item.id
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        student_name: student.display_name || `${student.first_name} ${student.last_name}`,
        school_period_name: (data.schoolPeriods || []).find((sp: any) => sp.id === schoolPeriodId)?.name
      };
      
      generatedInvoices.push(newInvoice);
    }
    
    // Add to state
    setData(prev => ({
      ...prev,
      studentInvoices: [...(prev.studentInvoices || []), ...generatedInvoices]
    }));
    
    return generatedInvoices;
  };

  // RBAC CRUD/assignment methods
  const addPermission = async (p: Permission) => setPermissions(prev => [...prev, p]);
  const updatePermission = async (p: Permission) => setPermissions(prev => prev.map(x => x.id === p.id ? p : x));
  const deletePermission = async (id: string) => setPermissions(prev => prev.filter(x => x.id !== id));
  const addRole = async (r: Role) => setRoles(prev => [...prev, r]);
  const updateRole = async (r: Role) => setRoles(prev => prev.map(x => x.id === r.id ? r : x));
  const deleteRole = async (id: string) => setRoles(prev => prev.filter(x => x.id !== id));
  const assignRoleToUser = async (userRole: UserRole) => setUserRoles(prev => [...prev, userRole]);
  const removeRoleFromUser = async (userId: string, roleId: string) => setUserRoles(prev => prev.filter(x => !(x.userId === userId && x.roleId === roleId)));

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
    // Subject CRUD operations
    addSubject,
    updateSubject,
    deleteSubject,
    // Timetable Functions
    getTimetableEntries,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
    // Partner CRUD operations
    addPartner,
    updatePartner,
    deletePartner,
    // Club/Society CRUD operations
    addClub,
    updateClub,
    deleteClub,
    // Customer CRUD operations
    addCustomer,
    updateCustomer,
    deleteCustomer,
    // Student Health Record CRUD operations
    addStudentHealthRecord,
    updateStudentHealthRecord,
    // Communication Template CRUD operations
    addTemplateComm,
    updateTemplateComm,
    deleteTemplateComm,
    // Campaign CRUD operations
    addCampaign,
    updateCampaign,
    deleteCampaign,
    // Bank CRUD operations
    addBank,
    updateBank,
    deleteBank,
    // Chart of Accounts Functions
    addChartOfAccount,
    updateChartOfAccount,
    deleteChartOfAccount,
    // Supplier CRUD operations
    addSupplier,
    updateSupplier,
    deleteSupplier,
    // Student Exam Result Functions
    getStudentsForExamEntry,
    getExamPaperSettingsForSession,
    saveStudentExamResult,
  // Invoice Generation Functions
  generateStudentInvoices,

  // === HR MODULE CRUD OPERATIONS ===
  // Payroll Period CRUD operations
  addPayrollPeriod: async (periodData: any) => {
    await delay(MOCK_API_DELAY);
    const newPeriod = {
      ...periodData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      payrollPeriods: [...(prev.payrollPeriods || []), newPeriod]
    }));
    return newPeriod;
  },

  updatePayrollPeriod: async (updatedPeriod: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      payrollPeriods: (prev.payrollPeriods || []).map((p: any) => 
        p.id === updatedPeriod.id 
          ? { ...updatedPeriod, updated_at: new Date().toISOString() }
          : p
      )
    }));
    return updatedPeriod;
  },

  deletePayrollPeriod: async (periodId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      payrollPeriods: (prev.payrollPeriods || []).filter((p: any) => p.id !== periodId)
    }));
  },

  // Payroll Item Type CRUD operations
  addPayrollItemType: async (itemData: any) => {
    await delay(MOCK_API_DELAY);
    const newItem = {
      ...itemData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      payrollItemTypes: [...(prev.payrollItemTypes || []), newItem]
    }));
    return newItem;
  },

  updatePayrollItemType: async (updatedItem: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      payrollItemTypes: (prev.payrollItemTypes || []).map((item: any) => 
        item.id === updatedItem.id 
          ? { ...updatedItem, updated_at: new Date().toISOString() }
          : item
      )
    }));
    return updatedItem;
  },

  deletePayrollItemType: async (itemId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      payrollItemTypes: (prev.payrollItemTypes || []).filter((item: any) => item.id !== itemId)
    }));
  },

  updateStaffSalarySetting: async (salaryData: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      staffSalarySettings: (prev.staffSalarySettings || []).map((setting: any) => 
        setting.staff_id === salaryData.staff_id 
          ? { ...salaryData, updated_at: new Date().toISOString() }
          : setting
      )
    }));
    return salaryData;
  },

  generatePayslipsForPeriod: async (periodId: number) => {
    await delay(MOCK_API_DELAY);
    const payslips = (data.staffSalarySettings || []).map((setting: any, index: number) => ({
      id: `PAY${Date.now()}_${index}`,
      staff_id: setting.staff_id,
      payroll_period_id: periodId,
      gross_pay: setting.basic_salary + setting.allowances,
      deductions: setting.deductions || 0,
      net_pay: (setting.basic_salary + setting.allowances) - (setting.deductions || 0),
      generated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));
    
    setData(prev => ({
      ...prev,
      payslips: [...(prev.payslips || []), ...payslips]
    }));
    return payslips;
  },

  // === INVENTORY MODULE CRUD OPERATIONS ===
  // Warehouse CRUD operations
  addWarehouse: async (warehouseData: any) => {
    await delay(MOCK_API_DELAY);
    const newWarehouse = {
      ...warehouseData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      warehouses: [...(prev.warehouses || []), newWarehouse]
    }));
    return newWarehouse;
  },

  updateWarehouse: async (updatedWarehouse: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      warehouses: (prev.warehouses || []).map((w: any) => 
        w.id === updatedWarehouse.id 
          ? { ...updatedWarehouse, updated_at: new Date().toISOString() }
          : w
      )
    }));
    return updatedWarehouse;
  },

  deleteWarehouse: async (warehouseId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      warehouses: (prev.warehouses || []).filter((w: any) => w.id !== warehouseId)
    }));
  },

  // Item Category CRUD operations
  addItemCategoryInv: async (categoryData: any) => {
    await delay(MOCK_API_DELAY);
    const newCategory = {
      ...categoryData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      itemCategoriesInv: [...(prev.itemCategoriesInv || []), newCategory]
    }));
    return newCategory;
  },

  updateItemCategoryInv: async (updatedCategory: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      itemCategoriesInv: (prev.itemCategoriesInv || []).map((cat: any) => 
        cat.id === updatedCategory.id 
          ? { ...updatedCategory, updated_at: new Date().toISOString() }
          : cat
      )
    }));
    return updatedCategory;
  },

  deleteItemCategoryInv: async (categoryId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      itemCategoriesInv: (prev.itemCategoriesInv || []).filter((cat: any) => cat.id !== categoryId)
    }));
  },

  // Item CRUD operations
  addItemInv: async (itemData: any) => {
    await delay(MOCK_API_DELAY);
    const newItem = {
      ...itemData,
      id: Date.now(),
      category_name: (data.itemCategoriesInv || []).find((cat: any) => cat.id === itemData.category_id)?.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      itemsInv: [...(prev.itemsInv || []), newItem]
    }));
    return newItem;
  },

  updateItemInv: async (updatedItem: any) => {
    await delay(MOCK_API_DELAY);
    const itemWithDenormalized = {
      ...updatedItem,
      category_name: (data.itemCategoriesInv || []).find((cat: any) => cat.id === updatedItem.category_id)?.name,
      updated_at: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      itemsInv: (prev.itemsInv || []).map((item: any) => 
        item.id === updatedItem.id ? itemWithDenormalized : item
      )
    }));
    return itemWithDenormalized;
  },

  deleteItemInv: async (itemId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      itemsInv: (prev.itemsInv || []).filter((item: any) => item.id !== itemId)
    }));
  },

  // Fixed Asset CRUD operations
  addFixedAsset: async (assetData: any) => {
    await delay(MOCK_API_DELAY);
    const newAsset = {
      ...assetData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      fixedAssets: [...(prev.fixedAssets || []), newAsset]
    }));
    return newAsset;
  },

  updateFixedAsset: async (updatedAsset: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      fixedAssets: (prev.fixedAssets || []).map((asset: any) => 
        asset.id === updatedAsset.id 
          ? { ...updatedAsset, updated_at: new Date().toISOString() }
          : asset
      )
    }));
    return updatedAsset;
  },

  deleteFixedAsset: async (assetId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      fixedAssets: (prev.fixedAssets || []).filter((asset: any) => asset.id !== assetId)
    }));
  },

  // Requisition CRUD operations
  addRequisition: async (reqData: any) => {
    await delay(MOCK_API_DELAY);
    const newRequisition = {
      ...reqData,
      id: Date.now(),
      request_date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      requisitions: [...(prev.requisitions || []), newRequisition]
    }));
    return newRequisition;
  },

  updateRequisition: async (updatedReq: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      requisitions: (prev.requisitions || []).map((req: any) => 
        req.id === updatedReq.id 
          ? { ...updatedReq, updated_at: new Date().toISOString() }
          : req
      )
    }));
    return updatedReq;
  },

  deleteRequisition: async (reqId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      requisitions: (prev.requisitions || []).filter((req: any) => req.id !== reqId)
    }));
  },

  updateRequisitionStatus: async (reqId: number, status: string) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      requisitions: (prev.requisitions || []).map((req: any) => 
        req.id === reqId 
          ? { ...req, status, updated_at: new Date().toISOString() }
          : req
      )
    }));
  },

  // Purchase Order CRUD operations
  addPurchaseOrder: async (poData: any) => {
    await delay(MOCK_API_DELAY);
    const newPO = {
      ...poData,
      id: Date.now(),
      order_date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      purchaseOrders: [...(prev.purchaseOrders || []), newPO]
    }));
    return newPO;
  },

  updatePurchaseOrder: async (updatedPO: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      purchaseOrders: (prev.purchaseOrders || []).map((po: any) => 
        po.id === updatedPO.id 
          ? { ...updatedPO, updated_at: new Date().toISOString() }
          : po
      )
    }));
    return updatedPO;
  },

  deletePurchaseOrder: async (poId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      purchaseOrders: (prev.purchaseOrders || []).filter((po: any) => po.id !== poId)
    }));
  },

  addStockTransaction: async (transactionData: any) => {
    await delay(MOCK_API_DELAY);
    const newTransaction = {
      ...transactionData,
      id: Date.now(),
      transaction_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      stockTransactions: [...(prev.stockTransactions || []), newTransaction]
    }));
    
    // Update stock levels
    setData(prev => ({
      ...prev,
      stockLevels: (prev.stockLevels || []).map((stock: any) => 
        stock.item_id === transactionData.item_id && stock.warehouse_id === transactionData.warehouse_id
          ? { 
              ...stock, 
              quantity: transactionData.transaction_type === 'IN' 
                ? stock.quantity + transactionData.quantity 
                : stock.quantity - transactionData.quantity 
            }
          : stock
      )
    }));
    
    return newTransaction;
  },

  // === LIBRARY MODULE CRUD OPERATIONS ===
  // Book Category CRUD operations
  addBookCategory: async (categoryData: any) => {
    await delay(MOCK_API_DELAY);
    const newCategory = {
      ...categoryData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      bookCategories: [...(prev.bookCategories || []), newCategory]
    }));
    return newCategory;
  },

  updateBookCategory: async (updatedCategory: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      bookCategories: (prev.bookCategories || []).map((cat: any) => 
        cat.id === updatedCategory.id 
          ? { ...updatedCategory, updated_at: new Date().toISOString() }
          : cat
      )
    }));
    return updatedCategory;
  },

  deleteBookCategory: async (categoryId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      bookCategories: (prev.bookCategories || []).filter((cat: any) => cat.id !== categoryId)
    }));
  },

  // Book CRUD operations
  addBook: async (bookData: any) => {
    await delay(MOCK_API_DELAY);
    const newBook = {
      ...bookData,
      id: Date.now(),
      accession_number: `ACC${Date.now()}`,
      status: 'Available',
      category_name: (data.bookCategories || []).find((cat: any) => cat.id === bookData.category_id)?.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      books: [...(prev.books || []), newBook]
    }));
    return newBook;
  },

  updateBook: async (updatedBook: any) => {
    await delay(MOCK_API_DELAY);
    const bookWithDenormalized = {
      ...updatedBook,
      category_name: (data.bookCategories || []).find((cat: any) => cat.id === updatedBook.category_id)?.name,
      updated_at: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      books: (prev.books || []).map((book: any) => 
        book.id === updatedBook.id ? bookWithDenormalized : book
      )
    }));
    return bookWithDenormalized;
  },

  deleteBook: async (bookId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      books: (prev.books || []).filter((book: any) => book.id !== bookId)
    }));
  },

  // Loan CRUD operations
  addLoan: async (loanData: any) => {
    await delay(MOCK_API_DELAY);
    const newLoan = {
      ...loanData,
      id: Date.now(),
      loan_date: new Date().toISOString().split('T')[0],
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Update book status
    setData(prev => ({
      ...prev,
      books: (prev.books || []).map((book: any) => 
        book.id === loanData.book_id ? { ...book, status: 'On Loan' } : book
      ),
      loans: [...(prev.loans || []), newLoan]
    }));
    return newLoan;
  },

  updateLoan: async (updatedLoan: any) => {
    await delay(MOCK_API_DELAY);
    const oldLoan = (data.loans || []).find((loan: any) => loan.id === updatedLoan.id);
    
    setData(prev => ({
      ...prev,
      loans: (prev.loans || []).map((loan: any) => 
        loan.id === updatedLoan.id 
          ? { ...updatedLoan, updated_at: new Date().toISOString() }
          : loan
      )
    }));
    
    // If returning book, update book status
    if (updatedLoan.status === 'Returned' && oldLoan?.status !== 'Returned') {
      setData(prev => ({
        ...prev,
        books: (prev.books || []).map((book: any) => 
          book.id === updatedLoan.book_id ? { ...book, status: 'Available' } : book
        )
      }));
    }
    
    return updatedLoan;
  },

  // Fine CRUD operations
  addFine: async (fineData: any) => {
    await delay(MOCK_API_DELAY);
    const newFine = {
      ...fineData,
      id: Date.now(),
      fine_date: new Date().toISOString().split('T')[0],
      status: 'Unpaid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      fines: [...(prev.fines || []), newFine]
    }));
    return newFine;
  },

  updateFineStatus: async (fineId: number, status: string) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      fines: (prev.fines || []).map((fine: any) => 
        fine.id === fineId 
          ? { ...fine, status, updated_at: new Date().toISOString() }
          : fine
      )
    }));
  },

  // === NUTRITION MODULE CRUD OPERATIONS ===
  // Meal Plan CRUD operations
  addMealPlan: async (planData: any) => {
    await delay(MOCK_API_DELAY);
    const newPlan = {
      ...planData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      mealPlans: [...(prev.mealPlans || []), newPlan]
    }));
    return newPlan;
  },

  updateMealPlan: async (updatedPlan: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      mealPlans: (prev.mealPlans || []).map((plan: any) => 
        plan.id === updatedPlan.id 
          ? { ...updatedPlan, updated_at: new Date().toISOString() }
          : plan
      )
    }));
    return updatedPlan;
  },

  deleteMealPlan: async (planId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      mealPlans: (prev.mealPlans || []).filter((plan: any) => plan.id !== planId)
    }));
  },

  // Menu CRUD operations
  addMenu: async (menuData: any) => {
    await delay(MOCK_API_DELAY);
    const newMenu = {
      ...menuData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      menus: [...(prev.menus || []), newMenu]
    }));
    return newMenu;
  },

  updateMenu: async (updatedMenu: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      menus: (prev.menus || []).map((menu: any) => 
        menu.id === updatedMenu.id 
          ? { ...updatedMenu, updated_at: new Date().toISOString() }
          : menu
      )
    }));
    return updatedMenu;
  },

  deleteMenu: async (menuId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      menus: (prev.menus || []).filter((menu: any) => menu.id !== menuId)
    }));
  },

  // Student Meal Plan CRUD operations
  addStudentMealPlan: async (assignmentData: any) => {
    await delay(MOCK_API_DELAY);
    const newAssignment = {
      ...assignmentData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      studentMealPlans: [...(prev.studentMealPlans || []), newAssignment]
    }));
    return newAssignment;
  },

  updateStudentMealPlan: async (updatedAssignment: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      studentMealPlans: (prev.studentMealPlans || []).map((assignment: any) => 
        assignment.id === updatedAssignment.id 
          ? { ...updatedAssignment, updated_at: new Date().toISOString() }
          : assignment
      )
    }));
    return updatedAssignment;
  },

  deleteStudentMealPlan: async (assignmentId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      studentMealPlans: (prev.studentMealPlans || []).filter((assignment: any) => assignment.id !== assignmentId)
    }));
  },

  // Meal Consumption Log operations
  addMealConsumptionLog: async (logData: any) => {
    await delay(MOCK_API_DELAY);
    const newLog = {
      ...logData,
      id: Date.now(),
      consumption_date: new Date().toISOString().split('T')[0],
      consumption_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      mealConsumptionLogs: [...(prev.mealConsumptionLogs || []), newLog]
    }));
    return newLog;
  },

  // Merchant CRUD operations
  addMerchant: async (merchantData: any) => {
    await delay(MOCK_API_DELAY);
    const newMerchant = {
      ...merchantData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      merchants: [...(prev.merchants || []), newMerchant]
    }));
    return newMerchant;
  },

  updateMerchant: async (updatedMerchant: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      merchants: (prev.merchants || []).map((merchant: any) => 
        merchant.id === updatedMerchant.id 
          ? { ...updatedMerchant, updated_at: new Date().toISOString() }
          : merchant
      )
    }));
    return updatedMerchant;
  },

  deleteMerchant: async (merchantId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      merchants: (prev.merchants || []).filter((merchant: any) => merchant.id !== merchantId)
    }));
  },

  // Wallet Transaction operations
  addWalletTransaction: async (transactionData: any) => {
    await delay(MOCK_API_DELAY);
    const newTransaction = {
      ...transactionData,
      id: Date.now(),
      transaction_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };
    
    // Update student wallet balance
    setData(prev => ({
      ...prev,
      walletTransactions: [...(prev.walletTransactions || []), newTransaction],
      studentWallets: (prev.studentWallets || []).map((wallet: any) => 
        wallet.student_id === transactionData.student_id
          ? { 
              ...wallet, 
              current_balance: transactionData.transaction_type === 'CREDIT'
                ? wallet.current_balance + transactionData.amount
                : wallet.current_balance - transactionData.amount,
              updated_at: new Date().toISOString()
            }
          : wallet
      )
    }));
    
    return newTransaction;
  },

  // === ADDITIONAL MISSING CRUD OPERATIONS ===
  // Fee Template CRUD operations
  addFeeTemplate: async (templateData: any) => {
    await delay(MOCK_API_DELAY);
    const newTemplate = {
      ...templateData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      feeTemplates: [...(prev.feeTemplates || []), newTemplate]
    }));
    return newTemplate;
  },

  updateFeeTemplate: async (updatedTemplate: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      feeTemplates: (prev.feeTemplates || []).map((template: any) => 
        template.id === updatedTemplate.id 
          ? { ...updatedTemplate, updated_at: new Date().toISOString() }
          : template
      )
    }));
    return updatedTemplate;
  },

  deleteFeeTemplate: async (templateId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      feeTemplates: (prev.feeTemplates || []).filter((template: any) => template.id !== templateId)
    }));
  },

  // Expense Category CRUD operations
  addExpenseCategory: async (categoryData: any) => {
    await delay(MOCK_API_DELAY);
    const newCategory = {
      ...categoryData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      expenseCategories: [...(prev.expenseCategories || []), newCategory]
    }));
    return newCategory;
  },

  updateExpenseCategory: async (updatedCategory: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      expenseCategories: (prev.expenseCategories || []).map((category: any) => 
        category.id === updatedCategory.id 
          ? { ...updatedCategory, updated_at: new Date().toISOString() }
          : category
      )
    }));
    return updatedCategory;
  },

  deleteExpenseCategory: async (categoryId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      expenseCategories: (prev.expenseCategories || []).filter((category: any) => category.id !== categoryId)
    }));
  },

  // Student CRUD operations
  addStudent: async (studentData: any) => {
    await delay(MOCK_API_DELAY);
    const newStudent = {
      ...studentData,
      id: `STU${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      students: [...(prev.students || []), newStudent]
    }));
    return newStudent;
  },

  updateStudent: async (updatedStudent: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      students: (prev.students || []).map((student: any) => 
        student.id === updatedStudent.id 
          ? { ...updatedStudent, updated_at: new Date().toISOString() }
          : student
      )
    }));
    return updatedStudent;
  },

  deleteStudent: async (studentId: string) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      students: (prev.students || []).filter((student: any) => student.id !== studentId)
    }));
  },

  // Staff CRUD operations
  addStaffMember: async (staffData: any) => {
    await delay(MOCK_API_DELAY);
    const newStaff = {
      ...staffData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      staff: [...(prev.staff || []), newStaff]
    }));
    return newStaff;
  },

  updateStaffMember: async (updatedStaff: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      staff: (prev.staff || []).map((staff: any) => 
        staff.id === updatedStaff.id 
          ? { ...updatedStaff, updated_at: new Date().toISOString() }
          : staff
      )
    }));
    return updatedStaff;
  },

  deleteStaffMember: async (staffId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      staff: (prev.staff || []).filter((staff: any) => staff.id !== staffId)
    }));
  },

  // Department CRUD operations
  addDepartment: async (deptData: any) => {
    await delay(MOCK_API_DELAY);
    const newDepartment = {
      ...deptData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      departments: [...(prev.departments || []), newDepartment]
    }));
    return newDepartment;
  },

  updateDepartment: async (updatedDept: any) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      departments: (prev.departments || []).map((dept: any) => 
        dept.id === updatedDept.id 
          ? { ...updatedDept, updated_at: new Date().toISOString() }
          : dept
      )
    }));
    return updatedDept;
  },

  deleteDepartment: async (deptId: number) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      departments: (prev.departments || []).filter((dept: any) => dept.id !== deptId)
    }));
  },

  // === PLACEHOLDER FUNCTIONS FOR REMAINING OPERATIONS ===
  // Academic Year Structure CRUD operations (stub)
  addAcademicYearStructure: async (structure) => {
    await delay(MOCK_API_DELAY);
    const newStructure = {
      ...structure,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      academicYearStructures: [...(prev.academicYearStructures || []), newStructure],
    }));
    return newStructure;
  },
  updateAcademicYearStructure: async (updatedStructure) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      academicYearStructures: (prev.academicYearStructures || []).map((item) =>
        item.id === updatedStructure.id
          ? { ...updatedStructure, updated_at: new Date().toISOString() }
          : item
      ),
    }));
    return updatedStructure;
  },
  deleteAcademicYearStructure: async (id) => {
    await delay(MOCK_API_DELAY);
    setData(prev => ({
      ...prev,
      academicYearStructures: (prev.academicYearStructures || []).filter((item) => item.id !== id),
    }));
    return id;
  },
  
  // Academic Period Definition CRUD operations (stub)
  addAcademicPeriodDefinition: unimplementedAsync,
  updateAcademicPeriodDefinition: unimplementedAsync,
  deleteAcademicPeriodDefinition: unimplementedAsync,
  
  // Academic Year CRUD operations (stub)
  addAcademicYear: unimplementedAsync,
  updateAcademicYear: unimplementedAsync,
  deleteAcademicYear: unimplementedAsync,
  
  // School Period CRUD operations (stub)
  addSchoolPeriod: unimplementedAsync,
  updateSchoolPeriod: unimplementedAsync,
  deleteSchoolPeriod: unimplementedAsync,
  
  // Designation CRUD operations (stub)
  addDesignation: unimplementedAsync,
  updateDesignation: unimplementedAsync,
  deleteDesignation: unimplementedAsync,
  
  // Student Category CRUD operations (stub)
  addStudentCategory: unimplementedAsync,
  updateStudentCategory: unimplementedAsync,
  deleteStudentCategory: unimplementedAsync,
  
  // Dormitory CRUD operations (stub)
  addDormitory: unimplementedAsync,
  updateDormitory: unimplementedAsync,
  deleteDormitory: unimplementedAsync,
  
  // Timetable Period Definition CRUD operations (stub)
  addTimetablePeriodDef: unimplementedAsync,
  updateTimetablePeriodDef: unimplementedAsync,
  deleteTimetablePeriodDef: unimplementedAsync,
  
  // Subject Paper CRUD operations (stub)
  addSubjectPaper: unimplementedAsync,
  updateSubjectPaper: unimplementedAsync,
  deleteSubjectPaper: unimplementedAsync,
  
  // Exam Session CRUD operations (stub)
  addExamSession: unimplementedAsync,
  updateExamSession: unimplementedAsync,
  deleteExamSession: unimplementedAsync,
  
  // Exam Paper Setting CRUD operations (stub)
  addExamPaperSetting: unimplementedAsync,
  updateExamPaperSetting: unimplementedAsync,
  deleteExamPaperSetting: unimplementedAsync,
  
  // Grading Scheme CRUD operations (stub)
  addGradingScheme: unimplementedAsync,
  updateGradingScheme: unimplementedAsync,
  deleteGradingScheme: unimplementedAsync,
  
  // Class Subject Allocation CRUD operations (stub)
  addClassSubjectAllocation: unimplementedAsync,
  updateClassSubjectAllocation: unimplementedAsync,
  deleteClassSubjectAllocation: unimplementedAsync,
  
  // Teacher Subject Assignment CRUD operations (stub)
  addTeacherSubjectAssignment: unimplementedAsync,
  deleteTeacherSubjectAssignment: unimplementedAsync,
  
  // Student Subject Enrollment CRUD operations (stub)
  addStudentSubjectEnrollment: unimplementedAsync,
  updateStudentSubjectEnrollment: unimplementedAsync,
  deleteStudentSubjectEnrollment: unimplementedAsync,
  
  // Customer Invoice CRUD operations (stub)
  addCustomerInvoice: unimplementedAsync,
  updateCustomerInvoice: unimplementedAsync,
  deleteCustomerInvoice: unimplementedAsync,
  
  // Supplier Invoice CRUD operations (stub)
  addSupplierInvoice: unimplementedAsync,
  updateSupplierInvoice: unimplementedAsync,
  deleteSupplierInvoice: unimplementedAsync,
  
  // Student Opening Balance CRUD operations (stub)
  addStudentOpeningBalance: unimplementedAsync,
  updateStudentOpeningBalance: unimplementedAsync,
  deleteStudentOpeningBalance: unimplementedAsync,
  
  // Fee Adjustment CRUD operations (stub)
  addFeeAdjustment: unimplementedAsync,
  updateFeeAdjustment: unimplementedAsync,
  deleteFeeAdjustment: unimplementedAsync,
  
  // Transport Route CRUD operations (stub)
  addTransportRoute: unimplementedAsync,
  updateTransportRoute: unimplementedAsync,
  deleteTransportRoute: unimplementedAsync,
  
  // Student Transport Assignment CRUD operations (stub)
  addStudentTransportAssignment: unimplementedAsync,
  updateStudentTransportAssignment: unimplementedAsync,
  deleteStudentTransportAssignment: unimplementedAsync,
  
  // Student Payment CRUD operations (stub)
  addStudentPayment: unimplementedAsync,
  updateStudentPayment: unimplementedAsync,
  deleteStudentPayment: unimplementedAsync,
  applyPaymentToInvoices: unimplementedAsync,
  
  // General Payment CRUD operations (stub)
  addGeneralPayment: unimplementedAsync,
  updateGeneralPayment: unimplementedAsync,
  deleteGeneralPayment: unimplementedAsync,
  
  // Financial Year CRUD operations (stub)
  addFinancialYear: unimplementedAsync,
  updateFinancialYear: unimplementedAsync,
  deleteFinancialYear: unimplementedAsync,
  
  // User & Role CRUD operations (stub)
  addUser: unimplementedAsync,
  updateUser: unimplementedAsync,
  deleteUser: unimplementedAsync,
  addRole,
  updateRole,
  deleteRole,
  
  // Workflow CRUD operations (stub)
  addWorkflow: unimplementedAsync,
  updateWorkflow: unimplementedAsync,
  deleteWorkflow: unimplementedAsync,
  addWorkflowState: unimplementedAsync,
  updateWorkflowState: unimplementedAsync,
  deleteWorkflowState: unimplementedAsync,
  
  // Class & Class Stream CRUD operations (stub)
  addClass: unimplementedAsync,
  updateClass: unimplementedAsync,
  deleteClass: unimplementedAsync,
  addClassStream: unimplementedAsync,
  updateClassStream: unimplementedAsync,
  deleteClassStream: unimplementedAsync,
  
  // School Details operations (stub)
  updateSchoolDetails: unimplementedAsync,
  
  // RFQ operations (stub)
  addRfq: unimplementedAsync,
  updateRfq: unimplementedAsync,
  deleteRfq: unimplementedAsync,
  
  // Parent Guardian operations (stub)
  addParentGuardian: unimplementedAsync,
  updateParentGuardian: unimplementedAsync,
  deleteParentGuardian: unimplementedAsync,
  addStudentGuardianRelationship: unimplementedAsync,
  updateStudentGuardianRelationship: unimplementedAsync,
  deleteStudentGuardianRelationship: unimplementedAsync,
  
  // Asset Depreciation operations (stub)
  addAssetDepreciationLog: unimplementedAsync,
  
  // Expense Claim operations (stub)
  addExpenseClaim: unimplementedAsync,
  updateExpenseClaim: unimplementedAsync,
  deleteExpenseClaim: unimplementedAsync,
  
  // Audit Log operations (stub)
  addAuditLog: unimplementedAsync,
  permissions,
  roles,
  userRoles,
  addPermission,
  updatePermission,
  deletePermission,
  assignRoleToUser,
  removeRoleFromUser,
} as AppDataContextType;
};

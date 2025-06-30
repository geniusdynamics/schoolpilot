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
    // Supplier CRUD operations
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } as AppDataContextType;
};

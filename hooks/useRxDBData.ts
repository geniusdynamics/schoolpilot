
// hooks/useRxDBData.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import type { RxCollection, RxDocument } from 'rxdb';
import type { SchoolDatabase, SchoolDatabaseCollections } from '../services/rxdbService';
// Import specific functions, not the whole module as a type if not needed
import { getDatabase, seedDatabaseWithMockData, clearDatabase as clearDbFnFromService, getUsingDummyDataFlag as getDummyFlagFnFromService } from '../services/rxdbService';
import * as allTypes from '../types';
import type { AppDataLoadingStates, RawInitialData, AppDataContextType } from '../types';
// Import academic types for explicit state and function signatures
import {
    Subject, SubjectPaper, ClassSubjectAllocation, TeacherSubjectAssignment, StudentSubjectEnrollment,
    ExamPaperSetting, ExamSession, GradingScheme, StudentExamResultWithDetails, StudentPaperMark,
    TimetablePeriodDef, TimetableEntry
} from '../modules/academics/data/types';


const createInitialLoadingStates = (): AppDataLoadingStates => ({
  all: true, schoolDetails: true, roles: true, users: true, students: true, staff: true, classes: true,
  subjects: true, subjectPapers: true, examSessions: true, examPaperSettings: true,
  gradingSchemes: true, studentExamResults: true, classSubjectAllocations: true,
  teacherSubjectAssignments: true, studentSubjectEnrollments: true, timetablePeriodDefs: true, timetableEntries: true,
  departments: true, designations: true, studentCategories: true, dormitories: true,
  academicYears: true, schoolPeriods: true, academicYearStructures: true, academicPeriodDefinitions: true,
  financialYears: true, classStreams: true, parentsGuardians: true, studentGuardianRelationships: true,
  partners: true, clubs: true, customers: true, studentHealthRecords: true, studentAttendance: true,
  templatesComm: true, campaigns: true,
  chartOfAccounts: true, banks: true, suppliers: true,
  feeTemplates: true, feeTemplateItems: true, expenseCategories: true, supplierInvoices: true,
  warehouses: true, itemCategoriesInv: true,
  itemsInv: true, fixedAssets: true, assetDepreciationLogs: true, requisitions: true, purchaseOrders: true,
  stockLevels: true, stockTransactions: true, payrollPeriods: true, payrollItemTypes: true,
  staffSalarySettings: true, payslips: true, bookCategories: true, books: true, loans: true, fines: true,
  customerInvoices: true, workflows: true, mealPlans: true, menus: true, merchants: true, auditLogs: true,
  expenseClaims: true, studentOpeningBalances: true, feeAdjustments: true, transportRoutes: true,
  studentTransportAssignments: true, studentInvoices: true, studentInvoiceItems: true, studentPayments: true,
  invoicePaymentApplications: true, studentMealPlans: true, mealConsumptionLogs: true,
  walletTransactions: true, studentWallets: true, generalPayments: true, generalLedgerEntries: true,
  rfqs: true, appSettings: true, studentClassHistory: true, healthIncidentReports: true, disciplinaryRecords: true,
});

// Helper to create a placeholder for unimplemented async functions
const unimplementedAsync = async (..._args: any[]): Promise<any> => {
  console.warn("RxDB function not implemented yet.");
  await new Promise(resolve => setTimeout(resolve, 50));
  return null; // Ensure a Promise that resolves to null or appropriate type
};
const unimplementedSync = (..._args: any[]): any[] => { console.warn("RxDB getter not implemented yet."); return []; };


export const useRxDBData = (
    getDbFn: typeof getDatabase,
    seedDbFn: (db: SchoolDatabase, mockData: RawInitialData) => Promise<void>,
    clearDbFn: typeof clearDbFnFromService, // Use imported name
    getDummyFlagFn: typeof getDummyFlagFnFromService, // Use imported name
    mockDataForSeeding: RawInitialData
): AppDataContextType => {
  const [dbInstance, setDbInstance] = useState<SchoolDatabase | null>(null);
  const [loading, setLoading] = useState<AppDataLoadingStates>(createInitialLoadingStates());
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const [isUsingRxDBDummyData, setIsUsingRxDBDummyData] = useState<boolean | null>(null);

  // States for ALL entities (Core + Academic Example)
  const [schoolDetails, setSchoolDetails] = useState<allTypes.SchoolDetails | null>(null);
  const [roles, setRoles] = useState<allTypes.Role[]>([]);
  const [users, setUsers] = useState<allTypes.User[]>([]);
  const [students, setStudentsState] = useState<allTypes.Student[]>([]);
  const [staff, setStaffState] = useState<allTypes.Staff[]>([]);
  const [classes, setClassesState] = useState<allTypes.Class[]>([]);
  const [classStreams, setClassStreamsState] = useState<allTypes.ClassStream[]>([]);
  // Academic states
  const [subjects, setSubjectsState] = useState<Subject[]>([]);
  const [subjectPapers, setSubjectPapersState] = useState<SubjectPaper[]>([]);
  const [examSessions, setExamSessionsState] = useState<ExamSession[]>([]);
  const [examPaperSettings, setExamPaperSettingsState] = useState<ExamPaperSetting[]>([]);
  const [gradingSchemes, setGradingSchemesState] = useState<GradingScheme[]>([]);
  const [studentExamResults, setStudentExamResultsState] = useState<StudentExamResultWithDetails[]>([]);
  const [classSubjectAllocations, setClassSubjectAllocationsState] = useState<ClassSubjectAllocation[]>([]);
  const [teacherSubjectAssignments, setTeacherSubjectAssignmentsState] = useState<TeacherSubjectAssignment[]>([]);
  const [studentSubjectEnrollments, setStudentSubjectEnrollmentsState] = useState<StudentSubjectEnrollment[]>([]);
  const [timetablePeriodDefs, setTimetablePeriodDefsState] = useState<TimetablePeriodDef[]>([]);
  const [timetableEntries, setTimetableEntriesState] = useState<TimetableEntry[]>([]);
  // ... (other non-academic states)
  const [departments, setDepartmentsState] = useState<allTypes.Department[]>([]);
  const [designations, setDesignationsState] = useState<allTypes.Designation[]>([]);
  const [studentCategories, setStudentCategoriesState] = useState<allTypes.StudentCategory[]>([]);
  const [dormitories, setDormitoriesState] = useState<allTypes.Dormitory[]>([]);
  const [academicYears, setAcademicYearsState] = useState<allTypes.AcademicYear[]>([]);
  const [schoolPeriods, setSchoolPeriodsState] = useState<allTypes.SchoolPeriod[]>([]);
  const [academicYearStructures, setAcademicYearStructuresState] = useState<allTypes.AcademicYearStructure[]>([]);
  const [academicPeriodDefinitions, setAcademicPeriodDefinitionsState] = useState<allTypes.AcademicPeriodDefinition[]>([]);
  const [financialYears, setFinancialYearsState] = useState<allTypes.FinancialYear[]>([]);
  const [parentsGuardians, setParentsGuardiansState] = useState<allTypes.ParentGuardian[]>([]);
  const [studentGuardianRelationships, setStudentGuardianRelationshipsState] = useState<allTypes.StudentGuardianRelationship[]>([]);
  const [partners, setPartnersState] = useState<allTypes.Partner[]>([]);
  const [clubs, setClubsState] = useState<allTypes.ClubAndSociety[]>([]);
  const [customers, setCustomersState] = useState<allTypes.Customer[]>([]);
  const [studentHealthRecords, setStudentHealthRecordsState] = useState<allTypes.StudentHealthRecord[]>([]);
  const [studentAttendance, setStudentAttendanceState] = useState<allTypes.StudentAttendance[]>([]);
  const [templatesComm, setTemplatesCommState] = useState<allTypes.TemplateComm[]>([]);
  const [campaigns, setCampaignsState] = useState<allTypes.Campaign[]>([]);
  const [chartOfAccounts, setChartOfAccountsState] = useState<allTypes.ChartOfAccount[]>([]);
  const [expenseCategories, setExpenseCategoriesState] = useState<allTypes.ExpenseCategory[]>([]);
  const [banks, setBanksState] = useState<allTypes.Bank[]>([]);
  const [suppliers, setSuppliersState] = useState<allTypes.Supplier[]>([]);
  const [feeTemplates, setFeeTemplatesState] = useState<allTypes.FeeTemplate[]>([]);
  const [feeTemplateItems, setFeeTemplateItemsState] = useState<allTypes.FeeTemplateItem[]>([]);
  const [expenseClaims, setExpenseClaimsState] = useState<allTypes.ExpenseClaim[]>([]);
  const [customerInvoices, setCustomerInvoicesState] = useState<allTypes.CustomerInvoice[]>([]);
  const [supplierInvoices, setSupplierInvoicesState] = useState<allTypes.SupplierInvoice[]>([]);
  const [warehouses, setWarehousesState] = useState<allTypes.Warehouse[]>([]);
  const [itemCategoriesInv, setItemCategoriesInvState] = useState<allTypes.ItemCategoryInv[]>([]);
  const [itemsInv, setItemsInvState] = useState<allTypes.ItemInv[]>([]);
  const [fixedAssets, setFixedAssetsState] = useState<allTypes.FixedAsset[]>([]);
  const [assetDepreciationLogs, setAssetDepreciationLogsState] = useState<allTypes.AssetDepreciationLog[]>([]);
  const [requisitions, setRequisitionsState] = useState<allTypes.Requisition[]>([]);
  const [purchaseOrders, setPurchaseOrdersState] = useState<allTypes.PurchaseOrder[]>([]);
  const [stockLevels, setStockLevelsState] = useState<allTypes.StockLevel[]>([]);
  const [stockTransactions, setStockTransactionsState] = useState<allTypes.StockTransaction[]>([]);
  const [payrollPeriods, setPayrollPeriodsState] = useState<allTypes.PayrollPeriod[]>([]);
  const [payrollItemTypes, setPayrollItemTypesState] = useState<allTypes.PayrollItemType[]>([]);
  const [staffSalarySettings, setStaffSalarySettingsState] = useState<allTypes.StaffSalarySetting[]>([]);
  const [payslips, setPayslipsState] = useState<allTypes.Payslip[]>([]);
  const [bookCategories, setBookCategoriesState] = useState<allTypes.BookCategory[]>([]);
  const [books, setBooksState] = useState<allTypes.Book[]>([]);
  const [loans, setLoansState] = useState<allTypes.Loan[]>([]);
  const [fines, setFinesState] = useState<allTypes.Fine[]>([]);
  const [workflows, setWorkflowsState] = useState<allTypes.Workflow[]>([]);
  const [mealPlans, setMealPlansState] = useState<allTypes.MealPlan[]>([]);
  const [menus, setMenusState] = useState<allTypes.Menu[]>([]);
  const [merchants, setMerchantsState] = useState<allTypes.Merchant[]>([]);
  const [auditLogs, setAuditLogsState] = useState<allTypes.AuditLog[]>([]);
  const [studentOpeningBalances, setStudentOpeningBalancesState] = useState<allTypes.StudentOpeningBalance[]>([]);
  const [feeAdjustments, setFeeAdjustmentsState] = useState<allTypes.FeeAdjustment[]>([]);
  const [transportRoutes, setTransportRoutesState] = useState<allTypes.TransportRoute[]>([]);
  const [studentTransportAssignments, setStudentTransportAssignmentsState] = useState<allTypes.StudentTransportAssignment[]>([]);
  const [studentInvoices, setStudentInvoicesState] = useState<allTypes.StudentInvoice[]>([]);
  const [studentInvoiceItems, setStudentInvoiceItemsState] = useState<allTypes.StudentInvoiceItem[]>([]);
  const [studentPayments, setStudentPaymentsState] = useState<allTypes.StudentPayment[]>([]);
  const [invoicePaymentApplications, setInvoicePaymentApplicationsState] = useState<allTypes.InvoicePaymentApplication[]>([]);
  const [studentMealPlans, setStudentMealPlansState] = useState<allTypes.StudentMealPlan[]>([]);
  const [mealConsumptionLogs, setMealConsumptionLogsState] = useState<allTypes.MealConsumptionLog[]>([]);
  const [walletTransactions, setWalletTransactionsState] = useState<allTypes.WalletTransaction[]>([]);
  const [studentWallets, setStudentWalletsState] = useState<allTypes.StudentWallet[]>([]);
  const [generalPayments, setGeneralPaymentsState] = useState<allTypes.GeneralPayment[]>([]);
  const [generalLedgerEntries, setGeneralLedgerEntriesState] = useState<allTypes.GeneralLedgerEntry[]>([]);
  const [rfqs, setRfqsState] = useState<allTypes.RFQ[]>([]);
  const [appSettings, setAppSettingsState] = useState<allTypes.AppSetting | null>(null);


  useEffect(() => {
    let isMounted = true;
    const subscriptions: Subscription[] = [];

    const setupCollectionSubscription = <T extends Record<string, any>>( // Changed constraint
        collectionName: keyof SchoolDatabaseCollections,
        setState: React.Dispatch<React.SetStateAction<T[]>>,
        setLoadingStateKey: keyof AppDataLoadingStates
    ) => {
        if (dbInstance && dbInstance[collectionName] && isMounted) {
            setLoading(prev => ({ ...prev, [setLoadingStateKey]: true, all: true }));
            const sub = (dbInstance[collectionName] as RxCollection<T>).find().$.subscribe(docs => { // Cast here
                if (isMounted) {
                    setState(docs.map(d => d.toJSON() as T));
                    setLoading(prev => ({ ...prev, [setLoadingStateKey]: false }));
                }
            });
            subscriptions.push(sub);
        }
    };
    
    const setupSingleDocSubscription = <T, >(
        collectionName: keyof SchoolDatabaseCollections,
        docId: string | number,
        setState: React.Dispatch<React.SetStateAction<T | null>>,
        setLoadingStateKey: keyof AppDataLoadingStates
    ) => {
         if (dbInstance && dbInstance[collectionName] && isMounted) {
            setLoading(prev => ({ ...prev, [setLoadingStateKey]: true, all: true }));
            // @ts-ignore // docId type might be string or number based on PK
            const sub = (dbInstance[collectionName] as RxCollection<any>).findOne(docId).$.subscribe(doc => { // Cast here
                 if (isMounted) {
                    setState(doc ? doc.toJSON() as T : null);
                    setLoading(prev => ({ ...prev, [setLoadingStateKey]: false }));
                }
            });
            subscriptions.push(sub);
         }
    };


    (async () => {
      try {
        const db = await getDbFn();
        setDbInstance(db);
        console.log("RxDB: Database instance obtained in hook.");

        const dummyFlag = await getDummyFlagFn(db);
        if (isMounted) setIsUsingRxDBDummyData(dummyFlag);

        // Setup all subscriptions
        setupSingleDocSubscription('school_details', 1, setSchoolDetails, 'schoolDetails'); // Assuming ID 1 for school_details
        setupCollectionSubscription('roles', setRoles, 'roles');
        setupCollectionSubscription('users', setUsers, 'users');
        setupCollectionSubscription('students', setStudentsState, 'students');
        setupCollectionSubscription('staff', setStaffState, 'staff');
        setupCollectionSubscription('classes', setClassesState, 'classes');
        setupCollectionSubscription('class_streams', setClassStreamsState, 'classStreams');
        // Academic Collections
        setupCollectionSubscription('subjects', setSubjectsState, 'subjects');
        setupCollectionSubscription('subject_papers', setSubjectPapersState, 'subjectPapers');
        setupCollectionSubscription('exam_sessions', setExamSessionsState, 'examSessions');
        // examPaperSettings are nested, might not need direct sub if always accessed via examSessions
        setupCollectionSubscription('grading_schemes', setGradingSchemesState, 'gradingSchemes');
        setupCollectionSubscription('student_exam_results', setStudentExamResultsState, 'studentExamResults');
        setupCollectionSubscription('class_subject_allocations', setClassSubjectAllocationsState, 'classSubjectAllocations');
        setupCollectionSubscription('teacher_subject_assignments', setTeacherSubjectAssignmentsState, 'teacherSubjectAssignments');
        setupCollectionSubscription('student_subject_enrollments', setStudentSubjectEnrollmentsState, 'studentSubjectEnrollments');
        setupCollectionSubscription('timetable_period_definitions', setTimetablePeriodDefsState, 'timetablePeriodDefs');
        setupCollectionSubscription('timetable_entries', setTimetableEntriesState, 'timetableEntries');
        // ... Continue for ALL other collections defined in SchoolDatabaseCollections
        setupCollectionSubscription('departments', setDepartmentsState, 'departments');
        setupCollectionSubscription('designations', setDesignationsState, 'designations');
        setupCollectionSubscription('student_categories', setStudentCategoriesState, 'studentCategories');
        setupCollectionSubscription('dormitories', setDormitoriesState, 'dormitories');
        setupCollectionSubscription('academic_years', setAcademicYearsState, 'academicYears');
        setupCollectionSubscription('school_periods', setSchoolPeriodsState, 'schoolPeriods');
        setupCollectionSubscription('academic_year_structures', setAcademicYearStructuresState, 'academicYearStructures');
        setupCollectionSubscription('academic_period_definitions', setAcademicPeriodDefinitionsState, 'academicPeriodDefinitions');
        setupCollectionSubscription('financial_years', setFinancialYearsState, 'financialYears');
        setupCollectionSubscription('parents_guardians', setParentsGuardiansState, 'parentsGuardians');
        setupCollectionSubscription('student_guardian_relationships', setStudentGuardianRelationshipsState, 'studentGuardianRelationships');
        setupCollectionSubscription('partners', setPartnersState, 'partners');
        setupCollectionSubscription('clubs', setClubsState, 'clubs');
        setupCollectionSubscription('customers', setCustomersState, 'customers');
        setupCollectionSubscription('student_health_records', setStudentHealthRecordsState, 'studentHealthRecords');
        setupCollectionSubscription('student_attendance', setStudentAttendanceState, 'studentAttendance');
        setupCollectionSubscription('communication_templates', setTemplatesCommState, 'templatesComm');
        setupCollectionSubscription('message_campaigns', setCampaignsState, 'campaigns');
        setupCollectionSubscription('chart_of_accounts', setChartOfAccountsState, 'chartOfAccounts');
        setupCollectionSubscription('expense_categories', setExpenseCategoriesState, 'expenseCategories');
        setupCollectionSubscription('banks', setBanksState, 'banks');
        setupCollectionSubscription('suppliers', setSuppliersState, 'suppliers');
        setupCollectionSubscription('fee_templates', setFeeTemplatesState, 'feeTemplates');
        setupCollectionSubscription('fee_template_items', setFeeTemplateItemsState, 'feeTemplateItems');
        setupCollectionSubscription('expense_claims', setExpenseClaimsState, 'expenseClaims');
        setupCollectionSubscription('customer_invoices', setCustomerInvoicesState, 'customerInvoices');
        setupCollectionSubscription('supplier_invoices', setSupplierInvoicesState, 'supplierInvoices');
        setupCollectionSubscription('warehouses', setWarehousesState, 'warehouses');
        setupCollectionSubscription('item_categories_inv', setItemCategoriesInvState, 'itemCategoriesInv');
        setupCollectionSubscription('items_inv', setItemsInvState, 'itemsInv');
        setupCollectionSubscription('fixed_assets', setFixedAssetsState, 'fixedAssets');
        setupCollectionSubscription('asset_depreciation_logs', setAssetDepreciationLogsState, 'assetDepreciationLogs');
        setupCollectionSubscription('requisitions', setRequisitionsState, 'requisitions');
        setupCollectionSubscription('purchase_orders', setPurchaseOrdersState, 'purchaseOrders');
        setupCollectionSubscription('stock_levels', setStockLevelsState, 'stockLevels');
        setupCollectionSubscription('stock_transactions', setStockTransactionsState, 'stockTransactions');
        setupCollectionSubscription('payroll_periods', setPayrollPeriodsState, 'payrollPeriods');
        setupCollectionSubscription('payroll_item_types', setPayrollItemTypesState, 'payrollItemTypes');
        setupCollectionSubscription('staff_salary_settings', setStaffSalarySettingsState, 'staffSalarySettings');
        setupCollectionSubscription('payslips', setPayslipsState, 'payslips');
        setupCollectionSubscription('book_categories', setBookCategoriesState, 'bookCategories');
        setupCollectionSubscription('books', setBooksState, 'books');
        setupCollectionSubscription('loans', setLoansState, 'loans');
        setupCollectionSubscription('fines', setFinesState, 'fines');
        setupCollectionSubscription('workflows', setWorkflowsState, 'workflows');
        setupCollectionSubscription('meal_plans', setMealPlansState, 'mealPlans');
        setupCollectionSubscription('menus', setMenusState, 'menus');
        setupCollectionSubscription('merchants', setMerchantsState, 'merchants');
        setupCollectionSubscription('audit_logs', setAuditLogsState, 'auditLogs');
        setupCollectionSubscription('student_opening_balances', setStudentOpeningBalancesState, 'studentOpeningBalances');
        setupCollectionSubscription('fee_adjustments', setFeeAdjustmentsState, 'feeAdjustments');
        setupCollectionSubscription('transport_routes', setTransportRoutesState, 'transportRoutes');
        setupCollectionSubscription('student_transport_assignments', setStudentTransportAssignmentsState, 'studentTransportAssignments');
        setupCollectionSubscription('student_invoices', setStudentInvoicesState, 'studentInvoices');
        setupCollectionSubscription('student_invoice_items', setStudentInvoiceItemsState, 'studentInvoiceItems');
        setupCollectionSubscription('student_payments', setStudentPaymentsState, 'studentPayments');
        setupCollectionSubscription('invoice_payment_applications', setInvoicePaymentApplicationsState, 'invoicePaymentApplications');
        setupCollectionSubscription('student_meal_plans', setStudentMealPlansState, 'studentMealPlans');
        setupCollectionSubscription('meal_consumption_logs', setMealConsumptionLogsState, 'mealConsumptionLogs');
        setupCollectionSubscription('wallet_transactions', setWalletTransactionsState, 'walletTransactions');
        setupCollectionSubscription('student_wallets', setStudentWalletsState, 'studentWallets');
        setupCollectionSubscription('general_payments', setGeneralPaymentsState, 'generalPayments');
        setupCollectionSubscription('general_ledger_entries', setGeneralLedgerEntriesState, 'generalLedgerEntries');
        setupCollectionSubscription('rfqs', setRfqsState, 'rfqs');
        setupSingleDocSubscription('app_settings', 'config', setAppSettingsState, 'appSettings');


        // After all subscriptions are set up, mark 'all' as false if no specific loading is true
         if (isMounted) {
            // Wait a brief moment for initial emissions, then assess 'all'
            setTimeout(() => {
                if (isMounted) {
                     setLoading(prev => {
                        const stillLoadingSomething = Object.values(prev).some(status => status === true);
                        return { ...prev, all: stillLoadingSomething };
                    });
                }
            }, 500); // Adjust delay as needed
        }

      } catch (err: any) {
        if (isMounted) {
            console.error("RxDB Hook Error:", err);
            setInitializationError(err);
            // Set all specific loading states to false on error
            const errorLoadingStates = Object.keys(createInitialLoadingStates()).reduce((acc, key) => {
                acc[key as keyof AppDataLoadingStates] = false;
                return acc;
            }, {} as AppDataLoadingStates);
            setLoading(errorLoadingStates);
        }
      }
    })();
    return () => {
        isMounted = false;
        subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [getDbFn, getDummyFlagFn, dbInstance]); // Added dbInstance as a dependency


  const triggerSeedRxDB = useCallback(async () => {
    if (dbInstance) {
      await seedDbFn(dbInstance, mockDataForSeeding);
      setIsUsingRxDBDummyData(true);
    } else {
      console.error("DB instance not available to seed.");
    }
  }, [dbInstance, seedDbFn, mockDataForSeeding]);

  const triggerClearRxDB = useCallback(async () => {
    if (dbInstance) {
      await clearDbFn(dbInstance);
      setIsUsingRxDBDummyData(false);
    } else {
      console.error("DB instance not available to clear.");
    }
  }, [dbInstance, clearDbFn]);

  const resolveStudentDetails = useCallback((student: allTypes.Student): allTypes.Student => { /* ... */ return student; }, [classStreams, studentCategories, dormitories, users, classes]);
  const resolveStaffDetails = useCallback((staffMember: allTypes.Staff): allTypes.Staff => { /* ... */ return staffMember; }, [departments, designations, users]);
  

  const getStudentDetailsById = useCallback(async (studentId: string): Promise<allTypes.StudentDetailProfile | null> => {
    if(!dbInstance) return unimplementedAsync(studentId) as Promise<allTypes.StudentDetailProfile | null>;
    const studentDoc = await dbInstance.students.findOne(studentId).exec();
    if (!studentDoc) return null;
    const studentBase = studentDoc.toJSON();
    return {
        ...resolveStudentDetails(studentBase),
        financial_summary: { totalFees: 0, totalPaid: 0, currentBalance: 0, totalDiscount:0, totalFine:0 },
        invoices_charges: [],
        payment_history: [],
        enrolled_subjects: []
    };
  }, [dbInstance, resolveStudentDetails]);

  const getStudentFinancialDetailsById = useCallback(async (studentId: string): Promise<allTypes.StudentDetailProfile | null> => {
      return getStudentDetailsById(studentId); // Alias for now
  }, [getStudentDetailsById]);


  // Placeholder for all other CRUD functions.
  // Each of these needs to be implemented to interact with dbInstance.
  // For now, they will use 'unimplementedAsync' or 'unimplementedSync'.

  const crudFunctions: Omit<AppDataContextType, 
    keyof RawInitialData | 
    'schoolDetails' | 'roles' | 'users' | 'students' | 'staff' | 'classes' | 'classStreams' | 
    'subjects' | 'departments' | 'designations' | 'studentCategories' | 'dormitories' | 
    'academicYears' | 'schoolPeriods' | 'academicYearStructures' | 'academicPeriodDefinitions' | 
    'financialYears' | 'parentsGuardians' | 'studentGuardianRelationships' | 'partners' | 'clubs' | 
    'customers' | 'studentHealthRecords' | 'studentAttendance' | 'timetablePeriodDefs' | 
    'templatesComm' | 'campaigns' | 'subjectPapers' | 'examSessions' | 'examPaperSettings' | 
    'gradingSchemes' | 'chartOfAccounts' | 'expenseCategories' | 'banks' | 'suppliers' | 
    'feeTemplates' | 'feeTemplateItems' | 'expenseClaims' | 'customerInvoices' | 'supplierInvoices' | 
    'studentExamResults' | 'classSubjectAllocations' | 'teacherSubjectAssignments' | 
    'studentSubjectEnrollments' | 'timetableEntries' | 'warehouses' | 'itemCategoriesInv' | 
    'itemsInv' | 'fixedAssets' | 'assetDepreciationLogs' | 'requisitions' | 'purchaseOrders' | 
    'stockLevels' | 'stockTransactions' | 'payrollPeriods' | 'payrollItemTypes' | 
    'staffSalarySettings' | 'payslips' | 'bookCategories' | 'books' | 'loans' | 'fines' | 
    'workflows' | 'mealPlans' | 'menus' | 'merchants' | 'auditLogs' | 'studentOpeningBalances' | 
    'feeAdjustments' | 'transportRoutes' | 'studentTransportAssignments' | 'studentInvoices' | 
    'studentInvoiceItems' | 'studentPayments' | 'invoicePaymentApplications' | 'studentMealPlans' | 
    'mealConsumptionLogs' | 'walletTransactions' | 'studentWallets' | 'generalPayments' | 
    'generalLedgerEntries' | 'rfqs' | 'appSettings' | 
    'loading' | 'initializationError' | 'isRxDBModeActive' | 'isUsingRxDBDummyData' | 
    'triggerSeedRxDB' | 'triggerClearRxDB' | 'rawInitialData' | 
    'getStudentDetailsById' | 'getStudentFinancialDetailsById' // Explicitly defined above
    > = {
        updateSchoolDetails: unimplementedAsync as (details: Partial<allTypes.SchoolDetails>) => Promise<allTypes.SchoolDetails | null>,
        addUser: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.User, 'id' | 'created_at' | 'updated_at' | 'last_login_at' | 'hashed_password' | 'display_name' | 'role' | 'deleted_at' >) => Promise<allTypes.User>,
        updateUser: unimplementedAsync as (updatedUser: allTypes.User) => Promise<allTypes.User>,
        deleteUser: unimplementedAsync as (userId: string) => Promise<void>,
        addRole: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Role>) => Promise<allTypes.Role>,
        updateRole: unimplementedAsync as (updatedRole: allTypes.Role) => Promise<allTypes.Role>,
        deleteRole: unimplementedAsync as (roleId: number) => Promise<void>,
        addStudent: unimplementedAsync as (studentData: allTypes.CreatePayload<allTypes.Student, 'id' | 'created_at' | 'updated_at' | 'primary_guardian' | 'exam_result_summary' | 'current_class_name' | 'current_class_stream_name' | 'student_category_name' | 'dormitory_name' | 'display_name' | 'deleted_at'>, guardianData?: allTypes.CreatePayload<allTypes.ParentGuardian, 'id'|'created_at'|'updated_at'|'deleted_at'>) => Promise<allTypes.Student>,
        updateStudent: unimplementedAsync as (updatedStudentData: allTypes.Student, guardianData?: allTypes.ParentGuardian) => Promise<allTypes.StudentDetailProfile>,
        deleteStudent: unimplementedAsync as (studentId: string) => Promise<void>,
        addStaffMember: unimplementedAsync as (staffData: allTypes.CreatePayload<allTypes.Staff>) => Promise<allTypes.Staff>,
        updateStaffMember: unimplementedAsync as (updatedStaffData: allTypes.Staff) => Promise<allTypes.Staff>,
        deleteStaffMember: unimplementedAsync as (staffId: string) => Promise<void>,
        addParentGuardian: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.ParentGuardian>) => Promise<allTypes.ParentGuardian>,
        updateParentGuardian: unimplementedAsync as (data: allTypes.ParentGuardian) => Promise<allTypes.ParentGuardian>,
        deleteParentGuardian: unimplementedAsync as (id: string) => Promise<void>,
        addStudentGuardianRelationship: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.StudentGuardianRelationship>) => Promise<allTypes.StudentGuardianRelationship>,
        updateStudentGuardianRelationship: unimplementedAsync as (data: allTypes.StudentGuardianRelationship) => Promise<allTypes.StudentGuardianRelationship>,
        deleteStudentGuardianRelationship: unimplementedAsync as (id: string) => Promise<void>,
        addDepartment: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Department>) => Promise<allTypes.Department>,
        updateDepartment: unimplementedAsync as (updatedDept: allTypes.Department) => Promise<allTypes.Department>,
        deleteDepartment: unimplementedAsync as (departmentId: number) => Promise<void>,
        addDesignation: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Designation>) => Promise<allTypes.Designation>,
        updateDesignation: unimplementedAsync as (updatedDesignation: allTypes.Designation) => Promise<allTypes.Designation>,
        deleteDesignation: unimplementedAsync as (designationId: number) => Promise<void>,
        addStudentCategory: unimplementedAsync as (data: Omit<allTypes.StudentCategory, 'id'>) => Promise<allTypes.StudentCategory>,
        updateStudentCategory: unimplementedAsync as (updatedCategory: allTypes.StudentCategory) => Promise<allTypes.StudentCategory>,
        deleteStudentCategory: unimplementedAsync as (categoryId: number) => Promise<void>,
        addDormitory: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Dormitory>) => Promise<allTypes.Dormitory>,
        updateDormitory: unimplementedAsync as (updatedDorm: allTypes.Dormitory) => Promise<allTypes.Dormitory>,
        deleteDormitory: unimplementedAsync as (dormId: number) => Promise<void>,
        addAcademicYearStructure: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.AcademicYearStructure>) => Promise<allTypes.AcademicYearStructure>,
        updateAcademicYearStructure: unimplementedAsync as (updatedStructure: allTypes.AcademicYearStructure) => Promise<allTypes.AcademicYearStructure>,
        deleteAcademicYearStructure: unimplementedAsync as (structureId: number) => Promise<void>,
        addAcademicPeriodDefinition: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.AcademicPeriodDefinition>) => Promise<allTypes.AcademicPeriodDefinition>,
        updateAcademicPeriodDefinition: unimplementedAsync as (updatedDefinition: allTypes.AcademicPeriodDefinition) => Promise<allTypes.AcademicPeriodDefinition>,
        deleteAcademicPeriodDefinition: unimplementedAsync as (definitionId: number) => Promise<void>,
        addAcademicYear: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.AcademicYear>) => Promise<allTypes.AcademicYear>,
        updateAcademicYear: unimplementedAsync as (updatedYear: allTypes.AcademicYear) => Promise<allTypes.AcademicYear>,
        deleteAcademicYear: unimplementedAsync as (yearId: number) => Promise<void>,
        addSchoolPeriod: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.SchoolPeriod>) => Promise<allTypes.SchoolPeriod>,
        updateSchoolPeriod: unimplementedAsync as (updatedPeriod: allTypes.SchoolPeriod) => Promise<allTypes.SchoolPeriod>,
        deleteSchoolPeriod: unimplementedAsync as (periodId: number) => Promise<void>,
        addPartner: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Partner>) => Promise<allTypes.Partner>,
        updatePartner: unimplementedAsync as (updatedPartner: allTypes.Partner) => Promise<allTypes.Partner>,
        deletePartner: unimplementedAsync as (partnerId: string) => Promise<void>,
        addClub: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.ClubAndSociety>) => Promise<allTypes.ClubAndSociety>,
        updateClub: unimplementedAsync as (updatedClub: allTypes.ClubAndSociety) => Promise<allTypes.ClubAndSociety>,
        deleteClub: unimplementedAsync as (clubId: number) => Promise<void>,
        addCustomer: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Customer>) => Promise<allTypes.Customer>,
        updateCustomer: unimplementedAsync as (updatedCustomer: allTypes.Customer) => Promise<allTypes.Customer>,
        deleteCustomer: unimplementedAsync as (customerId: number) => Promise<void>,
        addStudentHealthRecord: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.StudentHealthRecord>) => Promise<allTypes.StudentHealthRecord>,
        updateStudentHealthRecord: unimplementedAsync as (updatedRecord: allTypes.StudentHealthRecord) => Promise<allTypes.StudentHealthRecord>,
        saveStudentAttendance: unimplementedAsync as (records: Array<Omit<allTypes.StudentAttendance, 'id' | 'created_at'|'student_name'|'period_name'>>) => Promise<void>,
        getStudentAttendanceByFilters: unimplementedSync as (date: string, classStreamId: number, periodId: number) => allTypes.StudentAttendance[],
        addTemplateComm: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.TemplateComm>) => Promise<allTypes.TemplateComm>,
        updateTemplateComm: unimplementedAsync as (updatedTemplate: allTypes.TemplateComm) => Promise<allTypes.TemplateComm>,
        deleteTemplateComm: unimplementedAsync as (templateId: number) => Promise<void>,
        addCampaign: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Campaign, 'id'|'created_at'|'updated_at'|'approved_by'|'template_name'|'created_by_name'|'target_audience_display'|'approved_by_name'|'sent_at'>) => Promise<allTypes.Campaign>,
        updateCampaign: unimplementedAsync as (updatedCampaign: allTypes.Campaign) => Promise<allTypes.Campaign>,
        deleteCampaign: unimplementedAsync as (campaignId: string) => Promise<void>,
        addAuditLog: unimplementedAsync as (data: Omit<allTypes.AuditLog, 'id'|'changed_at'>) => Promise<allTypes.AuditLog>,
        addClass: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Class>) => Promise<allTypes.Class>,
        updateClass: unimplementedAsync as (updatedClass: allTypes.Class) => Promise<allTypes.Class>,
        deleteClass: unimplementedAsync as (classId: number) => Promise<void>,
        addClassStream: unimplementedAsync as (classId: number, data: allTypes.CreatePayload<allTypes.ClassStream, 'id'|'class_id'|'class_name'|'class_teacher_name'>) => Promise<allTypes.ClassStream>,
        updateClassStream: unimplementedAsync as (updatedStream: allTypes.ClassStream) => Promise<allTypes.ClassStream>,
        deleteClassStream: unimplementedAsync as (streamId: number) => Promise<void>,
        addSubject: unimplementedAsync as (data: allTypes.CreatePayload<Subject>) => Promise<Subject>,
        updateSubject: unimplementedAsync as (updatedSubject: Subject) => Promise<Subject>,
        deleteSubject: unimplementedAsync as (subjectId: number) => Promise<void>,
        addSubjectPaper: unimplementedAsync as (data: allTypes.CreatePayload<SubjectPaper>) => Promise<SubjectPaper>,
        updateSubjectPaper: unimplementedAsync as (updatedPaper: SubjectPaper) => Promise<SubjectPaper>,
        deleteSubjectPaper: unimplementedAsync as (paperId: number) => Promise<void>,
        addExamSession: unimplementedAsync as (data: allTypes.CreatePayload<ExamSession>) => Promise<ExamSession>,
        updateExamSession: unimplementedAsync as (updatedSession: ExamSession) => Promise<ExamSession>,
        deleteExamSession: unimplementedAsync as (sessionId: string) => Promise<void>,
        addExamPaperSetting: unimplementedAsync as (data: allTypes.CreatePayload<ExamPaperSetting>) => Promise<ExamPaperSetting>,
        updateExamPaperSetting: unimplementedAsync as (updatedSetting: ExamPaperSetting) => Promise<ExamPaperSetting>,
        deleteExamPaperSetting: unimplementedAsync as (settingId: string, examSessionId: string) => Promise<void>,
        addGradingScheme: unimplementedAsync as (data: allTypes.CreatePayload<GradingScheme >) => Promise<GradingScheme>,
        updateGradingScheme: unimplementedAsync as (updatedScheme: GradingScheme) => Promise<GradingScheme>,
        deleteGradingScheme: unimplementedAsync as (schemeId: number) => Promise<void>,
        getStudentsForExamEntry: unimplementedSync as (classStreamId: number) => allTypes.Student[],
        getExamPaperSettingsForSession: unimplementedSync as (examSessionId: string) => ExamPaperSetting[],
        saveStudentExamResult: unimplementedAsync as (resultData: Omit<StudentExamResult, 'id'|'created_at'|'updated_at'|'marks'>, marksData: Array<Omit<StudentPaperMark, 'id' | 'student_exam_result_id'>>) => Promise<StudentExamResultWithDetails>,
        getTimetablePeriodDefs: unimplementedSync as () => TimetablePeriodDef[],
        addTimetablePeriodDef: unimplementedAsync as (data: Omit<TimetablePeriodDef, 'id'>) => Promise<TimetablePeriodDef>,
        updateTimetablePeriodDef: unimplementedAsync as (updatedDef: TimetablePeriodDef) => Promise<TimetablePeriodDef>,
        deleteTimetablePeriodDef: unimplementedAsync as (defId: number) => Promise<void>,
        getTimetableEntries: unimplementedSync as (classStreamId: number) => TimetableEntry[],
        addTimetableEntry: unimplementedAsync as (data: allTypes.CreatePayload<TimetableEntry>) => Promise<TimetableEntry>,
        updateTimetableEntry: unimplementedAsync as (updatedEntry: TimetableEntry) => Promise<TimetableEntry>,
        deleteTimetableEntry: unimplementedAsync as (entryId: string) => Promise<void>,
        addClassSubjectAllocation: unimplementedAsync as (data: allTypes.CreatePayload<ClassSubjectAllocation>) => Promise<ClassSubjectAllocation>,
        updateClassSubjectAllocation: unimplementedAsync as (updatedAllocation: ClassSubjectAllocation) => Promise<ClassSubjectAllocation>,
        deleteClassSubjectAllocation: unimplementedAsync as (allocationId: string) => Promise<void>,
        addTeacherSubjectAssignment: unimplementedAsync as (data: allTypes.CreatePayload<TeacherSubjectAssignment>) => Promise<TeacherSubjectAssignment>,
        deleteTeacherSubjectAssignment: unimplementedAsync as (assignmentId: string) => Promise<void>,
        addStudentSubjectEnrollment: unimplementedAsync as (data: allTypes.CreatePayload<StudentSubjectEnrollment>) => Promise<StudentSubjectEnrollment>,
        updateStudentSubjectEnrollment: unimplementedAsync as (updatedEnrollment: StudentSubjectEnrollment) => Promise<StudentSubjectEnrollment>,
        deleteStudentSubjectEnrollment: unimplementedAsync as (enrollmentId: string) => Promise<void>,
        addChartOfAccount: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.ChartOfAccount>) => Promise<allTypes.ChartOfAccount>,
        updateChartOfAccount: unimplementedAsync as (updatedAccount: allTypes.ChartOfAccount) => Promise<allTypes.ChartOfAccount>,
        deleteChartOfAccount: unimplementedAsync as (accountId: number) => Promise<void>,
        addBank: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Bank>) => Promise<allTypes.Bank>,
        updateBank: unimplementedAsync as (updatedBank: allTypes.Bank) => Promise<allTypes.Bank>,
        deleteBank: unimplementedAsync as (bankId: number) => Promise<void>,
        addSupplier: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Supplier>) => Promise<allTypes.Supplier>,
        updateSupplier: unimplementedAsync as (updatedSupplier: allTypes.Supplier) => Promise<allTypes.Supplier>,
        deleteSupplier: unimplementedAsync as (supplierId: number) => Promise<void>,
        addFeeTemplate: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.FeeTemplate> & {items: allTypes.CreatePayload<allTypes.FeeTemplateItem, 'id'|'fee_template_id'|'revenue_account_name'|'linked_expense_category_name'>[]}) => Promise<allTypes.FeeTemplate>,
        updateFeeTemplate: unimplementedAsync as (updatedTemplate: allTypes.FeeTemplate) => Promise<allTypes.FeeTemplate>,
        deleteFeeTemplate: unimplementedAsync as (templateId: number) => Promise<void>,
        addExpenseClaim: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.ExpenseClaim>) => Promise<allTypes.ExpenseClaim>,
        updateExpenseClaim: unimplementedAsync as (updatedClaim: allTypes.ExpenseClaim) => Promise<allTypes.ExpenseClaim>,
        deleteExpenseClaim: unimplementedAsync as (claimId: string) => Promise<void>,
        addExpenseCategory: unimplementedAsync as (data: Omit<allTypes.ExpenseCategory, 'id'>) => Promise<allTypes.ExpenseCategory>,
        updateExpenseCategory: unimplementedAsync as (updatedCategory: allTypes.ExpenseCategory) => Promise<allTypes.ExpenseCategory>,
        deleteExpenseCategory: unimplementedAsync as (categoryId: number) => Promise<void>,
        addCustomerInvoice: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.CustomerInvoice> & {items: allTypes.CreatePayload<allTypes.CustomerInvoiceItem, 'id'|'invoice_id'|'revenue_account_name'>[]}) => Promise<allTypes.CustomerInvoice>,
        updateCustomerInvoice: unimplementedAsync as (updatedInvoice: allTypes.CustomerInvoice) => Promise<allTypes.CustomerInvoice>,
        deleteCustomerInvoice: unimplementedAsync as (invoiceId: string) => Promise<void>,
        addSupplierInvoice: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.SupplierInvoice>) => Promise<allTypes.SupplierInvoice>,
        updateSupplierInvoice: unimplementedAsync as (updatedInvoice: allTypes.SupplierInvoice) => Promise<allTypes.SupplierInvoice>,
        deleteSupplierInvoice: unimplementedAsync as (invoiceId: string) => Promise<void>,
        addStudentOpeningBalance: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.StudentOpeningBalance>) => Promise<allTypes.StudentOpeningBalance>,
        updateStudentOpeningBalance: unimplementedAsync as (updatedBalance: allTypes.StudentOpeningBalance) => Promise<allTypes.StudentOpeningBalance>,
        deleteStudentOpeningBalance: unimplementedAsync as (balanceId: string) => Promise<void>,
        addFeeAdjustment: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.FeeAdjustment>) => Promise<allTypes.FeeAdjustment>,
        updateFeeAdjustment: unimplementedAsync as (updatedAdjustment: allTypes.FeeAdjustment) => Promise<allTypes.FeeAdjustment>,
        deleteFeeAdjustment: unimplementedAsync as (adjustmentId: string) => Promise<void>,
        addTransportRoute: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.TransportRoute>) => Promise<allTypes.TransportRoute>,
        updateTransportRoute: unimplementedAsync as (updatedRoute: allTypes.TransportRoute) => Promise<allTypes.TransportRoute>,
        deleteTransportRoute: unimplementedAsync as (routeId: number) => Promise<void>,
        addStudentTransportAssignment: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.StudentTransportAssignment, 'id'|'created_at'|'updated_at'|'student_name'|'route_name'|'school_period_name'|'invoice_id'>) => Promise<allTypes.StudentTransportAssignment>,
        updateStudentTransportAssignment: unimplementedAsync as (updatedAssignment: allTypes.StudentTransportAssignment) => Promise<allTypes.StudentTransportAssignment>,
        deleteStudentTransportAssignment: unimplementedAsync as (assignmentId: string) => Promise<void>,
        generateStudentInvoices: unimplementedAsync as (feeTemplateId: number, schoolPeriodId: number, studentCriteria: { categoryId?: number, classStreamId?: number}) => Promise<allTypes.StudentInvoice[]>,
        addStudentPayment: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.StudentPayment>) => Promise<allTypes.StudentPayment>,
        updateStudentPayment: unimplementedAsync as (updatedPayment: allTypes.StudentPayment) => Promise<allTypes.StudentPayment>,
        deleteStudentPayment: unimplementedAsync as (paymentId: string) => Promise<void>,
        applyPaymentToInvoices: unimplementedAsync as (paymentId: string, applications: Array<Omit<allTypes.InvoicePaymentApplication, 'id'>>) => Promise<void>,
        addGeneralPayment: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.GeneralPayment, 'id'|'created_at'|'updated_at'|'total_amount_paid'|'payer_name_resolved'|'items'> & {items: allTypes.CreatePayload<allTypes.GeneralPaymentItem, 'id'|'general_payment_id'|'revenue_account_name'>[]}) => Promise<allTypes.GeneralPayment>,
        updateGeneralPayment: unimplementedAsync as (updatedPayment: allTypes.GeneralPayment) => Promise<allTypes.GeneralPayment>,
        deleteGeneralPayment: unimplementedAsync as (paymentId: string) => Promise<void>,
        addFinancialYear: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.FinancialYear>) => Promise<allTypes.FinancialYear>,
        updateFinancialYear: unimplementedAsync as (updatedFY: allTypes.FinancialYear) => Promise<allTypes.FinancialYear>,
        deleteFinancialYear: unimplementedAsync as (fyId: number) => Promise<void>,
        addPayrollPeriod: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.PayrollPeriod>) => Promise<allTypes.PayrollPeriod>,
        updatePayrollPeriod: unimplementedAsync as (updatedPeriod: allTypes.PayrollPeriod) => Promise<allTypes.PayrollPeriod>,
        deletePayrollPeriod: unimplementedAsync as (periodId: number) => Promise<void>,
        addPayrollItemType: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.PayrollItemType>) => Promise<allTypes.PayrollItemType>,
        updatePayrollItemType: unimplementedAsync as (updatedItemType: allTypes.PayrollItemType) => Promise<allTypes.PayrollItemType>,
        deletePayrollItemType: unimplementedAsync as (itemTypeId: number) => Promise<void>,
        updateStaffSalarySetting: unimplementedAsync as (staffId: string, settingData: allTypes.CreatePayload<allTypes.StaffSalarySetting, 'id'|'staff_id'|'created_at'|'updated_at'|'staff_name'|'recurring_items'>, recurringItemsData: Array<allTypes.CreatePayload<allTypes.StaffRecurringItem, 'id' | 'staff_salary_setting_id' | 'created_at' | 'item_type_name' | 'item_category'>>) => Promise<allTypes.StaffSalarySetting>,
        generatePayslipsForPeriod: unimplementedAsync as (payrollPeriodId: number) => Promise<allTypes.Payslip[]>,
        addWarehouse: unimplementedAsync as (data: Omit<allTypes.Warehouse, 'id'>) => Promise<allTypes.Warehouse>,
        updateWarehouse: unimplementedAsync as (updatedWarehouse: allTypes.Warehouse) => Promise<allTypes.Warehouse>,
        deleteWarehouse: unimplementedAsync as (warehouseId: number) => Promise<void>,
        addItemCategoryInv: unimplementedAsync as (data: Omit<allTypes.ItemCategoryInv, 'id'>) => Promise<allTypes.ItemCategoryInv>,
        updateItemCategoryInv: unimplementedAsync as (updatedCategory: allTypes.ItemCategoryInv) => Promise<allTypes.ItemCategoryInv>,
        deleteItemCategoryInv: unimplementedAsync as (categoryId: number) => Promise<void>,
        addItemInv: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.ItemInv>) => Promise<allTypes.ItemInv>,
        updateItemInv: unimplementedAsync as (updatedItem: allTypes.ItemInv) => Promise<allTypes.ItemInv>,
        deleteItemInv: unimplementedAsync as (itemId: string) => Promise<void>,
        addFixedAsset: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.FixedAsset>) => Promise<allTypes.FixedAsset>,
        updateFixedAsset: unimplementedAsync as (updatedAsset: allTypes.FixedAsset>) => Promise<allTypes.FixedAsset>,
        deleteFixedAsset: unimplementedAsync as (assetId: string) => Promise<void>,
        addAssetDepreciationLog: unimplementedAsync as (data: Omit<allTypes.AssetDepreciationLog, 'id'>) => Promise<allTypes.AssetDepreciationLog>,
        addRequisition: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Requisition>, items: allTypes.CreatePayload<allTypes.RequisitionItem, 'id' | 'requisition_id' | 'item_name' | 'line_total'| 'fulfillment_stock_transaction_id' | 'quantity_issued'>[]) => Promise<allTypes.Requisition>,
        updateRequisition: unimplementedAsync as (updatedReq: allTypes.Requisition, items: allTypes.RequisitionItem[]) => Promise<allTypes.Requisition>,
        deleteRequisition: unimplementedAsync as (reqId: string) => Promise<void>,
        updateRequisitionStatus: unimplementedAsync as (reqId: string, status: allTypes.RequisitionStatus) => Promise<allTypes.Requisition>,
        addPurchaseOrder: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.PurchaseOrder>, items: allTypes.CreatePayload<allTypes.PurchaseOrderItem, 'id' | 'purchase_order_id' | 'item_name' | 'line_total' | 'quantity_received'>[]) => Promise<allTypes.PurchaseOrder>,
        updatePurchaseOrder: unimplementedAsync as (updatedPO: allTypes.PurchaseOrder, items: allTypes.PurchaseOrderItem[]) => Promise<allTypes.PurchaseOrder>,
        deletePurchaseOrder: unimplementedAsync as (poId: string) => Promise<void>,
        addStockTransaction: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.StockTransaction>) => Promise<allTypes.StockTransaction>,
        addRfq: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.RFQ>) => Promise<allTypes.RFQ>,
        updateRfq: unimplementedAsync as (updatedRfq: allTypes.RFQ>) => Promise<allTypes.RFQ>,
        deleteRfq: unimplementedAsync as (rfqId: string) => Promise<void>,
        addBookCategory: unimplementedAsync as (data: Omit<allTypes.BookCategory, 'id'>) => Promise<allTypes.BookCategory>,
        updateBookCategory: unimplementedAsync as (updatedCategory: allTypes.BookCategory>) => Promise<allTypes.BookCategory>,
        deleteBookCategory: unimplementedAsync as (categoryId: number) => Promise<void>,
        addBook: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Book>) => Promise<allTypes.Book>,
        updateBook: unimplementedAsync as (updatedBook: allTypes.Book>) => Promise<allTypes.Book>,
        deleteBook: unimplementedAsync as (bookId: string) => Promise<void>,
        addLoan: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Loan>) => Promise<allTypes.Loan>,
        updateLoan: unimplementedAsync as (updatedLoan: allTypes.Loan>) => Promise<allTypes.Loan>,
        addFine: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Fine>) => Promise<allTypes.Fine>,
        updateFineStatus: unimplementedAsync as (updatedFine: allTypes.Fine>) => Promise<allTypes.Fine>,
        addMealPlan: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.MealPlan>) => Promise<allTypes.MealPlan>,
        updateMealPlan: unimplementedAsync as (updatedPlan: allTypes.MealPlan>) => Promise<allTypes.MealPlan>,
        deleteMealPlan: unimplementedAsync as (planId: number) => Promise<void>,
        addMenu: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Menu>) => Promise<allTypes.Menu>,
        updateMenu: unimplementedAsync as (updatedMenu: allTypes.Menu>) => Promise<allTypes.Menu>,
        deleteMenu: unimplementedAsync as (menuId: string) => Promise<void>,
        addStudentMealPlan: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.StudentMealPlan>) => Promise<allTypes.StudentMealPlan>,
        updateStudentMealPlan: unimplementedAsync as (updatedAssignment: allTypes.StudentMealPlan>) => Promise<allTypes.StudentMealPlan>,
        deleteStudentMealPlan: unimplementedAsync as (assignmentId: string) => Promise<void>,
        addMealConsumptionLog: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.MealConsumptionLog, 'id' | 'consumption_time' | 'student_name' | 'menu_description' | 'menu_meal_type' | 'menu_date' | 'wallet_transaction_id'| 'charged_amount'>) => Promise<allTypes.MealConsumptionLog>,
        addMerchant: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Merchant>) => Promise<allTypes.Merchant>,
        updateMerchant: unimplementedAsync as (updatedMerchant: allTypes.Merchant>) => Promise<allTypes.Merchant>,
        deleteMerchant: unimplementedAsync as (merchantId: number) => Promise<void>,
        addWalletTransaction: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.WalletTransaction, 'id' | 'transaction_date' | 'running_balance' | 'student_name' | 'reference_id' | 'reference_type'>) => Promise<allTypes.WalletTransaction>,
        addWorkflow: unimplementedAsync as (data: allTypes.CreatePayload<allTypes.Workflow>) => Promise<allTypes.Workflow>,
        updateWorkflow: unimplementedAsync as (updatedWorkflow: allTypes.Workflow>) => Promise<allTypes.Workflow>,
        deleteWorkflow: unimplementedAsync as (workflowId: number) => Promise<void>,
        addWorkflowState: unimplementedAsync as (workflowId: number, data: Pick<allTypes.WorkflowState, 'name' | 'sequence_order'>) => Promise<allTypes.WorkflowState>,
        updateWorkflowState: unimplementedAsync as (workflowId: number, updatedState: allTypes.WorkflowState>) => Promise<allTypes.WorkflowState>,
        deleteWorkflowState: unimplementedAsync as (workflowId: number, stateId: number) => Promise<void>,
    };

  return {
    // States
    schoolDetails: schoolDetailsState, roles: rolesState, users: usersState, students: studentsStateData, staff: staffStateData, classes: classesStateData,
    classStreams: classStreamsStateData, subjects: subjectsState, departments: departmentsState, designations: designationsState,
    studentCategories: studentCategoriesState, dormitories: dormitoriesState, academicYears: academicYearsState, schoolPeriods: schoolPeriodsState, academicYearStructures: academicYearStructuresState,
    academicPeriodDefinitions: academicPeriodDefinitionsState,
    financialYears: financialYearsState, parentsGuardians: parentsGuardiansState, studentGuardianRelationships: studentGuardianRelationshipsState,
    partners: partnersState, clubs: clubsState, customers: customersState, studentHealthRecords: studentHealthRecordsState,
    studentAttendance: studentAttendanceState, timetablePeriodDefs: timetablePeriodDefsState, templatesComm: templatesCommState, campaigns: campaignsState, subjectPapers: subjectPapersState, examSessions: examSessionsState,
    examPaperSettings: examPaperSettingsState,
    gradingSchemes: gradingSchemesState, chartOfAccounts: chartOfAccountsState, expenseCategories: expenseCategoriesState, banks: banksState,
    suppliers: suppliersState, feeTemplates: feeTemplatesState, feeTemplateItems: feeTemplateItemsState, expenseClaims: expenseClaimsState,
    customerInvoices: customerInvoicesState, supplierInvoices: supplierInvoicesState, studentExamResults: studentExamResultsState, classSubjectAllocations: classSubjectAllocationsState, teacherSubjectAssignments: teacherSubjectAssignmentsState,
    studentSubjectEnrollments: studentSubjectEnrollmentsState, timetableEntries: timetableEntriesState, warehouses: warehousesState, itemCategoriesInv: itemCategoriesInvState,
    itemsInv: itemsInvState, fixedAssets: fixedAssetsState, assetDepreciationLogs: assetDepreciationLogsState,
    requisitions: requisitionsState, purchaseOrders: purchaseOrdersState, stockLevels: stockLevelsState, stockTransactions: stockTransactionsState, payrollPeriods: payrollPeriodsState,
    payrollItemTypes: payrollItemTypesState, staffSalarySettings: staffSalarySettingsState,
    payslips: payslipsState, bookCategories: bookCategoriesState, books: booksState, loans: loansState, fines: finesState,
    workflows: workflowsState, mealPlans: mealPlansState, menus: menusState, merchants: merchantsState, auditLogs: auditLogsState,
    studentOpeningBalances: studentOpeningBalancesState, feeAdjustments: feeAdjustmentsState, transportRoutes: transportRoutesState, studentTransportAssignments: studentTransportAssignmentsState,
    studentInvoices: studentInvoicesState,
    studentInvoiceItems: studentInvoiceItemsState, studentPayments: studentPaymentsState,
    invoicePaymentApplications: invoicePaymentApplicationsState, studentMealPlans: studentMealPlansState, mealConsumptionLogs: mealConsumptionLogsState,
    walletTransactions: walletTransactionsState, studentWallets: studentWalletsState, generalPayments: generalPaymentsState, generalLedgerEntries: generalLedgerEntriesState,
    rfqs: rfqsState, appSettings: appSettingsState,

    loading: loadingState,
    initializationError: null,
    isRxDBModeActive: false,
    isUsingRxDBDummyData: null, // Not applicable in mock mode
    triggerSeedRxDB,
    triggerClearRxDB,
    rawInitialData: aggregatedRawData,

    // CRUDs (some implemented, others placeholders)
    updateSchoolDetails,
    addUser, updateUser, deleteUser,
    addRole, updateRole, deleteRole,
    addStudent, updateStudent, deleteStudent,
    addStaffMember, updateStaffMember, deleteStaffMember,
    getStudentDetailsById, getStudentFinancialDetailsById,
    addParentGuardian: crudFunctions.addParentGuardian,
    updateParentGuardian: crudFunctions.updateParentGuardian,
    deleteParentGuardian: crudFunctions.deleteParentGuardian,
    addStudentGuardianRelationship: crudFunctions.addStudentGuardianRelationship,
    updateStudentGuardianRelationship: crudFunctions.updateStudentGuardianRelationship,
    deleteStudentGuardianRelationship: crudFunctions.deleteStudentGuardianRelationship,
    addDepartment, updateDepartment, deleteDepartment,
    addDesignation, updateDesignation, deleteDesignation,
    addStudentCategory, updateStudentCategory, deleteStudentCategory,
    addDormitory, updateDormitory, deleteDormitory,
    addAcademicYearStructure, updateAcademicYearStructure, deleteAcademicYearStructure,
    addAcademicPeriodDefinition, updateAcademicPeriodDefinition, deleteAcademicPeriodDefinition,
    addAcademicYear, updateAcademicYear, deleteAcademicYear,
    addSchoolPeriod, updateSchoolPeriod, deleteSchoolPeriod,
    addPartner, updatePartner, deletePartner,
    addClub, updateClub, deleteClub,
    addCustomer, updateCustomer, deleteCustomer,
    addStudentHealthRecord, updateStudentHealthRecord,
    saveStudentAttendance, getStudentAttendanceByFilters,
    addTemplateComm, updateTemplateComm, deleteTemplateComm,
    addCampaign, updateCampaign, deleteCampaign,
    addAuditLog,


    // Academics
    addClass, updateClass, deleteClass,
    addClassStream, updateClassStream, deleteClassStream,
    addSubject, updateSubject, deleteSubject,
    addSubjectPaper, updateSubjectPaper, deleteSubjectPaper,
    addExamSession, updateExamSession, deleteExamSession,
    addExamPaperSetting, updateExamPaperSetting, deleteExamPaperSetting,
    addGradingScheme, updateGradingScheme, deleteGradingScheme,
    getStudentsForExamEntry, getExamPaperSettingsForSession, saveStudentExamResult,
    getTimetablePeriodDefs, addTimetablePeriodDef, updateTimetablePeriodDef, deleteTimetablePeriodDef,
    getTimetableEntries, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry,
    addClassSubjectAllocation, updateClassSubjectAllocation, deleteClassSubjectAllocation,
    addTeacherSubjectAssignment, deleteTeacherSubjectAssignment,
    addStudentSubjectEnrollment, updateStudentSubjectEnrollment, deleteStudentSubjectEnrollment,

    // Finance
    addChartOfAccount, updateChartOfAccount, deleteChartOfAccount,
    addBank, updateBank, deleteBank,
    addSupplier, updateSupplier, deleteSupplier,
    addFeeTemplate, updateFeeTemplate, deleteFeeTemplate,
    addExpenseClaim, updateExpenseClaim, deleteExpenseClaim,
    addExpenseCategory: crudFunctions.addExpenseCategory, updateExpenseCategory: crudFunctions.updateExpenseCategory, deleteExpenseCategory: crudFunctions.deleteExpenseCategory,
    addCustomerInvoice: crudFunctions.addCustomerInvoice, updateCustomerInvoice: crudFunctions.updateCustomerInvoice, deleteCustomerInvoice: crudFunctions.deleteCustomerInvoice,
    addSupplierInvoice: crudFunctions.addSupplierInvoice, updateSupplierInvoice: crudFunctions.updateSupplierInvoice, deleteSupplierInvoice: crudFunctions.deleteSupplierInvoice,
    addStudentOpeningBalance: crudFunctions.addStudentOpeningBalance, updateStudentOpeningBalance: crudFunctions.updateStudentOpeningBalance, deleteStudentOpeningBalance: crudFunctions.deleteStudentOpeningBalance,
    addFeeAdjustment: crudFunctions.addFeeAdjustment, updateFeeAdjustment: crudFunctions.updateFeeAdjustment, deleteFeeAdjustment: crudFunctions.deleteFeeAdjustment,
    addTransportRoute: crudFunctions.addTransportRoute, updateTransportRoute: crudFunctions.updateTransportRoute, deleteTransportRoute: crudFunctions.deleteTransportRoute,
    addStudentTransportAssignment: crudFunctions.addStudentTransportAssignment, updateStudentTransportAssignment: crudFunctions.updateStudentTransportAssignment, deleteStudentTransportAssignment: crudFunctions.deleteStudentTransportAssignment,
    generateStudentInvoices: crudFunctions.generateStudentInvoices, addStudentPayment: crudFunctions.addStudentPayment, updateStudentPayment: crudFunctions.updateStudentPayment, deleteStudentPayment: crudFunctions.deleteStudentPayment, applyPaymentToInvoices: crudFunctions.applyPaymentToInvoices,
    addGeneralPayment: crudFunctions.addGeneralPayment, updateGeneralPayment: crudFunctions.updateGeneralPayment, deleteGeneralPayment: crudFunctions.deleteGeneralPayment,
    addFinancialYear: crudFunctions.addFinancialYear, updateFinancialYear: crudFunctions.updateFinancialYear, deleteFinancialYear: crudFunctions.deleteFinancialYear,
    
    // HR
    addPayrollPeriod: crudFunctions.addPayrollPeriod, updatePayrollPeriod: crudFunctions.updatePayrollPeriod, deletePayrollPeriod: crudFunctions.deletePayrollPeriod,
    addPayrollItemType: crudFunctions.addPayrollItemType, updatePayrollItemType: crudFunctions.updatePayrollItemType, deletePayrollItemType: crudFunctions.deletePayrollItemType,
    updateStaffSalarySetting: crudFunctions.updateStaffSalarySetting, generatePayslipsForPeriod: crudFunctions.generatePayslipsForPeriod,

    // Inventory
    addWarehouse: crudFunctions.addWarehouse, updateWarehouse: crudFunctions.updateWarehouse, deleteWarehouse: crudFunctions.deleteWarehouse,
    addItemCategoryInv: crudFunctions.addItemCategoryInv, updateItemCategoryInv: crudFunctions.updateItemCategoryInv, deleteItemCategoryInv: crudFunctions.deleteItemCategoryInv,
    addItemInv: crudFunctions.addItemInv, updateItemInv: crudFunctions.updateItemInv, deleteItemInv: crudFunctions.deleteItemInv,
    addFixedAsset: crudFunctions.addFixedAsset, updateFixedAsset: crudFunctions.updateFixedAsset, deleteFixedAsset: crudFunctions.deleteFixedAsset,
    addAssetDepreciationLog: crudFunctions.addAssetDepreciationLog,
    addRequisition: crudFunctions.addRequisition, updateRequisition: crudFunctions.updateRequisition, deleteRequisition: crudFunctions.deleteRequisition, updateRequisitionStatus: crudFunctions.updateRequisitionStatus,
    addPurchaseOrder: crudFunctions.addPurchaseOrder, updatePurchaseOrder: crudFunctions.updatePurchaseOrder, deletePurchaseOrder: crudFunctions.deletePurchaseOrder,
    addStockTransaction: crudFunctions.addStockTransaction,
    addRfq: crudFunctions.addRfq, updateRfq: crudFunctions.updateRfq, deleteRfq: crudFunctions.deleteRfq,

    // Library
    addBookCategory: crudFunctions.addBookCategory, updateBookCategory: crudFunctions.updateBookCategory, deleteBookCategory: crudFunctions.deleteBookCategory,
    addBook: crudFunctions.addBook, updateBook: crudFunctions.updateBook, deleteBook: crudFunctions.deleteBook,
    addLoan: crudFunctions.addLoan, updateLoan: crudFunctions.updateLoan,
    addFine: crudFunctions.addFine, updateFineStatus: crudFunctions.updateFineStatus,

    // Nutrition & Wallet
    addMealPlan: crudFunctions.addMealPlan, updateMealPlan: crudFunctions.updateMealPlan, deleteMealPlan: crudFunctions.deleteMealPlan,
    addMenu: crudFunctions.addMenu, updateMenu: crudFunctions.updateMenu, deleteMenu: crudFunctions.deleteMenu,
    addStudentMealPlan: crudFunctions.addStudentMealPlan, updateStudentMealPlan: crudFunctions.updateStudentMealPlan, deleteStudentMealPlan: crudFunctions.deleteStudentMealPlan,
    addMealConsumptionLog: crudFunctions.addMealConsumptionLog,
    addMerchant: crudFunctions.addMerchant, updateMerchant: crudFunctions.updateMerchant, deleteMerchant: crudFunctions.deleteMerchant,
    addWalletTransaction: crudFunctions.addWalletTransaction,
    
    // Settings & Workflows
    addWorkflow: crudFunctions.addWorkflow, updateWorkflow: crudFunctions.updateWorkflow, deleteWorkflow: crudFunctions.deleteWorkflow,
    addWorkflowState: crudFunctions.addWorkflowState, updateWorkflowState: crudFunctions.updateWorkflowState, deleteWorkflowState: crudFunctions.deleteWorkflowState,
  };
  return result;
};

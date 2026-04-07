// src/core/types/app-data.ts
// ABOUTME: AppDataType, AppDataLoadingStates, AppDataContextType — the global context type shared across the app.

import type {
  FinStudentInvoiceType,
  FinStudentInvoiceItemType,
  FinStudentPaymentType,
  FinFeeAdjustmentType,
  FinInvoicePaymentApplicationType,
  FinCustomerInvoiceType,
  FinSupplierInvoiceType,
  FinGeneralPaymentType,
  FinGeneralLedgerEntryType,
  FinStudentOpeningBalanceType,
  FinTransportRouteType,
  FinStudentTransportAssignmentType,
} from '../../modules/finance/data/types';
import type { EducationSystemConfiguration } from '../../modules/academics/data/types';
import type { InvSupplierContractType } from '../../modules/inventory/data/types';

import type { SchoolDetails, Role, User, AuditLog, Workflow, Permission, UserRole } from './common';
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
} from './administration';
import type {
  ClassSubjectAllocation,
  ExamPaperSetting,
  Subject,
  SubjectPaper,
  StudentSubjectEnrollment,
  TeacherSubjectAssignment,
  TimetableEntry,
} from './academic';
import type {
  FinancialYear,
  ChartOfAccount,
  ExpenseCategory,
  Bank,
  Supplier,
  FeeTemplate,
  FeeTemplateItem,
  ExpenseClaim,
  RFQ,
  PayrollPeriod,
  PayrollItemType,
  StaffSalarySetting,
  Payslip,
} from './finance';
import type {
  Warehouse,
  ItemCategoryInv,
  ItemInv,
  FixedAsset,
  StockLevel,
  StockTransaction,
  Requisition,
  PurchaseOrder,
} from './inventory';
import type {
  BookCategory,
  Book,
  Loan,
  Fine,
  MealPlan,
  Menu,
  Merchant,
} from './library';

// Define a base type for all data arrays
export type AppDataType = {
  schoolDetails: SchoolDetails | null;
  roles: Role[];
  users: User[];
  students: Student[];
  staff: Staff[];
  classes: Class[];
  classStreams: ClassStream[];
  subjects: Subject[];
  departments: Department[];
  designations: Designation[];
  studentCategories: StudentCategory[];
  dormitories: Dormitory[];
  academicYears: AcademicYear[];
  schoolPeriods: SchoolPeriod[];
  academicYearStructures: AcademicYearStructure[];
  academicPeriodDefinitions: AcademicPeriodDefinition[];
  financialYears: FinancialYear[];
  partners: any[]; // AdminPartnerType[] - defined in administration module
  clubs: any[]; // AdminClubAndSocietyType[] - defined in administration module
  customers: any[]; // AdminCustomerType[] - defined in administration module
  studentHealthRecords: any[]; // AdminStudentHealthRecordType[] - defined in administration module
  studentAttendance: any[]; // AdminStudentAttendanceType[] - defined in administration module
  timetablePeriodDefs: TimetablePeriodDef[];
  templatesComm: any[]; // AdminTemplateCommType[] - defined in administration module
  campaigns: any[]; // AdminCampaignType[] - defined in administration module
  subjectPapers: SubjectPaper[];
  examSessions: any[]; // AcademicsExamSessionType[] - defined in academics module
  examPaperSettings: ExamPaperSetting[];
  gradingSchemes: any[]; // AcademicsGradingSchemeType[] - defined in academics module
  chartOfAccounts: ChartOfAccount[];
  expenseCategories: ExpenseCategory[];
  banks: Bank[];
  suppliers: Supplier[];
  supplierContracts: InvSupplierContractType[];
  feeTemplates: FeeTemplate[];
  feeTemplateItems: FeeTemplateItem[];
  expenseClaims: ExpenseClaim[];
  studentInvoices: FinStudentInvoiceType[];
  studentInvoiceItems: FinStudentInvoiceItemType[];
  studentPayments: FinStudentPaymentType[];
  feeAdjustments: FinFeeAdjustmentType[];
  invoicePaymentApplications: FinInvoicePaymentApplicationType[];
  customerInvoices: FinCustomerInvoiceType[];
  supplierInvoices: FinSupplierInvoiceType[];
  studentExamResults: any[]; // AcademicsStudentExamResultWithDetailsType[] - defined in academics module
  classSubjectAllocations: ClassSubjectAllocation[];
  teacherSubjectAssignments: TeacherSubjectAssignment[];
  studentSubjectEnrollments: StudentSubjectEnrollment[];
  timetableEntries: TimetableEntry[];
  warehouses: Warehouse[];
  itemCategoriesInv: ItemCategoryInv[];
  itemsInv: ItemInv[];
  fixedAssets: FixedAsset[];
  requisitions: Requisition[];
  purchaseOrders: PurchaseOrder[];
  stockLevels: StockLevel[];
  stockTransactions: StockTransaction[];
  payrollPeriods: PayrollPeriod[];
  payrollItemTypes: PayrollItemType[];
  staffSalarySettings: StaffSalarySetting[];
  payslips: Payslip[];
  bookCategories: BookCategory[];
  books: Book[];
  loans: Loan[];
  fines: Fine[];
  parentsGuardians: ParentsGuardian[];
  workflows: Workflow[];
  mealPlans: MealPlan[];
  menus: Menu[];
  merchants: Merchant[];
  auditLogs: AuditLog[];
  studentOpeningBalances: FinStudentOpeningBalanceType[];
  transportRoutes: FinTransportRouteType[];
  studentTransportAssignments: FinStudentTransportAssignmentType[];
  generalPayments: FinGeneralPaymentType[];
  generalLedgerEntries: FinGeneralLedgerEntryType[];
  rfqs: RFQ[];
  educationSystemConfigurations: EducationSystemConfiguration[];
};

// Loading states should only map over the data types
export type AppDataLoadingStates = {
  [K in keyof AppDataType]: boolean;
} & { all: boolean };

// The full context includes the data, loading states, raw data, and CRUD operations
export type AppDataContextType = AppDataType & {
  loading: AppDataLoadingStates;
  rawInitialData: any;
  // Database management functions
  triggerSeedRxDB?: () => Promise<void>;
  triggerClearRxDB?: () => Promise<void>;
  isUsingRxDBDummyData?: boolean;
  initializationError?: Error | null;
  // Student Detail Functions
  getStudentDetailsById: (id: string) => Promise<any | null>;
  getStudentFinancialDetailsById: (id: string) => Promise<any | null>;
  // Student Attendance Functions
  saveStudentAttendance: (attendanceRecords: any[]) => Promise<void>;
  getStudentAttendanceByFilters: (date: string, classStreamId: number, periodId: number) => any[];
  getTimetablePeriodDefs: () => TimetablePeriodDef[];
  // Timetable Functions
  getTimetableEntries: (classStreamId: number) => any[];
  addTimetableEntry: (entryData: any) => Promise<void>;
  updateTimetableEntry: (updatedEntry: any) => Promise<void>;
  deleteTimetableEntry: (entryId: string) => Promise<void>;
  // Partner CRUD operations - AdminPartnerType from administration module
  addPartner: (partnerData: any) => Promise<void>;
  updatePartner: (updatedPartner: any) => Promise<void>;
  deletePartner: (partnerId: string) => Promise<void>;
  // Club CRUD operations - AdminClubAndSocietyType from administration module
  addClub: (clubData: any) => Promise<void>;
  updateClub: (updatedClub: any) => Promise<void>;
  deleteClub: (clubId: number) => Promise<void>;
  // Customer CRUD operations
  addCustomer: (customerData: any) => Promise<void>;
  updateCustomer: (updatedCustomer: any) => Promise<void>;
  deleteCustomer: (customerId: number) => Promise<void>;
  addSupplierContract: (contractData: Partial<InvSupplierContractType>) => Promise<void>;
  updateSupplierContract: (contractId: string, contractData: Partial<InvSupplierContractType>) => Promise<void>;
  deleteSupplierContract: (contractId: string) => Promise<void>;
  // Student Health Record CRUD operations
  addStudentHealthRecord: (healthRecordData: any) => Promise<void>;
  updateStudentHealthRecord: (updatedHealthRecord: any) => Promise<void>;
  deleteStudentHealthRecord: (healthRecordId: string) => Promise<void>;
  // Communication Templates CRUD
  addTemplateComm: (template: any) => Promise<void>;
  updateTemplateComm: (template: any) => Promise<void>;
  deleteTemplateComm: (id: number) => Promise<void>;
  // Message Campaigns CRUD
  addCampaign: (campaign: any) => Promise<void>;
  updateCampaign: (campaign: any) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  // School Periods CRUD
  addSchoolPeriod: (period: any) => Promise<void>;
  updateSchoolPeriod: (period: any) => Promise<void>;
  deleteSchoolPeriod: (id: number) => Promise<void>;
  // Timetable Period Definitions CRUD
  addTimetablePeriodDef: (periodDef: any) => Promise<void>;
  updateTimetablePeriodDef: (periodDef: any) => Promise<void>;
  deleteTimetablePeriodDef: (id: number) => Promise<void>;
  // Class CRUD operations
  addClass: (classData: Omit<Class, 'id'>) => Promise<Class>;
  updateClass: (updatedClass: Class) => Promise<Class>;
  deleteClass: (classId: number) => Promise<void>;
  // Class Stream CRUD operations
  addClassStream: (classId: number, streamData: Omit<ClassStream, 'id' | 'class_id'>) => Promise<ClassStream>;
  updateClassStream: (updatedStream: ClassStream) => Promise<ClassStream>;
  deleteClassStream: (streamId: number) => Promise<void>;
  // Invoice Generation Functions
  generateStudentInvoices: (feeTemplateId: number, schoolPeriodId: number, studentCriteria: any) => Promise<any[]>;
  // RBAC
  permissions: Permission[];
  roles: Role[];
  userRoles: UserRole[];
  addPermission: (p: Permission) => Promise<void>;
  updatePermission: (p: Permission) => Promise<void>;
  deletePermission: (id: string) => Promise<void>;
  addRole: (r: Role) => Promise<void>;
  updateRole: (r: Role) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  assignRoleToUser: (userRole: UserRole) => Promise<void>;
  removeRoleFromUser: (userId: string, roleId: string) => Promise<void>;
  // Education System Configuration CRUD
  addEducationSystemConfiguration: (config: Partial<EducationSystemConfiguration>) => Promise<void>;
  updateEducationSystemConfiguration: (config: EducationSystemConfiguration) => Promise<void>;
  deleteEducationSystemConfiguration: (id: string) => Promise<void>;
  // Exam Schedule CRUD
  addExamSchedule: (schedule: any) => Promise<void>;
  updateExamSchedule: (schedule: any) => Promise<void>;
  deleteExamSchedule: (id: string) => Promise<void>;
};

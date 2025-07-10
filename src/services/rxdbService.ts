// services/rxdbService.ts
import {
  createRxDatabase, addRxPlugin, RxDatabase, RxCollection, RxJsonSchema, toTypedRxJsonSchema, PrimaryKey, RxDocumentData
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

import * as allTypes from '../types';
import { RXDB_DB_NAME, RXDB_LEADER_ELECTION_DISABLED, APP_MODE, RXDB_SETTINGS_COLLECTION_NAME, RXDB_DUMMY_DATA_FLAG_ID } from '../contexts/config';

// Import our new, unified schemas
import { rxdbSchemas as gnRxdbSchemas } from '../core/gn-rxdb-schemas';

// Import module collections (Now unused, kept for reference)
/*
import { academicsCollections } from '../modules/academics/data/collections';
import { administrationCollections } from '../modules/administration/data/collections';
import { financeCollections } from '../modules/finance/data/collections';
import { hrCollections } from '../modules/hr/data/collections';
import { inventoryCollections } from '../modules/inventory/data/collections';
import { libraryCollections } from '../modules/library/data/collections';
import { nutritionCollections } from '../modules/nutrition/data/collections';
*/

// Import module types for SchoolDatabaseCollections
import * as academicTypes from '../modules/academics/data/types';
import * as adminTypes from '../modules/administration/data/types';
import * as financeTypes from '../modules/finance/data/types';
import * as hrTypes from '../modules/hr/data/types';
import * as inventoryTypes from '../modules/inventory/data/types';
import * as libraryTypes from '../modules/library/data/types';
import * as nutritionTypes from '../modules/nutrition/data/types';

import { createEntitySchema } from '../utils/schemaUtils';

console.log('rxdbService.ts: Script loaded. Attempting RxDB setup.');

addRxPlugin(RxDBMigrationPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
  if (!RXDB_LEADER_ELECTION_DISABLED) {
    addRxPlugin(RxDBLeaderElectionPlugin);
  }
}

// ID Generation
export const generateId = (): string => crypto.randomUUID(); 
let numericIdCounter = Date.now();
export const generateNumericId = (): number => ++numericIdCounter; 

// --- CORE Schema Definitions (Non-modularized entities) ---
/*
const appSettingsSchema: RxJsonSchema<allTypes.AppSetting> = createEntitySchema<allTypes.AppSetting>( RXDB_SETTINGS_COLLECTION_NAME, { id: { type: 'string' }, using_dummy_data: { type: 'boolean' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id']);
const schoolDetailsSchema: RxJsonSchema<allTypes.SchoolDetails> = createEntitySchema<allTypes.SchoolDetails>('school_details', { id: { type: 'number' }, name: { type: 'string', maxLength: 200 }, telephone: { type: ['string', 'null'] }, email: { type: ['string', 'null'], format: 'email' }, postal_address: { type: ['string', 'null'] }, town: { type: ['string', 'null'] }, motto: { type: ['string', 'null'] }, logo_path: { type: ['string', 'null'] }, school_gender: { type: ['string', 'null'], enum: ['Mixed', 'Boys Only', 'Girls Only', null] }, school_type: { type: ['string', 'null'], enum: ['Public', 'Private', 'International', null] }, head_teacher_name: { type: ['string', 'null'] }, school_code: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id','name', 'created_at', 'updated_at']);
const userSchema: RxJsonSchema<allTypes.User> = createEntitySchema<allTypes.User>('users', { id: { type: 'number' }, username: { type: 'string', maxLength: 100 }, email: { type: ['string', 'null'], format: 'email' }, role_id: { type: 'number' }, is_active: { type: 'boolean' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'username', 'email', 'created_at', 'updated_at']);
const roleSchema: RxJsonSchema<allTypes.Role> = createEntitySchema<allTypes.Role>('roles', { id: { type: 'number' }, name: { type: 'string', maxLength: 100 }, description: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const academicYearStructureSchema: RxJsonSchema<allTypes.AcademicYearStructure> = createEntitySchema<allTypes.AcademicYearStructure>('academic_year_structures', { id: { type: 'number' }, name: { type: 'string' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const academicPeriodDefinitionSchema: RxJsonSchema<allTypes.AcademicPeriodDefinition> = createEntitySchema<allTypes.AcademicPeriodDefinition>('academic_period_definitions', { id: { type: 'number' }, structure_id: { type: 'number' }, name: { type: 'string' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'structure_id', 'name', 'created_at', 'updated_at']);
const academicYearSchema: RxJsonSchema<allTypes.AcademicYear> = createEntitySchema<allTypes.AcademicYear>('academic_years', { id: { type: 'number' }, financial_year_id: { type: 'number' }, name: { type: 'string' }, start_date: { type: 'string', format: 'date-time' }, end_date: { type: 'string', format: 'date-time' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'financial_year_id', 'name', 'start_date', 'end_date', 'created_at', 'updated_at']);
const workflowSchema: RxJsonSchema<allTypes.Workflow> = createEntitySchema<allTypes.Workflow>('workflows', { id: { type: 'number' }, name: { type: 'string' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const auditLogSchema: RxJsonSchema<allTypes.AuditLog> = createEntitySchema<allTypes.AuditLog>('audit_logs', { id: { type: 'number' }, user_id: { type: 'number' }, action: { type: 'string' }, entity_name: { type: 'string' }, entity_id: { type: 'number' }, changes: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'user_id', 'action', 'entity_name', 'entity_id', 'created_at']);
const parentGuardianSchema: RxJsonSchema<allTypes.ParentGuardian> = createEntitySchema<allTypes.ParentGuardian>('parents_guardians', { id: { type: 'number' }, name: { type: 'string' }, phone: { type: 'string' }, email: { type: ['string', 'null'], format: 'email' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'phone', 'email', 'created_at', 'updated_at']);
const studentSchema: RxJsonSchema<allTypes.Student> = createEntitySchema<allTypes.Student>('students', { id: { type: 'number' }, admission_no: { type: 'string', maxLength: 100 }, first_name: { type: 'string', maxLength: 100 }, last_name: { type: 'string', maxLength: 100 }, gender: { type: 'string', enum: ['Male', 'Female', 'Other'] }, date_of_birth: { type: ['string', 'null'], format: 'date-time' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'admission_no', 'first_name', 'last_name', 'created_at', 'updated_at']);
const studentGuardianRelationshipSchema: RxJsonSchema<allTypes.StudentGuardianRelationship> = createEntitySchema<allTypes.StudentGuardianRelationship>('student_guardian_relationships', { id: { type: 'number' }, student_id: { type: 'number' }, guardian_id: { type: 'number' }, relationship_type: { type: 'string' }, }, { key: 'id', type: 'number' }, ['id', 'student_id', 'guardian_id']);
const staffSchema: RxJsonSchema<allTypes.Staff> = createEntitySchema<allTypes.Staff>('staff', { id: { type: 'number' }, staff_no: { type: 'string' }, first_name: { type: 'string' }, last_name: { type: 'string' }, department_id: { type: 'number' }, designation_id: { type: 'number' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'staff_no', 'first_name', 'last_name', 'created_at', 'updated_at']);
const departmentSchema: RxJsonSchema<allTypes.Department> = createEntitySchema<allTypes.Department>('departments', { id: { type: 'number' }, name: { type: 'string' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const designationSchema: RxJsonSchema<allTypes.Designation> = createEntitySchema<allTypes.Designation>('designations', { id: { type: 'number' }, title: { type: 'string' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'title', 'created_at', 'updated_at']);
const studentCategorySchema: RxJsonSchema<allTypes.StudentCategory> = createEntitySchema<allTypes.StudentCategory>('student_categories', { id: { type: 'number' }, name: { type: 'string' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const dormitorySchema: RxJsonSchema<allTypes.Dormitory> = createEntitySchema<allTypes.Dormitory>('dormitories', { id: { type: 'number' }, name: { type: 'string' }, capacity: { type: 'number' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const classSchema: RxJsonSchema<allTypes.Class> = createEntitySchema<allTypes.Class>('classes', { id: { type: 'number' }, name: { type: 'string' }, teacher_id: { type: ['number', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'created_at', 'updated_at']);
const classStreamSchema: RxJsonSchema<allTypes.ClassStream> = createEntitySchema<allTypes.ClassStream>('class_streams', { id: { type: 'number' }, class_id: { type: 'number' }, name: { type: 'string' }, teacher_id: { type: ['number', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'class_id', 'name', 'created_at', 'updated_at']);
const studentInvoiceItemSchema: RxJsonSchema<allTypes.FinStudentInvoiceItemType> = createEntitySchema<allTypes.FinStudentInvoiceItemType>('student_invoice_items', { id: { type: 'number' }, invoice_id: { type: 'number' }, fee_item_id: { type: 'number' }, amount: { type: 'number' }, }, { key: 'id', type: 'number' }, ['id', 'invoice_id', 'fee_item_id']);
const permissionSchema: RxJsonSchema<any> = createEntitySchema<any>('permissions', { key: { type: 'string' }, description: { type: 'string' } }, { key: 'key', type: 'string', final: true, maxLength: 100 }, ['key']);
const rbacRoleSchema: RxJsonSchema<any> = createEntitySchema<any>('rbac_roles', { name: { type: 'string' }, permissions: { type: 'array', items: { type: 'string' } } }, { key: 'name', type: 'string', final: true, maxLength: 100 }, ['name']);
const userRoleSchema: RxJsonSchema<any> = createEntitySchema<any>('user_roles', { userId: { type: 'string' }, roleName: { type: 'string' } }, { key: 'userId', type: 'string', final: true, maxLength: 100 }, ['userId']);
*/

// --- Master Collections Definition (to be dynamically populated) ---
// New collections definition from generated schemas
export const collectionsDefinition: Record<string, { schema: RxJsonSchema<any> }> = 
  Object.entries(gnRxdbSchemas).reduce((acc, [name, schema]) => {
    acc[name] = { schema: schema as RxJsonSchema<any> };
    return acc;
  }, {} as Record<string, { schema: RxJsonSchema<any> }>);


// Type for the database instance, mapping collection names to RxCollection types
export type SchoolDatabaseCollections = {
  app_settings: RxCollection<allTypes.AppSetting>;
  school_details: RxCollection<allTypes.SchoolDetails>;
  users: RxCollection<allTypes.User>;
  roles: RxCollection<allTypes.Role>;
  academic_year_structures: RxCollection<allTypes.AcademicYearStructure>;
  academic_period_definitions: RxCollection<allTypes.AcademicPeriodDefinition>;
  academic_years: RxCollection<allTypes.AcademicYear>;
  financial_years: RxCollection<financeTypes.FinFinancialYearType>;
  school_periods: RxCollection<allTypes.SchoolPeriod>;
  workflows: RxCollection<allTypes.Workflow>;
  audit_logs: RxCollection<allTypes.AuditLog>;
  parents_guardians: RxCollection<allTypes.ParentGuardian>;
  students: RxCollection<allTypes.Student>;
  student_guardian_relationships: RxCollection<allTypes.StudentGuardianRelationship>;
  staff: RxCollection<allTypes.Staff>;
  departments: RxCollection<allTypes.Department>;
  designations: RxCollection<allTypes.Designation>;
  student_categories: RxCollection<allTypes.StudentCategory>;
  dormitories: RxCollection<allTypes.Dormitory>;
  classes: RxCollection<allTypes.Class>;
  class_streams: RxCollection<allTypes.ClassStream>;
  student_invoice_items: RxCollection<allTypes.FinStudentInvoiceItemType>; 
  
  // Module collections
  partners: RxCollection<adminTypes.AdminPartnerType>;
  clubs: RxCollection<adminTypes.AdminClubAndSocietyType>;
  customers: RxCollection<adminTypes.AdminCustomerType>;
  student_health_records: RxCollection<adminTypes.AdminStudentHealthRecordType>;
  student_attendance: RxCollection<adminTypes.AdminStudentAttendanceType>;
  communication_templates: RxCollection<adminTypes.AdminTemplateCommType>;
  message_campaigns: RxCollection<adminTypes.AdminCampaignType>;

  chart_of_accounts: RxCollection<financeTypes.FinChartOfAccountType>;
  expense_categories: RxCollection<financeTypes.FinExpenseCategoryType>;
  banks: RxCollection<financeTypes.FinBankType>;
  suppliers: RxCollection<financeTypes.FinSupplierType>;
  fee_templates: RxCollection<financeTypes.FinFeeTemplateType>;
  // fee_template_items are nested
  expense_claims: RxCollection<financeTypes.FinExpenseClaimType>;
  student_opening_balances: RxCollection<financeTypes.FinStudentOpeningBalanceType>;
  fee_adjustments: RxCollection<financeTypes.FinFeeAdjustmentType>;
  transport_routes: RxCollection<financeTypes.FinTransportRouteType>;
  student_transport_assignments: RxCollection<financeTypes.FinStudentTransportAssignmentType>;
  student_invoices: RxCollection<financeTypes.FinStudentInvoiceType>;
  student_payments: RxCollection<financeTypes.FinStudentPaymentType>;
  invoice_payment_applications: RxCollection<financeTypes.FinInvoicePaymentApplicationType>;
  customer_invoices: RxCollection<financeTypes.FinCustomerInvoiceType>;
  // customer_invoice_items are nested
  supplier_invoices: RxCollection<financeTypes.FinSupplierInvoiceType>;
  general_payments: RxCollection<financeTypes.FinGeneralPaymentType>;
  // general_payment_items are nested
  general_ledger_entries: RxCollection<financeTypes.FinGeneralLedgerEntryType>;

  payroll_periods: RxCollection<hrTypes.HRPayrollPeriodType>;
  payroll_item_types: RxCollection<hrTypes.HRPayrollItemTypeType>;
  staff_salary_settings: RxCollection<hrTypes.HRStaffSalarySettingType>;
  payslips: RxCollection<hrTypes.HRPayslipType>;
  
  subjects: RxCollection<academicTypes.AcademicsSubjectType>;
  subject_papers: RxCollection<academicTypes.AcademicsSubjectPaperType>;
  exam_sessions: RxCollection<academicTypes.AcademicsExamSessionType>;
  grading_schemes: RxCollection<academicTypes.AcademicsGradingSchemeType>;
  student_exam_results: RxCollection<academicTypes.AcademicsStudentExamResultWithDetailsType>;
  class_subject_allocations: RxCollection<academicTypes.AcademicsClassSubjectAllocationType>;
  teacher_subject_assignments: RxCollection<academicTypes.AcademicsTeacherSubjectAssignmentType>;
  student_subject_enrollments: RxCollection<academicTypes.AcademicsStudentSubjectEnrollmentType>;
  timetable_period_definitions: RxCollection<academicTypes.AcademicsTimetablePeriodDefType>;
  timetable_entries: RxCollection<academicTypes.AcademicsTimetableEntryType>;

  book_categories: RxCollection<libraryTypes.LibBookCategoryType>;
  books: RxCollection<libraryTypes.LibBookType>;
  loans: RxCollection<libraryTypes.LibLoanType>;
  fines: RxCollection<libraryTypes.LibFineType>;

  warehouses: RxCollection<inventoryTypes.InvWarehouseType>;
  item_categories_inv: RxCollection<inventoryTypes.InvItemCategoryType>;
  items_inv: RxCollection<inventoryTypes.InvItemType>;
  fixed_assets: RxCollection<inventoryTypes.InvFixedAssetType>;
  asset_depreciation_logs: RxCollection<inventoryTypes.InvAssetDepreciationLogType>;
  requisitions: RxCollection<inventoryTypes.InvRequisitionType>;
  purchase_orders: RxCollection<inventoryTypes.InvPurchaseOrderType>;
  stock_levels: RxCollection<inventoryTypes.InvStockLevelType>;
  stock_transactions: RxCollection<inventoryTypes.InvStockTransactionType>;
  rfqs: RxCollection<inventoryTypes.InvRFQType>;
  
  meal_plans: RxCollection<nutritionTypes.NutrMealPlanType>;
  student_meal_plans: RxCollection<nutritionTypes.NutrStudentMealPlanType>;
  menus: RxCollection<nutritionTypes.NutrMenuType>;
  meal_consumption_logs: RxCollection<nutritionTypes.NutrMealConsumptionLogType>;
  merchants: RxCollection<nutritionTypes.NutrMerchantType>;
  student_wallets: RxCollection<nutritionTypes.NutrStudentWalletType>;
  wallet_transactions: RxCollection<nutritionTypes.NutrWalletTransactionType>;
  // RBAC collections
  permissions: RxCollection<any>;
  rbac_roles: RxCollection<any>;
  user_roles: RxCollection<any>;
};

export type SchoolDatabase = RxDatabase<SchoolDatabaseCollections>;

let dbPromise: Promise<SchoolDatabase> | null = null;

const initializeDatabaseInternal = async (): Promise<SchoolDatabase> => {
  console.log("RxDB: Initializing database...");
  const db = await createRxDatabase<SchoolDatabaseCollections>({
    name: RXDB_DB_NAME,
    storage: getRxStorageDexie(),
    multiInstance: !RXDB_LEADER_ELECTION_DISABLED,
  });
  console.log("RxDB: Database created.");
  
  const finalCollectionsDefinition: Record<string, { schema: RxJsonSchema<any>}> = {};
  for (const key in collectionsDefinition) {
    if (Object.prototype.hasOwnProperty.call(collectionsDefinition, key)) {
        finalCollectionsDefinition[key] = { schema: collectionsDefinition[key].schema };
    }
  }

  await db.addCollections(finalCollectionsDefinition);
  console.log("RxDB: Collections added.");
  
  if (typeof window !== 'undefined') {
    (window as any).APP_DB = db;
  }
  return db;
};

export const getDatabase = (): Promise<SchoolDatabase> => {
  if (!dbPromise) {
    dbPromise = initializeDatabaseInternal();
  }
  return dbPromise;
};

export const seedDatabaseWithMockData = async (db: SchoolDatabase, mockData: allTypes.RawInitialData): Promise<void> => {
    console.log("RxDB: Demo mode - Seeding database with mock data...");
    for (const collectionName in collectionsDefinition) {
        if (Object.prototype.hasOwnProperty.call(collectionsDefinition, collectionName)) {
            const rawDataKey = `initialMock${collectionName.charAt(0).toUpperCase() + collectionName.slice(1).replace(/Inv$/, 'Inv')}`; // Adjust for 'Inv' suffix
            
            const mockDataArray = mockData[rawDataKey as keyof allTypes.RawInitialData];
            
            const collection = db[collectionName as keyof SchoolDatabaseCollections] as RxCollection<any>;

            if (collection) { 
                try {
                    console.log(`RxDB: Clearing collection ${collectionName}...`);
                    await collection.find().remove(); 
                    
                    if (mockDataArray && Array.isArray(mockDataArray) && mockDataArray.length > 0) {
                        console.log(`RxDB: Seeding ${collectionName} with ${mockDataArray.length} items...`);
                        await collection.bulkInsert(mockDataArray);
                    } else if (mockDataArray && !Array.isArray(mockDataArray) && mockDataArray !== null && collectionName !== RXDB_SETTINGS_COLLECTION_NAME) { 
                        console.log(`RxDB: Seeding ${collectionName} with 1 item...`);
                        await collection.insert(mockDataArray); 
                    } else if (collectionName === RXDB_SETTINGS_COLLECTION_NAME && mockDataArray) {
                         console.log(`RxDB: Upserting ${collectionName} data...`);
                         await collection.upsert(mockDataArray as RxDocumentData<allTypes.AppSetting>);
                    }
                } catch (error) {
                    console.error(`RxDB: Error seeding collection ${collectionName}:`, error);
                }
            } else {
                 console.warn(`RxDB: Collection ${collectionName} not found in DB instance during seeding.`);
            }
        }
    }
    const settingsCollection = db.app_settings;
    if (settingsCollection) {
        await settingsCollection.upsert({ id: RXDB_DUMMY_DATA_FLAG_ID, using_dummy_data: true });
        console.log("RxDB: Dummy data flag set to true.");
    }
    console.log("RxDB: Database seeding complete.");
};

export const clearDatabase = async (db: SchoolDatabase): Promise<void> => {
  console.log("RxDB: Clearing all collections...");
  await Promise.all(
    Object.keys(db.collections).map(colName => 
      (db[colName as keyof SchoolDatabaseCollections] as RxCollection<any>).find().remove()
    )
  );
   const settingsCollection = db.app_settings;
    if (settingsCollection) {
        await settingsCollection.upsert({ id: RXDB_DUMMY_DATA_FLAG_ID, using_dummy_data: false });
        console.log("RxDB: Dummy data flag set to false.");
    }
  console.log("RxDB: All collections cleared.");
};

export const getUsingDummyDataFlag = async (db: SchoolDatabase): Promise<boolean> => {
    const settingsCollection = db.app_settings;
    if (settingsCollection) {
        const doc = await settingsCollection.findOne(RXDB_DUMMY_DATA_FLAG_ID).exec();
        return !!doc?.using_dummy_data;
    }
    return false; 
};

import type { GenerationStats } from '../dataGeneration/UniversalDataGenerator';
// RXDB removed - Phase 2: Using provider-agnostic collections
import { collectionsDefinition } from './collections';
import { SchemaConverter } from './SchemaConverter';
import type { CollectionSchema, ICollection, IDatabaseProvider } from './interfaces';

type SeedVolume = 'tiny' | 'small' | 'medium' | 'large' | 'enterprise';

type SeedEntry = {
  moduleName: string;
  exportKey: string;
  collectionName: string | null;
  records: any[];
};

type SeedOptions = {
  modules?: string[];
  volume?: SeedVolume;
  clearExisting?: boolean;
  onlyIfEmpty?: boolean;
};

type SeedResult = GenerationStats & {
  insertedCounts: Record<string, number>;
  skippedCollections: string[];
};

const mockDataModules = import.meta.glob('../../modules/*/data/mockData.ts', { eager: true }) as Record<string, Record<string, unknown>>;

const COLLECTION_NAME_EXCEPTIONS: Record<string, string> = {
  classStreams: 'class_streams',
  academicYears: 'academic_years',
  schoolPeriods: 'school_periods',
  academicYearStructures: 'academic_year_structures',
  academicPeriodDefinitions: 'academic_period_definitions',
  studentCategories: 'student_categories',
  parentsGuardians: 'parents_guardians',
  studentHealthRecords: 'student_health_records',
  studentAttendance: 'student_attendance',
  templatesComm: 'templates_comm',
  chartOfAccounts: 'chart_of_accounts',
  expenseCategories: 'expense_categories',
  feeTemplates: 'fee_templates',
  feeTemplateItems: 'fee_template_items',
  expenseClaims: 'expense_claims',
  studentInvoices: 'student_invoices',
  studentInvoiceItems: 'student_invoice_items',
  studentPayments: 'student_payments',
  feeAdjustments: 'fee_adjustments',
  invoicePaymentApplications: 'invoice_payment_applications',
  customerInvoices: 'customer_invoices',
  supplierInvoices: 'supplier_invoices',
  studentExamResults: 'student_exam_results',
  classSubjectAllocations: 'class_subject_allocations',
  teacherSubjectAssignments: 'teacher_subject_assignments',
  studentSubjectEnrollments: 'student_subject_enrollments',
  timetableEntries: 'timetable_entries',
  timetablePeriodDefs: 'timetable_period_defs',
  itemCategoriesInv: 'item_categories_inv',
  itemsInv: 'items_inv',
  fixedAssets: 'fixed_assets',
  stockLevels: 'stock_levels',
  stockTransactions: 'stock_transactions',
  payrollPeriods: 'payroll_periods',
  payrollItemTypes: 'payroll_item_types',
  staffSalarySettings: 'staff_salary_settings',
  bookCategories: 'book_categories',
  mealPlans: 'meal_plans',
  auditLogs: 'audit_logs',
  studentOpeningBalances: 'student_opening_balances',
  transportRoutes: 'transport_routes',
  studentTransportAssignments: 'student_transport_assignments',
  generalPayments: 'general_payments',
  generalLedgerEntries: 'general_ledger_entries',
  educationSystemConfigurations: 'education_system_configurations'
};

const MODULE_NAME_ALIASES: Record<string, string> = {
  academic: 'academics',
  academics: 'academics',
  administration: 'administration',
  finance: 'finance',
  hr: 'hr',
  hr_payroll: 'hr',
  payroll: 'hr',
  inventory: 'inventory',
  library: 'library',
  nutrition: 'nutrition',
  transport: 'administration', // Transport data is in administration module
  communications: 'administration', // Communications templates in administration
  students: 'administration', // Students are in administration module
  core: 'administration' // Core data is in administration module
};

const COLLECTION_PRIORITY = [
  'roles',
  'users',
  'departments',
  'designations',
  'student_categories',
  'dormitories',
  'academic_year_structures',
  'academic_period_definitions',
  'academic_years',
  'school_periods',
  'classes',
  'class_streams',
  'staff',
  'parents_guardians',
  'students',
  'subjects',
  'class_subject_allocations',
  'teacher_subject_assignments',
  'student_subject_enrollments'
];

export const REQUIRED_SCHOOL_COLLECTIONS = ['students', 'staff', 'classes', 'class_streams'] as const;

const VOLUME_FACTORS: Record<SeedVolume, number> = {
  tiny: 0.2,
  small: 0.4,
  medium: 0.7,
  large: 1,
  enterprise: 1
};

const camelToSnake = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();

const normalizeModuleName = (moduleName: string): string =>
  MODULE_NAME_ALIASES[moduleName] || moduleName;

const shouldSkipExport = (key: string, value: unknown): boolean =>
  key.startsWith('initialMock') || !Array.isArray(value);

const resolveCollectionName = (exportKey: string): string | null => {
  const explicit = COLLECTION_NAME_EXCEPTIONS[exportKey];
  if (explicit && collectionsDefinition[explicit as keyof typeof collectionsDefinition]) {
    return explicit;
  }

  const snakeCase = camelToSnake(exportKey);
  if (collectionsDefinition[snakeCase as keyof typeof collectionsDefinition]) {
    return snakeCase;
  }

  if (collectionsDefinition[exportKey as keyof typeof collectionsDefinition]) {
    return exportKey;
  }

  return null;
};

const normalizeSeedValue = (key: string, value: any): any => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeSeedValue(key, item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, normalizeSeedValue(childKey, childValue)])
    );
  }

  if (typeof value === 'number' && (key === 'id' || key.endsWith('_id'))) {
    return String(value);
  }

  return value;
};

const normalizeRecord = (record: any): any => {
  const normalized = normalizeSeedValue('record', record);

  if (!normalized.created_at) {
    normalized.created_at = new Date().toISOString();
  }

  if (!normalized.updated_at) {
    normalized.updated_at = normalized.created_at;
  }

  return normalized;
};

const getSeedEntries = (modules?: string[]): SeedEntry[] => {
  const allowedModules = modules?.length
    ? new Set(modules.map(normalizeModuleName))
    : null;

  const entries: SeedEntry[] = [];

  Object.entries(mockDataModules).forEach(([path, mod]) => {
    const match = path.replace(/\\/g, '/').match(/\/modules\/([^/]+)\/data\/mockData\.ts$/);
    const moduleName = normalizeModuleName(match?.[1] || 'unknown');

    if (allowedModules && !allowedModules.has(moduleName)) {
      return;
    }

    Object.entries(mod).forEach(([exportKey, value]) => {
      if (shouldSkipExport(exportKey, value)) {
        return;
      }

      const records = value as any[];
      const collectionName = resolveCollectionName(exportKey);

      if (!collectionName || records.length === 0) {
        return;
      }

      entries.push({
        moduleName,
        exportKey,
        collectionName,
        records
      });
    });
  });

  return entries.sort((left, right) => {
    const leftPriority = COLLECTION_PRIORITY.indexOf(left.collectionName || '');
    const rightPriority = COLLECTION_PRIORITY.indexOf(right.collectionName || '');
    const safeLeft = leftPriority === -1 ? COLLECTION_PRIORITY.length : leftPriority;
    const safeRight = rightPriority === -1 ? COLLECTION_PRIORITY.length : rightPriority;
    return safeLeft - safeRight;
  });
};

const applyVolume = (records: any[], volume: SeedVolume): any[] => {
  const factor = VOLUME_FACTORS[volume];
  if (factor >= 1) {
    return records;
  }

  const count = Math.max(1, Math.ceil(records.length * factor));
  return records.slice(0, count);
};

const ensureCollection = async (provider: IDatabaseProvider, collectionName: string): Promise<ICollection<any> | null> => {
  const existing = provider.getCollection(collectionName);
  if (existing) {
    return existing;
  }

  const definition = collectionsDefinition[collectionName as keyof typeof collectionsDefinition];
  if (!definition || typeof provider.createCollection !== 'function') {
    return null;
  }

  const converted = SchemaConverter.convertRxDBToSQLite(collectionName, definition.schema);
  return provider.createCollection(collectionName, converted.schema as CollectionSchema);
};

const isMissingDocumentError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  return normalizedMessage.includes('missing') || normalizedMessage.includes('not found');
};

const removeRecordsIndividually = async (collection: ICollection<any>, records: any[]): Promise<void> => {
  if (typeof collection.remove !== 'function') {
    return;
  }

  for (const record of records) {
    const id = (record as any).id || (record as any)._id;
    if (!id) {
      continue;
    }

    try {
      await collection.remove(String(id));
    } catch (error) {
      if (!isMissingDocumentError(error)) {
        throw error;
      }
    }
  }
};

const clearCollection = async (collection: ICollection<any>): Promise<void> => {
  if (typeof (collection as any).clear === 'function') {
    await (collection as any).clear();
    return;
  }

  const existing = typeof collection.find === 'function'
    ? await collection.find({})
    : [];

  if (existing.length === 0) {
    return;
  }

  if (typeof collection.removeMany === 'function') {
    try {
      await collection.removeMany({ selector: {} });
      return;
    } catch (error) {
      if (!isMissingDocumentError(error)) {
        throw error;
      }
    }
  }

  await removeRecordsIndividually(collection, existing);
};

export const hasRequiredSchoolData = async (provider: IDatabaseProvider): Promise<boolean> => {
  for (const collectionName of REQUIRED_SCHOOL_COLLECTIONS) {
    const collection = provider.getCollection(collectionName);
    if (!collection || typeof collection.count !== 'function') {
      return false;
    }

    const count = await collection.count();
    if (count === 0) {
      return false;
    }
  }

  return true;
};

export const seedProviderWithDemoData = async (
  provider: IDatabaseProvider,
  options: SeedOptions = {}
): Promise<SeedResult> => {
  const startedAt = Date.now();
  const volume = options.volume || 'medium';
  const insertedCounts: Record<string, number> = {};
  const skippedCollections: string[] = [];
  const seedEntries = getSeedEntries(options.modules);
  const targetCollections = new Set(seedEntries.map((entry) => entry.collectionName).filter(Boolean) as string[]);

  if (options.clearExisting) {
    for (const collectionName of targetCollections) {
      const collection = await ensureCollection(provider, collectionName);
      if (collection) {
        await clearCollection(collection);
      }
    }
  }

  for (const entry of seedEntries) {
    const collectionName = entry.collectionName;
    if (!collectionName) {
      continue;
    }

    const collection = await ensureCollection(provider, collectionName);
    if (!collection) {
      skippedCollections.push(collectionName);
      continue;
    }

    if (options.onlyIfEmpty && typeof collection.count === 'function' && (await collection.count()) > 0) {
      skippedCollections.push(collectionName);
      continue;
    }

    const normalizedRecords = applyVolume(entry.records, volume).map(normalizeRecord);
    if (normalizedRecords.length === 0) {
      continue;
    }

    if (typeof collection.insertMany === 'function') {
      await collection.insertMany(normalizedRecords);
    } else {
      for (const record of normalizedRecords) {
        await collection.insert(record);
      }
    }

    insertedCounts[collectionName] = (insertedCounts[collectionName] || 0) + normalizedRecords.length;
  }

  return {
    totalRecords: Object.values(insertedCounts).reduce((sum, count) => sum + count, 0),
    tablesGenerated: Object.keys(insertedCounts),
    generationTime: Date.now() - startedAt,
    storageType: provider.name,
    insertedCounts,
    skippedCollections
  };
};

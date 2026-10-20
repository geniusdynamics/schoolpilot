import type { GenerationStats } from '../dataGeneration/UniversalDataGenerator';
// RXDB removed - Phase 2: Using provider-agnostic collections
import { collectionsDefinition } from './collections';
import { SchemaConverter } from './SchemaConverter';
import type { CollectionSchema, ICollection, IDatabaseProvider } from './interfaces';
import { logger } from '@/utils/logging';
import { RelationshipManager } from '../dataGeneration/RelationshipManager';
import { buildKenyanDemoCalendar, repairCommunicationTemplateLinks, repairSeedForeignKeys, repairStudentGuardianLinks, repairSubjectDepartments, stabiliseSeedIds } from '../dataGeneration/generators/demoSeedRepair';
import type { SeedForeignKeyReference } from '../dataGeneration/generators/demoSeedRepair';

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
  templateComms: 'communication_templates',
  campaigns: 'message_campaigns',
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
  timetablePeriodDefs: 'timetable_period_definitions',
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
  educationSystemConfigurations: 'education_system_configurations',

  // Report / View collections
  staffAttendanceRecords: 'staff_attendance_records',
  staffIDCards: 'staff_id_cards',
  studentBioData: 'student_bio_data',
  studentIDCards: 'student_id_cards',
  transferCertificateStudents: 'transfer_certificate_students',
  balanceSheetItems: 'balance_sheet_items',
  cashBookEntries: 'cash_book_entries',
  dayBookEntries: 'day_book_entries',
  receiptTemplates: 'receipt_templates',
  incomeStatementItems: 'income_statement_items',
  journalEntries: 'journal_entries',
  previousSessionFees: 'previous_session_fees',
  studentPaymentRecords: 'student_payment_records',
  trialBalanceItems: 'trial_balance_items',
  stationeryItems: 'stationery_items',
  foodInventory: 'food_inventory',
  kitchenMealPlans: 'kitchen_meal_plans'
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
  // Small keeps demo quick; medium must honour UI copy "150+ sample students" – so medium ≈ full dataset
  small: 0.5,
  medium: 1,
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

const sampleHash = (value: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

// A row's position in a volume sample must not depend on Math.random (two runs
// would keep different rows and re-seed them as duplicates) nor on values the
// seed rewrites in place (stable ids, foreign keys, display names). Hash the
// static content, ignoring ids and timestamps that change between imports.
const samplingKey = (record: any): string =>
  sampleHash(
    JSON.stringify(record, (key, value) => {
      // Ids, timestamps, foreign keys, display names and embedded guardians are
      // all rewritten by the seed. Excluding them makes this order independent of
      // whether a full-volume seed already ran in this process.
      if (key === 'id' || key === 'created_at' || key === 'updated_at' || key === 'primary_guardian') {
        return undefined;
      }
      if (/_id$/.test(key) || /_name$/.test(key)) {
        return undefined;
      }
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
        return '';
      }
      return value;
    })
  );

// Compute one deterministic order per collection from the pristine source
// (the seed samples before it repairs anything) and slice the same prefix for
// each volume. The seed rewrites ids, foreign keys and display names in place,
// so recomputing the order after a run would see different content and could
// choose other rows; this order is captured before any of those mutations.
const samplingOrders = new Map<string, any[]>();

const samplingOrder = (records: any[], collectionName: string): any[] => {
  const cached = samplingOrders.get(collectionName);
  if (cached) {
    return cached;
  }
  const ordered = records
    .map((record) => ({ record, key: samplingKey(record) }))
    .sort((left, right) => left.key.localeCompare(right.key))
    .map(({ record }) => record);
  samplingOrders.set(collectionName, ordered);
  return ordered;
};

const applyVolume = (records: any[], volume: SeedVolume, collectionName: string): any[] => {
  const factor = VOLUME_FACTORS[volume];
  if (factor >= 1) {
    return records;
  }

  const count = Math.max(1, Math.ceil(records.length * factor));
  return samplingOrder(records, collectionName).slice(0, count);
};

const buildVolumeSampleMap = (
  entries: SeedEntry[],
  volume: SeedVolume,
  parentSource: SeedEntry[] = entries
): Map<string, any[]> => {
  const map = new Map<string, any[]>();
  for (const entry of entries) {
    const collectionName = entry.collectionName!;
    map.set(collectionName, applyVolume(entry.records, volume, collectionName));
  }

  // FK closure: volume sampling (and module filtering) can keep a child row
  // while dropping the parent it references. Using the same relationship
  // definitions the strict validation checks, pull every referenced parent
  // record back in from the full mock data until nothing new is added.
  const fullRecordsById = new Map<string, Map<string, any>>();
  for (const entry of parentSource) {
    const byId = fullRecordsById.get(entry.collectionName!) ?? new Map<string, any>();
    for (const record of entry.records) {
      if (record?.id != null && !byId.has(String(record.id))) {
        byId.set(String(record.id), record);
      }
    }
    fullRecordsById.set(entry.collectionName!, byId);
  }

  const relationships = new RelationshipManager().getRelationships();
  let added = true;
  while (added) {
    added = false;
    for (const [table, rows] of Array.from(map.entries())) {
      for (const dep of relationships[table] ?? []) {
        const parents = fullRecordsById.get(dep.table);
        if (!parents) continue;
        const current = map.get(dep.table) ?? [];
        const presentIds = new Set(current.map((r: any) => String(r.id)));
        const missing: any[] = [];
        for (const row of rows) {
          const fk = row?.[dep.column];
          if (fk == null) continue;
          const key = String(fk);
          const parent = parents.get(key);
          if (parent && !presentIds.has(key)) {
            presentIds.add(key);
            missing.push(parent);
          }
        }
        if (missing.length > 0) {
          map.set(dep.table, [...current, ...missing]);
          added = true;
        }
      }
    }
  }

  return map;
};

/** Every record per collection, before volume sampling: the source of truth for "does this parent exist". */
const collectCompleteRecords = (entries: SeedEntry[]): Map<string, any[]> => {
  const byCollection = new Map<string, any[]>();
  const seenIds = new Map<string, Set<string>>();

  for (const entry of entries) {
    const collectionName = entry.collectionName;
    if (!collectionName) {
      continue;
    }
    const rows = byCollection.get(collectionName) ?? [];
    const seen = seenIds.get(collectionName) ?? new Set<string>();
    for (const record of entry.records) {
      if (record?.id != null) {
        const id = String(record.id);
        if (seen.has(id)) {
          continue;
        }
        seen.add(id);
      }
      rows.push(record);
    }
    byCollection.set(collectionName, rows);
    seenIds.set(collectionName, seen);
  }

  return byCollection;
};

const applyDemoCalendarRepair = (sampleMap: Map<string, any[]>): void => {
  // The calendar is reference data: Kenyan years run January-November and every
  // term + financial year must be present together, never sampled apart.
  if (!sampleMap.has('academic_years') && !sampleMap.has('school_periods')) {
    return;
  }

  const calendar = buildKenyanDemoCalendar();
  Object.entries(calendar).forEach(([collectionName, records]) => {
    sampleMap.set(collectionName, records);
  });
};

const applySubjectDepartmentRepair = (sampleMap: Map<string, any[]>): void => {
  const subjects = sampleMap.get('subjects') ?? [];
  if (subjects.length === 0) {
    return;
  }

  const departments = sampleMap.get('departments') ?? [];
  sampleMap.set('departments', repairSubjectDepartments(subjects, departments));
};

const applyGuardianLinkRepair = (sampleMap: Map<string, any[]>): void => {
  const students = sampleMap.get('students') ?? [];
  if (students.length === 0) {
    return;
  }

  const repaired = repairStudentGuardianLinks({
    students,
    guardians: sampleMap.get('parents_guardians') ?? [],
    relationships: sampleMap.get('student_guardian_relationships') ?? []
  });

  sampleMap.set('parents_guardians', repaired.guardians);
  sampleMap.set('student_guardian_relationships', repaired.relationships);
};

const applyCommunicationTemplateRepair = (sampleMap: Map<string, any[]>): void => {
  sampleMap.set(
    'communication_templates',
    repairCommunicationTemplateLinks(
      sampleMap.get('communication_templates') ?? [],
      sampleMap.get('auto_sms_settings') ?? [],
      sampleMap.get('message_campaigns') ?? []
    )
  );
};

/** Every foreign key the collection schemas declare, as child.column -> parent. */
const schemaDeclaredReferences = (): SeedForeignKeyReference[] => {
  const references: SeedForeignKeyReference[] = [];

  for (const [child, definition] of Object.entries(collectionsDefinition)) {
    for (const [column, property] of Object.entries(definition.schema?.properties ?? {})) {
      const ref = (property as { ref?: unknown })?.ref;
      if (typeof ref === 'string' && ref.length > 0) {
        references.push({ child, column, parent: ref });
      }
    }
  }

  return references;
};

const mergeSeedEntries = (entries: SeedEntry[], sampleMap: Map<string, any[]>): SeedEntry[] => {
  const merged: SeedEntry[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const collectionName = entry.collectionName;
    if (!collectionName || seen.has(collectionName)) {
      continue;
    }
    seen.add(collectionName);
    merged.push({ ...entry, records: sampleMap.get(collectionName) ?? entry.records });
  }

  // FK closure and the calendar/guardian repairs can introduce collections that
  // no mockData export maps to (financial_years, student_guardian_relationships).
  for (const [collectionName, records] of sampleMap.entries()) {
    if (seen.has(collectionName)) {
      continue;
    }
    seen.add(collectionName);
    merged.push({
      moduleName: 'core',
      exportKey: collectionName,
      collectionName,
      records
    });
  }

  return merged;
};

const existingRecordKeys = async (
  collection: ICollection<any>
): Promise<{ primaryKey: string; keys: Set<string> }> => {
  const primaryKey = collection.schema?.primaryKey || 'id';
  if (typeof collection.find !== 'function') {
    return { primaryKey, keys: new Set() };
  }

  const existing = await collection.find({});
  const keys = new Set(
    existing.map((record: any) => {
      const value = record?.[primaryKey] ?? record?.id;
      return value == null ? '' : String(value);
    })
  );
  return { primaryKey, keys };
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
  const rawRequestedEntries = getSeedEntries(options.modules);
  const rawAllEntries = options.modules?.length ? getSeedEntries() : rawRequestedEntries;
  const completeRecords = collectCompleteRecords(rawAllEntries);
  const references = schemaDeclaredReferences();

  // Canonicalise legacy ids across the whole dataset before sampling so the
  // relationship closure resolves the same parents on every run; unresolved
  // values are left for the later department/template repairs.
  repairSeedForeignKeys(completeRecords, references, completeRecords, { dropUnresolved: false });

  const withCompleteRows = (entries: SeedEntry[]): SeedEntry[] =>
    entries.map((entry) => ({
      ...entry,
      records: entry.collectionName ? completeRecords.get(entry.collectionName) ?? entry.records : entry.records
    }));

  const requestedEntries = withCompleteRows(rawRequestedEntries);
  const allEntries = withCompleteRows(rawAllEntries);
  const volumeSampleMap = buildVolumeSampleMap(requestedEntries, volume, allEntries);
  applyDemoCalendarRepair(volumeSampleMap);
  applySubjectDepartmentRepair(volumeSampleMap);
  applyGuardianLinkRepair(volumeSampleMap);
  applyCommunicationTemplateRepair(volumeSampleMap);
  stabiliseSeedIds(volumeSampleMap);
  const foreignKeyRepair = repairSeedForeignKeys(volumeSampleMap, references, completeRecords);
  if (foreignKeyRepair.remapped > 0) {
    logger.info(`[demoDataSeed] Normalised ${foreignKeyRepair.remapped} legacy foreign key value(s)`);
  }
  if (foreignKeyRepair.dropped.length > 0) {
    logger.warn(
      `[demoDataSeed] Dropped ${foreignKeyRepair.dropped.length} row(s) whose parent does not exist: ` +
      foreignKeyRepair.dropped
        .slice(0, 10)
        .map((drop) => `${drop.collection}.${drop.column}=${drop.value}`)
        .join(', ')
    );
  }
  // Parent collections pulled in by the FK closure from modules outside the
  // requested set must be seeded too, or the seeded data is not closed.
  const requestedCollections = new Set(requestedEntries.map((entry) => entry.collectionName));
  const parentEntries = allEntries.filter(
    (entry, index) =>
      !requestedCollections.has(entry.collectionName) &&
      volumeSampleMap.has(entry.collectionName!) &&
      allEntries.findIndex((other) => other.collectionName === entry.collectionName) === index
  );
  const seedEntries = mergeSeedEntries([...parentEntries, ...requestedEntries], volumeSampleMap);
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

    const sampledForCollection = volumeSampleMap.get(collectionName) ?? applyVolume(entry.records, volume, collectionName);
    const normalizedRecords = sampledForCollection.map(normalizeRecord);
    if (normalizedRecords.length === 0) {
      continue;
    }

    // Seeding is idempotent: records whose primary key already exists are left
    // untouched, so a second run cannot duplicate rows. Collections keyed on a
    // natural key (stock levels, wallets) are checked on that key, not `id`.
    const { primaryKey, keys: existingKeys } = await existingRecordKeys(collection);
    const pendingRecords = normalizedRecords.filter((record) => {
      const key = record?.[primaryKey] ?? record?.id;
      return key == null || !existingKeys.has(String(key));
    });
    if (pendingRecords.length === 0) {
      continue;
    }

    // Count only rows that actually persisted. insertMany resolves with an
    // `errors[]` array on partial failure (e.g. a column mismatch); previously
    // the seeder counted attempts, so collections could silently end up empty
    // (demo seeding wrote 0 rows for classes/class_streams this way in Aug 2026).
    let inserted = pendingRecords.length;
    if (typeof collection.insertMany === 'function') {
      const bulkResult: any = await collection.insertMany(pendingRecords);
      const insertErrors = Array.isArray(bulkResult?.errors) ? bulkResult.errors : [];
      if (insertErrors.length > 0) {
        inserted = pendingRecords.length - insertErrors.length;
        logger.warn(
          `[demoDataSeed] ${collectionName}: ${insertErrors.length}/${pendingRecords.length} inserts failed ` +
          `(first: ${insertErrors[0]?.reason ?? insertErrors[0]})`
        );
      }
    } else {
      let ok = 0;
      for (const record of pendingRecords) {
        try {
          await collection.insert(record);
          ok++;
        } catch (error) {
          logger.warn(`[demoDataSeed] ${collectionName}: insert failed:`, error);
        }
      }
      inserted = ok;
      skippedCollections.push(...(ok < pendingRecords.length ? [`${collectionName}:${pendingRecords.length - ok} failures`] : []));
    }

    insertedCounts[collectionName] = (insertedCounts[collectionName] || 0) + inserted;
  }

  // Phase 2 integrity: validate relationships in-memory before returning; log warnings, fail CI if strict
  try {
    const rm = new RelationshipManager();
    const dataByTable: Record<string, any[]> = {};
    for (const [collName, sample] of volumeSampleMap.entries()) {
      dataByTable[collName] = sample.map(normalizeRecord);
    }
    const results = await rm.validateAllRelationships(dataByTable);
    const errors: string[] = [];
    const warnings: string[] = [];
    for (const [tbl, res] of Object.entries(results)) {
      if (!res.isValid) errors.push(...res.errors.map((e) => `[${tbl}] ${e}`));
      warnings.push(...res.warnings.map((w) => `[${tbl}] ${w}`));
    }
    if (warnings.length > 0) {
      logger.warn('[demoDataSeed] Relationship warnings:', warnings.slice(0, 20));
    }
    if (errors.length > 0) {
      logger.warn('[demoDataSeed] Relationship validation errors:', errors.slice(0, 50));
      // In CI (process.env.CI) fail fast; otherwise keep seeding but surface errors
      if (typeof process !== 'undefined' && (process as any).env?.CI === 'true') {
        throw new Error(`Relationship validation failed: ${errors.slice(0, 5).join('; ')}`);
      }
    } else {
      logger.info('[demoDataSeed] Relationship validation passed');
    }
  } catch (validationError) {
    // Re-throw CI failures, otherwise log
    if (typeof process !== 'undefined' && (process as any).env?.CI === 'true') {
      throw validationError;
    }
    logger.warn('[demoDataSeed] Validation step error (non-fatal):', validationError);
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

export const validateRelationships = async (
  provider?: IDatabaseProvider,
  volume: SeedVolume = 'medium'
): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> => {
  const entries = getSeedEntries();
  const sampleMap = buildVolumeSampleMap(entries, volume);
  const dataByTable: Record<string, any[]> = {};
  for (const [k, v] of sampleMap.entries()) dataByTable[k] = v.map(normalizeRecord);
  const rm = provider ? new RelationshipManager(provider as any) : new RelationshipManager();
  const results = await rm.validateAllRelationships(dataByTable);
  const errors = Object.values(results).flatMap((r) => r.errors);
  const warnings = Object.values(results).flatMap((r) => r.warnings);
  return { isValid: errors.length === 0, errors, warnings };
};

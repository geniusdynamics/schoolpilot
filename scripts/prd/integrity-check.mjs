// ABOUTME: PRD P0-G12 integrity check — sweeps every schema-declared foreign key in a real SQLite database.
// ABOUTME: Builds a fresh school through the setup-wizard writers and a demo-seeded database, then exits 1 on any dangling ref, duplicate id or unusable id.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Node has no OPFS and no DOM: VITE_DB_ALLOW_MEMORY lets the real SQLite-WASM provider open a
// genuine in-memory database on the same code path the application uses. This is a checker, not
// the app runtime, so nothing here can be mistaken for the browser's persistent store.
process.env.VITE_DB_ALLOW_MEMORY = 'true';
process.env.VITE_LOG_LEVEL = process.env.VITE_LOG_LEVEL || 'error';

const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const withEquals = argv.find((arg) => arg.startsWith(`--${name}=`));
  if (withEquals) return withEquals.slice(name.length + 3);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 && argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[index + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

if (flag('help')) {
  console.log(`Usage: node scripts/prd/integrity-check.mjs [options]

  --source=fresh|demo|all   Database to sweep (default: all)
  --volume=<volume>         Demo-seed volume: tiny|small|medium|large|enterprise (default: medium)
  --json                    Print the report as JSON
  --max-findings=<n>        Findings printed per database (default: 50)
  --help                    This message

Exit code 0 when every database has zero dangling references, duplicate ids and unusable ids.`);
  process.exit(0);
}

const source = String(option('source', 'all'));
if (!['fresh', 'demo', 'all'].includes(source)) {
  console.error(`[integrity] unknown --source "${source}" (expected fresh, demo or all)`);
  process.exit(2);
}
const volume = String(option('volume', 'medium'));
const maxFindings = Number(option('max-findings', '50'));

const { createServer } = await import('vite');

const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.ts'),
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
});

const load = (modulePath) => server.ssrLoadModule(modulePath);

/**
 * Every `ref` the schema declares, from the core registry plus each module's own map.
 * Returns [{ child, column, parent }] deduplicated and sorted, so a new `ref` is covered
 * without editing this script.
 */
const collectSchemaRefs = (coreDefinitions, moduleMaps) => {
  const refs = new Map();
  const add = (child, definition) => {
    for (const [column, property] of Object.entries(definition.schema?.properties ?? {})) {
      const ref = property?.ref;
      if (typeof ref === 'string' && ref.length > 0) {
        refs.set(`${child}\u0000${column}\u0000${ref}`, { child, column, parent: ref });
      }
    }
  };

  for (const [child, definition] of Object.entries(coreDefinitions)) add(child, definition);
  for (const moduleMap of moduleMaps) {
    for (const [child, definition] of Object.entries(moduleMap)) add(child, definition);
  }
  return [...refs.values()].sort(
    (left, right) => left.child.localeCompare(right.child) || left.column.localeCompare(right.column)
  );
};

const rowsOf = async (provider, name) => {
  const collection = provider.getCollection(name);
  return collection ? await collection.find({}) : [];
};

/**
 * Reads every collection the provider created and reports:
 *  - dangling references: a non-null schema `ref` whose parent row does not exist;
 *  - duplicate primary keys in any created collection;
 *  - rows whose primary key is missing, empty or the literal text "undefined"/"null".
 * Parent rows and ids are matched on each collection's declared primary key
 * (`student_wallets`, for example, is keyed on `student_id`, not `id`).
 */
const sweep = async (provider, refs, label) => {
  const rowsByCollection = new Map();
  const loadRows = async (name) => {
    if (!rowsByCollection.has(name)) rowsByCollection.set(name, await rowsOf(provider, name));
    return rowsByCollection.get(name);
  };
  const primaryKeyOf = (name) => {
    const collection = provider.getCollection(name);
    return collection?.schema?.primaryKey ?? 'id';
  };

  const orphans = [];
  for (const { child, column, parent } of refs) {
    const childRows = await loadRows(child);
    if (childRows.length === 0) continue;
    const parentRows = await loadRows(parent);
    const parentKey = primaryKeyOf(parent);
    const parentIds = new Set(parentRows.map((row) => String(row[parentKey])));
    for (const row of childRows) {
      const foreignKey = row[column];
      if (foreignKey === null || foreignKey === undefined || foreignKey === '') continue;
      if (!parentIds.has(String(foreignKey))) {
        orphans.push(
          `${child}.${column}=${String(foreignKey)} has no ${parent} row (row ${String(row[primaryKeyOf(child)] ?? '?')})`
        );
      }
    }
  }

  const duplicateIds = [];
  const unusableIds = [];
  let rows = 0;
  const created = typeof provider.getAllCollections === 'function' ? provider.getAllCollections() : new Map();
  for (const [name, collection] of created) {
    const collectionRows = await loadRows(name);
    rows += collectionRows.length;
    const primaryKey = collection?.schema?.primaryKey ?? 'id';
    const ids = collectionRows.map((row) => String(row[primaryKey]));
    const unique = new Set(ids);
    if (unique.size !== ids.length) duplicateIds.push(`${name}.${primaryKey}: ${ids.length - unique.size} duplicate id(s)`);
    if (ids.some((id) => id === '' || id === 'undefined' || id === 'null')) {
      unusableIds.push(`${name}.${primaryKey}: row without a usable id`);
    }
  }

  return { source: label, collections: created.size, refs: refs.length, rows, orphans, duplicateIds, unusableIds };
};

/**
 * A WizardStore over the live provider, mirroring openWizardStore(): integer-keyed tables
 * (subjects) get numeric ids, everything else gets UUIDs.
 */
const createWizardStore = (provider, collectionsDefinition, generateNumericId) => {
  let numeric = generateNumericId();
  const collection = async (name) => {
    const existing = provider.getCollection(name);
    if (existing) return existing;
    const definition = collectionsDefinition[name];
    if (!definition) throw new Error(`collection ${name} is not defined`);
    const { SchemaConverter } = await load('/src/services/database/SchemaConverter.ts');
    const converted = SchemaConverter.convertRxDBToSQLite(name, definition.schema);
    return provider.createCollection(name, converted.schema);
  };
  return {
    find: async (name) => (await (await collection(name)).find({})).map((row) => ({ ...row, id: String(row.id) })),
    insert: async (name, doc) => {
      const definition = collectionsDefinition[name];
      const id = doc.id ?? (definition?.schema?.properties?.id?.type === 'integer' ? ++numeric : crypto.randomUUID());
      await (await collection(name)).insert({ ...doc, id });
      return { ...doc, id: String(id) };
    },
    update: async (name, id, patch) => {
      await (await collection(name)).update(id, patch);
    },
    remove: async (name, id) => {
      await (await collection(name)).remove(id);
    },
  };
};

const runFreshSchool = async (context) => {
  const { SQLiteWASMProvider } = await load('/src/services/database/SQLiteWASMProvider.ts');
  const { collectionsDefinition, generateNumericId } = await load('/src/services/database/collections.ts');
  const { defaultDraft } = await load('/src/components/setup/steps/wizardDraft.ts');
  const writers = await load('/src/components/setup/steps/writers.ts');
  const { KENYAN_CURRICULUM_PRESETS } = await load('/src/modules/academics/data/templates/kenyan-subject-sets.ts');

  const provider = new SQLiteWASMProvider({ name: `integrity_fresh_${Date.now()}`, version: 1 });
  await provider.initialize();
  try {
    const store = createWizardStore(provider, collectionsDefinition, generateNumericId);
    const draft = defaultDraft(new Date());
    draft.school = {
      name: 'Integrity Academy',
      motto: 'Checked daily',
      address: 'P.O. Box 1',
      phone: '0700000000',
      email: 'office@integrity.test',
    };
    draft.curriculum = 'KCSE_SECONDARY';
    draft.classes = [
      { name: 'Form 1', streams: 'North, South' },
      { name: 'Form 2', streams: 'North, South' },
    ];

    await writers.saveSchoolProfile(store, draft.school);
    draft.created = { ...draft.created, ...(await writers.saveEducationSystem(store, draft)) };
    draft.created = { ...draft.created, ...(await writers.saveAcademicYear(store, draft)) };
    const classes = await writers.saveClassesAndStreams(store, draft);
    draft.classes = classes.classes;
    draft.created = { ...draft.created, ...classes.created };
    const preset = KENYAN_CURRICULUM_PRESETS[draft.curriculum];
    const chosen = preset.subjects.filter((subject) => draft.selectedSubjects[subject.subject_code] !== false);
    draft.created = { ...draft.created, ...(await writers.saveSubjects(store, chosen, draft.created.subjectIds)) };
    await writers.markSetupCompleted(store);

    return await sweep(provider, context.refs, 'fresh school');
  } finally {
    await provider.destroy();
  }
};

const runDemoSeed = async (context) => {
  const { SQLiteWASMProvider } = await load('/src/services/database/SQLiteWASMProvider.ts');
  const { seedProviderWithDemoData } = await load('/src/services/database/demoDataSeed.ts');

  const provider = new SQLiteWASMProvider({ name: `integrity_demo_${Date.now()}`, version: 1 });
  await provider.initialize();
  try {
    const result = await seedProviderWithDemoData(provider, { volume, clearExisting: true });
    if (result.totalRecords === 0) {
      throw new Error(`demo seed inserted no rows (volume ${volume}); the integrity sweep would prove nothing`);
    }
    return await sweep(
      provider,
      context.refs,
      `demo seed (${volume}, ${result.totalRecords} rows inserted)`
    );
  } finally {
    await provider.destroy();
  }
};

let exitCode = 0;
try {
  const { collectionsDefinition } = await load('/src/services/database/collections.ts');
  const moduleMaps = await Promise.all([
    load('/src/modules/academics/data/collections.ts').then((m) => m.academicsCollections),
    load('/src/modules/administration/data/collections.ts').then((m) => m.administrationCollections),
    load('/src/modules/administration/data/houses/collections.ts').then((m) => m.housesCollections),
    load('/src/modules/administration/data/pickup/collections.ts').then((m) => m.pickupCollections),
    load('/src/modules/finance/data/collections.ts').then((m) => m.financeCollections),
    load('/src/modules/hr/data/collections.ts').then((m) => m.hrCollections),
    load('/src/modules/inventory/data/collections.ts').then((m) => m.inventoryCollections),
    load('/src/modules/library/data/collections.ts').then((m) => m.libraryCollections),
    load('/src/modules/nutrition/data/collections.ts').then((m) => m.nutritionCollections),
    load('/src/modules/portal/data/collections.ts').then((m) => m.portalCollections),
  ]);

  const refs = collectSchemaRefs(collectionsDefinition, moduleMaps);
  if (refs.length < 100) {
    throw new Error(`schema declares only ${refs.length} ref(s); the collection registry did not load as expected`);
  }
  const context = { refs };

  const reports = [];
  if (source === 'fresh' || source === 'all') reports.push(await runFreshSchool(context));
  if (source === 'demo' || source === 'all') reports.push(await runDemoSeed(context));

  const findings = reports.reduce(
    (total, report) => total + report.orphans.length + report.duplicateIds.length + report.unusableIds.length,
    0
  );
  exitCode = findings > 0 ? 1 : 0;

  if (flag('json')) {
    console.log(JSON.stringify({ ok: findings === 0, refs: refs.length, reports }, null, 2));
  } else {
    for (const report of reports) {
      const total = report.orphans.length + report.duplicateIds.length + report.unusableIds.length;
      console.log(
        `${total === 0 ? 'PASS' : 'FAIL'} ${report.source}: ${report.orphans.length} orphan reference(s), ` +
          `${report.duplicateIds.length} duplicate id(s), ${report.unusableIds.length} unusable id(s) ` +
          `— ${report.refs} schema ref(s), ${report.collections} collection(s), ${report.rows} row(s) checked`
      );
      for (const finding of report.orphans.slice(0, maxFindings)) console.log(`  orphan: ${finding}`);
      if (report.orphans.length > maxFindings) console.log(`  … ${report.orphans.length - maxFindings} more orphan(s)`);
      for (const finding of report.duplicateIds.slice(0, maxFindings)) console.log(`  duplicate: ${finding}`);
      for (const finding of report.unusableIds.slice(0, maxFindings)) console.log(`  unusable: ${finding}`);
    }
    console.log(
      findings === 0
        ? `[integrity] OK — 0 findings across ${reports.length} database(s)`
        : `[integrity] ${findings} finding(s); fix the data or the writer that produced it`
    );
  }
} catch (error) {
  exitCode = 2;
  console.error(`[integrity] error: ${error instanceof Error ? error.stack || error.message : String(error)}`);
} finally {
  await server.close();
}

process.exit(exitCode);

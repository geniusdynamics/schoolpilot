// ABOUTME: Playwright end-to-end check that SQLite data survives a page reload (OPFS SAH-pool storage worker).
// ABOUTME: Usage: `node tests/e2e/sqlite-persistence.e2e.mjs` (starts Vite itself) or set BASE_URL to reuse a running server.

import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || undefined;
const INIT_WAIT_MS = 6000;

async function startServer() {
  if (process.env.BASE_URL) return { url: process.env.BASE_URL, close: async () => {} };
  const { createServer } = await import('vite');
  const server = await createServer({ server: { port: 0, strictPort: false }, logLevel: 'error' });
  await server.listen();
  const address = server.httpServer.address();
  return { url: `http://localhost:${address.port}/`, close: () => server.close() };
}

/**
 * Import an app module inside the page using the exact URL the app loaded it
 * from (Vite may append ?t=… after edits), so we share the app's instance.
 */
const IMPORT_APP_MODULE = `async (path) => {
  const loaded = performance.getEntriesByType('resource').map((e) => e.name).find((n) => new URL(n).pathname === path);
  return import(loaded || path);
}`;

/** Run `fn` against a collection of the app's live database inside the page. */
const withCollection = (page, name, fn, arg) =>
  page.evaluate(
    async ({ name, fnSource, arg, importSource }) => {
      const importAppModule = new Function(`return (${importSource});`)();
      // Initialise the app's database manager directly so the check does not
      // depend on the onboarding UI (which only initialises it after setup).
      const m = await importAppModule('/src/services/database/UnifiedDatabaseManager.ts');
      const manager = m.UnifiedDatabaseManager.getInstance();
      if (!manager.isReady()) await manager.initialize();
      const collection = manager.getCollection(name);
      if (!collection) throw new Error(`collection ${name} not found`);
      return new Function('collection', 'arg', `return (${fnSource})(collection, arg);`)(collection, arg);
    },
    { name, fnSource: fn.toString(), arg, importSource: IMPORT_APP_MODULE }
  );

const storageStatus = (page) =>
  page.evaluate(async (importSource) => {
    const importAppModule = new Function(`return (${importSource});`)();
    const m = await importAppModule('/src/services/database/SQLiteWASMProvider.ts');
    return m.getSQLiteStorageStatus();
  }, IMPORT_APP_MODULE);

const server = await startServer();
const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM_PATH });
let failed = false;
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));

  await page.goto(server.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(INIT_WAIT_MS);

  const studentId = `e2e-persist-${Date.now()}`;
  await withCollection(
    page,
    'students',
    (collection, id) => collection.insert({ id, first_name: 'Persisted', last_name: 'Learner', admission_number: id }),
    studentId
  );

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(INIT_WAIT_MS);

  const found = await withCollection(page, 'students', (collection, id) => collection.findById(id), studentId);
  assert.ok(found, 'student created before the reload is missing afterwards');
  assert.equal(found.first_name, 'Persisted');

  const status = await storageStatus(page);
  assert.equal(status.mode, 'opfs-sahpool', `expected persistent storage, got ${JSON.stringify(status)}`);
  assert.ok(typeof status.persisted === 'boolean' || status.persisted === null, 'persist() result not recorded');

  const log = consoleLines.join('\n');
  assert.doesNotMatch(log, /IN-MEMORY DATABASE/, 'SQLite fell back to an in-memory database');
  assert.doesNotMatch(log, /Write was NOT persisted/, 'a write failed to reach persistent storage');

  console.log('PASS sqlite-persistence: student survives reload on opfs-sahpool storage');
} catch (error) {
  failed = true;
  console.error(`FAIL sqlite-persistence: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);

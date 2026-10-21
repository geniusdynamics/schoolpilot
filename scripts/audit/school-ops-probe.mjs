// ABOUTME: Browser probe that replays the school-operations audit checks against a running dev server.
// ABOUTME: Usage: pnpm dev (port 5200) then `node scripts/audit/school-ops-probe.mjs [--out report.md]`; exits 1 on any failure.

import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5200';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || undefined;
const outIndex = process.argv.indexOf('--out');
const OUT_FILE = outIndex > 0 ? process.argv[outIndex + 1] : null;

const results = [];
const record = (id, title, status, detail = '') => {
  results.push({ id, title, status, detail: String(detail).replace(/\s+/g, ' ').slice(0, 3000) });
  console.log(`${status.padEnd(4)} ${id} ${title}${detail ? ' — ' + String(detail).slice(0, 160) : ''}`);
};

const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM_PATH });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
// The first request to a cold Vite server compiles the app and can take a couple of minutes;
// the default 30 s navigation timeout made the probe crash before any check beyond C01 ran.
page.setDefaultNavigationTimeout(240_000);
page.setDefaultTimeout(120_000);
const consoleLines = [];
page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => consoleLines.push(`[pageerror] ${e.message}`));

const wait = (ms) => page.waitForTimeout(ms);
const mainText = async () => (await page.locator('main').innerText().catch(() => '')) || '';
const dismissOverlay = () => page.evaluate(() => document.querySelectorAll('vite-error-overlay').forEach((e) => e.remove()));
const go = async (hashPath) => {
  await page.evaluate((p) => { window.location.hash = p; }, hashPath);
  await wait(2500);
  await dismissOverlay();
};
const consoleSince = (mark) => consoleLines.slice(mark).join('\n');
const count = (collection) => page.evaluate(async (name) => {
  const m = await import('/src/services/database/databaseService.ts');
  const db = await m.databaseService.getDatabase();
  const c = db.databaseManager.getCollection(name);
  return c ? (await c.find({})).length : -1;
}, collection);
const dialog = () => page.locator('[role=dialog]').last();
const dialogText = async () => (await page.locator('[role=dialog]').count()) ? dialog().innerText() : '';

async function check(id, title, fn) {
  const mark = consoleLines.length;
  try {
    const outcome = await fn(mark);
    if (outcome && outcome.skip) record(id, title, 'SKIP', outcome.skip);
    else if (outcome && outcome.fail) record(id, title, 'FAIL', outcome.fail);
    else record(id, title, 'PASS', outcome && outcome.note);
  } catch (error) {
    record(id, title, 'FAIL', `exception: ${error.message.split('\n')[0]}`);
  }
}

// ---------------------------------------------------------------------------
// First run: onboarding (production path) and setup wizard
// ---------------------------------------------------------------------------
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => /Get Started|Sign in|Username|Password/i.test(document.body.innerText), { timeout: 90000 });
await wait(3500);

await check('C01', 'Database storage is persistent (no in-memory fallback)', async () => {
  const log = consoleLines.join('\n');
  return /IN-MEMORY DATABASE/.test(log) ? { fail: 'SQLite WASM fell back to an in-memory database' } : {};
});

await check('C02', 'Production setup wizard saves the school profile step', async () => {
  const start = page.getByRole('button', { name: /Get Started/i });
  if (!(await start.count())) return { skip: 'onboarding already completed in this browser profile' };
  await start.click(); await wait(1200);
  await page.getByRole('button', { name: /Go Direct to Production/i }).click();
  await page.getByRole('button', { name: /^Continue$/ }).click(); await wait(1200);
  await page.getByRole('button', { name: /Initialize Production/i }).click(); await wait(3500);
  await page.locator('input').first().fill('Probe Academy');
  await page.getByRole('button', { name: /^Next$/ }).click(); await wait(2500);
  const body = await page.locator('body').innerText();
  if (/not found|failed|could not/i.test(body)) return { fail: (body.match(/[^\n]*(not found|failed|could not)[^\n]*/i) || [''])[0] };
  return /Step 2 of/.test(body) ? {} : { fail: 'wizard did not advance to step 2' };
});

await page.reload({ waitUntil: 'domcontentloaded' });
await wait(6000);

await check('C03', 'Production database is not auto-seeded with demo data', async () => {
  const students = await count('students');
  return students > 0 ? { fail: `${students} demo students present after choosing production` } : {};
});

// The probe's own administrator, created through the first-run "Create administrator" form.
const PROBE_ADMIN = { username: 'probe-admin', displayName: 'Probe Administrator', password: 'probe-admin-pass-1' };

await check('C04', 'Login rejects a wrong password and accepts the right one', async (mark) => {
  const createForm = page.getByTestId('create-administrator-form');
  await page.locator('#username, #admin-username').first().waitFor({ timeout: 60000 });
  if (await createForm.count()) {
    await createForm.locator('#admin-username').fill(PROBE_ADMIN.username);
    await createForm.locator('#admin-display-name').fill(PROBE_ADMIN.displayName);
    await createForm.locator('#admin-password').fill(PROBE_ADMIN.password);
    await createForm.locator('#admin-confirm').fill(PROBE_ADMIN.password);
    await createForm.getByRole('button', { name: /Create administrator/i }).click();
    await page.locator('#username').waitFor({ timeout: 10000 }).catch(() => {});
    if (await createForm.count()) return { fail: `could not create the first administrator: ${await createForm.innerText()}` };
  }
  const signIn = page.locator('form', { has: page.locator('#password') });
  if (!(await signIn.count())) return { fail: 'sign-in form not shown' };
  await signIn.locator('#username').fill(PROBE_ADMIN.username);
  await signIn.locator('#password').fill('definitely-wrong');
  await signIn.getByRole('button', { name: /^Sign In$/ }).click(); await wait(5000);
  if (/#\/dashboard/.test(page.url())) return { fail: 'signed in with a wrong password' + (/DEMO MODE LOGIN/.test(consoleSince(mark)) ? ' (DEMO MODE LOGIN)' : '') };
  if (!(await signIn.count())) return { fail: 'wrong password left the sign-in form without reaching the dashboard' };
  if (!(await signIn.locator('.text-red-700').count())) return { fail: 'wrong password stayed on the sign-in form but no error message was shown' };
  await signIn.locator('#username').fill(PROBE_ADMIN.username);
  await signIn.locator('#password').fill(PROBE_ADMIN.password);
  await signIn.getByRole('button', { name: /^Sign In$/ }).click(); await wait(5000);
  if (!/#\/dashboard/.test(page.url())) return { fail: `correct password did not sign in: ${(await page.locator('body').innerText()).match(/[^\n]*(invalid|incorrect|error|failed)[^\n]*/i)?.[0] || 'still on ' + page.url()}` };
  return {};
});

if (!/#\/dashboard/.test(page.url())) {
  record('C00', 'Signed in as the probe administrator', 'FAIL', 'could not reach the dashboard; remaining checks skipped');
} else {
  // -------------------------------------------------------------------------
  // Academic structure
  // -------------------------------------------------------------------------
  await check('C05', 'Classes page exposes an "Add Class" action', async () => {
    await go('/administration/classes');
    const n = await page.locator('main').getByRole('button', { name: /Add Class/i }).count();
    return n ? {} : { fail: 'no Add Class button rendered (action registered with an unmounted ActionBar)' };
  });

  await check('C06', 'Terms can be created (Financial Year options available)', async () => {
    await go('/administration/academic-calendar?tab=school-periods');
    await page.locator('main').getByRole('button', { name: /Add School Period/i }).click(); await wait(1200);
    const options = await dialog().locator('select[name=financial_year_id] option').count();
    await page.keyboard.press('Escape');
    return options > 1 ? {} : { fail: 'Financial Year is required but has no options and no UI to create one' };
  });

  // -------------------------------------------------------------------------
  // Students
  // -------------------------------------------------------------------------
  await check('C07', 'Adding a student persists the guardian', async () => {
    await go('/administration/students');
    const before = await count('parents_guardians');
    await page.locator('main').getByRole('button', { name: 'Add Student' }).click(); await wait(1200);
    const d = dialog();
    await d.locator('[name=admission_no]').fill(`PROBE-${Date.now()}`);
    await d.locator('[name=first_name]').fill('Probe');
    await d.locator('[name=last_name]').fill('Learner');
    await d.getByRole('button', { name: 'Next', exact: true }).click(); await wait(500);
    await d.locator('[name=primary_guardian_name]').fill('Probe Guardian');
    await d.locator('[name=primary_guardian_relationship_type]').selectOption('Mother');
    await d.locator('[name=primary_guardian_phone]').fill('0700000000');
    await d.getByRole('button', { name: 'Next', exact: true }).click(); await wait(500);
    await d.getByRole('button', { name: 'Add Student' }).click(); await wait(2500);
    const after = await count('parents_guardians');
    return after > before ? {} : { fail: 'student saved but guardian was dropped' };
  });

  await check('C08', 'Student detail page opens', async () => {
    const id = await page.evaluate(async () => {
      const m = await import('/src/services/database/databaseService.ts');
      const db = await m.databaseService.getDatabase();
      const docs = await db.databaseManager.getCollection('students').find({});
      return docs[0] ? docs[0].id : null;
    });
    if (!id) return { skip: 'no students available' };
    await go(`/administration/students/${id}`);
    return /Page not found/.test(await mainText()) ? { fail: '/administration/students/:studentId is not registered' } : {};
  });

  await check('C09', 'Staff can be added', async () => {
    await go('/administration/staff');
    await page.locator('main').getByRole('button', { name: /Add Staff/i }).click(); await wait(1200);
    const inputs = dialog().locator('input[type=text], input:not([type])');
    const values = [`PRB-${Date.now()}`, 'Probe', 'Teacher', '0711000000'];
    for (let i = 0; i < Math.min(values.length, await inputs.count()); i++) await inputs.nth(i).fill(values[i]);
    await dialog().getByRole('button', { name: /Add Staff Member/i }).click(); await wait(2000);
    const text = await dialogText();
    if (/is not a function/.test(text)) return { fail: (text.match(/\w+ is not a function/) || [''])[0] };
    return text ? { fail: 'dialog still open after submit' } : {};
  });

  // -------------------------------------------------------------------------
  // Finance
  // -------------------------------------------------------------------------
  await check('C10', 'Fee structure items can be added to a template', async (mark) => {
    await go('/finance/fee-configuration');
    await page.locator('main').getByRole('button', { name: 'Add Fee Template' }).first().click(); await wait(1200);
    const d = dialog();
    await d.locator('input').first().fill(`Probe Template ${Date.now()}`);
    if ((await d.locator('[name=school_period_id] option').count()) < 2) return { skip: 'no terms available' };
    await d.locator('[name=school_period_id]').selectOption({ index: 1 });
    await d.getByRole('button', { name: /Add Template/i }).click(); await wait(2000);
    await page.locator('main tr', { hasText: 'Probe Template' }).getByRole('button', { name: 'Items' }).first().click(); await wait(1200);
    const items = dialog();
    await items.locator('[name=description]').fill('Tuition');
    await items.locator('[name=amount]').fill('1000');
    await items.locator('[name=revenue_account_id]').selectOption({ index: 1 });
    await items.getByRole('button', { name: 'Add Item' }).last().click(); await wait(2000);
    const log = consoleSince(mark);
    await page.keyboard.press('Escape');
    return /Unsupported bind\(\) argument type|Update failed/.test(log) ? { fail: 'updateFeeTemplate called with one argument; SQLite bind error' } : {};
  });

  await check('C11', 'A student fee payment can be recorded', async () => {
    await go('/finance/payments');
    const before = await count('student_payments');
    await page.locator('main').getByRole('button', { name: 'Record Payment' }).click(); await wait(1200);
    const d = dialog();
    await d.locator('[name=student_id]').selectOption({ index: 1 });
    await d.locator('[name=receipt_no]').fill(`PRB-${Date.now()}`);
    await d.locator('[name=total_amount_paid]').fill('500');
    await d.getByRole('button', { name: 'Record Payment' }).click(); await wait(2000);
    const after = await count('student_payments');
    await page.keyboard.press('Escape');
    return after > before ? {} : { fail: 'payment not saved (addStudentPayment is not provided by useAppData)' };
  });

  // -------------------------------------------------------------------------
  // Academics, attendance, admissions, settings
  // -------------------------------------------------------------------------
  await check('C12', 'Marks entry lists the students of a stream', async () => {
    await go('/academics/marks-entry');
    const selects = page.locator('main select');
    if ((await selects.nth(0).locator('option').count()) < 2) return { skip: 'no exam sessions' };
    await selects.nth(0).selectOption({ index: 1 }); await wait(500);
    await selects.nth(1).selectOption({ index: 1 }); await wait(2000);
    return /No students in selected class stream/.test(await mainText()) ? { fail: 'stream filter compares number to string id' } : {};
  });

  await check('C13', 'Attendance roll-call lists students after choosing a class', async () => {
    await go('/administration/attendance');
    const select = page.locator('main select').first();
    if ((await select.locator('option').count()) < 2) return { fail: 'class filter has no options' };
    await select.selectOption({ index: 1 }); await wait(1500);
    const rows = await page.locator('main').getByRole('button', { name: 'Absent', exact: true }).count();
    return rows > 0 ? {} : { fail: 'roll-call is empty after choosing a class (name vs id filter)' };
  });

  await check('C14', 'Admissions application form renders input fields', async () => {
    await go('/admissions/new-application');
    const n = await page.locator('main input, main select, main textarea').count();
    return n > 0 ? {} : { fail: 'wizard steps passed without `content`; form has 0 fields' };
  });

  await check('C15', 'School profile can be saved', async (mark) => {
    await go('/settings/school');
    await page.locator('main input').first().fill('Probe Academy');
    await page.locator('main').getByRole('button', { name: 'Save Changes' }).click(); await wait(2000);
    const log = consoleSince(mark);
    return /updateSchoolDetails is not a function|Failed to save/.test(log) ? { fail: 'updateSchoolDetails is not provided by useAppData' } : {};
  });

  // -------------------------------------------------------------------------
  // Crawl every navigation page and hub tab for crashes and 404s
  // -------------------------------------------------------------------------
  await check('C16', 'Every navigation page and hub tab renders without crashing', async () => {
    const modules = ['administration', 'academics', 'admissions', 'finance', 'hr', 'library', 'nutrition', 'reports', 'settings'];
    const paths = await page.evaluate(async (mods) => {
      const out = [];
      for (const m of mods) {
        const mod = await import(`/src/modules/${m}/moduleDefinition.tsx`);
        const def = Object.values(mod).find((v) => v && v.id === m);
        for (const n of def.navigation.filter((x) => !x.deprecated)) out.push(n.path);
      }
      return out;
    }, modules);
    const broken = [];
    for (const p of paths) {
      await go(p);
      const tabs = await page.locator('main [role=tablist]').last().locator('[role=tab]').allInnerTexts().catch(() => []);
      const targets = [null, ...tabs.slice(1)];
      for (const tab of targets) {
        if (tab) {
          await page.locator('main [role=tablist]').last().getByRole('tab', { name: tab.trim(), exact: true }).click({ timeout: 4000 }).catch(() => {});
          await wait(1500);
        }
        const text = await mainText();
        const m = text.match(/Something went wrong\s*([^\n]*)|Page not found/);
        if (m) broken.push(`${p}${tab ? ' › ' + tab.trim() : ''}: ${m[1] || 'Page not found'}`);
        await dismissOverlay();
      }
    }
    broken.forEach((b) => console.log('     broken: ' + b));
    return broken.length ? { fail: `${broken.length} broken: ${broken.join(' | ')}` } : { note: `${paths.length} pages` };
  });
}

await browser.close();

const failed = results.filter((r) => r.status === 'FAIL').length;
const lines = [
  `# School operations probe — ${new Date().toISOString()}`,
  '',
  `Target: ${BASE_URL} · ${results.length} checks · ${failed} failed`,
  '',
  '| Check | Description | Result | Detail |',
  '| --- | --- | --- | --- |',
  ...results.map((r) => `| ${r.id} | ${r.title} | ${r.status} | ${r.detail.replace(/\|/g, '\\|')} |`),
  '',
];
if (OUT_FILE) fs.writeFileSync(OUT_FILE, lines.join('\n'));
process.exitCode = failed > 0 ? 1 : 0;

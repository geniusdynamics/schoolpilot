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
/** Evaluate in the page, retrying when an app reload destroys the execution context mid-call. */
const evaluate = async (fn, arg) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await page.evaluate(fn, arg);
    } catch (error) {
      const reloaded = /Execution context was destroyed|navigat/i.test(error.message);
      if (!reloaded || attempt >= 3) throw error;
      await wait(2000);
    }
  }
};
const mainText = async () => (await page.locator('main').innerText().catch(() => '')) || '';
const dismissOverlay = () => evaluate(() => document.querySelectorAll('vite-error-overlay').forEach((e) => e.remove()));
const go = async (hashPath) => {
  await evaluate((p) => { window.location.hash = p; }, hashPath);
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

/** Open a route with a real document load, so a reload proves the write reached SQLite. */
const goFresh = async (hashPath) => {
  const origin = new URL(BASE_URL).origin;
  await page.goto(`${origin}/?probe=${Date.now()}#${hashPath}`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await page.locator('main').first().waitFor({ timeout: 120000 });
  await wait(1500);
  await dismissOverlay();
};
/** Open an EntityPicker and choose the one option that matches. */
const chooseFromPicker = async (trigger, option) => {
  await trigger.first().waitFor({ timeout: 30000 });
  await trigger.first().click();
  const listbox = page.getByRole('listbox').last();
  await listbox.waitFor({ state: 'visible', timeout: 30000 });
  const options = listbox.getByRole('option');
  await options.first().waitFor({ timeout: 30000 });
  const choice = typeof option === 'string'
    ? listbox.getByRole('option', { name: option, exact: true })
    : listbox.getByRole('option', { name: option });
  if ((await choice.count()) === 0) {
    throw new Error(`no picker option matching ${option}: ${(await options.allInnerTexts()).join(' | ')}`);
  }
  await choice.first().click();
};
/** Open an EntityPicker, choose its first option and return the option's label. */
const chooseFirstFromPicker = async (trigger) => {
  await trigger.first().waitFor({ timeout: 30000 });
  await trigger.first().click();
  const listbox = page.getByRole('listbox').last();
  await listbox.waitFor({ state: 'visible', timeout: 30000 });
  const first = listbox.getByRole('option').first();
  await first.waitFor({ timeout: 30000 });
  const label = (await first.innerText()).trim();
  await first.click();
  return label;
};
/**
 * Ensure one canonical fee item exists.
 *
 * A fee line must name a fee item; a production school starts with none and the fee-item
 * register has no page yet. This seeds the prerequisite through the same repository the
 * pages write to, then the check drives the real fee-schedule UI.
 */
const ensureFeeItem = () => page.evaluate(async () => {
  const module = await import('/src/data/canonicalRepository.tsx');
  const repository = await module.openCanonicalRepository();
  const institutions = await repository.list('institution', { limit: 1 });
  const institution = institutions.items[0];
  if (!institution) return { error: 'the school profile does not exist' };
  const code = 'PROBE-TUITION';
  const existing = await repository.list('fee_item', {
    where: { institution_id: institution.id, code },
    limit: 1,
  });
  const item = existing.items[0] ?? await repository.create('fee_item', {
    institution_id: institution.id,
    code,
    name: 'Probe Tuition',
    category: 'tuition',
    refundable: false,
    taxable: false,
    priority: 1,
    funding_source: 'parent',
  });
  return { label: `${item.code} ${item.name}` };
});
/** The canonical learner, its guardian links and the school's guardians, for a failure detail. */
const canonicalLearnerSummary = (admissionNo) => page.evaluate(async (number) => {
  try {
    const module = await import('/src/data/canonicalRepository.tsx');
    const repository = await module.openCanonicalRepository();
    const learners = await repository.list('learner', {
      where: { admission_number: number },
      limit: 2,
    });
    const learner = learners.items[0];
    if (!learner) return { learner: null };
    const links = await repository.list('learner_guardian', {
      where: { learner_id: learner.id },
      limit: 10,
    });
    const guardians = await repository.list('guardian', {
      where: { institution_id: learner.institution_id },
      limit: 50,
    });
    return {
      learner: learner.id,
      links: links.items.map((link) => ({
        guardian_id: link.guardian_id,
        is_primary: link.is_primary,
        relationship: link.relationship,
      })),
      guardians: guardians.items.map((row) => ({
        id: row.id,
        name: `${row.given_name} ${row.family_name}`,
      })),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}, admissionNo);

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

// The probe's own administrator, created in the setup wizard.
const PROBE_ADMIN = { username: 'probe-admin', displayName: 'Probe Administrator', password: 'probe-admin-pass-1' };

await check('C02', 'Production setup wizard saves the school profile step', async () => {
  const start = page.getByRole('button', { name: /Get Started/i });
  if (!(await start.count())) return { skip: 'onboarding already completed in this browser profile' };
  await start.click(); await wait(1200);
  await page.getByRole('button', { name: /Go Direct to Production/i }).click();
  await page.getByRole('button', { name: /^Continue$/ }).click(); await wait(1200);
  await page.getByRole('button', { name: /Initialize Production/i }).click();
  await page.getByText('Set up your school').waitFor({ timeout: 90000 });
  await page.getByPlaceholder('e.g. Greenfields Academy').fill('Probe Academy');
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.getByText(/Step 2 of/).waitFor({ timeout: 90000 });
  const body = await page.locator('body').innerText();
  if (/not found|failed|could not/i.test(body)) return { fail: (body.match(/[^\n]*(not found|failed|could not)[^\n]*/i) || [''])[0] };

  // The migrated pages read the canonical school, which the wizard writes from the classes step
  // and the finish, not from step 1. Finish the wizard the way a real production install does:
  // curriculum, default year and terms, one class with its streams, no sample data, first admin.
  await page.getByText(/8-4-4/).first().click();
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.getByText(/Step 3 of/).waitFor({ timeout: 90000 });
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.getByText(/Step 4 of/).waitFor({ timeout: 90000 });
  await page.getByPlaceholder(/^Class \d+$/).fill('Form 1');
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.getByText(/Step 5 of/).waitFor({ timeout: 90000 });
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.getByText(/Step 6 of/).waitFor({ timeout: 90000 });
  // Sample data stays off: C03 proves a production install seeds none.
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.getByText(/Step 7 of/).waitFor({ timeout: 90000 });
  await page.locator('#setup-admin-username').fill(PROBE_ADMIN.username);
  await page.locator('#setup-admin-display-name').fill(PROBE_ADMIN.displayName);
  await page.locator('#setup-admin-password').fill(PROBE_ADMIN.password);
  await page.locator('#setup-admin-confirm').fill(PROBE_ADMIN.password);
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await page.locator('#username').waitFor({ timeout: 90000 });
  const setupText = await page.locator('body').innerText();
  if (/could not|failed/i.test(setupText) && !/Sign in/i.test(setupText)) {
    return { fail: (setupText.match(/[^\n]*(could not|failed)[^\n]*/i) || [''])[0] };
  }
  return { note: 'school profile, structure and administrator saved' };
});

await page.reload({ waitUntil: 'domcontentloaded' });
await wait(6000);

await check('C03', 'Production database is not auto-seeded with demo data', async () => {
  const students = await count('students');
  return students > 0 ? { fail: `${students} demo students present after choosing production` } : {};
});

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
  // Values one check writes and a later check reads back from the app.
  const probeStudent = { admissionNo: '', guardianName: 'Probe Guardian', className: '' };
  const probePayment = { receipt: '' };

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
    const admissionNo = `PROBE-${Date.now()}`;
    await page.locator('main').getByRole('button', { name: 'Add Student' }).click(); await wait(1200);
    const d = dialog();
    await d.locator('[name=admission_no]').fill(admissionNo);
    await d.locator('[name=first_name]').fill('Probe');
    await d.locator('[name=last_name]').fill('Learner');
    await d.getByRole('button', { name: 'Next', exact: true }).click(); await wait(500);
    await d.locator('[name=primary_guardian_name]').fill(probeStudent.guardianName);
    await d.locator('[name=primary_guardian_relationship_type]').selectOption('Mother');
    await d.locator('[name=primary_guardian_phone]').fill('0700000000');
    await d.getByRole('button', { name: 'Next', exact: true }).click(); await wait(500);
    // Placing the learner gives the roll-call check a class to read them back from.
    const classPicker = d.getByTestId('student-class-group-picker');
    if ((await classPicker.count()) && (await classPicker.isEnabled())) {
      try {
        const label = await chooseFirstFromPicker(classPicker);
        if (label) probeStudent.className = label;
      } catch { /* no class groups yet: the learner is still admitted without a placement */ }
    }
    await d.getByRole('button', { name: 'Add Student' }).click();
    await d.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    if (await page.locator('[role=dialog]').count()) {
      return { fail: `student dialog still open after submit: ${(await dialogText()).slice(0, 500)}` };
    }
    probeStudent.admissionNo = admissionNo;
    // A fresh document load proves the learner and the guardian reached storage.
    await goFresh('/administration/students');
    const row = page.getByRole('row', { name: new RegExp(admissionNo) });
    await row.first().waitFor({ timeout: 60000 }).catch(() => {});
    if (!(await row.count())) return { fail: 'student saved but the directory does not list them after a reload' };
    // The guardians are their own queries; wait for the cell rather than the row.
    await row.first().getByText(probeStudent.guardianName).first().waitFor({ timeout: 30000 }).catch(() => {});
    const text = await row.first().innerText();
    if (!text.includes(probeStudent.guardianName)) {
      const canonical = await canonicalLearnerSummary(admissionNo);
      return { fail: `student saved but the guardian was dropped (row: ${text}; canonical: ${JSON.stringify(canonical)})` };
    }
    return { note: probeStudent.className ? `${admissionNo} in ${probeStudent.className}` : admissionNo };
  });

  await check('C08', 'Student detail page opens', async () => {
    await go('/administration/students');
    const link = page.locator('main a[href*="/administration/students/"]').first();
    await link.waitFor({ timeout: 30000 }).catch(() => {});
    const href = await link.getAttribute('href').catch(() => null);
    const id = href ? href.split('/administration/students/')[1]?.split(/[/?#]/)[0] : '';
    if (!id) return { skip: 'no students available' };
    await go(`/administration/students/${id}`);
    return /Page not found/.test(await mainText()) ? { fail: '/administration/students/:studentId is not registered' } : {};
  });

  await check('C09', 'Staff can be added', async () => {
    await go('/administration/staff');
    const staffNo = `PRB-${Date.now()}`;
    await page.locator('main').getByRole('button', { name: /Add Staff/i }).click(); await wait(1200);
    const d = dialog();
    await d.locator('[name=employee_number]').fill(staffNo);
    await d.locator('[name=given_name]').fill('Probe');
    await d.locator('[name=family_name]').fill('Teacher');
    await d.locator('[name=phone]').fill('0711000000');
    await d.getByRole('button', { name: /Add Staff Member/i }).click();
    await d.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    const text = await dialogText();
    if (/is not a function/.test(text)) return { fail: (text.match(/\w+ is not a function/) || [''])[0] };
    if (text) return { fail: `dialog still open after submit: ${text.slice(0, 700)}` };
    // A fresh document load proves the staff member reached storage.
    await goFresh('/administration/staff');
    const row = page.getByRole('row', { name: new RegExp(staffNo) });
    await row.first().waitFor({ timeout: 60000 }).catch(() => {});
    if (!(await row.count())) return { fail: 'staff dialog closed but the directory does not list the member after a reload' };
    if (!(await row.first().innerText()).includes('Probe Teacher')) {
      return { fail: `staff saved with the wrong name (row: ${await row.first().innerText()})` };
    }
    return { note: staffNo };
  });

  // -------------------------------------------------------------------------
  // Finance
  // -------------------------------------------------------------------------
  await check('C10', 'Fee structure items can be added to a template', async () => {
    const fixture = await ensureFeeItem();
    if (fixture.error) return { fail: fixture.error };
    await goFresh('/finance/fee-configuration');
    await page.locator('main').getByRole('button', { name: 'Add Fee Schedule' }).click(); await wait(1200);
    const d = dialog();
    await d.locator('[name=name]').fill(`Probe Template ${Date.now()}`);
    const yearPicker = d.locator('[name=academic_year_id]');
    if (!(await yearPicker.count())) return { fail: 'the fee schedule form has no academic-year field' };
    const yearLabel = await chooseFirstFromPicker(yearPicker).catch(() => null);
    if (!yearLabel) return { skip: 'no academic years available to bill' };
    await d.getByRole('button', { name: /Create schedule/i }).click();
    await d.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    if (await page.locator('[role=dialog]').count()) {
      return { fail: `fee schedule dialog still open after submit: ${(await dialogText()).slice(0, 500)}` };
    }
    const scheduleRow = page.getByRole('row', { name: /Probe Template/ }).first();
    await scheduleRow.waitFor({ timeout: 60000 }).catch(() => {});
    if (!(await scheduleRow.count())) return { fail: 'fee schedule was not listed after submit' };
    await scheduleRow.getByRole('button', { name: 'Lines' }).click(); await wait(1000);
    const lines = dialog();
    await lines.getByRole('button', { name: /Add fee line/i }).click(); await wait(1000);
    const itemForm = dialog();
    await chooseFromPicker(itemForm.locator('[name=fee_item_id]'), fixture.label);
    await itemForm.locator('[name=amount]').fill('1000');
    await itemForm.getByRole('button', { name: /Add line/i }).click();
    await itemForm.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    if (await page.locator('[role=dialog]').count() > 1) {
      return { fail: `fee line form still open after submit: ${(await dialogText()).slice(0, 500)}` };
    }
    const lineRow = page.getByRole('row', { name: /Probe Tuition/ }).first();
    await lineRow.waitFor({ timeout: 60000 }).catch(() => {});
    if (!(await lineRow.count())) return { fail: 'fee line was not listed in the schedule after submit' };
    if (!/1,000\.00/.test(await lineRow.innerText())) {
      return { fail: `fee line saved with the wrong amount (row: ${await lineRow.innerText()})` };
    }
    await page.keyboard.press('Escape');
    return { note: `${fixture.label} @ KES 1,000.00` };
  });

  await check('C11', 'A student fee payment can be recorded', async () => {
    // The payments page is a hub of tabs; recording a student payment lives on its own tab.
    await goFresh('/finance/payments?tab=student-payments');
    await page.locator('main').getByRole('button', { name: 'Record payment' }).click(); await wait(1200);
    const d = dialog();
    const learnerPicker = d.locator('[name=learner_id]');
    if (!(await learnerPicker.count())) return { fail: 'the payment form has no learner picker' };
    if (probeStudent.admissionNo) {
      await chooseFromPicker(learnerPicker, new RegExp(probeStudent.admissionNo));
    } else {
      await chooseFirstFromPicker(learnerPicker);
    }
    await d.locator('[name=amount]').fill('500');
    await d.locator('[name=reference]').fill(`PRB-${Date.now()}`);
    await d.getByRole('button', { name: 'Record payment' }).click();
    await d.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    if (await page.locator('[role=dialog]').count()) {
      return { fail: `payment dialog still open after submit: ${(await dialogText()).slice(0, 500)}` };
    }
    const toast = page.getByText(/Payment recorded\. Receipt RCT-\d+\./);
    await toast.waitFor({ timeout: 60000 }).catch(() => {});
    const toastText = (await toast.count()) ? await toast.first().innerText() : '';
    const match = /RCT-\d+/.exec(toastText);
    if (!match) return { fail: 'payment saved but no receipt number was issued' };
    probePayment.receipt = match[0];
    const row = page.getByRole('row', { name: new RegExp(probePayment.receipt) }).first();
    await row.waitFor({ timeout: 60000 }).catch(() => {});
    if (!(await row.count())) return { fail: 'payment saved but the payments grid does not list the receipt' };
    // A fresh document load proves the posted payment reached storage.
    await goFresh('/finance/payments');
    const saved = page.getByRole('row', { name: new RegExp(probePayment.receipt) }).first();
    await saved.waitFor({ timeout: 60000 }).catch(() => {});
    if (!(await saved.count())) return { fail: 'payment is not listed after a reload' };
    if (!/500\.00/.test(await saved.innerText())) return { fail: `payment reloaded with the wrong amount (row: ${await saved.innerText()})` };
    return { note: `${probePayment.receipt} · KES 500.00` };
  });

  // -------------------------------------------------------------------------
  // Academics, attendance, admissions, settings
  // -------------------------------------------------------------------------
  await check('C12', 'Marks entry lists the students of a stream', async () => {
    await go('/academics/marks-entry');
    // Mark entry picks a period and then one of the teacher's teaching groups.
    const periodPicker = page.locator('main').getByRole('combobox', { name: /^Period/ });
    if (!(await periodPicker.count())) return { fail: 'the period picker is not rendered' };
    await periodPicker.click();
    const listbox = page.getByRole('listbox').last();
    await listbox.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const periodOptions = listbox.getByRole('option');
    if ((await periodOptions.count()) === 0) {
      await page.keyboard.press('Escape');
      return {
        skip:
          'this fresh production school has no period to mark in; the canonical marks entry is driven by tests/e2e/gp1-lite.spec.ts with the sample school',
      };
    }
    await periodOptions.first().click();
    const groupPicker = page.locator('main').getByRole('combobox', { name: /^Teaching group/ });
    if (!(await groupPicker.count())) return { fail: 'the teaching-group picker is not rendered' };
    await groupPicker.click();
    const groups = page.getByRole('listbox').last().getByRole('option');
    await groups.first().waitFor({ timeout: 15000 }).catch(() => {});
    if ((await groups.count()) === 0) {
      await page.keyboard.press('Escape');
      return { skip: 'no teaching group is available for the assessment' };
    }
    await groups.first().click();
    await wait(1500);
    const scores = await page.locator('main input[aria-label^="Score for"]').count();
    if (scores > 0) return { note: `${scores} learner(s)` };
    if (/This teaching group has no members/.test(await mainText())) {
      return { fail: 'the chosen teaching group has no members, so marks entry lists no students' };
    }
    return { fail: 'marks entry lists no learners after choosing an assessment and teaching group' };
  });

  await check('C13', 'Attendance roll-call lists students after choosing a class', async () => {
    await go('/administration/attendance');
    const picker = page.locator('main').getByTestId('attendance-class-picker');
    if (!(await picker.count())) return { fail: 'the class filter is not rendered' };
    if (!probeStudent.className) return { skip: 'the learner admitted by C07 was not placed in a class group' };
    await chooseFromPicker(picker, probeStudent.className);
    await wait(1500);
    const rows = await page.locator('main').getByRole('button', { name: 'Absent', exact: true }).count();
    if (rows === 0) return { fail: `roll-call is empty after choosing ${probeStudent.className}` };
    const row = page.getByRole('row', { name: new RegExp(probeStudent.admissionNo) }).first();
    if (!(await row.count())) return { fail: `roll-call does not list ${probeStudent.admissionNo} in ${probeStudent.className}` };
    return { note: `${rows} learner(s) in ${probeStudent.className}` };
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
    const paths = await evaluate(async (mods) => {
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

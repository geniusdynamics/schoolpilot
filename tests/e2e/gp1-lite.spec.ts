// ABOUTME: GP-1-lite golden path on the real UI and persistent SQLite-WASM storage (PRD P0-G12).
// ABOUTME: Setup wizard -> login -> learner + guardian -> fee template + term billing + payment -> attendance -> marks -> promotion, reloading at every major step.

import playwright from '@playwright/test';

const { test, expect } = playwright;
type Page = import('@playwright/test').Page;
type Locator = import('@playwright/test').Locator;

const ADMIN = {
  username: 'gp1-admin',
  displayName: 'GP1 Administrator',
  password: 'gp1-admin-password',
};

const SCHOOL = {
  name: 'Riverside Academy',
  motto: 'Knowledge is light',
  address: 'P.O. Box 42, Nairobi',
  phone: '+254700000000',
  email: 'office@riverside.test',
};

const RUN = `${Date.now()}`;
const STUDENT = {
  admissionNo: `GP1-${RUN}`,
  firstName: 'Amina',
  lastName: 'Wanjiku',
  guardian: 'Grace Wanjiku',
  guardianPhone: '0712345678',
};
const STUDENT_NAME = `${STUDENT.firstName} ${STUDENT.lastName}`;
const ACCOUNT = { code: '4000', name: 'Tuition Revenue' };
const TEMPLATE_NAME = `Term Fees ${RUN}`;
const EXAM_NAME = `End of Term Exam ${RUN}`;
const PAPER_NAME = `Paper 1 ${RUN}`;
const TERM_LABEL = 'Term 2';
const SOURCE_STREAM = 'Form 1 · North';
const MARKS_LOGIN_STREAM = 'Form 1 - North';
const TARGET_STREAM = 'Form 2 · North';
const MARK = '87';
const PAYMENT_AMOUNT = '500';
const TUITION_AMOUNT = '1500';

/** Load an app module through the exact URL the app itself loaded, so it shares the live database instance. */
const IMPORT_APP_MODULE = `async (path) => {
  const loaded = performance.getEntriesByType('resource').map((entry) => entry.name).find((name) => new URL(name).pathname === path);
  return import(loaded || path);
}`;

type Row = Record<string, unknown>;

/** Read a collection from the application's live SQLite database (used to prove persistence after reloads). */
const readCollection = async (page: Page, collection: string): Promise<Row[]> =>
  (await page.evaluate(
    async ({ name, importSource }) => {
      const importAppModule = new Function(`return (${importSource});`)();
      const module = await importAppModule('/src/services/database/databaseService.ts');
      const database = await module.databaseService.getDatabase();
      const collection = database.databaseManager.getCollection(name);
      return collection ? await collection.find({}) : [];
    },
    { name: collection, importSource: IMPORT_APP_MODULE }
  )) as Row[];

/** Navigate with a real document load: the app's tab engine owns the hash, so a bare hash change races it.
 * A cache-busting search param forces a fresh load and also proves every write went to SQLite, not memory. */
const go = async (page: Page, path: string) => {
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/?gp1=${Date.now()}#${path}`, { waitUntil: 'domcontentloaded' });
  await waitForShell(page);
};

/** Wait for the authenticated shell (header with the school name) after a reload. */
const waitForShell = async (page: Page) => {
  await page.locator('header').first().waitFor({ state: 'visible', timeout: 180_000 });
};

const reloadAndWait = async (page: Page) => {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForShell(page);
};

/** Select an option by the visible text of its label (ids are opaque strings, never positional). */
const selectByText = async (select: Locator, text: string) => {
  const option = select.locator('option', { hasText: text }).first();
  await expect(option).toHaveCount(1);
  const value = await option.getAttribute('value');
  if (!value) throw new Error(`option "${text}" has no value`);
  await select.selectOption(value);
  return value;
};

test.describe('GP-1-lite golden path', () => {
  test('a school is set up, billed, taught and promoted on persistent storage', async ({ page }) => {
    test.setTimeout(900_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await test.step('first run: complete the setup wizard', async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Welcome to SchoolPilot 3' })).toBeVisible({ timeout: 180_000 });
      await page.getByRole('button', { name: 'Get Started' }).click();
      await expect(page.getByRole('heading', { name: 'Choose Your Setup Path' })).toBeVisible();
      await page.getByRole('button', { name: /Go Direct to Production/ }).click();
      await page.getByRole('button', { name: /^Continue$/ }).click();
      await expect(page.getByRole('heading', { name: 'Ready for Production?' })).toBeVisible();
      await page.getByRole('button', { name: /Initialize Production/ }).click();
      await expect(page.getByText('Set up your school')).toBeVisible({ timeout: 90_000 });

      // Step 1 — school profile
      await page.getByPlaceholder('e.g. Greenfields Academy').fill(SCHOOL.name);
      await page.getByPlaceholder('Knowledge is light').fill(SCHOOL.motto);
      await page.getByPlaceholder('P.O. Box 1234, Nairobi').fill(SCHOOL.address);
      await page.getByPlaceholder('+254 700 000 000').fill(SCHOOL.phone);
      await page.getByPlaceholder('info@school.ac.ke').fill(SCHOOL.email);
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText('Step 2 of 6')).toBeVisible({ timeout: 30_000 });

      // Step 2 — education system
      await page.getByText('8-4-4 — Secondary (Form 1–4, KCSE)').click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText('Step 3 of 6')).toBeVisible({ timeout: 30_000 });

      // Step 3 — academic year and terms (validated defaults)
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText('Step 4 of 6')).toBeVisible({ timeout: 30_000 });

      // Step 4 — classes and streams
      await page.getByPlaceholder('Class 1').fill('Form 1');
      await page.getByPlaceholder('Streams, comma-separated (e.g. North, South)').first().fill('North, South');
      await page.getByRole('button', { name: 'Add class' }).click();
      await page.getByPlaceholder('Class 2').fill('Form 2');
      await page.getByPlaceholder('Streams, comma-separated (e.g. North, South)').nth(1).fill('North, South');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText('Step 5 of 6')).toBeVisible({ timeout: 30_000 });

      // Step 5 — subjects (all presets selected)
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText('Step 6 of 6')).toBeVisible({ timeout: 30_000 });

      // Step 6 — first administrator
      await page.locator('#setup-admin-username').fill(ADMIN.username);
      await page.locator('#setup-admin-display-name').fill(ADMIN.displayName);
      await page.locator('#setup-admin-password').fill(ADMIN.password);
      await page.locator('#setup-admin-confirm').fill(ADMIN.password);
      await page.getByRole('button', { name: 'Finish setup' }).click();

      // The wizard reloads the page after finishing; wait for that load, then reload once more by hand.
      await expect(page.getByTestId('login-page')).toBeVisible({ timeout: 120_000 });
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('login-page')).toBeVisible({ timeout: 90_000 });
    });

    await test.step('log in as the administrator', async () => {
      await page.locator('#username').fill(ADMIN.username);
      await page.locator('#password').fill(ADMIN.password);
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      await page.waitForURL(/#\/dashboard/, { timeout: 90_000 });
      await waitForShell(page);
      await expect(page.locator('header')).toContainText(SCHOOL.name);
    });

    await test.step('reload: the school profile and the session survived', async () => {
      await reloadAndWait(page);
      await expect(page.locator('header')).toContainText(SCHOOL.name);
      await expect(page.getByTestId('login-page')).toHaveCount(0);
    });

    let studentId = '';
    let termId = '';

    await test.step('create a learner and a guardian through the student directory', async () => {
      await go(page, '/administration/students');
      await expect(page.getByRole('heading', { name: 'Student Management' })).toBeVisible();
      await page.getByRole('button', { name: 'Add Student' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      await dialog.locator('[name=admission_no]').fill(STUDENT.admissionNo);
      await dialog.locator('[name=first_name]').fill(STUDENT.firstName);
      await dialog.locator('[name=last_name]').fill(STUDENT.lastName);
      await dialog.getByRole('button', { name: 'Next', exact: true }).click();

      await dialog.locator('[name=primary_guardian_name]').fill(STUDENT.guardian);
      await dialog.locator('[name=primary_guardian_relationship_type]').selectOption('Mother');
      await dialog.locator('[name=primary_guardian_phone]').fill(STUDENT.guardianPhone);
      await dialog.getByRole('button', { name: 'Next', exact: true }).click();

      await selectByText(dialog.locator('[name=current_class_stream_id]'), SOURCE_STREAM);
      await dialog.getByRole('button', { name: 'Add Student', exact: true }).click();
      await expect(dialog).toBeHidden({ timeout: 60_000 });

      const row = page.getByRole('row', { name: new RegExp(STUDENT.admissionNo) });
      await expect(row).toBeVisible({ timeout: 60_000 });
      await expect(row).toContainText(STUDENT_NAME);
      await expect(row).toContainText(STUDENT.guardian);

      const students = await readCollection(page, 'students');
      const learner = students.find((student) => String(student.admission_no) === STUDENT.admissionNo);
      expect(learner, 'the learner was not written to the database').toBeTruthy();
      studentId = String(learner!.id);
      const streams = await readCollection(page, 'class_streams');
      const placement = streams.find((stream) => String(stream.id) === String(learner!.current_class_stream_id));
      expect(placement, 'the learner has no class stream').toBeTruthy();
    });

    await test.step('reload: the learner and guardian are still in the directory', async () => {
      await reloadAndWait(page);
      await go(page, '/administration/students');
      const row = page.getByRole('row', { name: new RegExp(STUDENT.admissionNo) });
      await expect(row).toBeVisible({ timeout: 60_000 });
      await expect(row).toContainText(STUDENT_NAME);
      await expect(row).toContainText(STUDENT.guardian);
    });

    await test.step('create a revenue account, a fee template and its fee item', async () => {
      await go(page, '/finance/accounting-config');
      await expect(page.getByRole('heading', { name: 'Chart of Accounts Management' })).toBeVisible();
      await page.getByRole('button', { name: 'Add Account' }).first().click();
      const accountDialog = page.getByRole('dialog');
      await accountDialog.locator('[name=account_code]').fill(ACCOUNT.code);
      await accountDialog.locator('[name=name]').fill(ACCOUNT.name);
      await accountDialog.locator('[name=type]').selectOption('Revenue');
      await accountDialog.getByRole('button', { name: 'Add Account' }).click();
      await expect(accountDialog).toBeHidden({ timeout: 30_000 });

      await go(page, '/finance/fee-configuration');
      await page.getByRole('button', { name: 'Add Fee Template' }).first().click();
      const templateDialog = page.getByRole('dialog');
      await templateDialog.locator('input').first().fill(TEMPLATE_NAME);
      termId = await selectByText(templateDialog.locator('[name=school_period_id]'), TERM_LABEL);
      await templateDialog.getByRole('button', { name: 'Add Template' }).click();
      await expect(templateDialog).toBeHidden({ timeout: 30_000 });

      const templateRow = page.getByRole('row', { name: new RegExp(TEMPLATE_NAME) });
      await expect(templateRow).toBeVisible({ timeout: 60_000 });
      await templateRow.getByRole('button', { name: 'Items' }).click();
      const itemsDialog = page.getByRole('dialog');
      await itemsDialog.locator('[name=description]').fill('Tuition');
      await itemsDialog.locator('[name=amount]').fill(TUITION_AMOUNT);
      await selectByText(itemsDialog.locator('[name=revenue_account_id]'), ACCOUNT.name);
      await itemsDialog.getByRole('button', { name: 'Add Item' }).click();
      await expect(itemsDialog.getByRole('row', { name: /Tuition/ })).toBeVisible({ timeout: 30_000 });
      await itemsDialog.getByRole('button', { name: 'Done' }).click();
      await expect(itemsDialog).toBeHidden({ timeout: 30_000 });
    });

    await test.step('reload: the fee template and its item persisted', async () => {
      await reloadAndWait(page);
      await go(page, '/finance/fee-configuration');
      const templateRow = page.getByRole('row', { name: new RegExp(TEMPLATE_NAME) });
      await expect(templateRow).toBeVisible({ timeout: 60_000 });
      await templateRow.getByRole('button', { name: 'Items' }).click();
      const itemsDialog = page.getByRole('dialog');
      await expect(itemsDialog.getByRole('row', { name: /Tuition/ })).toBeVisible({ timeout: 30_000 });
      await itemsDialog.getByRole('button', { name: 'Done' }).click();
    });

    await test.step('bill the term for the learner', async () => {
      await go(page, '/finance/invoicing');
      await expect(page.getByRole('heading', { name: 'Invoice Generation' })).toBeVisible();
      const periodSelect = page.locator('main select').first();
      await selectByText(periodSelect, TERM_LABEL);
      await page.getByRole('button', { name: /^Generate( Invoices)?$/ }).click();
      await expect(page.getByText(/Invoices Created|New invoices/)).toBeVisible({ timeout: 60_000 });

      await expect
        .poll(
          async () => {
            const invoices = await readCollection(page, 'student_invoices');
            return invoices.filter(
              (candidate) =>
                String(candidate.student_id) === studentId && String(candidate.school_period_id) === String(termId)
            ).length;
          },
          { timeout: 60_000, message: 'the term invoice was not written for the learner' }
        )
        .toBeGreaterThan(0);

      const invoices = await readCollection(page, 'student_invoices');
      const invoice = invoices.find(
        (candidate) => String(candidate.student_id) === studentId && String(candidate.school_period_id) === String(termId)
      );
      expect(Number(invoice!.total_amount_billed)).toBe(Number(TUITION_AMOUNT));
    });

    let receiptNo = '';

    await test.step('record a payment against the billed learner', async () => {
      await go(page, '/finance/payments');
      await expect(page.getByRole('heading', { name: 'Student Payments' })).toBeVisible();
      await page.getByRole('button', { name: 'Record Payment' }).first().click();
      const dialog = page.getByRole('dialog');
      await selectByText(dialog.locator('[name=student_id]'), STUDENT.lastName);
      receiptNo = await dialog.locator('[name=receipt_no]').inputValue();
      expect(receiptNo, 'the receipt number was not generated').toMatch(/^RCT\//);
      await dialog.locator('[name=total_amount_paid]').fill(PAYMENT_AMOUNT);
      await dialog.getByRole('button', { name: 'Record Payment' }).click();
      await expect(dialog).toBeHidden({ timeout: 60_000 });

      const row = page.getByRole('row', { name: new RegExp(receiptNo) });
      await expect(row).toBeVisible({ timeout: 60_000 });
      await expect(row).toContainText('500');
    });

    await test.step('reload: the payment is still listed', async () => {
      await reloadAndWait(page);
      await go(page, '/finance/payments');
      const row = page.getByRole('row', { name: new RegExp(receiptNo) });
      await expect(row).toBeVisible({ timeout: 60_000 });
      await expect(row).toContainText('500');
    });

    await test.step('take attendance for the class', async () => {
      await go(page, '/administration/attendance');
      await expect(page.getByText('Manual Attendance')).toBeVisible();
      const classSelect = page.locator('main select').first();
      await selectByText(classSelect, SOURCE_STREAM);
      const row = page.getByRole('row', { name: new RegExp(STUDENT.admissionNo) });
      await expect(row).toBeVisible({ timeout: 60_000 });
      await row.getByRole('button', { name: 'Absent', exact: true }).click();
      await page.getByRole('button', { name: 'Save Attendance' }).click();
      await expect(page.getByText(/Saved 1 attendance record/)).toBeVisible({ timeout: 60_000 });

      const attendance = await readCollection(page, 'student_attendance');
      const mark = attendance.find(
        (candidate) =>
          String(candidate.student_id) === studentId &&
          candidate.status === 'Absent' &&
          String(candidate.date) === new Date().toISOString().slice(0, 10)
      );
      expect(mark, 'the attendance mark was not written').toBeTruthy();
    });

    await test.step('reload: the attendance mark is still there (attendance report)', async () => {
      await reloadAndWait(page);
      await go(page, '/administration/attendance?tab=reports');
      await expect(page.getByRole('heading', { name: 'Attendance Reports' })).toBeVisible();
      const reportRow = page.getByRole('row', { name: new RegExp(STUDENT.admissionNo) });
      await expect(reportRow).toBeVisible({ timeout: 60_000 });
      const cells = reportRow.getByRole('cell');
      // Columns: Student Name, Admission No, Class, Month, Total Days, Present, Absent, Late, Attendance %
      await expect(cells.nth(4)).toHaveText('1');
      await expect(cells.nth(6)).toHaveText('1');
    });

    await test.step('set up an exam paper and an exam session, then enter marks', async () => {
      await go(page, '/academics/exam-setup?tab=subject-papers');
      await expect(page.getByRole('heading', { name: 'Subject Papers Management' })).toBeVisible();
      await page.getByRole('button', { name: 'Add Subject Paper' }).click();
      const paperDialog = page.getByRole('dialog');
      await selectByText(paperDialog.locator('[name=subject_id]'), 'English');
      await paperDialog.locator('[name=name]').fill(PAPER_NAME);
      await paperDialog.getByRole('button', { name: 'Add Paper' }).click();
      await expect(paperDialog).toBeHidden({ timeout: 60_000 });
      await expect(page.getByRole('row', { name: new RegExp(PAPER_NAME) })).toBeVisible({ timeout: 60_000 });

      await go(page, '/academics/exam-setup?tab=exam-sessions');
      await expect(page.getByRole('heading', { name: 'Exam Sessions Management' })).toBeVisible();
      await page.getByRole('button', { name: 'Add Exam Session' }).click();
      const sessionDialog = page.getByRole('dialog');
      await sessionDialog.locator('[name=name]').fill(EXAM_NAME);
      await selectByText(sessionDialog.locator('[name=school_period_id]'), TERM_LABEL);
      await sessionDialog.getByRole('button', { name: 'Add Session' }).click();
      await expect(sessionDialog).toBeHidden({ timeout: 60_000 });

      const sessionRow = page.getByRole('row', { name: new RegExp(EXAM_NAME) });
      await expect(sessionRow).toBeVisible({ timeout: 60_000 });
      await sessionRow.getByRole('button', { name: 'Papers' }).click();
      const papersDialog = page.getByRole('dialog');
      await selectByText(papersDialog.locator('[name=subject_paper_id]'), PAPER_NAME);
      await papersDialog.locator('[name=marks_out_of]').fill('100');
      await papersDialog.locator('[name=weight_percentage]').fill('100');
      await papersDialog.getByRole('button', { name: 'Add Paper' }).click();
      await expect(papersDialog.getByRole('row', { name: new RegExp(PAPER_NAME) })).toBeVisible({ timeout: 60_000 });
      await papersDialog.getByRole('button', { name: 'Done' }).click();
      await expect(papersDialog).toBeHidden({ timeout: 30_000 });

      await go(page, '/academics/marks-entry');
      await expect(page.getByRole('heading', { name: 'Student Exam Results Entry' })).toBeVisible();
      await selectByText(page.locator('main select').nth(0), EXAM_NAME);
      await selectByText(page.locator('main select').nth(1), MARKS_LOGIN_STREAM);
      const markInput = page.locator('main input[type=number]').first();
      await expect(markInput).toBeVisible({ timeout: 60_000 });
      await markInput.fill(MARK);
      await page.getByRole('button', { name: 'Save All Marks' }).click();
      await expect(page.getByText(/Marks saved successfully/)).toBeVisible({ timeout: 60_000 });

      const results = await readCollection(page, 'student_exam_results');
      const result = results.find(
        (candidate) => String(candidate.student_id) === studentId && Number(candidate.total_marks) === Number(MARK)
      );
      expect(result, 'the learner mark was not written').toBeTruthy();
    });

    await test.step('reload: the exam setup and the entered mark are still there', async () => {
      await reloadAndWait(page);
      await go(page, '/academics/exam-setup?tab=exam-sessions');
      await expect(page.getByRole('row', { name: new RegExp(EXAM_NAME) })).toBeVisible({ timeout: 60_000 });

      await go(page, '/academics/marks-entry');
      await selectByText(page.locator('main select').nth(0), EXAM_NAME);
      await selectByText(page.locator('main select').nth(1), MARKS_LOGIN_STREAM);
      await expect(page.locator('main input[type=number]').first()).toHaveValue(MARK, { timeout: 60_000 });
    });

    await test.step('run promotion to the next class', async () => {
      await go(page, '/administration/students/promotion');
      await expect(page.getByRole('heading', { name: 'Promote a class' })).toBeVisible();
      await selectByText(page.locator('#promotion-source'), SOURCE_STREAM);
      await selectByText(page.locator('#promotion-target'), TARGET_STREAM);
      await page.getByRole('button', { name: 'Preview' }).click();

      const previewRow = page.getByRole('row', { name: new RegExp(STUDENT.admissionNo) });
      await expect(previewRow).toBeVisible({ timeout: 60_000 });
      await expect(previewRow).toContainText(TARGET_STREAM);

      await page.getByRole('button', { name: 'Promote 1 learners' }).click();
      const confirmDialog = page.getByRole('dialog').last();
      await confirmDialog.getByRole('button', { name: 'Promote', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('learners moved to', { timeout: 60_000 });
    });

    await test.step('reload: the learner is promoted in the directory', async () => {
      await reloadAndWait(page);
      await go(page, '/administration/students');
      const row = page.getByRole('row', { name: new RegExp(STUDENT.admissionNo) });
      await expect(row).toBeVisible({ timeout: 60_000 });
      await expect(row).toContainText('Form 2');
      await expect(row).toContainText('North');
    });

    await test.step('no uncaught page errors during the journey', async () => {
      expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });
  });
});

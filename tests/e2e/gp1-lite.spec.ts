// ABOUTME: GP-1 golden path on the canonical layer: setup -> login -> admission (learner + guardian) -> billing and
// ABOUTME: payment -> attendance -> teaching-group membership and marks, reloading and reading the UI at every step.
// ABOUTME:
// ABOUTME: The suite ticks the wizard's optional sample-data step, because a fresh canonical school has no fee items,
// ABOUTME: assessment or teaching group. It then admits its own learner and drives those rows through the canonical pages.
// ABOUTME:
// ABOUTME: SCOPED OUT (pages or writes still on the legacy layer, with their GAP markers):
// ABOUTME: - the chart of accounts and revenue account setup (GAP P1-E03: accounts land with the P3 ledger);
// ABOUTME: - exam-session setup (GAP P1-E02: the session and its paper settings still read the legacy collections).
// ABOUTME:   The canonical marks entry does not consume a session: it writes a mark against a published assessment,
// ABOUTME:   so the suite uses the demo school's published assessment and the canonical components page is not needed;
// ABOUTME: - the attendance report tab (GAP P1-E01: it reads the legacy student_attendance collection), so the saved
// ABOUTME:   mark itself has no canonical UI to read back; the suite proves the register was taken and the roster persisted;
// ABOUTME: - the promotion run (GAP P1-E01: it reads the legacy students/class_streams collections).
// ABOUTME:
// ABOUTME: KNOWN PRODUCT BUGS, NOT ROUTED AROUND SILENTLY:
// ABOUTME: 1. the student directory's Add Student used to refuse a learner with a guardian ("Nested transactions are
// ABOUTME:    not supported"); it is fixed (Repository.transaction joins an ambient transaction) and covered by the
// ABOUTME:    administration suite. This golden path still admits through the canonical admission form and asserts the
// ABOUTME:    directory reads the result, because that is the flow the spec was built around.
// ABOUTME: 2. the finance hubs used to mount canonical content without a CanonicalRepositoryProvider, so a fresh
// ABOUTME:    document load failed. They are fixed, and this suite now loads the hubs directly to keep it that way.

import playwright from '@playwright/test';

import {
  COLD_LOAD_TIMEOUT,
  LOAD_TIMEOUT,
  UI_TIMEOUT,
  chooseFromPicker,
  completeSetup,
  go,
  gridRow,
  reloadAndWait,
  signIn,
} from './goldenPathSupport';

const { test } = playwright;
const expect = playwright.expect.configure({ timeout: UI_TIMEOUT });

// A cold dev server compiles the app on the first document load; the suite's own waits carry the budget.
test.use({ navigationTimeout: COLD_LOAD_TIMEOUT, actionTimeout: UI_TIMEOUT });

const RUN = `${Date.now()}`;
const YEAR = new Date().getFullYear();
const ADMIN = {
  username: `gp1-admin-${RUN}`,
  displayName: 'GP1 Administrator',
  password: 'gp1-admin-password',
};
const SCHOOL = {
  name: `Riverside Academy ${RUN}`,
  motto: 'Knowledge is light',
  address: 'P.O. Box 42, Nairobi',
  phone: '+254700000000',
  email: `office-${RUN}@riverside.test`,
};
const STUDENT = {
  firstName: 'Amina',
  lastName: 'Wanjiku',
  guardianGiven: 'Grace',
  guardianFamily: 'Mwangi',
  guardianPhone: '+254712345678',
};
const STUDENT_NAME = `${STUDENT.firstName} ${STUDENT.lastName}`;
const GUARDIAN_NAME = `${STUDENT.guardianGiven} ${STUDENT.guardianFamily}`;
const SOURCE_STREAM = /Form 1\W+North/;
const TERM_LABEL = 'Term 1';
const FEE_TOTAL = 'KES 6,500.00';
const PAYMENT_AMOUNT = '500';
const PAYMENT_TOTAL = 'KES 500.00';
const BALANCE_AFTER_PAYMENT = 'KES 6,000.00';
const MARK = '87';

test.describe('GP-1 golden path', () => {
  test('a school is set up, billed, taught and marked on canonical storage', async ({ page }) => {
    test.setTimeout(900_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await test.step('first run: complete the setup wizard with the sample school', async () => {
      await completeSetup(page, {
        school: SCHOOL,
        classes: [
          { name: 'Form 1', streams: 'North, South' },
          { name: 'Form 2', streams: 'North, South' },
        ],
        admin: ADMIN,
        sampleData: true,
      });
      await signIn(page, ADMIN);
      await expect(page.locator('header')).toContainText(SCHOOL.name);
    });

    await test.step('reload: the school profile and the session survived', async () => {
      await reloadAndWait(page);
      await expect(page.locator('header')).toContainText(SCHOOL.name);
      await expect(page.getByTestId('login-page')).toHaveCount(0);
    });

    let admissionNumber = '';

    await test.step('admit a learner and a guardian through the canonical admission form', async () => {
      await go(page, '/admissions/admit');
      await expect(page.getByRole('heading', { name: 'Admit learner' })).toBeVisible();

      await page.locator('[name=given_name]').fill(STUDENT.firstName);
      await page.locator('[name=family_name]').fill(STUDENT.lastName);
      await page.locator('[name=guardians\\.0\\.given_name]').fill(STUDENT.guardianGiven);
      await page.locator('[name=guardians\\.0\\.family_name]').fill(STUDENT.guardianFamily);
      await page.locator('[name=guardians\\.0\\.phone]').fill(STUDENT.guardianPhone);

      // The class group is a canonical reference: choose it through the picker, never a legacy class-stream select.
      await chooseFromPicker(page, page.getByTestId('programme-picker'), 'School Programme');
      await chooseFromPicker(page, page.getByTestId('level-picker'), 'Form 1');
      await chooseFromPicker(page, page.getByTestId('class-group-picker'), 'North');
      await page.getByTestId('admit-learner').click();

      const result = page.getByTestId('admission-result');
      await expect(result).toBeVisible();
      await expect(result).toContainText(STUDENT_NAME);
      await expect(result).toContainText('1 guardian created and linked.');
      await expect(result).toContainText('Placed in North.');

      const text = await result.innerText();
      const match = /ADM\/\d{4}\/\d+/.exec(text);
      expect(match, `the admission number is missing from the result:\n${text}`).not.toBeNull();
      admissionNumber = match![0];
    });

    await test.step('the learner, guardian and placement are in the admission and administration registers', async () => {
      await go(page, '/administration/students');
      await expect(page.getByText('Student Management')).toBeVisible();
      const directoryRow = gridRow(page, admissionNumber);
      await expect(directoryRow).toBeVisible();
      await expect(directoryRow).toContainText(STUDENT_NAME);
      await expect(directoryRow).toContainText(GUARDIAN_NAME);
      await expect(directoryRow).toContainText('Form 1');
      await expect(directoryRow).toContainText('North');

      await go(page, '/admissions/register');
      const registerRow = gridRow(page, admissionNumber);
      await expect(registerRow).toBeVisible();
      await expect(registerRow).toContainText(STUDENT_NAME);
      await expect(registerRow).toContainText(GUARDIAN_NAME);
      await expect(registerRow).toContainText('North');
    });

    await test.step('reload: the admission survived', async () => {
      await reloadAndWait(page);
      await go(page, '/administration/students');
      const row = gridRow(page, admissionNumber);
      await expect(row).toBeVisible();
      await expect(row).toContainText(STUDENT_NAME);
      await expect(row).toContainText(GUARDIAN_NAME);
    });

    let invoiceNumber = '';

    await test.step('bill the term for the learner', async () => {
      // A fresh document load through the hash router (`go`), not an in-app route change: the hubs
      // mount the canonical provider themselves now, and a reload of a finance hub must work.
      await go(page, '/finance/invoicing');
      await expect(page.getByRole('heading', { name: 'Invoice Generation', exact: true })).toBeVisible({ timeout: LOAD_TIMEOUT });
      await chooseFromPicker(page, page.getByTestId('billing-period-picker'), TERM_LABEL);
      await page.getByRole('button', { name: 'Generate invoices' }).click();
      await expect(page.getByText('Billing run posted')).toBeVisible();

      const invoiceRow = page.getByRole('row', { name: new RegExp(STUDENT_NAME) });
      await expect(invoiceRow).toBeVisible();
      await expect(invoiceRow).toContainText(FEE_TOTAL);
      const invoiceText = await invoiceRow.innerText();
      const match = /INV-\d+/.exec(invoiceText);
      expect(match, `the invoice number is missing from the billing result:\n${invoiceText}`).not.toBeNull();
      invoiceNumber = match![0];
    });

    await test.step('reload: the invoice is still billed to the learner (student financial summary)', async () => {
      await go(page, '/administration/students');
      await expect(page.getByText('Student Management')).toBeVisible();
      await go(page, '/finance/payments?tab=financial-summary');
      await expect(page.getByRole('heading', { name: 'Student financial summary', exact: true })).toBeVisible({ timeout: LOAD_TIMEOUT });
      await page.getByPlaceholder('Name or admission number').fill(admissionNumber);
      const row = gridRow(page, admissionNumber);
      await expect(row).toBeVisible();
      await expect(row).toContainText(STUDENT_NAME);
      await expect(row).toContainText(FEE_TOTAL);
    });

    let receiptNumber = '';

    await test.step('record a payment against the billed learner and allocate it to the invoice', async () => {
      await page.getByRole('tab', { name: 'Student Payments' }).click();
      await expect(page.getByRole('heading', { name: 'Student payments', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Record payment' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      await chooseFromPicker(page, dialog.getByRole('combobox', { name: /^Learner/ }), new RegExp(STUDENT_NAME));
      await dialog.locator('[name=amount]').fill(PAYMENT_AMOUNT);
      await dialog.locator('[name=reference]').fill(`MPESA-${RUN}`);
      await chooseFromPicker(page, dialog.getByTestId('payment-invoice-picker'), invoiceNumber);
      await dialog.getByRole('button', { name: 'Record payment' }).click();
      await expect(dialog).toBeHidden();

      const toast = page.getByText(/Payment recorded\. Receipt RCT-\d+\./);
      await expect(toast).toBeVisible();
      const toastText = await toast.innerText();
      const match = /RCT-\d+/.exec(toastText);
      expect(match, `the receipt number is missing from the toast:\n${toastText}`).not.toBeNull();
      receiptNumber = match![0];

      const row = gridRow(page, receiptNumber);
      await expect(row).toBeVisible();
      await expect(row).toContainText(STUDENT_NAME);
      await expect(row).toContainText(PAYMENT_TOTAL);
    });

    await test.step('reload: the payment is still listed and the invoice shows it collected', async () => {
      await go(page, '/administration/students');
      await expect(page.getByText('Student Management')).toBeVisible();
      await go(page, '/finance/payments');
      const row = gridRow(page, receiptNumber);
      await expect(row).toBeVisible();
      await expect(row).toContainText(STUDENT_NAME);
      await expect(row).toContainText(PAYMENT_TOTAL);

      await page.getByRole('tab', { name: 'Student Financial Summary' }).click();
      await page.getByPlaceholder('Name or admission number').fill(admissionNumber);
      const summary = gridRow(page, admissionNumber);
      await expect(summary).toBeVisible();
      await expect(summary).toContainText(PAYMENT_TOTAL);
      await expect(summary).toContainText(BALANCE_AFTER_PAYMENT);
    });

    await test.step('take the class register and mark the learner absent', async () => {
      await go(page, '/administration/attendance');
      await expect(page.getByText('Manual Attendance')).toBeVisible();
      await chooseFromPicker(page, page.getByTestId('attendance-class-picker'), SOURCE_STREAM);
      const row = gridRow(page, admissionNumber);
      await expect(row).toBeVisible();
      await row.getByRole('button', { name: 'Absent', exact: true }).click();
      await page.getByRole('button', { name: 'Save Attendance' }).click();
      await expect(page.getByText(/Saved \d+ attendance record\(s\)\./)).toBeVisible();
    });

    await test.step('reload: the class roster still serves the register (the mark report is still legacy)', async () => {
      await reloadAndWait(page);
      await go(page, '/administration/attendance');
      await chooseFromPicker(page, page.getByTestId('attendance-class-picker'), SOURCE_STREAM);
      const row = gridRow(page, admissionNumber);
      await expect(row).toBeVisible();
      await expect(row).toContainText(STUDENT_NAME);
    });

    await test.step('join the learner to the English teaching group', async () => {
      await go(page, '/academics/allocations?tab=student-enrollment');
      await expect(page.getByRole('heading', { name: 'Student Subject Enrollment' })).toBeVisible();
      await page.getByRole('button', { name: 'Add member' }).click();

      await chooseFromPicker(page, page.getByRole('combobox', { name: /^Teaching group/ }), /^Form 1 English\b/);
      await chooseFromPicker(page, page.getByRole('combobox', { name: /^Learner enrolment/ }), new RegExp(STUDENT_NAME));
      // The demo assessment falls a month into the first term; the membership must cover that date.
      await page.getByLabel('From', { exact: true }).fill(`${YEAR}-01-06`);
      await page.getByRole('button', { name: 'Create membership' }).click();
      await expect(page.getByText('Membership added.')).toBeVisible();
    });

    await test.step('enter and save the learner mark for the published assessment', async () => {
      await go(page, '/academics/marks-entry');
      await expect(page.getByText('Marks entry')).toBeVisible();
      // The hub's default tab is the v2 grid: the scheme is derived from the period's
      // assessments, so the assessment is a column rather than a picker, and the grid autosaves.
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM_LABEL);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Teaching group' }), 'Form 1 English');

      // exact: the status element beside the cell is labelled 'Status for <assessment> for <learner>',
      // so a substring match resolves to two elements.
      const score = page.getByLabel(`End of term English for ${STUDENT_NAME}`, { exact: true });
      await expect(score).toBeVisible();
      await score.fill(MARK);
      // The grid autosaves after a debounce; the button is only enabled while an edit is pending.
      const saveNow = page.getByRole('button', { name: 'Save now' });
      if (await saveNow.isEnabled()) {
        await saveNow.click();
      }
      await expect(page.getByText(/unsaved edits?/)).toHaveCount(0);
    });

    await test.step('reload: the mark and the placement are still stored for the learner', async () => {
      await reloadAndWait(page);
      await go(page, '/academics/marks-entry');
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM_LABEL);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Teaching group' }), 'Form 1 English');
      await expect(page.getByLabel(`End of term English for ${STUDENT_NAME}`, { exact: true })).toHaveValue(MARK, { timeout: LOAD_TIMEOUT });
      const row = gridRow(page, admissionNumber);
      await expect(row).toContainText('Stored revision');

      await go(page, '/administration/students');
      const directoryRow = gridRow(page, admissionNumber);
      await expect(directoryRow).toBeVisible();
      await expect(directoryRow).toContainText('Form 1');
      await expect(directoryRow).toContainText('North');
    });

    await test.step('no uncaught page errors during the journey', async () => {
      expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });
  });
});

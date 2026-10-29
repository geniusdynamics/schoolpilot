// ABOUTME: Shared steps for the golden-path Playwright suites: first-run setup, sign-in, document loads and pickers.
// ABOUTME: Budgets are sized for a cold Vite dev server (the first document load compiles the app and opens SQLite-WASM).

import playwright from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const { expect } = playwright;

/** The first document load compiles the app and opens the canonical SQLite-WASM store; locally it can exceed two minutes. */
export const COLD_LOAD_TIMEOUT = 240_000;
/** A document load after the first one still fetches modules and reopens the store. */
export const LOAD_TIMEOUT = 120_000;
/** A UI assertion the user would wait for (a grid refresh after a write). */
export const UI_TIMEOUT = 90_000;

export interface AdminAccount {
  readonly username: string;
  readonly displayName: string;
  readonly password: string;
}

export interface SchoolSetup {
  readonly name: string;
  readonly motto: string;
  readonly address: string;
  readonly phone: string;
  readonly email: string;
}

export interface SetupClass {
  readonly name: string;
  readonly streams: string;
}

/** The academic year the wizard records: the name on the year, and its start and end dates. */
export interface SetupYear {
  readonly name: string;
  readonly start: string;
  readonly end: string;
}

export interface SetupOptions {
  readonly school: SchoolSetup;
  readonly classes: readonly SetupClass[];
  readonly admin: AdminAccount;
  /** Ticks the wizard's optional sample-data step: demo learners, staff, fees, an assessment and a register. */
  readonly sampleData: boolean;
  /**
   * The pack codes the wizard installs. The first is chosen on the curriculum step; the rest are
   * added beside it, so a school can end up with more than one programme.
   */
  readonly packs?: readonly string[];
  /**
   * The academic year to record. The wizard's own default is the calendar year the suite runs in;
   * a suite that needs a second year (a year-end rollover) names it here, and the term dates follow
   * the default Kenyan calendar for the start year.
   */
  readonly year?: SetupYear;
}

/** Wait for the authenticated shell after a document load. */
export async function waitForShell(page: Page, timeout = COLD_LOAD_TIMEOUT): Promise<void> {
  await page.locator('header').first().waitFor({ state: 'visible', timeout });
}

/**
 * Load an app route with a real document load.
 *
 * The tab engine owns the hash, so a bare hash change races it. The cache-busting search param
 * forces a fresh document and proves every write reached SQLite, not just the in-memory store.
 */
export async function go(page: Page, path: string): Promise<void> {
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/?gp=${Date.now()}#${path}`, {
    waitUntil: 'domcontentloaded',
    timeout: LOAD_TIMEOUT,
  });
  await waitForShell(page, LOAD_TIMEOUT);
}

export async function reloadAndWait(page: Page): Promise<void> {
  await page.reload({ waitUntil: 'domcontentloaded', timeout: LOAD_TIMEOUT });
  await waitForShell(page, LOAD_TIMEOUT);
}

/**
 * Change the route inside the live document, the way a sidebar click does.
 *
 * Some module hubs mount canonical page content without their own CanonicalRepositoryProvider; they
 * only work once another page has opened the app-wide canonical repository. A full document load on
 * one of those hubs therefore fails, so the suite reaches them the way a signed-in user does and
 * reloads on a page that does open the repository when it needs to prove persistence.
 */
export async function navigate(page: Page, path: string): Promise<void> {
  const hash = `#${path}`;
  await page.evaluate((next) => {
    window.location.hash = next;
  }, hash);
  await page.waitForFunction((next) => window.location.hash === next, hash, { timeout: LOAD_TIMEOUT });
}

/** Complete the first-run onboarding and the seven-step setup wizard, then stop on the login page. */
export async function completeSetup(page: Page, options: SetupOptions): Promise<void> {
  const { school, classes, admin, sampleData } = options;
  const packs = options.packs ?? ['ke-844'];

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: COLD_LOAD_TIMEOUT });
  await expect(page.getByRole('heading', { name: 'Welcome to SchoolPilot 3' })).toBeVisible({
    timeout: COLD_LOAD_TIMEOUT,
  });
  await page.getByRole('button', { name: 'Get Started' }).click();
  await expect(page.getByRole('heading', { name: 'Choose Your Setup Path' })).toBeVisible();
  await page.getByRole('button', { name: /Go Direct to Production/ }).click();
  await page.getByRole('button', { name: /^Continue$/ }).click();
  await expect(page.getByRole('heading', { name: 'Ready for Production?' })).toBeVisible();
  await page.getByRole('button', { name: /Initialize Production/ }).click();
  await expect(page.getByText('Set up your school')).toBeVisible({ timeout: COLD_LOAD_TIMEOUT });

  // Step 1 of 7 — school profile.
  await page.getByPlaceholder('e.g. Greenfields Academy').fill(school.name);
  await page.getByPlaceholder('Knowledge is light').fill(school.motto);
  await page.getByPlaceholder('P.O. Box 1234, Nairobi').fill(school.address);
  await page.getByPlaceholder('+254 700 000 000').fill(school.phone);
  await page.getByPlaceholder('info@school.ac.ke').fill(school.email);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 2 of 7')).toBeVisible({ timeout: UI_TIMEOUT });

  // Step 2 of 7 — curriculum packs. The pack is chosen from the registry, one card per pack; a
  // school may choose more than one, and each becomes its own programme.
  for (const code of packs) {
    const pack = page.getByTestId(`pack-option-${code}`);
    await expect(pack).toBeVisible({ timeout: UI_TIMEOUT });
    await pack.click();
  }
  // Every chosen pack shows a ticked checkbox before the step is left.
  for (const code of packs) {
    await expect(page.getByTestId(`pack-card-${code}`).getByRole('checkbox')).toBeChecked();
  }
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 3 of 7')).toBeVisible({ timeout: UI_TIMEOUT });

  // Step 3 of 7 — academic year and terms (validated defaults).
  if (options.year) await fillYearStep(page, options.year);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 4 of 7')).toBeVisible({ timeout: UI_TIMEOUT });

  // Step 4 of 7 — classes and streams.
  await fillClassStep(page, classes);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 5 of 7')).toBeVisible({ timeout: UI_TIMEOUT });

  // Step 5 of 7 — subjects (all presets selected).
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 6 of 7')).toBeVisible({ timeout: UI_TIMEOUT });

  // Step 6 of 7 — optional sample data. The structure is always saved; the tick adds the demo school.
  if (sampleData) {
    await page.getByText('Create sample data', { exact: true }).click();
    await expect(page.getByRole('checkbox')).toBeChecked();
  }
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 7 of 7')).toBeVisible({ timeout: UI_TIMEOUT });

  // Step 7 of 7 — first administrator.
  await page.locator('#setup-admin-username').fill(admin.username);
  await page.locator('#setup-admin-display-name').fill(admin.displayName);
  await page.locator('#setup-admin-password').fill(admin.password);
  await page.locator('#setup-admin-confirm').fill(admin.password);
  await page.getByRole('button', { name: 'Finish setup' }).click();

  // The wizard reloads the page after finishing; wait for that load, then reload once more by hand.
  await expect(page.getByTestId('login-page')).toBeVisible({ timeout: COLD_LOAD_TIMEOUT });
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: LOAD_TIMEOUT });
  await expect(page.getByTestId('login-page')).toBeVisible({ timeout: LOAD_TIMEOUT });
}

/** The wizard's year step: the name on the year, its start and end, and the term dates that follow. */
async function fillYearStep(page: Page, year: SetupYear): Promise<void> {
  await page.getByLabel('Year name', { exact: true }).fill(year.name);
  await page.getByLabel('Academic year start', { exact: true }).fill(year.start);
  await page.getByLabel('Academic year end', { exact: true }).fill(year.end);
}

/** The wizard's class step: one row per class, with its comma-separated streams. */
async function fillClassStep(page: Page, classes: readonly SetupClass[]): Promise<void> {
  const classNames = page.getByPlaceholder(/^Class \d+$/);
  const streams = page.getByPlaceholder(/Streams, comma-separated/);
  for (const [index, klass] of classes.entries()) {
    if (index > 0) await page.getByRole('button', { name: 'Add class' }).click();
    await classNames.nth(index).fill(klass.name);
    await streams.nth(index).fill(klass.streams);
  }
}

/**
 * Run the setup wizard a second time, from Settings › School Profile.
 *
 * The wizard is re-entrant: it reuses the institution it finds and writes only what is missing. A
 * re-run that names a different academic year therefore creates that year and its class groups —
 * the only way the shipped UI can give a school a second year to roll into, because the wizard's
 * class step is the only place a class group is created.
 */
export async function rerunSetupWizard(
  page: Page,
  options: { readonly packs: readonly string[]; readonly year: SetupYear; readonly classes: readonly SetupClass[] }
): Promise<void> {
  await go(page, '/settings/school-profile');
  await page.getByRole('button', { name: /Re-run setup wizard/ }).click();
  await expect(page.getByText('Set up your school')).toBeVisible({ timeout: UI_TIMEOUT });

  // Step 1 of 7 — school profile, prefilled from the stored school details.
  await expect(page.getByPlaceholder('e.g. Greenfields Academy')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 2 of 7')).toBeVisible({ timeout: UI_TIMEOUT });

  // Step 2 of 7 — the packs; a re-run starts from the default draft, so they are chosen again.
  for (const code of options.packs) {
    const pack = page.getByTestId(`pack-option-${code}`);
    await expect(pack).toBeVisible({ timeout: UI_TIMEOUT });
    await pack.click();
    await expect(page.getByTestId(`pack-card-${code}`).getByRole('checkbox')).toBeChecked();
  }
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 3 of 7')).toBeVisible({ timeout: UI_TIMEOUT });

  // Step 3 of 7 — the new academic year.
  await fillYearStep(page, options.year);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 4 of 7')).toBeVisible({ timeout: UI_TIMEOUT });

  // Step 4 of 7 — the classes; the class groups of the new year are created from these rows.
  await fillClassStep(page, options.classes);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 5 of 7')).toBeVisible({ timeout: UI_TIMEOUT });

  // Steps 5 to 7 — subjects, sample data and the administrator (already created, so it is skipped).
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 6 of 7')).toBeVisible({ timeout: UI_TIMEOUT });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 7 of 7')).toBeVisible({ timeout: UI_TIMEOUT });
  await page.getByRole('button', { name: 'Finish setup' }).click();

  // The wizard returns to the school profile page when it finishes.
  await expect(page.getByRole('button', { name: /Re-run setup wizard/ })).toBeVisible({
    timeout: COLD_LOAD_TIMEOUT,
  });
}

export async function signIn(page: Page, admin: AdminAccount): Promise<void> {
  await page.locator('#username').fill(admin.username);
  await page.locator('#password').fill(admin.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(/#\/dashboard/, { timeout: LOAD_TIMEOUT });
  await waitForShell(page);
}

/** Open an EntityPicker trigger and choose the one option whose accessible name matches. */
export async function chooseFromPicker(
  page: Page,
  trigger: Locator,
  option: string | RegExp
): Promise<void> {
  await expect(trigger).toBeVisible({ timeout: UI_TIMEOUT });
  await trigger.click();
  const listbox = page.getByRole('listbox').last();
  await expect(listbox).toBeVisible({ timeout: UI_TIMEOUT });
  // A long option list scrolls inside the popover and can be clipped by the modal; clicking an
  // option that far down is flaky. The combobox owns the active option, so drive it from the
  // keyboard — the same path a keyboard user takes — and let the trigger select it.
  await expect(listbox.getByRole('option').first()).toBeVisible({ timeout: UI_TIMEOUT });
  const choice =
    typeof option === 'string'
      ? listbox.getByRole('option', { name: option, exact: true })
      : listbox.getByRole('option', { name: option });
  // Let the lookup settle: an opened picker can show stale options while its query refreshes.
  await expect(choice.first()).toBeVisible({ timeout: UI_TIMEOUT });
  // The option can be scrolled out of the popover or mid-animation, and the lookup can refresh
  // while the actionability check waits. Dispatch the click on the attached option and verify the
  // trigger took the value; the picker's own unit tests cover the pointer and keyboard paths.
  const selectedLabel = (await choice.first().innerText()).trim();
  await choice.first().evaluate((element) => (element as HTMLElement).click());
  await expect(trigger).toContainText(selectedLabel, { timeout: UI_TIMEOUT });
}

/** A DataGrid row identified by one unique value it must contain (an admission number, receipt, name). */
export function gridRow(page: Page, value: string | RegExp): Locator {
  return page.getByRole('row', { name: value instanceof RegExp ? value : new RegExp(value) });
}

/** Open an EntityPicker trigger and read the options it offers, without choosing one. */
export async function pickerOptions(page: Page, trigger: Locator): Promise<string[]> {
  await expect(trigger).toBeVisible({ timeout: UI_TIMEOUT });
  await trigger.click();
  const listbox = page.getByRole('listbox').last();
  await expect(listbox).toBeVisible({ timeout: UI_TIMEOUT });
  const texts = await listbox.getByRole('option').allInnerTexts();
  await page.keyboard.press('Escape');
  return texts.map((text) => text.trim());
}

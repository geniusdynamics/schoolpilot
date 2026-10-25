// ABOUTME: In a real browser: the school name in the header takes the user home and closes every tab, the pinned
// ABOUTME: ones too; a module's dashboard is its root page, named for the module in the address and on its tab;
// ABOUTME: it opens as a compact banner; and the Settings dashboard is a page of its own, not a tab of a hub.
// ABOUTME:
// ABOUTME: Run on demand (it is not in CI's golden-path list):
// ABOUTME:   pnpm exec playwright test tests/e2e/module-dashboards-brand.spec.ts

import playwright from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  COLD_LOAD_TIMEOUT,
  UI_TIMEOUT,
  completeSetup,
  go,
  navigate,
  signIn,
  type AdminAccount,
} from './goldenPathSupport';

const { test } = playwright;
const expect = playwright.expect.configure({ timeout: UI_TIMEOUT });

test.use({ navigationTimeout: COLD_LOAD_TIMEOUT, actionTimeout: UI_TIMEOUT });

const RUN = `${Date.now()}`;
const ADMIN: AdminAccount = {
  username: `nav-admin-${RUN}`,
  displayName: 'Nav Administrator',
  password: 'nav-admin-password',
};
const SCHOOL = {
  name: `Hillside Academy ${RUN}`,
  motto: 'Light',
  address: 'P.O. Box 7, Nairobi',
  phone: '+254700000001',
  email: `office-${RUN}@hillside.test`,
};

/** The route the router is on: the hash, since the app uses a hash router. */
const hashOf = (page: Page): string => new URL(page.url()).hash.split('?')[0] ?? '';

/** The tab list the engine keeps in the address bar. */
const tabUrls = (page: Page): string[] => new URL(page.url()).searchParams.getAll('tab');

/** The workspace tabs, not the sub-tabs of a hub page. */
const workspaceTabs = (page: Page) => page.getByTestId('tab-bar').getByRole('tab');

/** One workspace tab by its title: its accessible name is "<title> tab", with "(pinned)" when pinned. */
const workspaceTab = (page: Page, title: string) =>
  page.getByTestId('tab-bar').getByRole('tab', { name: new RegExp(`^${title} tab`) });

/** The module buttons of the primary sidebar, apart from the header's own "Settings" button. */
const sidebarModule = (page: Page, name: string) =>
  page.locator('aside').getByRole('button', { name, exact: true }).first();

/**
 * The points of the brand button that something else is painted over. A click lands on whatever is on
 * top at its point, so a brand that a sidebar covers cannot be clicked even though it is "visible".
 */
const coveredBrandPoints = (page: Page): Promise<string[] | null> =>
  page.evaluate(() => {
    const brand = document.querySelector('header button[aria-label="Go to the main dashboard"]');
    if (!brand) return null;
    const box = brand.getBoundingClientRect();
    const covered: string[] = [];
    for (const across of [0.05, 0.25, 0.5, 0.75, 0.95]) {
      for (const down of [0.25, 0.75]) {
        const x = box.left + box.width * across;
        const y = box.top + box.height * down;
        const top = document.elementFromPoint(x, y);
        if (!top || !brand.contains(top)) {
          const what = top ? `${top.tagName.toLowerCase()}[${top.getAttribute('title') ?? top.id ?? ''}]` : 'nothing';
          covered.push(`(${Math.round(x)}, ${Math.round(y)}) is under ${what}`);
        }
      }
    }
    return covered;
  });

test.describe('the header brand and the module dashboards', () => {
  test('a school name that goes home, module dashboards named for their module, and a Settings dashboard of its own', async ({
    page,
  }, testInfo) => {
    test.setTimeout(900_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const shot = (name: string) => page.screenshot({ path: testInfo.outputPath(`${name}.png`) });

    await test.step('set the school up and sign in', async () => {
      await completeSetup(page, {
        school: SCHOOL,
        classes: [{ name: 'Form 1', streams: 'North' }],
        admin: ADMIN,
        sampleData: false,
      });
      await signIn(page, ADMIN);
      await expect(page.locator('header')).toContainText(SCHOOL.name);
      await expect(workspaceTab(page, 'Dashboard')).toBeVisible();
    });

    await test.step('the main dashboard is the pinned first tab', async () => {
      await expect.poll(() => hashOf(page)).toBe('#/dashboard');
      await expect(workspaceTab(page, 'Dashboard')).toHaveAttribute('aria-label', /pinned/);
      await shot('1-main-dashboard');
    });

    await test.step('Finance opens at /finance, and its tab and window carry its name', async () => {
      await sidebarModule(page, 'Finance').click();
      await expect.poll(() => hashOf(page)).toBe('#/finance');
      await expect(workspaceTab(page, 'Finance')).toBeVisible();
      // Not "Dashboard": the main dashboard's tab is still there beside it.
      await expect(workspaceTab(page, 'Dashboard')).toBeVisible();
      await expect.poll(() => page.title()).toBe('Finance - SchoolPilot');
      expect(tabUrls(page)).toContain('/finance');
      expect(tabUrls(page).some((url) => url.endsWith('/dashboard') && url !== '/dashboard')).toBe(false);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await shot('2-finance-dashboard');
    });

    await test.step('with a module open, the school name is not under its sidebar: all of it can be clicked', async () => {
      // The module sidebar used to start at the top of the screen and paint over the header's leading
      // edge, so the brand sat half under it, with the Minimize and Close buttons on top of the name.
      expect(await coveredBrandPoints(page)).toEqual([]);

      // Minimized, the sidebar is narrower; the brand is still clear of it.
      await page.getByTitle('Minimize menu').click();
      await expect(page.getByTitle('Expand menu')).toBeVisible();
      expect(await coveredBrandPoints(page)).toEqual([]);
      await shot('2b-finance-sidebar-minimized');

      await page.getByTitle('Expand menu').click();
      await expect(page.getByTitle('Minimize menu')).toBeVisible();
      expect(await coveredBrandPoints(page)).toEqual([]);
    });

    await test.step('a module dashboard opens as a compact banner like the main one', async () => {
      const heading = page.getByRole('heading', { level: 1 }).first();
      const fontPx = await heading.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      // text-xl is 20px; the roomy hero it replaced was 30px.
      expect(fontPx).toBeLessThanOrEqual(20);

      const banner = await heading.locator('xpath=ancestor::section[1]').boundingBox();
      expect(banner).not.toBeNull();
      expect(banner!.height).toBeLessThan(90);
    });

    await test.step('Academics and Reports are named for themselves too', async () => {
      for (const module of ['Academics', 'Reports']) {
        await sidebarModule(page, module).click();
        await expect.poll(() => hashOf(page)).toBe(`#/${module.toLowerCase()}`);
        await expect(workspaceTab(page, module)).toBeVisible();
        await expect.poll(() => page.title()).toBe(`${module} - SchoolPilot`);
      }
      await shot('3-reports-dashboard');
    });

    await test.step('the old /module/dashboard address still works, and lands on the module root', async () => {
      await go(page, '/finance/dashboard');
      await expect.poll(() => hashOf(page)).toBe('#/finance');
      await expect(workspaceTab(page, 'Finance')).toBeVisible();
    });

    await test.step('Settings has a dashboard of its own at /settings, not a tab of the School hub', async () => {
      await sidebarModule(page, 'Settings').click();
      await expect.poll(() => hashOf(page)).toBe('#/settings');
      await expect(workspaceTab(page, 'Settings')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await shot('4-settings-dashboard');

      // The School Operations hub no longer offers a Dashboard tab.
      await navigate(page, '/settings/school');
      await expect(page.getByRole('tab', { name: 'School Profile' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Dashboard', exact: true })).toHaveCount(0);
      await shot('5-school-operations-hub');

      // An old link to that tab lands on the module root.
      await go(page, '/settings/school?tab=dashboard');
      await expect.poll(() => hashOf(page)).toBe('#/settings');
    });

    await test.step('the school name closes every tab - a pinned one too - and lands on the main dashboard', async () => {
      await navigate(page, '/finance/payments');
      await expect(workspaceTab(page, 'Payments')).toBeVisible();
      await navigate(page, '/administration/students');
      await expect(workspaceTab(page, 'Students')).toBeVisible();

      // Pin the Students tab: the tab menu's "Close All Tabs" would keep it.
      await workspaceTab(page, 'Students').click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Pin Tab' }).click();
      await expect(workspaceTab(page, 'Students')).toHaveAttribute('aria-label', /pinned/);
      expect(await workspaceTabs(page).count()).toBeGreaterThanOrEqual(3);

      await page.getByRole('button', { name: /main dashboard/i }).click();

      await expect.poll(() => hashOf(page)).toBe('#/dashboard');
      await expect(workspaceTabs(page)).toHaveCount(1);
      await expect(workspaceTab(page, 'Dashboard')).toHaveAttribute('aria-label', /pinned/);
      await expect(workspaceTab(page, 'Students')).toHaveCount(0);
      // The address bar carries the same single tab, so a reload does not bring the others back.
      expect(tabUrls(page)).toEqual(['/dashboard']);
      await shot('6-after-the-school-name-click');
    });

    await test.step('clicking it again while already home changes nothing', async () => {
      const historyBefore = await page.evaluate(() => window.history.length);
      await page.getByRole('button', { name: /main dashboard/i }).click();
      expect(await page.evaluate(() => window.history.length)).toBe(historyBefore);
      await expect(workspaceTabs(page)).toHaveCount(1);
    });

    await test.step('on a phone, a module dashboard fits its screen', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await navigate(page, '/finance');
      await expect(workspaceTab(page, 'Finance')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
      await shot('7-finance-dashboard-phone');
    });

    expect(pageErrors).toEqual([]);
  });
});

// ABOUTME: In a real browser: Settings is an overview and three hubs, each hub has one row of tabs and every tab opens with its
// ABOUTME: own content, the administrator is let into all of it, every address the old Settings had still lands, and nothing warns.
// ABOUTME:
// ABOUTME: Run on demand (it is not in CI's golden-path list):
// ABOUTME:   pnpm exec playwright test tests/e2e/settings-hubs.spec.ts

import playwright from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  COLD_LOAD_TIMEOUT,
  UI_TIMEOUT,
  completeSetup,
  go,
  navigate,
  reloadAndWait,
  signIn,
  type AdminAccount,
} from './goldenPathSupport';

const { test } = playwright;
const expect = playwright.expect.configure({ timeout: UI_TIMEOUT });

test.use({ navigationTimeout: COLD_LOAD_TIMEOUT, actionTimeout: UI_TIMEOUT });

const RUN = `${Date.now()}`;
const ADMIN: AdminAccount = {
  username: `settings-admin-${RUN}`,
  displayName: 'Settings Administrator',
  password: 'settings-admin-password',
};
const SCHOOL = {
  name: `Riverside Academy ${RUN}`,
  motto: 'Learn',
  address: 'P.O. Box 9, Kisumu',
  phone: '+254700000002',
  email: `office-${RUN}@riverside.test`,
};

/** Where the app is, as the hash router holds it: the route and its query, without the `#`. */
const routeOf = (page: Page): string => new URL(page.url()).hash.replace(/^#/, '');

/** Goes to a route inside the app, the way a link does: no reload, so a redirect can be watched. */
const visit = (page: Page, path: string) =>
  page.evaluate((next) => {
    window.location.hash = next;
  }, `#${path}`);

const sidebarModule = (page: Page, name: string) => page.locator('aside').getByRole('button', { name, exact: true }).first();
const sidebarItem = (page: Page, name: string) => page.locator('aside').getByText(name, { exact: true }).first();

/** A tab of the hub that is open. The workspace tabs are named "<title> tab", so an exact name finds only the hub's own. */
const hubTab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });
const workspaceTab = (page: Page, title: string) => page.getByTestId('tab-bar').getByRole('tab', { name: new RegExp(`^${title} tab`) });

/** How many rows of tabs the page has besides the workspace tab bar. */
const hubTablists = async (page: Page): Promise<number> =>
  (await page.locator('[role="tablist"]').count()) - (await page.getByTestId('tab-bar').locator('[role="tablist"]').count());

/** The tabs of the hub that is open, waited for: these and no others, in one row, besides the workspace tabs. */
const expectHubTabs = async (page: Page, labels: readonly string[]) => {
  for (const label of labels) await expect(hubTab(page, label)).toBeVisible();
  await expect
    .poll(async () => (await page.getByRole('tab').count()) - (await page.getByTestId('tab-bar').getByRole('tab').count()))
    .toBe(labels.length);
  await expect.poll(() => hubTablists(page)).toBe(1);
};

const isReactWarning = (text: string): boolean =>
  /Warning:|same key|is being spread into JSX|cannot be a descendant|validateDOMNesting|Maximum update depth/.test(text);

/** What every old address of Settings, and every old tab, must land on. */
const OLD_ADDRESSES: ReadonlyArray<readonly [string, string]> = [
  ['/settings/dashboard', '/settings'],
  ['/settings/configuration', '/settings'],
  ['/settings/unified', '/settings'],
  ['/settings/general', '/settings'],
  ['/settings/features', '/settings/modules?tab=features'],
  ['/settings/data-layer', '/settings/system'],
  ['/settings/dependency-report', '/settings/modules'],
  ['/settings/plugins', '/settings/modules?tab=plugins'],
  ['/settings/database-backup', '/settings/system?tab=backup'],
  ['/settings/data-integrity', '/settings/system?tab=integrity'],
  ['/settings/data-management', '/settings/system'],
  ['/settings/school-profile', '/settings/school'],
  ['/settings/users', '/settings/school?tab=users'],
  ['/settings/workflows', '/settings/school?tab=workflows'],
  ['/settings/audit-log', '/settings/school?tab=audit'],
  ['/settings/tabs', '/settings/school'],
  ['/settings/system?tab=modules', '/settings/modules'],
  ['/settings/system?tab=dependencies', '/settings/modules'],
  ['/settings/system?tab=plugins', '/settings/modules?tab=plugins'],
  ['/settings/school?tab=sync-conflicts', '/settings/system?tab=sync'],
  ['/settings/school?tab=dashboard', '/settings'],
  ['/settings/school?tab=tabs', '/settings/school'],
];

test.describe('Settings', () => {
  test('is an overview and three hubs, each with one row of tabs, and every old address still lands', async ({ page }, testInfo) => {
    test.setTimeout(1_200_000);
    const pageErrors: string[] = [];
    const reactWarnings: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && isReactWarning(message.text())) reactWarnings.push(message.text().slice(0, 300));
    });
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
    });

    await test.step('the sidebar offers the overview and three hubs, and none of the old entries', async () => {
      await sidebarModule(page, 'Settings').click();
      await expect.poll(() => routeOf(page)).toBe('/settings');

      for (const entry of ['Overview', 'School & People', 'Modules & Features', 'Data & System']) {
        await expect(sidebarItem(page, entry)).toBeVisible();
      }
      for (const gone of ['Configuration', 'System Management', 'School Operations', 'Data Integrity', 'Settings Dashboard']) {
        await expect(page.locator('aside').getByText(gone, { exact: true })).toHaveCount(0);
      }
    });

    await test.step("the header's Settings popup offers the same four entries, not the old addresses", async () => {
      await page.locator('header').getByRole('button', { name: 'Settings', exact: true }).click();
      const popup = page.locator('div.fixed.inset-0').filter({ has: page.getByTitle('Close settings') });
      await expect(popup.getByRole('listitem')).toHaveText(['Overview', 'School & People', 'Modules & Features', 'Data & System']);
      await page.getByTitle('Close settings').click();
      await expect(popup).toHaveCount(0);
    });

    await test.step('the overview says what is true and links only to hubs and their tabs', async () => {
      await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
      for (const tile of ['Users', 'Modules running', 'School profile', 'Browser storage']) {
        await expect(page.getByText(tile, { exact: true }).first()).toBeVisible();
      }
      // The first administrator, from the setup wizard, can sign in: one user, and it counts.
      await expect(page.getByText('1 account', { exact: true })).toBeVisible();
      // Every module that ships is running and none is reported as having a problem.
      await expect(page.getByText(/^\d+ of \d+$/).first()).toBeVisible();
      await expect(page.getByText('No problems', { exact: true })).toBeVisible();
      // The wizard wrote a school profile, so it reads as set (and the page did not need it to be loaded from app data).
      await expect(page.getByText('Set', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('School profile is not set')).toHaveCount(0);
      await expect(page.getByText(/all systems active|operational|minutes ago/i)).toHaveCount(0);

      const hrefs = await page.getByRole('main').getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
      for (const href of hrefs.filter((value) => value.includes('/settings'))) {
        expect(href, `a link on the overview to ${href}`).toMatch(/^#?\/settings(\/(school|modules|system))?(\?tab=[a-z-]+)?$/);
      }
      await shot('01-overview');
    });

    await test.step('School & People: four tabs, one row, the administrator let in', async () => {
      await sidebarItem(page, 'School & People').click();
      await expect.poll(() => routeOf(page)).toBe('/settings/school');
      await expect(workspaceTab(page, 'School & People')).toBeVisible();

      await expectHubTabs(page, ['School Profile', 'Users & Roles', 'Workflows', 'Audit Log']);
      await expect(page.getByText('Access Denied')).toHaveCount(0);
      await shot('02-school-profile');

      await hubTab(page, 'Users & Roles').click();
      await expect.poll(() => routeOf(page)).toBe('/settings/school?tab=users');
      const adminRow = page.getByRole('row').filter({ hasText: ADMIN.username });
      await expect(adminRow).toContainText('Active');
      await expect(adminRow).toContainText('Super admin');
      await shot('03-school-users');

      await hubTab(page, 'Workflows').click();
      await expect.poll(() => routeOf(page)).toBe('/settings/school?tab=workflows');
      await expect(page.getByText('Access Denied')).toHaveCount(0);
      await shot('04-school-workflows');

      await hubTab(page, 'Audit Log').click();
      await expect.poll(() => routeOf(page)).toBe('/settings/school?tab=audit');
      await expect(page.getByText('Timestamp').first()).toBeVisible();
      await shot('05-school-audit');
    });

    await test.step('Modules & Features: three tabs, the modules as they are, switches that persist', async () => {
      await sidebarItem(page, 'Modules & Features').click();
      await expect.poll(() => routeOf(page)).toBe('/settings/modules');
      await expect(workspaceTab(page, 'Modules & Features')).toBeVisible();
      await expectHubTabs(page, ['Modules', 'Features', 'Plugins']);
      await expect(page.getByText('Access Denied')).toHaveCount(0);

      const total = Number(await page.getByTestId('count-modules').innerText());
      expect(total).toBeGreaterThanOrEqual(10);
      await expect(page.getByText('Every module has what it needs.')).toBeVisible();
      await shot('06-modules');

      await hubTab(page, 'Features').click();
      await expect.poll(() => routeOf(page)).toBe('/settings/modules?tab=features');
      await expect(page.getByRole('checkbox')).toHaveCount(4);
      const health = page.getByRole('checkbox', { name: 'Module health in the header' });
      const before = await health.isChecked();
      await health.click();
      await expect(health).toBeChecked({ checked: !before });
      await shot('07-features');

      // The switch is saved, not just drawn: it is still there after a full reload.
      await reloadAndWait(page);
      await expect(page.getByRole('checkbox', { name: 'Module health in the header' })).toBeChecked({ checked: !before });
      await page.getByRole('checkbox', { name: 'Module health in the header' }).click();
      await expect(page.getByRole('checkbox', { name: 'Module health in the header' })).toBeChecked({ checked: before });

      await hubTab(page, 'Plugins').click();
      await expect.poll(() => routeOf(page)).toBe('/settings/modules?tab=plugins');
      await expect(page.getByText('Total Plugins')).toBeVisible();
      await expect(page.getByText(/marketplace/i)).toHaveCount(0);
      await shot('08-plugins');
    });

    await test.step('Data & System: five tabs, one row, each one working', async () => {
      await sidebarItem(page, 'Data & System').click();
      await expect.poll(() => routeOf(page)).toBe('/settings/system');
      await expect(workspaceTab(page, 'Data & System')).toBeVisible();
      await expectHubTabs(page, ['Data Layer', 'Sync', 'Backup & Restore', 'Data Integrity', 'System Health']);

      // The data layer page no longer carries a strip of its own.
      await expect(page.getByText('Unified Data Management')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sync Management' })).toHaveCount(0);
      await shot('09-data-layer');

      await hubTab(page, 'Sync').click();
      await expect.poll(() => routeOf(page)).toBe('/settings/system?tab=sync');
      await expect(page.getByText('Sync settings')).toBeVisible();
      await expect(page.getByText(/not open yet/i)).toHaveCount(0);
      await shot('10-sync');

      await hubTab(page, 'Backup & Restore').click();
      await expect.poll(() => routeOf(page)).toBe('/settings/system?tab=backup');
      await expect(page.getByText('Backup History')).toBeVisible();
      await shot('11-backup');

      await hubTab(page, 'Data Integrity').click();
      await expect.poll(() => routeOf(page)).toBe('/settings/system?tab=integrity');
      await expect(page.getByRole('button', { name: /check again/i })).toBeVisible();
      await expect(page.getByText('The data layer is not connected')).toHaveCount(0);
      await shot('12-integrity');

      await hubTab(page, 'System Health').click();
      await expect.poll(() => routeOf(page)).toBe('/settings/system?tab=health');
      await expect(page.getByTestId('health-storage')).toBeVisible();
      await shot('13-health');
    });

    await test.step('every old address still lands on a page and a tab that exist', async () => {
      for (const [from, to] of OLD_ADDRESSES) {
        await visit(page, from);
        await expect.poll(() => routeOf(page), { message: `${from} should land on ${to}` }).toBe(to);
      }
    });

    await test.step('the moved tabs of a hub keep redirecting when they are visited again and again', async () => {
      // A hub redirects a moved tab from an effect that runs after it renders. The route table used to give every page
      // a new component each time it rendered, so the page was mounted again before that effect ran, and the second moved
      // tab visited in a row stalled on a blank page. Once through the list did not always show it; several rounds do.
      const movedTabs = OLD_ADDRESSES.filter(([from]) => from.includes('?tab='));
      for (let round = 1; round <= 3; round++) {
        for (const [from, to] of movedTabs) {
          await visit(page, from);
          await expect.poll(() => routeOf(page), { message: `round ${round}: ${from} should land on ${to}` }).toBe(to);
        }
      }
    });

    await test.step('a link to another tab of the hub you are on switches the tab in place', async () => {
      await navigate(page, '/settings/school');
      await expect(page.getByRole('tab', { name: 'School Profile', exact: true })).toHaveAttribute('aria-selected', 'true');
      await visit(page, '/settings/school?tab=users');
      await expect(page.getByRole('tab', { name: 'Users & Roles', exact: true })).toHaveAttribute('aria-selected', 'true');
    });

    await test.step('a full load of an old address, on a fresh page, lands too', async () => {
      await go(page, '/settings/users');
      await expect.poll(() => routeOf(page)).toBe('/settings/school?tab=users');
      await expect(page.getByText('Access Denied')).toHaveCount(0);
      await expect(page.getByRole('row').filter({ hasText: ADMIN.username })).toContainText('Active');
    });

    await test.step('the workspace tabs are the overview and the three hubs, named for what they hold, and none is an old address', async () => {
      const tabs = await page.evaluate(
        () => JSON.parse(sessionStorage.getItem('sp_tabs_v2') ?? '{"tabs":[]}').tabs as Array<{ url: string; title: string }>
      );
      await testInfo.attach('workspace-tabs', { body: JSON.stringify(tabs, null, 2), contentType: 'application/json' });

      // 22 old addresses, a reload and a full load later, the bar still holds only the pinned dashboard, the
      // overview and the hubs: an old address no longer leaves a tab of its own, and a reload keeps the names.
      expect(tabs.map((tab) => tab.url).sort()).toEqual(['/dashboard', '/settings', '/settings/modules', '/settings/school', '/settings/system']);
      expect(tabs.map((tab) => tab.title).sort()).toEqual(['Dashboard', 'Data & System', 'Modules & Features', 'School & People', 'Settings']);

      for (const name of ['Settings', 'School & People', 'Modules & Features', 'Data & System']) {
        await expect(workspaceTab(page, name)).toHaveCount(1);
      }
      for (const wrong of ['School', 'Modules', 'System', 'Configuration', 'Unified', 'General', 'Features', 'Data Layer']) {
        await expect(workspaceTab(page, wrong)).toHaveCount(0);
      }
    });

    await test.step('on a phone, a hub with five tabs does not push the page sideways', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await visit(page, '/settings/system');
      await expect.poll(() => routeOf(page)).toBe('/settings/system');
      await expect(hubTab(page, 'System Health')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await shot('14-system-phone');
    });

    expect(pageErrors).toEqual([]);
    expect(reactWarnings).toEqual([]);
  });
});

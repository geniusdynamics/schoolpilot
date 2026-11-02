// ABOUTME: Browser backup and restore across devices: a demo school downloads an encrypted backup from
// ABOUTME: Settings › Backup, a second browser profile restores it, and the school and its learners appear.
// ABOUTME: The second profile is a separate Playwright context (own OPFS), opened by openSecondDevice.

import playwright from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  COLD_LOAD_TIMEOUT,
  completeSetup,
  go,
  gridRow,
  LOAD_TIMEOUT,
  openSecondDevice,
  signIn,
  UI_TIMEOUT,
} from './goldenPathSupport';

const { test, expect } = playwright;

const SOURCE_SCHOOL = {
  name: 'Mwangaza Backup Academy',
  motto: 'Light and learning',
  address: 'P.O. Box 77, Nakuru',
  phone: '+254 700 111 222',
  email: 'office@mwangaza-backup.ac.ke',
};
const SOURCE_ADMIN = { username: 'grace.backup', displayName: 'Grace Wekesa', password: 'mwangaza-backup-2026' };

const TARGET_SCHOOL = {
  name: 'Placeholder Device School',
  motto: 'Temporary',
  address: 'P.O. Box 1, Nairobi',
  phone: '+254 700 000 001',
  email: 'office@placeholder.ac.ke',
};
const TARGET_ADMIN = { username: 'temp.admin', displayName: 'Temp Admin', password: 'placeholder-2026' };

const PASSPHRASE = 'kept-apart-from-the-file-2026';
const CLASSES = [{ name: 'Form 1', streams: 'North, South' }];

test.describe('browser backup and restore', () => {
  test('a backup downloaded in one browser restores the school in another', async ({ page, browser }, testInfo) => {
    test.setTimeout(900_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(`first device: ${error.message}`));
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-browser-backup-'));
    let second: Awaited<ReturnType<typeof openSecondDevice>> | null = null;

    try {
      let admissionNumber = '';
      let backupFile = '';

      await test.step('first device: set up the demo school', async () => {
        await completeSetup(page, { school: SOURCE_SCHOOL, classes: CLASSES, admin: SOURCE_ADMIN, sampleData: true });
        await signIn(page, SOURCE_ADMIN);
        await expect(page.locator('header')).toContainText(SOURCE_SCHOOL.name);

        await go(page, '/administration/students');
        const firstLearner = page.getByRole('row', { name: /ADM\/\d{4}\/\d+/ }).first();
        await expect(firstLearner).toBeVisible({ timeout: UI_TIMEOUT });
        admissionNumber = /ADM\/\d{4}\/\d+/.exec(await firstLearner.innerText())![0];
      });

      await test.step('first device: download an encrypted backup', async () => {
        await go(page, '/settings/system?tab=backup');
        await expect(page.getByText(/the only copy of the school's data/)).toBeVisible({ timeout: UI_TIMEOUT });
        // A production install encrypts by default.
        await expect(page.getByText('A forgotten passphrase cannot be recovered')).toBeVisible();
        await page.getByTestId('backup-passphrase').fill(PASSPHRASE);
        await page.getByTestId('backup-passphrase-confirm').fill(PASSPHRASE);

        const downloading = page.waitForEvent('download', { timeout: LOAD_TIMEOUT });
        await page.getByRole('button', { name: 'Download backup' }).click();
        const download = await downloading;
        expect(download.suggestedFilename()).toMatch(/^schoolpilot-backup-mwangaza-backup-academy-\d{8}-\d{4}\.spbackup$/);
        backupFile = path.join(directory, download.suggestedFilename());
        await download.saveAs(backupFile);

        const bytes = await fs.promises.readFile(backupFile);
        expect(bytes.subarray(0, 8).toString('latin1')).toBe('SPWBENC1');
        // Encrypted: neither the school's name nor a SQLite header is readable in the file.
        expect(bytes.includes(Buffer.from(SOURCE_SCHOOL.name))).toBe(false);
        expect(bytes.includes(Buffer.from('SQLite format 3'))).toBe(false);
        await expect(page.getByText(/downloaded/).first()).toBeVisible();
      });

      second = await openSecondDevice(browser, testInfo);
      const other = second.page;
      other.on('pageerror', (error) => pageErrors.push(`second device: ${error.message}`));

      await test.step('second device: a different school is set up there', async () => {
        await completeSetup(other, { school: TARGET_SCHOOL, classes: CLASSES, admin: TARGET_ADMIN, sampleData: false });
        await signIn(other, TARGET_ADMIN);
        await expect(other.locator('header')).toContainText(TARGET_SCHOOL.name);
      });

      await test.step('second device: a file that is not a backup is refused', async () => {
        await go(other, '/settings/system?tab=backup');
        const notABackup = path.join(directory, 'not-a-backup.json');
        await fs.promises.writeFile(notABackup, '{"collections":{}}');
        await other.getByTestId('restore-file').setInputFiles(notABackup);
        await other.getByRole('button', { name: 'Check backup' }).click();
        await expect(other.getByTestId('restore-error')).toContainText('not a SchoolPilot backup');
      });

      await test.step('second device: restore the backup', async () => {
        await other.getByTestId('restore-file').setInputFiles(backupFile);
        await other.getByTestId('restore-passphrase').fill(PASSPHRASE);
        await other.getByRole('button', { name: 'Check backup' }).click();
        await expect(other.getByTestId('backup-summary')).toContainText(SOURCE_SCHOOL.name, { timeout: UI_TIMEOUT });
        await expect(other.getByTestId('backup-summary')).toContainText('AES-256-GCM');

        await other.getByRole('button', { name: 'Restore this backup' }).click();
        await other.getByText('I understand that the current data in this browser will be replaced').click();
        await other.getByRole('button', { name: 'Replace data and restore' }).click();
        await expect(other.getByText('Backup restored')).toBeVisible({ timeout: LOAD_TIMEOUT });

        // The app reloads itself and signs out: the signed-in account belonged to the replaced data.
        await expect(other.getByTestId('login-page')).toBeVisible({ timeout: COLD_LOAD_TIMEOUT });
      });

      await test.step('second device: the restored school and its learners are there', async () => {
        await signIn(other, SOURCE_ADMIN);
        await expect(other.locator('header')).toContainText(SOURCE_SCHOOL.name);
        await expect(other.locator('header')).not.toContainText(TARGET_SCHOOL.name);

        await go(other, '/administration/students');
        await expect(gridRow(other, admissionNumber)).toBeVisible({ timeout: UI_TIMEOUT });
      });

      await test.step('second device: the replaced data is kept as a safety copy', async () => {
        await go(other, '/settings/system?tab=backup');
        await expect(other.getByText(/^backup-before-restore-\d{8}-\d{6}\.zip/)).toBeVisible({ timeout: UI_TIMEOUT });
      });

      expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    } finally {
      await second?.context.close();
      await fs.promises.rm(directory, { recursive: true, force: true });
    }
  });
});

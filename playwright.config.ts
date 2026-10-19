// ABOUTME: Playwright configuration for the PRD end-to-end suites (GP-1-lite golden path).
// ABOUTME: Starts a fixed-port Vite dev server so the OPFS/SQLite-WASM store is a real persistent browser database.

// Default import: the project is ESM ("type": "module") and Node evaluates this config as ESM, where
// @playwright/test resolves to its CommonJS entry and offers no statically analysable named exports.
import playwright from '@playwright/test';

const { defineConfig, devices } = playwright;

/** Fixed port so an unrelated dev server on the default 5200 port never collides with the suite. */
const PORT = Number(process.env.GP1_PORT || 5237);
const BASE_URL = process.env.GP1_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  // One long user journey per test: the database is the browser's OPFS store, so tests must not race.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 900_000,
  expect: { timeout: 30_000 },
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

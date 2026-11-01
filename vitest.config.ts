/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    // Sub-agent worktrees live under .claude/worktrees; never collect their copies of the suite.
    exclude: [...configDefaults.exclude, '.claude/**', 'tests/e2e/**', 'docs/**'],
    // Generous per-test budget: a related-files run can put a hundred files in the fork pool at
    // once, and tests that wait on a debounce (the live-refresh context takes ~8s alone) then
    // exceed a 20s budget on a loaded machine. A genuine hang still fails, only later.
    testTimeout: 60000,
    hookTimeout: 60000,
    // React 19 compatibility settings
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false
      }
    },
    // Disable deprecated reporter
    reporters: ['default'],
    // Configure test environment for React 19
    environmentOptions: {
      jsdom: {
        resources: 'usable'
      }
    }
  },
})
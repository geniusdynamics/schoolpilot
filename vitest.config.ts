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
    exclude: [...configDefaults.exclude, '.claude/**', 'tests/e2e/**'],
    // Generous per-test budget: the suite runs in a single fork and
    // 5s defaults cause spurious timeouts under accumulated load.
    testTimeout: 20000,
    hookTimeout: 20000,
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
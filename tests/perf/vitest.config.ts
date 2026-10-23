// ABOUTME: Vitest configuration for the performance suite under tests/perf, so a *.perf.ts file is
// ABOUTME: collected by its own run (`pnpm test:perf`) and never by the ordinary unit suite.
// ABOUTME: It merges the repository's base config, so the alias, setup files and React plugin are the
// ABOUTME: same ones the unit suite uses; only the collected files and the time budget differ.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vitest/config';

import base from '../../vitest.config';

const here = path.dirname(fileURLToPath(import.meta.url));
/** The repository root, so `tests/perf/**` and the `@/` alias resolve as they do everywhere else. */
const root = path.resolve(here, '..', '..');

export default mergeConfig(
  base,
  defineConfig({
    root,
    test: {
      // The only files this run collects. A performance figure belongs in a run of its own: it is
      // seconds long, not milliseconds, and it must not be hidden among the unit suite's output.
      include: ['tests/perf/**/*.perf.ts'],
      exclude: ['**/node_modules/**', '**/.claude/**'],
      // The 1,000-learner post has its own 15-minute budget; a slower machine reports its figures.
      testTimeout: 15 * 60_000,
      hookTimeout: 15 * 60_000,
    },
  })
);

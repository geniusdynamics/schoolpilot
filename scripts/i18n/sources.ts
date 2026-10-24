// ABOUTME: Reads translation JSON from disk into the same source list the runtime loader builds.
// ABOUTME: Shared by the extraction, pseudo-locale, sync and consolidation scripts.

import fs from 'node:fs';
import path from 'node:path';
import type { TranslationSource, TranslationTree } from '../../src/i18n/catalogue';
import { SUPPORTED_LOCALES } from '../../src/i18n/namespaces';

export interface SourceOptions {
  /** Repository root; defaults to the working directory. */
  readonly root?: string;
  readonly locales?: readonly string[];
  /**
   * Also read `src/modules/<module>/i18n/**`. The app does not: those files were
   * folded into the canonical namespace files, and only the consolidation tool
   * needs to see the old layout.
   */
  readonly includeModuleFiles?: boolean;
}

function listJson(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((entry) => entry.endsWith('.json'))
    .sort()
    .map((entry) => path.join(dir, entry));
}

function listDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readTree(file: string): TranslationTree {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as TranslationTree;
}

export function relative(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}

/**
 * Every translation file the app loads: one canonical namespace file per locale,
 * plus a module's own i18n file where one still exists.
 */
export function readSources(options: SourceOptions = {}): TranslationSource[] {
  const root = options.root ?? process.cwd();
  const locales = options.locales ?? SUPPORTED_LOCALES;
  const sources: TranslationSource[] = [];

  for (const lang of locales) {
    for (const file of listJson(path.join(root, 'src', 'i18n', 'locales', lang))) {
      sources.push({
        lang,
        namespace: path.basename(file, '.json'),
        scope: 'shared',
        origin: relative(root, file),
        data: readTree(file),
      });
    }
  }

  if (options.includeModuleFiles === true) {
    const modulesDir = path.join(root, 'src', 'modules');
    for (const moduleName of listDirs(modulesDir)) {
      for (const lang of locales) {
        const file = path.join(modulesDir, moduleName, 'i18n', `${lang}.json`);
        if (!fs.existsSync(file)) continue;
        sources.push({
          lang,
          namespace: moduleName,
          scope: 'module',
          origin: relative(root, file),
          data: readTree(file),
        });
      }
      for (const lang of locales) {
        for (const file of listJson(path.join(modulesDir, moduleName, 'i18n', lang))) {
          sources.push({
            lang,
            namespace: path.basename(file, '.json'),
            scope: moduleName === 'core' ? 'core' : 'module',
            origin: relative(root, file),
            data: readTree(file),
          });
        }
      }
    }
  }

  return sources;
}

/** Write a namespace file the way the repository formats them: CRLF, two-space indent, trailing newline. */
export function writeJsonFile(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2).replace(/\n/g, '\r\n')}\r\n`, 'utf8');
}

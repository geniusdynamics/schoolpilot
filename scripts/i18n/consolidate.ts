// ABOUTME: Folds the per-module i18n files into the canonical namespace files under src/i18n/locales.
// ABOUTME: One file per locale and namespace is what a translator and a translation platform both need.

import fs from 'node:fs';
import path from 'node:path';
import { buildCatalogue, canonicalJson, flattenTree, mergeTrees, type Catalogue, type TranslationTree } from '../../src/i18n/catalogue';
import { FALLBACK_LOCALE, NAVIGATION_NAMESPACE, SUPPORTED_LOCALES } from '../../src/i18n/namespaces';
import { readSources, relative, writeJsonFile } from './sources';

const args = process.argv.slice(2);
const write = args.includes('--write');
const check = args.includes('--check');
const fillSource = args.includes('--fill-source');
const root = process.cwd();

function moduleI18nFiles(): string[] {
  const modulesDir = path.join(root, 'src', 'modules');
  if (!fs.existsSync(modulesDir)) return [];
  const files: string[] = [];
  for (const moduleName of fs.readdirSync(modulesDir).sort()) {
    const dir = path.join(modulesDir, moduleName, 'i18n');
    if (!fs.existsSync(dir)) continue;
    const walk = (current: string): void => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.json')) files.push(full);
      }
    };
    walk(dir);
  }
  return files;
}

const sources = readSources({ root, includeModuleFiles: true });

/**
 * The catalogue with the navigation labels a module used to fan in, folded in
 * once. Precedence matches the loader this replaces: shared files, then each
 * module's `navigation` subtree in directory order, then the core module's
 * navigation file last.
 *
 * One deliberate difference: the replaced loader fanned in only module files, so
 * a label that lives in a canonical namespace file's own `navigation` subtree
 * (e.g. `fr/portal.json`) never reached `navigation:...`. Folding those in too
 * is what makes `navigation.json` the one place a nav label lives — five French
 * labels in `fr/navigation.json` change from English to their French value.
 */
function consolidatedCatalogue(): Catalogue {
  const catalogue = buildCatalogue(sources);
  for (const lang of SUPPORTED_LOCALES) {
    const forLocale = catalogue[lang] ?? (catalogue[lang] = {});
    let navigation: TranslationTree = {};
    for (const scope of ['shared', 'module', 'core'] as const) {
      for (const source of sources) {
        if (source.lang !== lang || source.scope !== scope) continue;
        if (source.namespace === NAVIGATION_NAMESPACE) {
          navigation = mergeTrees(navigation, source.data);
        }
        const contributed = source.data[NAVIGATION_NAMESPACE];
        if (typeof contributed === 'object' && contributed !== null && !Array.isArray(contributed)) {
          navigation = mergeTrees(navigation, contributed as TranslationTree);
        }
      }
    }
    forLocale[NAVIGATION_NAMESPACE] = navigation;
  }
  return catalogue;
}

/**
 * Copy the source-language text into every locale that is missing a key.
 *
 * The repository's pre-commit hook requires the four locale directories to have
 * the same keys. Consolidating the module files made the gaps visible for the
 * first time, so they are filled with the English source, which is what the
 * hook itself tells you to do. P5-B01 and P5-B02 replace these with real
 * translations.
 */
function fillFromSource(): void {
  const catalogue = buildCatalogue(readSources({ root }));
  const source = catalogue[FALLBACK_LOCALE] ?? {};
  let filled = 0;
  let reshaped = 0;

  const isTree = (value: unknown): value is TranslationTree =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  /**
   * Every leaf path in `from` must exist in the result. A locale that holds a
   * string where the source holds an object (a stale, flat shape) is reshaped
   * to the source: the hook compares leaf keys, and only the source shape has
   * them. A locale with extra structure the source lacks keeps it.
   */
  const fill = (target: TranslationTree, from: TranslationTree, path: string): TranslationTree => {
    const out: TranslationTree = { ...target };
    for (const [key, value] of Object.entries(from)) {
      const current = out[key];
      const here = path ? `${path}.${key}` : key;
      if (isTree(value)) {
        if (isTree(current)) out[key] = fill(current, value, here);
        else {
          if (current !== undefined) {
            console.log(`reshaped    ${here}: a string becomes the source's object`);
            reshaped += 1;
          }
          out[key] = fill({}, value, here);
        }
      } else if (current === undefined) {
        out[key] = value;
      }
    }
    return out;
  };

  for (const lang of SUPPORTED_LOCALES) {
    if (lang === FALLBACK_LOCALE) continue;
    for (const [namespace, tree] of Object.entries(source)) {
      const file = path.join(root, 'src', 'i18n', 'locales', lang, `${namespace}.json`);
      if (!fs.existsSync(file)) continue;
      const target = JSON.parse(fs.readFileSync(file, 'utf8')) as TranslationTree;
      const before = flattenTree(target).length;
      const filledTree = fill(target, tree, '');
      const added = flattenTree(filledTree).length - before;
      if (added > 0) {
        writeJsonFile(file, filledTree);
        filled += added;
        console.log(`filled      ${relative(root, file)} +${added}`);
      }
    }
  }
  console.log(`\n${filled} key(s) filled with ${FALLBACK_LOCALE} source text · ${reshaped} reshaped`);
}

const split = moduleI18nFiles().map((file) => relative(root, file));

if (fillSource) {
  fillFromSource();
} else if (check) {
  if (split.length > 0) {
    console.error(`FAIL ${split.length} module i18n file(s) sit outside the catalogue:`);
    for (const file of split.slice(0, 20)) console.error(`  ${file}`);
    console.error('Run: npx tsx scripts/i18n/consolidate.ts --write');
    process.exit(1);
  }
  console.log('OK every namespace is a single file under src/i18n/locales');
} else if (write) {
  const merged = consolidatedCatalogue();
  const before = canonicalJson(buildCatalogue(sources));
  const after = canonicalJson(merged);

  let written = 0;
  for (const lang of SUPPORTED_LOCALES) {
    for (const [namespace, tree] of Object.entries(merged[lang] ?? {})) {
      writeJsonFile(path.join(root, 'src', 'i18n', 'locales', lang, `${namespace}.json`), tree);
      written += 1;
    }
  }

  // A module file for a locale the app does not offer yet (de, es, it, nl, pt)
  // still holds real translation work: move it to the canonical directory
  // instead of deleting it, so P5-B03 can pick it up.
  let relocated = 0;
  for (const file of split) {
    const relativePath = relative(root, file);
    const parts = relativePath.split('/');
    const isCore = parts[2] === 'core';
    const namespace = isCore ? path.basename(file, '.json') : parts[2];
    const lang = isCore ? parts[parts.length - 2] : path.basename(file, '.json');
    if ((SUPPORTED_LOCALES as readonly string[]).includes(lang)) continue;

    const destination = path.join(root, 'src', 'i18n', 'locales', lang, `${namespace}.json`);
    const existing = fs.existsSync(destination)
      ? (JSON.parse(fs.readFileSync(destination, 'utf8')) as TranslationTree)
      : {};
    writeJsonFile(destination, mergeTrees(existing, JSON.parse(fs.readFileSync(file, 'utf8')) as TranslationTree));
    relocated += 1;
  }

  for (const file of split) fs.rmSync(path.join(root, file), { force: true });
  for (const file of moduleI18nFiles()) fs.rmSync(file, { force: true });

  // Leave no empty i18n directories behind.
  const modulesDir = path.join(root, 'src', 'modules');
  for (const moduleName of fs.readdirSync(modulesDir)) {
    const dir = path.join(modulesDir, moduleName, 'i18n');
    if (!fs.existsSync(dir)) continue;
    const walk = (current: string): void => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(path.join(current, entry.name));
      }
      if (fs.readdirSync(current).length === 0) fs.rmdirSync(current);
    };
    walk(dir);
  }

  const nowSplit = moduleI18nFiles();
  console.log(`wrote ${written} namespace file(s) under src/i18n/locales`);
  console.log(`moved ${relocated} file(s) for locales the app does not offer yet`);
  console.log(`removed ${split.length} module i18n file(s)`);
  console.log(`catalogue changed by consolidation: ${before === after ? 'no' : 'yes (navigation fan-in)'}`);
  if (nowSplit.length > 0) {
    console.error(`FAIL ${nowSplit.length} module i18n file(s) survived the migration`);
    process.exit(1);
  }
  const rebuilt = buildCatalogue(readSources({ root }));
  if (canonicalJson(rebuilt) !== canonicalJson(merged)) {
    console.error('FAIL the catalogue read back from disk differs from the consolidated one');
    process.exit(1);
  }
  console.log(`OK read back from disk identical · ${FALLBACK_LOCALE} reference locale`);
} else {
  console.error('usage: consolidate.ts <--check|--write|--fill-source>');
  process.exit(2);
}

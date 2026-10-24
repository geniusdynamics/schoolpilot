// ABOUTME: Reports translation keys the code asks for but the catalogue lacks, and catalogue keys nothing uses.
// ABOUTME: `--check` fails when a core namespace has a key the code asks for and the catalogue cannot answer.

import fs from 'node:fs';
import path from 'node:path';
import { buildCatalogue, countByLocale, countLeaves, withEntry } from '../../src/i18n/catalogue';
import {
  collectPlaceholders,
  extractFromSource,
  missingKeys,
  unusedKeys,
  type KeyUsage,
  type MissingKey,
} from '../../src/i18n/introspect';
import { CORE_NAMESPACES, FALLBACK_LOCALE, isCoreNamespace, SUPPORTED_LOCALES } from '../../src/i18n/namespaces';
import { readSources, relative, writeJsonFile } from './sources';

const SKIP_DIRECTORIES = new Set(['node_modules', 'dist', 'dev-dist', 'coverage', '.git', '__tests__', 'e2e']);
const CODE_EXTENSIONS = ['.ts', '.tsx'];

function collectSourceFiles(root: string): string[] {
  const files: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!CODE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) continue;
      if (entry.name.endsWith('.d.ts')) continue;
      if (/\.(test|spec)\./.test(entry.name)) continue;
      files.push(full);
    }
  };

  walk(path.join(root, 'src'));
  return files;
}

function readUsages(root: string): {
  usages: KeyUsage[];
  dynamic: number;
  files: number;
  skipped: number;
} {
  const files = collectSourceFiles(root);
  const usages: KeyUsage[] = [];
  let dynamic = 0;
  let skipped = 0;

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    // Files that never touch i18next use their own `t`; scanning them only
    // produces phantom keys. Their absence is reported, not silently ignored.
    if (!/(useTranslation|react-i18next|i18nKey)/.test(source)) {
      skipped += 1;
      continue;
    }
    const extraction = extractFromSource(source, relative(root, file));
    usages.push(...extraction.usages);
    dynamic += extraction.dynamic.length;
  }

  return { usages, dynamic, files: files.length, skipped };
}

function printList(title: string, lines: string[], limit: number, all: boolean): void {
  if (lines.length === 0) return;
  const shown = all ? lines : lines.slice(0, limit);
  console.log(`\n${title} (${lines.length})`);
  for (const line of shown) console.log(`  ${line}`);
  if (shown.length < lines.length) console.log(`  … ${lines.length - shown.length} more (pass --all)`);
}

const args = process.argv.slice(2);
const all = args.includes('--all');
const asJson = args.includes('--json');
const check = args.includes('--check');
const fix = args.includes('--fix');
const root = process.cwd();

const sources = readSources({ root });
const catalogue = buildCatalogue(sources);
const { usages, dynamic, files, skipped } = readUsages(root);

const counts = countByLocale(catalogue);
const namespaceCount = new Set(sources.map((source) => source.namespace)).size;
const missing = missingKeys(catalogue, FALLBACK_LOCALE, usages);
const unused = unusedKeys(catalogue, FALLBACK_LOCALE, usages);
const placeholders = collectPlaceholders(catalogue, FALLBACK_LOCALE, usages);
const missingCore = missing.filter((entry) => isCoreNamespace(entry.namespace));

if (asJson) {
  console.log(
    JSON.stringify(
      {
        files,
        skipped,
        namespaces: namespaceCount,
        catalogue: counts,
        literalUsages: usages.length,
        dynamic,
        missing,
        missingCore,
        unused,
        placeholders,
      },
      null,
      2
    )
  );
} else {
  const catalogueLine = SUPPORTED_LOCALES.map((lang) => `${lang} ${counts[lang] ?? 0}`).join(' · ');
  console.log(`i18n extraction · ${files} source files (${skipped} without i18next) · ${namespaceCount} namespaces`);
  console.log(`catalogue   ${catalogueLine} keys (${FALLBACK_LOCALE} is the reference)`);
  console.log(`code        ${usages.length} literal keys · ${dynamic} dynamic expressions skipped`);
  console.log(
    `missing     ${missing.length} keys used in code but absent from ${FALLBACK_LOCALE}` +
      ` (core: ${missingCore.length} of ${CORE_NAMESPACES.join(', ')})`
  );
  console.log(`unused      ${unused.length} keys in ${FALLBACK_LOCALE} with no code reference`);
  console.log(
    `placeholder ${placeholders.length} page descriptions that only repeat the field name`
  );
  console.log(
    `inline      ${missing.filter((entry) => entry.defaultValue).length} of the missing keys carry an` +
      ' English default in the code instead of the catalogue'
  );

  printList(
    `missing from ${FALLBACK_LOCALE}`,
    missing.map((entry) => `${entry.namespace}:${entry.key}  ← ${entry.file}:${entry.line} (${entry.occurrences}×)`),
    25,
    all
  );
  printList(
    'placeholder page descriptions',
    placeholders.map((finding) => `${finding.namespace}:${finding.key} = "${finding.value}"`),
    25,
    all
  );
  printList(
    `unused in ${FALLBACK_LOCALE}`,
    unused.map((entry) => `${entry.namespace}:${entry.key}`),
    25,
    all
  );

  const perNamespace = Object.entries(catalogue[FALLBACK_LOCALE] ?? {})
    .map(([namespace, tree]) => ({ namespace, keys: countLeaves(tree) }))
    .sort((a, b) => b.keys - a.keys);
  printList(
    `catalogue size by namespace (${FALLBACK_LOCALE})`,
    perNamespace.map((entry) => `${entry.namespace.padEnd(16)} ${entry.keys}`),
    50,
    true
  );
}

/**
 * Move English text that lives inline in the code into the catalogue.
 *
 * Only keys with an inline default can be backfilled: the default *is* the
 * English. Keys without one need a human to write the string, so they stay in
 * the report. Core namespaces only unless `--all-namespaces` is passed.
 */
function backfill(entries: readonly MissingKey[], allNamespaces: boolean): void {
  const targets = entries.filter(
    (entry) => entry.defaultValue && (allNamespaces || isCoreNamespace(entry.namespace))
  );
  const byNamespace = new Map<string, MissingKey[]>();
  for (const entry of targets) {
    byNamespace.set(entry.namespace, [...(byNamespace.get(entry.namespace) ?? []), entry]);
  }

  let written = 0;
  for (const [namespace, additions] of [...byNamespace.entries()].sort()) {
    const file = path.join(root, 'src', 'i18n', 'locales', FALLBACK_LOCALE, `${namespace}.json`);
    if (!fs.existsSync(file)) {
      console.log(`skip        ${namespace}: no ${relative(root, file)}`);
      continue;
    }
    let tree = JSON.parse(fs.readFileSync(file, 'utf8')) as Parameters<typeof withEntry>[0];
    let added = 0;
    for (const entry of additions) {
      const next = withEntry(tree, entry.key, entry.defaultValue as string);
      if (!next) {
        console.log(`conflict    ${namespace}:${entry.key} — a shorter key already holds a string`);
        continue;
      }
      tree = next;
      added += 1;
    }
    if (added > 0) {
      writeJsonFile(file, tree);
      written += added;
      console.log(`backfilled  ${relative(root, file)} +${added}`);
    }
  }
  console.log(`\n${written} key(s) added to the ${FALLBACK_LOCALE} catalogue`);
}

if (fix) backfill(missing, args.includes('--all-namespaces'));

if (check && missingCore.length > 0) {
  console.error(
    `\nFAIL ${missingCore.length} key(s) used in core namespaces are not in the ${FALLBACK_LOCALE} catalogue:`
  );
  for (const entry of missingCore.slice(0, 20)) {
    console.error(`  ${entry.namespace}:${entry.key}  ← ${entry.file}:${entry.line}`);
  }
  process.exit(1);
}

if (check) console.log('\nOK no untranslated core strings');

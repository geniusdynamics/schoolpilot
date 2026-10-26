// ABOUTME: CI check that the core namespaces of every must-be-complete locale are translated, not copied from English.
// ABOUTME: Reports missing, extra, empty, untranslated and placeholder-changed keys and exits non-zero on any.

import path from 'node:path';
import { buildCatalogue } from '../../src/i18n/catalogue';
import { COMPLETE_LOCALES, checkLocaleNamespace, type Problem } from '../../src/i18n/completeness';
import { CORE_NAMESPACES, FALLBACK_LOCALE } from '../../src/i18n/namespaces';
import { UNTRANSLATABLE } from '../../src/i18n/untranslatable';
import { readSources } from './sources';

// `--root <dir>` points the check at another tree (the test fixtures); `--locales a,b` overrides the locale list.
const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};

const root = path.resolve(option('--root') ?? process.cwd());
const locales = option('--locales')?.split(',') ?? COMPLETE_LOCALES;

const catalogue = buildCatalogue(readSources({ root, locales: [FALLBACK_LOCALE, ...locales] }));
const failures: Problem[] = [];

for (const locale of locales) {
  let checked = 0;
  const found: Problem[] = [];
  for (const namespace of CORE_NAMESPACES) {
    const english = catalogue[FALLBACK_LOCALE]?.[namespace] ?? {};
    const problems = checkLocaleNamespace(namespace, english, catalogue[locale]?.[namespace] ?? {}, UNTRANSLATABLE);
    checked += 1;
    found.push(...problems);
  }
  console.log(`locale check  ${locale}  ${checked} core namespaces (${CORE_NAMESPACES.join(', ')})  ${found.length} problem(s)`);
  for (const problem of found) {
    console.error(`  ${locale} ${problem.kind.padEnd(12)} ${problem.namespace}:${problem.key}  ${problem.detail}`);
  }
  failures.push(...found);
}

if (failures.length > 0) {
  console.error(`\nFAIL ${failures.length} locale problem(s)`);
  process.exit(1);
}
console.log('\nOK every core namespace is complete in every listed locale');

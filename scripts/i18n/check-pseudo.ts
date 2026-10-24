// ABOUTME: CI check for the pseudo-locale: every English string must be accented, marked and expanded.
// ABOUTME: Anything left as plain English, or missing from the pseudo tree, is an untranslated core string.

import { buildCatalogue, flattenTree, getAtPath } from '../../src/i18n/catalogue';
import { CORE_NAMESPACES, FALLBACK_LOCALE } from '../../src/i18n/namespaces';
import { isPseudoTranslatable, pseudoTranslate, pseudoTranslateCatalogue, PSEUDO_LOCALE } from '../../src/i18n/pseudo';
import { readSources } from './sources';

const args = process.argv.slice(2);
const check = args.includes('--check');
const root = process.cwd();

const catalogue = buildCatalogue(readSources({ root }));
const english = catalogue[FALLBACK_LOCALE] ?? {};
const pseudo = pseudoTranslateCatalogue(english);

const namespaces = Object.keys(english).sort();
const untranslated: string[] = [];
const missingFromPseudo: string[] = [];
let total = 0;
let transformed = 0;

for (const namespace of namespaces) {
  for (const { key, value } of flattenTree(english[namespace])) {
    total += 1;
    const pseudoValue = getAtPath(pseudo[namespace], key);
    if (pseudoValue === undefined) {
      missingFromPseudo.push(`${namespace}:${key}`);
      continue;
    }
    if (!isPseudoTranslatable(value)) continue;
    if (pseudoValue === value || !pseudoValue.includes('«')) untranslated.push(`${namespace}:${key}`);
    else transformed += 1;
  }
}

const widths = namespaces
  .flatMap((namespace) =>
    flattenTree(english[namespace]).map(({ key, value }) => ({
      id: `${namespace}:${key}`,
      english: value.length,
      pseudo: pseudoTranslate(value).length,
    }))
  )
  .filter((entry) => entry.english >= 12)
  .sort((a, b) => b.pseudo - a.pseudo)
  .slice(0, 5);

const coreKeys = CORE_NAMESPACES.reduce(
  (sum, namespace) => sum + flattenTree(english[namespace] ?? {}).length,
  0
);

console.log(`pseudo-locale check · ${namespaces.length} namespaces · ${total} keys`);
console.log(`transform   ${transformed} accented and marked · ${untranslated.length} still plain English`);
console.log(`structure   ${missingFromPseudo.length} keys missing from the ${PSEUDO_LOCALE} tree`);
console.log(`core        ${CORE_NAMESPACES.join(', ')} — ${coreKeys} keys`);
console.log('widest labels (English → pseudo characters)');
for (const entry of widths) console.log(`  ${entry.id}  ${entry.english} → ${entry.pseudo}`);

if (untranslated.length > 0) {
  console.error(`\nFAIL ${untranslated.length} string(s) the pseudo-locale leaves as English:`);
  for (const id of untranslated.slice(0, 20)) console.error(`  ${id}`);
}
if (missingFromPseudo.length > 0) {
  console.error(`\nFAIL ${missingFromPseudo.length} key(s) missing from the pseudo tree:`);
  for (const id of missingFromPseudo.slice(0, 20)) console.error(`  ${id}`);
}

if (check && (untranslated.length > 0 || missingFromPseudo.length > 0)) process.exit(1);
if (check) console.log('\nOK every English string has a pseudo translation');

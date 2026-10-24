// ABOUTME: Exports the catalogue in the shape a translation platform imports, and imports its return trip.
// ABOUTME: `roundtrip` proves export → import is lossless against the real catalogue, per namespace.

import fs from 'node:fs';
import path from 'node:path';
import { buildCatalogue, countLeaves } from '../../src/i18n/catalogue';
import { FALLBACK_LOCALE } from '../../src/i18n/namespaces';
import { applyExchange, driftedNamespaces, fromExchange, toExchange, type Exchange } from '../../src/i18n/platform';
import { readSources, relative, writeJsonFile } from './sources';

const DEFAULT_OUT = path.join('.prd-gate', 'i18n-exchange');

function option(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index === process.argv.length - 1) {
    if (fallback !== undefined) return fallback;
    throw new Error(`--${name} is required`);
  }
  return process.argv[index + 1];
}

function readExchange(dir: string): Exchange {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')) as Exchange['manifest'];
  const files: Exchange['files'] = {};
  for (const entry of manifest.namespaces) {
    files[entry.name] = JSON.parse(
      fs.readFileSync(path.join(dir, `${entry.name}.json`), 'utf8')
    ) as Exchange['files'][string];
  }
  return { manifest, files };
}

const command = process.argv[2];
const root = process.cwd();
const target = option('target', 'sw');
const catalogue = buildCatalogue(readSources({ root }));

if (target === FALLBACK_LOCALE) {
  throw new Error(`--target must differ from the source locale ${FALLBACK_LOCALE}`);
}

if (command === 'export') {
  const dir = option('out', path.join(DEFAULT_OUT, target));
  const exchange = toExchange(catalogue, FALLBACK_LOCALE, target);
  fs.mkdirSync(dir, { recursive: true });
  for (const [namespace, files] of Object.entries(exchange.files)) {
    writeJsonFile(path.join(dir, `${namespace}.json`), files);
  }
  writeJsonFile(path.join(dir, 'manifest.json'), exchange.manifest);
  const keys = exchange.manifest.namespaces.reduce((sum, entry) => sum + entry.keys, 0);
  console.log(`exported ${exchange.manifest.namespaces.length} namespaces · ${keys} source keys`);
  console.log(`written to ${relative(root, dir)} (source ${FALLBACK_LOCALE} → target ${target})`);
} else if (command === 'import') {
  const dir = option('from', path.join(DEFAULT_OUT, target));
  const exchange = readExchange(dir);
  const drift = driftedNamespaces(exchange);
  if (drift.length > 0) {
    console.error(`FAIL ${drift.length} namespace(s) no longer match the manifest checksum: ${drift.join(', ')}`);
    process.exit(1);
  }
  const sources = fromExchange(exchange);
  const merged = applyExchange(catalogue, exchange);
  const written: string[] = [];
  if (process.argv.includes('--write')) {
    for (const source of sources) {
      const file = path.join(root, 'src', 'i18n', 'locales', target, `${source.namespace}.json`);
      writeJsonFile(file, merged[target][source.namespace]);
      written.push(relative(root, file));
    }
  }
  console.log(`imported ${sources.length} namespace(s) for ${target} from ${relative(root, dir)}`);
  for (const file of written) console.log(`  wrote ${file}`);
  if (written.length === 0) console.log('  (dry run — pass --write to update src/i18n/locales)');
} else if (command === 'roundtrip') {
  const exchange = toExchange(catalogue, FALLBACK_LOCALE, target);
  const imported = buildCatalogue(fromExchange(exchange));
  const expected = catalogue[target] ?? {};
  const actual = imported[target] ?? {};

  const problems: string[] = [];
  const names = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  for (const namespace of [...names].sort()) {
    const before = expected[namespace] ?? {};
    const after = actual[namespace] ?? {};
    if (countLeaves(before) === 0) continue;
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      problems.push(namespace);
    }
  }

  const keys = exchange.manifest.namespaces.reduce((sum, entry) => sum + entry.keys, 0);
  console.log(
    `roundtrip ${FALLBACK_LOCALE} → ${target} → ${FALLBACK_LOCALE}: ${exchange.manifest.namespaces.length} namespaces, ${keys} source keys`
  );
  console.log(`namespaces with a ${target} translation: ${Object.keys(expected).length}`);
  if (problems.length > 0) {
    console.error(`FAIL ${problems.length} namespace(s) changed across the round trip: ${problems.join(', ')}`);
    process.exit(1);
  }
  console.log('OK every namespace came back identical');
} else {
  console.error('usage: sync.ts <export|import|roundtrip> [--target <locale>] [--out|--from <dir>] [--write]');
  process.exit(2);
}

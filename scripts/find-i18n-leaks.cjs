#!/usr/bin/env node
// ABOUTME: Precisely detects visible i18n leaks: raw keys rendered (missing key + no default)
// ABOUTME: and literal {{placeholder}} output (key resolves to text with vars but call passes none).

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const STATIC_LOCALES = path.join(SRC, 'i18n', 'locales');
const MODULES_DIR = path.join(SRC, 'modules');
const LANG = 'en';

// ---------- Build resources exactly like src/i18n/modularLoader.ts ----------
function deepMerge(target, source) {
  if (target == null) return source;
  if (source == null) return target;
  if (typeof target !== 'object' || typeof source !== 'object') return source;
  if (Array.isArray(target) || Array.isArray(source)) return source;
  for (const key of Object.keys(source)) {
    const t = target[key];
    const s = source[key];
    if (t && s && typeof t === 'object' && typeof s === 'object' && !Array.isArray(t) && !Array.isArray(s)) {
      deepMerge(t, s);
    } else if (s !== undefined) {
      target[key] = s;
    }
  }
  return target;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (e) {
    console.error(`  [warn] bad JSON: ${file}: ${e.message}`);
    return null;
  }
}

const resources = { navigation: {} };

// 1. Static locales: src/i18n/locales/en/<ns>.json
const staticDir = path.join(STATIC_LOCALES, LANG);
if (fs.existsSync(staticDir)) {
  for (const f of fs.readdirSync(staticDir).filter((f) => f.endsWith('.json'))) {
    const ns = f.replace('.json', '');
    const data = readJson(path.join(staticDir, f));
    if (!data) continue;
    if (!resources[ns]) resources[ns] = {};
    deepMerge(resources[ns], data);
  }
}

// 2. Module translations: src/modules/<mod>/i18n/en.json  -> namespace <mod>
for (const mod of fs.readdirSync(MODULES_DIR)) {
  const file = path.join(MODULES_DIR, mod, 'i18n', `${LANG}.json`);
  if (!fs.existsSync(file)) continue;
  const data = readJson(file);
  if (!data) continue;
  if (!resources[mod]) resources[mod] = {};
  deepMerge(resources[mod], data); // module merges over static (matches loader semantics)
  if (data.navigation) deepMerge(resources.navigation, data.navigation);
}

// 3. Core module translations: src/modules/core/i18n/en/<ns>.json
const coreI18n = path.join(MODULES_DIR, 'core', 'i18n', LANG);
if (fs.existsSync(coreI18n)) {
  for (const f of fs.readdirSync(coreI18n).filter((f) => f.endsWith('.json'))) {
    const ns = f.replace('.json', '');
    const data = readJson(path.join(coreI18n, f));
    if (!data) continue;
    if (!resources[ns]) resources[ns] = {};
    deepMerge(resources[ns], data);
    if (data.navigation) deepMerge(resources.navigation, data.navigation);
  }
}

function lookup(ns, key) {
  const parts = key.split('.');
  let node = resources[ns];
  for (const p of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[p];
  }
  return node;
}

// ---------- Scan source files ----------
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '__tests__' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    // Skip the dead custom i18n stack (I18nManager/useTranslation/index/loader/I18nProvider):
    // these files are not imported by the live app, so their t() calls never render.
    if (/[\\/]src[\\/]i18n[\\/](index|useTranslation|I18nManager|I18nProvider|loader)\.tsx?$/.test(full)) continue;
    if (e.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.(test|spec|stories)\./.test(e.name)) out.push(full);
  }
  return out;
}

const files = walk(SRC);
const hardLeaks = [];   // raw key will render
const placeholderLeaks = []; // literal {{var}} will render
const dynamicKeys = []; // template-literal keys, can't verify statically

// Capture: t('key'), t("key", 'default'), t('key', {...}), t('ns:key', ...)
const T_CALL = /(?<![A-Za-z0-9_$.])t\(\s*(['"`])([^'"`\n]+)\1\s*(?:,\s*(['"`])((?:\\.|(?!\3)[^\\\n])*)\3)?\s*(?:,\s*(\{))?/g;

for (const file of files) {
  const srcText = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');

  // Determine namespaces bound in this file via useTranslation('ns') / useTranslation(['a','b'])
  const nsMatches = [...srcText.matchAll(/useTranslation\(\s*(?:\[\s*)?['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const defaultNs = nsMatches[0] || 'common';

  let m;
  while ((m = T_CALL.exec(srcText)) !== null) {
    const [, , rawKey, , defaultVal, hasOptions] = m;
    const line = srcText.slice(0, m.index).split('\n').length;

    if (rawKey.includes('${')) {
      dynamicKeys.push({ file: rel, line, key: rawKey });
      continue;
    }

    // Resolve namespace
    let ns = defaultNs;
    let key = rawKey;
    const colon = rawKey.indexOf(':');
    if (colon > 0 && !rawKey.slice(0, colon).includes(' ')) {
      ns = rawKey.slice(0, colon);
      key = rawKey.slice(colon + 1);
    }

    let value = lookup(ns, key);
    // i18next fallbackNS behavior isn't configured; but keys without dots that read like
    // plain English sentences render as-is (readable) — not visible leaks.
    const looksLikeSentence = /\s/.test(key) && !key.includes('.');

    if (value === undefined || typeof value === 'object') {
      if (defaultVal !== undefined) continue; // default renders — visually fine
      if (looksLikeSentence) continue; // renders readable English text
      hardLeaks.push({ file: rel, line, ns, key, kind: typeof value === 'object' ? 'object-key' : 'missing' });
      continue;
    }

    // Placeholder check: value contains {{var}} but call passes no options object
    if (typeof value === 'string' && /\{\{\s*\w+\s*\}\}/.test(value) && !hasOptions) {
      placeholderLeaks.push({ file: rel, line, ns, key, value });
    }
  }
}

console.log(`[find-i18n-leaks] Scanned ${files.length} files against ${Object.keys(resources).length} namespaces\n`);

console.log(`[HARD LEAKS — raw key renders in UI] (${hardLeaks.length}):`);
for (const l of hardLeaks) console.log(`  ${l.file}:${l.line}  [${l.ns}] ${l.key}${l.kind === 'object-key' ? ' (resolves to object)' : ''}`);

console.log(`\n[PLACEHOLDER LEAKS — literal {{var}} renders] (${placeholderLeaks.length}):`);
for (const l of placeholderLeaks) console.log(`  ${l.file}:${l.line}  [${l.ns}] ${l.key} = "${l.value}"`);

console.log(`\n[DYNAMIC KEYS — verify manually] (${dynamicKeys.length}):`);
for (const l of dynamicKeys.slice(0, 40)) console.log(`  ${l.file}:${l.line}  ${l.key}`);
if (dynamicKeys.length > 40) console.log(`  ... and ${dynamicKeys.length - 40} more`);

// Emit structured data so the backfill generator can consume it precisely.
fs.writeFileSync(
  path.join(ROOT, '_i18n_leaks.json'),
  JSON.stringify({ hardLeaks, placeholderLeaks, dynamicKeys }, null, 2)
);

process.exit(hardLeaks.length || placeholderLeaks.length ? 1 : 0);

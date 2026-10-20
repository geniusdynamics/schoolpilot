#!/usr/bin/env node
// ABOUTME: Find translation keys used in code that are missing from locale files, and unused keys.
// ABOUTME: Scans all t('...') calls in src/ and compares to defined keys.
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const MODULES_DIR = path.join(__dirname, '..', 'src', 'modules');

function walk(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'build', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full, extensions));
    else if (extensions.some(ext => entry.name.endsWith(ext))) results.push(full);
  }
  return results;
}

function extractKeysFromCode(content) {
  // Match t('foo.bar'), t("foo.bar"), t(`foo.bar`)
  const re = /\bt\(\s*['"`]([^'"`]+)['"`]/g;
  const keys = new Set();
  let m;
  while ((m = re.exec(content)) !== null) {
    keys.add(m[1]);
  }
  return keys;
}

function extractKeysFromJson(obj, prefix = '') {
  const keys = new Set();
  if (!obj || typeof obj !== 'object') return keys;
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of extractKeysFromJson(v, fullKey)) keys.add(sub);
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

function loadAllDefinedKeys() {
  const defined = new Set();
  // Central locales
  if (fs.existsSync(LOCALES_DIR)) {
    for (const lang of fs.readdirSync(LOCALES_DIR)) {
      const langDir = path.join(LOCALES_DIR, lang);
      if (!fs.statSync(langDir).isDirectory()) continue;
      for (const file of fs.readdirSync(langDir)) {
        if (!file.endsWith('.json')) continue;
        try {
          const data = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf8'));
          for (const k of extractKeysFromJson(data)) defined.add(k);
        } catch (e) { /* skip invalid */ }
      }
    }
  }
  // Module i18n
  if (fs.existsSync(MODULES_DIR)) {
    for (const mod of fs.readdirSync(MODULES_DIR)) {
      const i18nDir = path.join(MODULES_DIR, mod, 'i18n');
      if (!fs.existsSync(i18nDir)) continue;
      for (const file of fs.readdirSync(i18nDir)) {
        if (!file.endsWith('.json')) continue;
        try {
          const data = JSON.parse(fs.readFileSync(path.join(i18nDir, file), 'utf8'));
          for (const k of extractKeysFromJson(data)) defined.add(k);
        } catch (e) { /* skip invalid */ }
      }
    }
  }
  return defined;
}

const usedKeys = new Set();
const files = walk(SRC_DIR);
for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    for (const k of extractKeysFromCode(content)) usedKeys.add(k);
  } catch (e) { /* skip */ }
}

const definedKeys = loadAllDefinedKeys();
const missing = [...usedKeys].filter(k => !definedKeys.has(k)).sort();
const unused = [...definedKeys].filter(k => !usedKeys.has(k)).sort();

console.log(`[analyze-translation-usage] Scanned ${files.length} source files`);
console.log(`[analyze-translation-usage] Used keys: ${usedKeys.size}`);
console.log(`[analyze-translation-usage] Defined keys: ${definedKeys.size}`);

if (missing.length > 0) {
  console.log(`\n[USED BUT NOT DEFINED] (${missing.length}):`);
  for (const k of missing.slice(0, 30)) console.log(`  - ${k}`);
  if (missing.length > 30) console.log(`  ... and ${missing.length - 30} more`);
}

if (unused.length > 0) {
  console.log(`\n[DEFINED BUT UNUSED] (${unused.length}, showing first 20):`);
  for (const k of unused.slice(0, 20)) console.log(`  - ${k}`);
  if (unused.length > 20) console.log(`  ... and ${unused.length - 20} more`);
}

if (missing.length === 0) {
  console.log('\n[analyze-translation-usage] OK: All used keys are defined');
  process.exit(0);
}
process.exit(1);

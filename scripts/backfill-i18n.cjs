#!/usr/bin/env node
// ABOUTME: Consumes _i18n_leaks.json and backfills missing EN translation keys into the
// ABOUTME: static locale files so no raw i18n key or literal {{placeholder}} renders in the UI.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEAKS = path.join(ROOT, '_i18n_leaks.json');
const STATIC_EN = path.join(ROOT, 'src', 'i18n', 'locales', 'en');

if (!fs.existsSync(LEAKS)) {
  console.error('Run scripts/find-i18n-leaks.cjs first to produce _i18n_leaks.json');
  process.exit(1);
}

const { hardLeaks } = JSON.parse(fs.readFileSync(LEAKS, 'utf8'));

// ---------- Humanization ----------
function titleCase(word) {
  return word
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase -> camel Case
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Interpolation-bearing keys must keep their {{vars}} so i18next fills them.
const SPECIAL = {
  'validation.required': '{{field}} is required',
  'validation.minLength': '{{field}} must be at least {{min}} characters',
  'validation.maxLength': '{{field}} must not exceed {{max}} characters',
  'validation.min': '{{field}} must be at least {{min}}',
  'validation.max': '{{field}} must not exceed {{max}}',
  'validation.pattern': '{{field}} is invalid',
  'validation.email': '{{field}} must be a valid email address',
  'validation.unique': '{{field}} already exists',
  'validation.invalid': '{{field}} is invalid',
  'common.loading': 'Loading...',
  'common.noData': 'No data available',
  'common.noResults': 'No results found',
};

function humanize(key) {
  if (SPECIAL[key]) return SPECIAL[key];
  const parts = key.split('.');
  const leaf = parts[parts.length - 1];
  const parent = parts.length > 1 ? parts[parts.length - 2] : '';
  if (leaf === 'plural') return titleCase(parent) + (parent.endsWith('s') ? '' : 's');
  if (leaf === 'singular') return titleCase(parent);
  // A `.title` directly under an entity/section (e.g. analytics.title, rubric.title)
  // reads best as the entity name; but a `.title` inside a field/column container
  // (fields.title, tableHeaders.title) is a genuine "Title" label.
  const FIELD_CONTAINERS = new Set([
    'fields', 'field', 'columns', 'column', 'headers', 'header', 'tableHeaders',
  ]);
  if ((leaf === 'title' || leaf === 'name' || leaf === 'label') && parent && !FIELD_CONTAINERS.has(parent)) {
    return titleCase(parent);
  }
  return titleCase(leaf);
}

// ---------- Group missing keys by namespace ----------
const byNs = {}; // ns -> { keyPath: value }
let added = 0;
for (const l of hardLeaks) {
  if (l.key.includes('${')) continue; // dynamic, skip
  if (!byNs[l.ns]) byNs[l.ns] = {};
  if (byNs[l.ns][l.key] === undefined) {
    byNs[l.ns][l.key] = humanize(l.key);
    added++;
  }
}

function setDeep(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof node[p] !== 'object' || node[p] === null || Array.isArray(node[p])) {
      // Don't clobber an existing string leaf with an object; skip conflicting path.
      if (node[p] !== undefined && typeof node[p] !== 'object') return false;
      node[p] = {};
    }
    node = node[p];
  }
  const leaf = parts[parts.length - 1];
  if (node[leaf] === undefined) {
    node[leaf] = value;
    return true;
  }
  return false;
}

if (!fs.existsSync(STATIC_EN)) fs.mkdirSync(STATIC_EN, { recursive: true });

let filesTouched = 0;
let keysWritten = 0;
for (const ns of Object.keys(byNs)) {
  const file = path.join(STATIC_EN, `${ns}.json`);
  let data = {};
  if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  }
  let wrote = 0;
  for (const [keyPath, value] of Object.entries(byNs[ns])) {
    if (setDeep(data, keyPath, value)) wrote++;
  }
  if (wrote > 0) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
    filesTouched++;
    keysWritten += wrote;
    console.log(`  [${ns}] +${wrote} keys -> ${path.relative(ROOT, file).replace(/\\/g, '/')}`);
  }
}

console.log(`\n[backfill-i18n] ${keysWritten} keys written across ${filesTouched} namespace files.`);

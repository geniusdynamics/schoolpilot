#!/usr/bin/env node
// ABOUTME: Detect common i18n issues across all locale and module translation files.
// ABOUTME: Reports invalid JSON, duplicate keys, deeply nested objects, and keys containing dots.
const fs = require('fs');
const path = require('path');

const ROOTS = [
  path.join(__dirname, '..', 'src', 'i18n', 'locales'),
  path.join(__dirname, '..', 'src', 'modules'),
];

const ISSUES = [];
const MAX_NESTING_DEPTH = 5;

function walkJsonFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', '.git'].includes(entry.name)) continue;
      results.push(...walkJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

function findDuplicateKeys(obj, path = '', seen = new Map()) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = path ? `${path}.${k}` : k;
    if (seen.has(k) && path === '') {
      ISSUES.push({ file: currentFile, type: 'duplicate-top-level-key', key: k });
    }
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      findDuplicateKeys(v, fullKey, seen);
    }
  }
}

function findDeepNesting(obj, path = '', depth = 0) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = path ? `${path}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      if (depth + 1 > MAX_NESTING_DEPTH) {
        ISSUES.push({ file: currentFile, type: 'deep-nesting', key: fullKey, depth: depth + 1 });
      } else {
        findDeepNesting(v, fullKey, depth + 1);
      }
    }
  }
}

function findDotsInKeys(obj, path = '') {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = path ? `${path}.${k}` : k;
    if (k.includes('.')) {
      ISSUES.push({ file: currentFile, type: 'dot-in-key', key: fullKey, badKey: k });
    }
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      findDotsInKeys(v, fullKey);
    }
  }
}

let currentFile = '';
const allFiles = ROOTS.flatMap(r => walkJsonFiles(r));

for (const file of allFiles) {
  currentFile = file;
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (e) {
    ISSUES.push({ file, type: 'read-error', message: e.message });
    continue;
  }
  // Strip BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    ISSUES.push({ file, type: 'has-bom' });
    content = content.slice(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    ISSUES.push({ file, type: 'invalid-json', message: e.message });
    continue;
  }
  findDuplicateKeys(parsed);
  findDeepNesting(parsed);
  findDotsInKeys(parsed);
}

if (ISSUES.length === 0) {
  console.log(`[analyze-translation-issues] OK: Scanned ${allFiles.length} files, no issues found`);
  process.exit(0);
}

console.log(`[analyze-translation-issues] Found ${ISSUES.length} issue(s) in ${allFiles.length} files:\n`);
const byType = {};
for (const issue of ISSUES) {
  if (!byType[issue.type]) byType[issue.type] = [];
  byType[issue.type].push(issue);
}
for (const [type, items] of Object.entries(byType)) {
  console.log(`[${type}] ${items.length} occurrence(s):`);
  for (const item of items.slice(0, 20)) {
    const detail = item.key || item.message || JSON.stringify(item);
    console.log(`  ${path.relative(process.cwd(), item.file)}: ${detail}`);
  }
  if (items.length > 20) console.log(`  ... and ${items.length - 20} more`);
  console.log();
}

process.exit(1);

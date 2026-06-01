#!/usr/bin/env node
// ABOUTME: Restructure flat key paths into nested namespaces for i18next compatibility.
// ABOUTME: Converts {"navigation.dashboard.title": "X"} to {"navigation": {"dashboard": {"title": "X"}}}.
// ABOUTME: Creates .bak backups before modifying files.
const fs = require('fs');
const path = require('path');

const ROOTS = [
  path.join(__dirname, '..', 'src', 'i18n', 'locales'),
  path.join(__dirname, '..', 'src', 'modules'),
];

function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build'].includes(entry.name)) continue;
      results.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

function unflattenObject(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.includes('.') && value !== null && typeof value !== 'object') {
      // Flat dotted key
      const parts = key.split('.');
      let cursor = result;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
        cursor = cursor[part];
      }
      cursor[parts[parts.length - 1]] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

let totalFiles = 0;
let modifiedFiles = 0;
let totalRestructures = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    totalFiles++;
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      continue;
    }
    const flatKeys = Object.keys(parsed).filter(k => k.includes('.'));
    if (flatKeys.length === 0) continue;

    const restructured = unflattenObject(parsed);
    // Backup
    const backup = file + '.bak';
    if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
    fs.writeFileSync(file, JSON.stringify(restructured, null, 2) + '\n', 'utf8');
    modifiedFiles++;
    totalRestructures += flatKeys.length;
    console.log(`[RESTRUCTURED] ${path.relative(process.cwd(), file)}: ${flatKeys.length} flat keys → nested`);
  }
}

console.log(`\n[fix-translation-namespaces] Scanned ${totalFiles} files`);
console.log(`[fix-translation-namespaces] Modified ${modifiedFiles} files`);
console.log(`[fix-translation-namespaces] Restructured ${totalRestructures} key(s)`);
if (modifiedFiles > 0) console.log(`[fix-translation-namespaces] Backups: *.bak files in same directory`);
process.exit(0);

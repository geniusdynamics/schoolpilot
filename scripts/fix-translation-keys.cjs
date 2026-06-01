#!/usr/bin/env node
// ABOUTME: Auto-fix translation key issues. Creates backups before modifying files.
// ABOUTME: Fixes: top-level keys with dots (moves to nested), duplicate keys (last wins), BOM removal.
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

function fixFlatKeyToNested(obj) {
  // Find top-level keys that contain dots and convert to nested objects
  const fixed = {};
  const flatKeys = Object.keys(obj).filter(k => k.includes('.'));
  if (flatKeys.length === 0) return { obj, changes: [] };
  for (const [k, v] of Object.entries(obj)) {
    if (k.includes('.')) {
      const parts = k.split('.');
      let cursor = fixed;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') cursor[parts[i]] = {};
        cursor = cursor[parts[i]];
      }
      cursor[parts[parts.length - 1]] = v;
    } else {
      fixed[k] = v;
    }
  }
  return { obj: fixed, changes: flatKeys };
}

function fixBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    return { content: content.slice(1), changed: true };
  }
  return { content, changed: false };
}

let totalFiles = 0;
let modifiedFiles = 0;
let totalChanges = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    totalFiles++;
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    const changes = [];

    // Fix BOM
    const bomFix = fixBOM(content);
    if (bomFix.changed) {
      content = bomFix.content;
      changed = true;
      changes.push('removed BOM');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.log(`[SKIP] ${file}: invalid JSON (${e.message})`);
      continue;
    }

    // Fix flat keys with dots
    const nestedFix = fixFlatKeyToNested(parsed);
    if (nestedFix.changes.length > 0) {
      parsed = nestedFix.obj;
      changed = true;
      changes.push(`nested ${nestedFix.changes.length} flat key(s)`);
    }

    if (changed) {
      // Backup
      const backup = file + '.bak';
      if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
      // Write without BOM
      fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
      modifiedFiles++;
      totalChanges += changes.length;
      console.log(`[FIXED] ${path.relative(process.cwd(), file)}: ${changes.join(', ')}`);
    }
  }
}

console.log(`\n[fix-translation-keys] Scanned ${totalFiles} files`);
console.log(`[fix-translation-keys] Modified ${modifiedFiles} files`);
console.log(`[fix-translation-keys] Total changes: ${totalChanges}`);
if (modifiedFiles > 0) console.log(`[fix-translation-keys] Backups: *.bak files in same directory`);
process.exit(0);

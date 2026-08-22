#!/usr/bin/env node
// ABOUTME: Backfills missing translation keys/files in target locales from the en source
// ABOUTME: of truth. Existing translations are never overwritten — only gaps are filled
// ABOUTME: with the English value as a placeholder awaiting proper translation.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EN_DIR = path.join(ROOT, 'src', 'i18n', 'locales', 'en');
const TARGET_LANGS = process.argv.slice(2).length ? process.argv.slice(2) : ['fr', 'rw', 'sw'];

function deepFill(template, target) {
  let added = 0;
  for (const key of Object.keys(template)) {
    const tVal = template[key];
    if (!(key in target)) {
      target[key] = tVal;
      added++;
    } else if (
      tVal && typeof tVal === 'object' && !Array.isArray(tVal) &&
      target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
    ) {
      added += deepFill(tVal, target[key]);
    }
  }
  return added;
}

let totalAdded = 0;
for (const lang of TARGET_LANGS) {
  const langDir = path.join(ROOT, 'src', 'i18n', 'locales', lang);
  fs.mkdirSync(langDir, { recursive: true });

  for (const file of fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json'))) {
    const enPath = path.join(EN_DIR, file);
    const langPath = path.join(langDir, file);
    const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const langData = fs.existsSync(langPath)
      ? JSON.parse(fs.readFileSync(langPath, 'utf8'))
      : {};

    const added = deepFill(enData, langData);
    if (added > 0 || !fs.existsSync(langPath)) {
      fs.writeFileSync(langPath, JSON.stringify(langData, null, 2) + '\n', 'utf8');
      totalAdded += added;
      console.log(`[${lang}/${file}] filled ${added} missing key(s)`);
    }
  }
}
console.log(`[sync-locales] done — ${totalAdded} placeholder key(s) added across ${TARGET_LANGS.join(', ')}`);

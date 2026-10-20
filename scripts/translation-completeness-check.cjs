#!/usr/bin/env node
// ABOUTME: Verify all i18n locale files have matching key structure across all languages.
// ABOUTME: Exits 0 when complete, 1 when missing translations are detected.
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const LANGUAGES = ['en', 'fr', 'rw', 'sw'];
const SOURCE_LANG = 'en';

function getKeys(obj, prefix = '') {
  const keys = [];
  if (!obj || typeof obj !== 'object') return keys;
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...getKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

function loadLocale(lang) {
  const dir = path.join(LOCALES_DIR, lang);
  if (!fs.existsSync(dir)) return {};
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const data = {};
  for (const f of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      data[f] = { content, keys: getKeys(content) };
    } catch (e) {
      console.error(`[ERROR] ${lang}/${f} is invalid JSON: ${e.message}`);
      process.exit(1);
    }
  }
  return data;
}

let hasErrors = false;
const enData = loadLocale(SOURCE_LANG);
console.log(`\n[check-translations] Source language: ${SOURCE_LANG}`);
console.log(`[check-translations] Files: ${Object.keys(enData).join(', ')}`);

// Check each language has the same files
for (const lang of LANGUAGES) {
  if (lang === SOURCE_LANG) continue;
  const langData = loadLocale(lang);
  const enFiles = new Set(Object.keys(enData));
  const langFiles = new Set(Object.keys(langData));

  const missingFiles = [...enFiles].filter(f => !langFiles.has(f));
  if (missingFiles.length > 0) {
    console.log(`\n[${lang}] MISSING FILES: ${missingFiles.join(', ')}`);
    hasErrors = true;
  }

  // Check key parity for common files
  for (const file of [...enFiles].filter(f => langFiles.has(f))) {
    const enKeys = new Set(enData[file].keys);
    const langKeys = new Set(langData[file].keys);
    const missingKeys = [...enKeys].filter(k => !langKeys.has(k));
    if (missingKeys.length > 0) {
      console.log(`\n[${lang}/${file}] MISSING KEYS: ${missingKeys.length}`);
      missingKeys.slice(0, 10).forEach(k => console.log(`  - ${k}`));
      if (missingKeys.length > 10) console.log(`  ... and ${missingKeys.length - 10} more`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.log('\n[check-translations] FAILED: Missing translations detected');
  console.log('[check-translations] To fix: copy missing keys from en/ to other languages');
  process.exit(1);
} else {
  console.log('\n[check-translations] OK: All translations complete');
  process.exit(0);
}

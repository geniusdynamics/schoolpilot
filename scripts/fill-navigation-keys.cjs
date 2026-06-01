// ABOUTME: Add missing navigation keys from module definitions to navigation.json
// ABOUTME: Reads scripts/extract-navigation-keys output and merges into all 4 locales

const fs = require('fs');
const path = require('path');

const LANGS = ['en', 'fr', 'rw', 'sw'];

// Get all navigation keys from module definitions
const moduleFiles = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name === 'moduleDefinition.tsx' || f.name === 'moduleDefinition.ts') moduleFiles.push(p);
  }
}
walk('src/modules');

const allKeys = new Set();
for (const f of moduleFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.matchAll(/name:\s*['"]([^'"]+)['"]/g);
  for (const m of matches) {
    if (m[1].startsWith('navigation:')) {
      allKeys.add(m[1].substring('navigation:'.length));
    }
  }
}

console.log('Total unique navigation keys needed:', allKeys.size);

function flatten(obj, prefix = '', out = {}) {
  for (const k of Object.keys(obj || {})) {
    const v = obj[k];
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

function setKey(obj, path, val) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
}

// Process each language
for (const lang of LANGS) {
  const filePath = `src/i18n/locales/${lang}/navigation.json`;
  const nav = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const flat = flatten(nav);

  const missing = [...allKeys].filter(k => !(k in flat));
  let added = 0;

  for (const k of missing) {
    // Generate fallback: convert camelCase to Title Case with spaces
    // e.g., "feeRules" -> "Fee Rules"
    // e.g., "administration.title" -> already has title
    const parts = k.split('.');
    const lastKey = parts[parts.length - 1];
    let displayName = lastKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim();

    // For the special ".title" keys, use module name
    if (lastKey === 'title' && parts.length === 2) {
      displayName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }

    // Special cases by language
    if (lang === 'fr') {
      // Keep English for now - will be translated in follow-up
      setKey(nav, k, displayName);
    } else if (lang === 'rw') {
      // Keep English fallback for Kinyarwanda
      setKey(nav, k, displayName);
    } else if (lang === 'sw') {
      // Keep English fallback for Swahili
      setKey(nav, k, displayName);
    } else {
      setKey(nav, k, displayName);
    }
    added++;
  }

  if (added > 0) {
    fs.writeFileSync(filePath, JSON.stringify(nav, null, 2), 'utf8');
    console.log(`${lang}/navigation.json: added ${added} missing keys`);
  } else {
    console.log(`${lang}/navigation.json: no missing keys`);
  }
}

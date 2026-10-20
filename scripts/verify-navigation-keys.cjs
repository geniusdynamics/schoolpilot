// ABOUTME: Verify all navigation keys from module definitions are in navigation.json
// ABOUTME: Reports missing keys per locale

const fs = require('fs');
const path = require('path');

const LANGS = ['en', 'fr', 'rw', 'sw'];

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (f.name === 'moduleDefinition.tsx' || f.name === 'moduleDefinition.ts') out.push(p);
  }
  return out;
}

const files = walk('src/modules');
const allKeys = new Set();
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.matchAll(/name:\s*['"]([^'"]+)['"]/g);
  for (const m of matches) {
    if (m[1].startsWith('navigation:')) {
      allKeys.add(m[1].substring(11));
    }
  }
}

console.log('Total unique navigation keys needed:', allKeys.size);
console.log('---');

function flatten(obj, prefix = '', out = {}) {
  for (const k of Object.keys(obj || {})) {
    const v = obj[k];
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

for (const lang of LANGS) {
  const nav = JSON.parse(fs.readFileSync(`src/i18n/locales/${lang}/navigation.json`, 'utf8'));
  const flat = flatten(nav);
  const missing = [...allKeys].filter(k => !(k in flat));
  console.log(`${lang}/navigation.json: ${allKeys.size - missing.length}/${allKeys.size} keys present, ${missing.length} missing`);
  if (missing.length > 0 && missing.length < 20) {
    console.log('  Missing: ' + missing.join(', '));
  }
}

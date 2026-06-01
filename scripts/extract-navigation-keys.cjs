// ABOUTME: Extract all navigation: keys from module definitions
// ABOUTME: Used to audit the navigation.json completeness

const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (f.name === 'moduleDefinition.tsx' || f.name === 'moduleDefinition.ts') out.push(p);
  }
  return out;
}

const files = walk('src/modules');
const allNames = [];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.matchAll(/name:\s*['"]([^'"]+)['"]/g);
  for (const m of matches) {
    const name = m[1];
    if (name.startsWith('navigation:')) {
      allNames.push({ file: f, name });
    }
  }
}

console.log('Total navigation: items:', allNames.length);
const unique = new Set();
for (const n of allNames) unique.add(n.name);
console.log('Unique:', unique.size);
console.log('---');
for (const n of [...unique].sort()) console.log('  ' + n);

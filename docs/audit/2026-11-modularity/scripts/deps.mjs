// ABOUTME: Prints each module folder's declared dependencies from module.json and from moduleDefinition.tsx,
// ABOUTME: so the two manifests can be compared with each other and with the import graph.
// Usage: node deps.mjs <repoRoot>

import fs from 'node:fs';
import path from 'node:path';

const MODS = path.join(path.resolve(process.argv[2]), 'src', 'modules');
for (const dir of fs.readdirSync(MODS)) {
  const base = path.join(MODS, dir);
  if (!fs.statSync(base).isDirectory() || dir.startsWith('__')) continue;
  let json = '-';
  const jsonPath = path.join(base, 'module.json');
  if (fs.existsSync(jsonPath)) {
    const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    json = `id=${manifest.id} req=[${(manifest.dependencies || []).map((d) => d.moduleId).join(',')}] opt=[${(manifest.optionalDependencies || []).map((d) => d.moduleId).join(',')}]`;
  }
  let def = '-';
  const defPath = path.join(base, 'moduleDefinition.tsx');
  if (fs.existsSync(defPath)) {
    const source = fs.readFileSync(defPath, 'utf8');
    const id = (source.match(/\bid:\s*'([^']+)'/) || [])[1];
    const block = (name) => {
      const match = source.match(new RegExp(`\\b${name}:\\s*\\[([\\s\\S]*?)\\]\\s*,`));
      return match ? [...match[1].matchAll(/moduleId:\s*'([^']+)'/g)].map((x) => x[1]).join(',') : '';
    };
    def = `id=${id} req=[${block('dependencies')}] opt=[${block('optionalDependencies')}]`;
  }
  console.log(`${dir.padEnd(15)} json: ${json.padEnd(60)} def: ${def}`);
}

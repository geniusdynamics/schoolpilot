// ABOUTME: Verifies the modularity audit scripts against a small fixture tree: the import graph
// ABOUTME: produced from a known source layout is checked against the M1/M2/M3 baselines printed by report.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GRAPH = path.join(ROOT, 'scripts', 'modularity', 'graph.mjs');
const REPORT = path.join(ROOT, 'scripts', 'modularity', 'report.mjs');

function buildFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp3-modularity-'));
  const files = {
    'src/index.tsx': `import './services/database/demoDataSeed';\nimport App from './App';\nexport default App;\n`,
    'src/App.tsx': `import A from './modules/a/pages/A';\nexport default A;\n`,
    'src/modules/a/pages/A.tsx': `import { fromB } from '../../b/x';\nimport type { BType } from '../../b/types';\nexport const a = fromB;\nexport type A = BType;\n`,
    'src/modules/b/x.ts': `export const fromB = 1;\n`,
    'src/modules/b/types.ts': `export type BType = string;\n`,
    'src/modules/b/data/mockData.ts': `export const rows: unknown[] = [];\n`,
    'src/domain/d.ts': `import { hasPermission } from '@/data/auth';\nconsole.log(hasPermission);\n`,
    'src/data/auth/index.ts': `export const hasPermission = () => true;\n`,
    'src/data/repository/index.ts': `export const repo = {};\n`,
    'src/services/database/demoDataSeed.ts': `const rows = import.meta.glob('../../modules/b/data/mockData.ts', { eager: true });\nconsole.log(rows);\n`,
  };
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(dir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return dir;
}

function run(dir) {
  const edgesPath = path.join(dir, 'edges.json');
  execFileSync(process.execPath, [GRAPH, dir, edgesPath]);
  return execFileSync(process.execPath, [REPORT, edgesPath], { encoding: 'utf8' });
}

test('cross-module runtime and type-only imports are counted separately; eager globs reach startup', () => {
  const dir = buildFixture();
  try {
    const out = run(dir);
    // M1: two a -> b edges, one of them type-only (file type, not a value import).
    assert.match(out, /=== M1 module -> module \(production\) ===\nedges 2 \(runtime 1\)/);
    // M2: two live shared -> module edges — App.tsx's import and the eager glob on the startup path.
    assert.match(out, /=== M2 shared folder -> module \(production, composition files excluded\) ===\nlive: 2 edges in 2 files/);
    assert.match(out, /^ {2}live {2}services\/database\/demoDataSeed\.ts {2}\{"glob-eager":1\}/m);
    // M3: domain -> data outside the persistence ports counts data/auth.
    assert.match(out, /=== M3 domain -> data outside the persistence ports \(production\) ===\nedges 1 \(runtime 1\)/);
    assert.match(out, /domain\/d\.ts:1 -> data\/auth\/index\.ts/);
    // Static startup graph: the glob pulls mockData into modules/b's startup files.
    assert.match(out, /modules\/b: 2 files \(pages 0, mockData 1\)/);
    assert.match(out, /glob-eager/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

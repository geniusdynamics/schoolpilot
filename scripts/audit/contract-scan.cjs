// ABOUTME: Static contract scanner for the school-operations audit (docs/audit/2026-10-school-operations).
// ABOUTME: Reports broken data-layer contracts that TypeScript does not catch; run `node scripts/audit/contract-scan.cjs [--json]`.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const asJson = process.argv.includes('--json');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!/^(node_modules|__tests__|tests|stories|__demos__)$/.test(name)) walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC);
const read = (f) => fs.readFileSync(f, 'utf8');
const rel = (f) => path.relative(ROOT, f);
const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const isUiFile = (f) => /\/(pages|components)\//.test(f);

// ---------------------------------------------------------------------------
// 1. Collections referenced in code but never defined in a collections file
// ---------------------------------------------------------------------------
function definedCollections() {
  const names = new Set();
  const header = /const\s+(\w*[cC]ollections\w*|collectionsDefinition)\s*(?::[^=]+)?=\s*\{/g;
  for (const f of files) {
    const t = read(f);
    for (const m of t.matchAll(header)) {
      // Walk the object literal and collect keys at depth 1 whose value is an object
      let i = m.index + m[0].length;
      let depth = 1;
      let keyStart = i;
      while (i < t.length && depth > 0) {
        const c = t[i];
        if (c === '{') {
          if (depth === 1) {
            const key = t.slice(keyStart, i).match(/([a-z][a-z0-9_]*)\s*:\s*$/);
            if (key) names.add(key[1]);
          }
          depth++;
        } else if (c === '}') {
          depth--;
          if (depth === 1) keyStart = i + 1;
        } else if (c === ',' && depth === 1) {
          keyStart = i + 1;
        }
        i++;
      }
    }
  }
  return names;
}

function referencedCollections() {
  const refs = new Map();
  const re = /(?:useDatabaseCollection|getCollection|useEntityCrud|useCrudFactory)(?:<[^>()]*>)?\(\s*['"]([a-z][a-z0-9_]*)['"]/g;
  for (const f of files) {
    const t = read(f);
    for (const m of t.matchAll(re)) {
      if (!refs.has(m[1])) refs.set(m[1], new Set());
      refs.get(m[1]).add(rel(f));
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// 2. Functions destructured from useAppData() that the runtime value lacks
// ---------------------------------------------------------------------------
function appDataProvidedKeys() {
  const ctxFile = path.join(SRC, 'contexts', 'AppDataContext.tsx');
  const t = read(ctxFile);
  const start = t.indexOf('const contextValue = useMemo(');
  const end = t.indexOf('as any as EnhancedAppDataContextType', start);
  const block = start >= 0 && end > start ? t.slice(start, end) : '';
  const keys = new Set();
  for (const m of block.matchAll(/(?:^|[\s,{])([a-zA-Z_]\w*)\s*(?=[:,}\n])/g)) keys.add(m[1]);
  return keys;
}

const MUTATOR = /^(add|update|delete|remove|create|record|save|get|generate|apply|allocate|issue|return|mark|approve|reject|bulk|import|export|send|process|post|reverse|promote|transfer|enroll|withdraw)[A-Z]/;

function missingAppDataFunctions(provided) {
  const out = [];
  for (const f of files) {
    const t = read(f);
    for (const m of t.matchAll(/const\s*\{([^}]*)\}\s*=\s*useAppData\(\)/g)) {
      const names = m[1].split(',').map((s) => s.trim().split(/[:=\s]/)[0]).filter(Boolean);
      const missing = names.filter((n) => MUTATOR.test(n) && !provided.has(n));
      if (missing.length) out.push({ file: rel(f), line: lineOf(t, m.index), missing });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. update(...) calls with one argument where the contract is (id, data)
// ---------------------------------------------------------------------------
function twoArgUpdaters() {
  const names = new Set();
  for (const f of files) {
    const t = read(f);
    for (const m of t.matchAll(/\b((?:update|edit)[A-Z]\w*)\s*:\s*\(\s*\w+\s*:[^,)]+,\s*\w+/g)) names.add(m[1]);
    for (const m of t.matchAll(/const ((?:update|edit)[A-Z]\w*) = useCallback\(\s*async\s*\(\s*\w+(?:\s*:\s*[\w|<>[\]. ]+)?\s*,/g)) names.add(m[1]);
  }
  return names;
}

function singleArgCalls(updaters) {
  const out = [];
  for (const f of files.filter(isUiFile)) {
    const t = read(f);
    const re = /\b((?:update|edit)[A-Z]\w*)\(/g;
    let m;
    while ((m = re.exec(t))) {
      if (!updaters.has(m[1])) continue;
      if (/(const|function)\s*$/.test(t.slice(Math.max(0, m.index - 20), m.index))) continue;
      let i = m.index + m[0].length;
      let depth = 1;
      let commas = 0;
      let quote = null;
      while (i < t.length && depth > 0) {
        const c = t[i];
        if (quote) {
          if (c === quote && t[i - 1] !== '\\') quote = null;
        } else if (c === '"' || c === "'" || c === '`') quote = c;
        else if ('([{'.includes(c)) depth++;
        else if (')]}'.includes(c)) depth--;
        else if (c === ',' && depth === 1) commas++;
        i++;
      }
      const args = t.slice(m.index + m[0].length, i - 1).trim();
      if (commas === 0 && args.length > 0) {
        out.push({ file: rel(f), line: lineOf(t, m.index), call: `${m[1]}(${args.replace(/\s+/g, ' ').slice(0, 60)})` });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 4. Foreign-key ids coerced to numbers (ids are strings / UUIDs at runtime)
// ---------------------------------------------------------------------------
function numericIdCoercions() {
  const writes = [];
  const selectors = [];
  for (const f of files) {
    if (/mock|generator|seed|dataGeneration/i.test(f)) continue;
    const t = read(f);
    for (const m of t.matchAll(/\b([a-z_]+_id)\s*:\s*(?:Number|parseInt)\(/g)) {
      writes.push({ file: rel(f), line: lineOf(t, m.index), field: m[1] });
    }
    if (isUiFile(f)) {
      for (const m of t.matchAll(/set(Selected)?[A-Za-z]*Id\(\s*(?:e\.target\.value\s*\?\s*)?(?:Number|parseInt)\(e\.target\.value/g)) {
        selectors.push({ file: rel(f), line: lineOf(t, m.index) });
      }
    }
  }
  return { writes, selectors };
}

// ---------------------------------------------------------------------------
// 5. Data hooks backed by in-memory mock state that are imported by UI files
// ---------------------------------------------------------------------------
function mockBackedHooksInUi() {
  const hookFiles = files.filter((f) => /\/data\/use[A-Z]\w*Data\.tsx?$/.test(f));
  const out = [];
  for (const hf of hookFiles) {
    const t = read(hf);
    if (!/useState(?:<[^>]*>)?\(\s*(?:initialMock|mock)/.test(t)) continue;
    if (/useDatabaseCollection|databaseService/.test(t)) continue;
    const hookName = path.basename(hf).replace(/\.tsx?$/, '');
    const users = files.filter((f) => f !== hf && isUiFile(f) && new RegExp(`\\b${hookName}\\b`).test(read(f))).map(rel);
    if (users.length) out.push({ hook: rel(hf), usedBy: users });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 6. Module routes that only exist in `routes:` (dropped by module registration)
// ---------------------------------------------------------------------------
function routesOutsideNavigation() {
  const out = [];
  const regFile = path.join(SRC, 'core', 'moduleRegistration.ts');
  const registrationCopiesRoutes = fs.existsSync(regFile) && /routes\s*:\s*def\.routes/.test(read(regFile));
  for (const f of files.filter((x) => /modules\/[^/]+\/moduleDefinition\.tsx$/.test(x))) {
    const t = read(f);
    const navStart = t.indexOf('navigation:');
    const routesStart = t.indexOf('routes:', navStart);
    if (navStart < 0 || routesStart < 0) continue;
    const navBlock = t.slice(navStart, routesStart);
    const routesBlock = t.slice(routesStart, t.indexOf(']', routesStart));
    const navPaths = new Set();
    for (const m of navBlock.matchAll(/\{[^{}]*path:\s*'([^']+)'[^{}]*\}/g)) {
      if (!/deprecated:\s*true/.test(m[0])) navPaths.add(m[1]);
    }
    for (const m of routesBlock.matchAll(/path:\s*'([^']+)'/g)) {
      if (!navPaths.has(m[1])) out.push({ file: rel(f), path: m[1] });
    }
  }
  return { registrationCopiesRoutes, routes: out };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const defined = definedCollections();
const referenced = referencedCollections();
const undefinedCollections = [...referenced.entries()]
  .filter(([name]) => !defined.has(name))
  .map(([name, users]) => ({ collection: name, usedBy: [...users] }));

const provided = appDataProvidedKeys();
const report = {
  undefinedCollections,
  missingAppDataFunctions: missingAppDataFunctions(provided),
  singleArgUpdateCalls: singleArgCalls(twoArgUpdaters()),
  numericIdCoercions: numericIdCoercions(),
  mockBackedHooksInUi: mockBackedHooksInUi(),
  routesOutsideNavigation: routesOutsideNavigation(),
};

if (asJson) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  const missingFnCount = report.missingAppDataFunctions.reduce((n, r) => n + r.missing.length, 0);
  const lines = [];
  lines.push('# Contract scan');
  lines.push('');
  lines.push(`- Collections referenced but not defined: ${report.undefinedCollections.length}`);
  lines.push(`- useAppData() functions missing at runtime: ${missingFnCount} in ${report.missingAppDataFunctions.length} files`);
  lines.push(`- update(...) calls with one argument against an (id, data) contract: ${report.singleArgUpdateCalls.length}`);
  lines.push(`- Foreign keys coerced with Number()/parseInt on write: ${report.numericIdCoercions.writes.length}`);
  lines.push(`- Id selectors coerced with Number()/parseInt: ${report.numericIdCoercions.selectors.length}`);
  lines.push(`- Mock-backed data hooks used by UI: ${report.mockBackedHooksInUi.length}`);
  lines.push(`- Routes declared outside navigation: ${report.routesOutsideNavigation.routes.length} (registration copies routes: ${report.routesOutsideNavigation.registrationCopiesRoutes})`);
  lines.push('');
  lines.push('## Collections referenced but not defined');
  for (const r of report.undefinedCollections) lines.push(`- \`${r.collection}\` — ${r.usedBy.join(', ')}`);
  lines.push('');
  lines.push('## useAppData() functions missing at runtime');
  for (const r of report.missingAppDataFunctions) lines.push(`- ${r.file}:${r.line} — ${r.missing.join(', ')}`);
  lines.push('');
  lines.push('## Single-argument update calls');
  for (const r of report.singleArgUpdateCalls) lines.push(`- ${r.file}:${r.line} — \`${r.call}\``);
  lines.push('');
  lines.push('## Numeric id coercions (writes)');
  for (const r of report.numericIdCoercions.writes) lines.push(`- ${r.file}:${r.line} — ${r.field}`);
  lines.push('');
  lines.push('## Numeric id coercions (selectors)');
  for (const r of report.numericIdCoercions.selectors) lines.push(`- ${r.file}:${r.line}`);
  lines.push('');
  lines.push('## Mock-backed hooks used by UI');
  for (const r of report.mockBackedHooksInUi) lines.push(`- ${r.hook} — ${r.usedBy.join(', ')}`);
  lines.push('');
  lines.push('## Routes declared outside navigation');
  for (const r of report.routesOutsideNavigation.routes) lines.push(`- ${r.path} (${r.file})`);
  process.stdout.write(lines.join('\n') + '\n');
}

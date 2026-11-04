// ABOUTME: Builds the src/ import graph with the TypeScript parser: imports, re-exports, import(), require,
// ABOUTME: vi.mock, import types, import.meta.glob (expanded) and new URL(..., import.meta.url); writes edges JSON.
// Usage: node graph.mjs <repoRoot> <outJson>   (uses the tree's or the script's node_modules/typescript; reads only)

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.argv[2]);
const OUT = process.argv[3];
// Prefer the scanned tree's own TypeScript; fall back to the script's package so fixture
// trees (node --test) without node_modules still parse.
const here = path.dirname(fileURLToPath(import.meta.url));
const tsCandidates = [
  path.join(ROOT, 'node_modules', 'typescript', 'lib', 'typescript.js'),
  path.join(here, '..', '..', 'node_modules', 'typescript', 'lib', 'typescript.js'),
];
const tsPath = tsCandidates.find((p) => fs.existsSync(p));
if (!tsPath) throw new Error('typescript not found: looked in the scanned tree and next to the script');
const ts = (await import(pathToFileURL(tsPath).href)).default;
const SRC = path.join(ROOT, 'src');
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (EXTS.includes(path.extname(entry.name)) && !entry.name.endsWith('.d.ts')) acc.push(full);
  }
  return acc;
}

const posix = (p) => p.split(path.sep).join('/');
const rel = (p) => posix(path.relative(SRC, p));
const isTest = (r) =>
  /(^|\/)(__tests__|__mocks__|__fixtures__)\//.test(r) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(r) || /(^|\/)setupTests\./.test(r);

function area(r) {
  const parts = r.split('/');
  if (parts.length === 1) return 'root';
  if (parts[0] === 'modules' || parts[0] === 'domain') return `${parts[0]}/${parts[1]}`;
  return parts[0];
}

function resolveSpec(fromFile, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  const candidates = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => path.join(base, 'index' + e))];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return base; // unresolved, still classifiable by directory
}

function scriptKind(file) {
  const ext = path.extname(file);
  if (ext === '.tsx') return ts.ScriptKind.TSX;
  if (ext === '.jsx') return ts.ScriptKind.JSX;
  if (ext === '.ts') return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

const edges = [];
const files = walk(SRC, []);
const allPosix = files.map(posix);

// Expands a Vite import.meta.glob pattern (relative, /root-absolute or @/ alias) to the matching source files.
function expandGlob(fromFile, pattern) {
  let base;
  if (pattern.startsWith('@/')) base = path.join(SRC, pattern.slice(2));
  else if (pattern.startsWith('/')) base = path.join(ROOT, pattern.slice(1));
  else base = path.resolve(path.dirname(fromFile), pattern);
  const abs = posix(base);
  let re = '';
  for (let i = 0; i < abs.length; i++) {
    const ch = abs[i];
    if (ch === '*' && abs[i + 1] === '*') { re += '.*'; i++; if (abs[i + 1] === '/') i++; }
    else if (ch === '*') re += '[^/]*';
    else if (ch === '{') { const end = abs.indexOf('}', i); re += '(' + abs.slice(i + 1, end).split(',').map((s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&')).join('|') + ')'; i = end; }
    else re += ch.replace(/[.+^$()|[\]\\?]/g, '\\$&');
  }
  const rx = new RegExp('^' + re + '$');
  return allPosix.filter((f) => rx.test(f));
}

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file));
  const fromRel = rel(file);
  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const record = (toRel, spec, line, kind, typeOnly, names) =>
    edges.push({ from: fromRel, to: toRel, spec, line, kind, typeOnly, names, test: isTest(fromRel), fromArea: area(fromRel), toArea: area(toRel) });
  const push = (spec, node, kind, typeOnly, names) => {
    const resolved = resolveSpec(file, spec);
    if (!resolved) return;
    const toRel = rel(resolved);
    if (toRel.startsWith('..')) return;
    record(toRel, spec, lineOf(node), kind, typeOnly, names);
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      let typeOnly = false;
      const names = [];
      if (clause) {
        if (clause.isTypeOnly) typeOnly = true;
        else if (!clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          const els = clause.namedBindings.elements;
          typeOnly = els.length > 0 && els.every((e) => e.isTypeOnly);
        }
        if (clause.name) names.push('default');
        if (clause.namedBindings) {
          if (ts.isNamedImports(clause.namedBindings)) names.push(...clause.namedBindings.elements.map((e) => (e.isTypeOnly ? 'type ' : '') + (e.propertyName || e.name).text));
          else names.push('* as ' + clause.namedBindings.name.text);
        }
      }
      push(node.moduleSpecifier.text, node, 'import', typeOnly, names);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      let typeOnly = node.isTypeOnly;
      let names = ['*'];
      if (!typeOnly && node.exportClause && ts.isNamedExports(node.exportClause)) {
        const els = node.exportClause.elements;
        typeOnly = els.length > 0 && els.every((e) => e.isTypeOnly);
        names = els.map((e) => (e.isTypeOnly ? 'type ' : '') + (e.propertyName || e.name).text);
      }
      push(node.moduleSpecifier.text, node, 'reexport', typeOnly, names);
    } else if (ts.isCallExpression(node) && node.expression.getText(sf) === 'import.meta.glob') {
      const first = node.arguments[0];
      const patterns = first && ts.isArrayLiteralExpression(first) ? first.elements.filter(ts.isStringLiteral).map((e) => e.text) : first && ts.isStringLiteral(first) ? [first.text] : [];
      const opts = node.arguments[1];
      const eager = !!(opts && ts.isObjectLiteralExpression(opts) && opts.properties.some((p) => ts.isPropertyAssignment(p) && p.name.getText(sf) === 'eager' && p.initializer.kind === ts.SyntaxKind.TrueKeyword));
      const include = new Set();
      for (const pat of patterns.filter((p) => !p.startsWith('!'))) for (const f of expandGlob(file, pat)) include.add(f);
      for (const pat of patterns.filter((p) => p.startsWith('!'))) for (const f of expandGlob(file, pat.slice(1))) include.delete(f);
      for (const f of include) record(rel(f), patterns.join(' '), lineOf(node), eager ? 'glob-eager' : 'glob-lazy', false, []);
    } else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL' && node.arguments && node.arguments.length === 2 && ts.isStringLiteral(node.arguments[0]) && node.arguments[1].getText(sf) === 'import.meta.url') {
      push(node.arguments[0].text, node, 'url', false, []);
    } else if (ts.isCallExpression(node)) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) push(arg.text, node, 'dynamic', false, []);
        else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') push(arg.text, node, 'require', false, []);
        else if (ts.isPropertyAccessExpression(node.expression) && /^(vi|jest)$/.test(node.expression.expression.getText(sf)) && /^(mock|doMock)$/.test(node.expression.name.text)) push(arg.text, node, 'mock', false, []);
      }
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      push(node.argument.literal.text, node, 'importType', true, []);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

fs.writeFileSync(OUT, JSON.stringify({ fileCount: files.length, edges }));
console.log('files', files.length, 'edges', edges.length);

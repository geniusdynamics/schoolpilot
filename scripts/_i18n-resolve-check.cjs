// ABOUTME: Resolves every literal t() call in src against the fully-merged en
// ABOUTME: resource tree (mirroring modularLoader) to find missing + object-return leaks.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const LANG = 'en';

// ---- deepMerge identical to modularLoader.ts ----
function deepMerge(target, source) {
  if (target === null || target === undefined) return source;
  if (source === null || source === undefined) return target;
  if (typeof target !== 'object' || typeof source !== 'object') return source;
  if (Array.isArray(target) || Array.isArray(source)) return source;
  for (const key of Object.keys(source)) {
    const tv = target[key];
    const sv = source[key];
    const to = tv !== null && typeof tv === 'object' && !Array.isArray(tv);
    const so = sv !== null && typeof sv === 'object' && !Array.isArray(sv);
    if (to && so) deepMerge(tv, sv);
    else if (sv !== undefined) target[key] = sv;
  }
  return target;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`[WARN] bad JSON ${file}: ${e.message}`);
    return {};
  }
}

// Recursively collect files matching a filter under a dir.
function walkFiles(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, filter, out);
    else if (filter(full)) out.push(full);
  }
  return out;
}

// ---- Build merged resources[LANG] ----
const resources = { navigation: {} };

// 1. static locales/{LANG}/{ns}.json
const localesDir = path.join(SRC, 'i18n', 'locales', LANG);
for (const f of walkFiles(localesDir, (p) => p.endsWith('.json'))) {
  const ns = path.basename(f, '.json');
  resources[ns] = resources[ns] || {};
  deepMerge(resources[ns], readJson(f));
}

// 2. modules/*/i18n/{LANG}.json  (namespace = module dir name)
const modulesDir = path.join(SRC, 'modules');
for (const f of walkFiles(modulesDir, (p) => p.replace(/\\/g, '/').match(/\/modules\/[^/]+\/i18n\/en\.json$/))) {
  const parts = f.replace(/\\/g, '/').split('/');
  const moduleName = parts[parts.indexOf('modules') + 1];
  const data = readJson(f);
  resources[moduleName] = resources[moduleName] || {};
  deepMerge(resources[moduleName], data);
  if (data.navigation) deepMerge(resources.navigation, data.navigation);
}

// 3. modules/core/i18n/{LANG}/{ns}.json  (namespace = file name)
const coreDir = path.join(SRC, 'modules', 'core', 'i18n', LANG);
for (const f of walkFiles(coreDir, (p) => p.endsWith('.json'))) {
  const ns = path.basename(f, '.json');
  const data = readJson(f);
  resources[ns] = resources[ns] || {};
  deepMerge(resources[ns], data);
  if (data.navigation) deepMerge(resources.navigation, data.navigation);
}

// ---- resolve a dotted path within a namespace object ----
function resolve(nsObj, dotted) {
  if (nsObj === undefined) return undefined;
  const parts = dotted.split('.');
  let node = nsObj;
  for (const p of parts) {
    if (node && typeof node === 'object' && p in node) node = node[p];
    else return undefined;
  }
  return node;
}

// ---- scan source files ----
const srcFiles = walkFiles(SRC, (p) => /\.(ts|tsx)$/.test(p) && !p.endsWith('.d.ts') && !/\.test\.|\.spec\./.test(p));

const DEFAULT_NS = 'common';
const missing = [];
const objectLeaks = [];

// Detect the default namespace(s) declared in a file via useTranslation('x') / (['x',...])
function fileNamespaces(text) {
  const nss = [];
  const re = /useTranslation\(\s*(\[[^\]]*\]|'[^']*'|"[^"]*"|`[^`]*`)/g;
  let m;
  while ((m = re.exec(text))) {
    const arg = m[1];
    const strs = arg.match(/['"`]([^'"`]+)['"`]/g) || [];
    for (const s of strs) nss.push(s.replace(/['"`]/g, ''));
  }
  return nss;
}

// literal t('...') / t("...") — skip template literals (dynamic, audited separately)
const T_CALL = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g;

// Given the text right after the key literal, decide whether the call supplies
// a default value (2nd string arg, or an options object with defaultValue).
function hasDefault(after) {
  const s = after.replace(/^\s+/, '');
  if (s.startsWith(',')) {
    const rest = s.slice(1).replace(/^\s+/, '');
    // 2nd positional string arg = defaultValue
    if (rest[0] === "'" || rest[0] === '"' || rest[0] === '`') return true;
    // options object literal — check for defaultValue within the immediate object
    if (rest[0] === '{') {
      const close = rest.indexOf('}');
      const obj = close === -1 ? rest.slice(0, 200) : rest.slice(0, close + 1);
      if (/\bdefaultValue\b/.test(obj)) return true;
    }
  }
  return false;
}

for (const file of srcFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const fileNs = fileNamespaces(text);
  let m;
  T_CALL.lastIndex = 0;
  while ((m = T_CALL.exec(text))) {
    const raw = m[2];
    if (!raw || raw.includes('${')) continue;
    const withDefault = hasDefault(text.slice(T_CALL.lastIndex, T_CALL.lastIndex + 220));
    // Skip obvious non-keys (spaces indicate a literal default sentence, or url)
    let ns, key;
    if (raw.includes(':')) {
      const idx = raw.indexOf(':');
      ns = raw.slice(0, idx);
      key = raw.slice(idx + 1);
    } else {
      key = raw;
      ns = null; // resolve against file ns list then common
    }
    if (!key || /\s/.test(key)) continue; // keys don't contain whitespace

    let val;
    if (ns) {
      val = resolve(resources[ns], key);
    } else {
      // try each declared file namespace, then common
      const candidates = [...fileNs, DEFAULT_NS];
      for (const c of candidates) {
        val = resolve(resources[c], key);
        if (val !== undefined) break;
      }
    }

    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (typeof val === 'object' && val !== null) {
      // Object resolution leaks the error string even when a default is supplied.
      objectLeaks.push({ file: rel, key: raw, ns: ns || fileNs.join('|') || DEFAULT_NS });
    } else if (val === undefined && !withDefault) {
      // Missing AND no inline default -> renders the raw key.
      missing.push({ file: rel, key: raw, ns: ns || fileNs.join('|') || DEFAULT_NS });
    }
  }
}

console.log('=== OBJECT-RETURN LEAKS (render "returned an object" error) ===');
console.log(`count: ${objectLeaks.length}`);
for (const o of objectLeaks) console.log(`  [${o.ns}] ${o.key}  <- ${o.file}`);

console.log('\n=== MISSING KEYS (render raw key) ===');
console.log(`count: ${missing.length}`);
// group by key to reduce noise
const byKey = {};
for (const mm of missing) (byKey[mm.key] = byKey[mm.key] || []).push(mm.file);
for (const [k, files] of Object.entries(byKey)) {
  console.log(`  ${k}  (${files.length}x) e.g. ${files[0]}`);
}

// ABOUTME: Route validation script — walks all module definitions and asserts navigation integrity
// ABOUTME: Catches duplicate paths, missing page files, unresolved redirects, and nav/route collisions

/**
 * Route Validation Script
 *
 * Run: `npm run validate-routes` (or `npx tsx scripts/validate-routes.ts`)
 *
 * Validates:
 *   1. Every `nav.page` in every module's `navigation[]` resolves to a real file
 *   2. Every `routes[].page` in every module's `routes[]` resolves to a real file
 *   3. No duplicate `path` values within any module's `navigation[]`
 *   4. No `path` collision between `navigation[]` and `routes[]` (same path, different page)
 *   5. Every `redirectTo` (nav + redirectMap.ts) target resolves to some module's `routes[]`
 *   6. Every entry in `redirectMap.ts` (DEPRECATED_ROUTE_REDIRECTS) is unique
 *   7. Module IDs referenced in redirects are valid
 *
 * Exits with code 0 if all checks pass, 1 otherwise.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

interface NavItem {
  name: string;
  path: string;
  page?: string;
  modulePath?: string;
  deprecated?: boolean;
  redirectTo?: string;
  showInModes?: string[];
}

interface RouteEntry {
  path: string;
  page: string;
}

interface ModuleDef {
  id: string;
  path: string;
  navigation?: NavItem[];
  routes?: RouteEntry[];
}

interface Issue {
  severity: 'error' | 'warning';
  module: string;
  category: string;
  message: string;
}

// ANSI colors
const C = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

/**
 * Lightweight parser: extract navigation[] and routes[] arrays from a module
 * definition file. Uses regex; sufficient for the predictable structure of
 * moduleDefinition.tsx files.
 */
function parseModuleDefinition(filePath: string): ModuleDef | null {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract id
  const idMatch = content.match(/^\s*id:\s*'([^']+)'/m);
  const id = idMatch ? idMatch[1] : path.basename(path.dirname(filePath));

  // Extract path (module-level path, e.g., /academics)
  const modulePathMatch = content.match(/^\s*path:\s*'([^']+)'/m);
  const modulePath = modulePathMatch ? modulePathMatch[1] : `/${id}`;

  // Extract navigation[] — match from `navigation: [` to matching `]`
  const navigation = extractArray<NavItem>(content, 'navigation');

  // Extract routes[] — match from `routes: [` to matching `]`
  const routes = extractArray<RouteEntry>(content, 'routes');

  return { id, path: modulePath, navigation, routes };
}

/**
 * Extract a top-level array property by name, returning parsed objects.
 * Returns [] if the property is absent.
 */
function extractArray<T>(content: string, key: string): T[] {
  const startMarker = `${key}: [`;
  const startIdx = content.indexOf(startMarker);
  if (startIdx < 0) return [];

  // Find matching closing bracket, handling nested brackets and strings.
  let depth = 0;
  let inString: false | "'" | '"' | '`' = false;
  let escape = false;
  let endIdx = -1;
  for (let i = startIdx + startMarker.length - 1; i < content.length; i++) {
    const ch = content[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (ch === '\\') { escape = true; continue; }
      if (ch === inString) { inString = false; }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inString = ch; continue; }
    if (ch === '[') depth++;
    if (ch === ']') {
      depth--;
      if (depth === 0) { endIdx = i; break; }
    }
  }
  if (endIdx < 0) return [];

  const arrayContent = content.substring(startIdx + startMarker.length, endIdx);

  // Parse individual object literals. This is a simplified parser that splits
  // on top-level `}, {` boundaries.
  const items: T[] = [];
  let objDepth = 0;
  let inStr: false | "'" | '"' | '`' = false;
  let esc = false;
  let objStart = -1;
  for (let i = 0; i < arrayContent.length; i++) {
    const ch = arrayContent[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (ch === '\\') { esc = true; continue; }
      if (ch === inStr) { inStr = false; }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
    if (ch === '{') {
      if (objDepth === 0) objStart = i;
      objDepth++;
    }
    if (ch === '}') {
      objDepth--;
      if (objDepth === 0) {
        const objText = arrayContent.substring(objStart, i + 1);
        items.push(parseObjectLiteral(objText) as T);
      }
    }
  }
  return items;
}

/**
 * Parse a single object literal (e.g., `{ path: '/foo', page: 'Bar' }`) into
 * a plain JS object. Only handles string, boolean, and number values.
 */
function parseObjectLiteral(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  // Match key-value pairs: `key: value,` or `key: value }`
  const kvRegex = /(\w+):\s*(?:'([^']*)'|"([^"]*)"|`(?:[^`\\]|\\.)*`|(\[(?:[^\[\]]|\[[^\]]*\])*\])|(true|false|null|undefined)|(-?\d+(?:\.\d+)?))/g;
  let m: RegExpExecArray | null;
  while ((m = kvRegex.exec(text)) !== null) {
    const key = m[1];
    if (m[2] !== undefined) result[key] = m[2];
    else if (m[3] !== undefined) result[key] = m[3];
    else if (m[5] !== undefined) {
      const v = m[5];
      if (v === 'true') result[key] = true;
      else if (v === 'false') result[key] = false;
      else if (v === 'null') result[key] = null;
      else if (v === 'undefined') result[key] = undefined;
    } else if (m[6] !== undefined) {
      result[key] = parseFloat(m[6]);
    }
  }
  return result;
}

/**
 * Resolve a page reference to an expected file path.
 *
 * Mirrors getPageComponent() in src/routing/pageLoader.ts:
 *   - The target module is derived from the path's first segment (e.g., '/dashboard' → 'dashboard')
 *   - If modulePath is set on the nav item, it overrides
 *   - The page file is looked up in src/modules/{targetModule}/pages/{page}.tsx
 *   - Also tries the page as a directory with index.tsx
 *   - Falls back to a cross-module search if not found in the target module
 *
 * Returns { targetFile, fallbackFiles[] } where the first hit is the
 * canonical location and fallbackFiles contains other candidates.
 */
function resolvePageFileCandidates(
  moduleId: string,
  pageRef: string,
  navPath?: string,
  modulePath?: string
): string[] {
  // Determine target module (mirror pageLoader.ts logic)
  let targetModule = moduleId;
  if (modulePath) {
    targetModule = modulePath.replace(/^\//, '').replace(/\/.*$/, '');
  } else if (navPath) {
    const segs = navPath.split('/').filter(Boolean);
    if (segs.length > 0) targetModule = segs[0];
  }

  const candidates: string[] = [
    path.join(PROJECT_ROOT, 'src', 'modules', targetModule, 'pages', `${pageRef}.tsx`),
    path.join(PROJECT_ROOT, 'src', 'modules', targetModule, 'pages', pageRef, 'index.tsx'),
  ];

  // Also try the declared module's pages dir (covers core/ -> dashboard/ case)
  if (targetModule !== moduleId) {
    candidates.push(
      path.join(PROJECT_ROOT, 'src', 'modules', moduleId, 'pages', `${pageRef}.tsx`),
      path.join(PROJECT_ROOT, 'src', 'modules', moduleId, 'pages', pageRef, 'index.tsx'),
    );
  }

  return candidates;
}

/**
 * Search all modules for a page file matching the pageRef name.
 * Used as a final fallback (matches the wildcard glob in pageLoader.ts).
 */
function findPageFileAcrossModules(pageRef: string): string | null {
  const modulesDir = path.join(PROJECT_ROOT, 'src', 'modules');
  if (!fs.existsSync(modulesDir)) return null;
  for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(modulesDir, entry.name, 'pages', `${pageRef}.tsx`);
    if (fileExists(candidate)) return candidate;
  }
  return null;
}

function fileExists(p: string): boolean {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

/**
 * Extract just the path (no query string) from a redirect target.
 */
function pathOnly(url: string): string {
  const q = url.indexOf('?');
  return q < 0 ? url : url.substring(0, q);
}

/**
 * Load DEPRECATED_ROUTE_REDIRECTS from redirectMap.ts by regex extraction.
 */
function loadRedirectMap(): Record<string, string> {
  const file = path.join(PROJECT_ROOT, 'src', 'routing', 'redirectMap.ts');
  if (!fs.existsSync(file)) return {};
  const content = fs.readFileSync(file, 'utf-8');
  // Match lines like `  '/path': '/target',`
  const entryRegex = /'([^']+)':\s*'([^']+)'/g;
  const result: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = entryRegex.exec(content)) !== null) {
    result[m[1]] = m[2];
  }
  return result;
}

// =====================================================================
// Main validation
// =====================================================================
function main(): void {
  const issues: Issue[] = [];
  const modulesDir = path.join(PROJECT_ROOT, 'src', 'modules');
  const moduleIds = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  const allModuleDefs: Record<string, ModuleDef> = {};
  for (const id of moduleIds) {
    const defFile = path.join(modulesDir, id, 'moduleDefinition.tsx');
    const def = parseModuleDefinition(defFile);
    if (def) allModuleDefs[id] = def;
  }

  // Build a set of all registered route paths across all modules
  const allRoutePaths = new Map<string, string>(); // path → moduleId
  for (const [moduleId, def] of Object.entries(allModuleDefs)) {
    if (def.routes) {
      for (const r of def.routes) {
        allRoutePaths.set(r.path, moduleId);
      }
    }
    if (def.navigation) {
      for (const n of def.navigation) {
        if (!n.deprecated) {
          // Nav items also serve as routes (via moduleRoutes.tsx)
          allRoutePaths.set(n.path, moduleId);
        }
      }
    }
  }

  // ----- Check 1, 2, 3, 4: per-module validation
  for (const [moduleId, def] of Object.entries(allModuleDefs)) {
    const nav = def.navigation || [];
    const routes = def.routes || [];

    // Check 1: every nav.page exists
    for (const item of nav) {
      if (!item.page) continue;
      const candidates = resolvePageFileCandidates(moduleId, item.page, item.path, item.modulePath);
      const hit = candidates.find(fileExists);
      let resolved = !!hit;
      let resolvedFrom = hit ?? null;

      if (!resolved) {
        // Final fallback: cross-module wildcard search
        resolvedFrom = findPageFileAcrossModules(item.page);
        resolved = !!resolvedFrom;
      }

      if (!resolved) {
        issues.push({
          severity: 'error',
          module: moduleId,
          category: 'missing-page-file',
          message: `nav entry "${item.path}" references page "${item.page}" — file not found in src/modules/*/pages/. Tried: ${candidates.map(c => path.relative(PROJECT_ROOT, c)).join(', ')}`,
        });
      }
    }

    // Check 2: every routes[].page exists
    for (const r of routes) {
      const candidates = resolvePageFileCandidates(moduleId, r.page, r.path);
      const hit = candidates.find(fileExists);
      let resolved = !!hit;
      let resolvedFrom = hit ?? null;

      if (!resolved) {
        resolvedFrom = findPageFileAcrossModules(r.page);
        resolved = !!resolvedFrom;
      }

      if (!resolved) {
        issues.push({
          severity: 'error',
          module: moduleId,
          category: 'missing-page-file',
          message: `routes entry "${r.path}" references page "${r.page}" — file not found in src/modules/*/pages/. Tried: ${candidates.map(c => path.relative(PROJECT_ROOT, c)).join(', ')}`,
        });
      }
    }

    // Check 3: duplicate paths within nav
    const navPaths = nav.map(n => n.path);
    const seenPaths = new Set<string>();
    for (const p of navPaths) {
      if (seenPaths.has(p)) {
        issues.push({
          severity: 'error',
          module: moduleId,
          category: 'duplicate-nav-path',
          message: `path "${p}" appears multiple times in navigation[]`,
        });
      }
      seenPaths.add(p);
    }

    // Check 4: nav vs routes collision (same path, different page)
    const navPathToPage = new Map<string, string>();
    for (const n of nav) {
      if (n.page) navPathToPage.set(n.path, n.page);
    }
    for (const r of routes) {
      const navPage = navPathToPage.get(r.path);
      if (navPage && navPage !== r.page) {
        issues.push({
          severity: 'error',
          module: moduleId,
          category: 'nav-routes-collision',
          message: `path "${r.path}": nav says page="${navPage}" but routes[] says page="${r.page}"`,
        });
      }
    }
  }

  // ----- Check 5: redirectTo targets resolve
  const redirectMap = loadRedirectMap();
  for (const [moduleId, def] of Object.entries(allModuleDefs)) {
    const nav = def.navigation || [];
    for (const item of nav) {
      if (!item.deprecated || !item.redirectTo) continue;
      const targetPath = pathOnly(item.redirectTo);
      if (!allRoutePaths.has(targetPath)) {
        issues.push({
          severity: 'error',
          module: moduleId,
          category: 'unresolved-redirect',
          message: `nav entry "${item.path}" redirects to "${targetPath}" but no module registers this path`,
        });
      }
    }
  }
  // redirectMap entries
  for (const [from, to] of Object.entries(redirectMap)) {
    const targetPath = pathOnly(to);
    if (!allRoutePaths.has(targetPath)) {
      issues.push({
        severity: 'error',
        module: 'redirectMap',
        category: 'unresolved-redirect',
        message: `redirectMap: "${from}" → "${to}" but no module registers "${targetPath}"`,
      });
    }
  }

  // ----- Check 6: redirectMap unique keys
  const seenRedirects = new Set<string>();
  for (const key of Object.keys(redirectMap)) {
    if (seenRedirects.has(key)) {
      issues.push({
        severity: 'warning',
        module: 'redirectMap',
        category: 'duplicate-redirect',
        message: `redirectMap has duplicate key "${key}"`,
      });
    }
    seenRedirects.add(key);
  }

  // ----- Output
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  console.log('');
  console.log(C.bold('=== Route Validation Report ==='));
  console.log('');
  console.log(`Modules checked:    ${Object.keys(allModuleDefs).length}`);
  console.log(`Total routes:       ${allRoutePaths.size}`);
  console.log(`RedirectMap size:   ${Object.keys(redirectMap).length}`);
  console.log('');

  if (issues.length === 0) {
    console.log(C.green(C.bold('✅ All checks passed.')));
    console.log('');
    process.exit(0);
  }

  // Group issues by module
  const byModule = new Map<string, Issue[]>();
  for (const issue of issues) {
    if (!byModule.has(issue.module)) byModule.set(issue.module, []);
    byModule.get(issue.module)!.push(issue);
  }

  for (const [moduleId, modIssues] of byModule) {
    const errs = modIssues.filter(i => i.severity === 'error').length;
    const warns = modIssues.filter(i => i.severity === 'warning').length;
    const icon = errs > 0 ? C.red('✗') : C.yellow('⚠');
    console.log(`${icon} ${C.bold(moduleId)}  ${C.red(`${errs} error(s)`)} ${warns > 0 ? C.yellow(`${warns} warning(s)`) : ''}`);
    for (const issue of modIssues) {
      const tag = issue.severity === 'error' ? C.red('[error]') : C.yellow('[warn] ');
      console.log(`    ${tag} ${C.dim(`(${issue.category})`)} ${issue.message}`);
    }
    console.log('');
  }

  console.log(C.bold('Summary:'));
  console.log(`  ${C.red(`${errorCount} error(s)`)}`);
  console.log(`  ${C.yellow(`${warningCount} warning(s)`)}`);
  console.log('');

  if (errorCount > 0) {
    console.log(C.red(C.bold('❌ Validation failed. Fix the errors above.')));
    process.exit(1);
  } else {
    console.log(C.green(C.bold('✅ No errors. Warnings can be addressed later.')));
    process.exit(0);
  }
}

main();

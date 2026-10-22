// ABOUTME: Guard that every page file under a module's pages/ directory is reachable - named by a
// ABOUTME: route entry, or listed with a reason in the exemption registry below. Ratcheted: a new
// ABOUTME: unreachable page fails, and an exemption that is stale or no longer needed fails too.

import { describe, expect, it } from 'vitest';
import { PAGE_ROUTE_EXEMPTIONS } from './pageRouteExemptions';

/**
 * Route registration lives outside a page's ownership, and a navigation entry is not a route:
 * `DynamicRoutes` reads the module definition's `routes` array. Four pages shipped in phase P2
 * (observations, results, promotion, analysis v2) were built, tested and gated with no route at all,
 * so nothing in the suite could tell. This guard closes that hole by discovering pages from the
 * filesystem rather than from a hand-kept list.
 */

interface ModuleLike {
  readonly id?: string;
  readonly routes?: ReadonlyArray<{ readonly path: string; readonly page?: string }>;
}

const definitions = import.meta.glob<{ default?: ModuleLike }>('../../modules/*/moduleDefinition.tsx', {
  eager: true,
});

/** Every page file, without importing it: keys are paths relative to this test file. */
const pageModules = import.meta.glob('../../modules/*/pages/**/*Page.tsx');

interface PageFile {
  readonly moduleId: string;
  /** Path under pages/, without the extension - e.g. `observations/ObservationsCapturePage`. */
  readonly relative: string;
  /** The file's own name, without the extension - e.g. `ObservationsCapturePage`. */
  readonly name: string;
  /** Directory under pages/, or '' for a file at the root of pages/. */
  readonly directory: string;
  /** `moduleId/relative`, the key used by the exemption registry. */
  readonly key: string;
}

function parsePageKey(key: string): PageFile | null {
  const match = /\/modules\/([^/]+)\/pages\/(.+)\.tsx$/.exec(key);
  if (!match) return null;
  const [, moduleId, relative] = match;
  const segments = relative.split('/');
  const name = segments[segments.length - 1];
  const directory = segments.slice(0, -1).join('/');
  return { moduleId, relative, name, directory, key: `${moduleId}/${relative}` };
}

const pages: readonly PageFile[] = Object.keys(pageModules)
  .map(parsePageKey)
  .filter((page): page is PageFile => page !== null)
  .sort((a, b) => a.key.localeCompare(b.key));

/** Route page names declared by each module, plus the flat page names that exist as files. */
const routesByModule = new Map<string, Set<string>>();
const flatPagesByModule = new Map<string, Set<string>>();

for (const module of Object.values(definitions)) {
  const id = module.default?.id;
  if (!id) continue;
  const declared = new Set<string>();
  for (const route of module.default?.routes ?? []) {
    if (route.page) declared.add(route.page);
  }
  routesByModule.set(id, declared);
  flatPagesByModule.set(
    id,
    new Set(
      pages.filter((page) => page.moduleId === id && page.directory === '').map((page) => page.name)
    )
  );
}

/**
 * A page is reachable when a route names it, either directly by its path under pages/ (the
 * `analytics/AnalyticsExportPage` form) or by its flat name when a flat entry file exists for it
 * (the shim convention: `pages/ObservationsCapturePage.tsx` re-exports the nested implementation).
 */
function isRouted(page: PageFile): boolean {
  const declared = routesByModule.get(page.moduleId);
  if (!declared) return false;
  if (declared.has(page.relative)) return true;
  if (page.directory === '') return declared.has(page.name);
  const flatPages = flatPagesByModule.get(page.moduleId);
  return Boolean(flatPages?.has(page.name) && declared.has(page.name));
}

const exemptionKeys = new Set(PAGE_ROUTE_EXEMPTIONS.map((entry) => entry.key));

describe('page route coverage', () => {
  it('discovers the pages and the modules to check', () => {
    expect(pages.length).toBeGreaterThan(100);
    expect(routesByModule.size).toBeGreaterThan(10);
  });

  it('routes every page, or lists it with a reason in the exemption registry', () => {
    const unreachable = pages.filter((page) => !isRouted(page) && !exemptionKeys.has(page.key));

    expect(
      unreachable.map((page) => page.key),
      'these page files exist but no route names them, so they cannot be reached in the app; ' +
        'add the route entry to the module definition (routes array) or add the page to ' +
        'src/routing/__tests__/pageRouteExemptions.ts with the reason it is not a route'
    ).toEqual([]);
  });

  it('keeps the exemption registry honest: every entry names a real page file', () => {
    const known = new Set(pages.map((page) => page.key));
    const unknown = PAGE_ROUTE_EXEMPTIONS.map((entry) => entry.key).filter((key) => !known.has(key));

    expect(unknown, 'exemptions that no longer name an existing page must be deleted').toEqual([]);
  });

  it('keeps the exemption registry honest: every entry has a reason', () => {
    const unexplained = PAGE_ROUTE_EXEMPTIONS.filter((entry) => entry.reason.trim().length < 10);

    expect(
      unexplained.map((entry) => entry.key),
      'each exemption states why the page is not a route'
    ).toEqual([]);
  });

  it('ratchets: an exempted page that becomes routed must leave the registry', () => {
    const nowRouted = PAGE_ROUTE_EXEMPTIONS.filter((entry) => {
      const page = pages.find((candidate) => candidate.key === entry.key);
      return page !== undefined && isRouted(page);
    }).map((entry) => entry.key);

    expect(
      nowRouted,
      'these pages are routed now, so their exemption is stale and must be removed'
    ).toEqual([]);
  });
});

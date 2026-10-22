// ABOUTME: Guard that every page file under a module's pages/ directory is reachable - named by a
// ABOUTME: route entry or a non-deprecated navigation entry, or listed with a reason in the exemption
// ABOUTME: registry. Ratcheted: a new unreachable page fails, and a stale exemption fails too.

import { describe, expect, it } from 'vitest';
import { PAGE_ROUTE_EXEMPTIONS } from './pageRouteExemptions';

/**
 * Route registration lives outside a page's ownership, and a navigation entry is not by itself a
 * route. Four pages shipped in phase P2 (observations, results, promotion, analysis v2) were built,
 * tested and gated with no route at all, so nothing in the suite could tell. This guard closes that
 * hole by discovering pages from the filesystem rather than from a hand-kept list.
 *
 * A module may be declared two ways, and the guard must accept both because the application does:
 *
 * - **Hub mode** - `routes` names a hub page, and the feature pages are tabs rendered inside it.
 * - **Direct-page mode** - each `navigation` entry carries its own `page`, and DynamicRoutes
 *   registers a route per non-deprecated nav item (see moduleRoutes.tsx).
 *
 * So reachability is a property of the *declaration*, not of a mode flag. `showInModes` is a layout
 * concern (standard vs fullwidth) and is deliberately not consulted here.
 */

interface ModuleLike {
  readonly id?: string;
  readonly routes?: ReadonlyArray<{ readonly path: string; readonly page?: string }>;
  readonly navigation?: ReadonlyArray<NavLike>;
}

interface NavLike {
  readonly path?: string;
  readonly page?: string;
  readonly deprecated?: boolean;
  readonly children?: ReadonlyArray<NavLike>;
}

/** A page file, described by where it sits under its module's pages/ directory. */
export interface PageRef {
  /** Path under pages/, without the extension - e.g. `observations/ObservationsCapturePage`. */
  readonly relative: string;
  /** The file's own name, without the extension - e.g. `ObservationsCapturePage`. */
  readonly name: string;
  /** Directory under pages/, or '' for a file at the root of pages/. */
  readonly directory: string;
}

/** The names a module declares, however it declares them. */
export interface DeclaredNames {
  /** `page` values from the module's `routes` array. */
  readonly routes: ReadonlySet<string>;
  /** `page` values from non-deprecated navigation entries. Deprecated ones redirect, so they do not
   *  render their page and must not count as reachability. */
  readonly navigation: ReadonlySet<string>;
  /** Flat page file names that exist in this module's pages/ root (the shim convention). */
  readonly flatFiles: ReadonlySet<string>;
}

/**
 * Whether a page can be reached in the running application.
 *
 * A page is named either by its path under pages/ (`analytics/AnalyticsExportPage`) or by its flat
 * name when a flat entry file exists for it - the shim convention the reachability fixes used, where
 * `pages/ObservationsCapturePage.tsx` re-exports the nested implementation.
 */
export function isReachable(page: PageRef, declared: DeclaredNames): boolean {
  const namedByRoutes = declared.routes.has(page.relative) || declared.routes.has(page.name);
  const namedByNavigation =
    declared.navigation.has(page.relative) || declared.navigation.has(page.name);
  if (namedByRoutes || namedByNavigation) {
    // A flat name only resolves to a file at the pages/ root unless a flat entry file exists.
    if (page.directory === '') return true;
    if (declared.flatFiles.has(page.name)) return true;
    // The path-under-pages form names this file directly, no shim needed.
    return declared.routes.has(page.relative) || declared.navigation.has(page.relative);
  }
  return false;
}

function collectNavPages(entries: ReadonlyArray<NavLike> | undefined, into: Set<string>): void {
  for (const entry of entries ?? []) {
    if (entry.page && !entry.deprecated) into.add(entry.page);
    collectNavPages(entry.children, into);
  }
}

const definitions = import.meta.glob<{ default?: ModuleLike }>('../../modules/*/moduleDefinition.tsx', {
  eager: true,
});

/** Every page file, without importing it: keys are paths relative to this test file. */
const pageModules = import.meta.glob('../../modules/*/pages/**/*Page.tsx');

interface DiscoveredPage extends PageRef {
  readonly moduleId: string;
  /** `moduleId/relative`, the key used by the exemption registry. */
  readonly key: string;
}

function parsePageKey(key: string): DiscoveredPage | null {
  const match = /\/modules\/([^/]+)\/pages\/(.+)\.tsx$/.exec(key);
  if (!match) return null;
  const [, moduleId, relative] = match;
  const segments = relative.split('/');
  const name = segments[segments.length - 1];
  return { moduleId, relative, name, directory: segments.slice(0, -1).join('/'), key: `${moduleId}/${relative}` };
}

const pages: readonly DiscoveredPage[] = Object.keys(pageModules)
  .map(parsePageKey)
  .filter((page): page is DiscoveredPage => page !== null)
  .sort((a, b) => a.key.localeCompare(b.key));

const declaredByModule = new Map<string, DeclaredNames>();

for (const module of Object.values(definitions)) {
  const id = module.default?.id;
  if (!id) continue;
  const routes = new Set<string>();
  for (const route of module.default?.routes ?? []) {
    if (route.page) routes.add(route.page);
  }
  const navigation = new Set<string>();
  collectNavPages(module.default?.navigation, navigation);
  declaredByModule.set(id, {
    routes,
    navigation,
    flatFiles: new Set(
      pages.filter((page) => page.moduleId === id && page.directory === '').map((page) => page.name)
    ),
  });
}

function declaredFor(moduleId: string): DeclaredNames {
  return declaredByModule.get(moduleId) ?? { routes: new Set(), navigation: new Set(), flatFiles: new Set() };
}

const exemptionKeys = new Set(PAGE_ROUTE_EXEMPTIONS.map((entry) => entry.key));

describe('the page reachability rule', () => {
  const flatFiles = new Set(['ObservationsCapturePage']);
  const declared = (routes: string[], navigation: string[]): DeclaredNames => ({
    routes: new Set(routes),
    navigation: new Set(navigation),
    flatFiles,
  });

  it('accepts hub mode: a route names the hub page', () => {
    expect(isReachable({ relative: 'MarksEntryPage', name: 'MarksEntryPage', directory: '' }, declared(['MarksEntryPage'], []))).toBe(true);
  });

  it('accepts direct-page mode: a navigation entry carries the page, with no route entry', () => {
    expect(isReachable({ relative: 'FeesPage', name: 'FeesPage', directory: '' }, declared([], ['FeesPage']))).toBe(true);
  });

  it('accepts a nested page named by its path under pages/', () => {
    expect(
      isReachable({ relative: 'analytics/AnalyticsExportPage', name: 'AnalyticsExportPage', directory: 'analytics' }, declared(['analytics/AnalyticsExportPage'], []))
    ).toBe(true);
  });

  it('accepts a nested page reached through a flat entry file (the shim convention)', () => {
    expect(
      isReachable({ relative: 'observations/ObservationsCapturePage', name: 'ObservationsCapturePage', directory: 'observations' }, declared(['ObservationsCapturePage'], []))
    ).toBe(true);
  });

  it('rejects a nested page whose flat name is declared but which has no flat entry file', () => {
    expect(
      isReachable({ relative: 'observations/UnshimmedPage', name: 'UnshimmedPage', directory: 'observations' }, declared(['UnshimmedPage'], []))
    ).toBe(false);
  });

  it('rejects a page that only a deprecated navigation entry names, because that path redirects', () => {
    // The deprecated entry is filtered out before it reaches DeclaredNames, so this is what the
    // discovery step hands over for a page whose only declaration is a redirect.
    expect(isReachable({ relative: 'ExamSessionsPage', name: 'ExamSessionsPage', directory: '' }, declared([], []))).toBe(false);
  });
});

describe('page route coverage', () => {
  it('discovers the pages and the modules to check', () => {
    expect(pages.length).toBeGreaterThan(100);
    expect(declaredByModule.size).toBeGreaterThan(10);
  });

  it('reaches every page, or lists it with a reason in the exemption registry', () => {
    const unreachable = pages.filter(
      (page) => !isReachable(page, declaredFor(page.moduleId)) && !exemptionKeys.has(page.key)
    );

    expect(
      unreachable.map((page) => page.key),
      'these page files exist but nothing names them, so they cannot be reached in the app; add the ' +
        'route entry to the module definition (routes array) or a navigation entry with a page, or ' +
        'add the page to src/routing/__tests__/pageRouteExemptions.ts with the reason it is not a route'
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

  it('ratchets: an exempted page that becomes reachable must leave the registry', () => {
    const nowReachable = PAGE_ROUTE_EXEMPTIONS.filter((entry) => {
      const page = pages.find((candidate) => candidate.key === entry.key);
      return page !== undefined && isReachable(page, declaredFor(page.moduleId));
    }).map((entry) => entry.key);

    expect(
      nowReachable,
      'these pages are reachable now, so their exemption is stale and must be removed'
    ).toEqual([]);
  });
});

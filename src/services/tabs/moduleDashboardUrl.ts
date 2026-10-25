// ABOUTME: A module's own dashboard lives at the module root (/finance), not at /finance/dashboard, so its
// ABOUTME: tab and its address carry the module's name. This maps the old spelling that links still use.

/**
 * The modules whose dashboard is the module's root page.
 *
 * Every module with a dashboard of its own is here, Settings included: its dashboard is a page of its
 * own, not a tab of a hub. The main dashboard (`/dashboard`) is not a module's dashboard, it is the
 * app's.
 */
export const MODULE_DASHBOARD_ROOTS = [
  'academics',
  'administration',
  'admissions',
  'finance',
  'hr',
  'inventory',
  'library',
  'nutrition',
  'portal',
  'reports',
  'settings',
] as const;

export type ModuleDashboardRoot = (typeof MODULE_DASHBOARD_ROOTS)[number];

/** True when the module's dashboard is at its root. */
export function isModuleDashboardRoot(moduleId: string): moduleId is ModuleDashboardRoot {
  return (MODULE_DASHBOARD_ROOTS as readonly string[]).includes(moduleId.toLowerCase());
}

/** `/finance/dashboard`, with an optional trailing slash, then a query string, a hash or nothing. */
const LEGACY_DASHBOARD_URL = /^\/([^/?#]+)\/dashboard\/?(?=$|[?#])/i;

/**
 * The address a tab should carry.
 *
 * `/finance/dashboard` becomes `/finance`, keeping any query string or hash; every other address,
 * including the main dashboard, settings' dashboard and a dashboard page nested deeper in a module
 * (`/reports/analytics/dashboard`), comes back as it was given. Tab addresses are route paths, so an
 * absolute URL is not rewritten.
 */
export function canonicalTabUrl(url: string): string {
  const match = LEGACY_DASHBOARD_URL.exec(url);
  if (!match || !isModuleDashboardRoot(match[1] as string)) return url;
  return `/${match[1]}${url.slice(match[0].length)}`;
}

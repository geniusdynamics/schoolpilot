// ABOUTME: The single registry of translation namespaces, the module that owns each, and which are core.
// ABOUTME: The runtime loader, the extraction report, the platform sync and the CI checks all read this list.

/**
 * Namespace registry
 *
 * A namespace is the unit a translator works on. Each one owns exactly one
 * file per locale (`src/i18n/locales/<locale>/<namespace>.json`), so opening a
 * namespace never requires loading another module's strings.
 */

export const FALLBACK_LOCALE = 'en';

/** Locales the app ships. `pseudo` is generated at load time, never a file on disk. */
export const SUPPORTED_LOCALES = ['en', 'fr', 'sw', 'rw', 'pt', 'ar'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_NAMESPACE = 'common';
export const NAVIGATION_NAMESPACE = 'navigation';

export interface NamespaceDefinition {
  /** i18next namespace name, also the file name on disk. */
  readonly name: string;
  /** Module directory under `src/modules` whose screens this namespace serves. */
  readonly owner: string;
  /** Core namespaces are loaded on every route and must never fall back to a raw key. */
  readonly core: boolean;
}

export const NAMESPACES: readonly NamespaceDefinition[] = [
  { name: 'common', owner: 'core', core: true },
  { name: 'navigation', owner: 'core', core: true },
  { name: 'dashboard', owner: 'dashboard', core: false },
  { name: 'academics', owner: 'academics', core: false },
  { name: 'assignments', owner: 'academics', core: false },
  { name: 'lessonplans', owner: 'academics', core: false },
  { name: 'administration', owner: 'administration', core: false },
  { name: 'houses', owner: 'administration', core: false },
  { name: 'pickup', owner: 'administration', core: false },
  { name: 'admissions', owner: 'admissions', core: false },
  { name: 'finance', owner: 'finance', core: false },
  { name: 'hr', owner: 'hr', core: false },
  { name: 'inventory', owner: 'inventory', core: false },
  { name: 'library', owner: 'library', core: false },
  { name: 'nutrition', owner: 'nutrition', core: false },
  { name: 'portal', owner: 'portal', core: false },
  { name: 'reports', owner: 'reports', core: false },
  { name: 'analytics', owner: 'reports', core: false },
  { name: 'settings', owner: 'settings', core: false },
  { name: 'todos', owner: 'todos', core: false },
];

export const NAMESPACE_NAMES: readonly string[] = NAMESPACES.map((entry) => entry.name);

export const CORE_NAMESPACES: readonly string[] = NAMESPACES.filter((entry) => entry.core).map(
  (entry) => entry.name
);

const BY_NAME = new Map(NAMESPACES.map((entry) => [entry.name, entry]));

export function isKnownNamespace(name: string): boolean {
  return BY_NAME.has(name);
}

export function getNamespace(name: string): NamespaceDefinition | undefined {
  return BY_NAME.get(name);
}

export function isCoreNamespace(name: string): boolean {
  return BY_NAME.get(name)?.core === true;
}

/** Namespaces owned by a module directory, e.g. `academics` → `academics`, `assignments`, `lessonplans`. */
export function namespacesForOwner(owner: string): readonly string[] {
  return NAMESPACES.filter((entry) => entry.owner === owner).map((entry) => entry.name);
}

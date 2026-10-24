// ABOUTME: Tests for the namespace registry: unique names, core membership and the owner mapping.
// ABOUTME: The registry is the one place namespace names are written down, so its invariants matter.

import {
  CORE_NAMESPACES,
  DEFAULT_NAMESPACE,
  FALLBACK_LOCALE,
  getNamespace,
  isCoreNamespace,
  isKnownNamespace,
  NAMESPACE_NAMES,
  NAMESPACES,
  namespacesForOwner,
  NAVIGATION_NAMESPACE,
  SUPPORTED_LOCALES,
} from '../namespaces';

describe('the namespace registry', () => {
  it('has no duplicate names', () => {
    expect(new Set(NAMESPACE_NAMES).size).toBe(NAMESPACE_NAMES.length);
  });

  it('keeps the default and navigation namespaces in the list', () => {
    expect(NAMESPACE_NAMES).toContain(DEFAULT_NAMESPACE);
    expect(NAMESPACE_NAMES).toContain(NAVIGATION_NAMESPACE);
  });

  it('marks common and navigation as core and nothing else', () => {
    expect([...CORE_NAMESPACES].sort()).toEqual(['common', 'navigation']);
    expect(isCoreNamespace('common')).toBe(true);
    expect(isCoreNamespace('finance')).toBe(false);
  });

  it('names a module for every non-core namespace', () => {
    for (const entry of NAMESPACES) {
      if (entry.core) continue;
      expect(entry.owner).not.toBe('');
      expect(namespacesForOwner(entry.owner)).toContain(entry.name);
    }
  });

  it('lists admissions, which the loader used to load without naming', () => {
    expect(isKnownNamespace('admissions')).toBe(true);
  });

  it('rejects an unknown namespace', () => {
    expect(isKnownNamespace('not-a-namespace')).toBe(false);
    expect(getNamespace('not-a-namespace')).toBeUndefined();
  });

  it('falls back to a locale the app ships', () => {
    expect(SUPPORTED_LOCALES).toContain(FALLBACK_LOCALE);
  });
});

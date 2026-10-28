// ABOUTME: Wraps a routed portal page in the canonical repository provider, so the portal reads through
// ABOUTME: the repository even when the app shell has not handed one down.

import type { ComponentType } from 'react';

import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';

/**
 * Gives a portal page the canonical repository.
 *
 * A provider already in the tree wins, so a page inside another provider shares that repository and
 * a page mounted on its own opens the canonical database itself.
 */
export function withPortalRepository<P extends object>(
  Page: ComponentType<P>
): ComponentType<P> {
  const WithRepository = (props: P) => (
    <CanonicalRepositoryProvider>
      <Page {...props} />
    </CanonicalRepositoryProvider>
  );
  WithRepository.displayName = `withPortalRepository(${Page.displayName ?? Page.name ?? 'Page'})`;
  return WithRepository;
}

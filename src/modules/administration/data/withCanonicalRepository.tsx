// ABOUTME: Wraps a routed page in the canonical repository provider, so the page reads and writes
// ABOUTME: through the repository even when the app shell has not handed one down.

import type { ComponentType } from 'react';

import { CanonicalRepositoryProvider } from './canonicalRepository';

/**
 * Gives a page the canonical repository.
 *
 * The provider a page finds already in the tree wins, so a page mounted inside the app
 * shell shares the one repository and a page mounted on its own opens the canonical
 * database itself.
 */
export function withCanonicalRepository<P extends object>(
  Page: ComponentType<P>
): ComponentType<P> {
  const WithRepository = (props: P) => (
    <CanonicalRepositoryProvider>
      <Page {...props} />
    </CanonicalRepositoryProvider>
  );
  WithRepository.displayName = `withCanonicalRepository(${Page.displayName ?? Page.name ?? 'Page'})`;
  return WithRepository;
}

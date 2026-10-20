// ABOUTME: The writable half of the canonical repository the administration pages write through.
// ABOUTME: The provider hands the page a QueryRepository; a page that writes resolves the same instance as a Repository.

import { Repository } from '@/data/repository';

import { useCanonicalRepository } from './canonicalRepository';

/**
 * The canonical repository, typed for writes.
 *
 * `CanonicalRepositoryProvider` holds a `Repository`; it exposes the read half through the
 * query contract. A page that writes needs the whole instance, so this resolves it and
 * refuses a read-only double rather than letting a write disappear.
 */
export function useWritableRepository(): Repository {
  const repository = useCanonicalRepository();
  if (!(repository instanceof Repository)) {
    throw new Error(
      'The administration pages write through the canonical repository, but the provider handed a read-only one.'
    );
  }
  return repository;
}

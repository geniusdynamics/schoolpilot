// ABOUTME: Hands the admissions pages the writable repository the admission service needs.
// ABOUTME: The shared provider is typed as a query repository; this seam asserts the writes exist.

import type { Repository } from '@/data/repository';
import type { QueryRepository } from '@/data/query';

/** The writes an admission cannot run without. */
const WRITE_METHODS = ['create', 'update', 'remove', 'transaction'] as const;

/**
 * The canonical repository of the provider, as the repository the services write through.
 *
 * `useCanonicalRepository` hands every module a `QueryRepository`, because most pages only
 * read. An admission writes, so it needs the full repository of `@/data/repository`: this
 * checks that the object really carries the writes before handing it on, and fails loudly
 * when a shell injects a read-only transport instead of guessing.
 */
export function writableRepository(repository: QueryRepository): Repository {
  const candidate = repository as unknown as Partial<
    Record<(typeof WRITE_METHODS)[number], unknown>
  >;
  const missing = WRITE_METHODS.filter((method) => typeof candidate[method] !== 'function');
  if (missing.length > 0) {
    throw new Error(
      `The canonical repository cannot ${missing.join(', ')}; an admission needs the writable repository of @/data/repository.`
    );
  }
  return repository as unknown as Repository;
}

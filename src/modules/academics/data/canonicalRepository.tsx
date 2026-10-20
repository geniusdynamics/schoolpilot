// ABOUTME: The shared canonical repository for the academics pages, with the write half the
// ABOUTME: provider contract leaves out: the same instance, narrowed to the methods a page writes through.

import { useCanonicalRepository } from '@/data/canonicalRepository';
import { createSchemaFor, updateSchemaFor } from '@/data/repository';
import type {
  CreateInput,
  RepositoryRow,
  UpdateInput,
  UpdateOptions,
  WriteOptions,
} from '@/data/repository';
import type { QueryRepository } from '@/data/query';
import type { EntityName } from '@/domain/schema';
import type { Id } from '@/domain/ids';
import type { z } from 'zod/v4';

export { CanonicalRepositoryProvider } from '@/data/canonicalRepository';

/**
 * The canonical repository as a page that writes needs it.
 *
 * The shared provider is typed as the read contract (`QueryRepository`); the instance it
 * opens is the full canonical repository. The pages narrow it here once instead of casting
 * at every call site, and a double that serves a page test implements the same four methods.
 */
export interface WritableQueryRepository extends QueryRepository {
  get<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options?: { readonly includeDeleted?: boolean }
  ): Promise<RepositoryRow<E> | null>;
  create<E extends EntityName>(
    entity: E,
    input: CreateInput<E>,
    options?: WriteOptions
  ): Promise<RepositoryRow<E>>;
  update<E extends EntityName>(
    entity: E,
    id: Id<E>,
    patch: UpdateInput<E>,
    options: UpdateOptions
  ): Promise<RepositoryRow<E>>;
  remove<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options?: WriteOptions & { readonly expectedVersion?: number }
  ): Promise<RepositoryRow<E>>;
}

interface WritableProbe {
  readonly get?: unknown;
  readonly create?: unknown;
  readonly update?: unknown;
  readonly remove?: unknown;
}

function isWritable(repository: QueryRepository): repository is WritableQueryRepository {
  const probe = repository as unknown as WritableProbe;
  return (
    typeof probe.get === 'function' &&
    typeof probe.create === 'function' &&
    typeof probe.update === 'function' &&
    typeof probe.remove === 'function'
  );
}

/** The canonical repository with its write methods. */
export function useWritableRepository(): WritableQueryRepository {
  const repository = useCanonicalRepository();
  if (!isWritable(repository)) {
    throw new Error(
      'The canonical repository handed to the academics pages does not implement writes'
    );
  }
  return repository;
}

/**
 * The entity's create shape, typed as the payload `create` accepts.
 *
 * The schema object itself is the entity's own schema, derived by the repository; only the
 * deferred TypeScript type is narrowed, so a form and the repository validate the same shape.
 */
export function createFormSchema<E extends EntityName>(
  entity: E
): z.ZodType<CreateInput<E>, CreateInput<E>> {
  return createSchemaFor(entity) as unknown as z.ZodType<CreateInput<E>, CreateInput<E>>;
}

/** The entity's writable fields, all optional, typed as the payload `update` accepts. */
export function updateFormSchema<E extends EntityName>(
  entity: E
): z.ZodType<UpdateInput<E>, UpdateInput<E>> {
  return updateSchemaFor(entity) as unknown as z.ZodType<UpdateInput<E>, UpdateInput<E>>;
}

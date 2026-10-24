// ABOUTME: The repository API: list, read, create, patch, remove and the audit trail of any
// ABOUTME: registered entity, over the same typed repository the browser runs.

import type {
  CreateInput,
  FilterCondition,
  ListQuery,
  OrderSpec,
  Repository,
  UpdateInput,
  WriteOptions,
} from '@/data/repository';
import { asId } from '@/domain/ids';
import { ENTITY_NAMES, isEntityName, type EntityName } from '@/domain/schema';
import { restrictedFieldsIn } from '@/data/security';

import {
  actorOf,
  booleanQuery,
  HttpError,
  integerQuery,
  jsonQuery,
  readJsonBody,
  requireInteger,
  requireObject,
} from './http';
import type { RouteRequest, Router } from './router';
import type {
  RestrictedAccessAction,
  RestrictedAccessLog,
} from '../security/restrictedAccessLog';

export interface RepositoryRouteOptions {
  readonly repository: Repository;
  /** The actor a write names when the request carries no `x-actor` header. */
  readonly actor?: string;
  /** Records every read and write of restricted data when set. */
  readonly accessLog?: RestrictedAccessLog;
}

/** Registers the repository API under `/api/entities`. */
export function addRepositoryRoutes(router: Router, options: RepositoryRouteOptions): void {
  router.add('GET', '/api/entities', () => ({ body: { entities: ENTITY_NAMES } }));

  router.add('GET', '/api/entities/:entity', async (request) => {
    const entity = entityOf(request);
    const page = await options.repository.list(entity, listQueryOf(request.url));
    recordRestrictedAccess(options, request, 'list', entity, page.items);
    return { body: page };
  });

  router.add('GET', '/api/entities/:entity/:id', async (request) => {
    const entity = entityOf(request);
    const id = idOf(request);
    const row = await options.repository.get(entity, id);
    if (!row) {
      throw new HttpError(404, 'not_found', `no ${entity} row with id ${request.params.id}`);
    }
    recordRestrictedAccess(options, request, 'read', entity, [row]);
    return { body: row };
  });

  router.add('GET', '/api/entities/:entity/:id/audit', async (request) => {
    const entity = entityOf(request);
    const events = await options.repository.auditTrail(entity, request.params.id ?? '');
    return { body: { events } };
  });

  router.add('POST', '/api/entities/:entity', async (request) => {
    const entity = entityOf(request);
    const body = await jsonObjectOf(request);

    const row = await options.repository.create(
      entity,
      body as CreateInput<EntityName>,
      writeOptionsOf(request, options.actor)
    );
    recordRestrictedAccess(options, request, 'create', entity, [row]);
    return { status: 201, body: row };
  });

  // PATCH and PUT are the same write: the repository updates a row, it never replaces one,
  // and the browser's sync queue sends its updates as PUT.
  const update = async (request: RouteRequest) => {
    const entity = entityOf(request);
    const id = idOf(request);
    const body = await jsonObjectOf(request);
    const expectedVersion = requireInteger(body, 'expectedVersion');
    const patch = body.patch;
    if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new HttpError(400, 'invalid_body', 'patch must be a JSON object');
    }

    const row = await options.repository.update(entity, id, patch as UpdateInput<EntityName>, {
      expectedVersion,
      ...writeOptionsOf(request, options.actor),
    });
    recordRestrictedAccess(options, request, 'update', entity, [row]);
    return { body: row };
  };

  router.add('PATCH', '/api/entities/:entity/:id', update);
  router.add('PUT', '/api/entities/:entity/:id', update);

  router.add('DELETE', '/api/entities/:entity/:id', async (request) => {
    const entity = entityOf(request);
    const id = idOf(request);
    const expectedVersion = integerQuery(request.url, 'expectedVersion');
    const row = await options.repository.remove(entity, id, {
      ...writeOptionsOf(request, options.actor),
      ...(expectedVersion !== undefined ? { expectedVersion } : {}),
    });
    recordRestrictedAccess(options, request, 'remove', entity, [row]);
    return { body: { removed: row } };
  });
}

/**
 * Records an access to restricted data, when the rows carried any.
 *
 * The entry names the actor, the rows and the fields, never a value. It is written before the
 * response is handed back, so a read whose access cannot be recorded fails the request rather than
 * going unlogged.
 */
function recordRestrictedAccess(
  options: RepositoryRouteOptions,
  request: RouteRequest,
  action: RestrictedAccessAction,
  entity: EntityName,
  rows: readonly unknown[]
): void {
  const log = options.accessLog;
  if (!log) return;

  const fields = new Set<string>();
  const ids: string[] = [];
  for (const row of rows) {
    const touched = restrictedFieldsIn(entity, row);
    if (touched.length === 0) continue;
    for (const field of touched) fields.add(field);
    ids.push(rowIdOf(row));
  }
  if (ids.length === 0) return;

  log.record({
    at: new Date().toISOString(),
    actor: actorOf(request.req, options.actor) ?? null,
    action,
    entity,
    ids,
    fields: [...fields],
    outcome: 'allowed',
  });
}

/** The id of a row about to be recorded. */
function rowIdOf(row: unknown): string {
  if (row !== null && typeof row === 'object') {
    const id = (row as { id?: unknown }).id;
    if (typeof id === 'string') return id;
  }
  return '';
}

/** The entity a request names, refusing one the registry does not hold. */
function entityOf(request: RouteRequest): EntityName {
  const name = request.params.entity ?? '';
  if (!isEntityName(name)) {
    throw new HttpError(404, 'unknown_entity', `${name} is not a registered entity`);
  }
  return name;
}

/** The id a request names, branded for the repository. */
function idOf(request: RouteRequest) {
  return asId<EntityName>(request.params.id ?? '');
}

/** The JSON object a write carries. */
async function jsonObjectOf(request: RouteRequest): Promise<Record<string, unknown>> {
  return requireObject(await readJsonBody(request.req));
}

/** The write options of a request: its actor, its reason and the hub as the origin. */
function writeOptionsOf(request: RouteRequest, fallback: string | undefined): WriteOptions {
  const actor = actorOf(request.req, fallback);
  const reason = request.url.searchParams.get('reason') ?? undefined;
  return {
    ...(actor !== undefined ? { actor } : {}),
    ...(reason !== undefined ? { reason } : {}),
    origin: 'hub',
  };
}

/** The `list` query a request encodes. */
function listQueryOf(url: URL): ListQuery {
  const where = objectQuery(url, 'where');
  const conditions = objectQuery(url, 'conditions');
  const orderBy = arrayQuery<OrderSpec>(url, 'orderBy');
  const limit = integerQuery(url, 'limit');
  const offset = integerQuery(url, 'offset');
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const includeDeleted = booleanQuery(url, 'includeDeleted');

  return {
    ...(where !== undefined ? { where } : {}),
    ...(conditions !== undefined ? { conditions: conditions as Record<string, FilterCondition> } : {}),
    ...(orderBy !== undefined ? { orderBy } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
    ...(includeDeleted !== undefined ? { includeDeleted } : {}),
  };
}

/** A query parameter that has to be a JSON object. */
function objectQuery(url: URL, name: string): Record<string, unknown> | undefined {
  const value = jsonQuery<unknown>(url, name);
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'invalid_query', `the ${name} query parameter must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

/** A query parameter that has to be a JSON array. */
function arrayQuery<T>(url: URL, name: string): readonly T[] | undefined {
  const value = jsonQuery<unknown>(url, name);
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new HttpError(400, 'invalid_query', `the ${name} query parameter must be a JSON array`);
  }
  return value as readonly T[];
}

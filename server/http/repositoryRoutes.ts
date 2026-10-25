// ABOUTME: The repository API: list, read, create, patch, remove and the audit trail of any
// ABOUTME: registered entity, over the scoped repository of the signed-in actor, so every operation
// ABOUTME: is judged by the client's permission model and answered with the fields its role may see.

import type {
  CreateInput,
  FilterCondition,
  ListQuery,
  OrderSpec,
  UpdateInput,
  WriteOptions,
} from '@/data/repository';
import { asId } from '@/domain/ids';
import { ENTITY_NAMES, isEntityName, type EntityName } from '@/domain/schema';

import {
  booleanQuery,
  HttpError,
  integerQuery,
  jsonQuery,
  readJsonBody,
  requireInteger,
  requireObject,
} from './http';
import type { RouteRequest, Router } from './router';
import type { ActorAccess, RbacService } from '../auth/rbac';

export interface RepositoryRouteOptions {
  /** The authorisation layer: the repository each request acts through comes from here. */
  readonly rbac: RbacService;
}

/** Registers the repository API under `/api/entities`. */
export function addRepositoryRoutes(router: Router, options: RepositoryRouteOptions): void {
  router.add('GET', '/api/entities', () => ({ body: { entities: ENTITY_NAMES } }));

  router.add('GET', '/api/entities/:entity', async (request) => {
    const entity = entityOf(request);
    const repository = (await accessOf(request, options)).repository;
    const page = await repository.list(entity, listQueryOf(request.url));
    return { body: page };
  });

  router.add('GET', '/api/entities/:entity/:id', async (request) => {
    const entity = entityOf(request);
    const id = idOf(request);
    const repository = (await accessOf(request, options)).repository;
    const row = await repository.get(entity, id);
    if (!row) {
      throw new HttpError(404, 'not_found', `no ${entity} row with id ${request.params.id}`);
    }
    return { body: row };
  });

  router.add('GET', '/api/entities/:entity/:id/audit', async (request) => {
    const entity = entityOf(request);
    const repository = (await accessOf(request, options)).repository;
    const events = await repository.auditTrail(entity, request.params.id ?? '');
    return { body: { events } };
  });

  router.add('POST', '/api/entities/:entity', async (request) => {
    const entity = entityOf(request);
    const body = await jsonObjectOf(request);
    const repository = (await accessOf(request, options)).repository;

    const row = await repository.create(entity, body as CreateInput<EntityName>, writeOptionsOf(request));
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

    const repository = (await accessOf(request, options)).repository;
    const row = await repository.update(entity, id, patch as UpdateInput<EntityName>, {
      expectedVersion,
      ...writeOptionsOf(request),
    });
    return { body: row };
  };

  router.add('PATCH', '/api/entities/:entity/:id', update);
  router.add('PUT', '/api/entities/:entity/:id', update);

  router.add('DELETE', '/api/entities/:entity/:id', async (request) => {
    const entity = entityOf(request);
    const id = idOf(request);
    const expectedVersion = integerQuery(request.url, 'expectedVersion');
    const repository = (await accessOf(request, options)).repository;
    const row = await repository.remove(entity, id, {
      ...writeOptionsOf(request),
      ...(expectedVersion !== undefined ? { expectedVersion } : {}),
    });
    return { body: { removed: row } };
  });
}

/**
 * What the request acts as.
 *
 * The repository is built per request: the scope is resolved from the roles the account holds now,
 * and the field policy the client applies is installed on it. A request without a session cannot
 * reach here - the router refuses it - so a missing one is a refusal rather than a fallback.
 */
async function accessOf(
  request: RouteRequest,
  options: RepositoryRouteOptions
): Promise<ActorAccess> {
  const session = request.session;
  if (session === null) {
    throw new HttpError(401, 'unauthenticated', 'this endpoint requires a bearer token');
  }
  return options.rbac.accessFor(session);
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

/**
 * The write options of a request: the actor, its reason and the hub as the origin.
 *
 * The actor is the signed-in user; there is no header a caller can set to claim another identity.
 */
function writeOptionsOf(request: RouteRequest): WriteOptions {
  const actor = request.session?.userId;
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

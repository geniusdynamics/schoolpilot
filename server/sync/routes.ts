// ABOUTME: The hub's sync API: one batched push, one scoped pull page and the server's conflict
// ABOUTME: log, over the `ServerNode` the hub opens beside its repository.

import type { Envelope, ReplicaScope, ServerNode } from '@/data/sync';
import { isEntityName, type EntityName } from '@/domain/schema';

import {
  HttpError,
  integerQuery,
  jsonQuery,
  readJsonBody,
  requireObject,
} from '../http/http';
import type { Router } from '../http/router';

export interface SyncRouteOptions {
  readonly sync: ServerNode;
}

/** Registers the sync API under `/api/sync`. */
export function addSyncRoutes(router: Router, options: SyncRouteOptions): void {
  router.add('GET', '/api/sync/changes', async (request) => {
    const since = integerQuery(request.url, 'since') ?? 0;
    const page = await options.sync.changesSince(since, scopeOf(request.url));
    return { body: page };
  });

  router.add('POST', '/api/sync/push', async (request) => {
    const body = requireObject(await readJsonBody(request.req));
    const raw = body.changes;
    if (!Array.isArray(raw)) {
      throw new HttpError(400, 'invalid_body', 'changes must be a JSON array');
    }

    const changes = raw.map((value, index) => envelopeOf(value, index));
    const results = await options.sync.acceptBatch(changes, scopeOf(request.url));
    return { body: { results } };
  });

  router.add('GET', '/api/sync/conflicts', async () => ({
    body: { conflicts: await options.sync.conflicts() },
  }));
}

/**
 * The scope a request asks for.
 *
 * A request without `institutionId` is unscoped and sees the whole hub; that is the operator
 * surface, not what a device sends. `entities` narrows the replica further and is refused
 * without an institution, because a narrowed list without a tenancy boundary is not a scope.
 */
function scopeOf(url: URL): ReplicaScope | undefined {
  const institutionId = url.searchParams.get('institutionId');
  const entities = entityListOf(url);

  if (!institutionId) {
    if (entities) {
      throw new HttpError(400, 'invalid_query', 'entities needs an institutionId to scope to');
    }
    return undefined;
  }

  return {
    institutionId,
    ...(entities ? { entities } : {}),
  };
}

function entityListOf(url: URL): readonly EntityName[] | undefined {
  const value = jsonQuery<unknown>(url, 'entities');
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new HttpError(400, 'invalid_query', 'the entities query parameter must be a JSON array');
  }
  return value.map((name) => {
    if (typeof name !== 'string' || !isEntityName(name)) {
      throw new HttpError(400, 'invalid_query', `${String(name)} is not a registered entity`);
    }
    return name;
  });
}

/** Validates one change of a push body. */
function envelopeOf(value: unknown, index: number): Envelope {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'invalid_body', `changes[${index}] must be a JSON object`);
  }

  const change = value as Record<string, unknown>;
  const entity = change.entity;
  if (typeof entity !== 'string' || !isEntityName(entity)) {
    throw new HttpError(400, 'invalid_body', `changes[${index}].entity is not a registered entity`);
  }
  if (typeof change.id !== 'string' || change.id.length === 0) {
    throw new HttpError(400, 'invalid_body', `changes[${index}].id must be a non-empty string`);
  }
  if (change.op !== 'create' && change.op !== 'update' && change.op !== 'remove') {
    throw new HttpError(400, 'invalid_body', `changes[${index}].op must be create, update or remove`);
  }
  if (typeof change.hlc !== 'string' || change.hlc.length === 0) {
    throw new HttpError(400, 'invalid_body', `changes[${index}].hlc must be a non-empty string`);
  }
  if (typeof change.deviceId !== 'string' || change.deviceId.length === 0) {
    throw new HttpError(400, 'invalid_body', `changes[${index}].deviceId must be a non-empty string`);
  }
  if (!Array.isArray(change.fields) || change.fields.some((field) => typeof field !== 'string')) {
    throw new HttpError(400, 'invalid_body', `changes[${index}].fields must be an array of strings`);
  }
  if (!isStringMap(change.base)) {
    throw new HttpError(400, 'invalid_body', `changes[${index}].base must map fields to clock strings`);
  }
  if (change.payload === null || typeof change.payload !== 'object' || Array.isArray(change.payload)) {
    throw new HttpError(400, 'invalid_body', `changes[${index}].payload must be a JSON object`);
  }

  return {
    entity,
    id: change.id,
    op: change.op,
    hlc: change.hlc,
    deviceId: change.deviceId,
    fields: change.fields as string[],
    base: change.base,
    payload: change.payload as Record<string, unknown>,
  };
}

function isStringMap(value: unknown): value is Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
}

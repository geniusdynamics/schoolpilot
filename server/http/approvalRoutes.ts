// ABOUTME: The approval API: raise a privileged action for a second person's decision, list what is
// ABOUTME: waiting, decide one, and read the trail that records both the maker and the checker.

import { RbacError, type ActorAccess, type ApprovalActor, type RbacService } from '../auth/rbac';
import { HttpError, readJsonBody, requireObject } from './http';
import type { RouteRequest, Router } from './router';

export interface ApprovalRouteOptions {
  /** The authorisation layer: the roles an actor holds come from the permission context. */
  readonly rbac: RbacService;
  /** The maker-checker engine the pending actions live in. */
  readonly approvals: import('../auth/rbac').ApprovalEngine;
}

/** Registers the approval API under `/api/approvals`. */
export function addApprovalRoutes(router: Router, options: ApprovalRouteOptions): void {
  const engine = options.approvals;

  router.add('GET', '/api/approvals', async (request) => {
    const access = await accessOf(request, options);
    const actor = actorOf(access);
    const action = request.url.searchParams.get('action') ?? undefined;
    const pending = await engine.pending(action);
    // A pending action is visible to the person who raised it and to the people who may decide it;
    // it is not a public queue.
    const visible = pending.filter(
      (record) => record.requestedBy === actor.id || engine.mayCheck(record.action, actor)
    );
    return { body: { approvals: visible } };
  });

  router.add('GET', '/api/approvals/:id', async (request) => {
    const access = await accessOf(request, options);
    const actor = actorOf(access);
    const record = await engine.get(request.params.id ?? '');
    if (record === null) {
      throw new HttpError(404, 'not_found', `no approval with id ${request.params.id}`);
    }
    assertVisible(engine.mayCheck(record.action, actor), record.requestedBy, actor);
    return { body: record };
  });

  router.add('GET', '/api/approvals/:id/history', async (request) => {
    const access = await accessOf(request, options);
    const actor = actorOf(access);
    const record = await engine.get(request.params.id ?? '');
    if (record === null) {
      throw new HttpError(404, 'not_found', `no approval with id ${request.params.id}`);
    }
    assertVisible(engine.mayCheck(record.action, actor), record.requestedBy, actor);
    return { body: { events: await engine.history(record.id) } };
  });

  router.add('POST', '/api/approvals', async (request) => {
    const access = await accessOf(request, options);
    const body = await jsonObjectOf(request);
    const record = await engine.request({
      action: requiredString(body, 'action'),
      entityId: requiredString(body, 'entityId'),
      ...(body.payload === undefined
        ? {}
        : { payload: requireObject(body.payload) as Readonly<Record<string, unknown>> }),
      ...(typeof body.reason === 'string' ? { reason: body.reason } : {}),
      actor: actorOf(access),
    });
    return { status: 201, body: record };
  });

  router.add('POST', '/api/approvals/:id/approve', async (request) => {
    const access = await accessOf(request, options);
    const body = await optionalObject(request);
    const record = await engine.approve({
      id: request.params.id ?? '',
      actor: actorOf(access),
      ...(typeof body.reason === 'string' ? { reason: body.reason } : {}),
    });
    return { body: record };
  });

  router.add('POST', '/api/approvals/:id/reject', async (request) => {
    const access = await accessOf(request, options);
    const body = await optionalObject(request);
    const record = await engine.reject({
      id: request.params.id ?? '',
      actor: actorOf(access),
      reason: typeof body.reason === 'string' ? body.reason : '',
    });
    return { body: record };
  });
}

/** The access of the signed-in actor; the router refuses a request without a session. */
async function accessOf(
  request: RouteRequest,
  options: ApprovalRouteOptions
): Promise<ActorAccess> {
  const session = request.session;
  if (session === null) {
    throw new HttpError(401, 'unauthenticated', 'this endpoint requires a bearer token');
  }
  return options.rbac.accessFor(session);
}

/** The approval actor of a request: the account and the roles the permission context resolved. */
function actorOf(access: ActorAccess): ApprovalActor {
  return { id: access.actorId, roles: access.context.roles };
}

/** Refuses an approval the actor neither raised nor may decide. */
function assertVisible(mayCheck: boolean, requestedBy: string, actor: ApprovalActor): void {
  if (mayCheck || requestedBy === actor.id) return;
  throw new RbacError(
    'permission',
    `the roles [${actor.roles.join(', ')}] may neither decide this approval nor raised it`
  );
}

/** The JSON object a request carries. */
async function jsonObjectOf(request: RouteRequest): Promise<Record<string, unknown>> {
  return requireObject(await readJsonBody(request.req));
}

/** Reads an optional JSON body; a request with no body is an empty object. */
async function optionalObject(
  request: RouteRequest
): Promise<Record<string, unknown>> {
  const body = await readJsonBody(request.req);
  if (body === undefined) return {};
  return requireObject(body);
}

/** A required string field. */
function requiredString(body: Readonly<Record<string, unknown>>, name: string): string {
  const value = body[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'invalid_body', `${name} must be a non-empty string`);
  }
  return value;
}

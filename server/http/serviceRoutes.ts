// ABOUTME: The service API: the unchanged domain services of the app behind HTTP endpoints —
// ABOUTME: admissions, attendance registers and marks, and billing-run previews and posts - each
// ABOUTME: guarded by the permission its call needs and running through the actor's scoped repository.

import type { Permission } from '@/data/auth';
import type { BillingRunRequest } from '@/domain/finance/billing';
import { asId } from '@/domain/ids';
import type { AdmissionInput, OpenRegisterInput, RecordMarkInput } from '@/domain/services';

import { HttpError, readJsonBody, requireObject } from './http';
import type { RouteRequest, Router } from './router';
import type { ActorAccess, RbacService } from '../auth/rbac';
import {
  admissionServiceOf,
  attendanceServiceOf,
  billingRunServiceOf,
  type HubServices,
} from '../services';

export interface ServiceRouteOptions {
  /** The authorisation layer: the repository each call acts through comes from here. */
  readonly rbac: RbacService;
}

/** Registers the service API under `/api/services`. */
export function addServiceRoutes(router: Router, options: ServiceRouteOptions): void {
  router.add('POST', '/api/services/admissions', async (request) => {
    const input = (await jsonObjectOf(request)) as unknown as AdmissionInput;
    const access = await accessOf(request, options, 'learner.write');
    const result = await admissionServiceOf(servicesOf(access)).admit(input);
    return { status: 201, body: result };
  });

  router.add('POST', '/api/services/attendance/registers', async (request) => {
    const input = (await jsonObjectOf(request)) as unknown as OpenRegisterInput;
    const access = await accessOf(request, options, 'attendance.write');
    const register = await attendanceServiceOf(servicesOf(access)).openRegister(input);
    return { body: register };
  });

  router.add('POST', '/api/services/attendance/marks', async (request) => {
    const input = (await jsonObjectOf(request)) as unknown as RecordMarkInput;
    const access = await accessOf(request, options, 'attendance.write');
    const mark = await attendanceServiceOf(servicesOf(access)).recordMark(input);
    return { status: 201, body: mark };
  });

  router.add('GET', '/api/services/attendance/registers/:id/marks', async (request) => {
    const sessionId = asId<'attendance_session'>(request.params.id ?? '');
    const access = await accessOf(request, options, 'attendance.read');
    const marks = await attendanceServiceOf(servicesOf(access)).listMarks(sessionId);
    return { body: { marks } };
  });

  router.add('POST', '/api/services/billing/preview', async (request) => {
    const input = (await jsonObjectOf(request)) as unknown as BillingRunRequest;
    const access = await accessOf(request, options, 'finance.read');
    const preview = await billingRunServiceOf(servicesOf(access)).preview(input);
    return { body: preview };
  });

  router.add('POST', '/api/services/billing/runs', async (request) => {
    const input = (await jsonObjectOf(request)) as unknown as BillingRunRequest;
    // The matrix of spec 05 §11 reserves a billing run to the role that holds `billing.post`; the
    // service itself checks no permission, so the route is where the rule is enforced.
    const access = await accessOf(request, options, 'billing.post');
    const outcome = await billingRunServiceOf(servicesOf(access)).post(input);
    return { body: outcome };
  });
}

/**
 * What the request may do.
 *
 * The permission is asserted at the route, so a caller that may not make the call is refused before
 * a service reads anything. The repository the service then runs through is the actor's scoped one,
 * so every row the service reads or writes is judged by the same scope the repository API applies.
 */
async function accessOf(
  request: RouteRequest,
  options: ServiceRouteOptions,
  permission: Permission
): Promise<ActorAccess> {
  const session = request.session;
  if (session === null) {
    throw new HttpError(401, 'unauthenticated', 'this endpoint requires a bearer token');
  }
  const access = await options.rbac.accessFor(session);
  access.assertPermission(permission);
  return access;
}

/** The services of one request: the actor's scoped repository and the actor behind the token. */
function servicesOf(access: ActorAccess): HubServices {
  return { repository: access.repository, actor: access.actorId };
}

/** The JSON object a service call carries. */
async function jsonObjectOf(request: RouteRequest): Promise<Record<string, unknown>> {
  return requireObject(await readJsonBody(request.req));
}

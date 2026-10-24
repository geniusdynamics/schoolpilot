// ABOUTME: The service API: the unchanged domain services of the app behind HTTP endpoints —
// ABOUTME: admissions, attendance registers and marks, and billing-run previews and posts.

import type { Repository } from '@/data/repository';
import type { BillingRunRequest } from '@/domain/finance/billing';
import { asId } from '@/domain/ids';
import type { AdmissionInput, OpenRegisterInput, RecordMarkInput } from '@/domain/services';

import { readJsonBody, requireObject } from './http';
import type { RouteRequest, Router } from './router';
import {
  admissionServiceOf,
  attendanceServiceOf,
  billingRunServiceOf,
  type HubServices,
} from '../services';

export interface ServiceRouteOptions {
  readonly repository: Repository;
}

/** Registers the service API under `/api/services`. */
export function addServiceRoutes(router: Router, options: ServiceRouteOptions): void {
  router.add('POST', '/api/services/admissions', async (request) => {
    const input = (await jsonObjectOf(request)) as unknown as AdmissionInput;
    const result = await admissionServiceOf(servicesOf(request, options)).admit(input);
    return { status: 201, body: result };
  });

  router.add('POST', '/api/services/attendance/registers', async (request) => {
    const input = (await jsonObjectOf(request)) as unknown as OpenRegisterInput;
    const register = await attendanceServiceOf(servicesOf(request, options)).openRegister(input);
    return { body: register };
  });

  router.add('POST', '/api/services/attendance/marks', async (request) => {
    const input = (await jsonObjectOf(request)) as unknown as RecordMarkInput;
    const mark = await attendanceServiceOf(servicesOf(request, options)).recordMark(input);
    return { status: 201, body: mark };
  });

  router.add('GET', '/api/services/attendance/registers/:id/marks', async (request) => {
    const sessionId = asId<'attendance_session'>(request.params.id ?? '');
    const marks = await attendanceServiceOf(servicesOf(request, options)).listMarks(sessionId);
    return { body: { marks } };
  });

  router.add('POST', '/api/services/billing/preview', async (request) => {
    const input = (await jsonObjectOf(request)) as unknown as BillingRunRequest;
    const preview = await billingRunServiceOf(servicesOf(request, options)).preview(input);
    return { body: preview };
  });

  router.add('POST', '/api/services/billing/runs', async (request) => {
    const input = (await jsonObjectOf(request)) as unknown as BillingRunRequest;
    const outcome = await billingRunServiceOf(servicesOf(request, options)).post(input);
    return { body: outcome };
  });
}

/** The services of one request: the hub's repository and the signed-in actor. */
function servicesOf(request: RouteRequest, options: ServiceRouteOptions): HubServices {
  const actor = request.session?.userId;
  return {
    repository: options.repository,
    ...(actor !== undefined ? { actor } : {}),
  };
}

/** The JSON object a service call carries. */
async function jsonObjectOf(request: RouteRequest): Promise<Record<string, unknown>> {
  return requireObject(await readJsonBody(request.req));
}

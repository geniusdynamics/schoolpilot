// ABOUTME: The authentication endpoints: first run, password and TOTP sign-in, guardian phone OTP,
// ABOUTME: password reset, and the session and authenticator management a signed-in user needs.

import type { CreateInput } from '@/data/repository';

import type { AuthenticatedActor, AuthenticationService, SessionMeta } from '../auth';

import { headerValue, HttpError, readJsonBody, requireObject } from './http';
import type { RouteRequest, Router } from './router';

export interface AuthRouteOptions {
  readonly auth: AuthenticationService;
  /**
   * Called once with the account the first run created, before the response is sent.
   *
   * The hub's authorisation denies an account that holds no role, so the account that sets the hub
   * up must be handed the administrator role here or it could do nothing at all. It runs once, so
   * revoking the role later is not undone.
   */
  readonly onAdministratorCreated?: (userId: string) => Promise<void>;
}

/** Registers the authentication API under `/api/auth`. */
export function addAuthRoutes(router: Router, options: AuthRouteOptions): void {
  const auth = options.auth;

  // ---------------------------------------------------------------- public

  router.add(
    'GET',
    '/api/auth/state',
    async () => ({
      body: {
        setupRequired: !(await auth.hasUsers()),
        deliveryAvailable: auth.deliveryAvailable,
      },
    }),
    { auth: 'none' }
  );

  router.add(
    'POST',
    '/api/auth/setup',
    async (request) => {
      const body = await jsonObjectOf(request);
      const username = requiredString(body, 'username');
      const password = requiredString(body, 'password');
      const draft = body.institution;
      // A hub that has just been installed has no institution to name, so the first run may
      // carry the institution's own fields instead of an id. Once a hub has an administrator
      // both forms are refused by the service.
      const outcome =
        draft === undefined
          ? await auth.createFirstAdministrator({
              institutionId: requiredString(body, 'institutionId'),
              username,
              password,
              meta: metaOf(request),
            })
          : await auth.setupFirstRun({
              institution: requireObject(draft) as unknown as CreateInput<'institution'>,
              username,
              password,
              meta: metaOf(request),
            });
      if (outcome.status === 'authenticated') {
        await options.onAdministratorCreated?.(outcome.user.id);
      }
      return { status: 201, body: outcome };
    },
    { auth: 'none' }
  );

  router.add(
    'POST',
    '/api/auth/login',
    async (request) => {
      const body = await jsonObjectOf(request);
      const outcome = await auth.login({
        username: requiredString(body, 'username'),
        password: requiredString(body, 'password'),
        ...optionalInstitution(body),
        meta: metaOf(request),
      });
      return { body: outcome };
    },
    { auth: 'none' }
  );

  router.add(
    'POST',
    '/api/auth/login/totp',
    async (request) => {
      const body = await jsonObjectOf(request);
      const outcome = await auth.completeTotpLogin({
        challengeToken: requiredString(body, 'challengeToken'),
        code: requiredString(body, 'code'),
        meta: metaOf(request),
      });
      return { body: outcome };
    },
    { auth: 'none' }
  );

  router.add(
    'POST',
    '/api/auth/guardian/otp',
    async (request) => {
      const body = await jsonObjectOf(request);
      const result = await auth.requestGuardianOtp({
        phone: requiredString(body, 'phone'),
        ...optionalInstitution(body),
      });
      return { status: 202, body: result };
    },
    { auth: 'none' }
  );

  router.add(
    'POST',
    '/api/auth/guardian/otp/verify',
    async (request) => {
      const body = await jsonObjectOf(request);
      const outcome = await auth.verifyGuardianOtp({
        challengeToken: requiredString(body, 'challengeToken'),
        code: requiredString(body, 'code'),
        meta: metaOf(request),
      });
      return { body: outcome };
    },
    { auth: 'none' }
  );

  router.add(
    'POST',
    '/api/auth/password/forgot',
    async (request) => {
      const body = await jsonObjectOf(request);
      const result = await auth.requestPasswordReset({
        username: requiredString(body, 'username'),
        ...optionalInstitution(body),
      });
      return { status: 202, body: result };
    },
    { auth: 'none' }
  );

  router.add(
    'POST',
    '/api/auth/password/reset',
    async (request) => {
      const body = await jsonObjectOf(request);
      const result = await auth.resetPassword({
        token: requiredString(body, 'token'),
        password: requiredString(body, 'password'),
      });
      return { body: result };
    },
    { auth: 'none' }
  );

  // ---------------------------------------------------------------- session

  router.add('GET', '/api/auth/session', async (request) => {
    const actor = requireActor(request);
    const sessions = await auth.listSessions(actor);
    const current = sessions.find((session) => session.id === actor.sessionId) ?? null;
    return {
      body: {
        session: current === null ? null : { ...current, current: true },
        user: {
          id: actor.userId,
          username: actor.username,
          institutionId: actor.institutionId,
          personRef: actor.personRef,
          mfa: actor.mfa,
        },
      },
    };
  });

  router.add('POST', '/api/auth/logout', async (request) => {
    requireActor(request);
    await auth.logout(request.token ?? '');
    return;
  });

  router.add('GET', '/api/auth/sessions', async (request) => {
    const actor = requireActor(request);
    const sessions = await auth.listSessions(actor);
    return {
      body: {
        sessions: sessions.map((session) => ({
          ...session,
          current: session.id === actor.sessionId,
        })),
      },
    };
  });

  router.add('DELETE', '/api/auth/sessions/:id', async (request) => {
    const actor = requireActor(request);
    await auth.revokeSession(actor, request.params.id ?? '');
    return;
  });

  router.add('POST', '/api/auth/sessions/revoke-all', async (request) => {
    const actor = requireActor(request);
    const revoked = await auth.revokeOtherSessions(actor);
    return { body: { revoked } };
  });

  // ---------------------------------------------------------------- authenticator

  router.add('POST', '/api/auth/totp/enrol', async (request) => {
    const actor = requireActor(request);
    const enrolment = await auth.startTotpEnrolment(actor);
    return { body: enrolment };
  });

  router.add('POST', '/api/auth/totp/confirm', async (request) => {
    const actor = requireActor(request);
    const body = await jsonObjectOf(request);
    const result = await auth.confirmTotpEnrolment(actor, requiredString(body, 'code'));
    return { body: result };
  });

  router.add('POST', '/api/auth/totp/disable', async (request) => {
    const actor = requireActor(request);
    const body = await jsonObjectOf(request);
    await auth.disableTotp(actor, requiredString(body, 'password'));
    return;
  });
}

/** The actor of a protected route; the router guarantees it, this narrows the type. */
function requireActor(request: RouteRequest): AuthenticatedActor {
  if (request.session === null) {
    throw new HttpError(401, 'unauthenticated', 'this endpoint requires a bearer token');
  }
  return request.session;
}

/** The JSON object a request carries. */
async function jsonObjectOf(request: RouteRequest): Promise<Record<string, unknown>> {
  return requireObject(await readJsonBody(request.req));
}

/** A required string field. */
function requiredString(body: Readonly<Record<string, unknown>>, name: string): string {
  const value = body[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'invalid_body', `${name} must be a non-empty string`);
  }
  return value;
}

/** The institution a sign-in names, when it names one. */
function optionalInstitution(
  body: Readonly<Record<string, unknown>>
): { readonly institutionId?: string } {
  const value = body.institutionId;
  if (value === undefined || value === null) return {};
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'invalid_body', 'institutionId must be a non-empty string');
  }
  return { institutionId: value };
}

/**
 * The device a session is created for.
 *
 * The user agent is the only description a browser offers, and it is truncated: it is a label
 * in a device list, not a value anything decides on.
 */
export function metaOf(request: RouteRequest): SessionMeta {
  const agent = headerValue(request.req, 'user-agent');
  const peer = request.req.socket.remoteAddress;
  return {
    ...(agent === undefined ? {} : { deviceLabel: agent.slice(0, 200) }),
    ...(peer === undefined ? {} : { peer }),
  };
}

// ABOUTME: The single-sign-on API: the providers a hub offers, the start of a sign-in and its
// ABOUTME: completion, which turns the provider's code into the same bearer session a password does.

import type { OidcSsoService } from '../auth/oidc';
import { HttpError, readJsonBody, requireObject } from './http';
import { metaOf } from './authRoutes';
import type { Router } from './router';

export interface SsoRouteOptions {
  readonly sso: OidcSsoService;
}

/**
 * Registers the SSO API under `/api/auth/sso`.
 *
 * All three routes are public: a person who is signing in has no session yet. The completion takes
 * the provider's code in a POST body, never a query string, so it is not left in a server or proxy
 * log. The hub's rate limit already covers everything under `/api/auth`.
 */
export function addSsoRoutes(router: Router, options: SsoRouteOptions): void {
  const { sso } = options;

  router.add(
    'GET',
    '/api/auth/sso/providers',
    async () => ({ body: { providers: sso.listProviders() } }),
    { auth: 'none' }
  );

  // The answer carries the authorisation URL to send the browser to and the state to check on the
  // way back. The nonce and the PKCE verifier stay on the hub, sealed.
  router.add(
    'POST',
    '/api/auth/sso/:provider/start',
    async (request) => ({
      body: await sso.beginLogin({ providerId: request.params.provider ?? '' }),
    }),
    { auth: 'none' }
  );

  router.add(
    'POST',
    '/api/auth/sso/:provider/complete',
    async (request) => {
      const body = requireObject(await readJsonBody(request.req));
      const outcome = await sso.completeLogin({
        providerId: request.params.provider ?? '',
        code: requiredString(body, 'code'),
        state: requiredString(body, 'state'),
        meta: metaOf(request),
      });
      return { body: outcome };
    },
    { auth: 'none' }
  );
}

/** A required non-empty string field. */
function requiredString(body: Readonly<Record<string, unknown>>, name: string): string {
  const value = body[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'invalid_body', `${name} must be a non-empty string`);
  }
  return value;
}

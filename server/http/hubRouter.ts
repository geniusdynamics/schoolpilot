// ABOUTME: The hub's router: authentication, the repository API and the service API over one
// ABOUTME: repository, the single surface the LAN server and, later, the cloud server serve.

import type { Repository } from '@/data/repository';

import type { AuthenticationService } from '../auth';
import { addAuthRoutes } from './authRoutes';
import { addRepositoryRoutes } from './repositoryRoutes';
import { Router } from './router';
import { addServiceRoutes } from './serviceRoutes';

export interface HubRouterOptions {
  readonly repository: Repository;
  /**
   * The service that verifies bearer tokens and serves the sign-in endpoints.
   *
   * Without it the router still builds, but every protected route refuses: a hub that cannot
   * say who is calling must not guess.
   */
  readonly auth?: AuthenticationService;
}

/** Builds the router of a hub over an open repository. */
export function createHubRouter(options: HubRouterOptions): Router {
  const auth = options.auth;
  const router = new Router({
    ...(auth === undefined ? {} : { authenticate: (token: string) => auth.authenticate(token) }),
  });

  if (auth !== undefined) addAuthRoutes(router, { auth });

  addRepositoryRoutes(router, { repository: options.repository });
  addServiceRoutes(router, { repository: options.repository });

  return router;
}

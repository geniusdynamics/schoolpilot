// ABOUTME: The hub's router: the repository API and the service API over one repository, the
// ABOUTME: single surface the LAN server and, later, the cloud server serve.

import type { Repository } from '@/data/repository';

import { addRepositoryRoutes } from './repositoryRoutes';
import { Router } from './router';
import type { RateLimiter } from './rateLimit';
import { addServiceRoutes } from './serviceRoutes';
import type { RestrictedAccessLog } from '../security/restrictedAccessLog';

export interface HubRouterOptions {
  readonly repository: Repository;
  /** The actor a write names when the request carries no `x-actor` header. */
  readonly actor?: string;
  /** Enforces the hub's rate limits when set. */
  readonly rateLimiter?: RateLimiter;
  /** Records every read and write of restricted data when set. */
  readonly accessLog?: RestrictedAccessLog;
}

/** Builds the router of a hub over an open repository. */
export function createHubRouter(options: HubRouterOptions): Router {
  const router = new Router(options.rateLimiter);
  const routes = {
    repository: options.repository,
    ...(options.actor !== undefined ? { actor: options.actor } : {}),
    ...(options.accessLog !== undefined ? { accessLog: options.accessLog } : {}),
  };

  addRepositoryRoutes(router, routes);
  addServiceRoutes(router, routes);

  return router;
}

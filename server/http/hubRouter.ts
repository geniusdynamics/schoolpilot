// ABOUTME: The hub's router: the repository API and the service API over one repository, the
// ABOUTME: single surface the LAN server and, later, the cloud server serve.

import type { Repository } from '@/data/repository';
import type { ServerNode } from '@/data/sync';

import { addSyncRoutes } from '../sync';
import { addRepositoryRoutes } from './repositoryRoutes';
import { Router } from './router';
import { addServiceRoutes } from './serviceRoutes';

export interface HubRouterOptions {
  readonly repository: Repository;
  /** The sync node; when present the hub serves `/api/sync`. */
  readonly sync?: ServerNode;
  /** The actor a write names when the request carries no `x-actor` header. */
  readonly actor?: string;
}

/** Builds the router of a hub over an open repository. */
export function createHubRouter(options: HubRouterOptions): Router {
  const router = new Router();
  const routes = {
    repository: options.repository,
    ...(options.actor !== undefined ? { actor: options.actor } : {}),
  };

  addRepositoryRoutes(router, routes);
  addServiceRoutes(router, routes);
  if (options.sync) addSyncRoutes(router, { sync: options.sync });

  return router;
}

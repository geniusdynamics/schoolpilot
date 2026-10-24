// ABOUTME: The hub's router: the repository API, the service API and the backup API over one
// ABOUTME: repository, the single surface the LAN server and, later, the cloud server serve.

import type { Repository } from '@/data/repository';

import type { BackupService } from '../backup/service';
import { addBackupRoutes } from './backupRoutes';
import { addRepositoryRoutes } from './repositoryRoutes';
import { Router } from './router';
import { addServiceRoutes } from './serviceRoutes';

export interface HubRouterOptions {
  readonly repository: Repository;
  /** The actor a write names when the request carries no `x-actor` header. */
  readonly actor?: string;
  /** The backup service; when omitted the hub serves no backup endpoints. */
  readonly backup?: BackupService;
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
  if (options.backup) addBackupRoutes(router, { service: options.backup });

  return router;
}

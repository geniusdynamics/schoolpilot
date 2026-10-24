// ABOUTME: The hub's router: authentication, the repository API, the service API and the backup API
// ABOUTME: over one repository, the single surface the LAN server and, later, the cloud server serve.

import type { Repository } from '@/data/repository';
import type { ServerNode } from '@/data/sync';

import type { AuthenticationService } from '../auth';
import type { BackupService } from '../backup/service';
import { addSyncRoutes } from '../sync';
import { addAuthRoutes } from './authRoutes';
import { addBackupRoutes } from './backupRoutes';
import { addRepositoryRoutes } from './repositoryRoutes';
import { Router } from './router';
import { addServiceRoutes } from './serviceRoutes';

export interface HubRouterOptions {
  readonly repository: Repository;
  /** The sync node; when present the hub serves `/api/sync`. */
  readonly sync?: ServerNode;
  /** The actor a write names when the request carries no `x-actor` header. */
  readonly actor?: string;
  /** The backup service; when omitted the hub serves no backup endpoints. */
  readonly backup?: BackupService;
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
  if (options.sync) addSyncRoutes(router, { sync: options.sync });
  if (options.backup) addBackupRoutes(router, { service: options.backup });

  return router;
}

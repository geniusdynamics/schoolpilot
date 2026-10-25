// ABOUTME: The hub's router: authentication, the repository API, the service API and the backup API
// ABOUTME: over one repository, the single surface the LAN server and, later, the cloud server serve.

import type { Repository } from '@/data/repository';
import type { ServerNode } from '@/data/sync';
import type { SequenceService } from '@/domain/sequences';

import type { AuthenticationService } from '../auth';
import type { BackupService } from '../backup/service';
import type { HealthService } from '../health';
import { addSequenceRoutes } from '../sequences';
import { addSyncRoutes } from '../sync';
import { addAuthRoutes } from './authRoutes';
import { addBackupRoutes } from './backupRoutes';
import { addHealthRoutes } from './healthRoutes';
import { addRepositoryRoutes } from './repositoryRoutes';
import { Router } from './router';
import type { RateLimiter } from './rateLimit';
import { addServiceRoutes } from './serviceRoutes';
import type { RestrictedAccessLog } from '../security/restrictedAccessLog';

export interface HubRouterOptions {
  readonly repository: Repository;
  /** The sync node; when present the hub serves `/api/sync`. */
  readonly sync?: ServerNode;
  /** The hub's sequences; when present the hub serves `/api/sequences`. */
  readonly sequences?: SequenceService;
  /** The actor a write names when the session names none. */
  readonly actor?: string;
  /** The backup service; when omitted the hub serves no backup endpoints. */
  readonly backup?: BackupService;
  /** The health service; when omitted the hub serves no health endpoints. */
  readonly health?: HealthService;
  /**
   * The service that verifies bearer tokens and serves the sign-in endpoints.
   *
   * Without it the router still builds, but every protected route refuses: a hub that cannot
   * say who is calling must not guess.
   */
  readonly auth?: AuthenticationService;
  /** Enforces the hub's rate limits when set. */
  readonly rateLimiter?: RateLimiter;
  /** Records every read and write of restricted data when set. */
  readonly accessLog?: RestrictedAccessLog;
}

/** Builds the router of a hub over an open repository. */
export function createHubRouter(options: HubRouterOptions): Router {
  const auth = options.auth;
  const router = new Router({
    ...(auth === undefined ? {} : { authenticate: (token: string) => auth.authenticate(token) }),
    ...(options.rateLimiter === undefined ? {} : { rateLimiter: options.rateLimiter }),
  });
  const routes = {
    repository: options.repository,
    ...(options.actor !== undefined ? { actor: options.actor } : {}),
    ...(options.accessLog !== undefined ? { accessLog: options.accessLog } : {}),
  };

  if (auth !== undefined) addAuthRoutes(router, { auth });

  addRepositoryRoutes(router, routes);
  addServiceRoutes(router, routes);
  if (options.sync) addSyncRoutes(router, { sync: options.sync });
  if (options.sequences) addSequenceRoutes(router, { sequences: options.sequences });
  if (options.backup) addBackupRoutes(router, { service: options.backup });
  if (options.health) addHealthRoutes(router, { service: options.health });

  return router;
}

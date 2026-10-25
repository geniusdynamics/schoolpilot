// ABOUTME: The hub's router: authentication, the repository API, the service API, the approval API
// ABOUTME: and the backup API over one repository, the single surface the LAN server and, later, the
// ABOUTME: cloud server serve.

import type { ServerNode } from '@/data/sync';
import type { SequenceService } from '@/domain/sequences';

import type { AuthenticationService } from '../auth';
import type { ApprovalEngine, RbacService } from '../auth/rbac';
import type { BackupService } from '../backup/service';
import type { HealthService } from '../health';
import { addSequenceRoutes } from '../sequences';
import { addSyncRoutes } from '../sync';
import { addApprovalRoutes } from './approvalRoutes';
import { addAuthRoutes } from './authRoutes';
import { addBackupRoutes } from './backupRoutes';
import { addHealthRoutes } from './healthRoutes';
import { addRepositoryRoutes } from './repositoryRoutes';
import { Router } from './router';
import type { RateLimiter } from './rateLimit';
import { addServiceRoutes } from './serviceRoutes';

export interface HubRouterOptions {
  /**
   * The authorisation layer.
   *
   * Every entity and service request acts through the repository it hands out for the signed-in
   * account, so the permission model and the field policy of the browser are the hub's own. It
   * also records restricted-data access, so the access log is its option, not the router's.
   */
  readonly rbac: RbacService;
  /** The maker-checker engine the approval API serves. */
  readonly approvals: ApprovalEngine;
  /** The sync node; when present the hub serves `/api/sync`. */
  readonly sync?: ServerNode;
  /** The hub's sequences; when present the hub serves `/api/sequences`. */
  readonly sequences?: SequenceService;
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
}

/** Builds the router of a hub over an open repository. */
export function createHubRouter(options: HubRouterOptions): Router {
  const auth = options.auth;
  const rbac = options.rbac;
  const router = new Router({
    ...(auth === undefined ? {} : { authenticate: (token: string) => auth.authenticate(token) }),
    ...(options.rateLimiter === undefined ? {} : { rateLimiter: options.rateLimiter }),
  });

  if (auth !== undefined) {
    addAuthRoutes(router, {
      auth,
      // The account that sets a hub up is its administrator; without the role it could do nothing.
      onAdministratorCreated: (userId) => rbac.assignRoles(userId, ['administrator']),
    });
  }

  addRepositoryRoutes(router, { rbac });
  addServiceRoutes(router, { rbac });
  addApprovalRoutes(router, { rbac, approvals: options.approvals });
  if (options.sync) addSyncRoutes(router, { sync: options.sync });
  if (options.sequences) addSequenceRoutes(router, { sequences: options.sequences });
  if (options.backup) addBackupRoutes(router, { service: options.backup, rbac });
  if (options.health) addHealthRoutes(router, { service: options.health });

  return router;
}

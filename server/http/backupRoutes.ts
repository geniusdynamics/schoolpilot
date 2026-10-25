// ABOUTME: The backup API: list and create archives, read the status and checksum, restore one,
// ABOUTME: run the restore drill and write a portable export, all over the backup service. The
// ABOUTME: surface is the operator's: reading it needs institution.read, changing it institution.write.

import type { Permission } from '@/data/auth';

import type { RbacService } from '../auth/rbac';
import type { BackupService } from '../backup/service';
import { HttpError, readJsonBody, requireObject } from './http';
import type { RouteRequest, Router } from './router';

export interface BackupRouteOptions {
  readonly service: BackupService;
  /** The authorisation layer: a backup is institution-wide data, so its permission decides. */
  readonly rbac: RbacService;
}

/** Registers the backup API under `/api/backups`. */
export function addBackupRoutes(router: Router, options: BackupRouteOptions): void {
  const { service } = options;

  router.add('GET', '/api/backups', async (request) => {
    await assertPermission(request, options, 'institution.read');
    const { entries, unreadable } = await service.list();
    return { body: { backups: entries, unreadable } };
  });

  router.add('GET', '/api/backups/status', async (request) => {
    await assertPermission(request, options, 'institution.read');
    return { body: await service.status() };
  });

  router.add('GET', '/api/backups/checksum', async (request) => {
    await assertPermission(request, options, 'institution.read');
    return { body: await service.checksum() };
  });

  router.add('POST', '/api/backups', async (request) => {
    await assertPermission(request, options, 'institution.write');
    const body = await optionalObject(request.req);
    const kind = body.kind ?? 'manual';
    if (kind !== 'manual' && kind !== 'pre_restore') {
      throw new HttpError(400, 'invalid_body', 'kind must be manual or pre_restore');
    }
    const entry = await service.create(kind);
    return { status: 201, body: entry };
  });

  router.add('POST', '/api/backups/drill', async (request) => {
    await assertPermission(request, options, 'institution.write');
    return { body: await service.drill() };
  });

  router.add('POST', '/api/backups/export', async (request) => {
    await assertPermission(request, options, 'institution.write');
    const body = await optionalObject(request.req);
    if (body.includeRestricted !== undefined && typeof body.includeRestricted !== 'boolean') {
      throw new HttpError(400, 'invalid_body', 'includeRestricted must be a boolean');
    }
    const manifest = await service.exportAll({
      includeRestricted: body.includeRestricted === true,
    });
    return { status: 201, body: manifest };
  });

  router.add('GET', '/api/backups/:id', async (request) => {
    await assertPermission(request, options, 'institution.read');
    return { body: await service.readHeader(request.params.id ?? '') };
  });

  router.add('POST', '/api/backups/:id/restore', async (request) => {
    await assertPermission(request, options, 'institution.write');
    const result = await service.restore(request.params.id ?? '');
    return { status: 201, body: result };
  });
}

/**
 * Refuses a caller whose roles do not hold the permission.
 *
 * A backup holds every row of the institution, so the surface is institution-wide: reading one is
 * `institution.read`, and creating, exporting or restoring one is `institution.write`, which only
 * the administrator holds.
 */
async function assertPermission(
  request: RouteRequest,
  options: BackupRouteOptions,
  permission: Permission
): Promise<void> {
  const session = request.session;
  if (session === null) {
    throw new HttpError(401, 'unauthenticated', 'this endpoint requires a bearer token');
  }
  const access = await options.rbac.accessFor(session);
  access.assertPermission(permission);
}

/** Reads an optional JSON body; a request with no body is an empty object. */
async function optionalObject(
  req: Parameters<typeof readJsonBody>[0]
): Promise<Record<string, unknown>> {
  const body = await readJsonBody(req);
  if (body === undefined) return {};
  return requireObject(body);
}


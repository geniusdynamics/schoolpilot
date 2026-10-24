// ABOUTME: The backup API: list and create archives, read the status and checksum, restore one,
// ABOUTME: run the restore drill and write a portable export, all over the backup service.

import type { BackupService } from '../backup/service';
import { HttpError, readJsonBody, requireObject } from './http';
import type { Router } from './router';

export interface BackupRouteOptions {
  readonly service: BackupService;
}

/** Registers the backup API under `/api/backups`. */
export function addBackupRoutes(router: Router, options: BackupRouteOptions): void {
  const { service } = options;

  router.add('GET', '/api/backups', async () => {
    const { entries, unreadable } = await service.list();
    return { body: { backups: entries, unreadable } };
  });

  router.add('GET', '/api/backups/status', async () => ({ body: await service.status() }));

  router.add('GET', '/api/backups/checksum', async () => ({ body: await service.checksum() }));

  router.add('POST', '/api/backups', async (request) => {
    const body = await optionalObject(request.req);
    const kind = body.kind ?? 'manual';
    if (kind !== 'manual' && kind !== 'pre_restore') {
      throw new HttpError(400, 'invalid_body', 'kind must be manual or pre_restore');
    }
    const entry = await service.create(kind);
    return { status: 201, body: entry };
  });

  router.add('POST', '/api/backups/drill', async () => ({ body: await service.drill() }));

  router.add('POST', '/api/backups/export', async (request) => {
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
    return { body: await service.readHeader(request.params.id ?? '') };
  });

  router.add('POST', '/api/backups/:id/restore', async (request) => {
    const result = await service.restore(request.params.id ?? '');
    return { status: 201, body: result };
  });
}

/** Reads an optional JSON body; a request with no body is an empty object. */
async function optionalObject(
  req: Parameters<typeof readJsonBody>[0]
): Promise<Record<string, unknown>> {
  const body = await readJsonBody(req);
  if (body === undefined) return {};
  return requireObject(body);
}

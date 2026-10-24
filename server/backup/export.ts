// ABOUTME: The portable full export: one JSON and one CSV file per canonical entity plus a
// ABOUTME: manifest of counts and checksums, excluding restricted entities and encrypted columns.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { SqliteAdapter, SqliteRow } from '@/data/adapters/sqlite';
import { columnsFor, decodeRow } from '@/data/repository';
import { ENTITY_NAMES, storageFor, type EntityName } from '@/domain/schema';

import { digestDatabase, quoteIdentifier } from './digest';
import { BackupError } from './errors';
import type { ExportFile, ExportManifest } from './types';

/**
 * Entities whose rows spec 06 §8.1 calls special/restricted: medical, safeguarding and identity
 * documents. They stay out of a bulk export unless the operator explicitly asks for them.
 */
export const RESTRICTED_ENTITIES: readonly EntityName[] = [
  'health_visit',
  'conduct_incident',
  'identifier',
];

export interface ExportOptions {
  readonly adapter: SqliteAdapter;
  readonly destination: string;
  readonly includeRestricted?: boolean;
  readonly generatedAt?: Date;
}

/**
 * Writes a full export of the canonical entities into `destination`.
 *
 * Every included entity gets `<entity>.json` (array of canonical rows) and `<entity>.csv`. A row
 * is normalised to the entity's declared columns, so the two files and the manifest agree even
 * when an optional field is absent. Columns the schema marks as encrypted are written as `null`
 * unless `includeRestricted` is set.
 */
export async function exportDatabase(options: ExportOptions): Promise<ExportManifest> {
  const includeRestricted = options.includeRestricted === true;
  const generatedAt = (options.generatedAt ?? new Date()).toISOString();
  const directory = path.resolve(options.destination);

  await prepareDirectory(directory);

  const digest = await digestDatabase(options.adapter);
  const files: ExportFile[] = [];
  const excludedEntities: string[] = [];
  const redactedColumns: { entity: string; column: string }[] = [];

  for (const entity of ENTITY_NAMES) {
    if (!includeRestricted && RESTRICTED_ENTITIES.includes(entity)) {
      excludedEntities.push(entity);
      continue;
    }

    const columns = columnsFor(entity);
    const encrypted = new Set(storageFor(entity).encrypted);
    if (!includeRestricted) {
      for (const column of encrypted) {
        redactedColumns.push({ entity, column });
      }
    }

    const names = Object.keys(columns.columns);
    const rows = await readRows(options.adapter, columns.table);
    const normalised = rows.map((raw) => {
      const decoded = decodeRow(columns, raw).row;
      const row: Record<string, unknown> = {};
      for (const name of names) {
        const value = decoded[name];
        if (value === undefined || value === null) {
          row[name] = null;
        } else if (!includeRestricted && encrypted.has(name)) {
          row[name] = null;
        } else {
          row[name] = value;
        }
      }
      return row;
    });

    const json = `${JSON.stringify(normalised, null, 2)}\n`;
    const csv = renderCsv(names, normalised);
    await fs.promises.writeFile(path.join(directory, `${entity}.json`), json, 'utf8');
    await fs.promises.writeFile(path.join(directory, `${entity}.csv`), csv, 'utf8');

    files.push({
      entity,
      json: `${entity}.json`,
      csv: `${entity}.csv`,
      rows: normalised.length,
      checksums: {
        json: sha256(json),
        csv: sha256(csv),
      },
    });
  }

  const manifest: ExportManifest = {
    format: 'schoolpilot-export',
    version: 1,
    generatedAt,
    directory,
    includeRestricted,
    excludedEntities,
    redactedColumns,
    digest,
    files,
  };

  await fs.promises.writeFile(
    path.join(directory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );

  return manifest;
}

/** Reads every row of a table, including soft-deleted ones, so the export loses nothing. */
async function readRows(adapter: SqliteAdapter, table: string): Promise<SqliteRow[]> {
  return adapter.all<SqliteRow>(`SELECT * FROM ${quoteIdentifier(table)}`);
}

/** Renders rows as RFC 4180 CSV: quoted when a value holds a comma, quote or newline. */
export function renderCsv(
  columns: readonly string[],
  rows: readonly Readonly<Record<string, unknown>>[]
): string {
  const lines = [columns.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text =
    typeof value === 'object' ? JSON.stringify(value) : typeof value === 'boolean' ? String(value) : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Creates the destination, refusing one that already holds files. */
async function prepareDirectory(directory: string): Promise<void> {
  try {
    const existing = await fs.promises.readdir(directory);
    if (existing.length > 0) {
      throw new BackupError(
        'backup_failed',
        `the export directory is not empty: ${directory}`
      );
    }
  } catch (error) {
    if (error instanceof BackupError) throw error;
    if (!isMissing(error)) {
      throw new BackupError('backup_failed', `the export directory could not be read: ${directory}`, {
        cause: error,
      });
    }
    await fs.promises.mkdir(directory, { recursive: true });
  }
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'ENOENT'
  );
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

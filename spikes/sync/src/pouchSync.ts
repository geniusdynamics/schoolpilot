// ABOUTME: The PouchDB candidate: one document per row, whole-document conflicts, and the same
// ABOUTME: merge policies applied after replication instead of inside the library.

import PouchDB from 'pouchdb-node';

import type { EntityName } from '@/domain/schema';

import type { ConflictNote, Envelope } from './envelope';
import { compareHlc, deviceOf, laterHlc } from './hlc';
import { mergeChange, policyFor, type StoredState } from './policies';

/**
 * The document a replica stores.
 *
 * It is an envelope plus the row: PouchDB contributes `_rev` and conflict detection, so the
 * per-field clock and the base every field was written against have to travel inside the
 * document. Without them a resolution cannot tell "two devices edited different fields" from
 * "two devices edited the same field".
 */
export interface PouchDoc {
  readonly _id: string;
  readonly _rev?: string;
  readonly entity: EntityName;
  readonly rowId: string;
  readonly op: 'create' | 'update' | 'remove';
  readonly hlc: string;
  readonly deviceId: string;
  readonly fields: readonly string[];
  readonly base: Readonly<Record<string, string>>;
  readonly clock: Readonly<Record<string, string>>;
  readonly payload: Readonly<Record<string, unknown>>;
}

/** A document with the losing revisions the database kept. */
type ConflictedDoc = PouchDoc & { readonly _conflicts?: readonly string[] };

/** What resolving a document produced. */
export interface PouchResolution {
  readonly entity: EntityName;
  readonly id: string;
  readonly merged: PouchDoc;
  readonly conflicts: readonly ConflictNote[];
  /** The revisions the resolution removed. */
  readonly discarded: readonly string[];
}

/** The exact bytes a document costs on the wire. */
export function docBytes(doc: PouchDoc): number {
  return Buffer.byteLength(JSON.stringify(doc), 'utf8');
}

/** The document id of a canonical row. */
export function docId(entity: EntityName, id: string): string {
  return `${entity}:${id}`;
}

/**
 * A PouchDB replica.
 *
 * Each change is a whole document, so the library's unit of conflict is the row. The merge
 * policy is not PouchDB's: it runs here, over the revisions the database kept.
 */
export class PouchReplica {
  private readonly db: PouchDB.Database;
  readonly directory: string;

  private constructor(db: PouchDB.Database, directory: string) {
    this.db = db;
    this.directory = directory;
  }

  /** Opens a database in a directory. */
  static open(directory: string): PouchReplica {
    return new PouchReplica(new PouchDB(directory), directory);
  }

  /** Creates the document of a new row. */
  async create(
    entity: EntityName,
    payload: Readonly<Record<string, unknown>>,
    hlc: string,
    deviceId: string
  ): Promise<PouchDoc> {
    const clock: Record<string, string> = {};
    for (const field of Object.keys(payload)) {
      if (field !== 'id') clock[field] = hlc;
    }
    const doc: PouchDoc = {
      _id: docId(entity, String(payload.id)),
      entity,
      rowId: String(payload.id),
      op: 'create',
      hlc,
      deviceId,
      fields: Object.keys(payload),
      base: {},
      clock,
      payload,
    };
    const response = await this.db.put(doc);
    return { ...doc, _rev: response.rev };
  }

  /** Writes a patch over the current document, the way an offline edit does. */
  async update(
    entity: EntityName,
    id: string,
    patch: Readonly<Record<string, unknown>>,
    hlc: string,
    deviceId: string
  ): Promise<PouchDoc> {
    const existing = await this.get(entity, id);
    if (!existing) throw new Error(`no ${entity} ${id} to update`);

    const fields = Object.keys(patch);
    const base: Record<string, string> = {};
    const clock: Record<string, string> = { ...existing.clock };
    for (const field of fields) {
      const seen = existing.clock[field];
      if (seen !== undefined) base[field] = seen;
      clock[field] = hlc;
    }

    const doc: PouchDoc = {
      ...existing,
      _rev: existing._rev,
      op: 'update',
      hlc,
      deviceId,
      fields,
      base,
      clock,
      payload: { ...existing.payload, ...patch },
    };
    const response = await this.db.put(doc);
    return { ...doc, _rev: response.rev };
  }

  /** Soft-deletes a row, the way the canonical removal does before it is synced. */
  async remove(entity: EntityName, id: string, hlc: string, deviceId: string): Promise<void> {
    const existing = await this.get(entity, id);
    if (!existing) return;
    const removed: PouchDoc = {
      ...existing,
      op: 'remove',
      hlc,
      deviceId,
      fields: ['deleted_at'],
      clock: { ...existing.clock, deleted_at: hlc },
      payload: { ...existing.payload, deleted_at: hlc },
    };
    await this.db.put(removed);
  }

  /** One document, or null when the replica does not hold it. */
  async get(entity: EntityName, id: string): Promise<PouchDoc | null> {
    try {
      return (await this.db.get(docId(entity, id))) as unknown as PouchDoc;
    } catch (error) {
      if ((error as { status?: number }).status === 404) return null;
      throw error;
    }
  }

  /** Every live document, ordered by id. Losing revisions are not included. */
  async allDocs(): Promise<readonly PouchDoc[]> {
    const page = await this.db.allDocs({ include_docs: true });
    const docs: PouchDoc[] = [];
    for (const row of page.rows) {
      if (row.doc) docs.push(row.doc as unknown as PouchDoc);
    }
    return docs;
  }

  /** The winning revision plus every losing revision the database kept. */
  async conflicted(entity: EntityName, id: string): Promise<readonly PouchDoc[]> {
    const winner = (await this.db.get(docId(entity, id), {
      conflicts: true,
    })) as unknown as ConflictedDoc;

    const docs: PouchDoc[] = [winner];
    for (const rev of winner._conflicts ?? []) {
      docs.push((await this.db.get(docId(entity, id), { rev })) as unknown as PouchDoc);
    }
    return docs;
  }

  /** The documents that carry a cell, whether or not they conflict. */
  async withCell(
    entity: EntityName,
    cell: Readonly<Record<string, unknown>>
  ): Promise<readonly PouchDoc[]> {
    const docs = await this.allDocs();
    return docs.filter(
      (doc) =>
        doc.entity === entity &&
        Object.entries(cell).every(([field, value]) => (doc.payload[field] ?? null) === (value ?? null))
    );
  }

  /** Pushes local documents into another replica and returns how many were written. */
  async replicateTo(other: PouchReplica): Promise<number> {
    const result = await PouchDB.replicate(this.db, other.db);
    return result.docs_written;
  }

  /** Pulls the documents of another replica and returns how many were written. */
  async replicateFrom(other: PouchReplica): Promise<number> {
    const result = await PouchDB.replicate(other.db, this.db);
    return result.docs_written;
  }

  /**
   * Resolves the conflicts of one document with the shared policy.
   *
   * The revisions are folded in clock order, exactly as the canonical server folds intents.
   * The merged state is written on top of the revision PouchDB chose, then every losing
   * revision is removed, so the database keeps one leaf and `_conflicts` clears.
   */
  async resolveWithPolicy(entity: EntityName, id: string): Promise<PouchResolution | null> {
    const docs = await this.conflicted(entity, id);
    if (docs.length < 2) return null;

    const winner = docs[0] as PouchDoc;
    const ordered = [...docs].sort((left, right) => compareHlc(left.hlc, right.hlc));
    const policy = policyFor(entity);

    let state: StoredState | null = null;
    let mergedHlc = '';
    const conflicts: ConflictNote[] = [];

    for (const doc of ordered) {
      if (doc === undefined) continue;
      mergedHlc = laterHlc(mergedHlc, doc.hlc);

      if (!state) {
        // The document carries the clock of every column it holds, so the first revision seeds
        // the state directly. Re-deriving it through `mergeChange` would clock the whole payload
        // at one instant and report a conflict for every column the other revision touched.
        state = { id: doc.rowId, row: { ...doc.payload }, clock: { ...doc.clock } };
        continue;
      }

      const envelope: Envelope = {
        entity,
        id: doc.rowId,
        op: doc.op,
        hlc: doc.hlc,
        deviceId: doc.deviceId,
        fields: doc.fields,
        base: doc.base,
        payload: doc.payload,
      };
      const result = mergeChange(policy, envelope, state);
      conflicts.push(...result.conflicts);
      state = { id: result.id, row: result.row, clock: result.clock };
    }

    if (!state) return null;

    const merged: PouchDoc = {
      ...winner,
      _rev: winner._rev,
      op: 'update',
      hlc: mergedHlc,
      deviceId: deviceOf(mergedHlc),
      fields: Object.keys(state.row),
      base: {},
      clock: state.clock,
      payload: state.row,
    };
    const written = await this.db.put(merged);

    const discarded: string[] = [];
    for (const doc of docs) {
      if (!doc._rev || doc._rev === winner._rev) continue;
      await this.db.remove(doc._id, doc._rev);
      discarded.push(doc._rev);
    }

    return {
      entity,
      id,
      merged: { ...merged, _rev: written.rev },
      conflicts,
      discarded,
    };
  }

  /** Writes a batch and returns the per-document outcome, including partial failures. */
  async bulkPut(docs: readonly PouchDoc[]): Promise<readonly { ok?: boolean; error?: string }[]> {
    const responses = (await this.db.bulkDocs(docs as unknown as object[])) as Array<
      { ok: true } | { error: true; name?: string; status?: number }
    >;

    // A refused document answers `{error: true, name: 'conflict', status: 409}`, not an error
    // string, so the reason has to be read off `name`.
    return responses.map((response) =>
      'ok' in response && response.ok
        ? { ok: true }
        : { error: ('name' in response && response.name) || 'error' }
    );
  }

  /** The number of documents the replica holds. */
  async count(): Promise<number> {
    const info = await this.db.info();
    return info.doc_count;
  }

  /** Applies bulk writes in one PouchDB batch and reports how many landed. */
  async putMany(docs: readonly PouchDoc[]): Promise<number> {
    const responses = await this.bulkPut(docs);
    return responses.filter((response) => response.ok).length;
  }

  /** Closes the database, optionally destroying its files. */
  async close(destroy = true): Promise<void> {
    if (destroy) {
      await this.db.destroy();
      return;
    }
    await this.db.close();
  }
}

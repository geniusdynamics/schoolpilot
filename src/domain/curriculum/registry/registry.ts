// ABOUTME: The pack registry: install a validated pack onto a programme, upgrade it through a
// ABOUTME: preview, and keep programme overrides as auditable records, all through the repository.

import type { ListQuery, Repository, RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';
import type { EntityName, JsonValue } from '@/domain/schema';

import { packChecksum } from './checksum';
import { diffPacks, isOverridable, resolvePackPath } from './diff';
import { PackRegistryError } from './errors';
import { isJsonValue, isRecord, withPackPath } from './json';
import { loadPack } from './load';
import {
  packRef,
  type LoadedPack,
  type PackBreak,
  type PackInstallation,
  type PackLoadResult,
  type PackOverrideRecord,
  type PackRef,
  type UpgradePreview,
} from './types';

type ProgrammeRow = RepositoryRow<'programme'>;
type SourceRow = RepositoryRow<'curriculum_pack'>;

/** The reference a source is asked for. */
export interface PackSourceRef {
  readonly code: string;
  readonly version: string;
}

/**
 * Resolves the document a `code@version` names — the pack library of the installation, or the
 * packs shipped with the application. The registry reads the installed pack through it, so it
 * can verify the recorded checksum before it previews anything.
 */
export type PackSource = (ref: PackSourceRef) => unknown | Promise<unknown>;

export interface PackRegistryOptions {
  readonly repository: Repository;
  /** The acting user for writes that do not name one. */
  readonly actor: string;
  readonly source: PackSource;
  /** The clock the override records stamp; defaults to the wall clock. */
  readonly now?: () => Date;
}

export interface RegistryWriteOptions {
  readonly actor?: string;
  /** Appended to the registry's own reason, so the audit trail says why as well as what. */
  readonly reason?: string;
}

export interface UpgradeOptions extends RegistryWriteOptions {
  /** Apply a preview that found breaks; the caller has decided to accept them. */
  readonly force?: boolean;
}

export interface UpgradeResult {
  readonly preview: UpgradePreview;
  readonly installation: PackInstallation;
}

export interface PackRegistry {
  /** Validates a pack document; the loader is part of the registry's surface. */
  load(document: unknown): PackLoadResult;
  /** Records the pack source and pins the programme to it. The programme must already name it. */
  install(
    programmeId: string,
    document: unknown,
    options?: RegistryWriteOptions
  ): Promise<PackInstallation>;
  /** The pack source a programme is pinned to, or null when none was recorded. */
  installation(programmeId: string): Promise<PackInstallation | null>;
  /** What an upgrade would change and break. Reads only; it writes nothing. */
  previewUpgrade(programmeId: string, document: unknown): Promise<UpgradePreview>;
  /** Previews, then records the source and moves the programme pin, in one transaction. */
  upgrade(
    programmeId: string,
    document: unknown,
    options?: UpgradeOptions
  ): Promise<UpgradeResult>;
  /** Records one override of a pack path, with the actor and the instant. */
  applyOverride(
    programmeId: string,
    path: string,
    value: unknown,
    options?: RegistryWriteOptions
  ): Promise<PackOverrideRecord>;
  /** Removes one override; the pack content is never involved. */
  revertOverride(
    programmeId: string,
    path: string,
    options?: RegistryWriteOptions
  ): Promise<PackOverrideRecord>;
  listOverrides(programmeId: string): Promise<readonly PackOverrideRecord[]>;
}

const PAGE_LIMIT = 500;

function refOfDocument(document: unknown): string | null {
  if (!isRecord(document)) return null;
  const manifest = document.pack;
  if (!isRecord(manifest)) return null;
  const code = manifest.code;
  const version = manifest.version;
  return typeof code === 'string' && typeof version === 'string' ? packRef(code, version) : null;
}

function pinOf(programme: ProgrammeRow): PackRef {
  return packRef(programme.curriculum_pack_code, programme.pack_version);
}

function installationOf(programme: ProgrammeRow, source: SourceRow): PackInstallation {
  return {
    programmeId: programme.id,
    pack: {
      code: source.code,
      version: source.version,
      ref: packRef(source.code, source.version),
      checksum: source.checksum,
    },
    sourceId: source.id,
  };
}

function overrideRecord(path: string, value: unknown): PackOverrideRecord {
  if (isRecord(value) && Object.keys(value).length === 3) {
    const actor = value.actor;
    const at = value.at;
    if (typeof actor === 'string' && typeof at === 'string' && 'value' in value) {
      return { path, value: value.value, actor, at };
    }
  }
  // A record written before the registry existed: still an override, without provenance.
  return { path, value, actor: null, at: null };
}

export function createPackRegistry(options: PackRegistryOptions): PackRegistry {
  const { repository, source } = options;
  const defaultActor = options.actor;
  const now = options.now ?? (() => new Date());

  /** Reads every page of a list query. */
  async function listAll<E extends EntityName>(
    entity: E,
    query: ListQuery
  ): Promise<RepositoryRow<E>[]> {
    const rows: RepositoryRow<E>[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await repository.list(entity, { ...query, cursor, limit: PAGE_LIMIT });
      rows.push(...page.items);
      if (!page.hasMore || !page.nextCursor) return rows;
      cursor = page.nextCursor;
    }
  }

  async function programmeOf(programmeId: string): Promise<ProgrammeRow> {
    const programme = await repository.get('programme', asId<'programme'>(programmeId));
    if (!programme) {
      throw new PackRegistryError('programme_not_found', `there is no programme ${programmeId}`, {
        programmeId,
      });
    }
    return programme;
  }

  /** The source row of the pack the programme is pinned to. */
  async function sourceRowOf(programme: ProgrammeRow): Promise<SourceRow | null> {
    const page = await repository.list('curriculum_pack', {
      where: {
        institution_id: programme.institution_id,
        code: programme.curriculum_pack_code,
        version: programme.pack_version,
      },
      limit: 1,
    });
    return page.items[0] ?? null;
  }

  function mustLoad(document: unknown, programmeId: string): LoadedPack {
    const result = loadPack(document);
    if (result.ok) return result.pack;

    const ref = refOfDocument(document);
    throw new PackRegistryError(
      'invalid_pack',
      `${ref ?? 'the pack'} failed validation with ${result.issues.length} issue(s)`,
      { issues: result.issues, programmeId, ...(ref === null ? {} : { pack: ref }) }
    );
  }

  interface Installed {
    readonly document: unknown;
    readonly pack: LoadedPack;
  }

  /** The installed pack: its row, the document the source gives for it, and its checksum check. */
  async function installedOf(programme: ProgrammeRow): Promise<Installed> {
    const sourceRow = await sourceRowOf(programme);
    if (!sourceRow) {
      throw new PackRegistryError(
        'nothing_installed',
        `programme ${programme.id} pins ${pinOf(programme)} but no pack source was recorded; install it first`,
        { programmeId: programme.id, pack: pinOf(programme) }
      );
    }

    const document = await source({ code: sourceRow.code, version: sourceRow.version });
    if (document === undefined) {
      throw new PackRegistryError(
        'pack_source_missing',
        `the pack source cannot produce ${packRef(sourceRow.code, sourceRow.version)}`,
        { programmeId: programme.id, pack: packRef(sourceRow.code, sourceRow.version) }
      );
    }

    const loaded = loadPack(document);
    if (!loaded.ok) {
      throw new PackRegistryError(
        'invalid_pack',
        `the installed ${packRef(sourceRow.code, sourceRow.version)} is not a valid pack`,
        { issues: loaded.issues, programmeId: programme.id, pack: packRef(sourceRow.code, sourceRow.version) }
      );
    }

    const checksum = packChecksum(document);
    if (checksum !== sourceRow.checksum) {
      throw new PackRegistryError(
        'checksum_mismatch',
        `${packRef(sourceRow.code, sourceRow.version)} was recorded as ${sourceRow.checksum} but the source gives ${checksum}`,
        { programmeId: programme.id, pack: packRef(sourceRow.code, sourceRow.version) }
      );
    }

    return { document, pack: loaded.pack };
  }

  /** The source row for a pack version, created once per institution. */
  async function ensureSource(
    programme: ProgrammeRow,
    pack: LoadedPack,
    checksum: string,
    actor: string,
    reason: string
  ): Promise<SourceRow> {
    const page = await repository.list('curriculum_pack', {
      where: {
        institution_id: programme.institution_id,
        code: pack.code,
        version: pack.version,
      },
      limit: 1,
    });

    const existing = page.items[0];
    if (existing) {
      if (existing.checksum !== checksum) {
        throw new PackRegistryError(
          'checksum_conflict',
          `${pack.ref} is already recorded with checksum ${existing.checksum}, not ${checksum}`,
          { programmeId: programme.id, pack: pack.ref }
        );
      }
      return existing;
    }

    return repository.create(
      'curriculum_pack',
      {
        institution_id: programme.institution_id,
        code: pack.code,
        version: pack.version,
        country: pack.country,
        issuer: pack.issuers[0],
        effective_from: pack.effective_from,
        checksum,
      },
      { actor, reason }
    );
  }

  function reasonFor(verb: string, detail: string, given?: string): string {
    const head = `${verb} ${detail}`;
    return given ? `${head}: ${given}` : head;
  }

  async function findBreaks(
    programme: ProgrammeRow,
    candidate: LoadedPack,
    candidateDocument: unknown,
    overrides: readonly PackOverrideRecord[]
  ): Promise<readonly PackBreak[]> {
    const breaks: PackBreak[] = [];

    for (const override of overrides) {
      // An entry without provenance was not written by the registry; it is reported, but the
      // registry cannot tell whether it names a pack path, so it does not guard the upgrade.
      if (override.actor === null) continue;

      const slot = resolvePackPath(candidateDocument, override.path);
      if (!slot.found) {
        breaks.push({
          code: 'override_path_removed',
          subject: override.path,
          detail: `the override on ${override.path} has no path in ${candidate.ref}`,
        });
        continue;
      }
      if (!isOverridable(candidate, override.path)) {
        breaks.push({
          code: 'override_not_overridable',
          subject: override.path,
          detail: `${candidate.ref} no longer allows a school to override ${override.path}`,
        });
      }
    }

    const areas = await listAll('learning_area', {
      where: { programme_id: programme.id, institution_id: programme.institution_id },
    });
    const candidateAreas = new Set(candidate.learningAreas.map((area) => area.code));
    const candidateLevels = new Set(candidate.structure.levels.map((level) => level.code));

    const levelCodes = new Map<string, string>();
    for (const area of areas) {
      if (!candidateAreas.has(area.code)) {
        breaks.push({
          code: 'learning_area_row_removed',
          subject: area.code,
          detail: `learning area ${area.code} of programme ${programme.id} has no entry in ${candidate.ref}`,
        });
      }
      for (const levelId of area.level_ids) {
        if (levelCodes.has(levelId)) continue;
        const level = await repository.get('level', asId<'level'>(levelId));
        if (level) levelCodes.set(levelId, level.code);
      }
    }

    for (const code of new Set(levelCodes.values())) {
      if (!candidateLevels.has(code)) {
        breaks.push({
          code: 'level_row_removed',
          subject: code,
          detail: `level ${code} is used by a row of programme ${programme.id} but ${candidate.ref} does not declare it`,
        });
      }
    }

    return breaks;
  }

  function readOverrides(programme: ProgrammeRow): readonly PackOverrideRecord[] {
    const stored = programme.overrides ?? {};
    return Object.keys(stored)
      .sort()
      .map((path) => overrideRecord(path, stored[path]));
  }

  async function previewUpgrade(
    programmeId: string,
    document: unknown
  ): Promise<UpgradePreview> {
    const candidate = mustLoad(document, programmeId);
    const programme = await programmeOf(programmeId);
    const installed = await installedOf(programme);
    const difference = diffPacks(installed.pack, candidate);
    const overrides = readOverrides(programme);
    const breaks = await findBreaks(programme, candidate, document, overrides);

    return {
      programmeId,
      from: installed.pack.ref,
      to: candidate.ref,
      versionBump: difference.versionBump,
      changes: difference.changes,
      breaks,
      warnings: difference.warnings,
      safe: breaks.length === 0,
      overrides,
    };
  }

  async function install(
    programmeId: string,
    document: unknown,
    writeOptions: RegistryWriteOptions = {}
  ): Promise<PackInstallation> {
    const pack = mustLoad(document, programmeId);
    const programme = await programmeOf(programmeId);
    const recorded = await sourceRowOf(programme);

    // A programme "has" a pack once a source row records it. A pin set by the wizard that was
    // never installed is still a first install, so the pin may move to the candidate.
    if (
      recorded &&
      (programme.curriculum_pack_code !== pack.code || programme.pack_version !== pack.version)
    ) {
      throw new PackRegistryError(
        'upgrade_required',
        `programme ${programmeId} is pinned to ${pinOf(programme)}; installing ${pack.ref} goes through upgrade()`,
        { programmeId, pack: pack.ref }
      );
    }

    const checksum = packChecksum(document);
    if (recorded) {
      if (recorded.checksum !== checksum) {
        throw new PackRegistryError(
          'checksum_conflict',
          `${pack.ref} is already recorded with checksum ${recorded.checksum}, not ${checksum}`,
          { programmeId, pack: pack.ref }
        );
      }
      return installationOf(programme, recorded);
    }

    const actor = writeOptions.actor ?? defaultActor;
    const reason = reasonFor('install', pack.ref, writeOptions.reason);

    const saved = await repository.transaction(async () => {
      const created = await ensureSource(programme, pack, checksum, actor, reason);
      const updated = await repository.update(
        'programme',
        programme.id,
        { curriculum_pack_code: pack.code, pack_version: pack.version },
        { expectedVersion: programme.rowVersion, actor, reason }
      );
      return { created, updated };
    });

    return installationOf(saved.updated, saved.created);
  }

  async function upgrade(
    programmeId: string,
    document: unknown,
    writeOptions: UpgradeOptions = {}
  ): Promise<UpgradeResult> {
    const candidate = mustLoad(document, programmeId);
    const programme = await programmeOf(programmeId);

    // A programme already on this exact version is not upgraded: install() owns that case and
    // refuses a document whose content does not match the recorded checksum.
    if (programme.curriculum_pack_code === candidate.code && programme.pack_version === candidate.version) {
      const installation = await install(programmeId, document, writeOptions);
      return { preview: await previewUpgrade(programmeId, document), installation };
    }

    const preview = await previewUpgrade(programmeId, document);
    if (!preview.safe && writeOptions.force !== true) {
      throw new PackRegistryError(
        'upgrade_unsafe',
        `${candidate.ref} would break ${preview.breaks.length} existing reference(s)`,
        { preview, programmeId, pack: candidate.ref }
      );
    }

    const actor = writeOptions.actor ?? defaultActor;
    const reason = reasonFor('upgrade', `${pinOf(programme)} -> ${candidate.ref}`, writeOptions.reason);
    const checksum = packChecksum(document);

    const saved = await repository.transaction(async () => {
      const created = await ensureSource(
        programme,
        candidate,
        checksum,
        actor,
        reason
      );
      const updated = await repository.update(
        'programme',
        programme.id,
        { curriculum_pack_code: candidate.code, pack_version: candidate.version },
        { expectedVersion: programme.rowVersion, actor, reason }
      );
      return { created, updated };
    });

    return { preview, installation: installationOf(saved.updated, saved.created) };
  }

  async function applyOverride(
    programmeId: string,
    path: string,
    value: unknown,
    writeOptions: RegistryWriteOptions = {}
  ): Promise<PackOverrideRecord> {
    const programme = await programmeOf(programmeId);
    const installed = await installedOf(programme);

    if (!isJsonValue(value)) {
      throw new PackRegistryError('override_invalid_value', `${path} is not a JSON value`, {
        programmeId,
        pack: installed.pack.ref,
      });
    }
    if (!resolvePackPath(installed.document, path).found) {
      throw new PackRegistryError('override_unresolved', `${installed.pack.ref} has no path ${path}`, {
        programmeId,
        pack: installed.pack.ref,
      });
    }
    if (!isOverridable(installed.pack, path)) {
      throw new PackRegistryError(
        'override_not_allowed',
        `${installed.pack.ref} does not declare ${path} overridable`,
        { programmeId, pack: installed.pack.ref }
      );
    }

    // The override has to leave the pack a valid document; the check runs on a copy, so the pack
    // content itself is never modified.
    const patched = loadPack(withPackPath(installed.document, path, value));
    if (!patched.ok) {
      throw new PackRegistryError(
        'override_invalid_value',
        `an override of ${path} would make ${installed.pack.ref} invalid`,
        { issues: patched.issues, programmeId, pack: installed.pack.ref }
      );
    }

    const actor = writeOptions.actor ?? defaultActor;
    const at = now().toISOString();
    const stored: Record<string, JsonValue> = {
      ...(programme.overrides ?? {}),
      [path]: { value, actor, at },
    };

    await repository.update(
      'programme',
      programme.id,
      { overrides: stored },
      {
        expectedVersion: programme.rowVersion,
        actor,
        reason: reasonFor('override', `${path} of ${installed.pack.ref}`, writeOptions.reason),
      }
    );

    return { path, value, actor, at };
  }

  async function revertOverride(
    programmeId: string,
    path: string,
    writeOptions: RegistryWriteOptions = {}
  ): Promise<PackOverrideRecord> {
    const programme = await programmeOf(programmeId);
    const stored: Record<string, JsonValue> = { ...(programme.overrides ?? {}) };

    if (!Object.prototype.hasOwnProperty.call(stored, path)) {
      throw new PackRegistryError('override_not_found', `programme ${programmeId} has no override on ${path}`, {
        programmeId,
        pack: pinOf(programme),
      });
    }

    const removed = overrideRecord(path, stored[path]);
    delete stored[path];

    const actor = writeOptions.actor ?? defaultActor;
    await repository.update(
      'programme',
      programme.id,
      { overrides: stored },
      {
        expectedVersion: programme.rowVersion,
        actor,
        reason: reasonFor('revert override', `${path} of ${pinOf(programme)}`, writeOptions.reason),
      }
    );

    return removed;
  }

  async function installation(programmeId: string): Promise<PackInstallation | null> {
    const programme = await programmeOf(programmeId);
    const sourceRow = await sourceRowOf(programme);
    return sourceRow ? installationOf(programme, sourceRow) : null;
  }

  async function listOverrides(programmeId: string): Promise<readonly PackOverrideRecord[]> {
    return readOverrides(await programmeOf(programmeId));
  }

  return {
    load: loadPack,
    install,
    installation,
    previewUpgrade,
    upgrade,
    applyOverride,
    revertOverride,
    listOverrides,
  };
}

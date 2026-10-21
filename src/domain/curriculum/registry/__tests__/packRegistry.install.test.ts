// ABOUTME: Registry tests on a real SQLite database: install records the pack source and audits it,
// ABOUTME: an invalid pack writes nothing, and an upgrade previews, then applies or refuses.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeTestContext, createTestContext, type TestContext } from '@/data/__tests__/harness';
import { asId } from '@/domain/ids';

import {
  createPackRegistry,
  isPackRegistryError,
  packChecksum,
  type PackRegistry,
  type PackSource,
} from '..';
import {
  ACTOR,
  freshProgramme,
  mutatedDocument,
  programmeStructure,
  stateOf,
} from './fixtures';
import {
  child,
  clone,
  examplePack,
  library,
  list,
  packWithoutLearningArea,
  packWithoutLevel,
  upgradedPack,
  versionOf,
  type PackDocument,
} from './packs';

const PACK = examplePack();
const VERSION_1 = 'ke-cbe@2026.1.0';

function registryWith(context: TestContext, source: PackSource): PackRegistry {
  return createPackRegistry({
    repository: context.repository,
    actor: ACTOR,
    source,
    now: () => new Date('2026-10-21T09:00:00.000Z'),
  });
}

describe('pack registry: install and upgrade', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('records the pack source and pins the programme, inside one transaction', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context, library(PACK));

    const installation = await registry.install(programme.id, PACK);
    expect(installation.pack).toEqual({
      code: 'ke-cbe',
      version: '2026.1.0',
      ref: VERSION_1,
      checksum: packChecksum(PACK),
    });

    const source = await context.repository.get(
      'curriculum_pack',
      asId<'curriculum_pack'>(installation.sourceId)
    );
    expect(source).toMatchObject({
      institution_id: programme.institution_id,
      code: 'ke-cbe',
      version: '2026.1.0',
      country: 'KE',
      issuer: 'KICD',
      effective_from: '2026-01-01',
      checksum: packChecksum(PACK),
    });

    const updated = await context.repository.get('programme', programme.id);
    expect(updated).toMatchObject({
      curriculum_pack_code: 'ke-cbe',
      pack_version: '2026.1.0',
      updated_by: ACTOR,
    });
    expect(updated?.rowVersion).toBe(programme.rowVersion + 1);

    // The audit trail reads the pack from both rows: the source create names code, version and
    // checksum; the programme update carries the pin before and after.
    const programmeTrail = await context.repository.auditTrail('programme', programme.id);
    const pinEvent = programmeTrail[0];
    expect(pinEvent?.action).toBe('update');
    expect(pinEvent?.reason).toContain(`install ${VERSION_1}`);
    expect(pinEvent?.after).toMatchObject({
      curriculum_pack_code: 'ke-cbe',
      pack_version: '2026.1.0',
    });

    const sourceTrail = await context.repository.auditTrail(
      'curriculum_pack',
      installation.sourceId
    );
    expect(sourceTrail).toHaveLength(1);
    expect(sourceTrail[0].action).toBe('create');
    expect(sourceTrail[0].after).toMatchObject({
      code: 'ke-cbe',
      version: '2026.1.0',
      checksum: packChecksum(PACK),
    });

    expect(await registry.installation(programme.id)).toEqual(installation);
  });

  it('does not write again when the same content is installed twice', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context, library(PACK));

    const first = await registry.install(programme.id, PACK);
    const before = await stateOf(context, programme.id);
    const second = await registry.install(programme.id, PACK);

    expect(second).toEqual(first);
    expect(await stateOf(context, programme.id)).toEqual(before);
  });

  it('refuses to install another version over a programme that has an installed pack', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context, library(PACK, upgradedPack()));
    await registry.install(programme.id, PACK);
    const before = await stateOf(context, programme.id);

    await expect(registry.install(programme.id, upgradedPack())).rejects.toMatchObject({
      code: 'upgrade_required',
    });

    expect(await stateOf(context, programme.id)).toEqual(before);
  });

  it('installs onto a programme whose pin was never recorded', async () => {
    const programme = await freshProgramme(context, 'ke-cbe', '2025.8.0');
    const registry = registryWith(context, library(PACK));

    const installation = await registry.install(programme.id, PACK);
    expect(installation.pack.ref).toBe(VERSION_1);
    expect((await context.repository.get('programme', programme.id))?.pack_version).toBe('2026.1.0');
  });

  it('refuses an invalid pack and writes nothing at all', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context, library(PACK));
    const before = await stateOf(context, programme.id);

    const broken = clone(PACK);
    list(child(broken, 'structure'), 'levels').push({
      code: 'G7',
      name: 'Grade 7 again',
      ordinal: 13,
    });

    const failure = await registry.install(programme.id, broken).catch((error: unknown) => error);
    expect(isPackRegistryError(failure, 'invalid_pack')).toBe(true);
    if (isPackRegistryError(failure)) {
      expect(failure.issues.map((issue) => `${issue.check} ${issue.path}`)).toContain(
        'unique_codes structure.levels'
      );
    }

    expect(await stateOf(context, programme.id)).toEqual(before);
  });

  it('previews an upgrade without writing, then applies it and audits both versions', async () => {
    const programme = await freshProgramme(context);
    const next = upgradedPack();
    const registry = registryWith(context, library(PACK, next));

    await registry.install(programme.id, PACK);
    const before = await stateOf(context, programme.id);

    const preview = await registry.previewUpgrade(programme.id, next);
    expect(preview.from).toBe(VERSION_1);
    expect(preview.to).toBe('ke-cbe@2026.2.0');
    expect(preview.versionBump).toBe('minor');
    expect(preview.safe).toBe(true);
    expect(preview.breaks).toEqual([]);
    expect(preview.changes).toContainEqual({
      section: 'learning_areas',
      kind: 'added',
      code: 'DES',
      fields: [],
    });
    expect(preview.changes).toContainEqual({
      section: 'grading_scales',
      kind: 'changed',
      code: 'cbe_8_level',
      fields: ['bands'],
    });
    expect(await stateOf(context, programme.id)).toEqual(before);

    const applied = await registry.upgrade(programme.id, next);
    expect(applied.preview).toEqual(preview);
    expect(applied.installation.pack.ref).toBe('ke-cbe@2026.2.0');
    expect(applied.installation.pack.checksum).toBe(packChecksum(next));

    const updated = await context.repository.get('programme', programme.id);
    expect(updated?.pack_version).toBe('2026.2.0');

    const trail = await context.repository.auditTrail('programme', programme.id);
    const upgradeEvent = trail[0];
    expect(upgradeEvent?.reason).toContain('upgrade ke-cbe@2026.1.0 -> ke-cbe@2026.2.0');
    expect(upgradeEvent?.changedFields).toContain('pack_version');
    expect(upgradeEvent?.before).toMatchObject({ pack_version: '2026.1.0' });
    expect(upgradeEvent?.after).toMatchObject({ pack_version: '2026.2.0' });
  });

  it('refuses an upgrade that would remove a learning area an existing row uses', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context, library(PACK));
    await registry.install(programme.id, PACK);
    await programmeStructure(context, programme);

    const candidate = packWithoutLearningArea('ENG');
    const before = await stateOf(context, programme.id);

    const preview = await registry.previewUpgrade(programme.id, candidate);
    expect(preview.safe).toBe(false);
    expect(preview.breaks.map((entry) => entry.code)).toContain('learning_area_row_removed');
    expect(
      preview.breaks.find((entry) => entry.code === 'learning_area_row_removed')?.subject
    ).toBe('ENG');
    expect(await stateOf(context, programme.id)).toEqual(before);

    const failure = await registry.upgrade(programme.id, candidate).catch((error: unknown) => error);
    expect(isPackRegistryError(failure, 'upgrade_unsafe')).toBe(true);
    if (isPackRegistryError(failure)) {
      expect(failure.preview?.safe).toBe(false);
    }
    expect(await stateOf(context, programme.id)).toEqual(before);
    expect((await context.repository.get('programme', programme.id))?.pack_version).toBe('2026.1.0');
  });

  it('refuses an upgrade that would remove a level an existing row uses', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context, library(PACK));
    await registry.install(programme.id, PACK);
    await programmeStructure(context, programme);

    const preview = await registry.previewUpgrade(programme.id, packWithoutLevel('G7'));
    expect(preview.breaks.map((entry) => entry.code)).toContain('level_row_removed');
    expect(preview.breaks.find((entry) => entry.code === 'level_row_removed')?.subject).toBe('G7');
    expect(preview.safe).toBe(false);
  });

  it('refuses a library document that is not the one the install recorded', async () => {
    const programme = await freshProgramme(context);
    await registryWith(context, library(PACK, upgradedPack())).install(programme.id, PACK);

    const tampered = registryWith(
      context,
      library(mutatedDocument(PACK), upgradedPack())
    );
    await expect(tampered.previewUpgrade(programme.id, upgradedPack())).rejects.toMatchObject({
      code: 'checksum_mismatch',
    });
  });

  it('refuses a source that cannot produce the installed version', async () => {
    const programme = await freshProgramme(context);
    await registryWith(context, library(PACK, upgradedPack())).install(programme.id, PACK);

    const withoutInstalled = registryWith(context, library(upgradedPack()));
    await expect(
      withoutInstalled.previewUpgrade(programme.id, upgradedPack())
    ).rejects.toMatchObject({ code: 'pack_source_missing' });
  });

  it('refuses a second document under a version that is already recorded', async () => {
    const own = versionOf('2026.9.0');
    const programme = await freshProgramme(context, 'ke-cbe', '2026.9.0');
    const registry = registryWith(context, library(own));
    const installation = await registry.install(programme.id, own);

    await context.repository.update(
      'curriculum_pack',
      asId<'curriculum_pack'>(installation.sourceId),
      { checksum: 'sha256:0000000000000000000000000000000000000000000000000000000000000000' },
      { expectedVersion: 1 }
    );

    await expect(registry.install(programme.id, own)).rejects.toMatchObject({
      code: 'checksum_conflict',
    });
  });

  it('warns when a structural removal ships as a minor version', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context, library(PACK));
    await registry.install(programme.id, PACK);

    const minorRemoval = packWithoutLearningArea('CAS', '2026.3.0');
    const preview = await registry.previewUpgrade(programme.id, minorRemoval);

    expect(preview.safe).toBe(true);
    expect(preview.warnings.map((warning) => warning.code)).toContain('structural_change');
    expect(preview.warnings.map((warning) => warning.code)).toContain('version_bump_too_small');
    expect(preview.changes).toContainEqual({
      section: 'learning_areas',
      kind: 'removed',
      code: 'CAS',
      fields: [],
    });
  });

  it('applies an unsafe upgrade only when the caller forces it', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context, library(PACK));
    await registry.install(programme.id, PACK);
    await programmeStructure(context, programme);

    const candidate = packWithoutLearningArea('ENG');
    const forced = await registry.upgrade(programme.id, candidate, { force: true });

    expect(forced.preview.safe).toBe(false);
    expect(forced.installation.pack.ref).toBe('ke-cbe@2027.0.0');
    expect((await context.repository.get('programme', programme.id))?.pack_version).toBe(
      '2027.0.0'
    );
  });

  it('refuses a preview for a programme with no recorded pack source', async () => {
    const programme = await freshProgramme(context, 'ke-cbe', '2025.9.0');
    const registry = registryWith(context, library(PACK, upgradedPack()));

    await expect(registry.previewUpgrade(programme.id, upgradedPack())).rejects.toMatchObject({
      code: 'nothing_installed',
    });
    await expect(registry.installation(programme.id)).resolves.toBeNull();
  });

  it('refuses an unknown programme and an invalid candidate before touching the database', async () => {
    const registry = registryWith(context, library(PACK));
    await expect(registry.install('01930000-0000-7000-8000-0000000000ff', PACK)).rejects.toMatchObject(
      { code: 'programme_not_found' }
    );

    const programme = await freshProgramme(context);
    await registry.install(programme.id, PACK);
    const before = await stateOf(context, programme.id);

    const broken: PackDocument = clone(upgradedPack());
    delete broken.reports;
    await expect(registry.previewUpgrade(programme.id, broken)).rejects.toMatchObject({
      code: 'invalid_pack',
    });
    expect(await stateOf(context, programme.id)).toEqual(before);
  });
});

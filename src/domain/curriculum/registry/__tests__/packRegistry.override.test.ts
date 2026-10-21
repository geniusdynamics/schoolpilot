// ABOUTME: Registry override tests on a real SQLite database: an override is its own auditable record,
// ABOUTME: the pack content never changes, reverting removes it, and an upgrade guards what it names.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeTestContext, createTestContext, type TestContext } from '@/data/__tests__/harness';
import { asId } from '@/domain/ids';

import {
  createPackRegistry,
  isPackRegistryError,
  loadPack,
  packChecksum,
  type PackRegistry,
} from '..';
import { ACTOR, freshProgramme, stateOf } from './fixtures';
import {
  examplePack,
  library,
  packWithoutReportOverride,
  packWithoutReportPage,
  upgradedPack,
} from './packs';

const PACK = examplePack();
const BANDS_PATH = 'assessment.grading_scales.cbe_8_level.bands';
const PAGE_PATH = 'reports.js-term.page';

function registryWith(context: TestContext): PackRegistry {
  return createPackRegistry({
    repository: context.repository,
    actor: ACTOR,
    source: library(PACK, upgradedPack(), packWithoutReportPage(), packWithoutReportOverride()),
    now: () => new Date('2026-10-21T09:00:00.000Z'),
  });
}

const SCHOOL_BANDS = [
  { code: 'EE1', label: 'Exceeding Expectations 1', min: 80, max: 100, points: 8 },
  { code: 'BE2', label: 'Below Expectations 2', min: 0, max: 79, points: 1 },
];

describe('pack registry: programme overrides', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('records an override as its own record, without touching the pack content', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context);
    const installation = await registry.install(programme.id, PACK);

    const applied = await registry.applyOverride(programme.id, BANDS_PATH, SCHOOL_BANDS, {
      reason: 'school grading policy',
    });
    expect(applied).toEqual({
      path: BANDS_PATH,
      value: SCHOOL_BANDS,
      actor: ACTOR,
      at: '2026-10-21T09:00:00.000Z',
    });

    const stored = await context.repository.get('programme', programme.id);
    expect(stored?.overrides?.[BANDS_PATH]).toEqual({
      value: SCHOOL_BANDS,
      actor: ACTOR,
      at: '2026-10-21T09:00:00.000Z',
    });
    expect(await registry.listOverrides(programme.id)).toEqual([applied]);

    const trail = await context.repository.auditTrail('programme', programme.id);
    const event = trail[0];
    expect(event?.changedFields).toContain('overrides');
    expect(event?.reason).toContain(`override ${BANDS_PATH}`);
    expect(event?.reason).toContain('school grading policy');
    expect(event?.after).toMatchObject({
      overrides: { [BANDS_PATH]: { actor: ACTOR, at: '2026-10-21T09:00:00.000Z' } },
    });

    // The pack source is untouched: same checksum, same row version, same content on disk.
    const source = await context.repository.get(
      'curriculum_pack',
      asId<'curriculum_pack'>(installation.sourceId)
    );
    expect(source?.checksum).toBe(packChecksum(PACK));
    expect(source?.rowVersion).toBe(1);
    const loaded = loadPack(PACK);
    if (!loaded.ok) throw new Error('the fixture pack must load');
    expect(loaded.pack.assessment.gradingScales[0].bands).toHaveLength(8);
    expect(loaded.pack.assessment.gradingScales[0].bands[0].min).toBe(90);
  });

  it('reverts an override and keeps the removal in the audit trail', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context);
    await registry.install(programme.id, PACK);
    await registry.applyOverride(programme.id, PAGE_PATH, { size: 'A5', orientation: 'landscape' });

    const reverted = await registry.revertOverride(programme.id, PAGE_PATH, {
      reason: 'back to the pack policy',
    });
    expect(reverted).toEqual({
      path: PAGE_PATH,
      value: { size: 'A5', orientation: 'landscape' },
      actor: ACTOR,
      at: '2026-10-21T09:00:00.000Z',
    });
    expect(await registry.listOverrides(programme.id)).toEqual([]);
    expect((await context.repository.get('programme', programme.id))?.overrides).toEqual({});

    const trail = await context.repository.auditTrail('programme', programme.id);
    expect(trail[0]?.reason).toContain(`revert override ${PAGE_PATH}`);
    expect(trail[0]?.changedFields).toContain('overrides');
  });

  it('refuses a path the pack does not declare, a path that does not exist, and a non-JSON value', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context);
    await registry.install(programme.id, PACK);
    const before = await stateOf(context, programme.id);

    await expect(
      registry.applyOverride(programme.id, 'assessment.schemes.ke-cbe-terminal.grading_scale', 'x')
    ).rejects.toMatchObject({ code: 'override_not_allowed' });

    await expect(
      registry.applyOverride(programme.id, 'assessment.grading_scales.cbe_8_level.nope', 1)
    ).rejects.toMatchObject({ code: 'override_unresolved' });

    await expect(
      registry.applyOverride(programme.id, BANDS_PATH, undefined)
    ).rejects.toMatchObject({ code: 'override_invalid_value' });

    expect(await stateOf(context, programme.id)).toEqual(before);
    expect(await registry.listOverrides(programme.id)).toEqual([]);
  });

  it('refuses to revert a path that holds no override', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context);
    await registry.install(programme.id, PACK);

    const failure = await registry.revertOverride(programme.id, PAGE_PATH).catch(
      (error: unknown) => error
    );
    expect(isPackRegistryError(failure, 'override_not_found')).toBe(true);
  });

  it('carries an override into an upgrade that leaves its path alone', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context);
    await registry.install(programme.id, PACK);
    await registry.applyOverride(programme.id, PAGE_PATH, { size: 'A5' });

    const preview = await registry.previewUpgrade(programme.id, upgradedPack());
    expect(preview.safe).toBe(true);
    expect(preview.overrides).toEqual([
      {
        path: PAGE_PATH,
        value: { size: 'A5' },
        actor: ACTOR,
        at: '2026-10-21T09:00:00.000Z',
      },
    ]);

    const applied = await registry.upgrade(programme.id, upgradedPack());
    expect(applied.installation.pack.version).toBe('2026.2.0');
    expect(await registry.listOverrides(programme.id)).toEqual(preview.overrides);
  });

  it('refuses an upgrade that removes the path an override names', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context);
    await registry.install(programme.id, PACK);
    await registry.applyOverride(programme.id, PAGE_PATH, { size: 'A5' });

    const before = await stateOf(context, programme.id);
    const candidate = packWithoutReportPage();
    const preview = await registry.previewUpgrade(programme.id, candidate);

    expect(preview.safe).toBe(false);
    expect(preview.breaks.map((entry) => entry.code)).toContain('override_path_removed');
    expect(preview.breaks.find((entry) => entry.code === 'override_path_removed')?.subject).toBe(
      PAGE_PATH
    );
    expect(await stateOf(context, programme.id)).toEqual(before);

    await expect(registry.upgrade(programme.id, candidate)).rejects.toMatchObject({
      code: 'upgrade_unsafe',
    });
    expect(await stateOf(context, programme.id)).toEqual(before);
  });

  it('refuses an upgrade whose pack no longer allows the override', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context);
    await registry.install(programme.id, PACK);
    await registry.applyOverride(programme.id, PAGE_PATH, { size: 'A5' });

    const preview = await registry.previewUpgrade(programme.id, packWithoutReportOverride());
    expect(preview.safe).toBe(false);
    expect(preview.breaks.map((entry) => entry.code)).toContain('override_not_overridable');
  });

  it('refuses an override that would leave the pack invalid', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context);
    await registry.install(programme.id, PACK);
    const before = await stateOf(context, programme.id);

    const failure = await registry
      .applyOverride(programme.id, BANDS_PATH, [
        { code: 'A', label: 'A', min: 90, max: 10 },
      ])
      .catch((error: unknown) => error);
    expect(isPackRegistryError(failure, 'override_invalid_value')).toBe(true);
    if (isPackRegistryError(failure)) {
      expect(failure.issues.map((issue) => issue.check)).toContain('band_order');
    }

    expect(await stateOf(context, programme.id)).toEqual(before);
    expect(await registry.listOverrides(programme.id)).toEqual([]);
  });

  it('accepts an override the pack declares on one of its schemes', async () => {
    const programme = await freshProgramme(context);
    const registry = registryWith(context);
    await registry.install(programme.id, PACK);

    const applied = await registry.applyOverride(
      programme.id,
      'assessment.schemes.ke-cbe-terminal.slots.SBA.scale_to',
      50,
      { reason: 'school weighting' }
    );
    expect(applied.value).toBe(50);
    expect((await registry.listOverrides(programme.id)).map((entry) => entry.path)).toEqual([
      'assessment.schemes.ke-cbe-terminal.slots.SBA.scale_to',
    ]);
  });

  it('lists an override written without provenance and leaves it out of the upgrade guard', async () => {
    const legacy = await freshProgramme(context, 'ke-cbe', '2026.1.0', { grading: 'school' });
    const registry = registryWith(context);
    await registry.install(legacy.id, PACK);

    expect(await registry.listOverrides(legacy.id)).toEqual([
      { path: 'grading', value: 'school', actor: null, at: null },
    ]);

    const preview = await registry.previewUpgrade(legacy.id, upgradedPack());
    expect(preview.safe).toBe(true);
    expect(preview.overrides).toEqual([{ path: 'grading', value: 'school', actor: null, at: null }]);
  });
});

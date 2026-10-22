// ABOUTME: Programme creation from a pack, on a real database: the registry records the pack source and
// ABOUTME: pin, the pack's structure becomes canonical rows, a re-run reuses the programme, a failure
// ABOUTME: leaves nothing behind, a calendar variant is honoured and a school can run several programmes.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeTestContext, createTestContext, type TestContext } from '@/data/__tests__/harness';
import { asId } from '@/domain/ids';

import { listAvailablePacks } from '../packs/packLibrary';
import { installPackProgramme } from '../steps/programmeInstall';

const PACKS = listAvailablePacks();
const KE_844 = PACKS.find((pack) => pack.code === 'ke-844')!;
const KE_CBE = PACKS.find((pack) => pack.code === 'ke-cbe')!;
const GB = PACKS.find((pack) => pack.code === 'gb-national')!;

describe('installing a pack as a programme', () => {
  let context: TestContext;

  // One context per test: an install writes rows the next test must not inherit, and the refusal
  // test deliberately records a conflicting pack source.
  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await closeTestContext(context);
  });

  const install = (pack = KE_844, extra: Record<string, unknown> = {}) =>
    installPackProgramme({
      repository: context.repository,
      actor: context.seed.idOf('user'),
      pack,
      institutionId: context.seed.idOf('institution'),
      ...extra,
    });

  it('creates the programme from the pack: stages, levels, learning areas, schemes and scales', async () => {
    const result = await install();

    expect(result.reused).toBe(false);
    expect(result.pack).toBe(KE_844.ref);

    const programme = await context.repository.get('programme', asId<'programme'>(result.programmeId));
    expect(programme?.curriculum_pack_code).toBe('ke-844');
    expect(programme?.pack_version).toBe('1.0.0');

    const source = await context.repository.list('curriculum_pack', {
      where: { institution_id: context.seed.idOf('institution'), code: 'ke-844', version: '1.0.0' },
      limit: 5,
    });
    expect(source.items).toHaveLength(1);
    expect(source.items[0].checksum).toMatch(/^sha256:/);

    const stages = await context.repository.list('stage', {
      where: { programme_id: result.programmeId },
      limit: 50,
    });
    expect(stages.items.map((stage) => stage.code)).toEqual(['SEC']);

    const levels = await context.repository.list('level', {
      where: { stage_id: stages.items[0].id },
      limit: 50,
    });
    expect(levels.items.map((level) => level.code)).toEqual(['F1', 'F2', 'F3', 'F4']);
    const form1 = levels.items.find((level) => level.code === 'F1')!;
    const form2 = levels.items.find((level) => level.code === 'F2')!;
    expect(form1.next_level_id).toBe(form2.id);
    expect(levels.items.find((level) => level.code === 'F4')?.is_terminal).toBe(true);

    const areas = await context.repository.list('learning_area', {
      where: { programme_id: result.programmeId },
      limit: 100,
    });
    expect(areas.items.length).toBe(KE_844.learningAreas);
    const english = areas.items.find((area) => area.code === 'ENG')!;
    expect(english.level_ids).toHaveLength(4);

    const scales = await context.repository.list('grading_scale', {
      where: { programme_id: result.programmeId },
      limit: 50,
    });
    expect(scales.items.map((scale) => scale.code).sort()).toEqual(['kcse_mean_grade', 'kcse_subject']);

    const schemes = await context.repository.list('assessment_scheme', {
      where: { programme_id: result.programmeId },
      limit: 50,
    });
    expect(schemes.items).toHaveLength(KE_844.schemes);
    expect(schemes.items[0].definition).toMatchObject({ code: 'ke-844-internal' });
  });

  it('reuses the programme on a re-run instead of adding another', async () => {
    const first = await install();
    const second = await install();

    expect(second.reused).toBe(true);
    expect(second.programmeId).toBe(first.programmeId);

    const programmes = await context.repository.list('programme', {
      where: { institution_id: context.seed.idOf('institution') },
      limit: 50,
    });
    expect(programmes.items.filter((row) => row.name === KE_844.name)).toHaveLength(1);
  });

  it('leaves no partial programme when the registry refuses the install', async () => {
    // A `code@version` already recorded with another checksum is refused inside the transaction,
    // after the programme row would have been created. The rollback must take it back out.
    await context.repository.create(
      'curriculum_pack',
      context.seed.inputFor('curriculum_pack', {
        code: KE_CBE.code,
        version: KE_CBE.version,
        checksum: 'sha256:not-the-document-the-library-ships',
      })
    );

    await expect(install(KE_CBE)).rejects.toThrow();

    const programmes = await context.repository.list('programme', {
      where: { institution_id: context.seed.idOf('institution') },
      limit: 50,
    });
    expect(programmes.items.find((row) => row.name === KE_CBE.name)).toBeUndefined();
  });

  it('records the calendar variant a British pack is installed under', async () => {
    const result = await install(GB, { calendar: { code: 'southern', name: 'Southern academic year (January to November)' } });

    const calendar = await context.repository.get('calendar', asId<'calendar'>(result.calendarId));
    expect(calendar?.name).toContain('Southern academic year');
    const programme = await context.repository.get('programme', asId<'programme'>(result.programmeId));
    expect(programme?.calendar_id).toBe(result.calendarId);
  });

  it('lets one school run more than one programme', async () => {
    const secondary = await install(KE_844);
    const primary = await install(KE_CBE);

    expect(secondary.programmeId).not.toBe(primary.programmeId);
    const programmes = await context.repository.list('programme', {
      where: { institution_id: context.seed.idOf('institution') },
      limit: 50,
    });
    const names = programmes.items.map((row) => row.name);
    expect(names).toEqual(expect.arrayContaining([KE_844.name, KE_CBE.name]));

    // Each programme carries its own levels: a Form 1 and a Grade 1 do not collide.
    const primaryStages = await context.repository.list('stage', {
      where: { programme_id: primary.programmeId },
      limit: 50,
    });
    const primaryLevels = await context.repository.list('level', {
      where: { stage_id: primaryStages.items[0].id },
      limit: 50,
    });
    expect(primaryLevels.items.every((level) => level.code.startsWith('G') || level.code.startsWith('PP'))).toBe(true);
  });
});

// ABOUTME: Unit tests for the promotion-run rules resolver: the rules come from the pack installed
// ABOUTME: for a programme (its pin plus a recorded source row), and a pack with no promotion rules
// ABOUTME: is reported as that, never as a pack that could not be resolved.

import { describe, expect, it } from 'vitest';

import { listAvailablePacks } from '@/components/setup/packs/packLibrary';
import type { RepositoryRow } from '@/data/repository';
import { prepareProgression } from '@/domain/assessment/progression';
import { packRef } from '@/domain/curriculum/registry';

import {
  promotionRulesForPackRef,
  resolvePromotionRules,
  unresolvedPromotionMessage,
  type PackLibrarySource,
} from '../packPromotionRules';

const INSTITUTION_ID = '01930000-0000-7000-8000-00000000a001';
const PROGRAMME_ID = '01930000-0000-7000-8000-00000000c001';

function programme(overrides: Record<string, unknown> = {}): RepositoryRow<'programme'> {
  return {
    id: PROGRAMME_ID,
    institution_id: INSTITUTION_ID,
    curriculum_pack_code: 'ke-844',
    pack_version: '1.0.0',
    name: 'Kenya 8-4-4 Secondary (KCSE) - Forms 1 to 4',
    ...overrides,
  } as RepositoryRow<'programme'>;
}

function sourceRow(overrides: Record<string, unknown> = {}): RepositoryRow<'curriculum_pack'> {
  return {
    id: '01930000-0000-7000-8000-00000000d001',
    institution_id: INSTITUTION_ID,
    code: 'ke-844',
    version: '1.0.0',
    country: 'KE',
    issuer: 'KNEC',
    effective_from: '2026-01-01',
    checksum: 'sha256:test',
    ...overrides,
  } as RepositoryRow<'curriculum_pack'>;
}

/** A library that ships the bundled packs, with the named pack's progression replaced. */
function libraryWithProgression(code: string, progression: unknown): PackLibrarySource {
  const packs = listAvailablePacks();
  return ({ code: wanted, version }) => {
    const pack = packs.find((candidate) => candidate.code === wanted && candidate.version === version);
    if (!pack) return undefined;
    if (wanted !== code) return pack.document;
    return { ...(pack.document as Record<string, unknown>), progression };
  };
}

describe('promotion rules of a validated pack', () => {
  it('carries the pack levels with their next level, its stages and its progression document', () => {
    const ke844 = listAvailablePacks().find((pack) => pack.code === 'ke-844')!;
    const rules = promotionRulesForPackRef({ code: 'ke-844', version: ke844.version });

    expect(rules).not.toBeNull();
    expect(rules!.levels.map((level) => level.code)).toEqual(['F1', 'F2', 'F3', 'F4']);
    expect(rules!.levels.find((level) => level.code === 'F1')?.next).toBe('F2');
    expect(rules!.levels.find((level) => level.code === 'F4')?.next).toBeNull();
    expect(rules!.definition.progression[0]).toMatchObject({
      levels: ['F1', 'F2', 'F3'],
      rule: 'automatic',
    });
    expect(rules!.definition.graduation).toEqual([{ levels: ['F4'], rule: 'graduate' }]);
  });

  it('resolves nothing for a version the library does not ship, rather than another pack with that code', () => {
    expect(promotionRulesForPackRef({ code: 'ke-844', version: '9.9.9' })).toBeNull();
  });

  it('hands the evaluator rules it accepts', () => {
    // The loader normalises an absent `requires` to `[]`, which the evaluator refuses: the resolved
    // rules must be a document the evaluator takes, or a run is refused with invalid_requires.
    const ke844 = listAvailablePacks().find((pack) => pack.code === 'ke-844')!;
    const rules = promotionRulesForPackRef({ code: 'ke-844', version: ke844.version })!;

    const prepared = prepareProgression(rules.definition, {
      levels: rules.levels,
      stages: rules.stages,
    });

    expect(prepared.ok ? [] : prepared.issues).toEqual([]);
    expect(prepared.ok).toBe(true);
  });
});

describe('resolving a run against the school’s programmes', () => {
  it('reads the rules of the pack installed for a programme', () => {
    const resolution = resolvePromotionRules([programme()], [sourceRow()]);

    expect(resolution.kind).toBe('rules');
    if (resolution.kind !== 'rules') return;
    expect(resolution.programmeId).toBe(PROGRAMME_ID);
    expect(resolution.rules.levels.map((level) => level.code)).toContain('F4');
  });

  it('skips a programme whose pack was never installed, even when a bundled pack shares its code', () => {
    // The demo school's programme names a pack code but has no recorded source row.
    const demo = programme({ curriculum_pack_code: 'KE', pack_version: '1.0.0', name: 'School Programme' });

    expect(resolvePromotionRules([demo], []).kind).toBe('not-installed');
  });

  it('reads the installed programme’s pack when the demo programme sits beside it', () => {
    const demo = programme({
      id: '01930000-0000-7000-8000-00000000c002',
      curriculum_pack_code: 'KE',
      pack_version: '1.0.0',
      name: 'School Programme',
    });

    expect(resolvePromotionRules([demo, programme()], [sourceRow()]).kind).toBe('rules');
  });

  it('says the curriculum defines no promotion rules when the installed pack declares none', () => {
    const empty = libraryWithProgression('ke-844', { progression: [], graduation: [] });
    const resolution = resolvePromotionRules([programme()], [sourceRow()], empty);

    expect(resolution.kind).toBe('no-rules');
    if (resolution.kind !== 'no-rules') return;
    expect(unresolvedPromotionMessage(resolution)).toContain('defines no promotion rules');
  });

  it('says the pack could not be read when the installed pack is not in the library', () => {
    const resolution = resolvePromotionRules([programme()], [sourceRow()], () => undefined);

    expect(resolution.kind).toBe('pack-unavailable');
    if (resolution.kind !== 'pack-unavailable') return;
    expect(unresolvedPromotionMessage(resolution)).toContain('ke-844@1.0.0');
  });
});

describe('the message a run shows when no rules resolve', () => {
  it('never claims the pack could not be resolved when the pack simply defines no rules', () => {
    const message = unresolvedPromotionMessage({ kind: 'no-rules', programmeName: 'School Programme' });

    expect(message).toContain('defines no promotion rules');
    expect(message).not.toContain('could not be resolved');
  });

  it('names the missing pack when the installed pack is not in the library', () => {
    const message = unresolvedPromotionMessage({
      kind: 'pack-unavailable',
      programmeName: 'School Programme',
      pack: packRef('ke-844', '9.9.9'),
    });

    expect(message).toContain('ke-844@9.9.9');
  });

  it('says no pack is installed when no programme has a recorded source row', () => {
    expect(unresolvedPromotionMessage({ kind: 'not-installed' })).toContain('installed curriculum pack');
  });
});

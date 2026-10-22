// ABOUTME: Reads a pack's promotion rules for the promotion run page: its progression.json and
// ABOUTME: structure.json, bundled eagerly so the page needs no deep import into packs/.
//
// The pack registry (P2-E05) will hand a validated `LoadedPack` to the page once the school's pack
// is installed; until then the page resolves the documents the way the observation page does.

import type { ProgressionDefinition, ProgressionLevel, ProgressionStage } from '@/domain/assessment/progression';

import type { PromotionRules } from '@/domain/services/PromotionService';

const progressionModules = import.meta.glob('../../../../../packs/*/progression.json', {
  eager: true,
  import: 'default',
});
const structureModules = import.meta.glob('../../../../../packs/*/structure.json', {
  eager: true,
  import: 'default',
});

/** The pack code a bundled document belongs to, from its path. */
function packCodeOf(path: string): string | null {
  const match = /packs\/([^/]+)\//.exec(path);
  return match ? match[1] : null;
}

function documentFor(modules: Record<string, unknown>, code: string): unknown {
  for (const [path, document] of Object.entries(modules)) {
    if (packCodeOf(path) === code) return document;
  }
  return null;
}

/** A pack's level entry, as `structure.json` writes it. */
interface PackLevelDocument {
  readonly code?: unknown;
  readonly next?: unknown;
}

interface PackStageDocument {
  readonly code?: unknown;
  readonly levels?: unknown;
}

interface PackStructureDocument {
  readonly levels?: unknown;
  readonly stages?: unknown;
}

interface PackProgressionDocument {
  readonly progression?: unknown;
  readonly graduation?: unknown;
}

/**
 * The promotion rules of a pack, or null when the pack is not bundled.
 *
 * The documents are the pack's own; the loader of the pack registry is the layer that validates
 * them, and this reader trusts what it finds so a page never silently invents a rule.
 */
export function promotionRulesForPack(code: string): PromotionRules | null {
  const progression = documentFor(progressionModules, code) as PackProgressionDocument | null;
  const structure = documentFor(structureModules, code) as PackStructureDocument | null;
  if (!progression || !structure || !Array.isArray(structure.levels) || !Array.isArray(structure.stages)) {
    return null;
  }

  const levels: ProgressionLevel[] = (structure.levels as readonly PackLevelDocument[]).map((level) => ({
    code: String(level.code),
    next: level.next === undefined || level.next === null ? null : String(level.next),
  }));
  const stages: ProgressionStage[] = (structure.stages as readonly PackStageDocument[]).map((stage) => ({
    code: String(stage.code),
    levels: Array.isArray(stage.levels) ? (stage.levels as readonly unknown[]).map(String) : [],
  }));

  return {
    definition: {
      progression: (Array.isArray(progression.progression) ? progression.progression : []) as ProgressionDefinition['progression'],
      graduation: (Array.isArray(progression.graduation) ? progression.graduation : []) as NonNullable<
        ProgressionDefinition['graduation']
      >,
    },
    levels,
    stages,
  };
}

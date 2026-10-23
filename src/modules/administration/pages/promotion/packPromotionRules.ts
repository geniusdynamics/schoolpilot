// ABOUTME: Resolves a promotion run's progression rules from the pack installed for a programme,
// ABOUTME: never from a bundled document chosen by code alone: the programme's pin and the recorded
// ABOUTME: pack source say which pack the school runs, and the registry's loader validates it.

import { listAvailablePacks, packSourceFor } from '@/components/setup/packs/packLibrary';
import type { RepositoryRow } from '@/data/repository';
import type {
  ProgressionDefinition,
  ProgressionLevel,
  ProgressionStage,
  PromotionRuleDefinition,
} from '@/domain/assessment/progression';
import { loadPack, packRef, type LoadedPack, type PackRef } from '@/domain/curriculum/registry';
import type { PromotionRules } from '@/domain/services/PromotionService';

/** The pack library the registry installs from and reads an installed pack back from. */
export type PackLibrarySource = (ref: {
  readonly code: string;
  readonly version: string;
}) => unknown;

/**
 * The pack library the wizard installs from.
 *
 * The wizard installs each programme from this library, so reading a programme's pinned
 * `code@version` from it is reading the pack the school actually runs. A pack the library does not
 * ship resolves to nothing rather than to a different pack that happens to share the code.
 */
const library: PackLibrarySource = packSourceFor(listAvailablePacks());

/** The promotion rules a validated pack declares, or null when it declares none. */
export function promotionRulesOfPack(pack: LoadedPack): PromotionRules | null {
  const declared = pack.progression.progression ?? [];
  const graduation = pack.progression.graduation ?? [];
  if (declared.length === 0 && graduation.length === 0) return null;

  // The loader normalises an absent list to an empty one, and the progression evaluator refuses an
  // empty `requires` or `conditions`: an empty list means the pack declared none, so it is dropped
  // rather than passed on as a declaration the evaluator would reject.
  const progression: PromotionRuleDefinition[] = declared.map((rule) => ({
    levels: rule.levels,
    rule: rule.rule,
    ...(rule.to_stage === undefined ? {} : { to_stage: rule.to_stage }),
    ...(rule.requires.length === 0 ? {} : { requires: rule.requires }),
    ...(rule.conditions.length === 0 ? {} : { conditions: rule.conditions }),
    ...(rule.else === undefined ? {} : { else: rule.else }),
    ...(rule.suggest === undefined ? {} : { suggest: rule.suggest }),
  }));

  const levels: ProgressionLevel[] = pack.structure.levels.map((level) => ({
    code: level.code,
    next: level.next ?? null,
  }));
  const stages: ProgressionStage[] = pack.structure.stages.map((stage) => ({
    code: stage.code,
    levels: stage.levels,
  }));
  const definition: ProgressionDefinition = {
    progression,
    graduation: graduation.map((rule) => ({ levels: rule.levels, rule: 'graduate' as const })),
  };
  return { definition, levels, stages };
}

/** The promotion rules the library ships at `code@version`, or null when it ships no such pack. */
export function promotionRulesForPackRef(
  ref: { readonly code: string; readonly version: string },
  source: PackLibrarySource = library
): PromotionRules | null {
  const document = source({ code: ref.code, version: ref.version });
  if (document === undefined || document === null) return null;
  const loaded = loadPack(document);
  return loaded.ok ? promotionRulesOfPack(loaded.pack) : null;
}

/** What a school's programmes yield: rules to compute with, or why they cannot be resolved. */
export type PromotionRulesResolution =
  | { readonly kind: 'rules'; readonly rules: PromotionRules; readonly programmeId: string }
  /** No programme has a recorded pack source, so no pack is installed to read rules from. */
  | { readonly kind: 'not-installed' }
  /** The installed pack loaded and declares no promotion rules at all. */
  | { readonly kind: 'no-rules'; readonly programmeName: string }
  /** The installed pack is not in the library, so its rules cannot be read. */
  | { readonly kind: 'pack-unavailable'; readonly programmeName: string; readonly pack: PackRef };

/** The message a resolution that yields no rules shows, in the words of the reason it failed. */
export function unresolvedPromotionMessage(
  resolution: Exclude<PromotionRulesResolution, { readonly kind: 'rules' }>
): string {
  switch (resolution.kind) {
    case 'not-installed':
      return 'No programme of this school has an installed curriculum pack, so the promotion run cannot be computed. Install a pack for a programme first.';
    case 'no-rules':
      return `This programme's curriculum defines no promotion rules (${resolution.programmeName}), so the promotion run cannot be computed.`;
    case 'pack-unavailable':
      return `The pack ${resolution.pack} pinned by ${resolution.programmeName} is not in the school's pack library, so its promotion rules could not be read.`;
  }
}

/** True when a pack document declares no promotion and no graduation rules at all. */
function declaresNoPromotionRules(document: unknown): boolean {
  const progression = (document as { readonly progression?: unknown } | null)?.progression;
  if (typeof progression !== 'object' || progression === null) return false;
  const record = progression as { readonly progression?: unknown; readonly graduation?: unknown };
  const promotion = Array.isArray(record.progression) ? record.progression.length : 0;
  const graduation = Array.isArray(record.graduation) ? record.graduation.length : 0;
  return promotion === 0 && graduation === 0;
}

/**
 * Resolves the rules from the pack installed for one of the school's programmes.
 *
 * A programme counts as installed when a `curriculum_pack` source row records its pin; the demo
 * school's programme has a code but no source row, so it is skipped rather than resolved against a
 * bundled pack that shares the code. The first installed programme whose pack declares promotion
 * rules wins. When no pack yields rules, the reason is reported exactly: a pack that declares none
 * is not the same as a pack the library cannot read, and neither is the same as no pack installed.
 */
export function resolvePromotionRules(
  programmes: readonly RepositoryRow<'programme'>[],
  installed: readonly RepositoryRow<'curriculum_pack'>[],
  source: PackLibrarySource = library
): PromotionRulesResolution {
  const sourceFor = (programme: RepositoryRow<'programme'>) =>
    installed.find(
      (row) =>
        row.institution_id === programme.institution_id &&
        row.code === programme.curriculum_pack_code &&
        row.version === programme.pack_version
    );

  const installedProgrammes = programmes.filter(
    (programme) => Boolean(programme.curriculum_pack_code) && sourceFor(programme) !== undefined
  );
  if (installedProgrammes.length === 0) return { kind: 'not-installed' };

  const unreadable: Array<{ readonly programmeName: string; readonly pack: PackRef }> = [];
  for (const programme of installedProgrammes) {
    const code = programme.curriculum_pack_code;
    const version = programme.pack_version;
    const document = source({ code, version });
    if (document === undefined || document === null) {
      unreadable.push({ programmeName: programme.name, pack: packRef(code, version) });
      continue;
    }
    // A pack that declares no promotion rules at all is reported as that, not as a pack that
    // could not be read: the two send a school to different places.
    if (declaresNoPromotionRules(document)) continue;

    const loaded = loadPack(document);
    if (!loaded.ok) {
      unreadable.push({ programmeName: programme.name, pack: packRef(code, version) });
      continue;
    }
    const rules = promotionRulesOfPack(loaded.pack);
    if (rules) return { kind: 'rules', rules, programmeId: programme.id };
  }

  // A pack the library cannot produce or load is the stronger failure: it might have had rules.
  if (unreadable.length > 0) return { kind: 'pack-unavailable', ...unreadable[0] };
  return { kind: 'no-rules', programmeName: installedProgrammes[0].name };
}

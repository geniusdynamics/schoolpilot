// ABOUTME: The packs the setup wizard can install, assembled from the repository's packs/ directory
// ABOUTME: and projected through the registry's loader, plus the PackSource the registry reads them from.

import {
  loadPack,
  packRef,
  type LoadedPack,
  type PackCalendar,
  type PackRef,
  type PackSource,
  type PackVerification,
} from '@/domain/curriculum/registry';

/**
 * One pack a school can install, projected from the registry's loader.
 *
 * Everything the wizard and the programmes page need to show is here: the identity, the
 * structure's shape, the verification status, the locales and the calendar variants. The
 * `document` is the assembled pack document the registry installs; it is never copied into
 * the database.
 */
export interface AvailablePack {
  readonly code: string;
  readonly version: string;
  readonly ref: PackRef;
  readonly name: string;
  readonly country: string;
  readonly issuers: readonly string[];
  /** The level codes, in the order the pack declares them. */
  readonly levels: readonly string[];
  /** The level names, for a picker or a summary. */
  readonly levelNames: readonly string[];
  readonly stages: number;
  readonly learningAreas: number;
  readonly schemes: number;
  readonly gradingScales: number;
  readonly reports: readonly { readonly code: string; readonly name: string }[];
  readonly locales: readonly string[];
  /** Every declared calendar template; one entry for a single-template pack. */
  readonly calendars: readonly PackCalendar[];
  /** The template a programme starts from: the only one, or the declared default variant. */
  readonly defaultCalendar: PackCalendar;
  readonly verification: PackVerification;
  readonly requiresEngine: string;
  /** The assembled pack document the registry validates and installs. */
  readonly document: unknown;
}

/** Vite resolves these at build time; a pack that is not shipped is simply not offered. */
const manifestModules = import.meta.glob('../../../../packs/*/pack.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;
const structureModules = import.meta.glob('../../../../packs/*/structure.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;
const learningAreaModules = import.meta.glob('../../../../packs/*/learning-areas.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;
const assessmentModules = import.meta.glob('../../../../packs/*/assessment.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;
const progressionModules = import.meta.glob('../../../../packs/*/progression.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;
const reportModules = import.meta.glob('../../../../packs/*/reports/*.report.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;
const localeModules = import.meta.glob('../../../../packs/*/locales/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;
const vectorModules = import.meta.glob('../../../../packs/*/tests/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

/** The pack directory a glob key belongs to: `.../packs/ke-cbe/pack.json` → `ke-cbe`. */
function packOf(key: string): string | null {
  const match = /\/packs\/([^/]+)\//.exec(key);
  return match ? match[1] : null;
}

/** Groups the modules of one kind by the pack directory they came from. */
function byPack(modules: Record<string, unknown>): Map<string, Array<[string, unknown]>> {
  const grouped = new Map<string, Array<[string, unknown]>>();
  for (const [key, value] of Object.entries(modules)) {
    const pack = packOf(key);
    if (pack === null) continue;
    grouped.set(pack, [...(grouped.get(pack) ?? []), [key, value]]);
  }
  return grouped;
}

function one(entries: Array<[string, unknown]> | undefined, name: string, pack: string): unknown {
  if (!entries || entries.length === 0) {
    throw new Error(`the pack ${pack} is missing its ${name} document`);
  }
  if (entries.length > 1) {
    throw new Error(`the pack ${pack} declares more than one ${name} document`);
  }
  return entries[0][1];
}

function many(entries: Array<[string, unknown]> | undefined): readonly unknown[] {
  return (entries ?? []).map(([, value]) => value);
}

/** The locale tag a `locales/<tag>.json` file is filed under. */
function localeTag(key: string): string {
  const name = key.slice(key.lastIndexOf('/') + 1);
  return name.endsWith('.json') ? name.slice(0, -'.json'.length) : name;
}

/**
 * Assembles one pack document from its section files.
 *
 * The packs directory splits a pack across `pack.json`, `structure.json`, `learning-areas.json`,
 * `assessment.json`, `progression.json` and the `reports/`, `locales/` and `tests/` directories;
 * the registry's loader wants the composed document, so the sections are joined here once.
 */
function assembleDocument(pack: string): unknown {
  const manifests = byPack(manifestModules).get(pack);
  const structures = byPack(structureModules).get(pack);
  const learningAreas = byPack(learningAreaModules).get(pack);
  const assessments = byPack(assessmentModules).get(pack);
  const progressions = byPack(progressionModules).get(pack);

  const reports = many(byPack(reportModules).get(pack));
  const locales = Object.fromEntries(
    (byPack(localeModules).get(pack) ?? []).map(([key, value]) => [localeTag(key), value])
  );
  const vectors = many(byPack(vectorModules).get(pack)).flatMap((file) => {
    const entries = (file as { readonly vectors?: unknown }).vectors;
    return Array.isArray(entries) ? entries : [];
  });

  return {
    pack: one(manifests, 'pack.json manifest', pack),
    structure: one(structures, 'structure.json', pack),
    learning_areas: one(learningAreas, 'learning-areas.json', pack),
    assessment: one(assessments, 'assessment.json', pack),
    progression: one(progressions, 'progression.json', pack),
    reports,
    locales,
    tests: { vectors },
  };
}

/** Projects a loaded pack onto what the wizard and the programmes page read. */
export function availablePackOf(pack: LoadedPack, document: unknown): AvailablePack {
  return {
    code: pack.code,
    version: pack.version,
    ref: pack.ref,
    name: pack.name,
    country: pack.country,
    issuers: pack.issuers,
    levels: pack.structure.levels.map((level) => level.code),
    levelNames: pack.structure.levels.map((level) => level.name),
    stages: pack.structure.stages.length,
    learningAreas: pack.learningAreas.length,
    schemes: pack.assessment.schemes.length,
    gradingScales: pack.assessment.gradingScales.length,
    reports: pack.reports.map((report) => ({ code: report.code, name: report.name })),
    locales: pack.locales.map((locale) => locale.locale),
    calendars: pack.structure.calendars,
    defaultCalendar: pack.structure.calendar,
    verification: pack.verification,
    requiresEngine: pack.requires_engine,
    document,
  };
}

/** The pack directories the repository ships. */
function shippedPacks(): readonly string[] {
  return [...new Set(Object.keys(manifestModules).map(packOf).filter((p): p is string => p !== null))].sort();
}

/**
 * Every pack the installation ships, validated and projected.
 *
 * A pack that the loader refuses is not offered: the wizard must never install a document the
 * registry would reject. Its refusal is reported rather than swallowed.
 */
export function listAvailablePacks(): readonly AvailablePack[] {
  const packs: AvailablePack[] = [];
  for (const code of shippedPacks()) {
    const document = assembleDocument(code);
    const result = loadPack(document);
    if (!result.ok) {
      throw new Error(
        `the shipped pack ${code} does not load: ${result.issues
          .map((issue) => `${issue.path} ${issue.check}`)
          .join(', ')}`
      );
    }
    packs.push(availablePackOf(result.pack, document));
  }
  return packs;
}

/** The packs a `code@version` source resolves from a library. */
export function packSourceFor(packs: readonly AvailablePack[] = listAvailablePacks()): PackSource {
  const documents = new Map(packs.map((pack) => [pack.ref, pack.document]));
  return ({ code, version }: { readonly code: string; readonly version: string }) =>
    documents.get(packRef(code, version));
}

/** The default calendar of a pack, and the variant a code names. */
export function calendarVariantOf(
  pack: AvailablePack,
  code: string | undefined
): PackCalendar | undefined {
  if (code === undefined) return pack.defaultCalendar;
  return pack.calendars.find((calendar) => calendar.code === code);
}

/** True when the pack declares more than one calendar variant, so the wizard must ask. */
export function hasCalendarVariants(pack: AvailablePack): boolean {
  return pack.calendars.length > 1;
}

// ABOUTME: Installs a chosen curriculum pack into a programme: the pack source and pin go through the
// ABOUTME: pack registry, and the pack's structure becomes canonical rows, all in one transaction.
// ABOUTME: A failure leaves no partial programme; a re-run reuses what the first run created.

import type { CreateInput, Repository, RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';
import {
  createPackRegistry,
  type LoadedPack,
  type PackRef,
  type PackSource,
} from '@/domain/curriculum/registry';
import type { EntityName } from '@/domain/schema';

import { packSourceFor, type AvailablePack } from '../packs/packLibrary';

/** The calendar variant a programme starts under, when the pack declares more than one. */
export interface ProgrammeCalendarChoice {
  readonly code: string;
  readonly name: string;
}

export interface InstallPackProgrammeInput {
  readonly repository: Repository;
  readonly actor: string;
  readonly pack: AvailablePack;
  /** The institution the programme belongs to. */
  readonly institutionId: string;
  /** The calendar variant the school chose; the pack's default when omitted. */
  readonly calendar?: ProgrammeCalendarChoice;
  /** Overrides the programme name; the pack's name when omitted. */
  readonly programmeName?: string;
  /** Resolves an installed pack for the registry; the shipped library when omitted. */
  readonly source?: PackSource;
  readonly reason?: string;
}

/** What an install created, and whether it reused an existing programme. */
export interface InstalledProgramme {
  readonly programmeId: string;
  readonly programmeName: string;
  readonly pack: PackRef;
  readonly reused: boolean;
  /** The calendar the programme reads under. */
  readonly calendarId: string;
  readonly counts: Readonly<Record<string, number>>;
}

/** A repository that can run the registry's writes. */
export function isCanonicalRepository(repository: unknown): repository is Repository {
  const probe = repository as { readonly transaction?: unknown } | null;
  return typeof probe?.transaction === 'function';
}

/** The programme's name: the pack's own name unless the caller names it. */
export function programmeNameFor(pack: AvailablePack, override?: string): string {
  return (override?.trim() || pack.name).slice(0, 200);
}

/**
 * The code a pack row is stored under: the pack's own code, kept verbatim.
 *
 * A code is referenced across the pack (a scheme's `levels`, a report's `levels`, an
 * aggregation's learning areas), so it must not be normalised: the stored row has to carry the
 * exact code the rest of the pack names. The fallback is only for a declaration with no code.
 */
const codeOf = (text: string, fallback: string): string => (text.trim() || fallback).slice(0, 50);

async function listAll<E extends EntityName>(
  repository: Repository,
  entity: E,
  where: Record<string, unknown>
): Promise<RepositoryRow<E>[]> {
  const page = await repository.list(entity, { where, limit: 500 });
  return [...page.items];
}

/**
 * The pack's structural rows under a programme: stages, levels, pathways, learning areas,
 * components, competencies, combination rules, grading scales and assessment schemes.
 *
 * Every row is written through the repository, so it is validated, tenanted and audited like
 * any other. A natural key that already exists is left alone, so the write is idempotent and a
 * resumed wizard never duplicates the school's curriculum.
 */
export async function instantiateProgramme(
  repository: Repository,
  programme: RepositoryRow<'programme'>,
  pack: LoadedPack,
  actor: string,
  reason: string
): Promise<Readonly<Record<string, number>>> {
  const counts: Record<string, number> = {};
  const options = { actor, reason };
  const institutionId = programme.institution_id;

  const existingStages = await listAll(repository, 'stage', { programme_id: programme.id });
  const stages = new Map<string, RepositoryRow<'stage'>>();
  for (const stage of existingStages) stages.set(stage.code, stage);

  for (const [index, declared] of pack.structure.stages.entries()) {
    const code = codeOf(declared.code, `STAGE${index + 1}`);
    if (stages.has(code)) continue;
    const created = await repository.create(
      'stage',
      { institution_id: institutionId, programme_id: programme.id, code, name: declared.name, sequence: index + 1 },
      options
    );
    stages.set(code, created);
    counts.stage = (counts.stage ?? 0) + 1;
  }

  // Levels reference the stage that lists them; a level a stage does not list joins the first stage.
  const firstStage = stages.values().next().value as RepositoryRow<'stage'> | undefined;
  if (!firstStage) throw new Error('the pack declares no stage');

  const levelsByCode = new Map<string, RepositoryRow<'level'>>();
  for (const stage of stages.values()) {
    for (const level of await listAll(repository, 'level', { stage_id: stage.id })) {
      levelsByCode.set(level.code, level);
    }
  }

  /** The stage a level belongs to: the one whose declaration lists it, else the first stage. */
  const stageOfLevel = (levelCode: string): RepositoryRow<'stage'> => {
    const declared = pack.structure.stages.find((candidate) => candidate.levels.includes(levelCode));
    return (declared ? stages.get(codeOf(declared.code, '')) : undefined) ?? firstStage;
  };

  for (const [index, declared] of pack.structure.levels.entries()) {
    const code = codeOf(declared.code, `LEVEL${index + 1}`);
    if (levelsByCode.has(code)) continue;
    const stage = stageOfLevel(declared.code);
    const created = await repository.create(
      'level',
      {
        institution_id: institutionId,
        stage_id: stage.id,
        code,
        name: declared.name,
        ordinal: declared.ordinal,
        ...(declared.typical_age === undefined ? {} : { typical_age: declared.typical_age }),
        is_terminal: declared.next === null || declared.next === undefined,
        ...(declared.national_assessment ? { national_assessment_code: declared.national_assessment } : {}),
      },
      options
    );
    levelsByCode.set(code, created);
    counts.level = (counts.level ?? 0) + 1;
  }

  // The `next` chain is written after every level exists, so a forward reference always resolves.
  for (const declared of pack.structure.levels) {
    const level = levelsByCode.get(codeOf(declared.code, ''));
    if (!level || !declared.next) continue;
    const next = levelsByCode.get(codeOf(declared.next, ''));
    if (!next || level.next_level_id === next.id) continue;
    await repository.update('level', level.id, { next_level_id: next.id }, { expectedVersion: level.rowVersion, ...options });
  }

  const existingPathways = await listAll(repository, 'pathway', { programme_id: programme.id });
  const pathways = new Map<string, RepositoryRow<'pathway'>>();
  for (const pathway of existingPathways) pathways.set(pathway.code, pathway);
  for (const declared of pack.structure.pathways) {
    const code = codeOf(declared.code, 'PATHWAY');
    if (pathways.has(code)) continue;
    const levelIds = declared.levels
      .map((levelCode) => levelsByCode.get(codeOf(levelCode, ''))?.id)
      .filter((id): id is RepositoryRow<'level'>['id'] => id !== undefined);
    const created = await repository.create(
      'pathway',
      { institution_id: institutionId, programme_id: programme.id, code, name: declared.name, level_ids: levelIds },
      options
    );
    pathways.set(code, created);
    counts.pathway = (counts.pathway ?? 0) + 1;
  }

  const existingAreas = await listAll(repository, 'learning_area', { programme_id: programme.id });
  const areas = new Map<string, RepositoryRow<'learning_area'>>();
  for (const area of existingAreas) areas.set(area.code, area);
  for (const declared of pack.learningAreas) {
    const code = codeOf(declared.code, 'AREA');
    if (areas.has(code)) continue;
    const levelIds = declared.levels
      .map((levelCode) => levelsByCode.get(codeOf(levelCode, ''))?.id)
      .filter((id): id is RepositoryRow<'level'>['id'] => id !== undefined);
    const pathwayIds = declared.pathways
      .map((pathwayCode) => pathways.get(codeOf(pathwayCode, ''))?.id)
      .filter((id): id is RepositoryRow<'pathway'>['id'] => id !== undefined);
    const created = await repository.create(
      'learning_area',
      {
        institution_id: institutionId,
        programme_id: programme.id,
        code,
        name: declared.name,
        ...(declared.short_name === undefined ? {} : { short_name: declared.short_name }),
        ...(declared.group === undefined ? {} : { group: declared.group }),
        kind: declared.kind,
        level_ids: levelIds,
        pathway_ids: pathwayIds,
        ...(declared.national_code ? { national_code: declared.national_code } : {}),
      },
      options
    );
    areas.set(code, created);
    counts.learning_area = (counts.learning_area ?? 0) + 1;
  }

  for (const declared of pack.learningAreas) {
    const area = areas.get(codeOf(declared.code, 'AREA'));
    if (!area) continue;
    const existing = await listAll(repository, 'component', { learning_area_id: area.id });
    const codes = new Set(existing.map((component) => component.code));
    for (const component of declared.components) {
      const code = codeOf(component.code, 'COMPONENT');
      if (codes.has(code)) continue;
      await repository.create(
        'component',
        {
          institution_id: institutionId,
          learning_area_id: area.id,
          code,
          name: component.name,
          kind: component.kind,
          ...(component.weight === undefined ? {} : { weight: component.weight }),
          ...(component.max_score === undefined ? {} : { max_score: component.max_score }),
        },
        options
      );
      codes.add(code);
      counts.component = (counts.component ?? 0) + 1;
    }
  }

  const existingCompetencies = await listAll(repository, 'competency', { programme_id: programme.id });
  const competencyCodes = new Set(existingCompetencies.map((competency) => competency.code));
  for (const declared of pack.competencies) {
    const code = codeOf(declared.code, 'COMPETENCY');
    if (competencyCodes.has(code)) continue;
    await repository.create(
      'competency',
      {
        institution_id: institutionId,
        programme_id: programme.id,
        code,
        name: declared.name,
        kind: declared.kind,
        descriptors: [...declared.descriptors],
      },
      options
    );
    competencyCodes.add(code);
    counts.competency = (counts.competency ?? 0) + 1;
  }

  const existingRules = await listAll(repository, 'combination_rule', { programme_id: programme.id });
  if (existingRules.length === 0) {
    for (const rule of pack.combinationRules) {
      const levelIds = rule.levels
        .map((levelCode) => levelsByCode.get(codeOf(levelCode, ''))?.id)
        .filter((id): id is RepositoryRow<'level'>['id'] => id !== undefined);
      await repository.create(
        'combination_rule',
        {
          institution_id: institutionId,
          programme_id: programme.id,
          level_ids: levelIds,
          rule: {
            rule: rule.rule,
            of: [...rule.of],
            ...(rule.count === undefined ? {} : { count: rule.count }),
            ...(rule.max === undefined ? {} : { max: rule.max }),
            ...(rule.group === undefined ? {} : { group: rule.group }),
            ...(rule.min === undefined ? {} : { min: rule.min }),
            ...(rule.from_pathway === undefined ? {} : { from_pathway: rule.from_pathway }),
          },
        },
        options
      );
      counts.combination_rule = (counts.combination_rule ?? 0) + 1;
    }
  }

  const existingScales = await listAll(repository, 'grading_scale', { programme_id: programme.id });
  const scaleCodes = new Set(existingScales.map((scale) => scale.code));
  for (const scale of pack.assessment.gradingScales) {
    const code = codeOf(scale.code, 'SCALE');
    if (scaleCodes.has(code)) continue;
    await repository.create(
      'grading_scale',
      {
        institution_id: institutionId,
        programme_id: programme.id,
        code,
        kind: canonicalScaleKind(scale.kind),
        bands: scale.bands.map((band) => ({
          code: band.code,
          label: band.label,
          min: band.min,
          max: band.max,
          ...(band.points === undefined ? {} : { points: band.points }),
          ...(band.descriptor === undefined ? {} : { descriptor: band.descriptor }),
        })),
        version: pack.version,
      },
      options
    );
    scaleCodes.add(code);
    counts.grading_scale = (counts.grading_scale ?? 0) + 1;
  }

  const existingSchemes = await listAll(repository, 'assessment_scheme', { programme_id: programme.id });
  const schemeVersions = new Set(existingSchemes.map((scheme) => scheme.version));
  for (const scheme of pack.assessment.schemes) {
    // The canonical table keys a scheme on (programme_id, version) and a pack declares several
    // schemes at one version, so the pack version and the scheme code travel together.
    const version = schemeVersion(pack.version, scheme.code);
    if (schemeVersions.has(version)) continue;
    const levelIds = scheme.levels
      .map((levelCode) => levelsByCode.get(codeOf(levelCode, ''))?.id)
      .filter((id): id is RepositoryRow<'level'>['id'] => id !== undefined);
    await repository.create(
      'assessment_scheme',
      {
        institution_id: institutionId,
        programme_id: programme.id,
        level_ids: levelIds,
        version,
        definition: scheme as unknown as CreateInput<'assessment_scheme'>['definition'],
      },
      options
    );
    schemeVersions.add(version);
    counts.assessment_scheme = (counts.assessment_scheme ?? 0) + 1;
  }

  return counts;
}

/** The canonical name of a pack grading-scale kind; the two vocabularies differ in one place. */
function canonicalScaleKind(kind: string): 'numeric_bands' | 'rubric' | 'points' | 'letter' | 'division' | 'gpa' | 'mark_out_of_20' {
  switch (kind) {
    case 'descriptor':
      return 'rubric';
    case 'numeric_bands':
    case 'rubric':
    case 'points':
    case 'letter':
    case 'division':
    case 'gpa':
    case 'mark_out_of_20':
      return kind;
    default:
      return 'numeric_bands';
  }
}

/** The version a stored scheme carries: the pack version and the scheme's own code. */
export function schemeVersion(packVersion: string, schemeCode: string): string {
  return `${packVersion}+${schemeCode}`.slice(0, 50);
}

/** The calendar the programme reads under: the institution's, or a named variant of the pack. */
async function calendarFor(
  repository: Repository,
  input: InstallPackProgrammeInput
): Promise<RepositoryRow<'calendar'>> {
  const calendars = await listAll(repository, 'calendar', { institution_id: input.institutionId });
  const variant = input.calendar;
  if (variant && input.pack.calendars.length > 1) {
    const name = `${input.pack.name} — ${variant.name}`.slice(0, 200);
    const found = calendars.find((calendar) => calendar.name === name);
    if (found) return found;
    return repository.create(
      'calendar',
      { institution_id: input.institutionId, name, programme_ids: [] },
      { actor: input.actor, reason: `install ${input.pack.ref}: calendar variant ${variant.code}` }
    );
  }
  if (calendars.length > 0) return calendars[0];
  return repository.create(
    'calendar',
    { institution_id: input.institutionId, name: `${input.pack.name} Calendar`.slice(0, 200), programme_ids: [] },
    { actor: input.actor, reason: `install ${input.pack.ref}` }
  );
}

/**
 * Installs a pack into the school as a programme.
 *
 * The programme row, the pack's structural rows and the registry's pack source and pin are one
 * transaction: a failure at any step leaves neither a programme nor a half-written curriculum.
 * The programme is found by name first, so re-running the wizard reuses the programme the first
 * run created instead of adding another.
 */
export async function installPackProgramme(
  input: InstallPackProgrammeInput
): Promise<InstalledProgramme> {
  const { repository, actor, pack } = input;
  const name = programmeNameFor(pack, input.programmeName);
  const registry = createPackRegistry({
    repository,
    actor,
    source: input.source ?? packSourceFor([pack]),
  });

  const loaded = registry.load(pack.document);
  if (!loaded.ok) {
    throw new Error(
      `${pack.ref} does not load: ${loaded.issues.map((issue) => `${issue.path} ${issue.check}`).join(', ')}`
    );
  }

  const calendar = await calendarFor(repository, input);

  return repository.transaction(async () => {
    const existing = (
      await listAll(repository, 'programme', { institution_id: input.institutionId })
    ).find((programme) => programme.name === name);

    const programme =
      existing ??
      (await repository.create(
        'programme',
        {
          institution_id: input.institutionId,
          curriculum_pack_code: pack.code,
          pack_version: pack.version,
          name,
          calendar_id: calendar.id,
          status: 'active',
        },
        { actor, reason: `install ${pack.ref}` }
      ));

    const counts = await instantiateProgramme(
      repository,
      programme,
      loaded.pack,
      actor,
      `install ${pack.ref}`
    );

    try {
      await registry.install(programme.id, pack.document, {
        actor,
        reason: input.reason,
      });
    } catch (error) {
      // A programme that already exists at another version is an upgrade, and the registry
      // previews it before it moves the pin. The wizard never forces an unsafe upgrade.
      if (isUpgradeRequired(error)) {
        await registry.upgrade(programme.id, pack.document, { actor, reason: input.reason });
      } else {
        throw error;
      }
    }

    return {
      programmeId: programme.id,
      programmeName: name,
      pack: pack.ref,
      reused: existing !== undefined,
      calendarId: calendar.id,
      counts,
    };
  });
}

function isUpgradeRequired(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { readonly code?: unknown }).code === 'upgrade_required'
  );
}

/** The programme a name resolves to, or null. Used by the wizard's resumable re-run. */
export async function findProgrammeByName(
  repository: Repository,
  institutionId: string,
  name: string
): Promise<RepositoryRow<'programme'> | null> {
  const programmes = await listAll(repository, 'programme', { institution_id: institutionId });
  return programmes.find((programme) => programme.name === name) ?? null;
}

/** A programme id as the registry's id type. */
export const programmeIdOf = (id: string) => asId<'programme'>(id);

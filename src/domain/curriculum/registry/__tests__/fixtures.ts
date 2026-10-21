// ABOUTME: Programme fixtures for the registry tests: a fresh programme per test, a stage, a level
// ABOUTME: and a learning area written through the repository, and the row counts a preview must not move.

import type { RepositoryRow } from '@/data/repository';
import { TEST_ACTOR, type TestContext } from '@/data/__tests__/harness';
import { asId } from '@/domain/ids';

export type ProgrammeRow = RepositoryRow<'programme'>;

let programmeCounter = 0;

/** A programme that pins `code@version` and holds no overrides. */
export async function freshProgramme(
  context: TestContext,
  code = 'ke-cbe',
  version = '2026.1.0',
  overrides: Readonly<Record<string, unknown>> = {}
): Promise<ProgrammeRow> {
  programmeCounter += 1;
  return context.repository.create(
    'programme',
    context.seed.inputFor('programme', {
      name: `Programme ${programmeCounter}`,
      curriculum_pack_code: code,
      pack_version: version,
      overrides,
    })
  );
}

export interface ProgrammeStructure {
  readonly stage: RepositoryRow<'stage'>;
  readonly level: RepositoryRow<'level'>;
  readonly area: RepositoryRow<'learning_area'>;
}

/**
 * The rows a programme creates from its pack: a stage, a level and the learning area `code`.
 * They are the "existing rows" an upgrade must not silently strand.
 */
export async function programmeStructure(
  context: TestContext,
  programme: ProgrammeRow,
  code = 'ENG'
): Promise<ProgrammeStructure> {
  const stage = await context.repository.create(
    'stage',
    context.seed.inputFor('stage', {
      programme_id: programme.id,
      code: 'JS',
      name: 'Junior School',
      sequence: 1,
    })
  );
  const level = await context.repository.create(
    'level',
    context.seed.inputFor('level', {
      stage_id: stage.id,
      code: 'G7',
      name: 'Grade 7',
      ordinal: 7,
    })
  );
  const area = await context.repository.create(
    'learning_area',
    context.seed.inputFor('learning_area', {
      programme_id: programme.id,
      code,
      name: code === 'ENG' ? 'English' : code,
      level_ids: [level.id],
      pathway_ids: [],
    })
  );
  return { stage, level, area };
}

export interface State {
  readonly programmeVersion: number;
  readonly sources: number;
  readonly audit: number;
}

/** The state a preview must leave exactly as it found it. */
export async function stateOf(context: TestContext, programmeId: string): Promise<State> {
  const programme = await context.repository.get('programme', asId<'programme'>(programmeId));
  const sources = await context.repository.list('curriculum_pack', { limit: 500 });
  const audit = await context.repository.auditLog({ limit: 1000 });
  return {
    programmeVersion: programme?.rowVersion ?? -1,
    sources: sources.total,
    audit: audit.length,
  };
}

/** A different document for the same `code@version`, to prove the checksum is checked. */
export function mutatedDocument(document: Record<string, unknown>): Record<string, unknown> {
  const copy = structuredClone(document);
  const manifest = copy.pack;
  if (typeof manifest === 'object' && manifest !== null) {
    (manifest as Record<string, unknown>).name = 'A document that was never installed';
  }
  return copy;
}

export const ACTOR = TEST_ACTOR;

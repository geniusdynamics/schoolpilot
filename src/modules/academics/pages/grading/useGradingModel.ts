// ABOUTME: The canonical grading model the Grading & Systems tabs read: every grading scale and
// ABOUTME: assessment scheme joined to its programme, its provenance and the pack's install state.

import { useMemo } from 'react';

import {
  useCanonicalAcademics,
  type AssessmentSchemeRow,
  type CurriculumPackRow,
  type GradingScaleRow,
  type LevelRow,
  type ProgrammeRow,
} from '../../data/useCanonicalAcademics';
import {
  declarationFor,
  scaleSource,
  schemeCodeOf,
  schemeSource,
  type PackGradingDeclaration,
  type RowSource,
} from './provenance';

/** A grading scale as the screens show it. */
export interface GradingScaleView {
  readonly scale: GradingScaleRow;
  readonly programme: ProgrammeRow | null;
  readonly source: RowSource;
}

/** An assessment scheme as the screens show it. */
export interface AssessmentSchemeView {
  readonly scheme: AssessmentSchemeRow;
  readonly programme: ProgrammeRow | null;
  readonly source: RowSource;
  /** The scheme's own code, separated from the version the table stores. */
  readonly code: string;
  readonly levels: readonly LevelRow[];
}

/** One programme with the grading rows it owns and the pack it runs on. */
export interface ProgrammeGradingView {
  readonly programme: ProgrammeRow;
  readonly declaration: PackGradingDeclaration | null;
  readonly source: CurriculumPackRow | null;
  readonly installed: boolean;
  readonly scales: readonly GradingScaleView[];
  readonly schemes: readonly AssessmentSchemeView[];
}

export interface GradingModel {
  readonly repository: ReturnType<typeof useCanonicalAcademics>['repository'];
  readonly institutionId: string | null;
  readonly loading: boolean;
  readonly failed: boolean;
  readonly programmes: readonly ProgrammeRow[];
  readonly levels: readonly LevelRow[];
  readonly scales: readonly GradingScaleView[];
  readonly schemes: readonly AssessmentSchemeView[];
  readonly programmeViews: readonly ProgrammeGradingView[];
}

/** Joins the stored grading rows to the programmes, levels and packs they belong to. */
export function useGradingModel(
  declarations: readonly PackGradingDeclaration[]
): GradingModel {
  const academics = useCanonicalAcademics();
  const {
    institutionId,
    isLoading,
    isError,
    programmes,
    levels,
    gradingScales,
    assessmentSchemes,
    curriculumPacks,
  } = academics;

  const model = useMemo(() => {
    const programmeById = new Map<string, ProgrammeRow>(
      programmes.map((programme) => [programme.id as string, programme])
    );
    const levelById = new Map<string, LevelRow>(
      levels.map((level) => [level.id as string, level])
    );

    const programmeFor = (programmeId: string): ProgrammeRow | null =>
      programmeById.get(programmeId) ?? null;

    const scaleViews: GradingScaleView[] = gradingScales
      .slice()
      .sort((left, right) =>
        `${left.programme_id}/${left.code}/${left.version}`.localeCompare(
          `${right.programme_id}/${right.code}/${right.version}`
        )
      )
      .map((scale) => {
        const programme = programmeFor(scale.programme_id);
        const declaration = declarationFor(programme, declarations);
        return { scale, programme, source: scaleSource(scale, programme, declaration) };
      });

    const schemeViews: AssessmentSchemeView[] = assessmentSchemes
      .slice()
      .sort((left, right) =>
        `${left.programme_id}/${left.version}`.localeCompare(`${right.programme_id}/${right.version}`)
      )
      .map((scheme) => {
        const programme = programmeFor(scheme.programme_id);
        const declaration = declarationFor(programme, declarations);
        return {
          scheme,
          programme,
          source: schemeSource(scheme, programme, declaration),
          code: schemeCodeOf(scheme),
          levels: scheme.level_ids
            .map((id) => levelById.get(id))
            .filter((level): level is LevelRow => level !== undefined),
        };
      });

    const programmeViews: ProgrammeGradingView[] = programmes
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((programme) => {
        const declaration = declarationFor(programme, declarations);
        const source = curriculumPacks.find(
          (row) =>
            row.code === programme.curriculum_pack_code &&
            row.version === programme.pack_version &&
            row.institution_id === programme.institution_id
        ) ?? null;
        return {
          programme,
          declaration,
          source,
          installed: source !== null,
          scales: scaleViews.filter((view) => view.scale.programme_id === programme.id),
          schemes: schemeViews.filter((view) => view.scheme.programme_id === programme.id),
        };
      });

    return {
      institutionId,
      programmes,
      levels,
      scales: scaleViews,
      schemes: schemeViews,
      programmeViews,
    };
  }, [
    institutionId,
    programmes,
    levels,
    gradingScales,
    assessmentSchemes,
    curriculumPacks,
    declarations,
  ]);

  return {
    repository: academics.repository,
    loading: isLoading,
    failed: isError,
    ...model,
  };
}

// ABOUTME: The JSON examples from spec 03, copied verbatim as validation fixtures for the pack schemas.
// ABOUTME: Each entry names the spec section it comes from and the schema that must accept it.

export interface SpecExample {
  /** Spec section, for example "03 §2.2". */
  readonly spec: string;
  /** What the block shows. */
  readonly title: string;
  /** Absolute schema id (or id with a $defs fragment) from packs/schema. */
  readonly schema: string;
  /** The example document exactly as printed in the spec. */
  readonly document: unknown;
}

const BASE = 'https://schemas.schoolpilot.app/curriculum-pack/v1/';

export const spec03Examples: readonly SpecExample[] = [
  {
    spec: '03 §2.2',
    title: 'pack.json manifest',
    schema: `${BASE}manifest.schema.json`,
    document: {
      code: 'ke-cbe',
      name: 'Kenya Competency-Based Education (CBE)',
      version: '2026.1.0',
      country: 'KE',
      issuers: ['KICD', 'KNEC', 'Ministry of Education'],
      effective_from: '2026-01-01',
      supersedes: 'ke-cbc@2024.2.0',
      languages: ['en', 'sw'],
      requires_engine: '>=1.0.0',
      sources: [
        { title: 'Basic Education Curriculum Framework', issuer: 'KICD', url: '…', retrieved: '2026-09-01' },
      ],
      verification: {
        status: 'draft',
        verified_by: [],
        notes: 'Bands must be checked against the current KNEC circular before release.',
      },
    },
  },
  {
    spec: '03 §3',
    title: 'structural model: stages, levels, pathways, calendar template',
    schema: `${BASE}structure.schema.json`,
    document: {
      stages: [
        { code: 'PP', name: 'Pre-primary', levels: ['PP1', 'PP2'] },
        { code: 'LP', name: 'Lower Primary', levels: ['G1', 'G2', 'G3'] },
        { code: 'UP', name: 'Upper Primary', levels: ['G4', 'G5', 'G6'] },
        { code: 'JS', name: 'Junior School', levels: ['G7', 'G8', 'G9'] },
        { code: 'SS', name: 'Senior School', levels: ['G10', 'G11', 'G12'] },
      ],
      levels: [
        {
          code: 'G7',
          name: 'Grade 7',
          ordinal: 9,
          typical_age: 12,
          next: 'G8',
          national_assessment: null,
        },
        {
          code: 'G9',
          name: 'Grade 9',
          ordinal: 11,
          next: 'G10',
          is_stage_exit: true,
          national_assessment: 'KJSEA',
        },
      ],
      pathways: [
        { code: 'STEM', name: 'STEM', levels: ['G10', 'G11', 'G12'] },
        { code: 'SS', name: 'Social Sciences', levels: ['G10', 'G11', 'G12'] },
        { code: 'ASS', name: 'Arts & Sports Science', levels: ['G10', 'G11', 'G12'] },
      ],
      calendar_template: {
        year_kind: 'calendar_year',
        periods: [
          { kind: 'term', sequence: 1, name: 'Term 1', typical: ['01-06', '04-04'], half_term: true },
          { kind: 'term', sequence: 2, name: 'Term 2', typical: ['04-28', '08-01'], half_term: true },
          { kind: 'term', sequence: 3, name: 'Term 3', typical: ['08-25', '10-31'], half_term: false },
        ],
        note: 'Exact dates are published annually by the Ministry; the wizard pre-fills and the school confirms.',
      },
    },
  },
  {
    spec: '03 §3',
    title: 'learning areas, competencies and combination rules',
    schema: `${BASE}learning-areas.schema.json`,
    document: {
      learning_areas: [
        {
          code: 'ENG',
          name: 'English',
          kind: 'core',
          group: 'languages',
          levels: ['G7', 'G8', 'G9'],
          national_code: null,
          components: [],
          outcomes_ref: 'outcomes/eng-js.json',
        },
        {
          code: 'KIS',
          name: 'Kiswahili',
          kind: 'core',
          group: 'languages',
          alternatives: ['KSL'],
          levels: ['G7', 'G8', 'G9'],
        },
      ],
      competencies: [
        { code: 'CC', name: 'Communication and Collaboration', kind: 'core_competency' },
        { code: 'VAL-RESP', name: 'Responsibility', kind: 'value' },
      ],
      combination_rules: [
        {
          levels: ['G10', 'G11', 'G12'],
          rule: 'core_all',
          of: ['ENG', 'KIS|KSL', 'MAT|EMAT', 'CSL', 'PE'],
        },
        { levels: ['G10', 'G11', 'G12'], rule: 'electives', count: 3, from_pathway: true },
      ],
    },
  },
  {
    spec: '03 §4',
    title: 'assessment schemes: WAEC slots, 8-4-4 scaling and CBE formative evidence',
    schema: `${BASE}assessment.schema.json#/$defs/schemesSection`,
    document: {
      schemes: [
        {
          code: 'ng-terminal',
          levels: ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'],
          slots: [
            { code: 'CA1', label: '1st C.A.', max: 20, kind: 'cat' },
            { code: 'CA2', label: '2nd C.A.', max: 20, kind: 'cat' },
            { code: 'EXAM', label: 'Exam', max: 60, kind: 'end_term' },
          ],
          learning_area_score: { op: 'sum', of: ['CA1', 'CA2', 'EXAM'], out_of: 100 },
          grading_scale: 'waec',
          missing: { CA1: 'zero', CA2: 'zero', EXAM: 'incomplete' },
        },
        {
          code: 'ke-844-internal',
          levels: ['F1', 'F2', 'F3', 'F4'],
          slots: [
            { code: 'CAT', label: 'CATs', kind: 'cat', multi: true, combine: 'mean', scale_to: 30 },
            { code: 'ET', label: 'End Term', kind: 'end_term', scale_to: 70 },
          ],
          learning_area_score: { op: 'sum', of: ['CAT', 'ET'], out_of: 100 },
          component_policy: { papers: 'scale_each_then_sum', out_of: 100 },
          grading_scale: 'kcse_subject',
          overridable: ['slots.*.scale_to'],
        },
        {
          code: 'ke-cbe-formative',
          levels: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
          evidence: 'rubric_observations',
          observation_scale: 'cbe_4_level',
          term_judgement: { op: 'teacher_best_fit', suggest: 'mode_of_latest_per_outcome' },
          summative_slots: [
            { code: 'ET', label: 'End-of-term test', max: 100, maps_to: 'cbe_4_level' },
          ],
          report_shows: ['rubric_level', 'descriptor', 'teacher_comment'],
        },
      ],
    },
  },
  {
    spec: '03 §4.1',
    title: 'period to annual aggregation',
    schema: `${BASE}assessment.schema.json#/$defs/annualSection`,
    document: {
      annual: {
        op: 'weighted_mean',
        of: { T1: 0.3, T2: 0.3, T3: 0.4 },
        missing: 'renormalise',
      },
    },
  },
  {
    spec: '03 §4',
    title: 'inline rounding rule',
    schema: `${BASE}assessment.schema.json#/$defs/roundingRule`,
    document: { stage: 'learning_area_score', precision: 0, mode: 'half_up' },
  },
  {
    spec: '03 §5',
    title: 'CBE 8-level grading scale',
    schema: `${BASE}grading-scale.schema.json`,
    document: {
      code: 'cbe_8_level',
      kind: 'numeric_bands',
      input: 'percent',
      bands: [
        { code: 'EE1', label: 'Exceeding Expectations 1', min: 90, max: 100, points: 8 },
        { code: 'EE2', label: 'Exceeding Expectations 2', min: 75, max: 89, points: 7 },
        { code: 'ME1', label: 'Meeting Expectations 1', min: 58, max: 74, points: 6 },
        { code: 'ME2', label: 'Meeting Expectations 2', min: 41, max: 57, points: 5 },
        { code: 'AE1', label: 'Approaching Expectations 1', min: 31, max: 40, points: 4 },
        { code: 'AE2', label: 'Approaching Expectations 2', min: 21, max: 30, points: 3 },
        { code: 'BE1', label: 'Below Expectations 1', min: 11, max: 20, points: 2 },
        { code: 'BE2', label: 'Below Expectations 2', min: 1, max: 10, points: 1 },
      ],
      verification:
        'Bands as commonly published for Junior School/KJSEA reporting; confirm against the current KNEC circular.',
    },
  },
  {
    spec: '03 §6',
    title: 'aggregations: KCSE best-7, PLE division and Francophone moyenne',
    schema: `${BASE}assessment.schema.json#/$defs/aggregationsSection`,
    document: {
      aggregations: [
        {
          code: 'kcse_mean_grade',
          op: 'best_n',
          n: 7,
          value: 'points',
          groups: [
            { require_all: ['ENG', 'KIS', 'MAT'] },
            { group: 'sciences', min: 2 },
            { group: 'humanities', min: 1 },
            { fill_from: 'any' },
          ],
          then: { op: 'mean', precision: 3 },
          result_scale: 'kcse_mean_grade',
        },
        {
          code: 'ple_division',
          op: 'sum',
          over: ['ENG', 'MTC', 'SCI', 'SST'],
          value: 'grade_points',
          result_scale: 'ple_divisions',
          fail_if: { any_grade: 'F9', in: ['ENG', 'MTC'], then_max_division: 'IV' },
        },
        {
          code: 'moyenne_trimestrielle',
          op: 'weighted_mean',
          value: 'score_20',
          weights: 'coefficient',
          precision: 2,
          result_scale: 'mentions_fr',
        },
      ],
    },
  },
  {
    spec: '03 §6.1',
    title: 'ranking policy',
    schema: `${BASE}ranking.schema.json`,
    document: {
      enabled: false,
      scope: 'class_group',
      by: 'kcse_mean_grade.points',
      ties: 'competition_1224',
      only_complete: true,
      show_on_report: false,
      show_out_of: true,
    },
  },
  {
    spec: '03 §7',
    title: 'progression and graduation rules',
    schema: `${BASE}progression.schema.json`,
    document: {
      progression: [
        { levels: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8'], rule: 'automatic' },
        {
          levels: ['G9'],
          rule: 'stage_transition',
          to_stage: 'SS',
          requires: ['national_assessment_recorded', 'pathway_placement'],
        },
        {
          levels: ['JSS1', 'JSS2', 'SS1', 'SS2'],
          rule: 'threshold',
          conditions: [
            { metric: 'annual.average', gte: 40 },
            { metric: 'annual.ENG', gte: 40 },
            { metric: 'annual.MAT', gte: 40 },
          ],
          else: 'repeat_or_council',
        },
        {
          levels: ['6e', '5e', '4e', '2nde', '1ere'],
          rule: 'class_council',
          suggest: { metric: 'annual.moyenne', gte: 10 },
        },
      ],
      graduation: [
        { levels: ['G12', 'F4', 'Y13', 'SS3', 'Terminale'], rule: 'graduate' },
      ],
    },
  },
  {
    spec: '03 §12',
    title: 'conformance vectors',
    schema: `${BASE}tests.schema.json`,
    document: {
      vectors: [
        {
          name: 'KCSE best-7 with 3 sciences',
          programme: 'ke-844',
          input: { ENG: 'B+', KIS: 'B', MAT: 'A-', BIO: 'B', CHE: 'C+', PHY: 'B-', HIS: 'A', CRE: 'B+', BST: 'C' },
          expect: {
            kcse_mean_grade: { total_points: 69, points: 9.857, grade: 'B+' },
            selected: ['ENG', 'KIS', 'MAT', 'BIO', 'PHY', 'HIS', 'CRE'],
          },
        },
      ],
    },
  },
];

// src/modules/academics/data/templates/kenyan-subject-sets.ts

// ABOUTME: Kenyan curricula subject sets for the first-run wizard and demo seed (Phase 2.8).
// ABOUTME: CBC primary (PP1–Grade 6), 8-4-4/KCSE secondary (Form 1–4) with KCSE groupings,
// ABOUTME plus education-system presets that pair the subject sets with grading config.

import { SubjectGrouping } from '../enums';

export interface KenyanSubjectSeed {
  subject_code: string;
  name: string;
  abbreviation: string;
  grouping: SubjectGrouping;
  is_compulsory: boolean;
}

/** CBC primary learning areas (PP1–Grade 6). */
export const KENYA_CBC_PRIMARY_SUBJECTS: KenyanSubjectSeed[] = [
  { subject_code: 'ENG-P', name: 'English Language Activities', abbreviation: 'English', grouping: SubjectGrouping.GROUP_1_COMPULSORY, is_compulsory: true },
  { subject_code: 'KIS-P', name: 'Kiswahili Language Activities', abbreviation: 'Kiswahili', grouping: SubjectGrouping.GROUP_1_COMPULSORY, is_compulsory: true },
  { subject_code: 'MAT-P', name: 'Mathematical Activities', abbreviation: 'Maths', grouping: SubjectGrouping.GROUP_1_COMPULSORY, is_compulsory: true },
  { subject_code: 'ENV-P', name: 'Environmental Activities', abbreviation: 'Env. Activities', grouping: SubjectGrouping.GROUP_1_COMPULSORY, is_compulsory: true },
  { subject_code: 'HYG-P', name: 'Hygiene and Nutrition Activities', abbreviation: 'Hygiene', grouping: SubjectGrouping.GROUP_1_COMPULSORY, is_compulsory: true },
  { subject_code: 'CRE-P', name: 'Creative Arts', abbreviation: 'Creative Arts', grouping: SubjectGrouping.GROUP_4_TECHNICALS, is_compulsory: true },
  { subject_code: 'PHE-P', name: 'Physical and Health Education', abbreviation: 'PHE', grouping: SubjectGrouping.GROUP_1_COMPULSORY, is_compulsory: true },
  { subject_code: 'CREL-P', name: 'Religious Education Activities', abbreviation: 'Rel. Education', grouping: SubjectGrouping.GROUP_3_HUMANITIES, is_compulsory: true },
  { subject_code: 'PSC-P', name: 'Pastoral Programme of Instruction', abbreviation: 'PPI', grouping: SubjectGrouping.OTHER, is_compulsory: false },
];

/** 8-4-4 / KCSE secondary subjects (Form 1–4) grouped per KNEC regulations. */
export const KENYA_KCSE_SECONDARY_SUBJECTS: KenyanSubjectSeed[] = [
  // Group 1 — compulsory
  { subject_code: 'ENG', name: 'English', abbreviation: 'Eng', grouping: SubjectGrouping.GROUP_1_COMPULSORY, is_compulsory: true },
  { subject_code: 'KIS', name: 'Kiswahili', abbreviation: 'Kis', grouping: SubjectGrouping.GROUP_1_COMPULSORY, is_compulsory: true },
  { subject_code: 'MAT', name: 'Mathematics', abbreviation: 'Maths', grouping: SubjectGrouping.GROUP_1_COMPULSORY, is_compulsory: true },
  // Group 2 — sciences (choose at least two)
  { subject_code: 'BIO', name: 'Biology', abbreviation: 'Bio', grouping: SubjectGrouping.GROUP_2_SCIENCES, is_compulsory: false },
  { subject_code: 'CHE', name: 'Chemistry', abbreviation: 'Chem', grouping: SubjectGrouping.GROUP_2_SCIENCES, is_compulsory: true },
  { subject_code: 'PHY', name: 'Physics', abbreviation: 'Phy', grouping: SubjectGrouping.GROUP_2_SCIENCES, is_compulsory: false },
  // Group 3 — humanities & social sciences
  { subject_code: 'HIS', name: 'History and Government', abbreviation: 'History', grouping: SubjectGrouping.GROUP_3_HUMANITIES, is_compulsory: false },
  { subject_code: 'GEO', name: 'Geography', abbreviation: 'Geog', grouping: SubjectGrouping.GROUP_3_HUMANITIES, is_compulsory: false },
  { subject_code: 'CRE', name: 'Christian Religious Education', abbreviation: 'CRE', grouping: SubjectGrouping.GROUP_3_HUMANITIES, is_compulsory: false },
  { subject_code: 'HRE', name: 'Hindu Religious Education', abbreviation: 'HRE', grouping: SubjectGrouping.GROUP_3_HUMANITIES, is_compulsory: false },
  { subject_code: 'IRE', name: 'Islamic Religious Education', abbreviation: 'IRE', grouping: SubjectGrouping.GROUP_3_HUMANITIES, is_compulsory: false },
  // Group 4 — technical & applied sciences
  { subject_code: 'AGR', name: 'Agriculture', abbreviation: 'Agri', grouping: SubjectGrouping.GROUP_4_TECHNICALS, is_compulsory: false },
  { subject_code: 'BST', name: 'Business Studies', abbreviation: 'Business', grouping: SubjectGrouping.GROUP_4_TECHNICALS, is_compulsory: false },
  { subject_code: 'CST', name: 'Computer Studies', abbreviation: 'Computer', grouping: SubjectGrouping.GROUP_4_TECHNICALS, is_compulsory: false },
  { subject_code: 'HSC', name: 'Home Science', abbreviation: 'Home Sci.', grouping: SubjectGrouping.GROUP_4_TECHNICALS, is_compulsory: false },
  { subject_code: 'ADT', name: 'Art and Design', abbreviation: 'Art', grouping: SubjectGrouping.GROUP_4_TECHNICALS, is_compulsory: false },
  { subject_code: 'MUS', name: 'Music', abbreviation: 'Music', grouping: SubjectGrouping.GROUP_4_TECHNICALS, is_compulsory: false },
  { subject_code: 'WKS', name: 'Woodwork', abbreviation: 'Woodwork', grouping: SubjectGrouping.GROUP_4_TECHNICALS, is_compulsory: false },
  // Group 5 — foreign languages
  { subject_code: 'FRE', name: 'French', abbreviation: 'French', grouping: SubjectGrouping.GROUP_5_LANGUAGES, is_compulsory: false },
  { subject_code: 'GER', name: 'German', abbreviation: 'German', grouping: SubjectGrouping.GROUP_5_LANGUAGES, is_compulsory: false },
  { subject_code: 'ARB', name: 'Arabic', abbreviation: 'Arabic', grouping: SubjectGrouping.GROUP_5_LANGUAGES, is_compulsory: false },
];

/** Wizard presets pairing a curriculum with its subject set. */
export const KENYAN_CURRICULUM_PRESETS = {
  CBC_PRIMARY: {
    key: 'CBC_PRIMARY',
    label: 'CBC — Primary (PP1–Grade 6)',
    templateKey: 'KENYA_CBC_PRIMARY',
    subjects: KENYA_CBC_PRIMARY_SUBJECTS,
  },
  KCSE_SECONDARY: {
    key: 'KCSE_SECONDARY',
    label: '8-4-4 — Secondary (Form 1–4, KCSE)',
    templateKey: 'KENYA_KCSE_SECONDARY',
    subjects: KENYA_KCSE_SECONDARY_SUBJECTS,
  },
} as const;

export type KenyanCurriculumPresetKey = keyof typeof KENYAN_CURRICULUM_PRESETS;

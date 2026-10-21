// ABOUTME: Setup wizard draft: the values the user has entered plus the ids of records the wizard created,
// ABOUTME: kept in localStorage so the wizard is resumable and Back/Next updates records instead of duplicating them.

import { buildDefaultFinancialYear } from '@/modules/finance/data/useFinancialYearData';

export const WIZARD_DRAFT_KEY = 'schoolpilot_setup_wizard_draft';

export type CurriculumKey = 'CBC_PRIMARY' | 'KCSE_SECONDARY';

export interface SchoolProfileDraft {
  name: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
}

export interface ClassRowDraft {
  name: string;
  /** Stream names, comma-separated. */
  streams: string;
  /** The class record this row was saved to. */
  classId?: string;
}

export interface TermDraft {
  name: string;
  start: string;
  end: string;
}

/** Ids of records the wizard itself created, so a later pass can update or remove exactly those. */
export interface CreatedRecords {
  educationSystemId?: string;
  /** True when the wizard inserted the education system configuration; a reused one is never modified. */
  educationSystemCreated?: boolean;
  academicYearId?: string;
  financialYearId?: string;
  /** True when the wizard inserted the financial year; a reused one is never modified. */
  financialYearCreated?: boolean;
  classIds: string[];
  streamIds: string[];
  /** subject_code → subject id */
  subjectIds: Record<string, string>;
}

export interface WizardDraft {
  stepIndex: number;
  school: SchoolProfileDraft;
  curriculum: CurriculumKey | null;
  yearName: string;
  yearStart: string;
  yearEnd: string;
  terms: TermDraft[];
  /** 'calendar': the calendar year containing the academic year's start; 'custom': the dates below. */
  financialYearMode: 'calendar' | 'custom';
  financialYearName: string;
  financialYearStart: string;
  financialYearEnd: string;
  classes: ClassRowDraft[];
  selectedSubjects: Record<string, boolean>;
  /** Whether the canonical demo rows (learners, staff, fees, a register) are written too. */
  includeDemoData: boolean;
  created: CreatedRecords;
}

export const TERM_NAMES = ['Term 1', 'Term 2', 'Term 3'] as const;

/**
 * Default term dates for a calendar year, following the usual Kenyan school calendar
 * (January–April, late April–early August, late August–October). Every date is editable.
 */
export function defaultTerms(year: number): TermDraft[] {
  return [
    { name: TERM_NAMES[0], start: `${year}-01-06`, end: `${year}-04-04` },
    { name: TERM_NAMES[1], start: `${year}-04-28`, end: `${year}-08-01` },
    { name: TERM_NAMES[2], start: `${year}-08-25`, end: `${year}-10-31` },
  ];
}

const yearOf = (isoDate: string): number | null => {
  const year = Number.parseInt(String(isoDate).slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
};

/**
 * Terms to keep after the academic year start changes: untouched default terms move to the new
 * calendar year; terms the user has edited are kept as they are.
 */
export function termsForYearStart(terms: TermDraft[], previousStart: string, nextStart: string): TermDraft[] {
  const from = yearOf(previousStart);
  const to = yearOf(nextStart);
  if (from === null || to === null || from === to) return terms;
  const untouched = JSON.stringify(terms) === JSON.stringify(defaultTerms(from));
  return untouched ? defaultTerms(to) : terms;
}

/** The financial year the wizard creates: the calendar year of the academic year, or the user's own dates. */
export function financialYearFor(draft: WizardDraft): { name: string; start_date: string; end_date: string } {
  if (draft.financialYearMode === 'custom') {
    return { name: draft.financialYearName.trim(), start_date: draft.financialYearStart, end_date: draft.financialYearEnd };
  }
  const year = yearOf(draft.yearStart) ?? new Date().getFullYear();
  return buildDefaultFinancialYear(new Date(year, 0, 1));
}

export function defaultDraft(today: Date = new Date()): WizardDraft {
  const year = today.getFullYear();
  const financialYear = buildDefaultFinancialYear(today);
  return {
    stepIndex: 0,
    school: { name: '', motto: '', address: '', phone: '', email: '' },
    curriculum: null,
    yearName: `${year}`,
    yearStart: `${year}-01-06`,
    yearEnd: `${year}-11-30`,
    terms: defaultTerms(year),
    financialYearMode: 'calendar',
    financialYearName: financialYear.name,
    financialYearStart: financialYear.start_date,
    financialYearEnd: financialYear.end_date,
    classes: [{ name: '', streams: 'North, South' }],
    selectedSubjects: {},
    includeDemoData: false,
    created: { classIds: [], streamIds: [], subjectIds: {} },
  };
}

export function loadDraft(): WizardDraft {
  const base = defaultDraft();
  try {
    const raw = localStorage.getItem(WIZARD_DRAFT_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<WizardDraft>;
    return {
      ...base,
      ...saved,
      school: { ...base.school, ...saved.school },
      terms: Array.isArray(saved.terms) && saved.terms.length === TERM_NAMES.length ? saved.terms : base.terms,
      created: { ...base.created, ...saved.created },
    };
  } catch {
    return base;
  }
}

export function saveDraft(draft: WizardDraft): void {
  try {
    localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the database already holds every completed step.
  }
}

export function clearWizardDraft(): void {
  try {
    localStorage.removeItem(WIZARD_DRAFT_KEY);
  } catch {
    // ignore
  }
}

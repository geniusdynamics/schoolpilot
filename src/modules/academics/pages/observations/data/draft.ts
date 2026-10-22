// ABOUTME: The observation draft: the levels and evidence a teacher has entered but not yet saved,
// ABOUTME: kept in localStorage under the class and learning area so a reload or a navigation resumes it.
// ABOUTME: It follows the setup wizard's draft pattern; it is not a second sync queue.

import type { ObservationMode } from './judgement';

export const OBSERVATION_DRAFT_VERSION = 1;
export const OBSERVATION_DRAFT_PREFIX = 'schoolpilot_cbc_observation_draft_v1';
export const EVIDENCE_MAX_LENGTH = 2000;

export interface ObservationDraft {
  readonly version: number;
  /** Cell key (`targetKey|enrolmentId`) to the level code chosen but not yet written. */
  readonly levels: Readonly<Record<string, string>>;
  /** Cell key to the evidence note entered but not yet written. */
  readonly evidence: Readonly<Record<string, string>>;
  /** Cell key to the level a bulk action applied, kept so an override stays visible. */
  readonly bulk: Readonly<Record<string, string>>;
  /** The day new observations are recorded against. */
  readonly observedOn: string;
  readonly mode: ObservationMode;
  /** The learner the narrow layout is showing. */
  readonly learnerId: string | null;
}

/** The local date in the form the observation's `observed_on` expects. */
export function todayIso(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function emptyDraft(observedOn: string = todayIso()): ObservationDraft {
  return {
    version: OBSERVATION_DRAFT_VERSION,
    levels: {},
    evidence: {},
    bulk: {},
    observedOn,
    mode: 'outcome',
    learnerId: null,
  };
}

/** The storage key for one class and learning area, or null before both are chosen. */
export function draftKeyFor(
  institutionId: string | null,
  classGroupId: string,
  learningAreaId: string
): string | null {
  if (!institutionId || !classGroupId || !learningAreaId) return null;
  return `${OBSERVATION_DRAFT_PREFIX}:${institutionId}:${classGroupId}:${learningAreaId}`;
}

function textMap(value: unknown, limit?: number): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const entries: [string, string][] = [];
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string') continue;
    if (limit !== undefined && entry.length > limit) continue;
    entries.push([key, entry]);
  }
  return Object.fromEntries(entries);
}

function readDraft(value: unknown): ObservationDraft | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== OBSERVATION_DRAFT_VERSION) return null;
  const observedOn = typeof record.observedOn === 'string' ? record.observedOn : todayIso();
  return {
    version: OBSERVATION_DRAFT_VERSION,
    levels: textMap(record.levels),
    evidence: textMap(record.evidence, EVIDENCE_MAX_LENGTH),
    bulk: textMap(record.bulk),
    observedOn,
    mode: record.mode === 'competency' ? 'competency' : 'outcome',
    learnerId: typeof record.learnerId === 'string' ? record.learnerId : null,
  };
}

/** The draft stored for this selection, or null when there is none or it cannot be read. */
export function loadDraft(key: string | null): ObservationDraft | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return readDraft(JSON.parse(raw) as unknown);
  } catch {
    // Blocked storage or malformed JSON: start clean rather than fail the page.
    return null;
  }
}

/** Writes the draft synchronously, so a navigation or a reload cannot lose the last keystroke. */
export function saveDraft(key: string | null, draft: ObservationDraft): void {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the records the teacher saves still reach the repository.
  }
}

export function clearDraft(key: string | null): void {
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ABOUTME: The KNEC candidate registration plug-in: its manifest, the centre settings it reads, and
// ABOUTME: the on-demand export the host calls once it hands plug-ins learner records.

import {
  parseManifest,
  type PluginContext,
  type PluginModule,
  type SdkPluginManifest,
} from '@/plugins/sdk';

import { validateCentre, type CentreIdentity } from './indexNumbers';
import manifestJson from './plugin.json';
import {
  KnecRegistrationError,
  buildRegistration,
  type KnecCandidate,
  type KnecRegistration,
} from './registration';

export const manifest: SdkPluginManifest = parseManifest(manifestJson);

/** The options a registration needs, as the school's settings state them. */
export interface KnecOptions {
  readonly countyCode: string;
  readonly centreNumber: string;
  readonly writeJsonBundle: boolean;
}

function settingText(settings: Readonly<Record<string, unknown>>, key: string): string {
  const configured = settings[key];
  return typeof configured === 'string' ? configured.trim() : '';
}

/**
 * Reads the plug-in's options from the school's settings.
 *
 * The centre is refused here rather than in the export: an index number built on a mistyped centre
 * number is a candidate registered at the wrong school, which KNEC corrects only by transfer.
 */
export function knecOptions(settings: Readonly<Record<string, unknown>>): KnecOptions {
  const centre: CentreIdentity = {
    countyCode: settingText(settings, 'countyCode'),
    centreNumber: settingText(settings, 'centreNumber'),
  };
  const issues = validateCentre(centre).map((issue) => ({
    path: `settings.${issue.field}`,
    message: issue.message,
  }));
  if (issues.length > 0) throw new KnecRegistrationError(issues);
  return {
    ...centre,
    writeJsonBundle: settings.writeJsonBundle !== false,
  };
}

/**
 * The KCSE registration for a set of candidates, at the moment the operator asked for it.
 *
 * The host supplies the candidates: it does not hand plug-ins the school's collections yet.
 */
export function exportRegistration(
  context: Pick<PluginContext, 'settings'>,
  candidates: readonly KnecCandidate[],
  now: Date = new Date()
): KnecRegistration {
  const options = knecOptions(context.settings);
  return buildRegistration({
    exam: 'kcse',
    centre: { countyCode: options.countyCode, centreNumber: options.centreNumber },
    candidates,
    generatedAt: now.toISOString(),
    writeJsonBundle: options.writeJsonBundle,
  });
}

const module: PluginModule = {
  activate() {
    // Nothing to register: the files are produced on demand by exportRegistration, and there is no
    // slot, hook or route to claim until the host hands plug-ins learner records and mounts routes.
  },
};

export { KNEC_EXAMS, KnecRegistrationError, buildRegistration } from './registration';
export type {
  ExportIssue,
  KnecCandidate,
  KnecCandidateRow,
  KnecEntryType,
  KnecExam,
  KnecExamId,
  KnecLanguageRoute,
  KnecRegisteredSubject,
  KnecRegistration,
  KnecRegistrationInput,
  KnecSubjectEntry,
} from './registration';
export { INDEX_BANDS, bandForSubjectCount, parseIndexNumber } from './indexNumbers';
export type { CentreIdentity, IndexBand } from './indexNumbers';
export { KCSE_SUBJECTS, isKnownSubjectCode, subjectByCode } from './subjects';
export type { Subject, SubjectGroup } from './subjects';
export { KNEC_KCSE_USER_GUIDE } from './sources';
export type { KnecSource } from './sources';

export default { manifest, module };

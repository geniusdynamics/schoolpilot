// ABOUTME: The KEMIS learner register plug-in: its manifest, the school settings it reads, and the
// ABOUTME: on-demand export the host calls once it hands plug-ins learner records.

import {
  parseManifest,
  type PluginContext,
  type PluginModule,
  type SdkPluginManifest,
} from '@/plugins/sdk';

import manifestJson from './plugin.json';
import {
  KemisExportError,
  buildRegister,
  type KemisLearner,
  type KemisRegister,
} from './register';

export const manifest: SdkPluginManifest = parseManifest(manifestJson);

/** The options the register needs, as the school's settings state them. */
export interface KemisOptions {
  readonly institutionCode: string;
  readonly includeGuardianContacts: boolean;
  readonly byteOrderMark: boolean;
}

/**
 * Reads the plug-in's options from the school's settings.
 *
 * The institution code has no default: a register without it is not a KEMIS register, so the
 * export stops here rather than writing a file the school would have to correct by hand.
 */
export function kemisOptions(settings: Readonly<Record<string, unknown>>): KemisOptions {
  const configured = settings.institutionCode;
  const institutionCode = typeof configured === 'string' ? configured : '';
  if (!institutionCode.trim()) {
    throw new KemisExportError([
      {
        path: 'settings.institutionCode',
        message: 'set the school institution code before exporting the register',
      },
    ]);
  }
  return {
    institutionCode,
    includeGuardianContacts: settings.guardianContacts !== false,
    byteOrderMark: settings.byteOrderMark !== false,
  };
}

/**
 * The register for a set of learners, at the moment the operator asked for it.
 *
 * The host supplies the learners: it does not hand plug-ins the school's collections yet.
 */
export function exportRegister(
  context: Pick<PluginContext, 'settings'>,
  learners: readonly KemisLearner[],
  now: Date = new Date()
): KemisRegister {
  return buildRegister({
    ...kemisOptions(context.settings),
    learners,
    generatedAt: now.toISOString(),
  });
}

const module: PluginModule = {
  activate() {
    // Nothing to register: the register is produced on demand by exportRegister, and there is no
    // slot, hook or route to claim until the host hands plug-ins learner records and mounts routes.
  },
};

export { KEMIS_COLUMNS, KemisExportError, buildRegister } from './register';
export type {
  GuardianContact,
  KemisColumnKey,
  KemisLearner,
  KemisRegister,
  KemisRegisterInput,
  KemisRow,
  LearnerGender,
  LearnerStatus,
  SkippedLearner,
} from './register';

export default { manifest, module };

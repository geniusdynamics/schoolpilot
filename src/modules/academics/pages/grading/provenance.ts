// ABOUTME: Works out whether a grading scale or assessment scheme came from the programme's
// ABOUTME: installed pack or was created by the school, using the pin and the pack's declarations.

import type { AvailablePack } from '@/components/setup/packs/packLibrary';

/** The grading rows a shipped pack declares, projected from its assembled document. */
export interface PackGradingDeclaration {
  readonly code: string;
  readonly version: string;
  readonly ref: string;
  readonly gradingScaleCodes: readonly string[];
  readonly schemeCodes: readonly string[];
}

/** Where a stored grading row came from. */
export type RowSource =
  | { readonly kind: 'pack'; readonly packRef: string }
  | { readonly kind: 'school' };

/** The programme fields the provenance check needs. */
export interface ProgrammePin {
  readonly curriculum_pack_code: string;
  readonly pack_version: string;
}

interface ScaleIdentity {
  readonly code: string;
  readonly version: string;
}

interface SchemeIdentity {
  readonly version: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function declaredCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const codes: string[] = [];
  for (const entry of value) {
    const code = asRecord(entry)?.code;
    if (typeof code === 'string' && code.trim() !== '') codes.push(code);
  }
  return codes;
}

/** The grading declarations a pack document carries; a malformed section declares nothing. */
export function declarationOfPack(pack: AvailablePack): PackGradingDeclaration {
  const assessment = asRecord(asRecord(pack.document)?.assessment);
  return {
    code: pack.code,
    version: pack.version,
    ref: pack.ref,
    gradingScaleCodes: declaredCodes(assessment?.grading_scales),
    schemeCodes: declaredCodes(assessment?.schemes),
  };
}

/** Every pack's declaration, so a programme's pin resolves to the codes the pack owns. */
export function packDeclarationsOf(
  packs: readonly AvailablePack[]
): readonly PackGradingDeclaration[] {
  return packs.map(declarationOfPack);
}

/** The declaration a programme is pinned to, or null when the library does not ship that ref. */
export function declarationFor(
  programme: ProgrammePin | null,
  declarations: readonly PackGradingDeclaration[]
): PackGradingDeclaration | null {
  if (programme === null) return null;
  return (
    declarations.find(
      (candidate) =>
        candidate.code === programme.curriculum_pack_code &&
        candidate.version === programme.pack_version
    ) ?? null
  );
}

/**
 * Whether a grading scale came from the programme's pack.
 *
 * The pack writes its scales at the pinned pack version and under the codes its assessment
 * document declares. A scale at another version, or under a code the pack does not declare, is
 * the school's own row even when the programme runs a pack.
 */
export function scaleSource(
  scale: ScaleIdentity,
  programme: ProgrammePin | null,
  declaration: PackGradingDeclaration | null
): RowSource {
  if (programme === null) return { kind: 'school' };
  if (scale.version !== programme.pack_version) return { kind: 'school' };
  if (declaration !== null && !declaration.gradingScaleCodes.includes(scale.code)) {
    return { kind: 'school' };
  }
  return { kind: 'pack', packRef: `${programme.curriculum_pack_code}@${programme.pack_version}` };
}

/**
 * The scheme's own code, which the canonical version carries after the pack version.
 *
 * `programmeInstall` stores a scheme as `<pack version>+<scheme code>` because the table keys a
 * scheme on (programme, version) and one pack declares several schemes at the same version.
 */
export function schemeCodeOf(scheme: SchemeIdentity): string {
  const marker = '+';
  const index = scheme.version.lastIndexOf(marker);
  if (index === -1) return scheme.version;
  return scheme.version.slice(index + marker.length);
}

/** Whether an assessment scheme came from the programme's pack. */
export function schemeSource(
  scheme: SchemeIdentity,
  programme: ProgrammePin | null,
  declaration: PackGradingDeclaration | null
): RowSource {
  if (programme === null) return { kind: 'school' };
  const prefix = `${programme.pack_version}+`;
  if (!scheme.version.startsWith(prefix)) return { kind: 'school' };
  const code = scheme.version.slice(prefix.length);
  if (declaration !== null && !declaration.schemeCodes.includes(code)) {
    return { kind: 'school' };
  }
  return { kind: 'pack', packRef: `${programme.curriculum_pack_code}@${programme.pack_version}` };
}

// ABOUTME: The plug-in permission model: every permission a manifest may request, grouped by the risk it
// ABOUTME: carries, plus the semver check between a plug-in's declared SDK range and the running core.

import { satisfies, valid, validRange } from 'semver';

import { SDK_VERSION } from './version';

/** How much a permission can change the school's data or the application around it. */
export type PermissionRisk = 'low' | 'medium' | 'high';

/** The permissions a plug-in manifest may request; the ids match `PluginSecuritySandbox`. */
export type PermissionId =
  | 'data:read'
  | 'data:write'
  | 'ui:inject'
  | 'menu:modify'
  | 'settings:access'
  | 'network:access'
  | 'filesystem:access'
  | 'code:execute';

export interface PermissionDefinition {
  readonly id: PermissionId;
  /** What a plug-in is allowed to do once the permission is granted. */
  readonly description: string;
  readonly risk: PermissionRisk;
}

/**
 * The permission catalogue. A manifest that asks for anything outside this list is refused, so a
 * misspelled permission fails at load time instead of silently granting nothing.
 *
 * Risk is what an administrator sees when granting: `low` permissions only touch the plug-in's own
 * surface, `medium` ones read school data or reach the network, and `high` ones change data, the
 * filesystem or run dynamic code.
 */
export const PERMISSIONS: readonly PermissionDefinition[] = [
  {
    id: 'settings:access',
    description: 'Read and write its own settings for this school.',
    risk: 'low',
  },
  {
    id: 'ui:inject',
    description: 'Render components in the host\'s UI extension slots.',
    risk: 'low',
  },
  {
    id: 'menu:modify',
    description: 'Add or hide navigation entries.',
    risk: 'low',
  },
  {
    id: 'data:read',
    description: 'Read the school collections it declares in its privileges.',
    risk: 'medium',
  },
  {
    id: 'network:access',
    description: 'Make outbound HTTP requests to the hosts the administrator allows.',
    risk: 'medium',
  },
  {
    id: 'data:write',
    description: 'Create and update rows in the school collections it declares in its privileges.',
    risk: 'high',
  },
  {
    id: 'filesystem:access',
    description: 'Read and write files inside its own plug-in directory.',
    risk: 'high',
  },
  {
    id: 'code:execute',
    description: 'Run dynamic code, such as a WebAssembly engine it ships.',
    risk: 'high',
  },
];

/** The permission ids, in catalogue order. */
export const PERMISSION_IDS: readonly PermissionId[] = PERMISSIONS.map((permission) => permission.id);

const RISK_ORDER: Record<PermissionRisk, number> = { low: 0, medium: 1, high: 2 };

/** True when `id` is one of the permissions the SDK defines. */
export function isKnownPermission(id: string): id is PermissionId {
  return PERMISSION_IDS.includes(id as PermissionId);
}

/** The requested permission ids the SDK does not define, in the order they were requested. */
export function unknownPermissions(ids: readonly string[]): string[] {
  return ids.filter((id) => !isKnownPermission(id));
}

/** The catalogue entries that carry `risk`. */
export function permissionsByRisk(risk: PermissionRisk): PermissionDefinition[] {
  return PERMISSIONS.filter((permission) => permission.risk === risk);
}

/**
 * The riskiest permission in the list, or `null` when the list is empty or names only unknown
 * permissions. An administrator granting the set is asked to confirm at this level.
 */
export function highestRisk(ids: readonly string[]): PermissionRisk | null {
  let highest: PermissionRisk | null = null;
  for (const id of ids) {
    if (!isKnownPermission(id)) continue;
    const { risk } = PERMISSIONS.find((permission) => permission.id === id)!;
    if (highest === null || RISK_ORDER[risk] > RISK_ORDER[highest]) {
      highest = risk;
    }
  }
  return highest;
}

/**
 * True when a core running `coreSdkVersion` can load a plug-in that declares `manifest.sdkVersion`.
 *
 * The plug-in states the range it supports (for example `^1.0.0`); the core states its own version.
 * A missing or unparseable range is incompatible — a plug-in that never promised support for a version
 * is not quietly trusted with it. A range that excludes the core version (a higher major, or a core
 * older than the plug-in needs) is incompatible too.
 */
export function isCompatible(
  manifest: { readonly sdkVersion?: string },
  coreSdkVersion: string = SDK_VERSION
): boolean {
  const range = manifest.sdkVersion;
  if (!range || validRange(range) === null) return false;
  if (valid(coreSdkVersion) === null) return false;
  return satisfies(coreSdkVersion, range, { includePrerelease: false });
}

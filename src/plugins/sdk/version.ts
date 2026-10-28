// ABOUTME: The plug-in SDK version this core implements and the range of SDK versions it accepts, in one
// ABOUTME: place so the manifest schema, the compatibility check and the published docs cannot drift apart.

/**
 * The SDK version this core implements.
 *
 * Additive, backward-compatible changes raise the minor version; a change that can break an existing
 * plug-in raises the major version. See `COMPATIBILITY.md` next to this file for what that promises.
 */
export const SDK_VERSION = '1.0.0';

/** The SDK versions this core accepts plug-ins for: every 1.x release, nothing from 2.0 onwards. */
export const SDK_COMPATIBLE_RANGE = '>=1.0.0 <2.0.0';

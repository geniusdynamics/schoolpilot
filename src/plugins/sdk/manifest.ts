// ABOUTME: The runtime schema for a plug-in manifest: every field a plug-in may declare, strict about
// ABOUTME: unknown fields and about permissions, hooks and slots the SDK does not define.

import { valid as validSemver, validRange } from 'semver';
import { z } from 'zod/v4';

import { unknownHooks } from './hooks';
import { unknownPermissions } from './permissions';
import { unknownSlots } from './slots';

/** The plug-in kinds the core knows how to host. */
export const PLUGIN_TYPES = [
  'module',
  'theme',
  'integration',
  'report',
  'widget',
  'whitelabel',
  'engine',
] as const;

/** Where a plug-in comes from, which decides how much it is trusted. */
export const PLUGIN_CATEGORIES = ['builtin', 'verified', 'community', 'private', 'engine'] as const;

const STRICT_SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const PLUGIN_ID = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

const pluginId = z
  .string()
  .min(3)
  .max(120)
  .regex(PLUGIN_ID, 'plug-in id must be lowercase letters, digits, dots, hyphens and underscores');

const version = z
  .string()
  .refine((value) => STRICT_SEMVER.test(value) && validSemver(value) !== null, {
    message: 'must be a semantic version such as 1.0.0',
  });

const sdkRange = z.string().refine((value) => validRange(value) !== null, {
  message: 'must be a semver range such as ^1.0.0',
});

/** A list of names that must all come from the SDK's catalogue, with each unknown name reported. */
function cataloguedNames(unknownOf: (names: readonly string[]) => string[], label: string) {
  return z
    .array(z.string().min(1))
    .default([])
    .superRefine((names, ctx) => {
      for (const name of unknownOf(names)) {
        ctx.addIssue({ code: 'custom', message: `unknown ${label}: "${name}"` });
      }
    });
}

const settingSchema = z.strictObject({
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  type: z.enum(['string', 'number', 'boolean', 'select', 'multiselect', 'json', 'color', 'file']),
  defaultValue: z.unknown().optional(),
  options: z
    .array(z.strictObject({ label: z.string().min(1), value: z.unknown() }))
    .optional(),
  required: z.boolean().optional(),
  description: z.string().max(400).optional(),
  validation: z
    .strictObject({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      custom: z.string().optional(),
    })
    .optional(),
});

const routeSchema = z.strictObject({
  path: z.string().min(1).max(200),
  component: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  icon: z.string().max(120).optional(),
  permissions: cataloguedNames(unknownPermissions, 'permission').optional(),
  parent: z.string().max(200).optional(),
});

const menuItemSchema = z.strictObject({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  icon: z.string().max(120).optional(),
  route: z.string().min(1).max(200),
  order: z.number().optional(),
  parent: z.string().max(64).optional(),
  permissions: cataloguedNames(unknownPermissions, 'permission').optional(),
});

const widgetSchema = z.strictObject({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  description: z.string().max(400).optional(),
  component: z.string().min(1).max(120),
  defaultSize: z.strictObject({ w: z.number().positive(), h: z.number().positive() }),
  minSize: z.strictObject({ w: z.number().positive(), h: z.number().positive() }).optional(),
  maxSize: z.strictObject({ w: z.number().positive(), h: z.number().positive() }).optional(),
  category: z.string().max(60).optional(),
});

const privilegesSchema = z.strictObject({
  dataRead: z.array(z.string()).optional(),
  dataWrite: z.array(z.string()).optional(),
  uiInject: z.boolean().optional(),
  menuModify: z.boolean().optional(),
  settingsAccess: z.boolean().optional(),
  networkAccess: z.boolean().optional(),
  fileSystemAccess: z.boolean().optional(),
  executeCode: z.boolean().optional(),
});

const engineSchema = z.strictObject({
  wasmFile: z.string().min(1).max(200),
  exports: z.array(z.string().min(1)),
  fallbackBehavior: z.enum(['error', 'fallback', 'silent']).optional(),
  memoryLimit: z.number().positive().optional(),
});

const marketplaceSchema = z.strictObject({
  price: z.number().nonnegative().optional(),
  currency: z.string().max(3).optional(),
  featured: z.boolean().optional(),
  downloads: z.number().nonnegative().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().nonnegative().optional(),
});

/** What a backend-provider plug-in (an ERP connector, a hosted API) tells the app about itself. */
const integrationSchema = z.strictObject({
  backendType: z.string().min(1).max(60),
  providerId: z.string().min(1).max(120),
  providerClass: z.string().min(1).max(120),
  entities: z.array(z.string().min(1)),
  entityMappings: z.record(z.string(), z.unknown()).optional(),
  authMethods: z.array(z.string().min(1)),
  capabilities: z
    .strictObject({
      entities: z.array(z.string().min(1)),
      authMethods: z.array(z.string().min(1)),
      fileUpload: z.boolean(),
      realtime: z.boolean(),
      batchOperations: z.boolean(),
      webhooks: z.boolean(),
    })
    .optional(),
});

/**
 * The manifest schema. Strict on purpose: an unknown field is refused, so a typo such as `permisions`
 * is a load-time error rather than a silently ignored capability.
 */
export const manifestSchema = z.strictObject({
  $schema: z.string().max(200).optional(),
  id: pluginId,
  name: z.string().min(1).max(80),
  version,
  sdkVersion: sdkRange,
  type: z.enum(PLUGIN_TYPES),
  entry: z.string().min(1).max(200),
  category: z.enum(PLUGIN_CATEGORIES).optional(),
  description: z.string().max(400).optional(),
  author: z.string().max(120).optional(),
  license: z.string().max(60).optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  icon: z.string().max(200_000).optional(),
  minAppVersion: sdkRange.optional(),
  maxAppVersion: sdkRange.optional(),
  requires: z.array(z.string()).optional(),
  conflicts: z.array(z.string()).optional(),
  permissions: cataloguedNames(unknownPermissions, 'permission'),
  privileges: privilegesSchema.optional(),
  hooks: cataloguedNames(unknownHooks, 'hook'),
  provides: z.array(z.string()).optional(),
  slots: cataloguedNames(unknownSlots, 'slot'),
  routes: z.array(routeSchema).default([]),
  menuItems: z.array(menuItemSchema).default([]),
  widgets: z.array(widgetSchema).default([]),
  settings: z.array(settingSchema).default([]),
  engine: engineSchema.optional(),
  integration: integrationSchema.optional(),
  marketplace: marketplaceSchema.optional(),
});

/** A manifest that passed the schema, with the optional lists filled in. */
export type SdkPluginManifest = z.infer<typeof manifestSchema>;

/** One reason a manifest was refused: where the problem is and what is wrong. */
export interface ManifestIssue {
  readonly path: string;
  readonly message: string;
}

export type ManifestValidation =
  | { readonly success: true; readonly manifest: SdkPluginManifest }
  | { readonly success: false; readonly issues: readonly ManifestIssue[] };

/** Thrown by `parseManifest` for a manifest the schema refuses. */
export class ManifestValidationError extends Error {
  readonly issues: readonly ManifestIssue[];

  constructor(issues: readonly ManifestIssue[]) {
    super(`invalid plug-in manifest: ${issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`);
    this.name = 'ManifestValidationError';
    this.issues = issues;
  }
}

/**
 * Validates a manifest without throwing. Use it where a refused manifest should be reported to the
 * person installing the plug-in; `parseManifest` is the throwing form for code that cannot continue.
 */
export function validateManifest(input: unknown): ManifestValidation {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return {
      success: false,
      issues: [{ path: '(manifest)', message: 'manifest must be a JSON object' }],
    };
  }

  const parsed = manifestSchema.safeParse(input);
  if (parsed.success) {
    return { success: true, manifest: parsed.data };
  }

  return {
    success: false,
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join('.') : '(manifest)',
      message: issue.message,
    })),
  };
}

/** Validates a manifest and returns it, or throws `ManifestValidationError` listing every problem. */
export function parseManifest(input: unknown): SdkPluginManifest {
  const result = validateManifest(input);
  if (!result.success) throw new ManifestValidationError(result.issues);
  return result.manifest;
}

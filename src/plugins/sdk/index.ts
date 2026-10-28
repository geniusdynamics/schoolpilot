// ABOUTME: The public surface of the plug-in SDK: version, manifest schema, permissions, slots, service
// ABOUTME: hooks and the server-route contract. A third-party plug-in imports from here and nowhere else.

export { SDK_VERSION, SDK_COMPATIBLE_RANGE } from './version';

export {
  PERMISSIONS,
  PERMISSION_IDS,
  highestRisk,
  isCompatible,
  isKnownPermission,
  permissionsByRisk,
  unknownPermissions,
} from './permissions';
export type { PermissionDefinition, PermissionId, PermissionRisk } from './permissions';

export {
  SLOT_DEFINITIONS,
  SLOT_NAMES,
  SlotRegistrationError,
  SlotRegistry,
  getSlots,
  isKnownSlot,
  pluginSlots,
  registerSlot,
  unknownSlots,
} from './slots';
export type {
  RegisteredSlotContribution,
  SlotContribution,
  SlotDefinition,
  SlotName,
} from './slots';

export {
  ENGINE_HOOK_NAMES,
  INTEGRATION_HOOK_NAMES,
  KNOWN_HOOK_NAMES,
  SERVICE_HOOK_DEFINITIONS,
  SERVICE_HOOK_NAMES,
  ServiceHookBus,
  UI_HOOK_NAMES,
  UnknownHookError,
  isKnownHook,
  unknownHooks,
} from './hooks';
export type {
  InvoicePostedEvent,
  LearnerAdmittedEvent,
  ReportPublishedEvent,
  ServiceHookDefinition,
  ServiceHookHandler,
  ServiceHookName,
  ServiceHookPayloads,
} from './hooks';

export {
  ManifestValidationError,
  PLUGIN_CATEGORIES,
  PLUGIN_TYPES,
  manifestSchema,
  parseManifest,
  validateManifest,
} from './manifest';
export type { ManifestIssue, ManifestValidation, SdkPluginManifest } from './manifest';

export {
  PLUGIN_ROUTE_NAMESPACE,
  isPluginRouteOwnedBy,
  pluginRoutePath,
} from './serverRoutes';
export type {
  HttpMethod,
  PluginRouteAuth,
  PluginServerHandler,
  PluginServerRequest,
  PluginServerResponse,
  PluginServerRoute,
  RouteScope,
} from './serverRoutes';

export type {
  PluginAPI,
  PluginContext,
  PluginManifest,
  PluginMenuItem,
  PluginModule,
  PluginPrivileges,
  PluginRoute,
  PluginSetting,
  PluginType,
  PluginWidget,
} from '../types';

/**
 * Tab System Services
 * 
 * URL-driven tab management system exports.
 */

export { URLTabSyncEngine, urlTabSyncEngine } from './URLTabSyncEngine';
export { TabStateDeriver, useTabStateDeriver } from './TabStateDeriver';
export { RouteToTabMapper, routeToTabMapper } from './RouteToTabMapper';
export { TabValidationService, tabValidationService } from './TabValidationService';
export type { ValidationResult, RoleAccessConfig, TabCreationOptions } from './TabValidationService';
export type {
  Tab,
  TabMetadata,
  ParsedTabState,
  TabOptions,
  Workflow,
  URLParseResult,
  NavigationOptions,
  TabStateSnapshot,
  TabNavigationMethod
} from './types';

export type {
  NavigationItem,
  RouteMatchResult,
  BuildTabOptions
} from './RouteToTabMapper';

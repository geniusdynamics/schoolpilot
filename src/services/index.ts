/**
 * SchoolPilot3 Services - Public API
 *
 * Centralized exports for all service layers.
 * Import from here for clean dependency management:
 *   import { authService, IAuthService } from '@/services';
 *
 * Or import from specific modules for tree-shaking:
 *   import { authService } from '@/services/auth';
 */

// ============================================================================
// Auth Services
// ============================================================================
export {
  authService,
  AuthService,
  userPermissionsService,
  UserPermissionsService,
} from './auth';
export type {
  IAuthService,
  IUserPermissionsService,
  AuthUser,
  LoginCredentials,
  AuthSession,
  AuthResult,
  ServiceResult,
} from './auth';

// ============================================================================
// UI Services
// ============================================================================
export {
  TabStateManager,
  defaultTabStateConfig,
  actionRegistry,
  ActionRegistry,
  TabAccessibilityManager,
  TabPerformanceManager,
  tabbedModeFeatureFlag,
  pageComponentResolver,
  routePreloader,
} from './ui';
export type {
  ITabStateManager,
  IActionRegistry,
  IAction,
  ITabAccessibilityManager,
  ITabPerformanceManager,
  TabStateConfig,
  NavigationItem,
  TabCreationResult,
} from './ui';

// ============================================================================
// Performance Services
// ============================================================================
export {
  performanceEventManager,
  PerformanceEventManager,
  usePerformanceEvents,
  performanceMonitor,
  PerformanceMonitor,
  memoryManager,
  MemoryManager,
  pageHealthMonitor,
  PageHealthMonitor,
  performanceBenchmark,
  assetOptimizer,
  bundleAnalyzer,
} from './performance';
export type {
  IPerformanceEventManager,
  IPerformanceMonitor,
  IMemoryManager,
  IPageHealthMonitor,
  PerformanceEvent,
  PerformanceEventType,
  PerformanceMetric,
  MemoryStats,
  PageHealthStatus,
} from './performance';

// ============================================================================
// Data Services
// ============================================================================
export {
  UnifiedDataService,
  uds,
  createDataService,
  SyncEngine,
  SQLiteProvider,
  PouchDBProvider,
  createProvider,
  DataContextIntegrationService,
  DataServiceFactory,
  UnifiedCRUDService,
  dataModeManager,
  NetworkStateManager,
} from './data';
export type {
  DataProvider,
  ProviderCapabilities,
  Query,
  Filter,
  SortOption,
  PaginationOptions,
  PaginatedResult,
  WriteOptions,
  Operation,
  SyncResult,
  SyncConflict,
  Change,
  DeploymentMode,
  DataServiceConfig,
  BaseEntity,
  DataEvent,
  DataEventType,
} from './data';

// ============================================================================
// Consistency Services
// ============================================================================
export {
  DataConsistencyService,
  globalDataConsistencyService,
  DataSyncMonitoringService,
  DataStrategyManager,
} from './consistency';
export type {
  IDataConsistencyService,
  IDataSyncMonitoringService,
  IDataStrategyManager,
  DataConsistencyConfig,
  ConsistencyReport,
  DataMigrationResult,
  SyncHealthStatus,
  DataStrategy,
} from './consistency';

// ============================================================================
// Module Services
// ============================================================================
export {
  moduleConfigService,
  ModuleConfigService,
  moduleHealthMonitor,
  ModuleHealthMonitor,
  dynamicModuleLoader,
  enhancedModuleLoader,
  moduleActions,
  ModuleDataRegistry,
  moduleManagementService,
  ModuleManagementService,
} from './module';
export type {
  IModuleConfigService,
  IModuleHealthMonitor,
  IModuleManagementService,
  ModuleConfig,
  ModuleInfo,
  ModuleHealthStatus,
  ModuleDependency,
} from './module';

// ============================================================================
// Database Services
// ============================================================================
export {
  UnifiedDatabaseManager,
  unifiedDatabaseManager,
  getDatabaseManager,
  resetDatabaseManager,
  DatabaseProviderFactory,
  getDatabaseProviderFactory,
  SchemaConverter,
  databaseService,
  rxdbService,
} from './database';
export type {
  IDatabaseProvider,
  ICollection,
  DatabaseConfig,
  CollectionSchema,
  IndexDefinition,
  DeploymentMode as DatabaseDeploymentMode,
  ProviderType,
  DatabaseStatus,
  DatabaseHealth,
  ConversionResult,
  SQLiteTableSchema,
  SQLiteColumn,
} from './database';

// ============================================================================
// Backend Services
// ============================================================================
export {
  BackendClient,
  BackendProvider,
  BackendAPIService,
  BackendServiceAdapter,
  backendDetection,
} from './backend';
export type {
  AuthType,
  AuthCredentials,
  AuthToken,
  BackendType,
  BackendConfig,
  SyncConfig,
  EntitySyncConfig,
  ConflictResolutionStrategy,
  ApiRequest,
  ApiResponse,
  ApiError,
  ResponseMeta,
  SyncOperation,
  ChangeSet,
  SyncResult as BackendSyncResult,
  Conflict,
  FieldConflict,
  SyncError,
  FileUpload,
  FileRecord,
  BackendStatus,
  BackendCapabilities,
  BackendProviderConfig,
} from './backend';

// ============================================================================
// Sync Services
// ============================================================================
export {
  SyncManager,
  ConflictResolver,
  getQueue,
  addToQueue,
  removeFromQueue,
  processQueue,
} from './sync';
export type {
  ISyncManager,
  IConflictResolver,
  SyncManagerConfig,
  SyncStats,
  SyncState,
  ConflictResolution,
} from './sync';

// ============================================================================
// Tabs Services
// ============================================================================
export {
  URLTabSyncEngine,
  urlTabSyncEngine,
  TabStateDeriver,
  useTabStateDeriver,
  RouteToTabMapper,
  routeToTabMapper,
  TabValidationService,
  tabValidationService,
  TabPersistenceService,
} from './tabs';
export type {
  Tab,
  TabMetadata,
  ParsedTabState,
  TabOptions,
  Workflow,
  URLParseResult,
  NavigationOptions,
  TabStateSnapshot,
  TabNavigationMethod,
  ValidationResult,
  RoleAccessConfig,
  TabCreationOptions,
  NavigationItem as TabNavigationItem,
  RouteMatchResult,
  BuildTabOptions,
} from './tabs';

// ============================================================================
// Plugin Services
// ============================================================================
export {
  FeatureEntitlements,
  PluginMarketplace,
} from './plugin';
export type {
  IPluginMarketplace,
  IFeatureEntitlements,
  Plugin,
  PluginManifest,
  PluginInstallOptions,
  PluginVersion,
  PluginReview,
  PluginCategory,
  FeatureEntitlement,
  FeatureConfig,
} from './plugin';

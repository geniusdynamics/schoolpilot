// ============================================================================
// Component Barrel Exports
// ============================================================================
// Centralizes all component exports for easy importing throughout the app.
// Use: import { ComponentName } from '@/components';
//
// Note: Demo components are in __demos__/ and should be imported separately
// ============================================================================

// --- Layout Components ---
export { Layout } from './Layout';
export { LayoutNew } from './LayoutNew';
export { Header } from './Header';
export { PrimarySidebar } from './PrimarySidebar';
export { SecondarySidebar } from './SecondarySidebar';
export { Sidebar } from './Sidebar';
export { PageHeader, PageContainer } from './layout';

// --- Navigation Components ---
export { EnhancedNavigation } from './EnhancedNavigation';
export { BreadcrumbNavigation } from './BreadcrumbNavigation';
export { TopOverflowMenu } from './TopOverflowMenu';

// --- Error Boundaries ---
export {
  ErrorBoundary,
  ApplicationErrorBoundary,
  ModuleErrorBoundary,
  DatabaseErrorBoundary,
  DatabaseInitializationFallback,
  DatabaseToastProvider,
  useDatabaseToast,
  HookErrorBoundary,
  withHookErrorBoundary,
  useErrorHandler,
  PageErrorBoundary,
  NavigationErrorBoundary,
} from './ErrorBoundary';

// --- Tabbed Workspace ---
export {
  TabbedWorkspace,
  TabBar,
  Tab,
  TabContent,
  ActionBar,
  ContextualActionBar,
  SubTabNavigation,
  useTabStore,
  useActionRegistry,
  allModuleActions,
  getActionsByModule,
  registerAllModuleActions,
  academicsActions,
  administrationActions,
  financeActions,
  hrActions,
  inventoryActions,
  libraryActions,
  nutritionActions,
  reportsActions,
  settingsActions,
  type TabType,
  type TabState,
  type TabGroup,
  type TabStore,
  type ActionDefinition,
  type ActionGroup,
  type ActionRegistry,
  type TabComponentProps,
  type TabBarProps,
  type ActionBarProps,
  type TabbedWorkspaceProps,
} from './tabbedWorkspace';

// --- Settings Components ---
export {
  FeatureSettings,
  BackendConfiguration,
  UnifiedModeSwitch,
  ModuleManagementPanel,
  UserPermissionsPanel,
} from './settings';
export { SettingsPopup } from './SettingsPopup';

// --- Onboarding & Auth ---
export { OnboardingGate } from './OnboardingGate';
export { FirstRunOnboarding } from './FirstRunOnboarding';
export { ProtectedRoute } from './ProtectedRoute';
export { UserMenu } from './UserMenu';

// --- Loading & Feedback ---
export { LoadingScreen } from './LoadingScreen';
export { PageLoadingIndicator } from './PageLoadingIndicator';
export { ModuleLoadingFallback } from './ModuleLoadingFallback';
export { ModuleLoadingProgress } from './ModuleLoadingProgress';
export { DismissibleBanner } from './DismissibleBanner';
export { UpdateNotification } from './UpdateNotification';
export { ToastProvider } from './ToastProvider';

// --- Performance & Monitoring ---
export { PerformanceMonitor } from './PerformanceMonitor';
export { PerformanceMonitorWidget } from './PerformanceMonitorWidget';
export { PerformanceDashboard } from './PerformanceDashboard';
export { PerformanceBenchmark } from './PerformanceBenchmark';
export { MemoryDashboard } from './MemoryDashboard';
export { ModuleHealthIndicator } from './ModuleHealthIndicator';
export { ModuleHealthDashboard } from './ModuleHealthDashboard';
export { ModuleLoadingPerformancePanel } from './ModuleLoadingPerformancePanel';

// --- Offline & Sync ---
export { OfflineIndicator } from './OfflineIndicator';
export { OfflineCapability } from './OfflineCapability';
export { SyncManagementPanel } from './SyncManagementPanel';

// --- Database & Data ---
export { DatabaseMonitoringDashboard } from './DatabaseMonitoringDashboard';
export { ConflictResolutionInterface } from './ConflictResolutionInterface';
export { GlobalNotifications } from './GlobalNotifications';
export { MockDataTest } from './MockDataTest';

// --- Module System ---
export { ModuleDashboardPlaceholder } from './ModuleDashboardPlaceholder';
export { ModuleDashboardShell } from './ModuleDashboardShell';
export { DynamicPageComponent } from './DynamicPageComponent';
export { PageComponentLoader } from './PageComponentLoader';

// --- PWA ---
export { PWAInstallButton } from './PWAInstallButton';

// --- Marketplace ---
export { MarketplaceDiscovery } from './MarketplaceDiscovery';

// --- Error Tracking & Debugging ---
export { ErrorTrackingTest } from './ErrorTrackingTest';

// --- Legacy/Deprecated Exports ---
// These exports are kept for backward compatibility but will be removed in a future version
// Please import from '@/components/settings' instead
export { default as FeatureSettingsLegacy } from './FeatureSettings';
export { default as DataModeSwitchLegacy } from './DataModeSwitch';
export { DataModeSwitch } from './DataModeSwitch';

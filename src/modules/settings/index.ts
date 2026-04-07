// ABOUTME: Barrel exports for settings module
// ABOUTME: Centralizes all exports for clean cross-module imports

// Module definition
export { settingsModule } from './moduleDefinition';

// RBAC permissions and roles
export { settingsPermissions, settingsDefaultRoles } from './rbac';

// Data types
export * from './data/types';

// Pages
export * from './pages';

// Components
export * from './components';

// Services
export * from './services';

// Hooks
export * from './hooks';

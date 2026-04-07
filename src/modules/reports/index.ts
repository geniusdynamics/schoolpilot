// ABOUTME: Barrel exports for reports module
// ABOUTME: Centralizes all exports for clean cross-module imports

// Module definition
export { reportsModule } from './moduleDefinition';

// RBAC permissions and roles
export { reportsPermissions, reportsDefaultRoles } from './rbac';

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

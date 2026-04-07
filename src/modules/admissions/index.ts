// ABOUTME: Barrel exports for admissions module
// ABOUTME: Centralizes all exports for clean cross-module imports

// Module definition
export { admissionsModule } from './moduleDefinition';

// RBAC permissions and roles
export { admissionsPermissions, admissionsDefaultRoles } from './rbac';

// Data types and hooks
export * from './data/types';
export * from './data';

// Pages
export * from './pages';

// Components
export * from './components';

// Services
export * from './services';

// Hooks
export * from './hooks';

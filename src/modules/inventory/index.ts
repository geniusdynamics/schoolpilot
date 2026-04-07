// ABOUTME: Barrel exports for inventory module
// ABOUTME: Centralizes all exports for clean cross-module imports

// Module definition
export { inventoryModule } from './moduleDefinition';

// RBAC permissions and roles
export { inventoryPermissions, inventoryDefaultRoles } from './rbac';

// Data types, schemas, and hooks
export * from './data/types';
export * from './data/schema';
export * from './data/collections';
export * from './data/mockData';
export * from './data';

// Pages
export * from './pages';

// Components
export * from './components';

// Services
export * from './services';

// Hooks
export * from './hooks';

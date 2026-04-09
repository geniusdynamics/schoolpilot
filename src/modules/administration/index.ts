// ABOUTME: Barrel exports for administration module
// ABOUTME: Centralizes all exports for clean cross-module imports

// Module definition
export { administrationModule } from './moduleDefinition';

// RBAC permissions and roles
export { administrationPermissions, administrationDefaultRoles } from './rbac';

// Data types, schemas, and hooks
export * from './data/types';
export * from './data/schema';
export * from './data/collections';
export * from './data/mockData';
export * from './data';

// Houses sub-feature data (merged from houses module)
export * from './data/houses/types';
export * from './data/houses/schema';
export * from './data/houses/collections';
export * from './data/houses/mockData';
export { useHousesData } from './data/houses/useHousesData';

// Pickup sub-feature data (merged from pickup module)
export * from './data/pickup/types';
export * from './data/pickup/schema';
export * from './data/pickup/collections';
export * from './data/pickup/mockData';
export { usePickupData } from './data/pickup/usePickupData';

// Pages
export * from './pages';

// Components
export * from './components';

// Services
export * from './services';

// Hooks
export * from './hooks';

// Lifecycle
export * from './lifecycle';

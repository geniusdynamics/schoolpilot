// ABOUTME: Core module barrel exports
// ABOUTME: Centralized exports for all core infrastructure

// Types
export * from './types/module';
export * from './types/moduleDataApi';

// Services
export * from './services/moduleDataApi';

// Data layer
export * from './data/SystemDataContext';
export * from './data/useSystemData';
export * from './data/useSafeSystemContext';

// RBAC
export * from './rbac';
export * from './rbacService';

// Module metadata loader
export * from './ModuleMetadataLoader';

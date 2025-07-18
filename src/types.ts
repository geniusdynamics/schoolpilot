// ABOUTME: Main types export file that consolidates global and cross-module types.
// ABOUTME: Only exports types used by multiple modules, following the type export strategy.

// Core types - these are global types used by 3+ modules
export * from './core/types';

// Module types - exported for cross-module usage
export * from './modules/finance/data/types';
export * from './modules/administration/data/types';
export * from './modules/academics/data/types';
export * from './modules/hr/data/types';
export * from './modules/inventory/data/types';
export * from './modules/library/data/types';
export * from './modules/nutrition/data/types';

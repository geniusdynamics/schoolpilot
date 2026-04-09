// src/core/types/index.ts
// ABOUTME: Barrel re-export of core types only (truly shared infrastructure types)
// ABOUTME: Module-specific types have been moved to their respective modules

// Core shared types - used by 3+ modules
export * from './enums';
export * from './common';
export * from './module';
export * from './app-data';
export * from './moduleCollections'; // Auto-discovery system for module collections

// Module-specific types - MOVED to modules:
// - academic.ts → @/modules/academics/data/types
// - administration.ts → @/modules/administration/data/types
// - finance.ts → @/modules/finance/data/types
// - inventory.ts → @/modules/inventory/data/types
// - library.ts → @/modules/library/data/types

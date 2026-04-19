// ABOUTME: Barrel exports for inventory hooks
// ABOUTME: Module-specific hooks for inventory

// Main modular hook (new architecture) - USE THIS for all Inventory pages
export { useInventory } from './useInventory';

// P3 Service hooks - replacing Akademico database triggers
export { useStockLevelService } from './useStockLevelService';

// Re-export existing hooks from data directory
export * from '../data';

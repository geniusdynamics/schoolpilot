// ABOUTME: Barrel exports for inventory services
// ABOUTME: Business logic services for inventory module - replaces Akademico database triggers

// P3 Service - Stock level tracking
export { StockLevelService } from './StockLevelService';
export type {
  StockLevelUpdateResult,
  StockLevelServiceDependencies,
  StockLevelRecord,
  StockTransactionRecord,
} from './StockLevelService';

// Re-export StockTransactionType from data/types for convenience
export { StockTransactionType } from '../data/types';
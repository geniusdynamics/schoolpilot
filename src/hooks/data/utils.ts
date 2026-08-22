import { logger } from '@/utils/logging';

// ABOUTME: Shared utilities for domain-specific data hooks
// ABOUTME: Provides helper stubs and the databaseService reference for all domain hooks

import { databaseService } from '@/services/database/databaseService';

export { databaseService };

/**
 * Unimplemented async stub â€“ used where a full DB operation is pending
 */
export const unimplementedAsync = async (..._args: any[]): Promise<any> => {
  logger.warn('Database function not implemented yet.');
  await new Promise(resolve => setTimeout(resolve, 50));
  return null;
};

/**
 * Unimplemented sync stub â€“ returns empty array where a getter is pending
 */
export const unimplementedSync = (..._args: any[]): any[] => {
  logger.warn('Database getter not implemented yet.');
  return [];
};

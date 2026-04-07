// ABOUTME: Shared utilities for domain-specific data hooks
// ABOUTME: Provides helper stubs and the databaseService reference for all domain hooks

import { databaseService } from '../../services/database/databaseService';

export { databaseService };

/**
 * Unimplemented async stub – used where a full DB operation is pending
 */
export const unimplementedAsync = async (..._args: any[]): Promise<any> => {
  console.warn('Database function not implemented yet.');
  await new Promise(resolve => setTimeout(resolve, 50));
  return null;
};

/**
 * Unimplemented sync stub – returns empty array where a getter is pending
 */
export const unimplementedSync = (..._args: any[]): any[] => {
  console.warn('Database getter not implemented yet.');
  return [];
};

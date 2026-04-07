// ABOUTME: Stub file for backward compatibility after RXDB removal.
// ABOUTME: Provides minimal exports that databaseService.ts depends on.

/**
 * Collection definitions - was previously the full RxDB schema.
 * Now just an empty object since collections are managed by UnifiedDatabaseManager.
 */
export const collectionsDefinition: Record<string, { schema: any }> = {};

export default {
  collectionsDefinition,
};

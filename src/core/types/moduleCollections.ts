// ABOUTME: Module Collection Configuration Types
// ABOUTME: Enables auto-discovery of collections from modules
// ABOUTME: No more manual editing of core files when adding modules!

/**
 * Collection alias mapping: snake_case DB name -> camelCase AppData key
 * Example: 'chart_of_accounts' -> 'chartOfAccounts'
 */
export type CollectionAliases = Record<string, string>;

/**
 * Module collections configuration
 * Each module exports this to register its collections with the core
 */
export interface ModuleCollectionsConfig {
  /** Module name (e.g., 'finance', 'administration') */
  moduleName: string;
  
  /** 
   * Collection aliases for this module
   * Keys are DB collection names (snake_case)
   * Values are AppData keys (camelCase)
   */
  aliases: CollectionAliases;
  
  /** 
   * Optional: Schema definitions for database
   * Used by UnifiedDatabaseManager
   */
  schemas?: Record<string, any>;
}

/**
 * Registry of all module collections
 * Core aggregates these from all modules
 */
export interface ModuleCollectionsRegistry {
  /** All collection aliases merged from all modules */
  aliases: CollectionAliases;
  
  /** All AppData keys extracted from aliases (camelCase values) */
  appDataKeys: string[];
  
  /** Schemas organized by collection name */
  schemas: Record<string, any>;
  
  /** Module metadata for debugging */
  modules: Array<{ name: string; collectionCount: number }>;
}

/**
 * Plugin-specific types
 *
 * Define your plugin's TypeScript interfaces, enums, and types here.
 * These are exported for use in your plugin and by other plugins.
 */

/**
 * Plugin configuration interface
 */
export interface MyPluginConfig {
  /** Whether the plugin is enabled */
  enabled: boolean;
  /** Custom configuration option */
  customOption?: string;
  /** Numeric configuration value */
  numericValue?: number;
}

/**
 * Plugin data interface
 */
export interface MyPluginData {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Timestamp */
  createdAt: Date;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Plugin event types
 */
export type MyPluginEvent =
  | { type: 'initialized'; timestamp: number }
  | { type: 'dataUpdated'; data: MyPluginData }
  | { type: 'error'; message: string };

/**
 * Plugin API response
 */
export interface MyPluginResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

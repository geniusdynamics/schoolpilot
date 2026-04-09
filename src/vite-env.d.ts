/// <reference types="vite/client" />

/**
 * Type declarations for Vite environment variables
 * These are available via import.meta.env
 */

interface ImportMetaEnv {
  /**
   * Enable useSharedData hook for cross-module data access
   * @default false
   */
  readonly VITE_USE_SHARED_DATA_HOOK: string;
  
  /**
   * Enable module.json metadata system
   * @default false
   */
  readonly VITE_USE_MODULE_METADATA: string;
  
  /**
   * Enable schema auto-registration
   * @default false
   */
  readonly VITE_USE_SCHEMA_AUTO_REGISTRATION: string;
  
  /**
   * Enable module migration system
   * @default false
   */
  readonly VITE_USE_MODULE_MIGRATIONS: string;
  
  /**
   * Enable strict module isolation
   * @default false
   */
  readonly VITE_STRICT_MODULE_ISOLATION: string;
  
  /**
   * Enable deprecation warnings
   * @default true in development
   */
  readonly VITE_ENABLE_DEPRECATION_WARNINGS: string;
  
  /**
   * Error tracking DSN
   */
  readonly VITE_BUGSINK_DSN: string;
  
  /**
   * Application version
   */
  readonly VITE_APP_VERSION: string;
  
  /**
   * Build timestamp
   */
  readonly VITE_BUILD_TIME: string;
  
  /**
   * Git commit hash
   */
  readonly VITE_GIT_COMMIT: string;
  
  /**
   * More environment variables...
   */
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

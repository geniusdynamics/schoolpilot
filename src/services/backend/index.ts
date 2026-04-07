/**
 * Backend API Client Module
 * 
 * Generic HTTP client for connecting SchoolPilot3 to external backend services.
 * 
 * @example
 * ```typescript
 * import { BackendClient, BackendProvider } from '@/services/backend';
 * 
 * // Create client
 * const client = new BackendClient({
 *   baseUrl: 'https://api.example.com',
 *   auth: { type: 'apikey', apiKey: 'secret-key' },
 *   sync: { enabled: true, interval: 300 }
 * });
 * 
 * // Use as DataProvider
 * const provider = new BackendProvider({
 *   backend: config,
 *   localCache: true
 * });
 * 
 * await uds.initialize('backend', provider);
 * ```
 */

// Types
export type {
  AuthType,
  AuthCredentials,
  AuthToken,
  BackendType,
  BackendConfig,
  SyncConfig,
  EntitySyncConfig,
  ConflictResolutionStrategy,
  ApiRequest,
  ApiResponse,
  ApiError,
  ResponseMeta,
  SyncOperation,
  ChangeSet,
  SyncResult,
  Conflict,
  FieldConflict,
  SyncError,
  FileUpload,
  FileRecord,
  BackendStatus,
  BackendCapabilities,
} from './types';

// Client
export { BackendClient } from './BackendClient';

// Provider
export { BackendProvider, type BackendProviderConfig } from './BackendProvider';

// Legacy root-level services
export * from './BackendAPIService';
export * from './BackendServiceAdapter';
export * from './backendDetection';

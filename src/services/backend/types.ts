/**
 * Backend API Client Types
 * 
 * Generic types for connecting SchoolPilot3 to external backend services.
 * Supports REST, GraphQL, and ERPNext APIs.
 */

import type { Query, Record } from '../data/types';

// ============================================================================
// Authentication Types
// ============================================================================

export type AuthType = 'apikey' | 'oauth2' | 'jwt' | 'basic' | 'none';

export interface AuthCredentials {
  type: AuthType;
  // API Key auth
  apiKey?: string;
  apiSecret?: string;
  // OAuth2/JWT
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  // Basic auth
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: Date;
  scope?: string[];
}

// ============================================================================
// Backend Configuration
// ============================================================================

export type BackendType = 'generic-json-api' | 'erpnext' | 'saas-api' | 'graphql' | 'custom';

export interface BackendConfig {
  id: string;
  name: string;
  type: BackendType;
  
  // Connection
  baseUrl: string;
  version?: string;
  timeout?: number;
  
  // Auth
  auth: AuthCredentials;
  
  // Sync settings
  sync: SyncConfig;
  
  // Custom headers
  headers?: Record<string, string>;
  
  // SSL/TLS options
  ssl?: {
    verify: boolean;
    cert?: string;
    key?: string;
  };
}

export interface SyncConfig {
  enabled: boolean;
  interval: number;  // seconds
  conflictResolution: ConflictResolutionStrategy;
  bidirectional: boolean;
  
  // Entity-specific sync settings
  entities?: Record<string, EntitySyncConfig>;
}

export interface EntitySyncConfig {
  enabled: boolean;
  direction: 'to-backend' | 'from-backend' | 'bidirectional';
  interval?: number;
  priority: number;  // Higher = sync first
  batchSize: number;
}

export type ConflictResolutionStrategy = 
  | 'local-wins' 
  | 'remote-wins' 
  | 'timestamp-wins' 
  | 'manual'
  | 'merge';

// ============================================================================
// API Types
// ============================================================================

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  params?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

export interface ResponseMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  hasMore?: boolean;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  recordId: string;
  data?: Record;
  timestamp: Date;
  userId: string;
  retryCount: number;
}

export interface ChangeSet {
  since: Date;
  operations: SyncOperation[];
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: Conflict[];
  errors: SyncError[];
  timestamp: Date;
}

export interface Conflict {
  entity: string;
  recordId: string;
  local: Record;
  remote: Record;
  fieldConflicts: FieldConflict[];
}

export interface FieldConflict {
  field: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: Date;
  remoteTimestamp: Date;
}

export interface SyncError {
  operation: SyncOperation;
  error: ApiError;
  retryable: boolean;
}

// ============================================================================
// File Upload Types
// ============================================================================

export interface FileUpload {
  file: File | Blob;
  name: string;
  type: string;
  size: number;
  metadata?: Record<string, any>;
}

export interface FileRecord {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// Backend Status
// ============================================================================

export interface BackendStatus {
  connected: boolean;
  authenticated: boolean;
  lastSync?: Date;
  pendingChanges: number;
  version?: string;
  latency?: number;  // ms
  error?: ApiError;
}

export interface BackendCapabilities {
  entities: string[];
  authMethods: AuthType[];
  fileUpload: boolean;
  realtime: boolean;
  batchOperations: boolean;
  webhooks: boolean;
}

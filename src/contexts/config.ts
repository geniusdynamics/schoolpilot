// config.ts
export type AppMode = 'demo' | 'production';

// To switch modes:
// 1. For development, you can temporarily change this value.
// 2. For builds, this could be set via environment variables or a build process.
export const APP_MODE: AppMode = 'demo'; // Development default for frontend-only work

export const RXDB_DB_NAME = 'school_management_system_db_v4';
export const RXDB_LEADER_ELECTION_DISABLED = true;
export const RXDB_SETTINGS_COLLECTION_NAME = 'app_settings'; // For storing app-specific settings
export const RXDB_DUMMY_DATA_FLAG_ID = 'config'; // Document ID for the dummy data flag

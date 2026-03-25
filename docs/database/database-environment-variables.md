# Database Environment Variables

This document describes all available environment variables for configuring the database system.

## Provider Configuration

### `REACT_APP_DATABASE_PROVIDER`
- **Description**: Database provider to use
- **Values**: `sqlite-file`, `sqlite-wasm`, `pouchdb`, `rxdb`, `backend-api`, `livestore`, `hybrid`
- **Default**: Auto-detected based on environment
- **Example**: `REACT_APP_DATABASE_PROVIDER=sqlite-wasm`

### `REACT_APP_DATABASE_AUTO_DETECT`
- **Description**: Enable automatic provider detection
- **Values**: `true`, `false`
- **Default**: `true`
- **Example**: `REACT_APP_DATABASE_AUTO_DETECT=false`

### `REACT_APP_DATABASE_URL`
- **Description**: Database connection string
- **Values**: Any valid connection string
- **Default**: None
- **Example**: `REACT_APP_DATABASE_URL=sqlite://./database.db`

### `REACT_APP_DATABASE_NAME`
- **Description**: Database name
- **Values**: Any string
- **Default**: `schoolpilot_{environment}`
- **Example**: `REACT_APP_DATABASE_NAME=my_school_db`

## Performance Configuration

### `REACT_APP_DATABASE_CACHE_SIZE`
- **Description**: Cache size in MB
- **Values**: Number (10-1000)
- **Default**: 50 (development), 100 (production)
- **Example**: `REACT_APP_DATABASE_CACHE_SIZE=200`

### `REACT_APP_DATABASE_QUERY_TIMEOUT`
- **Description**: Query timeout in milliseconds
- **Values**: Number (5000-300000)
- **Default**: `30000`
- **Example**: `REACT_APP_DATABASE_QUERY_TIMEOUT=60000`

### `REACT_APP_DATABASE_BATCH_SIZE`
- **Description**: Batch size for bulk operations
- **Values**: Number (10-10000)
- **Default**: 100 (development), 1000 (production)
- **Example**: `REACT_APP_DATABASE_BATCH_SIZE=500`

### `REACT_APP_DATABASE_ENABLE_CACHING`
- **Description**: Enable query result caching
- **Values**: `true`, `false`
- **Default**: `false` (development), `true` (production)
- **Example**: `REACT_APP_DATABASE_ENABLE_CACHING=true`

### `REACT_APP_DATABASE_ENABLE_INDEXING`
- **Description**: Enable automatic indexing
- **Values**: `true`, `false`
- **Default**: `true`
- **Example**: `REACT_APP_DATABASE_ENABLE_INDEXING=false`

## Storage Configuration

### `REACT_APP_DATABASE_MAX_SIZE`
- **Description**: Maximum database size in MB (0 = unlimited)
- **Values**: Number (0-unlimited)
- **Default**: 500 (development), 0 (production)
- **Example**: `REACT_APP_DATABASE_MAX_SIZE=1000`

### `REACT_APP_DATABASE_COMPRESSION`
- **Description**: Enable data compression
- **Values**: `true`, `false`
- **Default**: `false` (development), `true` (production)
- **Example**: `REACT_APP_DATABASE_COMPRESSION=true`

### `REACT_APP_DATABASE_ENCRYPTION`
- **Description**: Enable data encryption
- **Values**: `true`, `false`
- **Default**: `false`
- **Example**: `REACT_APP_DATABASE_ENCRYPTION=true`

### `REACT_APP_DATABASE_BACKUP`
- **Description**: Enable automatic backups
- **Values**: `true`, `false`
- **Default**: `false` (development), `true` (staging/production)
- **Example**: `REACT_APP_DATABASE_BACKUP=true`

### `REACT_APP_DATABASE_RETENTION_DAYS`
- **Description**: Data retention period in days
- **Values**: Number (1-unlimited)
- **Default**: 30 (development), 365 (production)
- **Example**: `REACT_APP_DATABASE_RETENTION_DAYS=90`

## Sync Configuration

### `REACT_APP_DATABASE_SYNC_ENABLED`
- **Description**: Enable data synchronization
- **Values**: `true`, `false`
- **Default**: Based on provider (true for backend-api, pouchdb)
- **Example**: `REACT_APP_DATABASE_SYNC_ENABLED=true`

### `REACT_APP_DATABASE_SYNC_INTERVAL`
- **Description**: Sync interval in milliseconds
- **Values**: Number (5000-unlimited)
- **Default**: `30000`
- **Example**: `REACT_APP_DATABASE_SYNC_INTERVAL=60000`

### `REACT_APP_DATABASE_SYNC_CONFLICT_RESOLUTION`
- **Description**: Conflict resolution strategy
- **Values**: `local`, `remote`, `manual`, `merge`
- **Default**: `manual`
- **Example**: `REACT_APP_DATABASE_SYNC_CONFLICT_RESOLUTION=merge`

### `REACT_APP_DATABASE_SYNC_RETRY_ATTEMPTS`
- **Description**: Number of sync retry attempts
- **Values**: Number (1-10)
- **Default**: `3`
- **Example**: `REACT_APP_DATABASE_SYNC_RETRY_ATTEMPTS=5`

### `REACT_APP_DATABASE_SYNC_TIMEOUT`
- **Description**: Sync operation timeout in milliseconds
- **Values**: Number (10000-unlimited)
- **Default**: `60000`
- **Example**: `REACT_APP_DATABASE_SYNC_TIMEOUT=120000`

## Monitoring Configuration

### `REACT_APP_DATABASE_HEALTH_CHECKS`
- **Description**: Enable health checks
- **Values**: `true`, `false`
- **Default**: `true`
- **Example**: `REACT_APP_DATABASE_HEALTH_CHECKS=false`

### `REACT_APP_DATABASE_HEALTH_CHECK_INTERVAL`
- **Description**: Health check interval in milliseconds
- **Values**: Number (30000-unlimited)
- **Default**: `300000`
- **Example**: `REACT_APP_DATABASE_HEALTH_CHECK_INTERVAL=600000`

### `REACT_APP_DATABASE_PERFORMANCE_METRICS`
- **Description**: Enable performance metrics collection
- **Values**: `true`, `false`
- **Default**: `false` (development), `true` (production)
- **Example**: `REACT_APP_DATABASE_PERFORMANCE_METRICS=true`

### `REACT_APP_DATABASE_ERROR_REPORTING`
- **Description**: Enable error reporting
- **Values**: `true`, `false`
- **Default**: `false` (development), `true` (staging/production)
- **Example**: `REACT_APP_DATABASE_ERROR_REPORTING=true`

### `REACT_APP_DATABASE_LOG_LEVEL`
- **Description**: Database logging level
- **Values**: `debug`, `info`, `warn`, `error`
- **Default**: `debug` (development), `info` (production)
- **Example**: `REACT_APP_DATABASE_LOG_LEVEL=warn`

## Feature Configuration

### `REACT_APP_DATABASE_FULL_TEXT_SEARCH`
- **Description**: Enable full-text search capabilities
- **Values**: `true`, `false`
- **Default**: Based on provider (false for backend-api)
- **Example**: `REACT_APP_DATABASE_FULL_TEXT_SEARCH=true`

### `REACT_APP_DATABASE_TRANSACTIONS`
- **Description**: Enable transaction support
- **Values**: `true`, `false`
- **Default**: Based on provider (true for SQLite providers)
- **Example**: `REACT_APP_DATABASE_TRANSACTIONS=true`

### `REACT_APP_DATABASE_REAL_TIME_UPDATES`
- **Description**: Enable real-time data updates
- **Values**: `true`, `false`
- **Default**: Based on provider (true for pouchdb, livestore)
- **Example**: `REACT_APP_DATABASE_REAL_TIME_UPDATES=true`

### `REACT_APP_DATABASE_OFFLINE_MODE`
- **Description**: Enable offline mode support
- **Values**: `true`, `false`
- **Default**: Based on provider (false for backend-api)
- **Example**: `REACT_APP_DATABASE_OFFLINE_MODE=true`

### `REACT_APP_DATABASE_DATA_VALIDATION`
- **Description**: Enable data validation
- **Values**: `true`, `false`
- **Default**: `true`
- **Example**: `REACT_APP_DATABASE_DATA_VALIDATION=false`

### `REACT_APP_DATABASE_AUDIT_LOG`
- **Description**: Enable audit logging
- **Values**: `true`, `false`
- **Default**: `false` (development), `true` (production)
- **Example**: `REACT_APP_DATABASE_AUDIT_LOG=true`

## Backend API Configuration

### `REACT_APP_DATABASE_API_BASE_URL`
- **Description**: Backend API base URL
- **Values**: Valid URL
- **Default**: None
- **Example**: `REACT_APP_DATABASE_API_BASE_URL=https://api.example.com`

### `REACT_APP_DATABASE_API_KEY`
- **Description**: API key for authentication
- **Values**: String
- **Default**: None
- **Example**: `REACT_APP_DATABASE_API_KEY=your-api-key-here`

### `REACT_APP_DATABASE_API_AUTH_TOKEN`
- **Description**: Authentication token
- **Values**: String
- **Default**: None
- **Example**: `REACT_APP_DATABASE_API_AUTH_TOKEN=your-token-here`

### `REACT_APP_DATABASE_API_AUTH_TYPE`
- **Description**: Authentication type
- **Values**: `bearer`, `api-key`, `basic`, `custom`
- **Default**: `bearer`
- **Example**: `REACT_APP_DATABASE_API_AUTH_TYPE=api-key`

### `REACT_APP_DATABASE_API_TIMEOUT`
- **Description**: API request timeout in milliseconds
- **Values**: Number (5000-unlimited)
- **Default**: `30000`
- **Example**: `REACT_APP_DATABASE_API_TIMEOUT=60000`

## Example .env File

```bash
# Database Provider Configuration
REACT_APP_DATABASE_PROVIDER=sqlite-wasm
REACT_APP_DATABASE_AUTO_DETECT=true

# Performance Configuration
REACT_APP_DATABASE_CACHE_SIZE=200
REACT_APP_DATABASE_QUERY_TIMEOUT=30000
REACT_APP_DATABASE_BATCH_SIZE=1000
REACT_APP_DATABASE_ENABLE_CACHING=true
REACT_APP_DATABASE_ENABLE_INDEXING=true

# Storage Configuration
REACT_APP_DATABASE_MAX_SIZE=0
REACT_APP_DATABASE_COMPRESSION=true
REACT_APP_DATABASE_ENCRYPTION=false
REACT_APP_DATABASE_BACKUP=true
REACT_APP_DATABASE_RETENTION_DAYS=365

# Sync Configuration
REACT_APP_DATABASE_SYNC_ENABLED=false
REACT_APP_DATABASE_SYNC_INTERVAL=30000
REACT_APP_DATABASE_SYNC_CONFLICT_RESOLUTION=manual

# Monitoring Configuration
REACT_APP_DATABASE_HEALTH_CHECKS=true
REACT_APP_DATABASE_HEALTH_CHECK_INTERVAL=300000
REACT_APP_DATABASE_PERFORMANCE_METRICS=true
REACT_APP_DATABASE_ERROR_REPORTING=true
REACT_APP_DATABASE_LOG_LEVEL=info

# Feature Configuration
REACT_APP_DATABASE_FULL_TEXT_SEARCH=true
REACT_APP_DATABASE_TRANSACTIONS=true
REACT_APP_DATABASE_REAL_TIME_UPDATES=false
REACT_APP_DATABASE_OFFLINE_MODE=true
REACT_APP_DATABASE_DATA_VALIDATION=true
REACT_APP_DATABASE_AUDIT_LOG=true
```

## Configuration Priority

Configuration is applied in the following order (later overrides earlier):

1. **Default values** based on environment detection
2. **Configuration file** (`public/database-config.json`)
3. **Environment variables** (`.env` files and system environment)
4. **URL parameters** (for development/testing)
5. **User settings** (saved in localStorage)

## Configuration File

You can also use a configuration file instead of environment variables:

1. Create `public/database-config.json` in your project
2. Copy the structure from `public/database-config.example.json`
3. Modify the values as needed

The configuration file is loaded asynchronously and will override default settings but can still be overridden by environment variables and user settings.

## Development vs Production

The system automatically detects the environment and applies appropriate defaults:

### Development Environment
- Smaller cache sizes
- Debug logging enabled
- No compression or encryption
- Shorter retention periods
- No automatic backups

### Production Environment
- Larger cache sizes
- Info/warn logging
- Compression and encryption available
- Longer retention periods
- Automatic backups enabled
- Performance metrics enabled

## Validation

All configuration values are validated when loaded:

- **Errors**: Invalid values that prevent the system from working
- **Warnings**: Suboptimal values that may cause performance issues

Use the database settings page to view validation results and fix any issues.
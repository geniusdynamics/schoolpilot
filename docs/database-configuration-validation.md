# Database Configuration Validation

This document describes the comprehensive database configuration validation, repair, and migration system.

## Overview

The database configuration validation system provides:

- **Schema Validation**: Comprehensive validation rules for all configuration options
- **Auto-Fix Capabilities**: Automatic repair of common configuration issues
- **Migration Support**: Automatic migration between configuration versions
- **Error Reporting**: Detailed error messages with suggested fixes
- **Repair Tools**: One-click repair for configuration problems

## Validation Levels

### Error Level
Configuration issues that prevent the system from working properly:

- Invalid provider types
- Out-of-range numeric values
- Invalid URL formats
- Missing required fields

### Warning Level
Configuration issues that may cause performance problems but don't prevent operation:

- Suboptimal cache sizes
- Very frequent sync intervals
- Small storage limits

### Info Level
Informational messages about configuration choices:

- Recommended settings for specific environments
- Feature availability notifications
- Performance optimization suggestions

## Validation Rules

### Provider Validation
```typescript
{
  field: 'provider',
  validator: (value: DatabaseProvider) => validProviders.includes(value),
  message: 'Invalid database provider',
  severity: 'error',
  autoFix: () => 'sqlite-wasm'
}
```

### Performance Validation
- **Cache Size**: 10MB - 10GB (error), recommend ≥50MB (warning)
- **Query Timeout**: 1-300 seconds (error)
- **Batch Size**: 1-10,000 records (error)

### Storage Validation
- **Max Size**: ≥0MB (error), recommend ≥100MB if limited (warning)
- **Retention Days**: 1-3,650 days (error)

### Sync Validation
- **Interval**: ≥5 seconds (error), recommend ≥30 seconds (warning)
- **Retry Attempts**: 1-10 attempts (error)
- **Timeout**: 10-600 seconds (error)

### Monitoring Validation
- **Health Check Interval**: ≥30 seconds (error), recommend ≥60 seconds (warning)
- **Log Level**: Valid log levels only (error)

### API Validation
- **Base URL**: Valid URL format (error)
- **Timeout**: 5-300 seconds (error)

## Auto-Fix Capabilities

The system can automatically fix many common configuration issues:

### Numeric Range Fixes
```typescript
// Cache size too small
cacheSize: 5 → 10 (minimum)

// Query timeout too long
queryTimeout: 600000 → 300000 (maximum)

// Batch size negative
batchSize: -1 → 100 (default)
```

### Invalid Value Fixes
```typescript
// Invalid provider
provider: 'invalid' → 'sqlite-wasm'

// Invalid log level
logLevel: 'verbose' → 'info'

// Invalid conflict resolution
conflictResolution: 'custom' → 'manual'
```

### URL Format Fixes
```typescript
// Invalid API URL
apiBaseUrl: 'not-a-url' → '' (empty, optional)
```

## Configuration Migration

### Migration Versions

#### v1.0.0 → v2.0.0: Enhanced Structure
Migrates from flat configuration to nested structure:

```typescript
// Before (v1.0.0)
{
  provider: 'sqlite-wasm',
  cacheSize: 100,
  enableCaching: true,
  maxSize: 500,
  syncEnabled: false
}

// After (v2.0.0)
{
  provider: 'sqlite-wasm',
  performance: {
    cacheSize: 100,
    enableCaching: true,
    enableIndexing: true,
    queryTimeout: 30000,
    batchSize: 100
  },
  storage: {
    maxSize: 500,
    compressionEnabled: false,
    encryptionEnabled: false,
    backupEnabled: false,
    retentionDays: 30
  },
  sync: {
    enabled: false,
    interval: 30000,
    conflictResolution: 'manual',
    batchSize: 100,
    retryAttempts: 3,
    timeout: 60000
  }
}
```

#### v2.0.0 → v2.1.0: Provider Updates
Updates provider types and API configuration:

```typescript
// Provider migration
provider: 'sqlite' → 'sqlite-wasm'

// API config migration
apiConfig: 'https://api.example.com' → {
  apiBaseUrl: 'https://api.example.com',
  authType: 'bearer',
  timeout: 30000
}
```

### Migration Process

1. **Detect Version**: Determine current configuration version
2. **Find Migrations**: Identify applicable migrations in order
3. **Apply Migrations**: Execute migrations sequentially
4. **Validate Result**: Ensure migrated configuration is valid
5. **Rollback on Error**: Revert if migration fails

## Repair Tools

### Auto-Fix
Automatically fixes all auto-fixable issues:
```typescript
const result = autoFixDatabaseConfig();
// Returns: { success: boolean, changes: string[], remainingIssues: ValidationResult }
```

### Migration
Migrates configuration to latest version:
```typescript
const result = migrateDatabaseConfig('1.0.0');
// Returns: { success: boolean, appliedMigrations: string[], validation: ValidationResult }
```

### Reset to Defaults
Resets configuration to environment-appropriate defaults:
```typescript
const result = resetDatabaseConfigToDefaults();
// Returns: { success: boolean, validation: ValidationResult }
```

### Full Repair
Combines migration and auto-fix:
```typescript
const result = repairDatabaseConfig('1.0.0');
// Returns: { success: boolean, changes: string[], migrations: string[], validation: ValidationResult }
```

## UI Integration

### Configuration Status Display
```typescript
// Status indicator
{configValidation.isValid ? 'Valid' : 'Issues Found'}

// Issue count
{configValidation.errors.length} errors, {configValidation.warnings.length} warnings
```

### Individual Issue Display
```typescript
// Error with auto-fix button
<div className="error">
  <strong>Error ({error.field}):</strong> {error.message}
  <div>Current: {JSON.stringify(error.currentValue)}</div>
  {error.autoFix && (
    <Button onClick={() => applyFix(error)}>Fix</Button>
  )}
</div>
```

### Repair Tool Buttons
```typescript
// Auto-fix button (only shown if fixes available)
{configValidation.canAutoFix && (
  <Button onClick={handleAutoFix}>Auto-Fix Issues</Button>
)}

// Migration button
<Button onClick={handleMigrate}>Migrate Config</Button>

// Full repair button
<Button onClick={handleRepair}>Full Repair</Button>

// Reset button (with confirmation)
<Button onClick={handleResetToDefaults}>Reset to Defaults</Button>
```

## API Reference

### DatabaseConfigValidator Class

#### Methods

##### `validate(config: any): ValidationResult`
Validates configuration against all rules.

##### `autoFix(config: any): { fixed: any; changes: string[] }`
Applies auto-fixes to configuration.

##### `migrate(config: any, currentVersion: string): { migrated: any; appliedMigrations: string[] }`
Migrates configuration to latest version.

##### `resetToDefaults(environment: string): any`
Returns default configuration for environment.

##### `repair(config: any, currentVersion: string): RepairResult`
Combines migration and auto-fix.

### Validation Interfaces

#### ValidationResult
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
  canAutoFix: boolean;
  autoFixAvailable: string[];
}
```

#### ValidationError
```typescript
interface ValidationError {
  field: string;
  message: string;
  currentValue: any;
  expectedValue?: any;
  autoFix?: () => any;
}
```

## Configuration Examples

### Valid Configuration
```json
{
  "provider": "sqlite-wasm",
  "autoDetect": true,
  "performance": {
    "enableIndexing": true,
    "enableCaching": true,
    "cacheSize": 100,
    "queryTimeout": 30000,
    "batchSize": 1000
  },
  "storage": {
    "maxSize": 0,
    "compressionEnabled": true,
    "encryptionEnabled": false,
    "backupEnabled": true,
    "retentionDays": 365
  },
  "sync": {
    "enabled": false,
    "interval": 30000,
    "conflictResolution": "manual",
    "batchSize": 100,
    "retryAttempts": 3,
    "timeout": 60000
  },
  "monitoring": {
    "enableHealthChecks": true,
    "healthCheckInterval": 300000,
    "enablePerformanceMetrics": true,
    "enableErrorReporting": true,
    "logLevel": "info"
  },
  "features": {
    "enableFullTextSearch": true,
    "enableTransactions": true,
    "enableRealTimeUpdates": false,
    "enableOfflineMode": true,
    "enableDataValidation": true,
    "enableAuditLog": true
  }
}
```

### Configuration with Issues
```json
{
  "provider": "invalid-provider",
  "performance": {
    "cacheSize": 5,
    "queryTimeout": 1000000,
    "batchSize": -1
  },
  "storage": {
    "maxSize": 10,
    "retentionDays": 0
  },
  "sync": {
    "interval": 1000,
    "retryAttempts": 0
  },
  "monitoring": {
    "healthCheckInterval": 5000,
    "logLevel": "verbose"
  }
}
```

### Auto-Fixed Configuration
```json
{
  "provider": "sqlite-wasm",
  "performance": {
    "cacheSize": 10,
    "queryTimeout": 300000,
    "batchSize": 100
  },
  "storage": {
    "maxSize": 100,
    "retentionDays": 1
  },
  "sync": {
    "interval": 5000,
    "retryAttempts": 1
  },
  "monitoring": {
    "healthCheckInterval": 30000,
    "logLevel": "info"
  }
}
```

## Best Practices

### Development
1. **Regular Validation**: Validate configuration during development
2. **Test Migrations**: Test configuration migrations with sample data
3. **Environment Testing**: Test configuration in all target environments
4. **Error Handling**: Handle validation errors gracefully

### Production
1. **Pre-deployment Validation**: Validate configuration before deployment
2. **Monitoring**: Monitor configuration validation results
3. **Backup**: Backup configuration before applying repairs
4. **Gradual Rollout**: Test configuration changes in staging first

### Maintenance
1. **Regular Updates**: Keep validation rules up to date
2. **Migration Testing**: Test new migrations thoroughly
3. **Documentation**: Document configuration changes
4. **User Training**: Train users on validation tools

## Troubleshooting

### Common Issues

#### "Invalid database provider"
- **Cause**: Provider not in allowed list for environment
- **Fix**: Use auto-fix or select valid provider
- **Prevention**: Check environment constraints

#### "Cache size too small"
- **Cause**: Cache size below minimum threshold
- **Fix**: Increase cache size or use auto-fix
- **Prevention**: Use recommended values

#### "Sync interval too frequent"
- **Cause**: Sync interval below recommended minimum
- **Fix**: Increase interval or use auto-fix
- **Prevention**: Consider performance impact

### Migration Issues

#### "Migration validation failed"
- **Cause**: Migrated configuration is invalid
- **Fix**: Check migration logic and validation rules
- **Prevention**: Test migrations thoroughly

#### "Configuration version not found"
- **Cause**: Unknown configuration version
- **Fix**: Use repair tool or reset to defaults
- **Prevention**: Maintain version compatibility

### Auto-Fix Limitations

Some issues cannot be auto-fixed:
- Environment-specific constraints
- Complex validation dependencies
- User preference conflicts
- External system requirements

For these issues, manual intervention is required.

## Conclusion

The database configuration validation system provides comprehensive validation, automatic repair, and migration capabilities to ensure robust and reliable database configuration management. Use the validation tools regularly to maintain optimal system performance and prevent configuration-related issues.
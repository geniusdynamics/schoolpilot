# Configuration System

<cite>
**Referenced Files in This Document**   
- [unifiedConfig.ts](file://src/config/unifiedConfig.ts)
- [UnifiedConfigContext.tsx](file://src/contexts/UnifiedConfigContext.tsx)
- [environmentMatrix.ts](file://src/config/environmentMatrix.ts)
- [environmentRuntime.ts](file://src/config/environmentRuntime.ts)
- [dataModePolicies.ts](file://src/config/dataModePolicies.ts)
- [databaseConfigRuntime.ts](file://src/config/databaseConfigRuntime.ts)
- [databaseConfigSchema.ts](file://src/config/databaseConfigSchema.ts)
- [databaseEnvVars.ts](file://src/config/databaseEnvVars.ts)
- [productionDemo.ts](file://src/config/productionDemo.ts)
- [backendArchitecture.ts](file://src/config/backendArchitecture.ts)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive documentation for the new environment runtime detection system
- Documented the enhanced database configuration runtime with environment variable support
- Added documentation for the database configuration schema validation and repair system
- Updated the unified configuration architecture to reflect the new modular approach
- Enhanced the context propagation mechanism documentation with new capabilities
- Added documentation for production demo configuration and management
- Expanded backend architecture documentation with new configuration options

## Table of Contents
1. [Introduction](#introduction)
2. [Core Architecture](#core-architecture)
3. [Unified Configuration Manager](#unified-configuration-manager)
4. [Environment Runtime Detection](#environment-runtime-detection)
5. [Database Configuration Runtime](#database-configuration-runtime)
6. [Database Configuration Schema Validation](#database-configuration-schema-validation)
7. [Environment Matrix System](#environment-matrix-system)
8. [Data Mode Policies](#data-mode-policies)
9. [Production Demo Configuration](#production-demo-configuration)
10. [Context Propagation Mechanism](#context-propagation-mechanism)
11. [Feature Flag Implementation](#feature-flag-implementation)
12. [Backend Architecture Configuration](#backend-architecture-configuration)
13. [Practical Examples](#practical-examples)
14. [Common Issues and Troubleshooting](#common-issues-and-troubleshooting)
15. [Best Practices](#best-practices)

## Introduction

The unified configuration system in schoolpilot3 serves as the single source of truth for application settings across all environments. This comprehensive framework governs feature availability, environment-specific behavior, data mode policies, and database configuration management. The system has been significantly enhanced with modular architecture components that provide runtime environment detection, database configuration management, and production demo capabilities.

The enhanced configuration system addresses several critical requirements:
- Centralized management of application settings with modular architecture
- Runtime environment detection and optimal configuration recommendations
- Database configuration management with environment variable support
- Comprehensive database schema validation and repair capabilities
- Production demo configuration and lifecycle management
- Environment-specific configuration overrides and policies
- Real-time configuration access across components
- Feature flag management for gradual rollouts
- Backend architecture preferences and detection

This document provides a comprehensive overview of the enhanced unified configuration system, detailing its modular architecture, implementation patterns, and usage across different deployment environments.

**Section sources**
- [unifiedConfig.ts](file://src/config/unifiedConfig.ts)
- [UnifiedConfigContext.tsx](file://src/contexts/UnifiedConfigContext.tsx)

## Core Architecture

The unified configuration system follows a modular layered architecture with clear separation of concerns. The system is built around the `UnifiedConfigManager` class, which serves as the central authority for configuration state, integrated with specialized modules for environment detection, database management, and production demo handling.

```mermaid
graph TD
A[UnifiedConfigManager] --> B[Environment Runtime Detection]
A --> C[Database Configuration Runtime]
A --> D[Database Schema Validation]
A --> E[Environment Matrix]
A --> F[Data Mode Policies]
A --> G[Production Demo Management]
A --> H[Backend Architecture]
B --> I[detectOptimalConfigurationRuntime]
C --> J[loadDatabaseConfigFromEnvironment]
C --> K[loadDatabaseConfigFromFile]
D --> L[DatabaseConfigValidator]
E --> M[Environment Detection]
F --> N[Data Mode Switching]
G --> O[Production Demo State]
H --> P[Backend Type Detection]
A --> Q[Configuration Storage]
Q --> R[localStorage]
A --> S[Event System]
S --> T[Configuration Listeners]
```

**Diagram sources**
- [unifiedConfig.ts](file://src/config/unifiedConfig.ts)
- [environmentRuntime.ts](file://src/config/environmentRuntime.ts)
- [databaseConfigRuntime.ts](file://src/config/databaseConfigRuntime.ts)
- [databaseConfigSchema.ts](file://src/config/databaseConfigSchema.ts)
- [environmentMatrix.ts](file://src/config/environmentMatrix.ts)
- [dataModePolicies.ts](file://src/config/dataModePolicies.ts)
- [productionDemo.ts](file://src/config/productionDemo.ts)
- [backendArchitecture.ts](file://src/config/backendArchitecture.ts)

**Section sources**
- [unifiedConfig.ts](file://src/config/unifiedConfig.ts)
- [environmentRuntime.ts](file://src/config/environmentRuntime.ts)
- [databaseConfigRuntime.ts](file://src/config/databaseConfigRuntime.ts)
- [databaseConfigSchema.ts](file://src/config/databaseConfigSchema.ts)

## Unified Configuration Manager

The `UnifiedConfigManager` class is the central component of the enhanced configuration system, implemented as a singleton to ensure a single source of truth throughout the application. This manager handles configuration persistence, updates, validation, and event propagation across all configuration modules.

### Enhanced Configuration Structure

The `UnifiedAppConfig` interface defines the complete configuration structure with enhanced database configuration management and production demo integration:

- **Core Configuration**: Environment, data mode, and enhanced features flag
- **Environment Integration**: Current environment and configuration with runtime detection
- **Enhanced Database Configuration**: Comprehensive database settings with validation
- **Production Demo Integration**: Complete production demo state and management
- **Feature Flags**: Comprehensive feature toggle system with module-specific controls
- **Development Configuration**: Debug settings and log levels
- **Backend Architecture**: Flexible backend integration options

```mermaid
classDiagram
class UnifiedAppConfig {
+environment : Environment
+dataMode : DataMode
+useEnhancedFeatures : boolean
+environmentConfig : EnvironmentConfigIntegration
+database : DatabaseConfig
+productionDemo : ProductionDemoConfigIntegration
+features : FeatureConfig
+development : DevelopmentConfig
+version : string
+lastUpdated : Date
+configVersion : string
}
class DatabaseConfig {
+provider : DatabaseProvider
+allowedProviders : DatabaseProvider[]
+autoDetect : boolean
+connectionString? : string
+options : Record<string, any>
+performance : PerformanceConfig
+storage : StorageConfig
+sync : SyncConfig
+monitoring : MonitoringConfig
+features : FeatureFlags
}
class ProductionDemoConfigIntegration {
+config : ProductionDemoConfig
+state : ProductionDemoState
+transitionAvailable : boolean
}
class EnvironmentConfigIntegration {
+current : Environment
+config : EnvironmentConfig
+detectedAutomatically : boolean
+overrideSource? : 'url' | 'env' | 'manual'
}
UnifiedAppConfig --> DatabaseConfig
UnifiedAppConfig --> ProductionDemoConfigIntegration
UnifiedAppConfig --> EnvironmentConfigIntegration
```

**Diagram sources**
- [unifiedConfig.ts:146-235](file://src/config/unifiedConfig.ts#L146-L235)

**Section sources**
- [unifiedConfig.ts:146-235](file://src/config/unifiedConfig.ts#L146-L235)

### Manager Implementation Enhancements

The `UnifiedConfigManager` class implements several key enhancements:

- **Modular Architecture**: Integrates with specialized modules for different configuration aspects
- **Runtime Detection**: Uses environment runtime detection for optimal feature recommendations
- **Database Management**: Comprehensive database configuration management with validation
- **Production Demo**: Full production demo lifecycle management
- **Configuration Migration**: Handles version upgrades and data migration across modules
- **Deep Merging**: Ensures new feature flags are included when loading stored configurations

The manager's constructor initializes the configuration by first attempting to load from localStorage, then applying defaults, and finally processing URL parameter overrides and environment variable configurations.

```mermaid
flowchart TD
Start([Initialize Config]) --> LoadStorage["Load from localStorage"]
LoadStorage --> HasStored{"Configuration Stored?"}
HasStored --> |Yes| ParseStored["Parse Stored Configuration"]
ParseStored --> CheckVersion["Check Version"]
CheckVersion --> NeedsMigration{"Needs Migration?"}
NeedsMigration --> |Yes| Migrate["Migrate Configuration"]
NeedsMigration --> |No| MergeFeatures["Merge Feature Flags"]
Migrate --> MergeFeatures
MergeFeatures --> ApplyURL["Apply URL Overrides"]
ApplyURL --> LoadEnvConfig["Load Environment Variables"]
LoadEnvConfig --> LoadFileConfig["Load Configuration File"]
LoadFileConfig --> ApplyEnvOverrides["Apply Environment Overrides"]
ApplyEnvOverrides --> ReturnConfig["Return Configuration"]
HasStored --> |No| ApplyDefaults["Apply Default Configuration"]
ApplyDefaults --> LoadEnvConfig
```

**Diagram sources**
- [unifiedConfig.ts:665-761](file://src/config/unifiedConfig.ts#L665-L761)

**Section sources**
- [unifiedConfig.ts:665-761](file://src/config/unifiedConfig.ts#L665-L761)

## Environment Runtime Detection

The environment runtime detection system provides optimal configuration recommendations based on the current runtime environment capabilities and deployment context.

### Runtime Configuration Detection

The `detectOptimalConfigurationRuntime` function analyzes the current runtime environment to determine optimal feature configurations:

- **Service Worker Support**: Determines if service workers are available for offline capabilities
- **IndexedDB Support**: Checks for IndexedDB availability for client-side database operations
- **Network Connectivity**: Assesses online/offline status for real-time features
- **Production Environment**: Identifies production deployment for performance optimizations

```mermaid
classDiagram
class RuntimeOptimalConfiguration {
+useEnhancedFeatures : boolean
+features : RuntimeFeatureConfig
}
class RuntimeFeatureConfig {
+enhancedDataLayer : boolean
+networkStatusIndicator : boolean
+moduleHealthIndicator : boolean
+syncStatusComponent : boolean
+globalNotifications : boolean
+performanceOptimizations : boolean
+advancedErrorBoundaries : boolean
+enableOfflineMode : boolean
+enableRealTimeSync : boolean
+enablePerformanceMonitoring : boolean
+enableAdvancedReporting : boolean
+enableBulkOperations : boolean
+enableDataExport : boolean
+enableNotifications : boolean
+enableAuditLog : boolean
+enableMultiTenant : boolean
+performanceMonitorWidget : boolean
}
RuntimeOptimalConfiguration --> RuntimeFeatureConfig
```

**Diagram sources**
- [environmentRuntime.ts:24-27](file://src/config/environmentRuntime.ts#L24-L27)

**Section sources**
- [environmentRuntime.ts:29-57](file://src/config/environmentRuntime.ts#L29-L57)

### Integration with Unified Configuration

The runtime detection integrates seamlessly with the unified configuration system:

- **Automatic Detection**: Runtime configuration is automatically detected during initialization
- **Environment-Based Defaults**: Provides environment-specific feature recommendations
- **Backward Compatibility**: Maintains compatibility with existing configuration patterns
- **Dynamic Updates**: Allows runtime configuration updates based on changing conditions

**Section sources**
- [unifiedConfig.ts:1644-1646](file://src/config/unifiedConfig.ts#L1644-L1646)

## Database Configuration Runtime

The database configuration runtime system provides comprehensive management of database configuration through environment variables and configuration files.

### Environment Variable Configuration

The `loadDatabaseConfigFromEnvironment` function processes environment variables for database configuration:

- **Provider Selection**: Configures database provider from environment variables
- **Connection String**: Processes database connection strings with validation
- **Performance Settings**: Configures caching, indexing, and query optimization
- **Storage Configuration**: Manages storage limits, compression, and encryption
- **Sync Settings**: Configures synchronization intervals and conflict resolution
- **Monitoring**: Sets up health checks, performance metrics, and error reporting
- **Feature Flags**: Controls database-specific feature availability

```mermaid
flowchart TD
A[Load Environment Variables] --> B{Process Provider}
B --> C[Set Provider]
B --> D{Process Connection String}
D --> E[Set Connection String]
B --> F{Process Performance}
F --> G[Set Cache Size]
F --> H[Set Query Timeout]
F --> I[Set Batch Size]
B --> J{Process Storage}
J --> K[Set Max Size]
J --> L[Set Compression]
J --> M[Set Encryption]
B --> N{Process Sync}
N --> O[Set Interval]
N --> P[Set Conflict Resolution]
N --> Q[Set Retry Attempts]
B --> R{Process Monitoring}
R --> S[Set Health Checks]
R --> T[Set Performance Metrics]
R --> U[Set Error Reporting]
B --> V{Process Features}
V --> W[Set Full Text Search]
V --> X[Set Transactions]
V --> Y[Set Real Time Updates]
```

**Diagram sources**
- [databaseConfigRuntime.ts:77-247](file://src/config/databaseConfigRuntime.ts#L77-L247)

**Section sources**
- [databaseConfigRuntime.ts:77-247](file://src/config/databaseConfigRuntime.ts#L77-L247)

### Configuration File Support

The system supports configuration files for database settings:

- **File Loading**: Asynchronously loads database configuration from `/database-config.json`
- **Fallback Handling**: Graceful handling when configuration file is not present
- **Merge Strategy**: Combines file configuration with environment variable overrides
- **Validation**: Validates loaded configuration against schema requirements

**Section sources**
- [databaseConfigRuntime.ts:250-265](file://src/config/databaseConfigRuntime.ts#L250-L265)

### Environment Variable Registry

The system maintains a comprehensive registry of database-related environment variables:

- **Provider Variables**: `REACT_APP_DATABASE_PROVIDER`, `REACT_APP_DATABASE_AUTO_DETECT`
- **Connection Variables**: `REACT_APP_DATABASE_URL`, `REACT_APP_DATABASE_NAME`
- **Performance Variables**: `REACT_APP_DATABASE_CACHE_SIZE`, `REACT_APP_DATABASE_QUERY_TIMEOUT`
- **Storage Variables**: `REACT_APP_DATABASE_MAX_SIZE`, `REACT_APP_DATABASE_COMPRESSION`
- **Sync Variables**: `REACT_APP_DATABASE_SYNC_INTERVAL`, `REACT_APP_DATABASE_SYNC_RETRY_ATTEMPTS`
- **Monitoring Variables**: `REACT_APP_DATABASE_HEALTH_CHECK_INTERVAL`, `REACT_APP_DATABASE_LOG_LEVEL`
- **Feature Variables**: `REACT_APP_DATABASE_FULL_TEXT_SEARCH`, `REACT_APP_DATABASE_TRANSACTIONS`

**Section sources**
- [databaseEnvVars.ts:4-40](file://src/config/databaseEnvVars.ts#L4-L40)

## Database Configuration Schema Validation

The database configuration schema validation system provides comprehensive validation, auto-fix capabilities, and configuration migration support.

### Validation Rules System

The system implements a comprehensive validation rule system with severity levels:

- **Provider Validation**: Validates database provider against allowed values
- **Performance Validation**: Ensures performance settings are within acceptable ranges
- **Storage Validation**: Validates storage limits and retention policies
- **Sync Validation**: Checks synchronization settings for optimal operation
- **Monitoring Validation**: Validates monitoring configuration and logging levels
- **API Configuration Validation**: Validates external API endpoint configurations

```mermaid
classDiagram
class DatabaseConfigValidator {
+rules : ValidationRule[]
+migrations : ConfigurationMigration[]
+validate(config) ValidationResult
+autoFix(config) {fixed, changes}
+migrate(config, version) {migrated, appliedMigrations}
+repair(config, version) {repaired, changes, migrations}
+resetToDefaults(environment) any
}
class ValidationRule {
+field : string
+validator : Function
+message : string
+severity : 'error' | 'warning' | 'info'
+autoFix? : Function
}
class ValidationResult {
+isValid : boolean
+errors : ValidationError[]
+warnings : ValidationWarning[]
+info : ValidationInfo[]
+canAutoFix : boolean
+autoFixAvailable : string[]
}
DatabaseConfigValidator --> ValidationRule
DatabaseConfigValidator --> ValidationResult
```

**Diagram sources**
- [databaseConfigSchema.ts:304-359](file://src/config/databaseConfigSchema.ts#L304-L359)

**Section sources**
- [databaseConfigSchema.ts:54-200](file://src/config/databaseConfigSchema.ts#L54-L200)

### Migration System

The system provides comprehensive configuration migration support:

- **Version Tracking**: Tracks configuration versions for migration purposes
- **Automated Migration**: Applies migrations automatically when upgrading
- **Validation Integration**: Validates migrated configurations
- **Rollback Support**: Provides rollback capabilities for failed migrations

**Section sources**
- [databaseConfigSchema.ts:202-299](file://src/config/databaseConfigSchema.ts#L202-L299)

### Auto-Fix and Repair Capabilities

The system offers automated configuration repair:

- **Auto-Fix**: Automatically corrects configuration issues based on validation rules
- **Repair Process**: Combines migration and auto-fix for comprehensive repair
- **Change Tracking**: Tracks all changes made during repair process
- **Validation Feedback**: Provides feedback on repair success and remaining issues

**Section sources**
- [databaseConfigSchema.ts:467-491](file://src/config/databaseConfigSchema.ts#L467-L491)

## Environment Matrix System

The environment matrix system defines environment-specific configurations and policies, ensuring appropriate behavior for development, staging, and production environments.

### Enhanced Environment Configuration

The `EnvironmentConfig` interface defines comprehensive environment configurations:

- **Allowed Data Modes**: Specifies which data modes are permitted
- **Default Data Mode**: Sets the default mode for the environment
- **Allowed Database Providers**: Defines permitted database providers
- **Default Database Provider**: Sets the default provider
- **Data Mode Switching**: Controls whether mode switching is allowed
- **Confirmation Requirements**: Specifies if user confirmation is needed
- **Feature Flags**: Environment-specific feature configurations

```mermaid
classDiagram
class EnvironmentConfig {
+name : Environment
+allowedDataModes : DataMode[]
+defaultDataMode : DataMode
+allowedDatabaseProviders : DatabaseProvider[]
+defaultDatabaseProvider : DatabaseProvider
+canSwitchDataModes : boolean
+requiresConfirmation : boolean
+features : FeatureFlags
}
class FeatureFlags {
+enableAdvancedReporting : boolean
+enableBulkOperations : boolean
+enableDataExport : boolean
+enableOfflineMode : boolean
+enableRealTimeSync : boolean
+enablePerformanceMonitoring : boolean
}
EnvironmentConfig --> FeatureFlags
```

**Diagram sources**
- [environmentMatrix.ts:12-28](file://src/config/environmentMatrix.ts#L12-L28)

**Section sources**
- [environmentMatrix.ts:12-28](file://src/config/environmentMatrix.ts#L12-L28)

### Environment Detection Enhancement

The system enhances environment detection with runtime capabilities:

- **Production Detection**: Enhanced detection for production environments
- **Staging Detection**: Improved staging environment identification
- **Development Detection**: Optimized development environment detection
- **Environment Variable Override**: Support for environment variable overrides
- **URL Parameter Override**: Runtime environment override via URL parameters

**Section sources**
- [environmentMatrix.ts:85-112](file://src/config/environmentMatrix.ts#L85-L112)

## Data Mode Policies

The data mode policies system governs data strategy selection, controlling whether the application operates in demo mode or production mode with enhanced validation and switching capabilities.

### Enhanced Data Mode State

The `DataModeState` interface provides comprehensive information about the current data mode:

- **Current Mode**: The active data mode
- **Available Modes**: Modes permitted in the current environment
- **Switching Capability**: Whether mode switching is allowed
- **Confirmation Requirement**: Whether user confirmation is needed
- **Last Switched**: Timestamp of the last mode switch

```mermaid
classDiagram
class DataModeState {
+current : DataMode
+available : DataMode[]
+canSwitch : boolean
+requiresConfirmation : boolean
+lastSwitched? : Date
}
```

**Diagram sources**
- [dataModePolicies.ts:19-25](file://src/config/dataModePolicies.ts#L19-L25)

**Section sources**
- [dataModePolicies.ts:19-25](file://src/config/dataModePolicies.ts#L19-L25)

### Enhanced Switching Logic

The data mode switching process includes comprehensive validation and error handling:

1. Validate the requested mode against environment permissions
2. Check if switching is allowed in the current environment
3. Determine if user confirmation is required
4. Store the new mode in localStorage with timestamp
5. Update configuration state and notify listeners
6. Handle errors gracefully with detailed error messages

```mermaid
sequenceDiagram
participant Client as "Component"
participant Manager as "UnifiedConfigManager"
participant Policies as "DataModePolicies"
Client->>Manager : switchDataMode(targetMode)
Manager->>Policies : validateDataMode(targetMode)
Policies-->>Manager : validation result
alt Validation Failed
Manager-->>Client : detailed error message
else Validation Passed
Manager->>Policies : check confirmation requirement
alt Confirmation Required
Manager-->>Client : show confirmation dialog
Client->>Manager : confirm switch
end
Manager->>Manager : store new mode with timestamp
Manager->>Manager : update config state
Manager->>Manager : notify listeners
Manager-->>Client : success result with reload requirement
end
```

**Diagram sources**
- [dataModePolicies.ts:107-162](file://src/config/dataModePolicies.ts#L107-L162)
- [unifiedConfig.ts:816-843](file://src/config/unifiedConfig.ts#L816-L843)

**Section sources**
- [dataModePolicies.ts:107-162](file://src/config/dataModePolicies.ts#L107-L162)
- [unifiedConfig.ts:816-843](file://src/config/unifiedConfig.ts#L816-L843)

## Production Demo Configuration

The production demo configuration system manages production demo capabilities and provides complete lifecycle management for demo sessions.

### Production Demo State Management

The `ProductionDemoState` interface provides comprehensive state management for production demos:

- **Active Status**: Indicates if demo session is currently active
- **Session Information**: Session ID, start time, and expiry time
- **Transition Capability**: Whether transition to live mode is allowed
- **Data Management**: Data clearing status and user count tracking
- **Configuration Integration**: Seamless integration with unified configuration

```mermaid
classDiagram
class ProductionDemoState {
+active : boolean
+sessionId? : string
+startTime? : Date
+expiryTime? : Date
+canTransitionToLive : boolean
+dataCleared : boolean
+userCount : number
}
class ProductionDemoConfig {
+enabled : boolean
+allowTransitionToLive : boolean
+demoDataRetentionDays : number
+maxDemoSessions : number
+autoCleanup : boolean
+features : DemoFeatures
}
class DemoFeatures {
+limitedDataAccess : boolean
+readOnlyMode : boolean
+timeBasedExpiry : boolean
+userSessionTracking : boolean
}
ProductionDemoConfig --> DemoFeatures
```

**Diagram sources**
- [productionDemo.ts:24-32](file://src/config/productionDemo.ts#L24-L32)
- [productionDemo.ts:9-21](file://src/config/productionDemo.ts#L9-L21)

**Section sources**
- [productionDemo.ts:24-32](file://src/config/productionDemo.ts#L24-L32)
- [productionDemo.ts:9-21](file://src/config/productionDemo.ts#L9-L21)

### Demo Lifecycle Management

The system provides comprehensive demo lifecycle management:

- **Session Initialization**: Creates new demo sessions with unique IDs
- **Session Expiration**: Automatic expiration based on configured duration
- **Transition Management**: Controlled transition from demo to live mode
- **Data Cleanup**: Automated cleanup of demo data and sessions
- **Session Tracking**: User session tracking and management

**Section sources**
- [productionDemo.ts:135-194](file://src/config/productionDemo.ts#L135-L194)
- [productionDemo.ts:197-252](file://src/config/productionDemo.ts#L197-L252)

## Context Propagation Mechanism

The UnifiedConfigContext provides React context integration, enabling real-time configuration access across components with enhanced capabilities for the unified configuration system.

### Enhanced Context Implementation

The `UnifiedConfigProvider` component provides comprehensive configuration management through React context:

- **Configuration State**: Full configuration state with loading and error handling
- **Backend Status Management**: Real-time backend status monitoring and updates
- **Enhanced Data Mode Management**: Complete data mode switching with validation
- **Environment Management**: Dynamic environment switching with validation
- **Database Provider Management**: Comprehensive database provider configuration
- **Production Demo Management**: Full production demo lifecycle management
- **Legacy Compatibility**: Maintains backward compatibility with existing components

```mermaid
classDiagram
class UnifiedConfigContextType {
+config : UnifiedAppConfig
+isLoading : boolean
+error : string | null
+backendStatus : BackendStatus | null
+isBackendChecking : boolean
+updateConfig : Function
+resetConfig : Function
+applyPreset : Function
+checkBackendStatus : Function
+refreshBackendStatus : Function
+switchDataMode : Function
+getDataModeState : Function
+canSwitchToMode : Function
+getAllowedDataModes : Function
+getCurrentEnvironment : Function
+getEnvironmentConfig : Function
+updateEnvironment : Function
+getCurrentDatabaseProvider : Function
+getAllowedDatabaseProviders : Function
+updateDatabaseProvider : Function
+getProductionDemoState : Function
+transitionToLiveMode : Function
+isProductionDemoAvailable : Function
}
class UnifiedConfigProvider {
+children : ReactNode
+autoDetectBackend? : boolean
+backendDetectionInterval? : number
}
UnifiedConfigProvider --> UnifiedConfigContextType
```

**Diagram sources**
- [UnifiedConfigContext.tsx:35-93](file://src/contexts/UnifiedConfigContext.tsx#L35-L93)

**Section sources**
- [UnifiedConfigContext.tsx:35-93](file://src/contexts/UnifiedConfigContext.tsx#L35-L93)

### Enhanced Hook System

The context provides an extensive hook system for different use cases:

- **useUnifiedConfig**: Full context access with enhanced configuration management
- **useConfig**: Configuration state only with enhanced features
- **useBackendStatus**: Backend status with enhanced monitoring capabilities
- **useDataMode**: Data mode management with validation and error handling
- **useEnvironment**: Environment management with runtime detection
- **useDatabaseProvider**: Database provider management with validation
- **useProductionDemo**: Production demo management with lifecycle control
- **useConfigManagement**: Comprehensive configuration access with enhanced capabilities

**Section sources**
- [UnifiedConfigContext.tsx:432-481](file://src/contexts/UnifiedConfigContext.tsx#L432-L481)

## Feature Flag Implementation

The feature flag system enables gradual rollouts and controlled feature activation with enhanced module-specific controls.

### Enhanced Tabbed Mode Configuration

The tabbed mode feature is configured through an enhanced hierarchical system:

- **Global Enable/Disable**: Overall feature toggle with enhanced controls
- **Per-Module Control**: Module-specific overrides with comprehensive coverage
- **Development vs Production**: Different configurations for different environments
- **Feature Flag Management**: Comprehensive feature flag lifecycle management

```mermaid
classDiagram
class TabbedModeConfig {
+globalEnabled : boolean
+enablePerModuleControl : boolean
+enableTabbedMode : boolean
+moduleOverrides : Record<string, boolean>
}
class TabbedModeFeatureFlag {
-config : TabbedModeConfig
+isTabbedModeEnabled(moduleId) : boolean
+isGloballyEnabled() : boolean
+getModuleOverrides() : Record<string, boolean>
+isPerModuleControlEnabled() : boolean
+forceEnable() : void
+forceDisable() : void
+updateConfig(newConfig) : void
+resetConfig() : void
+setModuleOverride(moduleId, enabled) : void
+removeModuleOverride(moduleId) : void
}
TabbedModeFeatureFlag --> TabbedModeConfig
```

**Diagram sources**
- [tabbedModeFeatureFlag.ts:10-50](file://src/services/tabbedModeFeatureFlag.ts#L10-L50)
- [tabbedModeConfig.ts:10-50](file://src/config/tabbedModeConfig.ts#L10-L50)

**Section sources**
- [tabbedModeFeatureFlag.ts:10-50](file://src/services/tabbedModeFeatureFlag.ts#L10-L50)
- [tabbedModeConfig.ts:10-50](file://src/config/tabbedModeConfig.ts#L10-L50)

### Enhanced Evaluation Logic

The feature flag evaluation follows an enhanced priority order:

1. If global flag is disabled, feature is off everywhere
2. If per-module control is disabled, use global setting
3. Check for module-specific override
4. Default to global setting if no override
5. Enhanced validation and error handling

```mermaid
flowchart TD
Start([isTabbedModeEnabled]) --> GlobalEnabled{"globalEnabled?"}
GlobalEnabled --> |No| ReturnFalse["Return false"]
GlobalEnabled --> |Yes| PerModuleControl{"enablePerModuleControl?"}
PerModuleControl --> |No| UseGlobal["Return enableTabbedMode"]
PerModuleControl --> |Yes| HasOverride{"moduleOverrides has moduleId?"}
HasOverride --> |Yes| ReturnOverride["Return moduleOverrides[moduleId]"]
HasOverride --> |No| UseGlobal
```

**Diagram sources**
- [tabbedModeFeatureFlag.ts:50-100](file://src/services/tabbedModeFeatureFlag.ts#L50-L100)

**Section sources**
- [tabbedModeFeatureFlag.ts:50-100](file://src/services/tabbedModeFeatureFlag.ts#L50-L100)

## Backend Architecture Configuration

The backend architecture system supports multiple backend scenarios with intelligent routing and enhanced configuration management.

### Enhanced Backend Types

The system supports four enhanced backend types:

- **Frontend-only**: PouchDB (client) + CouchDB (server) for direct database sync
- **Frappe Education**: ERPNext Education module API integration with comprehensive capabilities
- **Custom API**: Custom backend server with custom APIs and flexible configuration
- **Hybrid**: Mix of direct database access and API calls with intelligent routing

```mermaid
classDiagram
class BackendConfig {
+type : BackendType
+dataSource : DataSource
+syncStrategy : SyncStrategy
+endpoints : Endpoints
+capabilities : BackendCapabilities
+fallbackStrategy : FallbackStrategy
}
class BackendCapabilities {
+crud : CRUDCapabilities
+advanced : AdvancedCapabilities
+integrations : IntegrationCapabilities
}
class FallbackStrategy {
+primary : DataSource
+fallback : DataSource
+autoFallback : boolean
+fallbackTimeout : number
+retryAttempts : number
}
BackendConfig --> BackendCapabilities
BackendConfig --> FallbackStrategy
```

**Diagram sources**
- [backendArchitecture.ts:19-30](file://src/config/backendArchitecture.ts#L19-L30)

**Section sources**
- [backendArchitecture.ts:19-30](file://src/config/backendArchitecture.ts#L19-L30)

### Enhanced Function Routing

The system uses enhanced function routing to determine the appropriate data source:

- **Frontend-only Functions**: Work with PouchDB/CouchDB only with comprehensive coverage
- **API-required Functions**: Require full backend API with advanced capabilities
- **Hybrid Functions**: Can work with both, using intelligent routing with fallback support
- **Backend Availability**: Dynamic backend availability detection and routing decisions

```mermaid
flowchart TD
Start([shouldUseAPI]) --> BackendType{"Backend type?"}
BackendType --> |frontend-only| ReturnFalse["Return false"]
BackendType --> |other| FunctionType{"Function type?"}
FunctionType --> |apiRequired| ReturnTrue["Return true"]
FunctionType --> |frontendOnly| ReturnFalse
FunctionType --> |hybrid| BackendAvailable{"Backend available?"}
BackendAvailable --> |Yes| ReturnTrue
BackendAvailable --> |No| ReturnFalse
```

**Diagram sources**
- [backendArchitecture.ts:362-387](file://src/config/backendArchitecture.ts#L362-L387)

**Section sources**
- [backendArchitecture.ts:362-387](file://src/config/backendArchitecture.ts#L362-L387)

## Practical Examples

### Enhanced Database Configuration Management

Database configuration management now includes comprehensive environment variable support and validation:

```typescript
// Enhanced database configuration with environment variable overrides
const DATABASE_CONFIG = {
  provider: process.env.REACT_APP_DATABASE_PROVIDER || 'sqlite-wasm',
  autoDetect: process.env.REACT_APP_DATABASE_AUTO_DETECT === 'true',
  connectionString: process.env.REACT_APP_DATABASE_URL || '',
  performance: {
    enableIndexing: process.env.REACT_APP_DATABASE_ENABLE_INDEXING === 'true',
    enableCaching: process.env.REACT_APP_DATABASE_ENABLE_CACHING === 'true',
    cacheSize: parseInt(process.env.REACT_APP_DATABASE_CACHE_SIZE || '100'),
    queryTimeout: parseInt(process.env.REACT_APP_DATABASE_QUERY_TIMEOUT || '30000'),
    batchSize: parseInt(process.env.REACT_APP_DATABASE_BATCH_SIZE || '100'),
  },
  storage: {
    maxSize: parseInt(process.env.REACT_APP_DATABASE_MAX_SIZE || '0'),
    compressionEnabled: process.env.REACT_APP_DATABASE_COMPRESSION === 'true',
    encryptionEnabled: process.env.REACT_APP_DATABASE_ENCRYPTION === 'true',
    backupEnabled: process.env.REACT_APP_DATABASE_BACKUP === 'true',
    retentionDays: parseInt(process.env.REACT_APP_DATABASE_RETENTION_DAYS || '30'),
  },
  // ... other configuration sections
};

// Validate and repair database configuration
const validator = databaseConfigValidator;
const validationResult = validator.validate(DATABASE_CONFIG);
if (!validationResult.isValid) {
  const repairResult = validator.repair(DATABASE_CONFIG);
  console.log('Database configuration repaired:', repairResult.changes);
}
```

**Section sources**
- [databaseConfigRuntime.ts:77-247](file://src/config/databaseConfigRuntime.ts#L77-L247)
- [databaseConfigSchema.ts:316-359](file://src/config/databaseConfigSchema.ts#L316-L359)

### Enhanced Production Demo Configuration

Production demo configuration includes comprehensive lifecycle management:

```typescript
// Initialize production demo with enhanced configuration
const initializeDemo = async () => {
  const demoConfig = getProductionDemoConfig('production');
  const demoState = getProductionDemoState();
  
  if (demoConfig.enabled && !demoState.active) {
    const result = await initializeProductionDemo('production', 'demo', {
      sessionDurationHours: 24,
      clearExistingData: true,
    });
    
    if (result.success) {
      console.log('Production demo initialized with session ID:', result.sessionId);
    }
  }
};

// Monitor and manage demo session lifecycle
const monitorDemoSession = () => {
  const state = getProductionDemoState();
  
  if (state.active && isProductionDemoExpired()) {
    console.log('Demo session expired, cleaning up...');
    cleanupExpiredDemoSessions();
  }
};
```

**Section sources**
- [productionDemo.ts:135-194](file://src/config/productionDemo.ts#L135-L194)
- [productionDemo.ts:255-301](file://src/config/productionDemo.ts#L255-L301)

### Enhanced Environment Runtime Detection

Environment runtime detection provides optimal configuration recommendations:

```typescript
// Detect optimal configuration based on runtime environment
const detectOptimalConfig = () => {
  const runtimeConfig = detectOptimalConfigurationRuntime();
  
  return {
    useEnhancedFeatures: runtimeConfig.useEnhancedFeatures,
    features: {
      enhancedDataLayer: runtimeConfig.features.enhancedDataLayer,
      networkStatusIndicator: runtimeConfig.features.networkStatusIndicator,
      moduleHealthIndicator: runtimeConfig.features.moduleHealthIndicator,
      syncStatusComponent: runtimeConfig.features.syncStatusComponent,
      globalNotifications: runtimeConfig.features.globalNotifications,
      performanceOptimizations: runtimeConfig.features.performanceOptimizations,
      advancedErrorBoundaries: runtimeConfig.features.advancedErrorBoundaries,
      enableOfflineMode: runtimeConfig.features.enableOfflineMode,
      enableRealTimeSync: runtimeConfig.features.enableRealTimeSync,
      enablePerformanceMonitoring: runtimeConfig.features.enablePerformanceMonitoring,
      enableAdvancedReporting: runtimeConfig.features.enableAdvancedReporting,
      enableBulkOperations: runtimeConfig.features.enableBulkOperations,
      enableDataExport: runtimeConfig.features.enableDataExport,
      enableNotifications: runtimeConfig.features.enableNotifications,
      enableAuditLog: runtimeConfig.features.enableAuditLog,
      enableMultiTenant: runtimeConfig.features.enableMultiTenant,
      performanceMonitorWidget: runtimeConfig.features.performanceMonitorWidget,
    },
  };
};
```

**Section sources**
- [environmentRuntime.ts:29-57](file://src/config/environmentRuntime.ts#L29-L57)

## Common Issues and Troubleshooting

### Configuration Loading Race Conditions

**Issue**: Configuration not available when components mount
**Solution**: Use enhanced loading state in context and conditional rendering

```typescript
function MyComponent() {
  const { config, isLoading, error } = useUnifiedConfig();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  return <MyContent config={config} />;
}
```

**Section sources**
- [UnifiedConfigContext.tsx](file://src/contexts/UnifiedConfigContext.tsx)

### Environment Variable Resolution Failures

**Issue**: Environment variables not resolving correctly
**Solution**: Provide fallback values and comprehensive validation

```typescript
// Enhanced environment variable resolution with validation
const loadEnvDatabaseConfig = () => {
  const config = {};
  
  // Process all environment variables with validation
  const envVars = [
    { key: DB_ENV_VARS.DATABASE_PROVIDER, parser: (val) => val },
    { key: DB_ENV_VARS.DATABASE_AUTO_DETECT, parser: (val) => val === 'true' },
    { key: DB_ENV_VARS.DATABASE_CACHE_SIZE, parser: (val) => parseInt(val) },
    { key: DB_ENV_VARS.DATABASE_QUERY_TIMEOUT, parser: (val) => parseInt(val) },
    // ... other variables
  ];
  
  envVars.forEach(({ key, parser }) => {
    const value = process.env[key];
    if (value !== undefined) {
      const parsed = parser(value);
      if (parsed !== undefined) {
        config[key] = parsed;
      }
    }
  });
  
  return config;
};
```

**Section sources**
- [databaseConfigRuntime.ts:63-76](file://src/config/databaseConfigRuntime.ts#L63-L76)

### Database Configuration Validation Errors

**Issue**: Database configuration validation failures
**Solution**: Use comprehensive validation and auto-fix capabilities

```typescript
// Enhanced database configuration validation
const validateDatabaseConfig = () => {
  const validator = databaseConfigValidator;
  const config = unifiedConfigManager.getDatabaseConfig();
  
  // Validate configuration
  const validation = validator.validate(config);
  
  if (!validation.isValid) {
    console.log('Database configuration validation errors:', validation.errors);
    
    // Attempt auto-fix
    if (validation.canAutoFix) {
      const fixResult = validator.autoFix(config);
      console.log('Auto-fixed configuration:', fixResult.changes);
      
      // Update configuration
      unifiedConfigManager.updateDatabaseConfig(fixResult.fixed);
    }
  }
  
  return validation;
};
```

**Section sources**
- [databaseConfigSchema.ts:316-359](file://src/config/databaseConfigSchema.ts#L316-L359)
- [unifiedConfig.ts:1285-1344](file://src/config/unifiedConfig.ts#L1285-L1344)

### Feature Flag Synchronization Problems

**Issue**: Feature flags not updating across components
**Solution**: Ensure proper context propagation and event handling

```typescript
// Enhanced feature flag subscription
useEffect(() => {
  const unsubscribe = unifiedConfigManager.subscribe((newConfig) => {
    setConfig(newConfig);
  });

  return () => unsubscribe();
}, []);

// Enhanced feature flag access
const isFeatureEnabled = (featureName) => {
  const config = unifiedConfigManager.getConfig();
  return config.features[featureName] || false;
};
```

**Section sources**
- [UnifiedConfigContext.tsx](file://src/contexts/UnifiedConfigContext.tsx)

## Best Practices

### Extending the Configuration System

When adding new configuration modules:

1. **Define Clear Interfaces**: Create TypeScript interfaces for new configuration sections
2. **Implement Runtime Detection**: Add runtime detection capabilities for optimal configuration
3. **Provide Environment Variable Support**: Support configuration through environment variables
4. **Include Validation**: Implement comprehensive validation and auto-fix capabilities
5. **Handle Migration**: Implement versioning and migration logic for configuration changes
6. **Document Changes**: Update documentation with new configuration options

```typescript
// Example: Adding a new configuration module
interface NewFeatureConfig {
  enableNewFeature: boolean;
  newFeatureSetting: string;
  newFeatureThreshold: number;
}

// Add to UnifiedAppConfig
interface UnifiedAppConfig {
  // ... existing properties
  newFeature: NewFeatureConfig;
}

// Provide runtime detection
export function detectNewFeatureRuntime(): Partial<NewFeatureConfig> {
  return {
    enableNewFeature: typeof window !== 'undefined' && 'serviceWorker' in navigator,
    newFeatureSetting: 'default',
    newFeatureThreshold: 100,
  };
}

// Provide environment variable support
export function loadNewFeatureConfigFromEnvironment(): Partial<NewFeatureConfig> {
  return {
    enableNewFeature: process.env.REACT_APP_ENABLE_NEW_FEATURE === 'true',
    newFeatureSetting: process.env.REACT_APP_NEW_FEATURE_SETTING || 'default',
    newFeatureThreshold: parseInt(process.env.REACT_APP_NEW_FEATURE_THRESHOLD || '100'),
  };
}
```

**Section sources**
- [unifiedConfig.ts](file://src/config/unifiedConfig.ts)
- [environmentRuntime.ts](file://src/config/environmentRuntime.ts)
- [databaseConfigRuntime.ts](file://src/config/databaseConfigRuntime.ts)

### Maintaining Backward Compatibility

To maintain backward compatibility:

1. **Version Configuration**: Implement configuration versioning with migration support
2. **Graceful Migration**: Handle configuration migration gracefully with validation
3. **Deprecation Warnings**: Add warnings for deprecated configuration options
4. **Default Fallbacks**: Ensure new configuration options have sensible defaults
5. **Legacy Support**: Maintain support for legacy configuration formats

```typescript
// Enhanced configuration versioning
const CONFIG_VERSION = '2.0.0';

// Migration logic with comprehensive validation
private loadConfig(): UnifiedAppConfig {
  let config = createDefaultConfig();
  const storedVersion = localStorage.getItem(CONFIG_VERSION_KEY);
  
  if (storedVersion !== CONFIG_VERSION) {
    console.log('Migrating unified configuration from version', storedVersion, 'to', CONFIG_VERSION);
    
    // Apply migrations in order
    const migrations = this.getAvailableMigrations(storedVersion);
    for (const migration of migrations) {
      try {
        config = migration(config);
        console.log(`Applied migration: ${migration.description}`);
      } catch (error) {
        console.error(`Migration failed: ${migration.description}`, error);
        break;
      }
    }
    
    localStorage.setItem(CONFIG_VERSION_KEY, CONFIG_VERSION);
  }
  
  return config;
}
```

**Section sources**
- [unifiedConfig.ts:680-716](file://src/config/unifiedConfig.ts#L680-L716)

### Database Configuration Best Practices

When working with database configuration:

1. **Environment Variable Priority**: Environment variables override configuration files
2. **Validation First**: Always validate configuration before applying
3. **Auto-Fix Integration**: Use auto-fix capabilities for common issues
4. **Migration Support**: Implement comprehensive migration support
5. **Security Considerations**: Handle sensitive configuration data securely
6. **Performance Optimization**: Optimize configuration for different environments

```typescript
// Enhanced database configuration best practices
const configureDatabase = () => {
  // 1. Load configuration from environment variables
  const envConfig = loadDatabaseConfigFromEnvironment();
  
  // 2. Load configuration from file
  const fileConfig = loadDatabaseConfigFromFile();
  
  // 3. Merge configurations with priority: environment > file > defaults
  const mergedConfig = mergeConfigs(envConfig, fileConfig, getDefaultConfig());
  
  // 4. Validate configuration
  const validator = databaseConfigValidator;
  const validation = validator.validate(mergedConfig);
  
  if (!validation.isValid) {
    // 5. Attempt auto-fix
    const fixedConfig = validator.autoFix(mergedConfig);
    return fixedConfig.fixed;
  }
  
  return mergedConfig;
};
```

**Section sources**
- [databaseConfigRuntime.ts:250-265](file://src/config/databaseConfigRuntime.ts#L250-L265)
- [databaseConfigSchema.ts:316-359](file://src/config/databaseConfigSchema.ts#L316-L359)
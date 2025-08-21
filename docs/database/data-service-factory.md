# Data Service Factory

This document describes the Data Service Factory implementation for the SchoolPilot3 project.

## Overview

The Data Service Factory is responsible for creating the appropriate data service based on the current environment and configuration. It abstracts the complexity of provider selection and initialization.

## Architecture

The factory implements a strategy pattern for provider selection:

1. **Environment-based Selection**: Different providers for development, production, and demo environments
2. **Configuration-driven**: Uses `dataLayerConfig.ts` for provider preferences
3. **Requirements-based**: Considers collection requirements when selecting providers

## Implementation Details

### Provider Selection Logic

The factory uses the following logic to select providers:

1. **Development Environment**: 
   - Default: SQLite OPFS for persistent storage
   - Fallback: PouchDB for offline support

2. **Production Environment**:
   - Default: PouchDB for offline support and sync capabilities
   - Alternative: RxDB for advanced reactive requirements

3. **Demo Environment**:
   - Current: Mock data (to be replaced with SQLite)
   - Future: SQLite with seeded data

### Configuration

The factory uses `DATA_LAYER_CONFIG` from `dataLayerConfig.ts` to determine provider preferences:

```typescript
export const DATA_LAYER_CONFIG: DataLayerConfig = {
  development: {
    provider: 'sqlite',
    options: {
      persistence: true,
      cacheSize: 1000
    }
  },
  production: {
    provider: 'pouchdb',
    options: {
      sync: true,
      offlineSupport: true
    }
  }
};
```

## Usage

To use the Data Service Factory:

```typescript
import { DataServiceFactory } from '../services/DataServiceFactory';

// Create data service for development environment
const dataService = await DataServiceFactory.createDataService('development');
```

## Integration Points

The factory integrates with:

1. **Database Provider Factory**: Uses the provider factory to create instances
2. **Configuration System**: Reads provider preferences from config
3. **Error Handling**: Provides consistent error handling for provider creation

## Extensibility

The factory can be extended to support:

1. **New Providers**: Add new provider types to the factory
2. **Custom Selection Logic**: Implement custom provider selection strategies
3. **Advanced Configuration**: Support environment-specific configuration overrides
# Data Migration Process

This document describes the process of migrating mock data to the SQLite database.

## Overview

The data migration process involves:

1. Reading the existing mock data from the application
2. Creating SQLite collections based on the existing schema definitions
3. Inserting the mock data into the SQLite database
4. Verifying the migration was successful

## Migration Script

The migration script (`migrate-mock-data-to-sqlite.ts`) performs the following steps:

1. **Initialize SQLite Provider**: Creates a SQLite provider using the database factory
2. **Create Collections**: Creates collections based on the existing schema definitions
3. **Import Mock Data**: Imports the mock data from `useModularMockData.ts`
4. **Seed Database**: Inserts the mock data into the SQLite collections
5. **Verify Migration**: Confirms the migration was successful

## Schema Conversion

The migration process converts RxDB schemas to SQLite-compatible schemas using the `convertRxDBSchema` function from the `ProviderSelector` module.

## Data Mapping

The mock data is mapped to collections using the following pattern:
- Collection name: `academic_years`
- Mock data key: `initialMockAcademicYears`

## Batch Processing

To avoid memory issues with large datasets, the migration script processes data in batches of 100 records.

## Error Handling

The migration script includes comprehensive error handling:
- Schema validation
- Collection creation errors
- Data insertion errors
- Graceful degradation for failed collections

## Testing

A separate test script (`test-sqlite-implementation.ts`) is provided to verify the SQLite implementation with basic data operations.

## Usage

To run the migration:

```bash
npm run migrate-mock-data
```

To run the test:

```bash
npm run test-sqlite-migration
```

## Next Steps

1. Run the migration script to populate the SQLite database
2. Verify the data was migrated correctly
3. Update the application to use the SQLite database instead of mock data
4. Remove the mock data files once migration is complete
# Universal Data Generation System

A comprehensive mock data generation system for SchoolPilot that supports multiple storage backends and generates realistic educational data across all modules.

## Features

- **Multiple Storage Backends**: SQLite with OPFS, SQLite with Livestore, PouchDB, and in-memory mock storage
- **Comprehensive Data Coverage**: 500+ students, 100+ staff, and extensive data across all modules
- **Relationship Management**: Automatic handling of foreign key relationships and data dependencies
- **Realistic Data**: Uses Faker.js for generating authentic-looking educational data
- **Modular Architecture**: Generate data for specific modules or all modules at once
- **Data Validation**: Built-in validation to ensure referential integrity
- **Performance Optimized**: Batch processing and efficient data generation

## Modules Supported

### 🏫 Administration
- Students (500+) with comprehensive profiles
- Staff (100+) across all departments
- Academic years and class structures
- Dormitories and transport routes
- Partners and communication templates

### 📚 Academic
- Subjects and grading schemes
- Exam sessions and schedules
- Teacher-subject assignments
- Class timetables

### 💰 Finance
- Chart of accounts with voteheads
- Fee templates and structures
- Suppliers with procurement lifecycle
- Student wallet transactions
- Payment vouchers and records

### 🏆 Clubs & Societies
- Diverse club categories
- Patron assignments
- Member enrollments
- Activities and events
- Budget management

### 🏠 Dormitory Management
- Dormitory structures
- Room allocations
- Matron assignments
- Maintenance records

### 📖 Library
- Book catalog with categories
- Loan management system
- Fine tracking
- Member management
- Library events

### 🍽️ Nutrition
- Meal plans and categories
- Student meal assignments
- Menu planning
- Dietary requirements

### 💼 Payroll
- Salary structures
- Allowances and deductions
- Payroll processing
- Tax records

### 📦 Inventory
- Item categories and management
- Stock tracking
- Asset management
- Maintenance records
- Disposal tracking

## Quick Start

### Basic Usage

```typescript
import { generateMockData } from './src/services/dataGeneration';

// Generate data for all modules with mock storage
const result = await generateMockData('mock');

if (result.success) {
  console.log(`Generated ${result.stats.totalRecords} records`);
  console.log(`Tables: ${result.stats.tablesGenerated.join(', ')}`);
} else {
  console.error('Generation failed:', result.errors);
}
```

### Advanced Configuration

```typescript
import { createDataGenerator } from './src/services/dataGeneration';

const config = {
  storageType: 'mock' as const,
  locale: 'en',
  batchSize: 100,
  logProgress: true,
  validateData: true,
  modules: ['administration', 'academic', 'finance']
};

const generator = await createDataGenerator(config);
const result = await generator.generateData();
const isValid = await generator.validateData();

await generator.cleanup();
```

### Working with MockAdapter Directly

```typescript
import { MockAdapter } from './src/services/dataGeneration';

const adapter = new MockAdapter();
await adapter.initialize();

// Create schema
const schema = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`;

await adapter.createSchema('users', schema);

// Insert data
const users = [
  { name: 'John Doe', email: 'john@example.com' },
  { name: 'Jane Smith', email: 'jane@example.com' }
];

await adapter.insertBatch('users', users);

// Query data
const results = await adapter.query('SELECT * FROM users WHERE name LIKE "John%"');

// Get statistics
const stats = adapter.getTableStats('users');
console.log(`Table has ${stats.rowCount} rows`);

await adapter.cleanup();
```

## Architecture

### Core Components

1. **UniversalDataGenerator**: Main orchestrator that coordinates data generation
2. **RelationshipManager**: Manages data dependencies and foreign key relationships
3. **Storage Adapters**: Abstraction layer for different storage backends
4. **Data Generators**: Module-specific generators for realistic data creation

### Storage Adapters

- **MockAdapter**: In-memory storage for testing and development
- **SQLiteOPFSAdapter**: SQLite with Origin Private File System (browser)
- **PouchDBAdapter**: PouchDB for offline-first applications
- **SQLiteLivestoreAdapter**: SQLite with Livestore for real-time sync

### Data Generators

- **BaseGenerator**: Common utilities and faker integration
- **AdministrationGenerator**: Students, staff, and administrative data
- **AcademicGenerator**: Academic structures and schedules
- **FinanceGenerator**: Financial accounts and transactions
- **ClubsGenerator**: Clubs, societies, and activities
- **DormitoryGenerator**: Dormitory management data
- **LibraryGenerator**: Library catalog and operations
- **NutritionGenerator**: Meal planning and nutrition data
- **PayrollGenerator**: Salary and payroll data
- **InventoryGenerator**: Inventory and asset management

## Data Relationships

The system automatically manages complex relationships between entities:

```
Academic Years → Classes → Students
Departments → Staff → Subject Assignments
Suppliers → Procurement → Payment Vouchers
Clubs → Memberships → Activities
Dormitories → Rooms → Student Allocations
```

## Configuration Options

```typescript
interface DataGenerationConfig {
  storageType: 'sqlite-opfs' | 'sqlite-livestore' | 'pouchdb' | 'mock';
  locale?: string;           // Default: 'en'
  batchSize?: number;        // Default: 100
  logProgress?: boolean;     // Default: true
  validateData?: boolean;    // Default: true
  modules?: string[];        // Default: all modules
}
```

## Testing

Run the comprehensive test suite:

```bash
npm test src/services/dataGeneration/__tests__/DataGeneration.test.ts
```

The test suite covers:
- Storage adapter functionality
- Data generation across all modules
- Relationship validation
- Performance benchmarks
- Error handling

## Examples

See the `examples/demo.ts` file for comprehensive usage examples:

```bash
npm run ts-node src/services/dataGeneration/examples/demo.ts
```

## Performance

The system is optimized for performance:
- **Batch Processing**: Configurable batch sizes for optimal memory usage
- **Lazy Loading**: Generators are instantiated only when needed
- **Efficient Queries**: Optimized SQL generation for mock adapter
- **Memory Management**: Proper cleanup and resource management

### Benchmarks

- **500+ Students**: ~2-3 seconds
- **100+ Staff**: ~1 second
- **Complete Dataset**: ~10-15 seconds
- **Memory Usage**: <100MB for full dataset

## Data Validation

The system includes comprehensive validation:

- **Referential Integrity**: All foreign keys point to valid records
- **Data Constraints**: Realistic ranges and formats
- **Uniqueness**: Unique constraints are respected
- **Business Rules**: Educational domain-specific validations

## Extending the System

### Adding a New Generator

1. Create a new generator extending `BaseGenerator`:

```typescript
import { BaseGenerator } from './BaseGenerator';

export class CustomGenerator extends BaseGenerator {
  async generateData(adapter: BaseStorageAdapter): Promise<void> {
    // Implementation
  }
}
```

2. Register in the `UniversalDataGenerator`
3. Add relationships in `RelationshipManager`
4. Update the module list in configuration

### Adding a New Storage Adapter

1. Implement the `BaseStorageAdapter` interface
2. Register in `AdapterFactory`
3. Add configuration options
4. Write tests for the new adapter

## Troubleshooting

### Common Issues

1. **Memory Issues**: Reduce batch size or generate fewer modules
2. **Slow Performance**: Increase batch size or disable progress logging
3. **Validation Errors**: Check relationship definitions and data constraints
4. **Storage Errors**: Ensure proper adapter initialization and cleanup

### Debug Mode

Enable detailed logging:

```typescript
const config = {
  storageType: 'mock',
  logProgress: true,
  validateData: true
};
```

## Contributing

1. Follow the existing code patterns
2. Add comprehensive tests for new features
3. Update documentation
4. Ensure all generators follow the `BaseGenerator` pattern
5. Validate data relationships and constraints

## License

This data generation system is part of the SchoolPilot project.
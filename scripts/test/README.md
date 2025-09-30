# Generator Test Suite

## Overview

This comprehensive test suite validates all data generators in the SchoolPilot system, ensuring data integrity, performance, and cross-module relationships. The suite includes automated testing, performance benchmarking, and detailed reporting capabilities.

## Quick Start

```bash
# Run quick validation tests (recommended for development)
npm run test:generators:quick

# Run comprehensive tests with detailed reporting
npm run test:generators:all

# Run performance benchmarks
npm run test:generators:performance
```

## Available Test Scripts

### Primary Scripts

- **`test:generators:quick`** - Fast validation with reduced data sets (< 30 seconds)
- **`test:generators:all`** - Comprehensive testing with default configuration (2-5 minutes)
- **`test:generators:performance`** - Performance benchmarks with large data sets (5-10 minutes)

### Legacy Scripts (maintained for compatibility)

- **`test:all-generators`** - Basic generator testing
- **`test:all-generators:verbose`** - Verbose output mode
- **`test:all-generators:performance`** - Performance mode
- **`test:all-generators:full`** - Full testing with all exports

## Test Configuration

The test suite uses three predefined configurations:

### Quick Test Configuration
- **Purpose**: Fast development validation
- **Data Size**: Small (50 students, 10 staff, 100 books, etc.)
- **Duration**: ~30 seconds
- **Memory Profiling**: Disabled
- **Use Case**: Pre-commit validation, rapid iteration

### Default Test Configuration
- **Purpose**: Comprehensive validation
- **Data Size**: Medium (500 students, 100 staff, 1000 books, etc.)
- **Duration**: 2-5 minutes
- **Memory Profiling**: Enabled
- **Use Case**: CI/CD pipelines, thorough testing

### Performance Test Configuration
- **Purpose**: Stress testing and benchmarking
- **Data Size**: Large (2000 students, 400 staff, 5000 books, etc.)
- **Duration**: 5-10 minutes
- **Memory Profiling**: Enabled with detailed monitoring
- **Use Case**: Performance regression testing, capacity planning

## Tested Generators

The suite validates the following generators:

1. **AdministrationGenerator**
   - Students, Staff, Parents, Classes, Departments
   - Validates enrollment relationships and organizational structure

2. **LibraryGenerator**
   - Books, Authors, Publishers, Categories, Loans
   - Validates catalog integrity and borrowing relationships

3. **FinancialGenerator**
   - Chart of Accounts, Transactions, Budgets, Suppliers
   - Validates financial data consistency and accounting rules

4. **AcademicsGenerator**
   - Subjects, Grading Schemes, Assessments, Academic Hierarchy
   - Validates curriculum structure and assessment frameworks

5. **ClubsGenerator**
   - Clubs, Members, Activities, Events, Leadership
   - Validates extracurricular organization and participation

## Validation Types

### Data Structure Validation
- Required field presence
- Data type consistency
- Field constraint compliance
- Unique identifier validation

### Relationship Validation
- Foreign key integrity
- Cross-module dependencies
- Referential consistency
- Orphaned record detection

### Performance Validation
- Generation speed benchmarks
- Memory usage monitoring
- Memory leak detection
- Resource utilization tracking

### Business Logic Validation
- Domain-specific constraints
- Calculated field accuracy
- Data distribution patterns
- Realistic data generation

## Command Line Options

The test suite supports various command-line arguments:

```bash
# Configuration selection
--config=quick|default|performance

# Output control
--verbose                    # Detailed logging
--quiet                     # Minimal output
--no-progress              # Disable progress bars

# Export options
--export-json              # Export results to JSON
--export-csv               # Export results to CSV
--export-xml               # Export results to XML
--export-html              # Export results to HTML

# Performance options
--performance              # Enable performance monitoring
--memory-profiling         # Enable memory profiling
--no-validation           # Skip data validation (faster)

# Test selection
--generators=admin,library # Test specific generators only
--skip-relationships      # Skip relationship validation
--skip-constraints        # Skip constraint validation
```

## Output and Reports

### Console Output
- Real-time progress indicators
- Color-coded status messages
- Performance metrics summary
- Error and warning highlights

### Generated Reports
Reports are saved to `scripts/test/reports/` with timestamps:

- **`generator-test-report-YYYYMMDD-HHMMSS.json`** - Detailed test results
- **`generator-test-report-YYYYMMDD-HHMMSS.csv`** - Tabular data for analysis
- **`generator-test-report-YYYYMMDD-HHMMSS.html`** - Human-readable report
- **`performance-metrics-YYYYMMDD-HHMMSS.json`** - Performance benchmarks

### Report Contents
- Test execution summary
- Generator-specific results
- Performance metrics
- Validation errors and warnings
- Memory usage statistics
- Cross-module relationship analysis

## Troubleshooting

### Common Issues

#### Memory Issues
```bash
# Symptoms: Out of memory errors, slow performance
# Solutions:
- Use quick configuration: --config=quick
- Disable memory profiling: --no-memory-profiling
- Reduce data sizes in generator-config.ts
```

#### Validation Failures
```bash
# Symptoms: Data validation errors
# Solutions:
- Check generator implementations for missing fields
- Verify relationship mappings in validation schemas
- Review constraint definitions in generator-config.ts
```

#### Performance Issues
```bash
# Symptoms: Tests taking too long
# Solutions:
- Use quick configuration for development
- Skip validation for speed: --no-validation
- Test specific generators: --generators=admin
```

#### TypeScript Compilation Errors
```bash
# Symptoms: TSX compilation failures
# Solutions:
- Ensure all generators have proper type definitions
- Check for missing imports or dependencies
- Verify generator base class implementations
```

### Debug Mode

Enable detailed debugging:

```bash
# Maximum verbosity
npm run test:generators:all -- --verbose --debug

# Focus on specific generator
npm run test:generators:all -- --generators=library --verbose

# Skip time-consuming validations
npm run test:generators:all -- --no-relationships --no-constraints
```

## Performance Benchmarks

### Expected Performance (on modern hardware)

| Configuration | Duration | Memory Peak | Data Generated |
|---------------|----------|-------------|----------------|
| Quick         | 15-30s   | 50-100MB    | ~1,000 records |
| Default       | 2-5min   | 200-500MB   | ~10,000 records|
| Performance   | 5-10min  | 500MB-1GB   | ~50,000 records|

### Performance Regression Detection

The suite automatically detects performance regressions:
- Generation speed slower than baseline
- Memory usage exceeding thresholds
- Memory leaks between test runs
- Unusual resource consumption patterns

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Generator Tests
  run: |
    npm run test:generators:quick
    npm run test:generators:all -- --export-json

- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: generator-test-reports
    path: scripts/test/reports/
```

### Jenkins Pipeline Example

```groovy
stage('Generator Tests') {
    steps {
        sh 'npm run test:generators:all -- --export-csv'
        publishHTML([
            allowMissing: false,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: 'scripts/test/reports',
            reportFiles: '*.html',
            reportName: 'Generator Test Report'
        ])
    }
}
```

## Configuration Customization

### Custom Test Configuration

Create custom configurations in `generator-config.ts`:

```typescript
export const CUSTOM_CONFIG: GeneratorTestConfig = {
  ...DEFAULT_TEST_CONFIG,
  administration: {
    targetStudentCount: 1000,
    targetStaffCount: 200,
    // ... other overrides
  },
  performance: {
    memoryLeakThreshold: 75,
    maxTestDuration: 180000, // 3 minutes
    enablePerformanceMonitoring: true,
    enableMemoryProfiling: false
  }
};
```

### Environment Variables

Control test behavior via environment variables:

```bash
# Set memory limits
export TEST_MEMORY_LIMIT=1024  # MB

# Set timeout
export TEST_TIMEOUT=300000     # milliseconds

# Enable debug mode
export TEST_DEBUG=true

# Set report directory
export TEST_REPORT_DIR=./custom-reports
```

## Data Validation Schemas

The suite uses comprehensive validation schemas defined in `generator-config.ts`:

- **Field Validation**: Required fields, data types, constraints
- **Relationship Validation**: Foreign keys, referential integrity
- **Business Rule Validation**: Domain-specific constraints
- **Data Quality Validation**: Realistic data patterns

### Adding Custom Validations

```typescript
// Add to VALIDATION_SCHEMAS in generator-config.ts
export const VALIDATION_SCHEMAS = {
  // ... existing schemas
  customTable: {
    tableName: 'customTable',
    requiredFields: ['id', 'name'],
    fieldTypes: { id: 'string', name: 'string' },
    constraints: [
      { field: 'name', type: 'minLength', value: 1 }
    ],
    relationships: []
  }
};
```

## Contributing

### Adding New Generator Tests

1. Add generator configuration to `generator-config.ts`
2. Implement test method in `test-all-generators.ts`
3. Add validation schema if needed
4. Update this README with new generator details

### Improving Performance

1. Profile memory usage with `--memory-profiling`
2. Identify bottlenecks in generation logic
3. Optimize data structures and algorithms
4. Add performance regression tests

### Enhancing Validation

1. Add new constraint types to validation schemas
2. Implement cross-module validation rules
3. Add business logic validation
4. Improve error reporting and diagnostics

## Support

For issues, questions, or contributions:

1. Check this README for common solutions
2. Review existing test reports for patterns
3. Enable debug mode for detailed diagnostics
4. Create issues with reproduction steps and test outputs

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Compatibility**: Node.js 18+, TypeScript 5.0+
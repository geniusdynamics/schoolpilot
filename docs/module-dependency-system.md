# Module Dependency Management System

## Overview

The SchoolPilot system now includes a comprehensive module dependency management system that allows modules to declare their dependencies on other modules, with version constraints and validation.

## Features

1. **Explicit Dependency Declaration**: Modules can declare both required and optional dependencies
2. **Versioned Dependencies**: Dependencies can specify version constraints using semantic versioning
3. **Dependency Validation**: System validates that all required dependencies are available and compatible
4. **Circular Dependency Detection**: System detects and reports circular dependencies between modules
5. **Visualization Tools**: Tools to visualize module dependencies and generate reports

## Module Definition Structure

Modules declare their dependencies using the `dependencies` property in their module definition:

```typescript
export const myModule: ModuleDefinition = {
  id: 'mymodule',
  name: 'My Module',
  version: '1.0.0',
  // ... other properties
  
  dependencies: [
    {
      moduleId: 'administration',
      version: '^1.0.0',
      required: true
    },
    {
      moduleId: 'academics',
      version: '~1.2.0',
      required: false
    }
  ]
};
```

### Dependency Properties

- `moduleId`: The ID of the module this module depends on
- `version`: Semantic version constraint (e.g., "^1.0.0", "~1.2.3", "1.0.0")
- `required`: Whether this dependency is required (true) or optional (false)

## Version Constraints

The system supports standard semantic versioning constraints:

- `^1.0.0`: Compatible with any 1.x.x version (but not 2.0.0)
- `~1.2.0`: Compatible with any 1.2.x version (but not 1.3.0)
- `1.0.0`: Exactly version 1.0.0

## Services

### ModuleDependencyValidator

Validates module dependencies and detects issues:

```typescript
import { ModuleDependencyValidator } from '@/core/services/ModuleDependencyValidator';

// Validate dependencies for a module
const isValid = ModuleDependencyValidator.validateDependencies(module);

// Generate a comprehensive compatibility report
const report = ModuleDependencyValidator.generateCompatibilityReport();

// Detect circular dependencies
const cycles = ModuleDependencyValidator.detectCircularDependencies();
```

### VersionManager

Handles version validation and compatibility checking:

```typescript
import { VersionManager } from '@/core/services/VersionManager';

// Validate version compatibility
const compatible = VersionManager.validateVersion('1.2.3', '^1.0.0');

// Find compatible version from available versions
const compatibleVersion = VersionManager.findCompatibleVersion('^1.0.0', ['1.0.0', '1.1.0', '2.0.0']);
```

### DependencyVisualizer

Generates dependency graph data and reports:

```typescript
import { DependencyVisualizer } from '@/core/services/DependencyVisualizer';

// Generate graph data for visualization
const graphData = DependencyVisualizer.generateGraphData();

// Generate textual report
const report = DependencyVisualizer.generateTextReport();
```

## Integration with Module Registry

The module registry has been enhanced to support dependency validation:

```typescript
import { moduleRegistry } from '@/core/moduleRegistry';

// Validate module dependencies
const isValid = moduleRegistry.validateModuleDependencies('mymodule');

// Check if dependencies are satisfied
const { satisfied, missing } = moduleRegistry.checkDependencies('mymodule');
```

## Dependency Report Page

A new page in the Settings module provides a visual interface for viewing dependency reports:

- Total modules count
- Modules with issues
- Detailed issue reporting
- Dependency graph visualization
- Raw data export

## Best Practices

1. **Declare All Dependencies**: Always declare required dependencies explicitly
2. **Use Version Constraints**: Use appropriate version constraints to ensure compatibility
3. **Avoid Circular Dependencies**: Design modules to avoid circular dependencies
4. **Test Dependency Changes**: Always test when adding or changing dependencies
5. **Document Dependencies**: Clearly document why each dependency is needed

## Future Enhancements

1. **Lazy Dependency Loading**: Load dependencies only when needed
2. **Advanced Visualization**: Interactive dependency graph visualization
3. **Dependency Resolution**: Automatic resolution of dependency conflicts
4. **Performance Monitoring**: Monitor impact of dependencies on module loading
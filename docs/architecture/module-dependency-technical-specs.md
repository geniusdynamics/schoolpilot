# SchoolPilot Module Dependency Management
## Detailed Technical Specifications

## 1. Enhanced Module Definition Structure

```typescript
// src/core/types/module.ts
export interface ModuleDependency {
  moduleId: string;
  version: string; // Semver range (e.g., "^1.2.0", "~1.2.3")
  required: boolean;
  optional?: boolean;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description?: string;
  icon: React.ComponentType<any>;
  path: string;
  isActive: boolean;
  version: string;
  
  // NEW: Explicit dependency declaration
  dependencies: ModuleDependency[];
  optionalDependencies?: ModuleDependency[];
  
  // Existing properties
  features?: string[];
  navigation: NavItem[];
  routes?: Array<{ path: string; page: string }>;
  settings?: {
    category: string;
    items: Array<{
      key: string;
      type: 'boolean' | 'string' | 'number' | 'select';
      defaultValue: any;
      options?: Array<{ value: any; label: string }>;
    }>;
  };
  
  // NEW: Lifecycle hooks
  initialize?: () => Promise<void>;
  destroy?: () => Promise<void>;
  onDependencyLoaded?: (depId: string, dep: any) => void;
}
```

## 2. Module Dependency Validator Service

```typescript
// src/core/services/ModuleDependencyValidator.ts
import semver from 'semver';
import { ModuleDefinition, ModuleDependency } from '../types';
import { moduleRegistry } from '../moduleRegistry';

class ModuleDependencyValidator {
  /**
   * Validate that all required dependencies are available
   */
  static validateDependencies(module: ModuleDefinition): boolean {
    console.log(`🔧 [ModuleDependencyValidator] Validating dependencies for: ${module.id}`);
    
    const enabledModules = moduleRegistry.getEnabledModules();
    const errors: string[] = [];
    
    // Check required dependencies
    for (const dep of module.dependencies.filter(d => d.required)) {
      const depModule = enabledModules.find(m => m.id === dep.moduleId);
      
      if (!depModule) {
        errors.push(`Required dependency '${dep.moduleId}' not found`);
        continue;
      }
      
      // Validate version compatibility
      if (!semver.satisfies(depModule.version, dep.version)) {
        errors.push(
          `Version mismatch for '${dep.moduleId}': ` +
          `required ${dep.version}, found ${depModule.version}`
        );
      }
    }
    
    if (errors.length > 0) {
      console.error(`❌ [ModuleDependencyValidator] Dependency validation failed for ${module.id}:`, errors);
      return false;
    }
    
    console.log(`✅ [ModuleDependencyValidator] All dependencies satisfied for: ${module.id}`);
    return true;
  }

  /**
   * Detect circular dependencies in the module graph
   */
  static detectCircularDependencies(): string[][] {
    const modules = moduleRegistry.getAllModules();
    const graph = new Map<string, string[]>();
    const cycles: string[][] = [];
    
    // Build dependency graph
    for (const module of modules) {
      const deps = module.dependencies.map(d => d.moduleId);
      graph.set(module.id, deps);
    }
    
    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];
    
    const detectCycle = (moduleId: string): boolean => {
      if (recursionStack.has(moduleId)) {
        // Found a cycle
        const cycleStart = path.indexOf(moduleId);
        if (cycleStart !== -1) {
          const cycle = [...path.slice(cycleStart), moduleId];
          cycles.push(cycle);
        }
        return true;
      }
      
      if (visited.has(moduleId)) {
        return false;
      }
      
      visited.add(moduleId);
      recursionStack.add(moduleId);
      path.push(moduleId);
      
      const dependencies = graph.get(moduleId) || [];
      for (const dep of dependencies) {
        if (detectCycle(dep)) {
          return true;
        }
      }
      
      recursionStack.delete(moduleId);
      path.pop();
      return false;
    };
    
    for (const module of modules) {
      if (!visited.has(module.id)) {
        detectCycle(module.id);
      }
    }
    
    return cycles;
  }

  /**
   * Generate dependency compatibility report
   */
  static generateCompatibilityReport(): {
    totalModules: number;
    modulesWithIssues: number;
    issues: Array<{
      moduleId: string;
      type: 'missing' | 'version' | 'circular';
      details: string;
    }>;
  } {
    const modules = moduleRegistry.getAllModules();
    const issues: Array<{
      moduleId: string;
      type: 'missing' | 'version' | 'circular';
      details: string;
    }> = [];
    
    // Check each module's dependencies
    for (const module of modules) {
      const enabledModules = moduleRegistry.getEnabledModules();
      
      for (const dep of module.dependencies) {
        const depModule = enabledModules.find(m => m.id === dep.moduleId);
        
        if (!depModule && dep.required) {
          issues.push({
            moduleId: module.id,
            type: 'missing',
            details: `Required dependency '${dep.moduleId}' not found`
          });
        } else if (depModule && !semver.satisfies(depModule.version, dep.version)) {
          issues.push({
            moduleId: module.id,
            type: 'version',
            details: `Version mismatch for '${dep.moduleId}': required ${dep.version}, found ${depModule.version}`
          });
        }
      }
    }
    
    // Check for circular dependencies
    const cycles = this.detectCircularDependencies();
    for (const cycle of cycles) {
      issues.push({
        moduleId: cycle[0],
        type: 'circular',
        details: `Circular dependency detected: ${cycle.join(' -> ')}`
      });
    }
    
    return {
      totalModules: modules.length,
      modulesWithIssues: new Set(issues.map(i => i.moduleId)).size,
      issues
    };
  }
}

export { ModuleDependencyValidator };
```

## 3. Version Manager Service

```typescript
// src/core/services/VersionManager.ts
import semver from 'semver';

class VersionManager {
  /**
   * Validate that a module version satisfies a version constraint
   */
  static validateVersion(moduleVersion: string, constraint: string): boolean {
    try {
      return semver.satisfies(moduleVersion, constraint);
    } catch (error) {
      console.error(`❌ [VersionManager] Invalid version constraint: ${constraint}`, error);
      return false;
    }
  }

  /**
   * Find the best compatible version from available versions
   */
  static findCompatibleVersion(constraint: string, availableVersions: string[]): string | null {
    const compatible = availableVersions
      .filter(version => this.validateVersion(version, constraint))
      .sort((a, b) => semver.rcompare(a, b)); // Sort by version descending
    
    return compatible.length > 0 ? compatible[0] : null;
  }

  /**
   * Get version compatibility information
   */
  static getVersionCompatibility(
    constraint: string, 
    currentVersion: string
  ): { 
    compatible: boolean; 
    message: string;
    recommended?: string;
  } {
    const compatible = this.validateVersion(currentVersion, constraint);
    
    if (compatible) {
      return {
        compatible: true,
        message: `Version ${currentVersion} satisfies constraint ${constraint}`
      };
    }
    
    return {
      compatible: false,
      message: `Version ${currentVersion} does not satisfy constraint ${constraint}`
    };
  }

  /**
   * Parse version constraint to get min/max versions
   */
  static parseConstraint(constraint: string): { 
    min?: string; 
    max?: string; 
    exact?: string;
  } {
    try {
      // Handle exact version
      if (!constraint.startsWith('^') && !constraint.startsWith('~')) {
        return { exact: constraint };
      }
      
      // Handle caret (^) - allows changes that do not modify the left-most non-zero digit
      if (constraint.startsWith('^')) {
        const version = constraint.substring(1);
        const parts = version.split('.');
        if (parts.length >= 2) {
          const major = parseInt(parts[0]);
          const nextMajor = major + 1;
          return {
            min: version,
            max: `${nextMajor}.0.0`
          };
        }
      }
      
      // Handle tilde (~) - allows patch-level changes
      if (constraint.startsWith('~')) {
        const version = constraint.substring(1);
        const parts = version.split('.');
        if (parts.length >= 2) {
          const major = parseInt(parts[0]);
          const minor = parseInt(parts[1]);
          const nextMinor = minor + 1;
          return {
            min: version,
            max: `${major}.${nextMinor}.0`
          };
        }
      }
      
      return {};
    } catch (error) {
      console.error(`❌ [VersionManager] Error parsing constraint: ${constraint}`, error);
      return {};
    }
  }
}

export { VersionManager };
```

## 4. Module Interface Contracts

```typescript
// src/core/moduleInterfaces.ts

// Academics Module Interface
export interface AcademicsModuleInterface {
  // Subject management
  getSubjects: () => Promise<Subject[]>;
  getSubjectById: (id: number) => Promise<Subject | null>;
  createSubject: (subject: Omit<Subject, 'id'>) => Promise<Subject>;
  updateSubject: (subject: Subject) => Promise<Subject>;
  deleteSubject: (id: number) => Promise<void>;
  
  // Exam management
  getExamSessions: () => Promise<ExamSession[]>;
  getExamResults: (studentId: string) => Promise<StudentExamResult[]>;
  calculateGrades: (marks: number[]) => Promise<string>;
  
  // Timetable
  getTimetableEntries: (classStreamId: number) => Promise<TimetableEntry[]>;
  generateTimetable: (data: any) => Promise<TimetableEntry[]>;
}

// Administration Module Interface
export interface AdministrationModuleInterface {
  // Student management
  getStudents: () => Promise<Student[]>;
  getStudentById: (id: string) => Promise<Student | null>;
  createStudent: (student: Omit<Student, 'id'>) => Promise<Student>;
  updateStudent: (student: Student) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;
  
  // Staff management
  getStaff: () => Promise<Staff[]>;
  getStaffById: (id: string) => Promise<Staff | null>;
  
  // Class management
  getClasses: () => Promise<Class[]>;
  getClassStreams: () => Promise<ClassStream[]>;
  
  // Academic years
  getAcademicYears: () => Promise<AcademicYear[]>;
  getCurrentAcademicYear: () => Promise<AcademicYear | null>;
}

// Finance Module Interface
export interface FinanceModuleInterface {
  // Fee templates
  getFeeTemplates: () => Promise<FeeTemplate[]>;
  getFeeTemplateById: (id: number) => Promise<FeeTemplate | null>;
  
  // Invoicing
  createInvoice: (data: any) => Promise<StudentInvoice>;
  getStudentInvoices: (studentId: string) => Promise<StudentInvoice[]>;
  
  // Payments
  processPayment: (data: any) => Promise<StudentPayment>;
  getStudentPayments: (studentId: string) => Promise<StudentPayment[]>;
}
```

## 5. Dependency Visualization Tools

```typescript
// src/core/tools/DependencyVisualizer.ts
class DependencyVisualizer {
  /**
   * Generate dependency graph data for visualization
   */
  static generateGraphData(): { 
    nodes: Array<{ id: string; name: string; version: string; status: 'enabled' | 'disabled' }>;
    edges: Array<{ from: string; to: string; type: 'required' | 'optional' }>;
  } {
    const modules = moduleRegistry.getAllModules();
    const enabledModules = moduleRegistry.getEnabledModules();
    
    const nodes = modules.map(module => ({
      id: module.id,
      name: module.name,
      version: module.version,
      status: enabledModules.some(m => m.id === module.id) ? 'enabled' : 'disabled'
    }));
    
    const edges: Array<{ from: string; to: string; type: 'required' | 'optional' }> = [];
    
    for (const module of modules) {
      // Required dependencies
      for (const dep of module.dependencies.filter(d => d.required)) {
        edges.push({
          from: module.id,
          to: dep.moduleId,
          type: 'required'
        });
      }
      
      // Optional dependencies
      if (module.optionalDependencies) {
        for (const dep of module.optionalDependencies) {
          edges.push({
            from: module.id,
            to: dep.moduleId,
            type: 'optional'
          });
        }
      }
    }
    
    return { nodes, edges };
  }

  /**
   * Generate textual dependency report
   */
  static generateTextReport(): string {
    const modules = moduleRegistry.getAllModules();
    const report: string[] = [];
    
    report.push('# Module Dependency Report');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push(`Total Modules: ${modules.length}`);
    report.push('');
    
    for (const module of modules) {
      report.push(`## ${module.name} (${module.id}) v${module.version}`);
      
      if (module.dependencies.length > 0) {
        report.push('### Required Dependencies:');
        for (const dep of module.dependencies.filter(d => d.required)) {
          report.push(`  - ${dep.moduleId} ${dep.version}`);
        }
      }
      
      if (module.optionalDependencies && module.optionalDependencies.length > 0) {
        report.push('### Optional Dependencies:');
        for (const dep of module.optionalDependencies) {
          report.push(`  - ${dep.moduleId} ${dep.version}`);
        }
      }
      
      report.push('');
    }
    
    return report.join('\n');
  }
}

export { DependencyVisualizer };
```

## 6. Implementation Roadmap

### Phase 1: Foundation Enhancement (2-3 weeks)

### Phase 2: Advanced Features (3-4 weeks)

### Phase 3: Developer Tooling (2-3 weeks)

### Phase 4: Optimization (2 weeks)
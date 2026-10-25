import { logger } from '@/utils/logging';

// ABOUTME: Module dependency validator service
// ABOUTME: Validates module dependencies and detects circular dependencies

import semver from 'semver';
import { ModuleDefinition } from '../types';

class ModuleDependencyValidator {
  /**
   * Validate that all required dependencies are available
   */
  /**
   * Validate that all required dependencies are available
   */
  static validateDependencies(module: ModuleDefinition, moduleRegistry?: any): boolean {
    logger.info(`🔧 [ModuleDependencyValidator] Validating dependencies for: ${module.id}`);
    
    try {
      // Perform synchronous validation to avoid race conditions
      return this._validateDependenciesSync(module, moduleRegistry);
    } catch (error) {
      logger.error(`❌ [ModuleDependencyValidator] Error validating dependencies for ${module.id}:`, error);
      return false;
    }
  }

  private static _validateDependenciesSync(module: ModuleDefinition, moduleRegistry?: any): boolean {
    if (!moduleRegistry) {
      logger.error('❌ [ModuleDependencyValidator] moduleRegistry not provided');
      return false;
    }
    
    const enabledModules = moduleRegistry.getEnabledModules();
    logger.info(`🔧 [ModuleDependencyValidator] Enabled modules:`, enabledModules.map(m => m.id));
    
    const errors: string[] = [];
    
    // Check required dependencies
    const dependencies = module.dependencies || [];
    logger.info(`🔧 [ModuleDependencyValidator] Module ${module.id} dependencies:`, dependencies);
    
    for (const dep of dependencies.filter(d => typeof d !== 'string' && d.required)) {
      // Handle both new ModuleDependency objects and old string format
      const depId = typeof dep === 'string' ? dep : dep.moduleId;
      logger.info(`🔧 [ModuleDependencyValidator] Checking dependency: ${depId}`);
      
      const depModule = enabledModules.find(m => m.id === depId);
      logger.info(`🔧 [ModuleDependencyValidator] Found dependency module:`, depModule?.id);
      
      if (!depModule) {
        errors.push(`Required dependency '${depId}' not found`);
        continue;
      }
      
      // Validate version compatibility if using new format
      if (typeof dep !== 'string' && dep.version) {
        logger.info(`🔧 [ModuleDependencyValidator] Checking version compatibility for ${depId}: required ${dep.version}, found ${depModule.version}`);
        if (!semver.satisfies(depModule.version, dep.version)) {
          errors.push(
            `Version mismatch for '${depId}': ` +
            `required ${dep.version}, found ${depModule.version}`
          );
        }
      }
    }
    
    if (errors.length > 0) {
      logger.error(`❌ [ModuleDependencyValidator] Dependency validation failed for ${module.id}:`, errors);
      return false;
    }
    
    logger.info(`✅ [ModuleDependencyValidator] All dependencies satisfied for: ${module.id}`);
    return true;
  }

  private static async _validateDependenciesInternal(module: ModuleDefinition): Promise<boolean> {
    const { moduleRegistry } = await import('../moduleRegistry');
    
    const enabledModules = moduleRegistry.getEnabledModules();
    logger.info(`🔧 [ModuleDependencyValidator] Enabled modules:`, enabledModules.map(m => m.id));
    
    const errors: string[] = [];
    
    // Check required dependencies
    const dependencies = module.dependencies || [];
    logger.info(`🔧 [ModuleDependencyValidator] Module ${module.id} dependencies:`, dependencies);
    
    for (const dep of dependencies.filter(d => typeof d !== 'string' && d.required)) {
      // Handle both new ModuleDependency objects and old string format
      const depId = typeof dep === 'string' ? dep : dep.moduleId;
      logger.info(`🔧 [ModuleDependencyValidator] Checking dependency: ${depId}`);
      
      const depModule = enabledModules.find(m => m.id === depId);
      logger.info(`🔧 [ModuleDependencyValidator] Found dependency module:`, depModule?.id);
      
      if (!depModule) {
        errors.push(`Required dependency '${depId}' not found`);
        continue;
      }
      
      // Validate version compatibility if using new format
      if (typeof dep !== 'string' && dep.version) {
        logger.info(`🔧 [ModuleDependencyValidator] Checking version compatibility for ${depId}: required ${dep.version}, found ${depModule.version}`);
        if (!semver.satisfies(depModule.version, dep.version)) {
          errors.push(
            `Version mismatch for '${depId}': ` +
            `required ${dep.version}, found ${depModule.version}`
          );
        }
      }
    }
    
    if (errors.length > 0) {
      logger.error(`❌ [ModuleDependencyValidator] Dependency validation failed for ${module.id}:`, errors);
      return false;
    }
    
    logger.info(`✅ [ModuleDependencyValidator] All dependencies satisfied for: ${module.id}`);
    return true;
  }

  /**
   * Detect circular dependencies in the module graph
   */
  static detectCircularDependencies(moduleRegistry?: any): string[][] {
    if (!moduleRegistry) {
      logger.error('❌ [ModuleDependencyValidator] moduleRegistry not provided for circular dependency detection');
      return [];
    }
    
    try {
      return this._detectCircularDependenciesSync(moduleRegistry);
    } catch (error) {
      logger.error(`❌ [ModuleDependencyValidator] Error detecting circular dependencies:`, error);
      return [];
    }
  }

  private static _detectCircularDependenciesSync(moduleRegistry: any): string[][] {
    
    const modules = moduleRegistry.getAllMetadata();
    const graph = new Map<string, string[]>();
    const cycles: string[][] = [];
    
    // Build dependency graph including both required and optional dependencies
    for (const module of modules) {
      const requiredDeps = (module.dependencies || []).map(d => 
        typeof d === 'string' ? d : d.moduleId
      );
      const optionalDeps = (module.optionalDependencies || []).map(d => 
        typeof d === 'string' ? d : d.moduleId
      );
      const allDeps = [...requiredDeps, ...optionalDeps];
      graph.set(module.id, allDeps);
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
  static generateCompatibilityReport(moduleRegistry?: any): {
    totalModules: number;
    modulesWithIssues: number;
    issues: Array<{
      moduleId: string;
      type: 'missing' | 'version' | 'circular';
      details: string;
    }>;
  } {
    if (!moduleRegistry) {
       logger.error('❌ [ModuleDependencyValidator] moduleRegistry not provided for compatibility report');
       return {
         totalModules: 0,
         modulesWithIssues: 0,
         issues: []
       };
     }

     try {
       return this._generateCompatibilityReportSync(moduleRegistry);
     } catch (error) {
       logger.error(`❌ [ModuleDependencyValidator] Error generating compatibility report:`, error);
       return {
         totalModules: 0,
         modulesWithIssues: 0,
         issues: []
       };
     }
   }

  private static _generateCompatibilityReportSync(moduleRegistry: any): {
    totalModules: number;
    modulesWithIssues: number;
    issues: Array<{
      moduleId: string;
      type: 'missing' | 'version' | 'circular';
      details: string;
    }>;
  } {
    const modules = moduleRegistry.getAllMetadata();
    // The registry hands back the ids of the enabled modules, not the modules: a version is read
    // from the dependency's metadata.
    const enabledModules: string[] = moduleRegistry.getEnabledModules();
    const issues: Array<{
      moduleId: string;
      type: 'missing' | 'version' | 'circular';
      details: string;
    }> = [];

    // Check each module's dependencies
    for (const module of modules) {
      const dependencies = module.dependencies || [];

      for (const dep of dependencies) {
        const depId = typeof dep === 'string' ? dep : dep.moduleId;
        const depEnabled = enabledModules.includes(depId);

        if (!depEnabled && (typeof dep === 'string' || dep.required)) {
          issues.push({
            moduleId: module.id,
            type: 'missing',
            details: `Required dependency '${depId}' not found`
          });
        } else if (typeof dep !== 'string' && depEnabled && dep.version) {
          // Check version compatibility
          const foundVersion = moduleRegistry.getMetadata(depId)?.version;
          if (foundVersion && !semver.satisfies(foundVersion, dep.version)) {
            issues.push({
              moduleId: module.id,
              type: 'version',
              details: `Version mismatch for '${depId}': required ${dep.version}, found ${foundVersion}`
            });
          }
        }
      }
    }

    // Check for circular dependencies
    const cycles = this._detectCircularDependenciesSync(moduleRegistry);
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
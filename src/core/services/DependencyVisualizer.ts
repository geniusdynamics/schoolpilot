// ABOUTME: Dependency visualizer service
// ABOUTME: Generates dependency graph data and reports for visualization

import { moduleRegistry, type ModuleRegistry } from '../moduleRegistry';

class DependencyVisualizer {
  /**
   * Generate dependency graph data for visualization. The registry is the application's own unless
   * a caller hands one in.
   */
  static generateGraphData(registry: Pick<ModuleRegistry, 'getAllMetadata' | 'getEnabledModules'> = moduleRegistry): { 
    nodes: Array<{ id: string; name: string; version: string; status: 'enabled' | 'disabled' }>;
    edges: Array<{ from: string; to: string; type: 'required' | 'optional' }>;
  } {
    const modules = registry.getAllMetadata();
    // getEnabledModules() returns the ids of the enabled modules, not the modules.
    const enabledModules = registry.getEnabledModules();
    
    const nodes = modules.map(module => ({
      id: module.id,
      name: module.name,
      version: module.version,
      status: enabledModules.includes(module.id) ? 'enabled' as const : 'disabled' as const
    }));
    
    const edges: Array<{ from: string; to: string; type: 'required' | 'optional' }> = [];
    
    for (const module of modules) {
      const dependencies = module.dependencies || [];
      
      // Handle both new ModuleDependency objects and old string format
      for (const dep of dependencies) {
        if (typeof dep === 'string') {
          // Old string format - treat as required dependency
          edges.push({
            from: module.id,
            to: dep,
            type: 'required'
          });
        } else {
          // New ModuleDependency object
          edges.push({
            from: module.id,
            to: dep.moduleId,
            type: dep.required ? 'required' : 'optional'
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
    const modules = moduleRegistry.getAllMetadata();
    const report: string[] = [];
    
    report.push('# Module Dependency Report');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push(`Total Modules: ${modules.length}`);
    report.push('');
    
    for (const module of modules) {
      report.push(`## ${module.name} (${module.id}) v${module.version}`);
      
      const dependencies = module.dependencies || [];
      if (dependencies.length > 0) {
        report.push('### Dependencies:');
        for (const dep of dependencies) {
          if (typeof dep === 'string') {
            // Old string format
            report.push(`  - ${dep} (required)`);
          } else {
            // New ModuleDependency object
            report.push(`  - ${dep.moduleId} ${dep.version} (${dep.required ? 'required' : 'optional'})`);
          }
        }
      }
      
      report.push('');
    }
    
    return report.join('\n');
  }
}

export { DependencyVisualizer };
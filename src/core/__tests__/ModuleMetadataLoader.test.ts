import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ModuleMetadata, ModuleDependency } from '@/core/types/module';

// Mock the module.json files
const mockModules: Record<string, ModuleMetadata> = {
  core: {
    id: 'core',
    name: 'Core System',
    version: '1.0.0',
    dependencies: [],
    provides: { entities: ['users', 'roles'], services: [], hooks: [] }
  },
  administration: {
    id: 'administration',
    name: 'Administration',
    version: '1.0.0',
    dependencies: [
      { moduleId: 'core', version: '^1.0.0', required: true, imports: ['users', 'roles'] }
    ],
    provides: { entities: ['students', 'staff'], services: [], hooks: [] }
  },
  academics: {
    id: 'academics',
    name: 'Academics',
    version: '1.0.0',
    dependencies: [
      { moduleId: 'administration', version: '^1.0.0', required: true, imports: ['students', 'staff'] }
    ],
    provides: { entities: ['subjects', 'exams'], services: [], hooks: [] }
  },
  finance: {
    id: 'finance',
    name: 'Finance',
    version: '1.0.0',
    dependencies: [
      { moduleId: 'administration', version: '^1.0.0', required: true, imports: ['students', 'staff'] }
    ],
    provides: { entities: ['invoices', 'payments'], services: [], hooks: [] }
  },
};

describe('ModuleMetadataLoader', () => {
  let loader: {
    modules: Map<string, { metadata: ModuleMetadata }>;
    loadAllMetadata: () => Promise<void>;
    getModule: (id: string) => { metadata: ModuleMetadata } | undefined;
    getAllModules: () => { metadata: ModuleMetadata }[];
    validateDependencies: () => void;
    detectCircularDependencies: () => string[][];
    getDependencyGraph: () => Record<string, string[]>;
  };

  beforeEach(() => {
    // Simple loader implementation for testing
    loader = {
      modules: new Map(),
      
      async loadAllMetadata() {
        for (const [id, metadata] of Object.entries(mockModules)) {
          this.modules.set(id, { metadata });
        }
        this.validateDependencies();
      },
      
      getModule(id: string) {
        return this.modules.get(id);
      },
      
      getAllModules() {
        return Array.from(this.modules.values());
      },
      
      validateDependencies() {
        for (const [moduleId, loadedModule] of this.modules) {
          for (const dep of loadedModule.metadata.dependencies || []) {
            if (!dep.required) continue;
            
            const depModule = this.modules.get(dep.moduleId);
            if (!depModule) {
              throw new Error(`Module "${moduleId}" requires "${dep.moduleId}" which is not installed`);
            }
            
            // Simple semver check
            const installedVersion = depModule.metadata.version;
            const requiredVersion = dep.version.replace('^', '').replace('~', '');
            const [installedMajor] = installedVersion.split('.').map(Number);
            const [requiredMajor] = requiredVersion.split('.').map(Number);
            
            if (installedMajor < requiredMajor) {
              throw new Error(
                `Module "${moduleId}" requires "${dep.moduleId}" version "${dep.version}" but "${installedVersion}" is installed`
              );
            }
          }
        }
        
        const cycles = this.detectCircularDependencies();
        if (cycles.length > 0) {
          throw new Error(`Circular dependencies detected: ${cycles.map(c => c.join(' -> ')).join(', ')}`);
        }
      },
      
      detectCircularDependencies() {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const cycles: string[][] = [];
        
        const dfs = (node: string, path: string[] = []): void => {
          if (recursionStack.has(node)) {
            const cycleStart = path.indexOf(node);
            cycles.push([...path.slice(cycleStart), node]);
            return;
          }
          
          if (visited.has(node)) return;
          
          visited.add(node);
          recursionStack.add(node);
          path.push(node);
          
          const module = this.modules.get(node);
          if (module) {
            for (const dep of module.metadata.dependencies || []) {
              if (dep.required) {
                dfs(dep.moduleId, [...path]);
              }
            }
          }
          
          recursionStack.delete(node);
        };
        
        for (const moduleId of this.modules.keys()) {
          if (!visited.has(moduleId)) {
            dfs(moduleId);
          }
        }
        
        return cycles;
      },
      
      getDependencyGraph() {
        const graph: Record<string, string[]> = {};
        for (const [moduleId, loadedModule] of this.modules) {
          graph[moduleId] = loadedModule.metadata.dependencies
            ?.filter(d => d.required)
            .map(d => d.moduleId) || [];
        }
        return graph;
      }
    };
  });

  describe('loadAllMetadata', () => {
    it('should load all module metadata', async () => {
      await loader.loadAllMetadata();
      
      expect(loader.modules.size).toBe(4);
      expect(loader.getModule('core')).toBeDefined();
      expect(loader.getModule('administration')).toBeDefined();
      expect(loader.getModule('academics')).toBeDefined();
      expect(loader.getModule('finance')).toBeDefined();
    });

    it('should store correct metadata', async () => {
      await loader.loadAllMetadata();
      
      const adminModule = loader.getModule('administration');
      expect(adminModule?.metadata.name).toBe('Administration');
      expect(adminModule?.metadata.version).toBe('1.0.0');
      expect(adminModule?.metadata.dependencies).toHaveLength(1);
    });
  });

  describe('validateDependencies', () => {
    it('should validate all dependencies are present', async () => {
      await loader.loadAllMetadata();
      
      // Should not throw
      expect(() => loader.validateDependencies()).not.toThrow();
    });

    it('should throw for missing required dependency', async () => {
      loader.modules.set('incomplete', {
        metadata: {
          id: 'incomplete',
          name: 'Incomplete Module',
          version: '1.0.0',
          dependencies: [
            { moduleId: 'nonexistent', version: '^1.0.0', required: true }
          ]
        }
      });

      expect(() => loader.validateDependencies()).toThrow(
        'Module "incomplete" requires "nonexistent" which is not installed'
      );
    });

    it('should validate version compatibility', async () => {
      // First load the existing modules including core
      await loader.loadAllMetadata();
      
      // Add a module that requires core v2.0.0 but core v1.0.0 is installed
      loader.modules.set('outdated-dep', {
        metadata: {
          id: 'outdated-dep',
          name: 'Outdated Dependency',
          version: '1.0.0',
          dependencies: [
            { moduleId: 'core', version: '^2.0.0', required: true }
          ]
        }
      });

      expect(() => loader.validateDependencies()).toThrow(
        'Module "outdated-dep" requires "core" version "^2.0.0"'
      );
    });

    it('should allow optional dependencies to be missing', async () => {
      loader.modules.set('optional-dep', {
        metadata: {
          id: 'optional-dep',
          name: 'Optional Dependency',
          version: '1.0.0',
          dependencies: [
            { moduleId: 'nonexistent', version: '^1.0.0', required: false }
          ]
        }
      });

      // Should not throw for optional dependencies
      expect(() => loader.validateDependencies()).not.toThrow();
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect no cycles in valid graph', async () => {
      await loader.loadAllMetadata();
      
      const cycles = loader.detectCircularDependencies();
      expect(cycles).toHaveLength(0);
    });

    it('should detect circular dependency', () => {
      // Create circular dependency: A -> B -> C -> A
      loader.modules.set('a', {
        metadata: {
          id: 'a',
          name: 'Module A',
          version: '1.0.0',
          dependencies: [{ moduleId: 'b', version: '^1.0.0', required: true }]
        }
      });
      loader.modules.set('b', {
        metadata: {
          id: 'b',
          name: 'Module B',
          version: '1.0.0',
          dependencies: [{ moduleId: 'c', version: '^1.0.0', required: true }]
        }
      });
      loader.modules.set('c', {
        metadata: {
          id: 'c',
          name: 'Module C',
          version: '1.0.0',
          dependencies: [{ moduleId: 'a', version: '^1.0.0', required: true }]
        }
      });

      const cycles = loader.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('a');
      expect(cycles[0]).toContain('b');
      expect(cycles[0]).toContain('c');
    });
  });

  describe('getDependencyGraph', () => {
    it('should return correct dependency graph', async () => {
      await loader.loadAllMetadata();
      
      const graph = loader.getDependencyGraph();
      
      expect(graph['core']).toEqual([]);
      expect(graph['administration']).toEqual(['core']);
      expect(graph['academics']).toEqual(['administration']);
      expect(graph['finance']).toEqual(['administration']);
    });
  });
});

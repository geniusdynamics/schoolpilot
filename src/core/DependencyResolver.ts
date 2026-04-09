import type { ModuleMetadata, LoadedModule } from '@/core/types/module';

export interface DependencyGraph {
  nodes: string[];
  edges: Map<string, string[]>;
}

export interface ResolutionResult {
  order: string[];
  levels: Map<string, number>;
  circular: string[][];
  independent: string[];
}

/**
 * Resolves module dependencies using topological sort.
 * Ensures modules are loaded in the correct order based on their dependencies.
 */
export class DependencyResolver {
  private modules = new Map<string, LoadedModule>();

  registerModule(module: LoadedModule): void {
    this.modules.set(module.id, module);
  }

  registerModules(modules: LoadedModule[]): void {
    for (const module of modules) {
      this.registerModule(module);
    }
  }

  /**
   * Build a dependency graph from registered modules
   */
  buildGraph(): DependencyGraph {
    const nodes: string[] = [];
    const edges = new Map<string, string[]>();

    for (const [id, module] of this.modules) {
      nodes.push(id);
      const deps = module.metadata.dependencies
        ?.filter(d => d.required)
        .map(d => d.moduleId) || [];
      edges.set(id, deps);
    }

    return { nodes, edges };
  }

  /**
   * Perform topological sort to determine module loading order
   * Uses Kahn's algorithm for efficiency
   */
  resolve(): ResolutionResult {
    const graph = this.buildGraph();
    const inDegree = new Map<string, number>();
    const levels = new Map<string, number>();
    
    // Initialize in-degrees
    for (const node of graph.nodes) {
      inDegree.set(node, 0);
      levels.set(node, 0);
    }
    
    // Calculate in-degrees
    for (const [node, deps] of graph.edges) {
      for (const dep of deps) {
        if (graph.nodes.includes(dep)) {
          inDegree.set(node, (inDegree.get(node) || 0) + 1);
        }
      }
    }

    // Find all nodes with no dependencies (in-degree 0)
    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
        levels.set(node, 0);
      }
    }

    const order: string[] = [];
    const independent = [...queue];

    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);
      const currentLevel = levels.get(current) || 0;

      // Find all nodes that depend on current
      for (const [node, deps] of graph.edges) {
        if (deps.includes(current)) {
          const newDegree = (inDegree.get(node) || 0) - 1;
          inDegree.set(node, newDegree);
          
          // Update level (max of dependencies + 1)
          const depLevel = levels.get(node) || 0;
          levels.set(node, Math.max(depLevel, currentLevel + 1));
          
          if (newDegree === 0) {
            queue.push(node);
          }
        }
      }
    }

    // Check for circular dependencies
    const circular = this.detectCircularDependencies();

    return {
      order,
      levels,
      circular,
      independent
    };
  }

  /**
   * Detect circular dependencies using DFS
   */
  detectCircularDependencies(): string[][] {
    const graph = this.buildGraph();
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

      const deps = graph.edges.get(node) || [];
      for (const dep of deps) {
        if (graph.nodes.includes(dep)) {
          dfs(dep, [...path]);
        }
      }

      recursionStack.delete(node);
    };

    for (const node of graph.nodes) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * Get all dependencies (direct and transitive) for a module
   */
  getAllDependencies(moduleId: string): string[] {
    const graph = this.buildGraph();
    const deps = new Set<string>();

    const collect = (id: string, visited: Set<string> = new Set()): void => {
      if (visited.has(id)) return;
      visited.add(id);

      const direct = graph.edges.get(id) || [];
      for (const dep of direct) {
        if (graph.nodes.includes(dep) && dep !== moduleId) {
          deps.add(dep);
          collect(dep, visited);
        }
      }
    };

    collect(moduleId);
    return Array.from(deps);
  }

  /**
   * Get modules that depend on a given module (direct and transitive)
   */
  getDependents(moduleId: string): string[] {
    const graph = this.buildGraph();
    const dependents = new Set<string>();

    const collect = (id: string, visited: Set<string> = new Set()): void => {
      if (visited.has(id)) return;
      visited.add(id);

      for (const [node, deps] of graph.edges) {
        if (deps.includes(id) && node !== moduleId) {
          dependents.add(node);
          collect(node, visited);
        }
      }
    };

    collect(moduleId);
    return Array.from(dependents);
  }

  /**
   * Check if a module can be safely disabled
   * (no active dependents)
   */
  canDisable(moduleId: string, enabledModules: Set<string>): boolean {
    const dependents = this.getDependents(moduleId);
    return !dependents.some(dep => enabledModules.has(dep));
  }

  /**
   * Get loading batches (modules that can be loaded in parallel)
   */
  getLoadingBatches(): string[][] {
    const result = this.resolve();
    const batches = new Map<number, string[]>();

    for (const [moduleId, level] of result.levels) {
      if (!batches.has(level)) {
        batches.set(level, []);
      }
      batches.get(level)!.push(moduleId);
    }

    // Sort by level
    const sortedLevels = Array.from(batches.keys()).sort((a, b) => a - b);
    return sortedLevels.map(level => batches.get(level)!);
  }

  /**
   * Clear all registered modules
   */
  clear(): void {
    this.modules.clear();
  }

  /**
   * Get the current number of registered modules
   */
  get size(): number {
    return this.modules.size;
  }
}

// Singleton instance
export const dependencyResolver = new DependencyResolver();

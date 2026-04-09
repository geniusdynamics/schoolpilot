import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyResolver } from '@/core/DependencyResolver';
import type { LoadedModule } from '@/core/types/module';

function createMockModule(id: string, deps: string[] = []): LoadedModule {
  return {
    id,
    metadata: {
      id,
      name: id,
      version: '1.0.0',
      dependencies: deps.map(d => ({
        moduleId: d,
        version: '^1.0.0',
        required: true
      }))
    },
    definition: null
  };
}

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
  });

  describe('buildGraph', () => {
    it('should build empty graph with no modules', () => {
      const graph = resolver.buildGraph();
      expect(graph.nodes).toEqual([]);
      expect(graph.edges.size).toBe(0);
    });

    it('should build graph with modules', () => {
      resolver.registerModule(createMockModule('a', ['b', 'c']));
      resolver.registerModule(createMockModule('b'));
      resolver.registerModule(createMockModule('c', ['b']));

      const graph = resolver.buildGraph();
      expect(graph.nodes).toEqual(['a', 'b', 'c']);
      expect(graph.edges.get('a')).toEqual(['b', 'c']);
      expect(graph.edges.get('b')).toEqual([]);
      expect(graph.edges.get('c')).toEqual(['b']);
    });
  });

  describe('resolve', () => {
    it('should return empty result for empty resolver', () => {
      const result = resolver.resolve();
      expect(result.order).toEqual([]);
      expect(result.circular).toEqual([]);
      expect(result.independent).toEqual([]);
    });

    it('should resolve linear dependencies', () => {
      resolver.registerModule(createMockModule('a'));
      resolver.registerModule(createMockModule('b', ['a']));
      resolver.registerModule(createMockModule('c', ['b']));

      const result = resolver.resolve();
      expect(result.order).toEqual(['a', 'b', 'c']);
      expect(result.circular).toEqual([]);
      expect(result.independent).toEqual(['a']);
    });

    it('should resolve diamond dependencies', () => {
      //   a
      //  / \
      // b   c
      //  \ /
      //   d
      resolver.registerModule(createMockModule('a'));
      resolver.registerModule(createMockModule('b', ['a']));
      resolver.registerModule(createMockModule('c', ['a']));
      resolver.registerModule(createMockModule('d', ['b', 'c']));

      const result = resolver.resolve();
      expect(result.order[0]).toBe('a');
      expect(result.order[result.order.length - 1]).toBe('d');
      expect(result.order).toContain('b');
      expect(result.order).toContain('c');
      expect(result.circular).toEqual([]);
    });

    it('should detect circular dependencies', () => {
      resolver.registerModule(createMockModule('a', ['b']));
      resolver.registerModule(createMockModule('b', ['c']));
      resolver.registerModule(createMockModule('c', ['a']));

      const result = resolver.resolve();
      expect(result.circular.length).toBeGreaterThan(0);
      expect(result.circular[0]).toContain('a');
      expect(result.circular[0]).toContain('b');
      expect(result.circular[0]).toContain('c');
    });

    it('should calculate dependency levels', () => {
      resolver.registerModule(createMockModule('a'));
      resolver.registerModule(createMockModule('b', ['a']));
      resolver.registerModule(createMockModule('c', ['b']));

      const result = resolver.resolve();
      expect(result.levels.get('a')).toBe(0);
      expect(result.levels.get('b')).toBe(1);
      expect(result.levels.get('c')).toBe(2);
    });
  });

  describe('detectCircularDependencies', () => {
    it('should return empty array for no cycles', () => {
      resolver.registerModule(createMockModule('a'));
      resolver.registerModule(createMockModule('b', ['a']));

      const cycles = resolver.detectCircularDependencies();
      expect(cycles).toEqual([]);
    });

    it('should detect self-reference', () => {
      resolver.registerModule(createMockModule('a', ['a']));

      const cycles = resolver.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('a');
    });

    it('should detect multi-node cycle', () => {
      resolver.registerModule(createMockModule('a', ['b']));
      resolver.registerModule(createMockModule('b', ['c']));
      resolver.registerModule(createMockModule('c', ['d']));
      resolver.registerModule(createMockModule('d', ['b']));

      const cycles = resolver.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);
      // Should detect b -> c -> d -> b
      expect(cycles[0]).toContain('b');
      expect(cycles[0]).toContain('c');
      expect(cycles[0]).toContain('d');
    });
  });

  describe('getAllDependencies', () => {
    it('should return empty for module with no dependencies', () => {
      resolver.registerModule(createMockModule('a'));

      const deps = resolver.getAllDependencies('a');
      expect(deps).toEqual([]);
    });

    it('should return transitive dependencies', () => {
      // a -> b -> c -> d
      resolver.registerModule(createMockModule('a', ['b']));
      resolver.registerModule(createMockModule('b', ['c']));
      resolver.registerModule(createMockModule('c', ['d']));
      resolver.registerModule(createMockModule('d'));

      const deps = resolver.getAllDependencies('a');
      expect(deps).toContain('b');
      expect(deps).toContain('c');
      expect(deps).toContain('d');
      expect(deps).not.toContain('a');
    });

    it('should handle shared dependencies', () => {
      // a -> b, a -> c, b -> d, c -> d
      resolver.registerModule(createMockModule('a', ['b', 'c']));
      resolver.registerModule(createMockModule('b', ['d']));
      resolver.registerModule(createMockModule('c', ['d']));
      resolver.registerModule(createMockModule('d'));

      const deps = resolver.getAllDependencies('a');
      expect(deps).toContain('b');
      expect(deps).toContain('c');
      expect(deps).toContain('d');
      expect(deps.filter(d => d === 'd').length).toBe(1); // No duplicates
    });
  });

  describe('getDependents', () => {
    it('should return modules that depend on given module', () => {
      resolver.registerModule(createMockModule('a'));
      resolver.registerModule(createMockModule('b', ['a']));
      resolver.registerModule(createMockModule('c', ['a']));
      resolver.registerModule(createMockModule('d', ['b']));

      const dependents = resolver.getDependents('a');
      expect(dependents).toContain('b');
      expect(dependents).toContain('c');
      expect(dependents).toContain('d');
    });

    it('should return empty array for unused module', () => {
      resolver.registerModule(createMockModule('a'));
      resolver.registerModule(createMockModule('b'));

      const dependents = resolver.getDependents('a');
      expect(dependents).toEqual([]);
    });
  });

  describe('canDisable', () => {
    it('should return true for module with no dependents', () => {
      resolver.registerModule(createMockModule('a'));
      resolver.registerModule(createMockModule('b', ['a']));

      const enabled = new Set(['a', 'b']);
      expect(resolver.canDisable('a', enabled)).toBe(false);
      expect(resolver.canDisable('b', enabled)).toBe(true);
    });

    it('should return false for module with enabled dependents', () => {
      resolver.registerModule(createMockModule('a'));
      resolver.registerModule(createMockModule('b', ['a']));
      resolver.registerModule(createMockModule('c', ['a']));

      const enabled = new Set(['a', 'b', 'c']);
      expect(resolver.canDisable('a', enabled)).toBe(false);
    });

    it('should return true if dependents are disabled', () => {
      resolver.registerModule(createMockModule('a'));
      resolver.registerModule(createMockModule('b', ['a']));

      const enabled = new Set(['a']); // b is disabled
      expect(resolver.canDisable('a', enabled)).toBe(true);
    });
  });

  describe('getLoadingBatches', () => {
    it('should return modules grouped by dependency level', () => {
      // Level 0: a
      // Level 1: b, c (both depend on a)
      // Level 2: d (depends on b and c)
      resolver.registerModule(createMockModule('a'));
      resolver.registerModule(createMockModule('b', ['a']));
      resolver.registerModule(createMockModule('c', ['a']));
      resolver.registerModule(createMockModule('d', ['b', 'c']));

      const batches = resolver.getLoadingBatches();
      expect(batches).toHaveLength(3);
      expect(batches[0]).toContain('a');
      expect(batches[1]).toContain('b');
      expect(batches[1]).toContain('c');
      expect(batches[2]).toContain('d');
    });

    it('should return empty array for empty resolver', () => {
      const batches = resolver.getLoadingBatches();
      expect(batches).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all registered modules', () => {
      resolver.registerModule(createMockModule('a'));
      resolver.registerModule(createMockModule('b'));

      expect(resolver.size).toBe(2);
      resolver.clear();
      expect(resolver.size).toBe(0);
    });
  });
});

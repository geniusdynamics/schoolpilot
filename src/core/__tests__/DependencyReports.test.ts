// ABOUTME: The dependency report and graph read the module registry as it is: getEnabledModules() returns module ids,
// ABOUTME: not modules. They used to treat the ids as objects, so every dependency looked missing and every module disabled.

import { describe, expect, it } from 'vitest';

import type { ModuleDependency, ModuleMetadata } from '../types';
import { DependencyVisualizer } from '../services/DependencyVisualizer';
import { ModuleDependencyValidator } from '../services/ModuleDependencyValidator';

type Dependency = string | ModuleDependency;

interface FakeModule {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly dependencies?: readonly Dependency[];
  readonly optionalDependencies?: readonly Dependency[];
}

const moduleOf = (id: string, version = '1.0.0', dependencies?: readonly Dependency[], optionalDependencies?: readonly Dependency[]): FakeModule => ({
  id,
  name: id,
  version,
  dependencies,
  optionalDependencies,
});

const required = (moduleId: string, version = '^1.0.0'): ModuleDependency => ({ moduleId, version, required: true });
const optional = (moduleId: string, version = '^1.0.0'): ModuleDependency => ({ moduleId, version, required: false });

/** A registry with the API of the real one: metadata for every module, and the ids of the enabled ones. */
const registryOf = (modules: readonly FakeModule[], enabled: readonly string[]) => ({
  getAllMetadata: () => modules,
  getEnabledModules: () => [...enabled],
  getMetadata: (id: string) => modules.find((module) => module.id === id),
});

describe('the dependency report', () => {
  it('finds nothing wrong when every required dependency is enabled', () => {
    const registry = registryOf(
      [moduleOf('administration'), moduleOf('academics', '1.0.0', [required('administration')])],
      ['administration', 'academics']
    );

    expect(ModuleDependencyValidator.generateCompatibilityReport(registry)).toEqual({
      totalModules: 2,
      modulesWithIssues: 0,
      issues: [],
    });
  });

  it('reports a required dependency that is not enabled, against the module that needs it', () => {
    const registry = registryOf(
      [moduleOf('administration'), moduleOf('academics', '1.0.0', [required('administration')])],
      ['academics']
    );

    const report = ModuleDependencyValidator.generateCompatibilityReport(registry);

    expect(report.modulesWithIssues).toBe(1);
    expect(report.issues).toEqual([
      { moduleId: 'academics', type: 'missing', details: "Required dependency 'administration' not found" },
    ]);
  });

  it('does not report an optional dependency that is not enabled', () => {
    const registry = registryOf(
      [moduleOf('administration'), moduleOf('reports', '1.0.0', [optional('administration')])],
      ['reports']
    );

    expect(ModuleDependencyValidator.generateCompatibilityReport(registry).issues).toEqual([]);
  });

  it('treats a dependency written as a bare module id as required', () => {
    const modules = [moduleOf('administration'), moduleOf('library', '1.0.0', ['administration'])];

    expect(ModuleDependencyValidator.generateCompatibilityReport(registryOf(modules, ['library'])).issues).toHaveLength(1);
    expect(ModuleDependencyValidator.generateCompatibilityReport(registryOf(modules, ['administration', 'library'])).issues).toEqual([]);
  });

  it('reports an enabled dependency whose version is outside the range asked for', () => {
    const registry = registryOf(
      [moduleOf('administration', '2.0.0'), moduleOf('academics', '1.0.0', [required('administration', '^1.0.0')])],
      ['administration', 'academics']
    );

    expect(ModuleDependencyValidator.generateCompatibilityReport(registry).issues).toEqual([
      { moduleId: 'academics', type: 'version', details: "Version mismatch for 'administration': required ^1.0.0, found 2.0.0" },
    ]);
  });

  it('reports a circular dependency', () => {
    const registry = registryOf(
      [moduleOf('a', '1.0.0', [required('b')]), moduleOf('b', '1.0.0', [required('a')])],
      ['a', 'b']
    );

    const issues = ModuleDependencyValidator.generateCompatibilityReport(registry).issues;

    expect(issues.some((issue) => issue.type === 'circular')).toBe(true);
  });

  // The shipped modules are laid out like this: administration is the root and optionally integrates with
  // finance and HR, while those require administration. Only a cycle made of required links can stop modules
  // from loading, so this is not a problem and must not be reported as one.
  it('does not call a cycle circular when one link of it is optional', () => {
    const registry = registryOf(
      [moduleOf('administration', '1.0.0', undefined, [optional('finance')]), moduleOf('finance', '1.0.0', [required('administration')])],
      ['administration', 'finance']
    );

    expect(ModuleDependencyValidator.generateCompatibilityReport(registry)).toEqual({
      totalModules: 2,
      modulesWithIssues: 0,
      issues: [],
    });
  });

  it('does not call a cycle circular when one link of it is a dependency marked not required', () => {
    const registry = registryOf(
      [moduleOf('a', '1.0.0', [optional('b')]), moduleOf('b', '1.0.0', [required('a')])],
      ['a', 'b']
    );

    expect(ModuleDependencyValidator.generateCompatibilityReport(registry).issues).toEqual([]);
  });

  it('still reports a cycle of three required links', () => {
    const registry = registryOf(
      [moduleOf('a', '1.0.0', [required('b')]), moduleOf('b', '1.0.0', [required('c')]), moduleOf('c', '1.0.0', [required('a')])],
      ['a', 'b', 'c']
    );

    expect(ModuleDependencyValidator.generateCompatibilityReport(registry).issues.some((issue) => issue.type === 'circular')).toBe(true);
  });
});

describe('the dependency graph', () => {
  const graphOf = (modules: ModuleMetadata[], enabled: string[]) => ({
    getAllMetadata: () => modules,
    getEnabledModules: () => enabled,
  });

  it('marks a module enabled when its id is among the enabled ids, and disabled when it is not', () => {
    const registry = graphOf(
      [
        { id: 'administration', name: 'Administration', version: '1.0.0' },
        { id: 'library', name: 'Library', version: '1.0.0' },
      ],
      ['administration']
    );

    expect(DependencyVisualizer.generateGraphData(registry).nodes).toEqual([
      { id: 'administration', name: 'Administration', version: '1.0.0', status: 'enabled' },
      { id: 'library', name: 'Library', version: '1.0.0', status: 'disabled' },
    ]);
  });

  it('draws an edge from a module to each module it depends on, required or optional', () => {
    const registry = graphOf(
      [
        { id: 'administration', name: 'Administration', version: '1.0.0' },
        {
          id: 'reports',
          name: 'Reports',
          version: '1.0.0',
          dependencies: [required('administration'), optional('finance')],
        },
      ],
      ['administration', 'reports']
    );

    expect(DependencyVisualizer.generateGraphData(registry).edges).toEqual([
      { from: 'reports', to: 'administration', type: 'required' },
      { from: 'reports', to: 'finance', type: 'optional' },
    ]);
  });
});

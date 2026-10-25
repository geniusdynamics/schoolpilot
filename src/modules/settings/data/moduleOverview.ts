// ABOUTME: What the Modules tab says of each module: whether it is running, what it cannot run without, what it can use
// ABOUTME: when it is there, and which modules need it. Read from the module registry as it is; it changes nothing.

import type { ModuleDependency, ModuleMetadata } from '@/core/types';

/** The part of the module registry this reads. */
export interface ModuleRegistryView {
  getAllMetadata(): ModuleMetadata[];
  /** The ids of the enabled modules, not the modules. */
  getEnabledModules(): string[];
}

export interface ModuleRow {
  readonly id: string;
  /** The name as the registry holds it: usually a translation key. */
  readonly name: string;
  readonly version: string;
  readonly running: boolean;
  /** The modules it cannot run without. */
  readonly requires: readonly string[];
  /** The modules it can use when they are there. */
  readonly optional: readonly string[];
  /** The modules that need it, or can use it. */
  readonly usedBy: readonly string[];
}

/** A dependency may be written as a bare module id (always required) or as an object that says. */
const isRequired = (dependency: ModuleDependency | string): boolean =>
  typeof dependency === 'string' || dependency.required;

const idOf = (dependency: ModuleDependency | string): string =>
  typeof dependency === 'string' ? dependency : dependency.moduleId;

function needsOf(module: ModuleMetadata): { requires: string[]; optional: string[] } {
  const declared: ReadonlyArray<ModuleDependency | string> = module.dependencies ?? [];
  const requires = declared.filter(isRequired).map(idOf);
  const optional = [
    ...declared.filter((dependency) => !isRequired(dependency)).map(idOf),
    ...(module.optionalDependencies ?? []).map(idOf),
  ];
  return { requires, optional };
}

/** One row per module the registry knows, in alphabetical order of their ids. */
export function describeModules(registry: ModuleRegistryView): ModuleRow[] {
  const modules = registry.getAllMetadata();
  const running = new Set(registry.getEnabledModules());
  const needs = new Map(modules.map((module) => [module.id, needsOf(module)]));

  return modules
    .map((module): ModuleRow => {
      const { requires, optional } = needs.get(module.id) ?? { requires: [], optional: [] };
      const usedBy = modules
        .filter((other) => {
          const theirs = needs.get(other.id);
          return theirs?.requires.includes(module.id) || theirs?.optional.includes(module.id);
        })
        .map((other) => other.id);

      return {
        id: module.id,
        name: module.name,
        version: module.version,
        running: running.has(module.id),
        requires,
        optional,
        usedBy,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

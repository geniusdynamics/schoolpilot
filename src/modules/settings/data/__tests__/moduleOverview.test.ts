// ABOUTME: What the Modules tab says of each module: whether it is running, what it cannot run without, what it can use
// ABOUTME: when it is there, and which modules need it. Read from the module registry as it is.

import { describe, expect, it } from 'vitest';

import type { ModuleMetadata } from '@/core/types';

import { countModules, describeModules } from '../moduleOverview';

const registryOf = (modules: ModuleMetadata[], enabled: string[]) => ({
  getAllMetadata: () => modules,
  getEnabledModules: () => enabled,
  getMetadata: (id: string) => modules.find((module) => module.id === id),
});

const ADMINISTRATION: ModuleMetadata = { id: 'administration', name: 'navigation:administration.title', version: '1.0.0' };
const ACADEMICS: ModuleMetadata = {
  id: 'academics',
  name: 'navigation:academics.title',
  version: '1.2.0',
  dependencies: [{ moduleId: 'administration', version: '^1.0.0', required: true }],
  optionalDependencies: [{ moduleId: 'finance', version: '^1.0.0', required: false }],
};

describe('describeModules', () => {
  it('says a module is running when its id is among the enabled ones', () => {
    const rows = describeModules(registryOf([ADMINISTRATION, ACADEMICS], ['administration']));

    expect(rows.find((row) => row.id === 'administration')?.running).toBe(true);
    expect(rows.find((row) => row.id === 'academics')?.running).toBe(false);
  });

  it('carries the name the registry holds, and the version', () => {
    const [row] = describeModules(registryOf([ACADEMICS], ['academics']));

    expect(row.name).toBe('navigation:academics.title');
    expect(row.version).toBe('1.2.0');
  });

  it('lists what a module cannot run without apart from what it can use when it is there', () => {
    const rows = describeModules(registryOf([ADMINISTRATION, ACADEMICS], ['administration', 'academics']));
    const academics = rows.find((row) => row.id === 'academics');

    expect(academics?.requires).toEqual(['administration']);
    expect(academics?.optional).toEqual(['finance']);
  });

  it('counts a dependency marked not required, and a bare module id, in the right list', () => {
    const [row] = describeModules(
      registryOf(
        [
          {
            id: 'reports',
            name: 'navigation:reports.title',
            version: '1.0.0',
            dependencies: [{ moduleId: 'academics', version: '^1.0.0', required: false }],
          },
        ],
        ['reports']
      )
    );

    expect(row.requires).toEqual([]);
    expect(row.optional).toEqual(['academics']);
  });

  it('lists the modules that need or can use a module', () => {
    const rows = describeModules(registryOf([ADMINISTRATION, ACADEMICS], ['administration', 'academics']));

    expect(rows.find((row) => row.id === 'administration')?.usedBy).toEqual(['academics']);
    expect(rows.find((row) => row.id === 'academics')?.usedBy).toEqual([]);
  });

  it('lists the modules in alphabetical order of their ids, however the registry holds them', () => {
    const rows = describeModules(registryOf([ACADEMICS, ADMINISTRATION], []));

    expect(rows.map((row) => row.id)).toEqual(['academics', 'administration']);
  });

  it('gives a module with no dependencies empty lists', () => {
    const [row] = describeModules(registryOf([ADMINISTRATION], ['administration']));

    expect(row.requires).toEqual([]);
    expect(row.optional).toEqual([]);
  });
});

describe('countModules', () => {
  it('counts the modules, the ones running, and the ones with a dependency problem', () => {
    // Academics needs administration, which is not running: one module has a problem.
    const counts = countModules(registryOf([ADMINISTRATION, ACADEMICS], ['academics']));

    expect(counts).toEqual({ total: 2, running: 1, withProblems: 1 });
  });

  it('finds no problem when every module has what it needs', () => {
    const counts = countModules(registryOf([ADMINISTRATION, ACADEMICS], ['administration', 'academics']));

    expect(counts).toEqual({ total: 2, running: 2, withProblems: 0 });
  });
});

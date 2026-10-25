// ABOUTME: The Modules tab shows the modules this installation runs - running or not, what each needs and what needs it - and
// ABOUTME: the problems the dependency check finds. It offers no toggle: turning a module off was never connected to anything.

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ModuleMetadata } from '@/core/types';

const NAMES: Readonly<Record<string, string>> = {
  'navigation:administration.title': 'Administration',
  'navigation:academics.title': 'Academics',
  'navigation:finance.title': 'Finance',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => NAMES[key] ?? (typeof fallback === 'string' ? fallback : key),
  }),
}));

import { ModulesTab } from '../ModulesTab';

const ADMINISTRATION: ModuleMetadata = { id: 'administration', name: 'navigation:administration.title', version: '1.0.0' };
const ACADEMICS: ModuleMetadata = {
  id: 'academics',
  name: 'navigation:academics.title',
  version: '1.2.0',
  dependencies: [{ moduleId: 'administration', version: '^1.0.0', required: true }],
  optionalDependencies: [{ moduleId: 'finance', version: '^1.0.0', required: false }],
};
const FINANCE: ModuleMetadata = { id: 'finance', name: 'navigation:finance.title', version: '1.0.0' };

const registryOf = (modules: ModuleMetadata[], enabled: string[]) => ({
  getAllMetadata: () => modules,
  getEnabledModules: () => enabled,
  getMetadata: (id: string) => modules.find((module) => module.id === id),
});

const renderTab = (modules: ModuleMetadata[], enabled: string[]) => render(<ModulesTab registry={registryOf(modules, enabled)} />);

const row = (id: string) => screen.getByTestId(`module-${id}`);

describe('the Modules tab', () => {
  it('shows a row for each module, with its translated name and its version', () => {
    renderTab([ADMINISTRATION, ACADEMICS, FINANCE], ['administration', 'academics', 'finance']);

    expect(within(row('academics')).getByText('Academics')).toBeTruthy();
    expect(within(row('academics')).getByText('v1.2.0')).toBeTruthy();
    expect(screen.getAllByTestId(/^module-/)).toHaveLength(3);
  });

  it('names a module by its id when its name has no translation', () => {
    renderTab([{ id: 'todos', name: 'navigation:todos.title', version: '1.0.0' }], ['todos']);

    expect(within(row('todos')).getByText('Todos')).toBeTruthy();
  });

  it('says which modules are running and which are not', () => {
    renderTab([ADMINISTRATION, ACADEMICS], ['administration']);

    expect(within(row('administration')).getByText('Running')).toBeTruthy();
    expect(within(row('academics')).getByText('Not running')).toBeTruthy();
  });

  it('lists what a module needs, and marks what it can do without', () => {
    renderTab([ADMINISTRATION, ACADEMICS, FINANCE], ['administration', 'academics', 'finance']);

    const needs = within(row('academics')).getByTestId('needs').textContent;
    expect(needs).toContain('Administration');
    expect(needs).toContain('Finance (optional)');
  });

  it('lists the modules that need a module', () => {
    renderTab([ADMINISTRATION, ACADEMICS], ['administration', 'academics']);

    expect(within(row('administration')).getByTestId('used-by').textContent).toContain('Academics');
  });

  it('says every module has what it needs when the dependency check finds nothing wrong', () => {
    renderTab([ADMINISTRATION, ACADEMICS], ['administration', 'academics']);

    expect(screen.getByText(/every module has what it needs/i)).toBeTruthy();
    expect(screen.queryByTestId('dependency-problems')).toBeNull();
  });

  it('lists the problems the dependency check finds, against the module that has them', () => {
    renderTab([ADMINISTRATION, ACADEMICS], ['academics']);

    const problems = screen.getByTestId('dependency-problems');
    expect(within(problems).getByText('Academics')).toBeTruthy();
    expect(problems.textContent).toContain("Required dependency 'administration' not found");
  });

  it('counts the modules, the ones running, and the ones with a problem', () => {
    renderTab([ADMINISTRATION, ACADEMICS, FINANCE], ['academics', 'finance']);

    expect(screen.getByTestId('count-modules').textContent).toBe('3');
    expect(screen.getByTestId('count-running').textContent).toBe('2');
    expect(screen.getByTestId('count-problems').textContent).toBe('1');
  });

  it('says plainly that turning a module on or off is not available yet', () => {
    renderTab([ADMINISTRATION], ['administration']);

    expect(screen.getByText(/not available yet/i)).toBeTruthy();
  });

  it('offers no control that claims to change which modules run', () => {
    renderTab([ADMINISTRATION, ACADEMICS], ['administration', 'academics']);

    expect(screen.queryAllByRole('button')).toEqual([]);
    expect(screen.queryAllByRole('switch')).toEqual([]);
    expect(screen.queryAllByRole('checkbox')).toEqual([]);
  });
});

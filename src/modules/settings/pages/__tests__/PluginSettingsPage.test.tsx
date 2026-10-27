// ABOUTME: The Plugins tab lists the installed plugins and does what the plugin manager can do: switch one on or off, and keep
// ABOUTME: its settings. It has no marketplace, no policy form and no tab strip - none of them reached the plugin manager.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import type { LoadedPlugin } from '@/plugins/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const state = vi.hoisted(() => ({
  plugins: [] as unknown[],
  saved: {} as Record<string, Record<string, unknown>>,
  activatePlugin: vi.fn(async () => undefined),
  deactivatePlugin: vi.fn(async () => undefined),
  unloadPlugin: vi.fn(async () => undefined),
  setPluginSetting: vi.fn(async () => undefined),
}));

vi.mock('@/plugins/usePlugins', () => ({
  usePlugins: () => ({
    plugins: state.plugins,
    activePlugins: (state.plugins as LoadedPlugin[]).filter((plugin) => plugin.status === 'active'),
    activatePlugin: state.activatePlugin,
    deactivatePlugin: state.deactivatePlugin,
    unloadPlugin: state.unloadPlugin,
    getPluginSettings: (id: string) => state.saved[id] ?? {},
    setPluginSetting: state.setPluginSetting,
  }),
}));

const access = vi.hoisted(() => ({ mayManage: true }));

vi.mock('../../hooks/useSettingsAccess', () => ({
  useSettingsAccess: () => ({
    can: () => access.mayManage,
    canAny: () => access.mayManage,
  }),
}));

import { PluginSettingsContent } from '../PluginSettingsPage';

/** A plugin as the manager holds it. Only what the page reads is filled in. */
const FEE_CALCULATOR = {
  manifest: {
    id: 'fee-calculator',
    name: 'Fee Calculator',
    version: '1.2.0',
    description: 'Works out what a learner owes',
    type: 'engine',
    entry: 'index.js',
    settings: [
      { key: 'useWasm', label: 'Use WebAssembly', type: 'boolean', defaultValue: false },
      { key: 'taxRate', label: 'Tax rate', type: 'number', defaultValue: 16 },
      {
        key: 'paymentTerms',
        label: 'Payment terms',
        type: 'select',
        defaultValue: 'termly',
        options: [
          { label: 'Termly', value: 'termly' },
          { label: 'Annual', value: 'annual' },
        ],
      },
      { key: 'appName', label: 'App name', type: 'string', defaultValue: 'SchoolPilot' },
      { key: 'logoLight', label: 'Light logo', type: 'file' },
    ],
  },
  status: 'active',
  source: 'builtin',
  loadedAt: new Date(),
} as unknown as LoadedPlugin;

const EXTRA_THEME = {
  manifest: {
    id: 'extra-theme',
    name: 'Extra Theme',
    version: '0.1.0',
    type: 'theme',
    entry: 'theme.js',
    privileges: { networkAccess: true, dataRead: ['students'] },
  },
  status: 'inactive',
  source: 'local',
  loadedAt: new Date(),
} as unknown as LoadedPlugin;

const renderTab = () =>
  render(
    <ConfirmProvider>
      <PluginSettingsContent />
    </ConfirmProvider>
  );

const rowOf = (id: string) => screen.getByTestId(`plugin-${id}`);

/** Opens the details panel of a plugin from the Info menu of its row. */
const openDetails = (id: string) => {
  fireEvent.click(within(rowOf(id)).getByTitle('Info'));
  fireEvent.click(screen.getByRole('button', { name: 'Details' }));
};

beforeEach(() => {
  access.mayManage = true;
  state.plugins = [FEE_CALCULATOR, EXTRA_THEME];
  state.saved = {};
  state.activatePlugin.mockClear();
  state.deactivatePlugin.mockClear();
  state.unloadPlugin.mockClear();
  state.setPluginSetting.mockClear();
});

describe('the Plugins tab', () => {
  it('lists the installed plugins', () => {
    renderTab();

    expect(screen.getByText('Fee Calculator')).toBeTruthy();
    expect(screen.getByText('Extra Theme')).toBeTruthy();
  });

  it('has no marketplace, no policy form and no tab strip of its own', () => {
    renderTab();

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText(/marketplace/i)).toBeNull();
    expect(screen.queryByText(/unsigned/i)).toBeNull();
    expect(screen.queryByText(/sandbox/i)).toBeNull();
  });

  it('switches a plugin off, and another on', () => {
    renderTab();

    fireEvent.change(screen.getByLabelText('Fee Calculator status'), { target: { value: 'off' } });
    expect(state.deactivatePlugin).toHaveBeenCalledWith('fee-calculator');

    fireEvent.change(screen.getByLabelText('Extra Theme status'), { target: { value: 'on' } });
    expect(state.activatePlugin).toHaveBeenCalledWith('extra-theme');
  });

  it('offers on a plugin row only controls that do something', () => {
    renderTab();

    const buttons = within(rowOf('fee-calculator')).getAllByRole('button');
    expect(buttons.map((button) => button.textContent?.trim() || button.getAttribute('title'))).toEqual(['Config', 'Info']);
  });

  it('offers Details in the Info menu, and Uninstall only for a plugin that is not built in', () => {
    renderTab();

    fireEvent.click(within(rowOf('fee-calculator')).getByTitle('Info'));
    expect(screen.getByRole('button', { name: 'Details' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Uninstall' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'README' })).toBeNull();
  });

  it('offers Uninstall for a plugin that is not built in', () => {
    renderTab();

    fireEvent.click(within(rowOf('extra-theme')).getByTitle('Info'));
    expect(screen.getByRole('button', { name: 'Uninstall' })).toBeTruthy();
  });
});

describe('the Plugins tab for someone who may not manage plugins', () => {
  beforeEach(() => {
    access.mayManage = false;
  });

  it('shows the plugins and says they cannot be changed', () => {
    renderTab();

    expect(screen.getByText('Fee Calculator')).toBeTruthy();
    expect(screen.getByText(/ask an administrator/i)).toBeTruthy();
  });

  it('leaves the on and off switches in place but disabled', () => {
    renderTab();

    expect((screen.getByLabelText('Fee Calculator status') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText('Extra Theme status') as HTMLSelectElement).disabled).toBe(true);
  });

  it('does not offer Uninstall', () => {
    renderTab();

    fireEvent.click(within(rowOf('extra-theme')).getByTitle('Info'));
    expect(screen.queryByRole('button', { name: 'Uninstall' })).toBeNull();
  });

  it('shows the settings of a plugin without letting them be changed', () => {
    renderTab();
    fireEvent.click(within(rowOf('fee-calculator')).getByRole('button', { name: 'Config' }));

    expect((screen.getByLabelText('Tax rate') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Use WebAssembly') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Payment terms') as HTMLSelectElement).disabled).toBe(true);
  });

  it('disables Enable in the details of a plugin that is off', () => {
    renderTab();
    openDetails('extra-theme');

    expect((screen.getByRole('button', { name: 'Enable' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('the details of a plugin', () => {
  it('shows its settings with the defaults the plugin declares', () => {
    renderTab();
    fireEvent.click(within(rowOf('fee-calculator')).getByRole('button', { name: 'Config' }));

    expect((screen.getByLabelText('Tax rate') as HTMLInputElement).value).toBe('16');
    expect((screen.getByLabelText('App name') as HTMLInputElement).value).toBe('SchoolPilot');
    expect((screen.getByLabelText('Payment terms') as HTMLSelectElement).value).toBe('termly');
    expect((screen.getByLabelText('Use WebAssembly') as HTMLInputElement).checked).toBe(false);
  });

  it('shows a setting as it was saved, in place of the default', () => {
    state.saved = { 'fee-calculator': { taxRate: 18, useWasm: true } };
    renderTab();
    fireEvent.click(within(rowOf('fee-calculator')).getByRole('button', { name: 'Config' }));

    expect((screen.getByLabelText('Tax rate') as HTMLInputElement).value).toBe('18');
    expect((screen.getByLabelText('Use WebAssembly') as HTMLInputElement).checked).toBe(true);
  });

  it('saves a switch the moment it is switched', async () => {
    renderTab();
    fireEvent.click(within(rowOf('fee-calculator')).getByRole('button', { name: 'Config' }));

    fireEvent.click(screen.getByLabelText('Use WebAssembly'));

    await waitFor(() => expect(state.setPluginSetting).toHaveBeenCalledWith('fee-calculator', 'useWasm', true));
  });

  it('saves a number when the field is left, as a number', async () => {
    renderTab();
    fireEvent.click(within(rowOf('fee-calculator')).getByRole('button', { name: 'Config' }));

    const field = screen.getByLabelText('Tax rate');
    fireEvent.change(field, { target: { value: '18' } });
    expect(state.setPluginSetting).not.toHaveBeenCalled();
    fireEvent.blur(field);

    await waitFor(() => expect(state.setPluginSetting).toHaveBeenCalledWith('fee-calculator', 'taxRate', 18));
  });

  it('does not save a number field that was left empty or is not a number', async () => {
    renderTab();
    fireEvent.click(within(rowOf('fee-calculator')).getByRole('button', { name: 'Config' }));

    const field = screen.getByLabelText('Tax rate');
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.blur(field);

    expect(state.setPluginSetting).not.toHaveBeenCalled();
  });

  it('saves the choice made in a list', async () => {
    renderTab();
    fireEvent.click(within(rowOf('fee-calculator')).getByRole('button', { name: 'Config' }));

    fireEvent.change(screen.getByLabelText('Payment terms'), { target: { value: 'annual' } });

    await waitFor(() => expect(state.setPluginSetting).toHaveBeenCalledWith('fee-calculator', 'paymentTerms', 'annual'));
  });

  it('saves text when the field is left', async () => {
    renderTab();
    fireEvent.click(within(rowOf('fee-calculator')).getByRole('button', { name: 'Config' }));

    const field = screen.getByLabelText('App name');
    fireEvent.change(field, { target: { value: 'Hillside' } });
    fireEvent.blur(field);

    await waitFor(() => expect(state.setPluginSetting).toHaveBeenCalledWith('fee-calculator', 'appName', 'Hillside'));
  });

  it('says a setting it cannot edit here cannot be changed, and draws no control for it', () => {
    renderTab();
    fireEvent.click(within(rowOf('fee-calculator')).getByRole('button', { name: 'Config' }));

    expect(screen.queryByLabelText('Light logo')).toBeNull();
    expect(screen.getByText('Light logo')).toBeTruthy();
    expect(screen.getByText(/not editable here yet/i)).toBeTruthy();
  });

  it('has no Discussion button and no README placeholder', () => {
    renderTab();
    fireEvent.click(within(rowOf('fee-calculator')).getByRole('button', { name: 'Config' }));

    expect(screen.queryByText('Discussion')).toBeNull();
    expect(screen.queryByText(/will be displayed here/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /readme/i })).toBeNull();
  });

  it('enables an installed plugin that is off, and calls it Enable, not Install', () => {
    renderTab();
    openDetails('extra-theme');

    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));

    expect(state.activatePlugin).toHaveBeenCalledWith('extra-theme');
  });

  it('lists the access a plugin declares', () => {
    renderTab();
    openDetails('extra-theme');

    expect(screen.getByText('Can use the network')).toBeTruthy();
    expect(screen.getByText('Reads: students')).toBeTruthy();
  });

  it('says a plugin that declares no access declares none, rather than that none is needed', () => {
    renderTab();
    fireEvent.click(within(rowOf('fee-calculator')).getByRole('button', { name: 'Config' }));

    expect(screen.getByText(/declares no special access/i)).toBeTruthy();
  });
});

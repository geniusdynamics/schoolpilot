// ABOUTME: The Features tab offers the switches that change something the user sees: the two header indicators, the
// ABOUTME: connection notices and the performance monitor. A flag nothing reads is not offered, and a switch writes only its own flag.

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const updateConfig = vi.fn();
let features: Record<string, unknown> = {};
let mayManage = true;

vi.mock('@/hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: () => ({ config: { features }, updateConfig }),
}));

vi.mock('../../hooks/useSettingsAccess', () => ({
  useSettingsAccess: () => ({
    can: (permission: string) => mayManage && permission === 'settings.manage',
    canAny: () => mayManage,
  }),
}));

import { FeaturesTab } from '../FeaturesTab';

beforeEach(() => {
  updateConfig.mockReset();
  mayManage = true;
  features = {
    networkStatusIndicator: true,
    moduleHealthIndicator: false,
    globalNotifications: true,
    performanceMonitorWidget: false,
    // Flags nothing reads: they must not be offered.
    enableAuditLog: true,
    syncStatusComponent: false,
    advancedErrorBoundaries: true,
  };
});

const NAMES = [
  'Network status in the header',
  'Module health in the header',
  'Connection and sync notices',
  'Performance monitor',
];

describe('the Features tab', () => {
  it('offers the four switches that change something the user sees, and no others', () => {
    render(<FeaturesTab />);

    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    for (const name of NAMES) {
      expect(screen.getByRole('checkbox', { name })).toBeTruthy();
    }
  });

  it('does not offer a flag that nothing reads', () => {
    render(<FeaturesTab />);

    expect(screen.queryByText(/audit/i)).toBeNull();
    expect(screen.queryByText(/error boundar/i)).toBeNull();
    expect(screen.queryByText(/sync status/i)).toBeNull();
  });

  it('shows each switch as the configuration has it', () => {
    render(<FeaturesTab />);

    expect((screen.getByRole('checkbox', { name: NAMES[0] }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: NAMES[1] }) as HTMLInputElement).checked).toBe(false);
  });

  it('says in a line what each switch does', () => {
    render(<FeaturesTab />);

    expect(screen.getByText(/whether this device is online/i)).toBeTruthy();
    expect(screen.getByText(/how the app is performing/i)).toBeTruthy();
  });

  it('writes only the flag that was switched, leaving the others as they were', () => {
    render(<FeaturesTab />);

    fireEvent.click(screen.getByRole('checkbox', { name: NAMES[1] }));

    expect(updateConfig).toHaveBeenCalledTimes(1);
    expect(updateConfig).toHaveBeenCalledWith({
      features: { ...features, moduleHealthIndicator: true },
    });
  });

  it('switches a flag off as well as on', () => {
    render(<FeaturesTab />);

    fireEvent.click(screen.getByRole('checkbox', { name: NAMES[0] }));

    expect(updateConfig).toHaveBeenCalledWith({
      features: { ...features, networkStatusIndicator: false },
    });
  });

  it('lets someone who may not manage settings read the switches but not change them', () => {
    mayManage = false;
    render(<FeaturesTab />);

    for (const name of NAMES) {
      expect((screen.getByRole('checkbox', { name }) as HTMLInputElement).disabled).toBe(true);
    }
    expect(screen.getByText(/ask an administrator/i)).toBeTruthy();
  });
});

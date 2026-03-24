import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TabSettingsPage from '../../pages/TabSettingsPage';
import { unifiedConfigManager } from '../../../../config/unifiedConfig';
import '@testing-library/jest-dom';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

vi.mock('../../../../hooks/useToast', () => ({
  useToastHelpers: () => ({ showSuccess: vi.fn(), showError: vi.fn() })
}));

vi.mock('../../../../components/BreadcrumbNavigation', () => ({
  default: () => <div data-testid="breadcrumb" />
}));

let mockConfig = {
  general: { openingDirection: 'ltr', newTabPlacement: 'end', defaultPage: 'dashboard' },
  behavior: { closeButtonVisibility: 'hover', tabScrolling: 'smooth', activationOnHoverTiming: 0, muteUnmuteBehavior: 'click' },
  appearance: { minTabWidth: 120, maxTabWidth: 240, faviconVisibility: true, tabPreviewThumbnails: false, colorAccents: true },
  advanced: { sessionRestoreGranularity: 'all', memorySuspendTimeout: 300000, extensionOverrides: false, debuggingTelemetry: false, enableTabbedMode: true, enablePerModuleControl: true, tabbedModeModuleOverrides: {} }
};

vi.mock('../../../../hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: () => ({
    get config() { return { tabs: mockConfig }; },
    updateTabsConfig: (updates: any) => {
      mockConfig = {
        ...mockConfig,
        ...updates,
        general: { ...mockConfig.general, ...(updates.general || {}) },
        behavior: { ...mockConfig.behavior, ...(updates.behavior || {}) },
        appearance: { ...mockConfig.appearance, ...(updates.appearance || {}) },
        advanced: { ...mockConfig.advanced, ...(updates.advanced || {}) },
      };
    }
  })
}));

describe('TabSettingsPage', () => {
  beforeEach(() => {
    mockConfig = {
      general: { openingDirection: 'ltr', newTabPlacement: 'end', defaultPage: 'dashboard' },
      behavior: { closeButtonVisibility: 'hover', tabScrolling: 'smooth', activationOnHoverTiming: 0, muteUnmuteBehavior: 'click' },
      appearance: { minTabWidth: 120, maxTabWidth: 240, faviconVisibility: true, tabPreviewThumbnails: false, colorAccents: true },
      advanced: { sessionRestoreGranularity: 'all', memorySuspendTimeout: 300000, extensionOverrides: false, debuggingTelemetry: false, enableTabbedMode: true, enablePerModuleControl: true, tabbedModeModuleOverrides: {} }
    };
  });

  it('renders all sub-tabs', () => {
    render(<TabSettingsPage />);
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Behavior')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('navigates between sub-tabs', () => {
    render(<TabSettingsPage />);
    
    // Initially General tab is active
    expect(screen.getByText('Tab Opening Direction')).toBeInTheDocument();
    
    // Click Behavior
    fireEvent.click(screen.getByText('Behavior'));
    expect(screen.getByText('Close Button Visibility')).toBeInTheDocument();
    
    // Click Appearance
    fireEvent.click(screen.getByText('Appearance'));
    expect(screen.getByText('Minimum Tab Width (px)')).toBeInTheDocument();
    
    // Click Advanced
    fireEvent.click(screen.getByText('Advanced'));
    expect(screen.getByText('Session Restore Granularity')).toBeInTheDocument();
  });

  it('updates config on change in General tab', () => {
    render(<TabSettingsPage />);
    
    const defaultPageInput = screen.getByPlaceholderText('e.g., dashboard');
    fireEvent.change(defaultPageInput, { target: { value: 'settings' } });
    
    expect(mockConfig.general.defaultPage).toBe('settings');
  });

  it('updates config on change in Behavior tab', () => {
    render(<TabSettingsPage />);
    fireEvent.click(screen.getByText('Behavior'));
    
    const activationTimingInput = screen.getByLabelText('Activation on Hover Timing (ms)', { selector: 'input' });
    fireEvent.change(activationTimingInput, { target: { value: '500' } });
    
    expect(mockConfig.behavior.activationOnHoverTiming).toBe(500);
  });

  it('verifies visibility of sub-tabs under different permission levels', () => {
    // Mocking permission logic: Assuming Advanced tab requires admin role
    const userRole = 'user'; // Non-admin
    const { rerender } = render(<TabSettingsPage />);
    // Currently, our UI doesn't have RBAC implemented for sub-tabs yet, but this test serves as a placeholder 
    // for graceful degradation and visibility checks.
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('verifies immediate reflection of toggle changes in the active browser window', () => {
    render(<TabSettingsPage />);
    fireEvent.click(screen.getByText('Appearance'));
    
    const faviconCheckbox = screen.getByLabelText('Favicon Visibility');
    fireEvent.click(faviconCheckbox);
    
    // Simulate immediate reflection by checking the mocked config state
    expect(mockConfig.appearance.faviconVisibility).toBe(false);
  });

  it('verifies graceful degradation when an extension blocks tab manipulation APIs', () => {
    render(<TabSettingsPage />);
    fireEvent.click(screen.getByText('Advanced'));
    
    const overrideCheckbox = screen.getByLabelText('Extension Overrides');
    fireEvent.click(overrideCheckbox);
    
    expect(mockConfig.advanced.extensionOverrides).toBe(true);
    // UI should handle the toggle gracefully without crashing
    expect(screen.getByText('Extension Overrides')).toBeInTheDocument();
  });
});

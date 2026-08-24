import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPopup from '../SettingsPopup';

const openTabMock = vi.fn();

vi.mock('../HookErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HookErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../ModuleLoadingFallback', () => ({
  SettingsSkeleton: () => <div>settings-loading</div>
}));

vi.mock('../../hooks/useDynamicNavigation', () => ({
  useDynamicNavigation: () => ({
    isLoading: false,
    navigationItems: [
      {
        name: 'navigation:settings.title',
        path: '/settings',
        modulePath: '/settings',
        isGroup: true,
        children: [
          { name: 'settings.features', path: '/settings/features', icon: () => null },
          { name: 'settings.database', path: '/settings/database', icon: () => null }
        ]
      }
    ]
  })
}));

vi.mock('../../hooks/tabs', () => ({
  useTabs: () => ({
    openTab: openTabMock
  })
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe('SettingsPopup navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens a tab for selected settings route and closes popup', () => {
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <SettingsPopup open={true} onClose={onClose} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /settings.features/i }));

    expect(openTabMock).toHaveBeenCalledWith('/settings/features', { pinned: false });
    expect(onClose).toHaveBeenCalled();
  });
});

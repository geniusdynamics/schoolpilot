
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrimarySidebar from '../PrimarySidebar';
import SecondarySidebar from '../SecondarySidebar';
import { FullWidthProvider } from '../../contexts/FullWidthContext';

// SecondarySidebar calls useFullWidth(); this file imports RTL's render
// directly (bypassing the global provider wrapper), so wrap renders here.
const render = (ui: React.ReactElement, options?: Parameters<typeof rtlRender>[1]) =>
  rtlRender(<FullWidthProvider>{ui}</FullWidthProvider>, options);

vi.mock('../../hooks/useDynamicNavigation', () => ({
  useDynamicNavigation: () => ({
    isLoading: false,
    navigationItems: [
      {
        name: 'navigation:settings.title',
        path: '/settings',
        modulePath: '/settings',
        isGroup: true,
        icon: () => null,
        children: [
          { name: 'settings.features', path: '/settings/features', icon: () => null },
          { name: 'settings.database', path: '/settings/database', icon: () => null }
        ]
      }
    ]
  })
}));

vi.mock('../../hooks/useRBAC', () => ({
  useRBAC: () => ({
    accessibleModules: ['settings'],
    hasModuleAccess: () => true
  })
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' }
  })
}));

vi.mock('../../hooks/useTabNavigation', () => ({
  useTabNavigation: () => ({
    navigateToTab: vi.fn().mockResolvedValue({ tabId: 't1', wasCreated: true })
  })
}));

vi.mock('../../hooks/useToast', () => ({
  useToastHelpers: () => ({
    showInfo: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn()
  })
}));

vi.mock('../../i18n/i18n', () => ({
  i18nReady: true
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  })
}));

describe('Primary and Secondary navigation integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits canonical module id from primary module click', () => {
    const onModuleSelect = vi.fn();

    render(
      <MemoryRouter>
        <PrimarySidebar selectedModuleKey="" onModuleSelect={onModuleSelect} />
      </MemoryRouter>
    );

    const moduleButton = screen.getByRole('button', { name: 'settings.title' });
    fireEvent.click(moduleButton);

    expect(onModuleSelect).toHaveBeenCalledWith('settings');
  });

  it('renders submenu when selected module key is canonical id', () => {
    render(
      <MemoryRouter>
        <SecondarySidebar selectedModuleKey="settings" isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('settings.features')).toBeInTheDocument();
    expect(screen.getByText('settings.database')).toBeInTheDocument();
  });
});

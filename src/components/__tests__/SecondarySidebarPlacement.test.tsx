// ABOUTME: A docked secondary sidebar starts below the header; it does not paint over the header's leading edge,
// ABOUTME: where the school name and logo - the way back to the main dashboard - are. A narrow screen's drawer overlays.
//
// The fault this pins down: the sidebar was `fixed top-0` at the same stacking level as the header and
// rendered after it, so it covered the header's left 208px. The brand sat half under it, with the sidebar's
// Minimize and Close buttons on top of the name, and a click on it landed on those buttons. jsdom has no
// layout, so this holds the cause - where the sidebar starts - and the real-browser check
// (tests/e2e/module-dashboards-brand.spec.ts) holds the effect, that nothing covers the brand.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render as rtlRender } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import SecondarySidebar from '../SecondarySidebar';
import { FullWidthProvider } from '../../contexts/FullWidthContext';

vi.mock('../../hooks/useDynamicNavigation', () => ({
  useDynamicNavigation: () => ({
    isLoading: false,
    navigationItems: [
      {
        name: 'navigation:administration.title',
        path: '/administration',
        modulePath: '/administration',
        isGroup: true,
        icon: () => null,
        children: [
          { name: 'Admin Dashboard', path: '/administration', icon: () => null },
          { name: 'Staff', path: '/administration/staff', icon: () => null },
        ],
      },
    ],
  }),
}));

vi.mock('../../hooks/useRBAC', () => ({
  useRBAC: () => ({ accessibleModules: ['administration'], hasModuleAccess: () => true }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('../../hooks/useTabNavigation', () => ({
  useTabNavigation: () => ({ navigateToTab: vi.fn().mockResolvedValue({ tabId: 't1' }) }),
}));

vi.mock('../../hooks/useToast', () => ({
  useToastHelpers: () => ({ showInfo: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));

vi.mock('../../i18n/i18n', () => ({ i18nReady: true }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

const setViewportWidth = (width: number) =>
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });

const renderSidebar = () =>
  rtlRender(
    <FullWidthProvider>
      <MemoryRouter initialEntries={['/administration']}>
        <SecondarySidebar selectedModuleKey="administration" isOpen onClose={vi.fn()} />
      </MemoryRouter>
    </FullWidthProvider>
  );

const sidebarElement = (container: HTMLElement): Element => {
  const aside = container.querySelector('#secondary-sidebar');
  if (!aside) throw new Error('the secondary sidebar did not render');
  return aside;
};

describe('where the secondary sidebar starts', () => {
  const originalWidth = window.innerWidth;

  beforeEach(() => {
    setViewportWidth(originalWidth);
  });

  it('starts below the header on a desktop, running down to the bottom of the screen', () => {
    setViewportWidth(1440);
    const { classList } = sidebarElement(renderSidebar().container);

    // 3rem is the header's 48px: the sidebar begins where the header ends.
    expect(classList.contains('top-12')).toBe(true);
    expect(classList.contains('bottom-0')).toBe(true);
    expect(classList.contains('top-0')).toBe(false);
    // Full screen height from a lower start would run off the bottom of the screen.
    expect(classList.contains('h-screen')).toBe(false);
  });

  it('is an overlay drawer from the top of the screen on a narrow one', () => {
    setViewportWidth(800);
    const { classList } = sidebarElement(renderSidebar().container);

    // A drawer covers what is behind it by nature, the header included; it is closed to reach the brand.
    expect(classList.contains('top-0')).toBe(true);
    expect(classList.contains('h-screen')).toBe(true);
    expect(classList.contains('top-12')).toBe(false);
  });
});

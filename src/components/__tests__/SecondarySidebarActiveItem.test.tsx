// ABOUTME: The secondary sidebar highlights exactly one item - the longest route match across the
// ABOUTME: whole tree - and a minimize the user asked for survives the viewport's own rule.
//
// Two faults this pins down. The active item used to be decided inside a sibling list, so a module's
// dashboard (a top-level item) and the page you are on (often a child of a group) never met as
// siblings and both were highlighted. And the resize handler was rebuilt whenever the minimized flag
// changed, so the effect that applies the viewport's default re-ran on the click and undid it.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import SecondarySidebar from '../SecondarySidebar';
import { FullWidthProvider } from '../../contexts/FullWidthContext';

const render = (ui: React.ReactElement, options?: Parameters<typeof rtlRender>[1]) =>
  rtlRender(<FullWidthProvider>{ui}</FullWidthProvider>, options);

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
          // The module's dashboard: a top-level item in this sidebar, whose path is a prefix of
          // every page in the module.
          { name: 'Admin Dashboard', path: '/administration', icon: () => null },
          // The page the user is on: a child of a group, so a different sibling list entirely.
          {
            name: 'People',
            path: '/administration/people',
            isGroup: true,
            icon: () => null,
            children: [{ name: 'Staff', path: '/administration/staff', icon: () => null }],
          },
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

/** The items the sidebar paints as active: the marker its own class list carries. */
const activeItems = () =>
  screen
    .getAllByRole('button')
    .filter((button) => {
      const className = button.className ?? '';
      return className.includes('font-semibold') && className.includes('border-2');
    })
    .map((button) => button.textContent ?? '');

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SecondarySidebar selectedModuleKey="administration" isOpen onClose={vi.fn()} />
    </MemoryRouter>
  );

describe('the secondary sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom's default 1024px lands in the band where the sidebar renders minimized, which collapses
    // the groups - and a collapsed group has no children to be active.
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1440 });
  });

  it('highlights the page, not the module dashboard whose path is a prefix of it', () => {
    renderAt('/administration/staff');
    // The group has to be open for its child to be on screen, which is the state the report showed.
    fireEvent.click(screen.getByText('People'));

    const active = activeItems();
    expect(active).toHaveLength(1);
    expect(active[0]).toContain('Staff');
  });

  it('keeps a minimize the user asked for, on a viewport whose rule says expanded', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1440 });

    try {
      renderAt('/administration');

      // The viewport's default is expanded at this width.
      expect(screen.getByTitle('Minimize menu')).toBeInTheDocument();

      fireEvent.click(screen.getByTitle('Minimize menu'));

      // The click stands: the width rule must not undo it on the next pass.
      expect(screen.getByTitle('Expand menu')).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalWidth,
      });
    }
  });
});

// ABOUTME: Tests for showInModes filtering in useSecondarySidebar
// ABOUTME: Ensures sidebar shows correct items per layout mode (standard vs fullwidth)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSecondarySidebar } from '../useSecondarySidebar';

// Mock dependencies
vi.mock('@/contexts/FullWidthContext', () => ({
  useFullWidth: vi.fn(),
}));

vi.mock('../useDynamicNavigation', () => ({
  useDynamicNavigation: vi.fn(),
}));

vi.mock('../useRBAC', () => ({
  useRBAC: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../useTabNavigation', () => ({
  useTabNavigation: vi.fn(),
}));

vi.mock('../useToast', () => ({
  useToastHelpers: vi.fn(),
}));

vi.mock('../useFavorites', () => ({
  useFavorites: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

import { useFullWidth } from '@/contexts/FullWidthContext';
import { useDynamicNavigation } from '../useDynamicNavigation';
import { useRBAC } from '../useRBAC';
import { useAuth } from '@/contexts/AuthContext';
import { useTabNavigation } from '../useTabNavigation';
import { useToastHelpers } from '../useToast';
import { useFavorites } from '../useFavorites';

const mockUseFullWidth = vi.mocked(useFullWidth);
const mockUseDynamicNavigation = vi.mocked(useDynamicNavigation);
const mockUseRBAC = vi.mocked(useRBAC);
const mockUseAuth = vi.mocked(useAuth);
const mockUseTabNavigation = vi.mocked(useTabNavigation);
const mockUseToastHelpers = vi.mocked(useToastHelpers);
const mockUseFavorites = vi.mocked(useFavorites);

describe('useSecondarySidebar - mode filtering', () => {
  const defaultOptions = {
    selectedModuleKey: 'administration',
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseFullWidth.mockReturnValue({ isFullWidth: false, toggleFullWidth: vi.fn(), enableFullWidth: vi.fn(), disableFullWidth: vi.fn(), isSecondaryAsPrimary: false, setSecondaryAsPrimary: vi.fn() });
    mockUseDynamicNavigation.mockReturnValue({
      navigationItems: [],
      isLoading: false,
    } as any);
    mockUseRBAC.mockReturnValue({
      hasModuleAccess: vi.fn(() => true),
      accessibleModules: ['administration'],
    } as any);
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } } as any);
    mockUseTabNavigation.mockReturnValue({
      navigateToTab: vi.fn(),
    } as any);
    mockUseToastHelpers.mockReturnValue({
      showInfo: vi.fn(),
      showError: vi.fn(),
      showWarning: vi.fn(),
    } as any);
    mockUseFavorites.mockReturnValue({
      favorites: [],
      reorderFavorites: vi.fn(),
    } as any);
  });

  it('shows only standard-mode items when isFullWidth is false', () => {
    mockUseFullWidth.mockReturnValue({ isFullWidth: false, toggleFullWidth: vi.fn(), enableFullWidth: vi.fn(), disableFullWidth: vi.fn(), isSecondaryAsPrimary: false, setSecondaryAsPrimary: vi.fn() });
    mockUseDynamicNavigation.mockReturnValue({
      navigationItems: [
        {
          name: 'Administration',
          modulePath: '/administration',
          isGroup: true,
          children: [
            { name: 'Hub', path: '/administration/hub', showInModes: ['standard', 'fullwidth'] },
            { name: 'Standalone', path: '/administration/standalone', showInModes: ['fullwidth'] },
          ],
        },
      ],
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useSecondarySidebar(defaultOptions));

    const paths = result.current.subMenus.map((item: any) => item.path);
    expect(paths).toContain('/administration/hub');
    expect(paths).not.toContain('/administration/standalone');
  });

  it('shows fullwidth-mode items when isFullWidth is true', () => {
    mockUseFullWidth.mockReturnValue({ isFullWidth: true, toggleFullWidth: vi.fn(), enableFullWidth: vi.fn(), disableFullWidth: vi.fn(), isSecondaryAsPrimary: false, setSecondaryAsPrimary: vi.fn() });
    mockUseDynamicNavigation.mockReturnValue({
      navigationItems: [
        {
          name: 'Administration',
          modulePath: '/administration',
          isGroup: true,
          children: [
            { name: 'Hub', path: '/administration/hub', showInModes: ['standard', 'fullwidth'] },
            { name: 'Standalone', path: '/administration/standalone', showInModes: ['fullwidth'] },
          ],
        },
      ],
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useSecondarySidebar(defaultOptions));

    const paths = result.current.subMenus.map((item: any) => item.path);
    expect(paths).toContain('/administration/hub');
    expect(paths).toContain('/administration/standalone');
  });

  it('hides deprecated items in both modes', () => {
    mockUseFullWidth.mockReturnValue({ isFullWidth: false, toggleFullWidth: vi.fn(), enableFullWidth: vi.fn(), disableFullWidth: vi.fn(), isSecondaryAsPrimary: false, setSecondaryAsPrimary: vi.fn() });
    mockUseDynamicNavigation.mockReturnValue({
      navigationItems: [
        {
          name: 'Administration',
          modulePath: '/administration',
          isGroup: true,
          children: [
            { name: 'Hub', path: '/administration/hub', showInModes: ['standard', 'fullwidth'] },
            { name: 'Old', path: '/administration/old', deprecated: true },
          ],
        },
      ],
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useSecondarySidebar(defaultOptions));

    const paths = result.current.subMenus.map((item: any) => item.path);
    console.log('DEBUG subMenus paths:', paths);
    console.log('DEBUG subMenus items:', result.current.subMenus);
    expect(paths).toContain('/administration/hub');
    expect(paths).not.toContain('/administration/old');
  });

  it('shows hub items (standard+fullwidth) in both modes', () => {
    mockUseDynamicNavigation.mockReturnValue({
      navigationItems: [
        {
          name: 'Administration',
          modulePath: '/administration',
          isGroup: true,
          children: [
            { name: 'Hub', path: '/administration/hub', showInModes: ['standard', 'fullwidth'] },
          ],
        },
      ],
      isLoading: false,
    } as any);

    // Standard mode
    mockUseFullWidth.mockReturnValue({ isFullWidth: false, toggleFullWidth: vi.fn(), enableFullWidth: vi.fn(), disableFullWidth: vi.fn(), isSecondaryAsPrimary: false, setSecondaryAsPrimary: vi.fn() });
    const { result: standardResult } = renderHook(() => useSecondarySidebar(defaultOptions));
    expect(standardResult.current.subMenus.map((item: any) => item.path)).toContain(
      '/administration/hub'
    );

    // Fullwidth mode
    mockUseFullWidth.mockReturnValue({ isFullWidth: true, toggleFullWidth: vi.fn(), enableFullWidth: vi.fn(), disableFullWidth: vi.fn(), isSecondaryAsPrimary: false, setSecondaryAsPrimary: vi.fn() });
    const { result: fullwidthResult } = renderHook(() => useSecondarySidebar(defaultOptions));
    expect(fullwidthResult.current.subMenus.map((item: any) => item.path)).toContain(
      '/administration/hub'
    );
  });

  it('defaults items without showInModes to standard-only', () => {
    mockUseFullWidth.mockReturnValue({ isFullWidth: true, toggleFullWidth: vi.fn(), enableFullWidth: vi.fn(), disableFullWidth: vi.fn(), isSecondaryAsPrimary: false, setSecondaryAsPrimary: vi.fn() });
    mockUseDynamicNavigation.mockReturnValue({
      navigationItems: [
        {
          name: 'Administration',
          modulePath: '/administration',
          isGroup: true,
          children: [
            { name: 'Hub', path: '/administration/hub', showInModes: ['standard', 'fullwidth'] },
            { name: 'Legacy', path: '/administration/legacy' }, // No showInModes
          ],
        },
      ],
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useSecondarySidebar(defaultOptions));

    const paths = result.current.subMenus.map((item: any) => item.path);
    expect(paths).toContain('/administration/hub');
    expect(paths).not.toContain('/administration/legacy');
  });
});

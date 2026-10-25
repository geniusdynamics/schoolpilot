// ABOUTME: What the signed-in user may do in Settings comes from the same rule the route guard uses, so a page
// ABOUTME: the guard let the administrator into does not then tell them they have no permission.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

let signedIn: { role: string; permissions: string[] } | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: signedIn }),
}));

import { useSettingsAccess } from '../useSettingsAccess';

describe('useSettingsAccess', () => {
  beforeEach(() => {
    signedIn = null;
  });

  it('lets the super administrator do everything in Settings', () => {
    signedIn = { role: 'super_admin', permissions: [] };
    const { result } = renderHook(() => useSettingsAccess());

    expect(result.current.can('settings.view')).toBe(true);
    expect(result.current.can('settings.manage')).toBe(true);
    expect(result.current.can('settings.workflows.manage_states')).toBe(true);
  });

  it('gives anyone else only what they were granted', () => {
    signedIn = { role: 'teacher', permissions: ['settings.view'] };
    const { result } = renderHook(() => useSettingsAccess());

    expect(result.current.can('settings.view')).toBe(true);
    expect(result.current.can('settings.manage')).toBe(false);
  });

  it('lets nobody in when nobody is signed in', () => {
    const { result } = renderHook(() => useSettingsAccess());

    expect(result.current.can('settings.view')).toBe(false);
  });

  it('answers "any of these" for a control that several permissions open', () => {
    signedIn = { role: 'teacher', permissions: ['modules.view'] };
    const { result } = renderHook(() => useSettingsAccess());

    expect(result.current.canAny(['settings.view', 'modules.view'])).toBe(true);
    expect(result.current.canAny(['settings.manage', 'modules.manage'])).toBe(false);
  });
});

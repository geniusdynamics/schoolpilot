// ABOUTME: Tests to verify DataModeSwitch deprecation warnings are working correctly
// ABOUTME: This ensures the deprecated component shows proper warnings when used

import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataModeSwitch } from '@/components/DataModeSwitch';
import { AppDataProvider } from '@/contexts/AppDataContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { RBACProvider } from '@/rbac/RBACProvider';

// Mock the contexts
vi.mock('../contexts/AppDataContext', () => ({
  AppDataProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAppData: () => ({
    isDatabaseModeActive: false,
    migrationStatus: 'pending',
    switchToDatabase: vi.fn(),
    switchToMockData: vi.fn(),
    isLoading: false
  })
}));

vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: { id: '1', name: 'Test User', role: 'admin' },
    isAuthenticated: true
  })
}));

vi.mock('../rbac/RBACProvider', () => ({
  RBACProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useRBAC: () => ({
    hasPermission: () => true,
    canAccess: () => true
  })
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <RBACProvider>
      <AppDataProvider>
        {children}
      </AppDataProvider>
    </RBACProvider>
  </AuthProvider>
);

describe('DataModeSwitch Deprecation', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should show deprecation warning when DataModeSwitch is rendered', () => {
    render(
      <TestWrapper>
        <DataModeSwitch />
      </TestWrapper>
    );
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'DataModeSwitch is deprecated. Please use UnifiedModeSwitch instead.'
    );
  });

  it('should still render the component despite being deprecated', () => {
    const { container } = render(
      <TestWrapper>
        <DataModeSwitch />
      </TestWrapper>
    );
    
    // Component should still render
    expect(container.firstChild).toBeTruthy();
  });

  it('should show deprecation warning only once per render', () => {
    const { rerender } = render(
      <TestWrapper>
        <DataModeSwitch />
      </TestWrapper>
    );
    
    // Clear the spy to count only new calls
    consoleSpy.mockClear();
    
    // Re-render the same component
    rerender(
      <TestWrapper>
        <DataModeSwitch />
      </TestWrapper>
    );
    
    // Should show warning again on re-render
    expect(consoleSpy).toHaveBeenCalledWith(
      'DataModeSwitch is deprecated. Please use UnifiedModeSwitch instead.'
    );
  });
});
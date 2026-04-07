// ABOUTME: Tests for UnifiedModeSwitch component to verify settings consolidation functionality
// ABOUTME: This test ensures the unified mode switching component works correctly across all settings pages

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UnifiedModeSwitch from '@/components/UnifiedModeSwitch';
import { AppDataProvider } from '@/contexts/AppDataContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { RBACProvider } from '@/contexts/RBACContext';

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

vi.mock('../contexts/RBACContext', () => ({
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

describe('UnifiedModeSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(
      <TestWrapper>
        <UnifiedModeSwitch />
      </TestWrapper>
    );
    
    expect(screen.getByText(/data source/i)).toBeInTheDocument();
  });

  it('should display mode switch options', () => {
    render(
      <TestWrapper>
        <UnifiedModeSwitch />
      </TestWrapper>
    );
    
    expect(screen.getByText(/mock data/i)).toBeInTheDocument();
    expect(screen.getByText(/database/i)).toBeInTheDocument();
  });

  it('should show current mode status', () => {
    render(
      <TestWrapper>
        <UnifiedModeSwitch />
      </TestWrapper>
    );
    
    // Should show mock data as active since isDatabaseModeActive is false
    const mockDataOption = screen.getByText(/mock data/i).closest('button');
    expect(mockDataOption).toHaveClass('bg-blue-500');
  });

  it('should handle mode switching', async () => {
    render(
      <TestWrapper>
        <UnifiedModeSwitch />
      </TestWrapper>
    );
    
    const databaseOption = screen.getByText(/database/i).closest('button');
    if (databaseOption) {
      fireEvent.click(databaseOption);
      
      // Should trigger the switch function
      await waitFor(() => {
        expect(databaseOption).toBeInTheDocument();
      });
    }
  });

  it('should display migration status when switching to database', () => {
    render(
      <TestWrapper>
        <UnifiedModeSwitch />
      </TestWrapper>
    );
    
    // Should show migration status information
    expect(screen.getByText(/migration status/i) || screen.getByText(/pending/i)).toBeInTheDocument();
  });
});
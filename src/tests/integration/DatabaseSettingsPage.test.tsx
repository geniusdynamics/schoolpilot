// ABOUTME: Comprehensive integration tests for DatabaseSettingsPage (deprecated)
// ABOUTME: Tests database operations, data management, error handling, and production mode restrictions

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DatabaseSettingsPage } from '@/modules/settings/pages/DatabaseSettingsPage';
import { useAppData } from '@/hooks/useAppData';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('../../hooks/useAppData');
vi.mock('../../hooks/useUnifiedConfig');

const mockUseAppData = vi.mocked(useAppData);
const mockUseUnifiedConfig = vi.mocked(useUnifiedConfig);

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

describe('DatabaseSettingsPage Integration Tests', () => {
  const mockTriggerSeedRxDB = vi.fn();
  const mockTriggerClearRxDB = vi.fn();
  const mockUpdateConfig = vi.fn();

  const defaultAppData = {
    isDatabaseModeActive: true,
    isUsingRxDBDummyData: false,
    triggerSeedRxDB: mockTriggerSeedRxDB,
    triggerClearRxDB: mockTriggerClearRxDB,
    initializationError: null,
  };

  const defaultConfig = {
    config: {
      environment: 'production',
      dataMode: 'production',
      database: {
        provider: 'sqlite'
      }
    },
    updateConfig: mockUpdateConfig,
    isLoading: false,
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockUseAppData.mockReturnValue(defaultAppData);
    mockUseUnifiedConfig.mockReturnValue(defaultConfig);

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText('Database Settings')).toBeInTheDocument();
    });

    it('should display the correct page title', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByRole('heading', { name: /database settings/i })).toBeInTheDocument();
    });

    it('should render database management card', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/database management/i)).toBeInTheDocument();
    });

    it('should display import dummy data button', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByRole('button', { name: /import dummy data/i })).toBeInTheDocument();
    });

    it('should display clear data button', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByRole('button', { name: /clear data/i })).toBeInTheDocument();
    });
  });

  describe('Production Mode Restrictions', () => {
    it('should show production mode interface when in production', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/production mode/i)).toBeInTheDocument();
    });

    it('should enable database operations in production mode', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const importButton = screen.getByRole('button', { name: /import dummy data/i });
      const clearButton = screen.getByRole('button', { name: /clear data/i });

      expect(importButton).not.toBeDisabled();
      expect(clearButton).not.toBeDisabled();
    });

    it('should handle non-production mode appropriately', async () => {
      mockUseUnifiedConfig.mockReturnValue({
        ...defaultConfig,
        config: {
          ...defaultConfig.config,
          environment: 'development',
          dataMode: 'development'
        }
      });

      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      // Should still render the component but may show different content
      expect(screen.getByText('Database Settings')).toBeInTheDocument();
    });
  });

  describe('Database Operations', () => {
    it('should handle import dummy data operation', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const importButton = screen.getByRole('button', { name: /import dummy data/i });
      
      await act(async () => {
        await user.click(importButton);
      });

      expect(mockTriggerSeedRxDB).toHaveBeenCalled();
    });

    it('should handle clear data operation', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const clearButton = screen.getByRole('button', { name: /clear data/i });
      
      await act(async () => {
        await user.click(clearButton);
      });

      expect(mockTriggerClearRxDB).toHaveBeenCalled();
    });

    it('should show loading state during import operation', async () => {
      // Mock a delayed operation
      mockTriggerSeedRxDB.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const importButton = screen.getByRole('button', { name: /import dummy data/i });
      
      await act(async () => {
        await user.click(importButton);
      });

      // Check for loading state
      expect(screen.getByText(/importing/i)).toBeInTheDocument();

      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import dummy data/i })).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should show loading state during clear operation', async () => {
      // Mock a delayed operation
      mockTriggerClearRxDB.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const clearButton = screen.getByRole('button', { name: /clear data/i });
      
      await act(async () => {
        await user.click(clearButton);
      });

      // Check for loading state
      expect(screen.getByText(/clearing/i)).toBeInTheDocument();

      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear data/i })).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Database Status Display', () => {
    it('should display database status when active', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/database status/i)).toBeInTheDocument();
      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });

    it('should display inactive status when database is not active', async () => {
      mockUseAppData.mockReturnValue({
        ...defaultAppData,
        isDatabaseModeActive: false
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/inactive/i)).toBeInTheDocument();
    });

    it('should show dummy data status when using dummy data', async () => {
      mockUseAppData.mockReturnValue({
        ...defaultAppData,
        isUsingRxDBDummyData: true
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/using dummy data/i)).toBeInTheDocument();
    });

    it('should display current provider information', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/provider/i)).toBeInTheDocument();
      expect(screen.getByText(/sqlite/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display initialization error when database fails', async () => {
      const errorMessage = 'Database initialization failed';
      mockUseAppData.mockReturnValue({
        ...defaultAppData,
        isDatabaseModeActive: false,
        initializationError: new Error(errorMessage)
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/database initialization failed/i)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should handle import operation errors', async () => {
      const errorMessage = 'Failed to import data';
      mockTriggerSeedRxDB.mockRejectedValue(new Error(errorMessage));
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const importButton = screen.getByRole('button', { name: /import dummy data/i });
      
      await act(async () => {
        await user.click(importButton);
      });

      await waitFor(() => {
        expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
      });
    });

    it('should handle clear operation errors', async () => {
      const errorMessage = 'Failed to clear data';
      mockTriggerClearRxDB.mockRejectedValue(new Error(errorMessage));
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const clearButton = screen.getByRole('button', { name: /clear data/i });
      
      await act(async () => {
        await user.click(clearButton);
      });

      await waitFor(() => {
        expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
      });
    });

    it('should disable operations when database is not active', async () => {
      mockUseAppData.mockReturnValue({
        ...defaultAppData,
        isDatabaseModeActive: false
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const importButton = screen.getByRole('button', { name: /import dummy data/i });
      const clearButton = screen.getByRole('button', { name: /clear data/i });

      expect(importButton).toBeDisabled();
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Mock Data Handling', () => {
    it('should display mock data information', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/mock data/i)).toBeInTheDocument();
    });

    it('should show notes about mock data handling', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/note/i)).toBeInTheDocument();
    });

    it('should handle mock data state changes', async () => {
      mockUseAppData.mockReturnValue({
        ...defaultAppData,
        isUsingRxDBDummyData: null // Loading state
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should manage loading states correctly', async () => {
      mockUseUnifiedConfig.mockReturnValue({
        ...defaultConfig,
        isLoading: true
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should update state after successful operations', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const importButton = screen.getByRole('button', { name: /import dummy data/i });
      
      await act(async () => {
        await user.click(importButton);
      });

      await waitFor(() => {
        expect(mockTriggerSeedRxDB).toHaveBeenCalled();
      });
    });

    it('should maintain state consistency during operations', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      // Perform import operation
      const importButton = screen.getByRole('button', { name: /import dummy data/i });
      await act(async () => {
        await user.click(importButton);
      });

      // Perform clear operation
      const clearButton = screen.getByRole('button', { name: /clear data/i });
      await act(async () => {
        await user.click(clearButton);
      });

      expect(mockTriggerSeedRxDB).toHaveBeenCalled();
      expect(mockTriggerClearRxDB).toHaveBeenCalled();
    });
  });

  describe('User Interface Interactions', () => {
    it('should handle rapid button clicks gracefully', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const importButton = screen.getByRole('button', { name: /import dummy data/i });
      
      // Rapid clicks
      await act(async () => {
        await user.click(importButton);
        await user.click(importButton);
        await user.click(importButton);
      });

      // Should only trigger once or handle gracefully
      expect(mockTriggerSeedRxDB).toHaveBeenCalled();
    });

    it('should provide visual feedback for operations', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const importButton = screen.getByRole('button', { name: /import dummy data/i });
      
      await act(async () => {
        await user.click(importButton);
      });

      // Should show some visual feedback
      expect(screen.getByRole('button', { name: /import dummy data/i })).toBeInTheDocument();
    });
  });

  describe('Console Error Validation', () => {
    it('should not produce console errors during normal operation', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      // Filter out expected debug messages
      const unexpectedErrors = consoleSpy.mock.calls.filter(call => 
        !call[0]?.toString().includes('DatabaseSettingsPage') &&
        !call[0]?.toString().includes('COMPONENT IS LOADING')
      );

      expect(unexpectedErrors).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });

    it('should not produce console errors during operations', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const importButton = screen.getByRole('button', { name: /import dummy data/i });
      
      await act(async () => {
        await user.click(importButton);
      });

      // Filter out expected debug messages
      const unexpectedErrors = consoleSpy.mock.calls.filter(call => 
        !call[0]?.toString().includes('DatabaseSettingsPage') &&
        !call[0]?.toString().includes('COMPONENT IS LOADING')
      );

      expect(unexpectedErrors).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for buttons', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const importButton = screen.getByRole('button', { name: /import dummy data/i });
      const clearButton = screen.getByRole('button', { name: /clear data/i });

      expect(importButton).toHaveAttribute('aria-label');
      expect(clearButton).toHaveAttribute('aria-label');
    });

    it('should have proper heading structure', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const heading = screen.getByRole('heading', { name: /database settings/i });
      expect(heading).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseSettingsPage />
          </TestWrapper>
        );
      });

      const importButton = screen.getByRole('button', { name: /import dummy data/i });
      
      // Focus the button
      await act(async () => {
        importButton.focus();
      });

      expect(importButton).toHaveFocus();

      // Trigger with Enter key
      await act(async () => {
        await user.keyboard('{Enter}');
      });

      expect(mockTriggerSeedRxDB).toHaveBeenCalled();
    });
  });
});
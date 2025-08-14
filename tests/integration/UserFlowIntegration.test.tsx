import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { NavigationProvider } from '../../src/providers/NavigationProvider';
import { AuthProvider } from '../../src/providers/AuthProvider';
import { ModuleProvider } from '../../src/providers/ModuleProvider';
import { App } from '../../src/App';

describe('User Flow Integration Tests', () => {
  describe('Login to Tab Creation Flow', () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    test('complete user journey from login to module navigation', async () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <App />
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      // Login
      fireEvent.change(screen.getByLabelText('Username'), {
        target: { value: 'testuser' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Login' }));

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Navigate to Students module
      fireEvent.click(screen.getByText('Students'));
      await waitFor(() => {
        expect(screen.getByTestId('students-module')).toBeInTheDocument();
      });

      // Open student details
      fireEvent.click(screen.getByText('John Doe'));
      await waitFor(() => {
        expect(screen.getByTestId('student-details')).toBeInTheDocument();
      });

      // Verify tab creation
      expect(screen.getAllByRole('tab')).toHaveLength(2); // Dashboard + Student
      expect(screen.getByRole('tab', { name: 'John Doe' })).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Cross-Module Navigation Flow', () => {
    test('navigation between multiple modules maintains state', async () => {
      const mockStorage = new Map();
      const localStorageMock = {
        getItem: (key) => mockStorage.get(key),
        setItem: (key, value) => mockStorage.set(key, value),
        clear: () => mockStorage.clear()
      };
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });

      render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <App />
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      // Navigate to Students
      fireEvent.click(screen.getByText('Students'));
      await waitFor(() => {
        expect(screen.getByTestId('students-module')).toBeInTheDocument();
      });

      // Navigate to Finance
      fireEvent.click(screen.getByText('Finance'));
      await waitFor(() => {
        expect(screen.getByTestId('finance-module')).toBeInTheDocument();
      });

      // Return to Students
      fireEvent.click(screen.getByRole('tab', { name: 'Students' }));
      await waitFor(() => {
        expect(screen.getByTestId('students-module')).toBeInTheDocument();
      });

      // Verify state persistence
      expect(screen.getByTestId('students-list')).toHaveTextContent('John Doe');
    });
  });

  describe('Tab Persistence Across Refreshes', () => {
    test('maintains tab state and content after refresh', async () => {
      const { unmount } = render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <App />
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      // Navigate and create tabs
      fireEvent.click(screen.getByText('Students'));
      fireEvent.click(screen.getByText('Finance'));
      
      // Store tab state
      const tabState = JSON.parse(localStorage.getItem('tabState'));
      
      // Simulate refresh
      unmount();
      render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <App />
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      // Verify tabs restored
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Students' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Finance' })).toBeInTheDocument();
      });

      // Verify active content restored
      expect(screen.getByTestId('finance-module')).toBeInTheDocument();
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('recovers from failed module load', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockFailedModule = vi.fn().mockRejectedValueOnce(new Error('Failed to load'));

      render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <App />
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      // Trigger failed module load
      fireEvent.click(screen.getByText('Problem Module'));
      
      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText('Error loading module')).toBeInTheDocument();
      });

      // Verify recovery option
      const retryButton = screen.getByRole('button', { name: 'Retry' });
      mockFailedModule.mockResolvedValueOnce({ default: () => <div>Module Content</div> });
      
      fireEvent.click(retryButton);
      
      // Verify successful recovery
      await waitFor(() => {
        expect(screen.getByText('Module Content')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('handles network errors during navigation', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <App />
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      // Trigger navigation
      fireEvent.click(screen.getByText('Network Module'));

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      });

      // Verify offline functionality
      expect(screen.getByText('Working Offline')).toBeInTheDocument();

      fetchSpy.mockRestore();
    });
  });
});

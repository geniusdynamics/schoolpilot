import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach } from 'vitest';
import { MockStorage } from '@/utils/testUtils';
import { TabbedWorkspace } from '@/components/tabbedWorkspace';
import { NavigationProvider } from '../../providers/NavigationProvider';
import { AuthProvider } from '../../providers/AuthProvider';

describe('Tab Navigation Integration Tests', () => {
  const mockStorage = new MockStorage();

  beforeEach(() => {
    mockStorage.clear();
    Object.defineProperty(window, 'localStorage', { value: mockStorage });
  });

  test('full user flow from login to tab management', async () => {
    render(
      <AuthProvider>
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      </AuthProvider>
    );

    // Login
    await loginUser('testuser', 'password123');

    // Verify dashboard is loaded
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    
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

    // Verify tab state
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2); // Dashboard + Student
    expect(screen.getByRole('tab', { name: 'John Doe' })).toHaveAttribute('aria-selected', 'true');
  });

  test('navigation between multiple modules maintains state', async () => {
    render(
      <AuthProvider>
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      </AuthProvider>
    );

    // Navigate to Students module
    fireEvent.click(screen.getByText('Students'));
    await waitFor(() => {
      expect(screen.getByTestId('students-module')).toBeInTheDocument();
    });

    // Select a student
    fireEvent.click(screen.getByText('John Doe'));
    await waitFor(() => {
      expect(screen.getByTestId('student-details')).toBeInTheDocument();
    });

    // Navigate to Finance module
    fireEvent.click(screen.getByText('Finance'));
    await waitFor(() => {
      expect(screen.getByTestId('finance-module')).toBeInTheDocument();
    });

    // Return to Students module
    fireEvent.click(screen.getByRole('tab', { name: 'John Doe' }));
    await waitFor(() => {
      expect(screen.getByTestId('student-details')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  test('tab persistence across page refreshes', async () => {
    const { rerender } = render(
      <AuthProvider>
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      </AuthProvider>
    );

    // Navigate and create tabs
    fireEvent.click(screen.getByText('Students'));
    await waitFor(() => {
      expect(screen.getByTestId('students-module')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Finance'));
    await waitFor(() => {
      expect(screen.getByTestId('finance-module')).toBeInTheDocument();
    });

    // Store initial tab state
    const initialTabs = screen.getAllByRole('tab').map(tab => tab.textContent);

    // Simulate page refresh
    rerender(
      <AuthProvider>
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      </AuthProvider>
    );

    // Verify tabs are restored
    const restoredTabs = screen.getAllByRole('tab');
    expect(restoredTabs.map(tab => tab.textContent)).toEqual(initialTabs);

    // Verify active tab is preserved
    expect(screen.getByTestId('finance-module')).toBeInTheDocument();
  });

  test('handles navigation errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <AuthProvider>
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      </AuthProvider>
    );

    // Navigate to an invalid route
    window.history.pushState({}, '', '/invalid/route');
    fireEvent.popstate(window);

    // Verify error state
    await waitFor(() => {
      expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
    });

    // Verify we can recover from error state
    fireEvent.click(screen.getByText('Dashboard'));
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  test('enforces maximum tab limit', async () => {
    render(
      <AuthProvider>
        <NavigationProvider maxTabs={3}>
          <TabbedWorkspace />
        </NavigationProvider>
      </AuthProvider>
    );

    // Try to open more than the maximum tabs
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText('New Tab'));
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify tab limit is enforced
    expect(screen.getAllByRole('tab')).toHaveLength(3);

    // Verify oldest tab is closed when opening new one
    const initialTabs = screen.getAllByRole('tab').map(tab => tab.textContent);
    fireEvent.click(screen.getByText('New Tab'));
    
    await waitFor(() => {
      const currentTabs = screen.getAllByRole('tab').map(tab => tab.textContent);
      expect(currentTabs).not.toContain(initialTabs[0]);
      expect(screen.getAllByRole('tab')).toHaveLength(3);
    });
  });

  test('preserves tab state during navigation', async () => {
    render(
      <AuthProvider>
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      </AuthProvider>
    );

    // Open multiple tabs and modify their state
    fireEvent.click(screen.getByText('Students'));
    await waitFor(() => {
      expect(screen.getByTestId('students-module')).toBeInTheDocument();
    });

    // Select a student
    fireEvent.click(screen.getByText('John Doe'));
    
    // Open finance tab
    fireEvent.click(screen.getByText('Finance'));
    await waitFor(() => {
      expect(screen.getByTestId('finance-module')).toBeInTheDocument();
    });

    // Navigate between tabs multiple times
    fireEvent.click(screen.getByRole('tab', { name: 'Students' }));
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Finance' }));
    await waitFor(() => {
      expect(screen.getByTestId('finance-module')).toBeInTheDocument();
    });

    // Verify state is preserved
    fireEvent.click(screen.getByRole('tab', { name: 'Students' }));
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByTestId('student-details')).toBeInTheDocument();
    });
  });

  // Helper function to simulate login
  async function loginUser(username: string, password: string) {
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: username }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: password }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  }
});

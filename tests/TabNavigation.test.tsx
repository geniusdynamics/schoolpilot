import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { TabbedWorkspace } from '../src/components/TabbedWorkspace';
import { NavigationProvider } from '../src/providers/NavigationProvider';

describe('Tab Navigation Tests', () => {
  describe('Tab creation and activation', () => {
    test('should create new tab when navigating to new route', () => {
      render(
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      );

      // Navigate to new route
      fireEvent.click(screen.getByText('Students'));
      expect(screen.getByRole('tab', { name: 'Students' })).toBeInTheDocument();
    });

    test('should activate existing tab instead of creating duplicate', () => {
      render(
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      );

      // First navigation
      fireEvent.click(screen.getByText('Students'));
      const initialTabCount = screen.getAllByRole('tab').length;

      // Navigate away
      fireEvent.click(screen.getByText('Finance'));

      // Navigate back to Students
      fireEvent.click(screen.getByText('Students'));
      expect(screen.getAllByRole('tab')).toHaveLength(initialTabCount);
      expect(screen.getByRole('tab', { name: 'Students' })).toHaveAttribute('aria-selected', 'true');
    });

    test('should enforce maximum tab limit', () => {
      const MAX_TABS = 8;
      render(
        <NavigationProvider maxTabs={MAX_TABS}>
          <TabbedWorkspace />
        </NavigationProvider>
      );

      // Open maximum number of tabs
      for (let i = 0; i < MAX_TABS + 2; i++) {
        fireEvent.click(screen.getByText(`Module${i}`));
      }

      expect(screen.getAllByRole('tab')).toHaveLength(MAX_TABS);
    });
  });

  describe('Cross-module navigation', () => {
    test('should maintain tab state when navigating between modules', async () => {
      render(
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      );

      // Open tabs in different modules
      fireEvent.click(screen.getByText('Students'));
      fireEvent.click(screen.getByText('Finance'));
      
      // Navigate between modules
      fireEvent.click(screen.getByRole('tab', { name: 'Students' }));
      expect(screen.getByTestId('students-content')).toBeInTheDocument();
      
      fireEvent.click(screen.getByRole('tab', { name: 'Finance' }));
      expect(screen.getByTestId('finance-content')).toBeInTheDocument();
    });

    test('should preserve tab order during cross-module navigation', () => {
      render(
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      );

      // Open multiple tabs
      fireEvent.click(screen.getByText('Students'));
      fireEvent.click(screen.getByText('Finance'));
      fireEvent.click(screen.getByText('Academics'));

      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveTextContent('Students');
      expect(tabs[1]).toHaveTextContent('Finance');
      expect(tabs[2]).toHaveTextContent('Academics');
    });
  });

  describe('Tab state persistence', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    test('should persist open tabs across refreshes', () => {
      const { unmount } = render(
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      );

      // Open tabs
      fireEvent.click(screen.getByText('Students'));
      fireEvent.click(screen.getByText('Finance'));

      // Simulate refresh
      unmount();
      render(
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      );

      expect(screen.getByRole('tab', { name: 'Students' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Finance' })).toBeInTheDocument();
    });

    test('should persist active tab across refreshes', () => {
      const { unmount } = render(
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      );

      // Open tabs and set active
      fireEvent.click(screen.getByText('Students'));
      fireEvent.click(screen.getByText('Finance'));
      fireEvent.click(screen.getByRole('tab', { name: 'Finance' }));

      // Simulate refresh
      unmount();
      render(
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      );

      expect(screen.getByRole('tab', { name: 'Finance' })).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Error handling', () => {
    test('should handle navigation to invalid routes', () => {
      render(
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      );

      // Try to navigate to invalid route
      act(() => {
        window.history.pushState({}, '', '/invalid-route');
      });

      expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
    });

    test('should recover from corrupted tab state', () => {
      // Set corrupted state in localStorage
      localStorage.setItem('tabs', 'invalid-json');

      render(
        <NavigationProvider>
          <TabbedWorkspace />
        </NavigationProvider>
      );

      // Should render without crashing
      expect(screen.getByTestId('tabbed-workspace')).toBeInTheDocument();
    });
  });
});

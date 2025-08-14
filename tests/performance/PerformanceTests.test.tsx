import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { NavigationProvider } from '../../src/providers/NavigationProvider';
import { AuthProvider } from '../../src/providers/AuthProvider';
import { ModuleProvider } from '../../src/providers/ModuleProvider';
import { App } from '../../src/App';
import MemoryStats from '../../src/utils/MemoryStats';

describe('Performance Tests', () => {
  describe('Render Count Tests', () => {
    let renderCount;

    beforeEach(() => {
      renderCount = new Map();
    });

    const TestComponent = ({ name, children }) => {
      renderCount.set(name, (renderCount.get(name) || 0) + 1);
      return <div>{children}</div>;
    };

    test('components should not re-render unnecessarily', async () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <TestComponent name="root">
                <TestComponent name="sidebar">
                  <div>Sidebar Content</div>
                </TestComponent>
                <TestComponent name="content">
                  <div>Main Content</div>
                </TestComponent>
              </TestComponent>
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      // Initial render
      expect(renderCount.get('root')).toBe(1);
      expect(renderCount.get('sidebar')).toBe(1);
      expect(renderCount.get('content')).toBe(1);

      // Navigate to new route
      fireEvent.click(screen.getByText('Students'));

      // Only content should re-render
      expect(renderCount.get('root')).toBe(1);
      expect(renderCount.get('sidebar')).toBe(1);
      expect(renderCount.get('content')).toBe(2);
    });

    test('should batch render updates', async () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <TestComponent name="batchTest">
                <div>Batch Test</div>
              </TestComponent>
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      const initialRenderCount = renderCount.get('batchTest');

      // Multiple state updates
      act(() => {
        for (let i = 0; i < 5; i++) {
          // Update state
        }
      });

      // Should only cause one re-render
      expect(renderCount.get('batchTest')).toBe(initialRenderCount + 1);
    });
  });

  describe('Memory Usage Tests', () => {
    let memoryStats;

    beforeEach(() => {
      memoryStats = new MemoryStats();
    });

    test('memory usage should stay within bounds during navigation', async () => {
      const { unmount } = render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <App />
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      const initialMemory = memoryStats.getCurrentUsage();

      // Navigate through multiple routes
      for (let i = 0; i < 10; i++) {
        fireEvent.click(screen.getByText(`Module${i}`));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMemory = memoryStats.getCurrentUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (e.g., less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      // Cleanup
      unmount();

      // Memory should be properly freed
      const afterCleanupMemory = memoryStats.getCurrentUsage();
      expect(afterCleanupMemory).toBeLessThanOrEqual(initialMemory * 1.1); // Allow 10% overhead
    });

    test('should not leak memory during rapid tab switching', async () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <App />
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      const initialMemory = memoryStats.getCurrentUsage();
      const tabs = ['Students', 'Finance', 'Academics'];

      // Rapid tab switching
      for (let i = 0; i < 50; i++) {
        fireEvent.click(screen.getByText(tabs[i % tabs.length]));
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Check memory usage
      const finalMemory = memoryStats.getCurrentUsage();
      expect(finalMemory).toBeLessThan(initialMemory * 1.2); // Allow 20% increase
    });
  });

  describe('Memory Leak Detection', () => {
    test('should not leak event listeners', async () => {
      const eventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <App />
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      // Perform actions that add event listeners
      fireEvent.click(screen.getByText('Students'));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cleanup
      unmount();

      // All event listeners should be cleaned up
      expect(eventListenerSpy.mock.calls.length).toBe(removeEventListenerSpy.mock.calls.length);

      eventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    test('should clean up resources on unmount', async () => {
      let observer;
      const cleanup = vi.fn();

      // Create component with resource cleanup
      const ResourceComponent = () => {
        React.useEffect(() => {
          observer = new MutationObserver(() => {});
          observer.observe(document.body, { childList: true });
          return cleanup;
        }, []);
        return <div>Resource Test</div>;
      };

      const { unmount } = render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <ResourceComponent />
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      // Unmount and verify cleanup
      unmount();
      expect(cleanup).toHaveBeenCalled();
      expect(observer.disconnect).toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring', () => {
    test('tracks render performance metrics', async () => {
      const performanceNow = vi.spyOn(performance, 'now');
      let startTime;

      render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <App />
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      startTime = performance.now();

      // Navigate to trigger renders
      fireEvent.click(screen.getByText('Students'));
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render in less than 100ms

      performanceNow.mockRestore();
    });

    test('measures interaction responsiveness', async () => {
      const performanceNow = vi.spyOn(performance, 'now');
      let startTime;

      render(
        <AuthProvider>
          <NavigationProvider>
            <ModuleProvider>
              <App />
            </ModuleProvider>
          </NavigationProvider>
        </AuthProvider>
      );

      // Measure tab switch performance
      startTime = performance.now();
      fireEvent.click(screen.getByText('Students'));
      const switchTime = performance.now() - startTime;
      
      expect(switchTime).toBeLessThan(50); // Tab switch should be under 50ms

      performanceNow.mockRestore();
    });
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach } from 'vitest';
import { createMemoryTracker, createPerformanceMonitor } from '@/utils/testUtils';
import { TabbedWorkspace } from '@/components/tabbedWorkspace';
import { NavigationProvider } from '../../providers/NavigationProvider';

describe('Memory and Performance Tests', () => {
  const memoryTracker = createMemoryTracker();
  const performanceMonitor = createPerformanceMonitor();

  beforeEach(() => {
    performanceMonitor.clearMarks();
  });

  test('navigation should not cause memory leaks', async () => {
    memoryTracker.takeSnapshot('start');

    const { unmount } = render(
      <NavigationProvider>
        <TabbedWorkspace />
      </NavigationProvider>
    );

    // Create multiple tabs
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByText('New Tab'));
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    memoryTracker.takeSnapshot('after-tabs');

    // Cleanup
    unmount();
    
    memoryTracker.takeSnapshot('after-cleanup');

    const usage = memoryTracker.compareSnapshots('start', 'after-cleanup');
    expect(usage?.heapDiff).toBeLessThan(1024 * 1024); // Less than 1MB diff
  });

  test('tab switching should be performant', async () => {
    render(
      <NavigationProvider>
        <TabbedWorkspace />
      </NavigationProvider>
    );

    // Create a few tabs
    const tabs = ['Tab 1', 'Tab 2', 'Tab 3'];
    for (const tab of tabs) {
      fireEvent.click(screen.getByText('New Tab'));
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Measure tab switching performance
    performanceMonitor.mark('switch-start');
    
    for (const tab of tabs) {
      fireEvent.click(screen.getByText(tab));
      await waitFor(() => {
        expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(tab);
      });
    }

    const switchTime = performanceMonitor.measure('switch-start');
    expect(switchTime).toBeLessThan(100); // Should switch in under 100ms
  });

  test('cleanup removes all event listeners', async () => {
    const eventSpy = vi.spyOn(window, 'addEventListener');
    const cleanupSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <NavigationProvider>
        <TabbedWorkspace />
      </NavigationProvider>
    );

    // Create and interact with tabs
    fireEvent.click(screen.getByText('New Tab'));
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const addedEvents = eventSpy.mock.calls.length;
    
    // Cleanup
    unmount();
    
    expect(cleanupSpy.mock.calls.length).toBe(addedEvents);
    
    eventSpy.mockRestore();
    cleanupSpy.mockRestore();
  });

  test('tab state persistence does not grow unbounded', async () => {
    memoryTracker.takeSnapshot('before-storage');

    const { unmount } = render(
      <NavigationProvider>
        <TabbedWorkspace />
      </NavigationProvider>
    );

    // Create maximum number of tabs
    for (let i = 0; i < 20; i++) {
      fireEvent.click(screen.getByText('New Tab'));
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    memoryTracker.takeSnapshot('after-storage');
    
    const storageImpact = memoryTracker.compareSnapshots('before-storage', 'after-storage');
    expect(storageImpact?.heapDiff).toBeLessThan(512 * 1024); // Less than 512KB

    unmount();
  });

  test('renders efficiently with many tabs', async () => {
    performanceMonitor.mark('render-start');

    render(
      <NavigationProvider>
        <TabbedWorkspace />
      </NavigationProvider>
    );

    // Create many tabs rapidly
    for (let i = 0; i < 20; i++) {
      fireEvent.click(screen.getByText('New Tab'));
    }

    const renderTime = performanceMonitor.measure('render-start');
    expect(renderTime).toBeLessThan(1000); // Should render in under 1 second
  });

  test('tab animations are smooth', async () => {
    let frameDrops = 0;
    const originalRAF = window.requestAnimationFrame;
    
    window.requestAnimationFrame = callback => {
      const start = performance.now();
      return originalRAF(() => {
        const end = performance.now();
        if (end - start > 16.67) { // 60fps threshold
          frameDrops++;
        }
        callback(end);
      });
    };

    render(
      <NavigationProvider>
        <TabbedWorkspace />
      </NavigationProvider>
    );

    // Trigger animations
    fireEvent.click(screen.getByText('New Tab'));
    await new Promise(resolve => setTimeout(resolve, 300)); // Animation duration

    expect(frameDrops).toBeLessThan(3); // Allow max 3 dropped frames

    window.requestAnimationFrame = originalRAF;
  });

  test('large tab content renders efficiently', async () => {
    const LargeContent = () => {
      return (
        <div>
          {Array.from({ length: 1000 }).map((_, i) => (
            <div key={i}>Row {i}</div>
          ))}
        </div>
      );
    };

    performanceMonitor.mark('large-content-start');

    render(
      <NavigationProvider>
        <TabbedWorkspace>
          <LargeContent />
        </TabbedWorkspace>
      </NavigationProvider>
    );

    const renderTime = performanceMonitor.measure('large-content-start');
    expect(renderTime).toBeLessThan(1000); // Should render in under 1 second
  });
});

import React from 'react';
import { render, act } from '@testing-library/react';
import { TabContext } from '@/contexts/TabContext';

import { useRenderCount, useTrackMemoryUsage, trackEventListeners } from '@/utils/testUtils';

describe('Memory and Performance Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('Component render count stays within acceptable limits', () => {
    const TestComponent = () => {
      const renderCount = useRenderCount();
      const [state, setState] = React.useState(0);

      React.useEffect(() => {
        const interval = setInterval(() => {
          setState(s => s + 1);
        }, 1000);

        return () => clearInterval(interval);
      }, []);

      return <div>Renders: {renderCount.current}</div>;
    };

    render(<TestComponent />);

    // Fast-forward time by 5 seconds (5 updates)
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Component should have rendered initially (1) plus once per state update (5)
    expect(useRenderCount().current).toBeLessThanOrEqual(6);
  });

  test('Memory usage remains stable during tab operations', () => {
    const memoryReadings: number[] = [];
    const TestComponent = () => {
      const memoryUsage = useTrackMemoryUsage();
      const [tabs, setTabs] = React.useState<any[]>([]);

      React.useEffect(() => {
        // Simulate adding 10 tabs
        const newTabs = Array.from({ length: 10 }, (_, i) => ({
          id: `tab-${i}`,
          title: `Tab ${i}`,
          content: `Content ${i}`,
          module: 'test-module',
        }));
        setTabs(newTabs);
        memoryReadings.push(memoryUsage.current);
      }, []);

      return (
        <div>
          {tabs.map(tab => (
            <div key={tab.id}>{tab.title}</div>
          ))}
        </div>
      );
    };

    render(<TestComponent />);

    // Memory usage should not have significant spikes
    const maxDiff = Math.max(
      ...memoryReadings.slice(1).map((reading, i) => 
        Math.abs(reading - memoryReadings[i])
      )
    );
    expect(maxDiff).toBeLessThan(50); // MB
  });

  test('Event listeners are properly cleaned up', () => {
    const TestComponent = () => {
      React.useEffect(() => {
        const handler = () => console.log('click');
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
      }, []);

      return <div>Test Component</div>;
    };

    const listenersBefore = trackEventListeners();
    const { unmount } = render(<TestComponent />);
    const listenersAfterMount = trackEventListeners();
    
    unmount();
    const listenersAfterUnmount = trackEventListeners();

    // After unmount, listener count should return to initial state
    expect(listenersAfterUnmount).toEqual(listenersBefore);
    // During component lifecycle, there should be exactly one more listener
    expect(listenersAfterMount).toBe(listenersBefore + 1);
  });

  test('Animation frame cleanup', () => {
    const animationFrameCallbacks: Function[] = [];
    const TestComponent = () => {
      React.useEffect(() => {
        const callback = () => console.log('animation frame');
        const handle = requestAnimationFrame(callback);
        animationFrameCallbacks.push(callback);
        return () => cancelAnimationFrame(handle);
      }, []);

      return <div>Test Component</div>;
    };

    const { unmount } = render(<TestComponent />);
    expect(animationFrameCallbacks.length).toBe(1);

    unmount();
    // After unmount, no animation frames should be pending
    expect(animationFrameCallbacks.every(cb => 
      !cb.toString().includes('animation frame')
    )).toBe(true);
  });

  test('Memory cleanup with large datasets', () => {
    const TestComponent = () => {
      const [data, setData] = React.useState<any[]>([]);
      const memoryUsage = useTrackMemoryUsage();

      React.useEffect(() => {
        initialMemory = memoryUsage.current;
        
        // Create large dataset
        const largeData = Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          value: `Item ${i}`,
          metadata: {
            timestamp: Date.now(),
            description: 'A long description that takes up memory'.repeat(10),
          }
        }));
        
        setData(largeData);

        return () => {
          setData([]); // Clear data on unmount
        };
      }, []);

      return (
        <div>
          <div>Items: {data.length}</div>
          <div>Memory Usage: {memoryUsage.current}MB</div>
        </div>
      );
    };

    const { unmount } = render(<TestComponent />);
    const memoryAfterMount = useTrackMemoryUsage().current;
    
    unmount();
    const memoryAfterUnmount = useTrackMemoryUsage().current;

    // Memory usage should decrease after unmount
    expect(memoryAfterUnmount).toBeLessThan(memoryAfterMount);
  });

  test('Renders handle prop updates efficiently', () => {
    const renderSpy = jest.fn();
    const TestComponent = React.memo(({ value }: { value: number }) => {
      renderSpy();
      return <div>{value}</div>;
    });

    const { rerender } = render(<TestComponent value={1} />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Rerender with same value
    rerender(<TestComponent value={1} />);
    expect(renderSpy).toHaveBeenCalledTimes(1); // Should not re-render

    // Rerender with different value
    rerender(<TestComponent value={2} />);
    expect(renderSpy).toHaveBeenCalledTimes(2); // Should re-render once
  });

  test('Context updates do not cause unnecessary child renders', () => {
    const childRenderSpy = jest.fn();
    const ChildComponent = React.memo(() => {
      childRenderSpy();
      return <div>Child</div>;
    });

    const mockTab = {
      id: 'test-tab',
      title: 'Test Tab',
      content: 'Test Content',
      module: 'test-module',
    };

    const { rerender } = render(
      <TabContext.Provider value={{
        activeTab: mockTab,
        setActiveTab: jest.fn(),
        tabs: [mockTab],
        addTab: jest.fn(),
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <ChildComponent />
      </TabContext.Provider>
    );

    expect(childRenderSpy).toHaveBeenCalledTimes(1);

    // Update context with same values
    rerender(
      <TabContext.Provider value={{
        activeTab: mockTab,
        setActiveTab: jest.fn(),
        tabs: [mockTab],
        addTab: jest.fn(),
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <ChildComponent />
      </TabContext.Provider>
    );

    // Child should not re-render when context updates with same values
    expect(childRenderSpy).toHaveBeenCalledTimes(1);
  });
});

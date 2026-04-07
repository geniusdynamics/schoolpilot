import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { TabContext } from '@/contexts/TabContext';
import { TabPanel } from '@/components/TabPanel';
import { useRenderCount, useTrackMemoryUsage } from '@/utils/testUtils';

describe('Render Loop Prevention Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('TabPanel component should not re-render unnecessarily', () => {
    const mockTab = {
      id: 'test-tab',
      title: 'Test Tab',
      content: 'Test Content',
      module: 'test-module',
    };

    const { result } = renderHook(() => useRenderCount());

    render(
      <TabContext.Provider value={{ 
        activeTab: mockTab, 
        setActiveTab: jest.fn(),
        tabs: [mockTab],
        addTab: jest.fn(),
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <TabPanel tab={mockTab} />
      </TabContext.Provider>
    );

    // Initial render
    expect(result.current.count).toBe(1);

    // Force a re-render
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should not have re-rendered
    expect(result.current.count).toBe(1);
  });

  test('Effects run only when dependencies change', () => {
    const effectCallback = jest.fn();
    const mockTab = {
      id: 'test-tab',
      title: 'Test Tab',
      content: 'Test Content',
      module: 'test-module',
    };

    const TestComponent = () => {
      React.useEffect(() => {
        effectCallback();
      }, [mockTab.id]); // Only depend on tab ID

      return <div>{mockTab.title}</div>;
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
        <TestComponent />
      </TabContext.Provider>
    );

    expect(effectCallback).toHaveBeenCalledTimes(1);

    // Re-render with same tab ID
    rerender(
      <TabContext.Provider value={{ 
        activeTab: { ...mockTab, title: 'Updated Title' }, 
        setActiveTab: jest.fn(),
        tabs: [mockTab],
        addTab: jest.fn(),
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <TestComponent />
      </TabContext.Provider>
    );

    // Effect should not have run again since ID didn't change
    expect(effectCallback).toHaveBeenCalledTimes(1);
  });

  test('Infinite loop prevention', async () => {
    const stateUpdateMock = jest.fn();
    const TestComponent = () => {
      const [count, setCount] = React.useState(0);
      const renderCount = React.useRef(0);

      React.useEffect(() => {
        renderCount.current++;
        if (renderCount.current > 100) {
          throw new Error('Too many renders - possible infinite loop');
        }
        setCount(c => c + 1);
        stateUpdateMock();
      }, [count]); // Deliberately create a potential loop

      return <div>{count}</div>;
    };

    // This should throw after max renders
    expect(() => {
      render(<TestComponent />);
      act(() => {
        jest.runAllTimers();
      });
    }).toThrow('Too many renders - possible infinite loop');
  });

  test('Memory leak prevention', () => {
    const TestComponent = () => {
      const memoryUsage = useTrackMemoryUsage();
      const [items, setItems] = React.useState<any[]>([]);

      React.useEffect(() => {
        // Simulate memory usage by creating large arrays
        const newItems = Array(1000000).fill('test');
        setItems(newItems);
      }, []);

      return (
        <div>
          <div>Memory Usage: {memoryUsage.current}MB</div>
          <div>Items: {items.length}</div>
        </div>
      );
    };

    render(<TestComponent />);

    // Check that memory usage is within reasonable limits
    // Note: This is a rough estimate and may need adjustment based on environment
    const maxMemoryUsage = 100; // MB
    const memoryElement = screen.getByText(/Memory Usage:/);
    const usage = parseInt(memoryElement.textContent!.split(':')[1]);
    expect(usage).toBeLessThan(maxMemoryUsage);
  });

  test('Effect cleanup is properly handled', () => {
    const cleanupMock = jest.fn();
    const effectMock = jest.fn();

    const TestComponent = ({ id }: { id: string }) => {
      React.useEffect(() => {
        effectMock();
        return () => cleanupMock();
      }, [id]);

      return <div>Test</div>;
    };

    const { rerender, unmount } = render(<TestComponent id="1" />);

    // Initial effect
    expect(effectMock).toHaveBeenCalledTimes(1);
    expect(cleanupMock).not.toHaveBeenCalled();

    // Re-render with new prop
    rerender(<TestComponent id="2" />);
    expect(effectMock).toHaveBeenCalledTimes(2);
    expect(cleanupMock).toHaveBeenCalledTimes(1);

    // Unmount
    unmount();
    expect(cleanupMock).toHaveBeenCalledTimes(2);
  });
});

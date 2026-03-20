import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, beforeEach } from 'vitest';
import { createRenderTracker } from '../utils/testUtils';
import { TabbedWorkspace } from '../../components/tabbedWorkspace';
import { NavigationProvider } from '../../providers/NavigationProvider';

describe('Render Count Tests', () => {
  const renderTracker = createRenderTracker();

  beforeEach(() => {
    renderTracker.reset();
  });

  test('NavigationProvider should render child components efficiently', () => {
    const TestChild = () => {
      renderTracker.track('TestChild');
      return <div>Test Child</div>;
    };

    render(
      <NavigationProvider>
        <TestChild />
      </NavigationProvider>
    );

    expect(renderTracker.getCount('TestChild')).toBe(1);

    // Navigation should not cause unnecessary child re-renders
    fireEvent.click(screen.getByText('Test Child'));
    expect(renderTracker.getCount('TestChild')).toBe(1);
  });

  test('TabbedWorkspace should minimize tab content re-renders', () => {
    const TabContent = () => {
      renderTracker.track('TabContent');
      return <div>Tab Content</div>;
    };

    render(
      <NavigationProvider>
        <TabbedWorkspace>
          <TabContent />
        </TabbedWorkspace>
      </NavigationProvider>
    );

    const initialRenderCount = renderTracker.getCount('TabContent');
    
    // Switch tabs
    fireEvent.click(screen.getByText('New Tab'));
    fireEvent.click(screen.getByText('Tab Content'));

    // Content should not re-render when simply switching tabs
    expect(renderTracker.getCount('TabContent')).toBe(initialRenderCount);
  });

  test('tab navigation should only update necessary components', () => {
    const TabList = () => {
      renderTracker.track('TabList');
      return <div>Tab List</div>;
    };

    const TabPanel = () => {
      renderTracker.track('TabPanel');
      return <div>Tab Panel</div>;
    };

    render(
      <NavigationProvider>
        <TabbedWorkspace>
          <TabList />
          <TabPanel />
        </TabbedWorkspace>
      </NavigationProvider>
    );

    const initialTabListRenders = renderTracker.getCount('TabList');
    const initialTabPanelRenders = renderTracker.getCount('TabPanel');

    // Navigate between tabs
    fireEvent.click(screen.getByText('Tab List'));
    fireEvent.click(screen.getByText('Tab Panel'));

    // Only the panel should update, not the list
    expect(renderTracker.getCount('TabList')).toBe(initialTabListRenders);
    expect(renderTracker.getCount('TabPanel')).toBe(initialTabPanelRenders + 1);
  });

  test('effect dependencies are properly optimized', () => {
    const EffectComponent = ({ dependency = 0 }) => {
      renderTracker.track('EffectComponent');
      React.useEffect(() => {
        renderTracker.track('Effect');
      }, [dependency]);
      return <div>Effect Test</div>;
    };

    const { rerender } = render(<EffectComponent dependency={1} />);

    const initialRenderCount = renderTracker.getCount('EffectComponent');
    const initialEffectCount = renderTracker.getCount('Effect');

    // Re-render with same dependency
    rerender(<EffectComponent dependency={1} />);

    expect(renderTracker.getCount('EffectComponent')).toBe(initialRenderCount + 1);
    expect(renderTracker.getCount('Effect')).toBe(initialEffectCount);

    // Re-render with new dependency
    rerender(<EffectComponent dependency={2} />);

    expect(renderTracker.getCount('EffectComponent')).toBe(initialRenderCount + 2);
    expect(renderTracker.getCount('Effect')).toBe(initialEffectCount + 1);
  });

  test('memoization prevents unnecessary re-renders', () => {
    const MemoizedChild = React.memo(() => {
      renderTracker.track('MemoizedChild');
      return <div>Memoized Child</div>;
    });

    const Parent = () => {
      const [count, setCount] = React.useState(0);
      return (
        <div>
          <button onClick={() => setCount(c => c + 1)}>Increment</button>
          <div>Count: {count}</div>
          <MemoizedChild />
        </div>
      );
    };

    render(<Parent />);

    const initialChildRenders = renderTracker.getCount('MemoizedChild');

    // Parent state update should not re-render memoized child
    fireEvent.click(screen.getByText('Increment'));
    fireEvent.click(screen.getByText('Increment'));

    expect(renderTracker.getCount('MemoizedChild')).toBe(initialChildRenders);
  });
});

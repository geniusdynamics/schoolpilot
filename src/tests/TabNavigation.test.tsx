import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TabContext } from '../contexts/TabContext';
import { TabPanel } from '../components/TabPanel';
import { useNavigate } from 'react-router-dom';
import { useTabNavigation } from '../hooks/useTabNavigation';

// Mock React Router hooks
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(() => ({ pathname: '/test' })),
}));

describe('Tab Navigation Tests', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    jest.clearAllMocks();
  });

  test('Tabs are created when navigating to new routes', () => {
    const addTabMock = jest.fn();
    const mockTab = {
      id: 'test-tab',
      title: 'Test Tab',
      content: 'Test Content',
      module: 'test-module',
    };

    // Render test component with TabContext
    const { rerender } = render(
      <TabContext.Provider value={{
        activeTab: null,
        setActiveTab: jest.fn(),
        tabs: [],
        addTab: addTabMock,
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <TabPanel tab={mockTab} />
      </TabContext.Provider>
    );

    // Check that addTab was called
    expect(addTabMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockTab.id,
        title: mockTab.title,
      })
    );

    // Navigate to new route
    const newTab = { ...mockTab, id: 'new-tab', title: 'New Tab' };
    rerender(
      <TabContext.Provider value={{
        activeTab: mockTab,
        setActiveTab: jest.fn(),
        tabs: [mockTab],
        addTab: addTabMock,
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <TabPanel tab={newTab} />
      </TabContext.Provider>
    );

    // Check that addTab was called again with new tab
    expect(addTabMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: newTab.id,
        title: newTab.title,
      })
    );
  });

  test('Existing tabs are activated instead of creating duplicates', () => {
    const addTabMock = jest.fn();
    const setActiveTabMock = jest.fn();
    const existingTab = {
      id: 'existing-tab',
      title: 'Existing Tab',
      content: 'Existing Content',
      module: 'test-module',
    };

    const { rerender } = render(
      <TabContext.Provider value={{
        activeTab: null,
        setActiveTab: setActiveTabMock,
        tabs: [existingTab],
        addTab: addTabMock,
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <TabPanel tab={existingTab} />
      </TabContext.Provider>
    );

    // Try to add the same tab again
    rerender(
      <TabContext.Provider value={{
        activeTab: existingTab,
        setActiveTab: setActiveTabMock,
        tabs: [existingTab],
        addTab: addTabMock,
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <TabPanel tab={existingTab} />
      </TabContext.Provider>
    );

    // Check that addTab wasn't called again but setActiveTab was
    expect(addTabMock).toHaveBeenCalledTimes(1);
    expect(setActiveTabMock).toHaveBeenCalledWith(existingTab);
  });

  test('Tab limits are enforced', () => {
    const MAX_TABS = 10;
    const addTabMock = jest.fn();
    const removeTabMock = jest.fn();
    const existingTabs = Array.from({ length: MAX_TABS }, (_, i) => ({
      id: `tab-${i}`,
      title: `Tab ${i}`,
      content: `Content ${i}`,
      module: 'test-module',
    }));

    const newTab = {
      id: 'new-tab',
      title: 'New Tab',
      content: 'New Content',
      module: 'test-module',
    };

    render(
      <TabContext.Provider value={{
        activeTab: existingTabs[0],
        setActiveTab: jest.fn(),
        tabs: existingTabs,
        addTab: addTabMock,
        removeTab: removeTabMock,
        removeAllTabs: jest.fn(),
      }}>
        <TabPanel tab={newTab} />
      </TabContext.Provider>
    );

    // Check that the oldest tab was removed before adding the new one
    expect(removeTabMock).toHaveBeenCalledWith(existingTabs[0].id);
    expect(addTabMock).toHaveBeenCalledWith(newTab);
  });

  test('Cross-module navigation maintains tab state', () => {
    const addTabMock = jest.fn();
    const setActiveTabMock = jest.fn();
    
    const moduleATab = {
      id: 'module-a-tab',
      title: 'Module A',
      content: 'Module A Content',
      module: 'module-a',
    };

    const moduleBTab = {
      id: 'module-b-tab',
      title: 'Module B',
      content: 'Module B Content',
      module: 'module-b',
    };

    const { rerender } = render(
      <TabContext.Provider value={{
        activeTab: moduleATab,
        setActiveTab: setActiveTabMock,
        tabs: [moduleATab],
        addTab: addTabMock,
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <TabPanel tab={moduleATab} />
      </TabContext.Provider>
    );

    // Navigate to module B
    rerender(
      <TabContext.Provider value={{
        activeTab: moduleATab,
        setActiveTab: setActiveTabMock,
        tabs: [moduleATab, moduleBTab],
        addTab: addTabMock,
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <TabPanel tab={moduleBTab} />
      </TabContext.Provider>
    );

    // Navigate back to module A
    rerender(
      <TabContext.Provider value={{
        activeTab: moduleBTab,
        setActiveTab: setActiveTabMock,
        tabs: [moduleATab, moduleBTab],
        addTab: addTabMock,
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <TabPanel tab={moduleATab} />
      </TabContext.Provider>
    );

    // Check that tab state was maintained
    expect(addTabMock).toHaveBeenCalledTimes(2); // Only for initial creation
    expect(setActiveTabMock).toHaveBeenCalledWith(moduleATab);
  });

  test('useTabNavigation hook manages tab state correctly', () => {
    const TestComponent = () => {
      const { addTab, setActiveTab } = useTabNavigation();
      
      const handleClick = () => {
        const newTab = {
          id: 'new-tab',
          title: 'New Tab',
          content: 'New Content',
          module: 'test-module',
        };
        addTab(newTab);
        setActiveTab(newTab);
      };

      return <button onClick={handleClick}>Add Tab</button>;
    };

    const addTabMock = jest.fn();
    const setActiveTabMock = jest.fn();

    render(
      <TabContext.Provider value={{
        activeTab: null,
        setActiveTab: setActiveTabMock,
        tabs: [],
        addTab: addTabMock,
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <TestComponent />
      </TabContext.Provider>
    );

    // Click the button to add a tab
    fireEvent.click(screen.getByText('Add Tab'));

    // Check that tab was added and activated
    expect(addTabMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-tab',
        title: 'New Tab',
      })
    );
    expect(setActiveTabMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-tab',
        title: 'New Tab',
      })
    );
  });
});

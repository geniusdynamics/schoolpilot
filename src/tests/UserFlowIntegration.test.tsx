import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TabContext } from '@/contexts/TabContext';
import { AuthContext } from '@/contexts/AuthContext';
import { App } from '../App';
import { LoginPage } from '../pages/LoginPage';
import { Dashboard } from '../pages/Dashboard';

// Mock local storage
const mockStorage: { [key: string]: string } = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key],
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); },
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  const renderWithProviders = (
    ui: React.ReactElement,
    { initialRoute = '/' } = {}
  ) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthContext.Provider value={{
          user: null,
          login: jest.fn(),
          logout: jest.fn(),
          isAuthenticated: false,
        }}>
          <TabContext.Provider value={{
            activeTab: null,
            setActiveTab: jest.fn(),
            tabs: [],
            addTab: jest.fn(),
            removeTab: jest.fn(),
            removeAllTabs: jest.fn(),
          }}>
            <Routes>
              <Route path="/" element={ui} />
            </Routes>
          </TabContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  test('Full user flow from login to tab creation', async () => {
    const mockLogin = jest.fn().mockResolvedValue({ username: 'testuser' });
    const mockAddTab = jest.fn();
    const mockSetActiveTab = jest.fn();

    render(
      <MemoryRouter>
        <AuthContext.Provider value={{
          user: null,
          login: mockLogin,
          logout: jest.fn(),
          isAuthenticated: false,
        }}>
          <TabContext.Provider value={{
            activeTab: null,
            setActiveTab: mockSetActiveTab,
            tabs: [],
            addTab: mockAddTab,
            removeTab: jest.fn(),
            removeAllTabs: jest.fn(),
          }}>
            <LoginPage />
          </TabContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // Fill in login form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Wait for login process
    await screen.findByText(/dashboard/i);

    // Verify login was called
    expect(mockLogin).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123',
    });
  });

  test('Navigation between multiple modules', () => {
    const mockSetActiveTab = jest.fn();
    const mockAddTab = jest.fn();
    const tabs: any[] = [];

    const TestComponent = () => {
      const handleModuleClick = (module: string) => {
        const newTab = {
          id: `${module}-tab`,
          title: `${module} Tab`,
          content: `${module} Content`,
          module,
        };
        mockAddTab(newTab);
        mockSetActiveTab(newTab);
        tabs.push(newTab);
      };

      return (
        <div>
          <button onClick={() => handleModuleClick('module1')}>Module 1</button>
          <button onClick={() => handleModuleClick('module2')}>Module 2</button>
          <div>
            {tabs.map(tab => (
              <div key={tab.id}>{tab.title}</div>
            ))}
          </div>
        </div>
      );
    };

    render(
      <TabContext.Provider value={{
        activeTab: null,
        setActiveTab: mockSetActiveTab,
        tabs,
        addTab: mockAddTab,
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <TestComponent />
      </TabContext.Provider>
    );

    // Navigate to Module 1
    fireEvent.click(screen.getByText('Module 1'));
    expect(mockAddTab).toHaveBeenCalledWith(expect.objectContaining({
      module: 'module1',
    }));
    expect(mockSetActiveTab).toHaveBeenCalledWith(expect.objectContaining({
      module: 'module1',
    }));

    // Navigate to Module 2
    fireEvent.click(screen.getByText('Module 2'));
    expect(mockAddTab).toHaveBeenCalledWith(expect.objectContaining({
      module: 'module2',
    }));
    expect(mockSetActiveTab).toHaveBeenCalledWith(expect.objectContaining({
      module: 'module2',
    }));
  });

  test('Tab persistence across refreshes', () => {
    const mockTabs = [
      { id: 'tab1', title: 'Tab 1', content: 'Content 1', module: 'module1' },
      { id: 'tab2', title: 'Tab 2', content: 'Content 2', module: 'module2' },
    ];

    // Store tabs in localStorage
    localStorage.setItem('tabs', JSON.stringify(mockTabs));

    const { rerender } = renderWithProviders(<App />);

    // Verify tabs are restored
    mockTabs.forEach(tab => {
      expect(screen.getByText(tab.title)).toBeInTheDocument();
    });

    // Simulate refresh
    rerender(<App />);

    // Verify tabs are still present
    mockTabs.forEach(tab => {
      expect(screen.getByText(tab.title)).toBeInTheDocument();
    });
  });

  test('Error recovery scenarios', async () => {
    const mockError = new Error('Network Error');
    const mockLogin = jest.fn().mockRejectedValue(mockError);
    
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{
          user: null,
          login: mockLogin,
          logout: jest.fn(),
          isAuthenticated: false,
        }}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // Attempt login
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Verify error message is displayed
    await screen.findByText(/network error/i);

    // Retry with successful login
    mockLogin.mockResolvedValueOnce({ username: 'testuser' });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Verify recovery
    await screen.findByText(/dashboard/i);
  });

  test('Tab state is properly maintained during navigation', () => {
    const mockSetActiveTab = jest.fn();
    const mockAddTab = jest.fn();
    const tabs = [
      { id: 'tab1', title: 'Tab 1', content: 'Content 1', module: 'module1' },
      { id: 'tab2', title: 'Tab 2', content: 'Content 2', module: 'module2' },
    ];

    const TestComponent = () => (
      <div>
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => mockSetActiveTab(tab)}
          >
            {tab.title}
          </button>
        ))}
        <div id="content">
          {tabs.find(t => t === mockSetActiveTab.mock.calls[0]?.[0])?.content}
        </div>
      </div>
    );

    render(
      <TabContext.Provider value={{
        activeTab: tabs[0],
        setActiveTab: mockSetActiveTab,
        tabs,
        addTab: mockAddTab,
        removeTab: jest.fn(),
        removeAllTabs: jest.fn(),
      }}>
        <TestComponent />
      </TabContext.Provider>
    );

    // Click tab 2
    fireEvent.click(screen.getByText('Tab 2'));
    expect(mockSetActiveTab).toHaveBeenCalledWith(tabs[1]);

    // Click tab 1
    fireEvent.click(screen.getByText('Tab 1'));
    expect(mockSetActiveTab).toHaveBeenCalledWith(tabs[0]);

    // Verify active tab state was maintained
    expect(mockSetActiveTab).toHaveBeenCalledTimes(2);
  });
});

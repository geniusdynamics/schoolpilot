// ABOUTME: Simplified ActionProvider for testing without infinite loops
// ABOUTME: Minimal implementation to isolate the infinite loop issue

import React, { createContext, useContext, ReactNode } from 'react';

// Simplified context interface
interface SimpleActionProviderContextType {
  // Minimal functionality for testing
  currentContext: any;
  contextualActions: any[];
  contextualGroups: any[];
  executeAction: (actionId: string) => Promise<void>;
  registerAction: (action: any) => void;
  registerActionGroup: (module: string, page: string, group: any) => void;
  getActionsForModule: (module: string) => any[];
  searchActions: (query: string) => any[];
  getActionById: (actionId: string) => any;
  updateContext: (updates: any) => void;
  setModuleContext: (module: string, submodule?: string, feature?: string) => void;
}

// Create the context
const SimpleActionProviderContext = createContext<SimpleActionProviderContextType | null>(null);

// Simple ActionProvider props
interface SimpleActionProviderProps {
  children: ReactNode;
}

// Minimal ActionProvider component
export const SimpleActionProvider: React.FC<SimpleActionProviderProps> = ({ children }) => {
  // Minimal static implementation
  const contextValue: SimpleActionProviderContextType = {
    currentContext: null,
    contextualActions: [],
    contextualGroups: [],
    executeAction: async () => {},
    registerAction: () => {},
    registerActionGroup: () => {},
    getActionsForModule: () => [],
    searchActions: () => [],
    getActionById: () => null,
    updateContext: () => {},
    setModuleContext: () => {}
  };

  return (
    <SimpleActionProviderContext.Provider value={contextValue}>
      {children}
    </SimpleActionProviderContext.Provider>
  );
};

// Hook to use the SimpleActionProvider context
export const useSimpleActionProvider = (): SimpleActionProviderContextType => {
  const context = useContext(SimpleActionProviderContext);
  
  if (!context) {
    throw new Error('useSimpleActionProvider must be used within a SimpleActionProvider');
  }
  
  return context;
};
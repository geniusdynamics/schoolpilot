
import React, { useState, ReactNode } from 'react';

interface TabProps {
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabProps[];
  defaultTabIndex?: number;
}

const Tabs: React.FC<TabsProps> = ({ tabs, defaultTabIndex = 0 }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(defaultTabIndex);

  const handleTabClick = (index: number) => {
    if (!tabs[index].disabled) {
      setActiveTabIndex(index);
    }
  };

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              onClick={() => handleTabClick(index)}
              disabled={tab.disabled}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                ${activeTabIndex === index
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              aria-current={activeTabIndex === index ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-5">
        {tabs[activeTabIndex] && tabs[activeTabIndex].content}
      </div>
    </div>
  );
};

// Shadcn-ui style Tab components for compatibility
export const TabsRoot: React.FC<{
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}> = ({ value, onValueChange, children, className = '' }) => {
  const [currentValue, setCurrentValue] = useState(value || '');
  
  const handleValueChange = (newValue: string) => {
    setCurrentValue(newValue);
    onValueChange?.(newValue);
  };
  
  return (
    <div className={`w-full ${className}`} data-tabs-value={currentValue}>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, { 
              currentValue, 
              onValueChange: handleValueChange 
            } as any)
          : child
      )}
    </div>
  );
};

export const TabsList: React.FC<{
  children: ReactNode;
  className?: string;
  currentValue?: string;
  onValueChange?: (value: string) => void;
}> = ({ children, className = '', currentValue, onValueChange }) => {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, { 
              currentValue, 
              onValueChange 
            } as any)
          : child
      )}
    </div>
  );
};

export const TabsTrigger: React.FC<{
  value: string;
  children: ReactNode;
  className?: string;
  currentValue?: string;
  onValueChange?: (value: string) => void;
}> = ({ value, children, className = '', currentValue, onValueChange }) => {
  const isActive = currentValue === value;
  
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'hover:bg-muted hover:text-foreground'
      } ${className}`}
      onClick={() => onValueChange?.(value)}
      data-state={isActive ? 'active' : 'inactive'}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{
  value: string;
  children: ReactNode;
  className?: string;
  currentValue?: string;
}> = ({ value, children, className = '', currentValue }) => {
  if (currentValue !== value) return null;
  
  return (
    <div
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      data-state="active"
    >
      {children}
    </div>
  );
};

// Export both APIs for compatibility
export { TabsRoot as Tabs };
export default Tabs;

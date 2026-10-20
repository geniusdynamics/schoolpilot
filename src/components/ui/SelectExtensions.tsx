// ABOUTME: Extended Select components that provide a shadcn-style API
// ABOUTME: These components work with the existing Select component

import React, { createContext, useContext, ReactNode } from 'react';

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

interface SelectRootProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export const SelectRoot: React.FC<SelectRootProps> = ({ value, onValueChange, children }) => {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      {children}
    </SelectContext.Provider>
  );
};

interface SelectTriggerProps {
  className?: string;
  children: ReactNode;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ className, children }) => {
  return (
    <div className={`flex h-10 w-full items-center justify-between rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm ring-offset-white placeholder:text-surface-muted-fg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}>
      {children}
    </div>
  );
};

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder, className }) => {
  const context = useContext(SelectContext);
  
  return (
    <span className={`text-sm ${className || ''}`}>
      {context?.value || placeholder}
    </span>
  );
};

interface SelectContentProps {
  children: ReactNode;
  className?: string;
}

export const SelectContent: React.FC<SelectContentProps> = ({ children, className }) => {
  return (
    <div className={`relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-surface-border bg-surface-card text-surface-foreground shadow-md ${className || ''}`}>
      <div className="p-1">
        {children}
      </div>
    </div>
  );
};

interface SelectItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const SelectItem: React.FC<SelectItemProps> = ({ value, children, className }) => {
  const context = useContext(SelectContext);
  
  const handleClick = () => {
    if (context?.onValueChange) {
      context.onValueChange(value);
    }
  };
  
  const isSelected = context?.value === value;
  
  return (
    <div
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-surface-accent focus:bg-surface-accent ${isSelected ? 'bg-surface-accent' : ''} ${className || ''}`}
      onClick={handleClick}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
      )}
      {children}
    </div>
  );
};

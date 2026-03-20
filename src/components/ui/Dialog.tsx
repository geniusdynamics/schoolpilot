// ABOUTME: Provides shadcn-style Dialog components based on the existing Modal component
// ABOUTME: These components provide a simpler API for dialog-based interactions

import React, { createContext, useContext, ReactNode } from 'react';
import Modal from './Modal';

interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open = false, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange: onOpenChange || (() => {}) }}>
      {children}
    </DialogContext.Provider>
  );
};

interface DialogTriggerProps {
  asChild?: boolean;
  children: ReactNode;
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({ children, asChild }) => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('DialogTrigger must be used within a Dialog');
  }

  const handleClick = () => {
    context.onOpenChange(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      ...children.props,
    });
  }

  return (
    <button onClick={handleClick}>
      {children}
    </button>
  );
};

interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({ children, className }) => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('DialogContent must be used within a Dialog');
  }

  const handleClose = () => {
    context.onOpenChange(false);
  };

  // Extract title from DialogTitle child if present
  let title = 'Dialog';
  const restChildren = children;

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === DialogTitle) {
      const childElement = child as React.ReactElement;
      title = typeof childElement.props.children === 'string' ? childElement.props.children : 'Dialog';
    }
  });

  return (
    <Modal
      isOpen={context.open}
      onClose={handleClose}
      title={title}
      className={className}
    >
      {restChildren}
    </Modal>
  );
};

interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className }) => {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      {children}
    </div>
  );
};

interface DialogTitleProps {
  children: ReactNode;
  className?: string;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className }) => {
  return (
    <h2 className={`text-lg font-semibold ${className || ''}`}>
      {children}
    </h2>
  );
};

interface DialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ children, className }) => {
  return (
    <p className={`text-sm text-gray-600 ${className || ''}`}>
      {children}
    </p>
  );
};

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ children, className }) => {
  return (
    <div className={`flex justify-end space-x-2 pt-4 ${className || ''}`}>
      {children}
    </div>
  );
};

// ABOUTME: Toast notification provider using notistack for database operations
// ABOUTME: Provides success/error notifications with queue management and persistence

import React from 'react';
import { SnackbarProvider } from 'notistack';

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      autoHideDuration={4000}
      preventDuplicate
      dense
      style={{
        fontFamily: 'inherit',
      }}
    >
      {children}
    </SnackbarProvider>
  );
};

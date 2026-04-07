// ABOUTME: Custom hooks for accessing AppDataContext
// ABOUTME: Separated from AppDataContext.tsx to maintain Fast Refresh compatibility

import { useContext } from 'react';
import { AppDataContext } from '@/contexts/AppDataContext';
import type { EnhancedAppDataContextType } from '@/contexts/AppDataContext';

// Export hooks with consistent naming for Fast Refresh compatibility
export function useAppData(): EnhancedAppDataContextType {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}

// Internal hook for use during provider initialization - doesn't throw error
export function useAppDataInternal(): EnhancedAppDataContextType | null {
  const context = useContext(AppDataContext);
  return context || null;
}
import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { UnifiedDatabaseManager } from '@/services/database/UnifiedDatabaseManager';
import { useToastHelpers } from '@/hooks/useToast';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  collection?: string;
}

export interface ValidationContextType {
  validateData: () => Promise<{ isValid: boolean; issues: ValidationIssue[] }>;
}

export const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

export const ValidationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const toast = useToastHelpers();
  const validateData = useCallback(async () => {
    try {
      console.log('🔍 [ValidationContext] Validating data integrity...');
      const dbManager = UnifiedDatabaseManager.getInstance();
      const issues: ValidationIssue[] = [];

      for (const [name, collection] of dbManager.getAllCollections()) {
        try {
          if (!collection) {
            issues.push({
              severity: 'error',
              message: `Collection ${name} is null or undefined`,
              collection: name
            });
            continue;
          }

          if (typeof collection.count === 'function') {
            const count = await collection.count();
            if (count < 0) {
              issues.push({
                severity: 'error',
                message: `Collection ${name} has negative count: ${count}`,
                collection: name
              });
            }
          }

          // Check for duplicate IDs
          if (typeof collection.find === 'function') {
            const docs = await collection.find({});
            const ids = new Set();
            const duplicates: string[] = [];

            for (const doc of docs) {
              if (doc.id) {
                if (ids.has(doc.id)) {
                  duplicates.push(doc.id);
                } else {
                  ids.add(doc.id);
                }
              }
            }

            if (duplicates.length > 0) {
              issues.push({
                severity: 'error',
                message: `Collection ${name} has ${duplicates.length} duplicate IDs`,
                collection: name
              });
            }
          }
        } catch (err) {
          issues.push({
            severity: 'warning',
            message: `Failed to validate collection ${name}: ${err instanceof Error ? err.message : String(err)}`,
            collection: name
          });
        }
      }

      const isValid = !issues.some(issue => issue.severity === 'error');
      
      if (isValid) {
        toast.showSuccess('Data validation passed');
      } else {
        toast.showWarning(`Data validation found ${issues.filter(i => i.severity === 'error').length} errors`);
      }

      console.log(`✅ [ValidationContext] Data validation completed. Found ${issues.length} issues.`);
      return { isValid, issues };
    } catch (err) {
      console.error('❌ [ValidationContext] Global validation error:', err);
      throw err;
    }
  }, [toast]);

  return (
    <ValidationContext.Provider value={{ validateData }}>
      {children}
    </ValidationContext.Provider>
  );
};

export const useValidationContext = () => {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useValidationContext must be used within a ValidationProvider');
  }
  return context;
};

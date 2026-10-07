import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { UnifiedDatabaseManager } from '@/services/database/UnifiedDatabaseManager';
import { useToastHelpers } from '@/hooks/useToast';
import { logger } from '@/utils/logging';


export interface DataGenerationContextType {
  generateData: (options?: {
    modules?: string[];
    counts?: Record<string, number>;
    useRealisticData?: boolean;
    includeTestData?: boolean;
    clearExisting?: boolean;
  }) => Promise<any>;
  seedDatabase: (seedConfig?: {
    dataMode?: 'demo' | 'development' | 'production';
    modules?: string[];
    volume?: 'tiny' | 'small' | 'medium' | 'large' | 'enterprise';
  }) => Promise<any>;
}

export const DataGenerationContext = createContext<DataGenerationContextType | undefined>(undefined);

export const DataGenerationProvider: React.FC<{ 
  children: ReactNode; 
  onDataChanged?: () => Promise<void>;
}> = ({ children, onDataChanged }) => {
  const toast = useToastHelpers();
  
  const generateData = useCallback(async (options?: {
    modules?: string[];
    counts?: Record<string, number>;
    useRealisticData?: boolean;
    includeTestData?: boolean;
    clearExisting?: boolean;
  }) => {
    try {
      logger.info('🎲 [DataGenerationContext] Starting data generation...');
      toast.showInfo('Generating data...');

      const dbManager = UnifiedDatabaseManager.getInstance();
      const result = await dbManager.generateData(options);

      if (result.success) {
        if (onDataChanged) {
          await onDataChanged();
        } else {
          window.dispatchEvent(new CustomEvent('appDataChanged'));
        }

        const stats = result.stats;
        const message = stats
          ? `Generated ${stats.totalRecords} records across ${stats.tablesGenerated.length} collections`
          : 'Data generated successfully';

        toast.showSuccess(message);
        logger.info('✅ [DataGenerationContext] Data generation completed:', result.stats);
      } else {
        toast.showError(`Data generation failed: ${result.error}`);
        logger.error('❌ [DataGenerationContext] Data generation failed:', result.error);
      }
        return result;
      } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Data generation failed';
      logger.error('❌ [DataGenerationContext] Data generation error:', err);
      toast.showError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [onDataChanged, toast]);

  const seedDatabase = useCallback(async (seedConfig?: {
    dataMode?: 'demo' | 'development' | 'production';
    modules?: string[];
    volume?: 'tiny' | 'small' | 'medium' | 'large' | 'enterprise';
  }) => {
    try {
      logger.info('🌱 [DataGenerationContext] Seeding database...');
      toast.showInfo('Seeding database...');

      const dbManager = UnifiedDatabaseManager.getInstance();
      const result = await dbManager.seedDatabase(seedConfig);

      if (result.success) {
        if (onDataChanged) {
          await onDataChanged();
        } else {
          window.dispatchEvent(new CustomEvent('appDataChanged'));
        }

        toast.showSuccess(result.message);
        logger.info('✅ [DataGenerationContext] Database seeded:', result.stats);
      } else {
        toast.showError(result.message);
        logger.error('❌ [DataGenerationContext] Database seeding failed:', result.message);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Database seeding failed';
      logger.error('Database seeding error:', err);
      toast.showError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  }, [onDataChanged, toast]);

  return (
    <DataGenerationContext.Provider value={{ generateData, seedDatabase }}>
      {children}
    </DataGenerationContext.Provider>
  );
};

export const useDataGenerationContext = () => {
  const context = useContext(DataGenerationContext);
  if (!context) {
    throw new Error('useDataGenerationContext must be used within a DataGenerationProvider');
  }
  return context;
};

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { UnifiedDatabaseManager } from '@/services/database/UnifiedDatabaseManager';
import { logger } from '@/utils/logging';


export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationContextType {
  getCollectionPage: <T = any>(
    collectionName: string,
    options: PaginationOptions
  ) => Promise<PaginationResult<T>>;
}

export const PaginationContext = createContext<PaginationContextType | undefined>(undefined);

export const PaginationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const getCollectionPage = useCallback(async <T = any,>(
    collectionName: string,
    options: PaginationOptions
  ): Promise<PaginationResult<T>> => {
    try {
      const dbManager = UnifiedDatabaseManager.getInstance();
      const collection = dbManager.getCollection<T>(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      const totalCount = await collection.count();
      const totalPages = Math.ceil(totalCount / options.pageSize);
      const skip = (options.page - 1) * options.pageSize;

      let query = collection.find();

      if (options.sortBy) {
        query = query.sort({
          [options.sortBy]: options.sortOrder || 'asc'
        });
      }

      query = query.skip(skip).limit(options.pageSize);

      const docs = await query.exec();
      const data = docs.map(doc => doc.toJSON() as T);

      return {
        data,
        page: options.page,
        pageSize: options.pageSize,
        totalCount,
        totalPages,
        hasNextPage: options.page < totalPages,
        hasPreviousPage: options.page > 1
      };
    } catch (err) {
      logger.error(`[PaginationContext] Error fetching page for ${collectionName}:`, err);
      throw err;
    }
  }, []);

  return (
    <PaginationContext.Provider value={{ getCollectionPage }}>
      {children}
    </PaginationContext.Provider>
  );
};

export const usePaginationContext = () => {
  const context = useContext(PaginationContext);
  if (!context) {
    throw new Error('usePaginationContext must be used within a PaginationProvider');
  }
  return context;
};

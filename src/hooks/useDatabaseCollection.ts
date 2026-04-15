// ABOUTME: Reusable hook for loading, subscribing to, and mutating a database collection
// ABOUTME: Provides the foundation for all module data hooks to work with real database state

import { useState, useEffect, useCallback, useRef } from 'react';
import { databaseService } from '@/services/database/databaseService';
import type { ICollection } from '@/services/database/interfaces';

export interface UseDatabaseCollectionOptions {
  loadOnMount?: boolean;
  subscribeToChanges?: boolean;
}

export interface UseDatabaseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  insert: (doc: Omit<T, 'id'> & { id?: string }) => Promise<T | null>;
  update: (id: string, doc: Partial<T>) => Promise<T | null>;
  remove: (id: string) => Promise<boolean>;
  collection: ICollection<T> | null;
}

export function useDatabaseCollection<T>(
  collectionName: string,
  options: UseDatabaseCollectionOptions = {}
): UseDatabaseCollectionResult<T> {
  const { loadOnMount = true, subscribeToChanges = true } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(loadOnMount);
  const [error, setError] = useState<Error | null>(null);
  const [collection, setCollection] = useState<ICollection<T> | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const db = await databaseService.getDatabase();
      const coll = db.getCollection(collectionName) as ICollection<T> | null;

      if (!coll) {
        console.warn(`[useDatabaseCollection] Collection '${collectionName}' not found`);
        if (isMountedRef.current) {
          setCollection(null);
          setData([]);
          setLoading(false);
        }
        return;
      }

      if (isMountedRef.current) {
        setCollection(coll);
      }

      if (typeof coll.find === 'function') {
        const docs = await coll.find({});
        if (isMountedRef.current) {
          setData(docs || []);
        }
      } else {
        console.warn(`[useDatabaseCollection] Collection '${collectionName}' does not support find()`);
        if (isMountedRef.current) {
          setData([]);
        }
      }
    } catch (err) {
      console.error(`[useDatabaseCollection] Error loading collection '${collectionName}':`, err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setData([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [collectionName]);

  // Setup subscription to collection changes
  useEffect(() => {
    if (!subscribeToChanges || !collection) return;

    const setupSubscription = async () => {
      try {
        // Clean up previous subscription
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }

        // Try different subscription methods
        if (typeof (collection as any).subscribeToChanges === 'function') {
          const sub = (collection as any).subscribeToChanges(() => {
            if (isMountedRef.current) {
              refresh();
            }
          });
          subscriptionRef.current = sub;
        } else if (typeof (collection as any).subscribe === 'function') {
          const sub = (collection as any).subscribe(() => {
            if (isMountedRef.current) {
              refresh();
            }
          });
          subscriptionRef.current = sub;
        }
      } catch (err) {
        console.warn(`[useDatabaseCollection] Subscription not available for '${collectionName}':`, err);
      }
    };

    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [collection, collectionName, refresh, subscribeToChanges]);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;

    if (loadOnMount) {
      refresh();
    }

    return () => {
      isMountedRef.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [loadOnMount, refresh]);

  const insert = useCallback(
    async (doc: Omit<T, 'id'> & { id?: string }): Promise<T | null> => {
      try {
        const db = await databaseService.getDatabase();
        const coll = db.getCollection(collectionName) as ICollection<T> | null;

        if (!coll) {
          throw new Error(`Collection '${collectionName}' not found`);
        }

        const docWithId = { ...doc, id: doc.id || databaseService.generateId() } as T;
        const result = await coll.insert(docWithId);
        await refresh();
        return result || docWithId;
      } catch (err) {
        console.error(`[useDatabaseCollection] Error inserting into '${collectionName}':`, err);
        throw err;
      }
    },
    [collectionName, refresh]
  );

  const update = useCallback(
    async (id: string, doc: Partial<T>): Promise<T | null> => {
      try {
        const db = await databaseService.getDatabase();
        const coll = db.getCollection(collectionName) as ICollection<T> | null;

        if (!coll) {
          throw new Error(`Collection '${collectionName}' not found`);
        }

        if (typeof coll.update !== 'function') {
          throw new Error(`Collection '${collectionName}' does not support update()`);
        }

        const result = await coll.update(id, doc);
        await refresh();
        return result || null;
      } catch (err) {
        console.error(`[useDatabaseCollection] Error updating '${collectionName}' document ${id}:`, err);
        throw err;
      }
    },
    [collectionName, refresh]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const db = await databaseService.getDatabase();
        const coll = db.getCollection(collectionName) as ICollection<T> | null;

        if (!coll) {
          throw new Error(`Collection '${collectionName}' not found`);
        }

        if (typeof coll.remove !== 'function') {
          throw new Error(`Collection '${collectionName}' does not support remove()`);
        }

        await coll.remove(id);
        await refresh();
        return true;
      } catch (err) {
        console.error(`[useDatabaseCollection] Error removing '${collectionName}' document ${id}:`, err);
        throw err;
      }
    },
    [collectionName, refresh]
  );

  return {
    data,
    loading,
    error,
    refresh,
    insert,
    update,
    remove,
    collection,
  };
}

import { logger } from '@/utils/logging';

// ABOUTME: Reusable hook for loading, subscribing to, and mutating a single database document
// ABOUTME: Provides the foundation for single-document collections like school_details

import { useState, useEffect, useCallback, useRef } from 'react';
import { databaseService } from '@/services/database/databaseService';
import type { ICollection } from '@/services/database/interfaces';

export interface UseDatabaseDocumentOptions {
  loadOnMount?: boolean;
  subscribeToChanges?: boolean;
}

export interface UseDatabaseDocumentResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  save: (doc: Partial<T> & { id?: string }) => Promise<T | null>;
  collection: ICollection<T> | null;
}

export function useDatabaseDocument<T>(
  collectionName: string,
  documentId?: string,
  options: UseDatabaseDocumentOptions = {}
): UseDatabaseDocumentResult<T> {
  const { loadOnMount = true, subscribeToChanges = true } = options;

  const [data, setData] = useState<T | null>(null);
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
        logger.warn(`[useDatabaseDocument] Collection '${collectionName}' not found`);
        if (isMountedRef.current) {
          setCollection(null);
          setData(null);
          setLoading(false);
        }
        return;
      }

      if (isMountedRef.current) {
        setCollection(coll);
      }

      let doc: T | null = null;

      if (documentId && typeof coll.findById === 'function') {
        doc = await coll.findById(documentId);
      }

      // Fallback: find first document if no id or findById not available
      if (!doc && typeof coll.find === 'function') {
        const docs = await coll.find({});
        doc = docs && docs.length > 0 ? docs[0] : null;
      }

      if (isMountedRef.current) {
        setData(doc);
      }
    } catch (err) {
      logger.error(`[useDatabaseDocument] Error loading document from '${collectionName}':`, err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setData(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [collectionName, documentId]);

  // Setup subscription to collection changes
  useEffect(() => {
    if (!subscribeToChanges || !collection) return;

    const setupSubscription = async () => {
      try {
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }

        if (typeof (collection as any).subscribeToChanges === 'function') {
          const observable = (collection as any).subscribeToChanges();
          if (observable && typeof observable.subscribe === 'function') {
            const sub = observable.subscribe(() => {
              if (isMountedRef.current) {
                refresh();
              }
            });
            subscriptionRef.current = sub;
          }
        } else if (typeof (collection as any).subscribe === 'function') {
          const observable = (collection as any).subscribe();
          if (observable && typeof observable.subscribe === 'function') {
            const sub = observable.subscribe(() => {
              if (isMountedRef.current) {
                refresh();
              }
            });
            subscriptionRef.current = sub;
          }
        }
      } catch (err) {
        logger.warn(`[useDatabaseDocument] Subscription not available for '${collectionName}':`, err);
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

  const save = useCallback(
    async (doc: Partial<T> & { id?: string }): Promise<T | null> => {
      try {
        const db = await databaseService.getDatabase();
        const coll = db.getCollection(collectionName) as ICollection<T> | null;

        if (!coll) {
          throw new Error(`Collection '${collectionName}' not found`);
        }

        const targetId = documentId || doc.id;

        if (targetId && typeof coll.update === 'function') {
          const result = await coll.update(targetId, doc);
          await refresh();
          return result || null;
        }

        if (typeof coll.insert === 'function') {
          const docWithId = { ...doc, id: targetId || databaseService.generateId() } as T;
          const result = await coll.insert(docWithId);
          await refresh();
          return result || docWithId;
        }

        throw new Error(`Collection '${collectionName}' does not support insert or update`);
      } catch (err) {
        logger.error(`[useDatabaseDocument] Error saving to '${collectionName}':`, err);
        throw err;
      }
    },
    [collectionName, documentId, refresh]
  );

  return {
    data,
    loading,
    error,
    refresh,
    save,
    collection,
  };
}

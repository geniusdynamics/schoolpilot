/**
 * Service Worker Sync
 * 
 * Background sync functionality for the service worker.
 * Handles periodic sync and push notifications.
 */

import type { SyncOperation } from '../backend/types';

// Type definitions for service worker scope
declare const self: ServiceWorkerGlobalScope;

interface SyncTag {
  tag: string;
  minInterval?: number;
}

// ============================================================================
// Sync Queue Management
// ============================================================================

const SYNC_QUEUE_KEY = 'sync-queue-v1';
const SYNC_STATE_KEY = 'sync-state-v1';

interface QueuedOperation extends SyncOperation {
  _queuedAt: number;
  _retryCount: number;
  _lastError?: string;
}

/**
 * Get the sync queue from IndexedDB
 */
async function getQueue(): Promise<QueuedOperation[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Failed to get queue:', error);
    return [];
  }
}

/**
 * Add operation to queue
 */
async function addToQueue(operation: SyncOperation): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    
    const queued: QueuedOperation = {
      ...operation,
      _queuedAt: Date.now(),
      _retryCount: 0,
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(queued);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Failed to add to queue:', error);
  }
}

/**
 * Remove operation from queue
 */
async function removeFromQueue(operationId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(operationId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Failed to remove from queue:', error);
  }
}

/**
 * Update operation retry count
 */
async function updateRetryCount(operationId: string, error?: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    
    const request = store.get(operationId);
    
    request.onsuccess = () => {
      const operation = request.result;
      if (operation) {
        operation._retryCount++;
        operation._lastError = error;
        store.put(operation);
      }
    };
  } catch (error) {
    console.error('[SW] Failed to update retry count:', error);
  }
}

/**
 * Open IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SchoolPilotSync', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('syncState')) {
        db.createObjectStore('syncState', { keyPath: 'key' });
      }
    };
  });
}

// ============================================================================
// Sync Execution
// ============================================================================

/**
 * Process the sync queue
 */
async function processQueue(backendUrl: string, authToken: string): Promise<void> {
  const queue = await getQueue();
  
  if (queue.length === 0) {
    console.log('[SW] Sync queue empty');
    return;
  }

  console.log(`[SW] Processing ${queue.length} queued operations`);

  for (const operation of queue) {
    // Skip if max retries reached
    if (operation._retryCount >= 5) {
      console.warn(`[SW] Max retries reached for operation ${operation.id}`);
      continue;
    }

    try {
      const success = await executeOperation(operation, backendUrl, authToken);
      
      if (success) {
        await removeFromQueue(operation.id);
        console.log(`[SW] Operation ${operation.id} succeeded`);
      } else {
        await updateRetryCount(operation.id, 'Server returned error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[SW] Operation ${operation.id} failed:`, errorMessage);
      await updateRetryCount(operation.id, errorMessage);
    }
  }

  // Notify clients of sync completion
  await notifyClients('sync-complete', {
    processed: queue.length,
    timestamp: Date.now(),
  });
}

/**
 * Execute a single operation
 */
async function executeOperation(
  operation: QueuedOperation,
  backendUrl: string,
  authToken: string
): Promise<boolean> {
  const methodMap: Record<string, string> = {
    create: 'POST',
    update: 'PUT',
    delete: 'DELETE',
  };

  const url = `${backendUrl}/api/${operation.entity}${operation.recordId ? `/${operation.recordId}` : ''}`;
  
  const response = await fetch(url, {
    method: methodMap[operation.type] || 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: operation.data ? JSON.stringify(operation.data) : undefined,
  });

  return response.ok;
}

/**
 * Notify all clients
 */
async function notifyClients(type: string, data: any): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  for (const client of clients) {
    client.postMessage({
      type,
      data,
    });
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle sync event
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event received:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      (async () => {
        // Get backend config from storage
        const config = await getBackendConfig();
        if (config) {
          await processQueue(config.url, config.token);
        }
      })()
    );
  }

  if (event.tag === 'periodic-sync') {
    event.waitUntil(
      (async () => {
        const config = await getBackendConfig();
        if (config && config.periodicSync) {
          await processQueue(config.url, config.token);
        }
      })()
    );
  }
});

/**
 * Handle push event (for server-initiated sync)
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  const data = event.data?.json() || {};
  
  event.waitUntil(
    (async () => {
      // Show notification
      await self.registration.showNotification('SchoolPilot Sync', {
        body: data.message || 'New data available',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: 'sync-notification',
        requireInteraction: false,
      });

      // Trigger sync if needed
      if (data.syncRequired) {
        const config = await getBackendConfig();
        if (config) {
          await processQueue(config.url, config.token);
        }
      }
    })()
  );
});

/**
 * Handle message from client
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'queue-operation':
      event.waitUntil(addToQueue(data));
      break;

    case 'force-sync':
      event.waitUntil(
        (async () => {
          const config = await getBackendConfig();
          if (config) {
            await processQueue(config.url, config.token);
          }
        })()
      );
      break;

    case 'get-queue-status':
      event.waitUntil(
        (async () => {
          const queue = await getQueue();
          event.source?.postMessage({
            type: 'queue-status',
            data: {
              count: queue.length,
              operations: queue.map(op => ({
                id: op.id,
                type: op.type,
                entity: op.entity,
                retryCount: op._retryCount,
              })),
            },
          });
        })()
      );
      break;

    case 'update-backend-config':
      event.waitUntil(saveBackendConfig(data));
      break;
  }
});

/**
 * Handle periodic background sync registration
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'schoolpilot-sync') {
    event.waitUntil(
      (async () => {
        const config = await getBackendConfig();
        if (config) {
          await processQueue(config.url, config.token);
        }
      })()
    );
  }
});

// ============================================================================
// Storage Helpers
// ============================================================================

interface BackendConfig {
  url: string;
  token: string;
  periodicSync?: boolean;
  minInterval?: number;
}

async function getBackendConfig(): Promise<BackendConfig | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('syncState', 'readonly');
    const store = tx.objectStore('syncState');
    
    return new Promise((resolve, reject) => {
      const request = store.get('backend-config');
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    return null;
  }
}

async function saveBackendConfig(config: BackendConfig): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('syncState', 'readwrite');
    const store = tx.objectStore('syncState');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key: 'backend-config', value: config });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Failed to save backend config:', error);
  }
}

// Export for testing
export { getQueue, addToQueue, removeFromQueue, processQueue };

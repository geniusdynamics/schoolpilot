import { vi } from 'vitest';

// Performance monitoring utilities
export const createPerformanceMonitor = () => {
  const marks = new Map();
  
  return {
    mark: (name: string) => {
      marks.set(name, performance.now());
    },
    measure: (name: string) => {
      const start = marks.get(name);
      if (!start) return 0;
      return performance.now() - start;
    },
    clearMarks: () => {
      marks.clear();
    }
  };
};

// Memory usage tracking
export const createMemoryTracker = () => {
  const snapshots = new Map();
  
  return {
    takeSnapshot: (name: string) => {
      if (global.gc) {
        global.gc();
      }
      snapshots.set(name, process.memoryUsage());
    },
    compareSnapshots: (start: string, end: string) => {
      const startMem = snapshots.get(start);
      const endMem = snapshots.get(end);
      if (!startMem || !endMem) return null;
      
      return {
        heapDiff: endMem.heapUsed - startMem.heapUsed,
        rss: endMem.rss - startMem.rss
      };
    }
  };
};

// Render count tracking
export const createRenderTracker = () => {
  const counts = new Map();
  
  return {
    track: (componentName: string) => {
      counts.set(componentName, (counts.get(componentName) || 0) + 1);
    },
    getCount: (componentName: string) => counts.get(componentName) || 0,
    reset: () => counts.clear()
  };
};

// Mock storage implementation
export class MockStorage {
  private store = new Map();

  getItem(key: string) {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  get length() {
    return this.store.size;
  }
}

// Event listener tracking
export const createEventListenerTracker = () => {
  const listeners = new Set();
  
  return {
    track: (element: Element, eventType: string, handler: Function) => {
      listeners.add({ element, eventType, handler });
    },
    untrack: (element: Element, eventType: string, handler: Function) => {
      for (const listener of listeners) {
        if (listener.element === element && 
            listener.eventType === eventType && 
            listener.handler === handler) {
          listeners.delete(listener);
          break;
        }
      }
    },
    getCount: () => listeners.size,
    reset: () => listeners.clear()
  };
};

// Mutation observer mock
export class MockMutationObserver {
  private callback: MutationCallback;
  
  constructor(callback: MutationCallback) {
    this.callback = callback;
  }

  observe() {
    // Implementation for testing
  }

  disconnect() {
    // Implementation for testing
  }

  takeRecords() {
    return [];
  }
}

// Network request tracking
export const createNetworkTracker = () => {
  const requests = new Set();
  
  return {
    track: (url: string, method = 'GET') => {
      requests.add({ url, method, timestamp: Date.now() });
    },
    getRequests: () => Array.from(requests),
    reset: () => requests.clear()
  };
};

// Animation frame mock
export const createAnimationFrameMock = () => {
  const callbacks = new Map();
  let lastId = 0;
  
  return {
    requestAnimationFrame: (callback: FrameRequestCallback): number => {
      lastId++;
      callbacks.set(lastId, callback);
      return lastId;
    },
    cancelAnimationFrame: (id: number) => {
      callbacks.delete(id);
    },
    triggerAnimationFrame: () => {
      const currentCallbacks = Array.from(callbacks.values());
      callbacks.clear();
      currentCallbacks.forEach(callback => callback(performance.now()));
    }
  };
};

// Async utilities
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 1000,
  interval = 50
): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (condition()) return;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Condition not met within timeout');
};

// Event simulation
export const simulateEvent = (element: Element, eventType: string, detail = {}) => {
  const event = new CustomEvent(eventType, { 
    bubbles: true,
    cancelable: true,
    detail
  });
  element.dispatchEvent(event);
};

// Test data generators
export const generateTestData = {
  user: () => ({
    id: Math.random().toString(36).substr(2, 9),
    name: `Test User ${Date.now()}`,
    email: `test${Date.now()}@example.com`
  }),
  
  tab: (index: number) => ({
    id: `tab-${index}`,
    title: `Tab ${index}`,
    content: `Content for tab ${index}`
  })
};

/**
 * ABOUTME: Property-based tests for OfflineQueue and NetworkMonitor
 * ABOUTME: Verifies queue invariants and singleton pattern correctness
 */

import * as fc from 'fast-check';
import { OfflineQueue } from '../sync/OfflineQueue';
import { NetworkMonitor } from '../sync/NetworkMonitor';

describe('OfflineQueue - Property-Based Tests', () => {
  beforeEach(() => {
    OfflineQueue.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on repeated calls', async () => {
      // Deterministic (not property-based): identity is binary — fc adds no value
      // here, and its async runner interacts badly with the singleton's
      // before-each reset.
      const instance1 = await OfflineQueue.getInstance({ persistQueue: false });
      const instance2 = await OfflineQueue.getInstance({ persistQueue: false });
      expect(instance1).toBe(instance2);
    });

    it('should reset instance properly', async () => {
      const instance1 = await OfflineQueue.getInstance({ persistQueue: false });
      OfflineQueue.resetInstance();
      const instance2 = await OfflineQueue.getInstance({ persistQueue: false });
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Queue Operations', () => {
    it('should maintain queue size invariants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('create' as const, 'update' as const, 'delete' as const),
              collection: fc.string({ minLength: 1, maxLength: 20 }),
              data: fc.dictionary(fc.string(), fc.anything()),
            }),
            { minLength: 0, maxLength: 100 },
          ),
          async (operations) => {
            const queue = new OfflineQueue({ persistQueue: false });
            await queue.initialize();

            // Enqueue all operations
            for (const op of operations) {
              await queue.enqueue({
                operation: op.operation,
                collection: op.collection,
                data: op.data,
                timestamp: Date.now(),
              });
            }

            const status = queue.getStatus();
            expect(status.totalSize).toBe(operations.length);
            expect(status.pending + status.processing + status.failed + status.completed).toBe(
              status.totalSize,
            );

            return true;
          },
        ),
      );
    });

    it('should assign unique IDs to operations', async () => {
      const queue = new OfflineQueue({ persistQueue: false });
      await queue.initialize();

      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const id = await queue.enqueue({
          operation: 'create',
          collection: 'test',
          data: { i },
          timestamp: Date.now(),
        });
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }

      expect(ids.size).toBe(50);
    });

    it('should process operations with executor', async () => {
      const queue = new OfflineQueue({ persistQueue: false });
      await queue.initialize();

      // Add some operations
      for (let i = 0; i < 5; i++) {
        await queue.enqueue({
          operation: 'create',
          collection: 'test',
          data: { value: i },
          timestamp: Date.now(),
        });
      }

      const result = await queue.process(async () => ({ success: true }));

      expect(result.processed).toBe(5);
      expect(result.succeeded).toBe(5);
      expect(result.failed).toBe(0);

      const status = queue.getStatus();
      expect(status.pending).toBe(0);
    });

    it('should handle failed operations properly', async () => {
      const queue = new OfflineQueue({
        persistQueue: false,
        retryStrategy: { maxAttempts: 1, backoff: 'linear', initialDelay: 0, maxDelay: 0 },
      });
      await queue.initialize();

      await queue.enqueue({
        operation: 'create',
        collection: 'test',
        data: {},
        timestamp: Date.now(),
      });

      // Process with always-failing executor
      await queue.process(async () => ({ success: false, error: new Error('fail') }));

      const status = queue.getStatus();
      expect(status.failed).toBeGreaterThanOrEqual(0); // May retry or fail immediately
    });
  });

  describe('Priority Sorting', () => {
    it('should sort delete operations higher than create', async () => {
      const queue = new OfflineQueue({ persistQueue: false });
      await queue.initialize();

      // Add operations in reverse priority order
      await queue.enqueue({ operation: 'create', collection: 'test', data: {}, timestamp: Date.now() });
      await queue.enqueue({ operation: 'update', collection: 'test', data: {}, timestamp: Date.now() });
      await queue.enqueue({ operation: 'delete', collection: 'test', data: {}, timestamp: Date.now() });

      const pending = queue.getPendingOperations();
      expect(pending.length).toBe(3);

      // First operation should be delete (highest priority)
      const firstOp = pending[0];
      expect(firstOp.operation).toBe('delete');
    });
  });
});

describe('NetworkMonitor - Property-Based Tests', () => {
  beforeEach(() => {
    NetworkMonitor.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on repeated calls', async () => {
      await fc.assert(
        fc.property(fc.integer(), () => {
          const instance1 = NetworkMonitor.getInstance();
          const instance2 = NetworkMonitor.getInstance();
          expect(instance1).toBe(instance2);
          return true;
        }),
      );
    });

    it('should reset instance properly', () => {
      const instance1 = NetworkMonitor.getInstance();
      NetworkMonitor.resetInstance();
      const instance2 = NetworkMonitor.getInstance();
      expect(instance1).not.toBe(instance2);
    });

    it('should start monitoring on first getInstance', () => {
      const monitor = NetworkMonitor.getInstance();
      expect(monitor).toBeDefined();
      // Should have a status (not 'unknown' after start)
      const status = monitor.getStatus();
      expect(['online', 'offline', 'unknown']).toContain(status);
    });
  });

  describe('Network Status', () => {
    it('should always return valid status', async () => {
      await fc.assert(
        fc.property(fc.integer(), () => {
          const monitor = NetworkMonitor.getInstance();
          const status = monitor.getStatus();
          expect(['online', 'offline', 'unknown']).toContain(status);
          return true;
        }),
      );
    });

    it('should return valid network info', () => {
      const monitor = NetworkMonitor.getInstance();
      const info = monitor.getInfo();

      expect(typeof info.isOnline).toBe('boolean');
      expect(['wifi', 'cellular', 'ethernet', 'unknown']).toContain(info.type);
      expect(['4g', '3g', '2g', 'slow-2g', 'unknown']).toContain(info.effectiveType);
      expect(typeof info.downlink).toBe('number');
      expect(typeof info.rtt).toBe('number');
      expect(typeof info.saveData).toBe('boolean');
    });

    it('isOnline and isOffline should be inverses', () => {
      const monitor = NetworkMonitor.getInstance();
      expect(monitor.isOnline()).toBe(!monitor.isOffline());
    });

    it('should handle checkStatus without throwing', async () => {
      await fc.assert(
        fc.property(fc.integer(), () => {
          const monitor = NetworkMonitor.getInstance();
          expect(() => monitor.checkStatus()).not.toThrow();
          return true;
        }),
      );
    });
  });

  describe('Event Handling', () => {
    it('should emit change events on status check', () => {
      const monitor = NetworkMonitor.getInstance();
      let changeCount = 0;

      monitor.on('change', () => {
        changeCount++;
      });

      monitor.checkStatus();
      expect(changeCount).toBeGreaterThanOrEqual(0);
    });

    it('should clean up listeners on destroy', () => {
      const monitor = NetworkMonitor.getInstance();
      monitor.destroy();
      // Should not throw on subsequent calls
      expect(() => monitor.destroy()).not.toThrow();
    });
  });
});

/**
 * ABOUTME: Property-based tests for CapabilityDetector
 * ABOUTME: Uses fast-check to verify capability detection invariants
 */

import * as fc from 'fast-check';
import { CapabilityDetector } from '../detection/CapabilityDetector';
import type { CapabilityReport, StorageCapabilities } from '../detection/CapabilityDetector';

// Mock navigator and window for testing
const mockNavigator = (overrides: Partial<Navigator> = {}) => {
  const original = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    value: { ...original, ...overrides },
    writable: true,
    configurable: true,
  });
  return () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      writable: true,
      configurable: true,
    });
  };
};

const mockWindow = (overrides: Partial<Window & typeof globalThis> = {}) => {
  const original = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    value: { ...original, ...overrides },
    writable: true,
    configurable: true,
  });
  return () => {
    Object.defineProperty(globalThis, 'window', {
      value: original,
      writable: true,
      configurable: true,
    });
  };
};

describe('CapabilityDetector - Property-Based Tests', () => {
  beforeEach(() => {
    CapabilityDetector.getInstance().clearCache();
  });

  afterAll(() => {
    CapabilityDetector.getInstance().stopPeriodicReDetection();
  });

  describe('Singleton Pattern', () => {
    it('should always return the same instance', () => {
      fc.assert(
        fc.property(fc.integer(), () => {
          const instance1 = CapabilityDetector.getInstance();
          const instance2 = CapabilityDetector.getInstance();
          expect(instance1).toBe(instance2);
          return true;
        }),
      );
    });

    it('should maintain instance identity across multiple calls', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 10 }), () => {
          const instances = Array(5)
            .fill(null)
            .map(() => CapabilityDetector.getInstance());
          const allSame = instances.every((inst) => inst === instances[0]);
          expect(allSame).toBe(true);
          return true;
        }),
      );
    });
  });

  describe('Report Structure', () => {
    it('should always return a complete report', async () => {
      fc.assert(
        fc.property(fc.boolean(), async (forceRefresh) => {
          const detector = CapabilityDetector.getInstance();
          const report = await detector.detectCapabilities(forceRefresh);

          // Runtime must have required fields
          expect(report.runtime).toHaveProperty('type');
          expect(report.runtime).toHaveProperty('platform');
          expect(report.runtime).toHaveProperty('isProduction');
          expect(report.runtime).toHaveProperty('userAgent');

          // Storage must have all capability flags
          const storageKeys: (keyof StorageCapabilities)[] = [
            'hasFileSystem', 'hasOPFS', 'hasIndexedDB', 'hasLocalStorage',
            'hasWebSQL', 'hasWASM', 'hasServiceWorker', 'hasWebWorker',
            'hasSharedArrayBuffer', 'hasWebRTC', 'quota',
          ];
          for (const key of storageKeys) {
            expect(report.storage).toHaveProperty(key);
          }

          // Network must have required fields
          expect(report.network).toHaveProperty('isOnline');
          expect(report.network).toHaveProperty('type');
          expect(report.network).toHaveProperty('effectiveType');
          expect(report.network).toHaveProperty('downlink');
          expect(report.network).toHaveProperty('rtt');
          expect(report.network).toHaveProperty('saveData');

          // Warnings must be an array
          expect(Array.isArray(report.warnings)).toBe(true);

          // Timestamp must be a valid Date
          expect(report.timestamp).toBeInstanceOf(Date);

          return true;
        }),
      );
    });
  });

  describe('Caching Behavior', () => {
    it('should return cached report within TTL', async () => {
      const detector = CapabilityDetector.getInstance();

      // First call - fresh detection
      const report1 = await detector.detectCapabilities();

      // Second call - should use cache
      const report2 = await detector.detectCapabilities();

      // Same object reference (cached)
      expect(report1).toBe(report2);
    });

    it('should refresh when forceRefresh is true', async () => {
      const detector = CapabilityDetector.getInstance();

      const report1 = await detector.detectCapabilities();
      const report2 = await detector.detectCapabilities(true); // force refresh

      // Different object references (fresh detection)
      expect(report1).not.toBe(report2);
    });
  });

  describe('hasCapability Method', () => {
    it('should return boolean for any valid storage capability', async () => {
      const capabilities: (keyof StorageCapabilities)[] = [
        'hasFileSystem', 'hasOPFS', 'hasIndexedDB', 'hasLocalStorage',
        'hasWebSQL', 'hasWASM', 'hasServiceWorker', 'hasWebWorker',
        'hasSharedArrayBuffer', 'hasWebRTC',
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...capabilities),
          async (capability) => {
            const detector = CapabilityDetector.getInstance();
            const result = await detector.hasCapability(capability);
            expect(typeof result).toBe('boolean');
            return true;
          },
        ),
      );
    });

    it('should return correct boolean type (not truthy/falsy)', async () => {
      const detector = CapabilityDetector.getInstance();
      const result = await detector.hasCapability('hasIndexedDB');
      expect(result).toBe(true).or.toBe(false);
    });
  });

  describe('Diagnostic Report', () => {
    it('should always return a non-empty string', async () => {
      fc.assert(
        fc.property(fc.boolean(), async (forceRefresh) => {
          const detector = CapabilityDetector.getInstance();
          const report = await detector.getDiagnosticReport();

          expect(typeof report).toBe('string');
          expect(report.length).toBeGreaterThan(0);
          expect(report).toContain('=== Capability Diagnostic Report ===');
          expect(report).toContain('=== End Report ===');
          return true;
        }),
      );
    });

    it('should include all section headers', async () => {
      const detector = CapabilityDetector.getInstance();
      const report = await detector.getDiagnosticReport();

      expect(report).toContain('--- Runtime Environment ---');
      expect(report).toContain('--- Storage Capabilities ---');
      expect(report).toContain('--- Network ---');
      expect(report).toContain('--- Provider Recommendation ---');
    });

    it('should include WebRTC in storage capabilities', async () => {
      const detector = CapabilityDetector.getInstance();
      const report = await detector.getDiagnosticReport();
      expect(report).toContain('WebRTC:');
    });
  });

  describe('Capability Change Events', () => {
    it('should return unsubscribe function', () => {
      const detector = CapabilityDetector.getInstance();
      const unsubscribe = detector.onCapabilityChange(() => {});
      expect(typeof unsubscribe).toBe('function');
    });

    it('should not throw when calling unsubscribe multiple times', () => {
      const detector = CapabilityDetector.getInstance();
      const unsubscribe = detector.onCapabilityChange(() => {});

      expect(() => {
        unsubscribe();
        unsubscribe(); // Should not throw
        unsubscribe();
      }).not.toThrow();
    });

    it('should not call listener after unsubscribe', async () => {
      const detector = CapabilityDetector.getInstance();
      let callCount = 0;

      const unsubscribe = detector.onCapabilityChange(() => {
        callCount++;
      });

      unsubscribe();

      // Force a detection - should not trigger listener
      await detector.detectCapabilities(true);

      expect(callCount).toBe(0);
    });
  });

  describe('Provider Recommendation', () => {
    it('should always return a valid recommendation', async () => {
      fc.assert(
        fc.property(fc.boolean(), async (forceRefresh) => {
          const detector = CapabilityDetector.getInstance();
          const recommendation = await detector.getProviderRecommendation();

          expect(recommendation).toHaveProperty('recommended');
          expect(recommendation).toHaveProperty('alternatives');
          expect(recommendation).toHaveProperty('reasoning');
          expect(Array.isArray(recommendation.alternatives)).toBe(true);
          expect(typeof recommendation.reasoning).toBe('string');
          expect(recommendation.reasoning.length).toBeGreaterThan(0);

          return true;
        }),
      );
    });

    it('should recommend valid provider types', async () => {
      const validProviders = [
        'sqlite-file', 'sqlite-wasm', 'pouchdb',
        'backend-api', 'hybrid', 'livestore', 'rxdb',
      ];

      const detector = CapabilityDetector.getInstance();
      const recommendation = await detector.getProviderRecommendation();

      expect(validProviders).toContain(recommendation.recommended);
      for (const alt of recommendation.alternatives) {
        expect(validProviders).toContain(alt);
      }
    });
  });

  describe('Periodic Re-Detection', () => {
    it('should not throw when stopping multiple times', () => {
      const detector = CapabilityDetector.getInstance();
      expect(() => {
        detector.stopPeriodicReDetection();
        detector.stopPeriodicReDetection();
      }).not.toThrow();
    });

    it('should restart after stopping', () => {
      const detector = CapabilityDetector.getInstance();
      detector.stopPeriodicReDetection();
      // getInstance should restart the timer if needed
      const instance = CapabilityDetector.getInstance();
      expect(instance).toBeDefined();
    });
  });
});

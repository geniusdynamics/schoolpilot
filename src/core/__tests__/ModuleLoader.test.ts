import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModuleLoader } from '@/core/ModuleLoader';
import { moduleRegistry } from '@/core/ModuleRegistry';
import type { LoadedModule } from '@/core/types/module';

function createMockModule(id: string): LoadedModule {
  return {
    id,
    metadata: {
      id,
      name: id,
      version: '1.0.0',
      dependencies: []
    },
    definition: null
  };
}

describe('ModuleLoader', () => {
  let loader: ModuleLoader;

  beforeEach(() => {
    loader = new ModuleLoader();
  });

  afterEach(async () => {
    await loader.clear();
    await moduleRegistry.clear();
  });

  describe('registerFactory', () => {
    it('should register a module factory', () => {
      loader.registerFactory('test', async () => createMockModule('test'));
      
      expect(loader.canLoad('test')).toBe(true);
    });
  });

  describe('canLoad', () => {
    it('should return false for unregistered module', () => {
      expect(loader.canLoad('unknown')).toBe(false);
    });

    it('should return true for registered module', () => {
      loader.registerFactory('test', async () => createMockModule('test'));
      expect(loader.canLoad('test')).toBe(true);
    });
  });

  describe('load', () => {
    it('should load a module successfully', async () => {
      const mockModule = createMockModule('test');
      loader.registerFactory('test', async () => mockModule);

      const result = await loader.load('test', { autoEnable: false });

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe('test');
      expect(result.metadata).toEqual(mockModule.metadata);
      expect(result.loadTime).toBeGreaterThanOrEqual(0);
    });

    it('should return cached result if already loaded', async () => {
      loader.registerFactory('test', async () => createMockModule('test'));
      
      await loader.load('test', { autoEnable: false });
      const result2 = await loader.load('test', { autoEnable: false });

      expect(result2.success).toBe(true);
      expect(result2.loadTime).toBe(0); // No load time for cached
    });

    it('should return error if factory not registered', async () => {
      const result = await loader.load('unknown', { autoEnable: false });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('No factory registered');
    });

    it('should emit loading events', async () => {
      const loadingListener = vi.fn();
      const loadedListener = vi.fn();
      
      loader.on(ModuleLoader.MODULE_LOADING, loadingListener);
      loader.on(ModuleLoader.MODULE_LOADED, loadedListener);
      
      loader.registerFactory('test', async () => createMockModule('test'));
      await loader.load('test', { autoEnable: false });

      expect(loadingListener).toHaveBeenCalledWith({ moduleId: 'test' });
      expect(loadedListener).toHaveBeenCalledWith(expect.objectContaining({ 
        moduleId: 'test',
        loadTime: expect.any(Number)
      }));
    });

    it('should update load state', async () => {
      loader.registerFactory('test', async () => createMockModule('test'));
      
      expect(loader.getLoadState('test')).toBeUndefined();
      
      const loadPromise = loader.load('test', { autoEnable: false });
      
      // Check loading state
      const loadingState = loader.getLoadState('test');
      expect(loadingState?.status).toBe('loading');
      
      await loadPromise;
      
      // Check loaded state
      const loadedState = loader.getLoadState('test');
      expect(loadedState?.status).toBe('loaded');
      expect(loadedState?.progress).toBe(100);
      expect(loadedState?.loadedAt).toBeInstanceOf(Date);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      loader.registerFactory('test', async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return createMockModule('test');
      });

      const result = await loader.load('test', { 
        autoEnable: false,
        retryCount: 3,
        retryDelay: 10
      });

      expect(result.success).toBe(true);
      expect(attempts).toBe(2);
    });

    it('should fail after max retries', async () => {
      loader.registerFactory('test', async () => {
        throw new Error('Persistent failure');
      });

      const result = await loader.load('test', { 
        autoEnable: false,
        retryCount: 2,
        retryDelay: 10
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Persistent failure');
    });

    it('should emit error event on failure', async () => {
      const errorListener = vi.fn();
      loader.on(ModuleLoader.MODULE_ERROR, errorListener);
      
      loader.registerFactory('test', async () => {
        throw new Error('Load failed');
      });

      await loader.load('test', { autoEnable: false, retryCount: 1 });

      expect(errorListener).toHaveBeenCalledWith(expect.objectContaining({
        moduleId: 'test',
        error: expect.any(Error)
      }));
    });
  });

  describe('unload', () => {
    it('should unload a loaded module', async () => {
      loader.registerFactory('test', async () => createMockModule('test'));
      await loader.load('test', { autoEnable: false });
      
      expect(loader.isLoaded('test')).toBe(true);
      
      const success = await loader.unload('test');
      
      expect(success).toBe(true);
      expect(loader.isLoaded('test')).toBe(false);
    });

    it('should return false for non-loaded module', async () => {
      const success = await loader.unload('unknown');
      expect(success).toBe(false);
    });

    it('should emit unloading events', async () => {
      const unloadingListener = vi.fn();
      const unloadedListener = vi.fn();
      
      loader.on(ModuleLoader.MODULE_UNLOADING, unloadingListener);
      loader.on(ModuleLoader.MODULE_UNLOADED, unloadedListener);
      
      loader.registerFactory('test', async () => createMockModule('test'));
      await loader.load('test', { autoEnable: false });
      await loader.unload('test');

      expect(unloadingListener).toHaveBeenCalledWith({ moduleId: 'test' });
      expect(unloadedListener).toHaveBeenCalledWith({ moduleId: 'test' });
    });
  });

  describe('loadBatch', () => {
    it('should load multiple modules in parallel', async () => {
      loader.registerFactory('mod1', async () => createMockModule('mod1'));
      loader.registerFactory('mod2', async () => createMockModule('mod2'));
      loader.registerFactory('mod3', async () => createMockModule('mod3'));

      const results = await loader.loadBatch(['mod1', 'mod2', 'mod3'], { autoEnable: false });

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle mixed success and failure', async () => {
      loader.registerFactory('mod1', async () => createMockModule('mod1'));
      loader.registerFactory('mod2', async () => { throw new Error('Failed'); });

      const results = await loader.loadBatch(['mod1', 'mod2'], { 
        autoEnable: false,
        retryCount: 1 
      });

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('loadOrdered', () => {
    it('should load modules sequentially', async () => {
      const order: string[] = [];
      
      loader.registerFactory('mod1', async () => {
        order.push('mod1');
        return createMockModule('mod1');
      });
      loader.registerFactory('mod2', async () => {
        order.push('mod2');
        return createMockModule('mod2');
      });
      loader.registerFactory('mod3', async () => {
        order.push('mod3');
        return createMockModule('mod3');
      });

      await loader.loadOrdered(['mod1', 'mod2', 'mod3'], { autoEnable: false });

      expect(order).toEqual(['mod1', 'mod2', 'mod3']);
    });

    it('should stop on first failure', async () => {
      loader.registerFactory('mod1', async () => createMockModule('mod1'));
      loader.registerFactory('mod2', async () => { throw new Error('Failed'); });
      loader.registerFactory('mod3', async () => createMockModule('mod3'));

      const results = await loader.loadOrdered(['mod1', 'mod2', 'mod3'], { 
        autoEnable: false,
        retryCount: 1 
      });

      // Only mod1 and mod2 are attempted (mod2 fails, mod3 is skipped)
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('preload', () => {
    it('should preload module without enabling', async () => {
      loader.registerFactory('test', async () => createMockModule('test'));
      
      const success = await loader.preload('test');
      
      expect(success).toBe(true);
      expect(loader.isLoaded('test')).toBe(true);
    });

    it('should return false on preload failure', async () => {
      loader.registerFactory('test', async () => { throw new Error('Failed'); });
      
      const success = await loader.preload('test');
      
      expect(success).toBe(false);
    });
  });

  describe('isLoaded', () => {
    it('should return false for unloaded module', () => {
      expect(loader.isLoaded('test')).toBe(false);
    });

    it('should return true for loaded module', async () => {
      loader.registerFactory('test', async () => createMockModule('test'));
      await loader.load('test', { autoEnable: false });
      
      expect(loader.isLoaded('test')).toBe(true);
    });
  });

  describe('getLoadedModules', () => {
    it('should return empty array initially', () => {
      expect(loader.getLoadedModules()).toEqual([]);
    });

    it('should return loaded module IDs', async () => {
      loader.registerFactory('mod1', async () => createMockModule('mod1'));
      loader.registerFactory('mod2', async () => createMockModule('mod2'));
      
      await loader.load('mod1', { autoEnable: false });
      await loader.load('mod2', { autoEnable: false });

      const loaded = loader.getLoadedModules();
      expect(loaded).toContain('mod1');
      expect(loaded).toContain('mod2');
    });
  });

  describe('getProgress', () => {
    it('should return 0 for unloaded module', () => {
      expect(loader.getProgress('test')).toBe(0);
    });

    it('should return progress for loading module', async () => {
      loader.registerFactory('test', async () => createMockModule('test'));
      
      const loadPromise = loader.load('test', { autoEnable: false });
      
      // Progress might be updated during loading
      const progress = loader.getProgress('test');
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
      
      await loadPromise;
      
      expect(loader.getProgress('test')).toBe(100);
    });
  });

  describe('clear', () => {
    it('should unload all modules', async () => {
      loader.registerFactory('mod1', async () => createMockModule('mod1'));
      loader.registerFactory('mod2', async () => createMockModule('mod2'));
      
      await loader.load('mod1', { autoEnable: false });
      await loader.load('mod2', { autoEnable: false });
      
      await loader.clear();
      
      expect(loader.isLoaded('mod1')).toBe(false);
      expect(loader.isLoaded('mod2')).toBe(false);
      expect(loader.canLoad('mod1')).toBe(false); // Factory cleared
    });
  });
});

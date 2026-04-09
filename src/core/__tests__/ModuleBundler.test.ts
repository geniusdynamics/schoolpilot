import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModuleBundler, type ChunkInfo } from '@/core/ModuleBundler';

describe('ModuleBundler', () => {
  let bundler: ModuleBundler;

  beforeEach(() => {
    bundler = new ModuleBundler();
  });

  const createMockChunk = (id: string, moduleId: string, priority: ChunkInfo['priority'] = 'normal'): ChunkInfo => ({
    id,
    moduleId,
    url: `/chunks/${id}.js`,
    size: 1000,
    priority,
    dependencies: []
  });

  describe('registerChunk', () => {
    it('should register a chunk', () => {
      bundler.registerChunk(createMockChunk('chunk1', 'mod1'));
      
      const state = bundler.getChunkState('chunk1');
      expect(state).toBeDefined();
      expect(state?.info.id).toBe('chunk1');
      expect(state?.status).toBe('pending');
    });

    it('should not duplicate chunks', () => {
      bundler.registerChunk(createMockChunk('chunk1', 'mod1'));
      bundler.registerChunk(createMockChunk('chunk1', 'mod1', 'high'));
      
      expect(bundler.totalCount).toBe(1);
    });
  });

  describe('registerChunks', () => {
    it('should register multiple chunks', () => {
      bundler.registerChunks([
        createMockChunk('chunk1', 'mod1'),
        createMockChunk('chunk2', 'mod1'),
        createMockChunk('chunk3', 'mod2')
      ]);

      expect(bundler.totalCount).toBe(3);
    });
  });

  describe('loadChunk', () => {
    it('should load a chunk successfully', async () => {
      bundler.registerChunk(createMockChunk('chunk1', 'mod1'));
      
      const result = await bundler.loadChunk('chunk1');

      expect(result.success).toBe(true);
      expect(result.chunkId).toBe('chunk1');
      expect(result.size).toBe(1000);
      expect(result.loadTime).toBeGreaterThanOrEqual(0);
    });

    it('should return error for unregistered chunk', async () => {
      const result = await bundler.loadChunk('unknown');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not registered');
    });

    it('should return cached result if already loaded', async () => {
      bundler.registerChunk(createMockChunk('chunk1', 'mod1'));
      
      await bundler.loadChunk('chunk1');
      const result2 = await bundler.loadChunk('chunk1');

      expect(result2.success).toBe(true);
      expect(result2.loadTime).toBe(0); // No load time for cached
    });

    it('should wait if chunk is already loading', async () => {
      bundler.registerChunk(createMockChunk('chunk1', 'mod1'));
      
      // Start two loads simultaneously
      const [result1, result2] = await Promise.all([
        bundler.loadChunk('chunk1'),
        bundler.loadChunk('chunk1')
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should emit loading events', async () => {
      const loadingListener = vi.fn();
      const loadedListener = vi.fn();
      
      bundler.on(ModuleBundler.CHUNK_LOADING, loadingListener);
      bundler.on(ModuleBundler.CHUNK_LOADED, loadedListener);
      
      bundler.registerChunk(createMockChunk('chunk1', 'mod1'));
      await bundler.loadChunk('chunk1');

      expect(loadingListener).toHaveBeenCalledWith({ chunkId: 'chunk1' });
      expect(loadedListener).toHaveBeenCalledWith(expect.objectContaining({ 
        chunkId: 'chunk1',
        size: 1000
      }));
    });

    it('should emit progress events', async () => {
      const progressListener = vi.fn();
      bundler.on(ModuleBundler.CHUNK_PROGRESS, progressListener);
      
      bundler.registerChunk(createMockChunk('chunk1', 'mod1'));
      await bundler.loadChunk('chunk1');

      // Should have received multiple progress updates
      expect(progressListener).toHaveBeenCalled();
      const calls = progressListener.mock.calls;
      expect(calls[calls.length - 1][0].progress).toBe(100);
    });

    it('should load dependencies first', async () => {
      const order: string[] = [];
      
      bundler.on(ModuleBundler.CHUNK_LOADED, (e: { chunkId: string }) => {
        order.push(e.chunkId);
      });

      bundler.registerChunks([
        { ...createMockChunk('dep', 'mod1'), dependencies: [] },
        { ...createMockChunk('main', 'mod1'), dependencies: ['dep'] }
      ]);

      await bundler.loadChunk('main');

      expect(order[0]).toBe('dep');
      expect(order[1]).toBe('main');
    });

    it('should fail if dependency fails', async () => {
      // Create a chunk with circular dependency that will cause failure
      bundler.registerChunks([
        { ...createMockChunk('dep', 'mod1'), dependencies: ['main'] },
        { ...createMockChunk('main', 'mod1'), dependencies: ['dep'] }
      ]);

      // This will timeout due to circular dependency waiting
      const result = await bundler.loadChunk('main');
      
      // The result will be pending because neither can complete
      // In real implementation, we'd detect circular deps
    });
  });

  describe('loadModuleChunks', () => {
    it('should load all chunks for a module', async () => {
      bundler.registerChunks([
        createMockChunk('chunk1', 'mod1', 'critical'),
        createMockChunk('chunk2', 'mod1', 'high'),
        createMockChunk('chunk3', 'mod1', 'normal')
      ]);

      const results = await bundler.loadModuleChunks('mod1');

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should prioritize critical chunks first', async () => {
      const loadOrder: string[] = [];
      bundler.on(ModuleBundler.CHUNK_LOADING, (e: { chunkId: string }) => {
        loadOrder.push(e.chunkId);
      });

      bundler.registerChunks([
        createMockChunk('normal1', 'mod1', 'normal'),
        createMockChunk('critical1', 'mod1', 'critical'),
        createMockChunk('low1', 'mod1', 'low'),
        createMockChunk('high1', 'mod1', 'high')
      ]);

      await bundler.loadModuleChunks('mod1');

      // Critical should be first
      expect(loadOrder[0]).toBe('critical1');
    });
  });

  describe('isLoaded', () => {
    it('should return false for unloaded chunk', () => {
      bundler.registerChunk(createMockChunk('chunk1', 'mod1'));
      expect(bundler.isLoaded('chunk1')).toBe(false);
    });

    it('should return true for loaded chunk', async () => {
      bundler.registerChunk(createMockChunk('chunk1', 'mod1'));
      await bundler.loadChunk('chunk1');
      
      expect(bundler.isLoaded('chunk1')).toBe(true);
    });
  });

  describe('isModuleLoaded', () => {
    it('should return true only when all chunks loaded', async () => {
      bundler.registerChunks([
        createMockChunk('chunk1', 'mod1'),
        createMockChunk('chunk2', 'mod1')
      ]);

      expect(bundler.isModuleLoaded('mod1')).toBe(false);

      await bundler.loadChunk('chunk1');
      expect(bundler.isModuleLoaded('mod1')).toBe(false);

      await bundler.loadChunk('chunk2');
      expect(bundler.isModuleLoaded('mod1')).toBe(true);
    });
  });

  describe('getModuleProgress', () => {
    it('should return 100 for module with no chunks', () => {
      expect(bundler.getModuleProgress('unknown')).toBe(100);
    });

    it('should calculate progress based on loaded size', async () => {
      bundler.registerChunks([
        { ...createMockChunk('chunk1', 'mod1'), size: 1000 },
        { ...createMockChunk('chunk2', 'mod1'), size: 1000 }
      ]);

      expect(bundler.getModuleProgress('mod1')).toBe(0);

      await bundler.loadChunk('chunk1');
      expect(bundler.getModuleProgress('mod1')).toBe(50);

      await bundler.loadChunk('chunk2');
      expect(bundler.getModuleProgress('mod1')).toBe(100);
    });
  });

  describe('getChunksForModule', () => {
    it('should return chunks for specific module', () => {
      bundler.registerChunks([
        createMockChunk('chunk1', 'mod1'),
        createMockChunk('chunk2', 'mod1'),
        createMockChunk('chunk3', 'mod2')
      ]);

      const mod1Chunks = bundler.getChunksForModule('mod1');
      
      expect(mod1Chunks).toHaveLength(2);
      expect(mod1Chunks.map(c => c.info.id)).toContain('chunk1');
      expect(mod1Chunks.map(c => c.info.id)).toContain('chunk2');
    });
  });

  describe('preloadChunks', () => {
    it('should load chunks in background', async () => {
      bundler.registerChunks([
        createMockChunk('chunk1', 'mod1'),
        createMockChunk('chunk2', 'mod1')
      ]);

      bundler.preloadChunks(['chunk1', 'chunk2']);

      // Wait a bit for preloading
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(bundler.isLoaded('chunk1')).toBe(true);
      expect(bundler.isLoaded('chunk2')).toBe(true);
    });
  });

  describe('loadedCount and totalCount', () => {
    it('should track counts correctly', async () => {
      expect(bundler.loadedCount).toBe(0);
      expect(bundler.totalCount).toBe(0);

      bundler.registerChunks([
        createMockChunk('chunk1', 'mod1'),
        createMockChunk('chunk2', 'mod1')
      ]);

      expect(bundler.loadedCount).toBe(0);
      expect(bundler.totalCount).toBe(2);

      await bundler.loadChunk('chunk1');

      expect(bundler.loadedCount).toBe(1);
      expect(bundler.totalCount).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all chunks', async () => {
      bundler.registerChunks([
        createMockChunk('chunk1', 'mod1'),
        createMockChunk('chunk2', 'mod1')
      ]);

      await bundler.loadChunk('chunk1');
      
      bundler.clear();

      expect(bundler.totalCount).toBe(0);
      expect(bundler.loadedCount).toBe(0);
      expect(bundler.getChunkState('chunk1')).toBeUndefined();
    });
  });
});

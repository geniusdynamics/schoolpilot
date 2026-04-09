import { EventEmitter } from 'events';

export interface ChunkInfo {
  id: string;
  moduleId: string;
  url: string;
  size: number;
  priority: 'critical' | 'high' | 'normal' | 'low';
  dependencies: string[];
}

export interface ChunkLoadResult {
  chunkId: string;
  success: boolean;
  size: number;
  loadTime: number;
  error?: Error;
}

export interface BundleConfig {
  baseUrl: string;
  chunks: ChunkInfo[];
  preload: string[];
}

export type ChunkStatus = 'pending' | 'loading' | 'loaded' | 'error';

export interface ChunkState {
  info: ChunkInfo;
  status: ChunkStatus;
  progress: number;
  loadedSize: number;
  error?: Error;
  loadedAt?: Date;
}

/**
 * Manages module chunk loading and bundling.
 * Optimizes loading through prioritization and parallel loading.
 */
export class ModuleBundler extends EventEmitter {
  private chunks = new Map<string, ChunkState>();
  private loadedChunks = new Set<string>();
  private loadingQueue: string[] = [];
  private maxConcurrentLoads = 3;
  private activeLoads = 0;

  // Event types
  static readonly CHUNK_LOADING = 'chunk:loading';
  static readonly CHUNK_LOADED = 'chunk:loaded';
  static readonly CHUNK_ERROR = 'chunk:error';
  static readonly CHUNK_PROGRESS = 'chunk:progress';
  static readonly ALL_CHUNKS_LOADED = 'chunks:all-loaded';

  /**
   * Register a chunk for loading
   */
  registerChunk(chunk: ChunkInfo): void {
    if (!this.chunks.has(chunk.id)) {
      this.chunks.set(chunk.id, {
        info: chunk,
        status: 'pending',
        progress: 0,
        loadedSize: 0
      });
    }
  }

  /**
   * Register multiple chunks
   */
  registerChunks(chunks: ChunkInfo[]): void {
    for (const chunk of chunks) {
      this.registerChunk(chunk);
    }
  }

  /**
   * Load a specific chunk
   */
  async loadChunk(chunkId: string): Promise<ChunkLoadResult> {
    const chunkState = this.chunks.get(chunkId);
    if (!chunkState) {
      return {
        chunkId,
        success: false,
        size: 0,
        loadTime: 0,
        error: new Error(`Chunk "${chunkId}" not registered`)
      };
    }

    // Return if already loaded
    if (chunkState.status === 'loaded') {
      return {
        chunkId,
        success: true,
        size: chunkState.info.size,
        loadTime: 0
      };
    }

    // Wait if already loading
    if (chunkState.status === 'loading') {
      return this.waitForChunk(chunkId);
    }

    // Load dependencies first (with circular dependency detection)
    const loadingStack = new Set<string>();
    const loadDeps = async (deps: string[]): Promise<ChunkLoadResult | null> => {
      for (const depId of deps) {
        if (loadingStack.has(depId)) {
          return {
            chunkId,
            success: false,
            size: 0,
            loadTime: 0,
            error: new Error(`Circular dependency detected: ${depId}`)
          };
        }
        
        const depChunk = this.chunks.get(depId);
        if (!depChunk) {
          return {
            chunkId,
            success: false,
            size: 0,
            loadTime: 0,
            error: new Error(`Dependency "${depId}" not registered`)
          };
        }
        
        // Skip if already loaded
        if (depChunk.status === 'loaded') continue;
        
        loadingStack.add(depId);
        
        // Load nested dependencies first
        if (depChunk.info.dependencies.length > 0) {
          const nestedResult = await loadDeps(depChunk.info.dependencies);
          if (nestedResult) {
            loadingStack.delete(depId);
            return nestedResult;
          }
        }
        
        // Load the dependency
        const depResult = await this.executeLoad(depChunk);
        loadingStack.delete(depId);
        
        if (!depResult.success) {
          return {
            chunkId,
            success: false,
            size: 0,
            loadTime: 0,
            error: new Error(`Dependency "${depId}" failed to load`)
          };
        }
      }
      return null;
    };
    
    const depError = await loadDeps(chunkState.info.dependencies);
    if (depError) return depError;

    // Start loading
    return this.executeLoad(chunkState);
  }

  /**
   * Load chunks for a module
   */
  async loadModuleChunks(moduleId: string): Promise<ChunkLoadResult[]> {
    const moduleChunks = this.getChunksForModule(moduleId);
    
    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    moduleChunks.sort((a, b) => 
      priorityOrder[a.info.priority] - priorityOrder[b.info.priority]
    );

    // Load in batches based on priority
    const results: ChunkLoadResult[] = [];
    const critical = moduleChunks.filter(c => c.info.priority === 'critical');
    const high = moduleChunks.filter(c => c.info.priority === 'high');
    const normal = moduleChunks.filter(c => c.info.priority === 'normal');
    const low = moduleChunks.filter(c => c.info.priority === 'low');

    // Load critical first
    for (const chunk of critical) {
      results.push(await this.loadChunk(chunk.info.id));
    }

    // Load high and normal in parallel batches
    const highNormal = [...high, ...normal];
    for (let i = 0; i < highNormal.length; i += this.maxConcurrentLoads) {
      const batch = highNormal.slice(i, i + this.maxConcurrentLoads);
      const batchResults = await Promise.all(
        batch.map(c => this.loadChunk(c.info.id))
      );
      results.push(...batchResults);
    }

    // Load low priority last
    for (const chunk of low) {
      results.push(await this.loadChunk(chunk.info.id));
    }

    return results;
  }

  /**
   * Preload chunks
   */
  async preloadChunks(chunkIds: string[]): Promise<void> {
    // Load in background with low priority
    for (const chunkId of chunkIds) {
      if (!this.isLoaded(chunkId)) {
        this.loadChunk(chunkId).catch(() => {
          // Silently fail preloads
        });
      }
    }
  }

  /**
   * Check if a chunk is loaded
   */
  isLoaded(chunkId: string): boolean {
    return this.loadedChunks.has(chunkId);
  }

  /**
   * Check if all chunks for a module are loaded
   */
  isModuleLoaded(moduleId: string): boolean {
    const moduleChunks = this.getChunksForModule(moduleId);
    return moduleChunks.every(c => c.status === 'loaded');
  }

  /**
   * Get loading progress for a module
   */
  getModuleProgress(moduleId: string): number {
    const moduleChunks = this.getChunksForModule(moduleId);
    if (moduleChunks.length === 0) return 100;

    const totalSize = moduleChunks.reduce((sum, c) => sum + c.info.size, 0);
    const loadedSize = moduleChunks.reduce((sum, c) => sum + c.loadedSize, 0);

    return Math.round((loadedSize / totalSize) * 100);
  }

  /**
   * Get chunk state
   */
  getChunkState(chunkId: string): ChunkState | undefined {
    return this.chunks.get(chunkId);
  }

  /**
   * Get all chunks for a module
   */
  getChunksForModule(moduleId: string): ChunkState[] {
    return Array.from(this.chunks.values())
      .filter(c => c.info.moduleId === moduleId);
  }

  /**
   * Get loaded chunks count
   */
  get loadedCount(): number {
    return this.loadedChunks.size;
  }

  /**
   * Get total chunks count
   */
  get totalCount(): number {
    return this.chunks.size;
  }

  /**
   * Execute chunk load
   */
  private async executeLoad(chunkState: ChunkState): Promise<ChunkLoadResult> {
    const { info } = chunkState;
    const startTime = Date.now();

    chunkState.status = 'loading';
    this.activeLoads++;
    this.emit(ModuleBundler.CHUNK_LOADING, { chunkId: info.id });

    try {
      // Simulate chunk loading (in real implementation, this would fetch JS/CSS)
      const loadTime = Math.random() * 100 + 50; // 50-150ms simulated
      await this.delay(loadTime);

      // Simulate progress updates
      for (let progress = 0; progress <= 100; progress += 20) {
        chunkState.progress = progress;
        chunkState.loadedSize = Math.round(info.size * (progress / 100));
        this.emit(ModuleBundler.CHUNK_PROGRESS, { 
          chunkId: info.id, 
          progress,
          loadedSize: chunkState.loadedSize 
        });
        await this.delay(10);
      }

      chunkState.status = 'loaded';
      chunkState.loadedSize = info.size;
      chunkState.loadedAt = new Date();
      this.loadedChunks.add(info.id);
      this.activeLoads--;

      this.emit(ModuleBundler.CHUNK_LOADED, { 
        chunkId: info.id, 
        size: info.size,
        loadTime: Date.now() - startTime
      });

      return {
        chunkId: info.id,
        success: true,
        size: info.size,
        loadTime: Date.now() - startTime
      };

    } catch (error) {
      chunkState.status = 'error';
      chunkState.error = error instanceof Error ? error : new Error(String(error));
      this.activeLoads--;

      this.emit(ModuleBundler.CHUNK_ERROR, { 
        chunkId: info.id, 
        error: chunkState.error 
      });

      return {
        chunkId: info.id,
        success: false,
        size: 0,
        loadTime: Date.now() - startTime,
        error: chunkState.error
      };
    }
  }

  /**
   * Wait for a chunk to finish loading
   */
  private waitForChunk(chunkId: string): Promise<ChunkLoadResult> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const state = this.chunks.get(chunkId);
        
        if (state?.status === 'loaded') {
          clearInterval(checkInterval);
          resolve({
            chunkId,
            success: true,
            size: state.info.size,
            loadTime: 0
          });
        } else if (state?.status === 'error') {
          clearInterval(checkInterval);
          resolve({
            chunkId,
            success: false,
            size: 0,
            loadTime: 0,
            error: state.error
          });
        }
      }, 50);
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all chunks
   */
  clear(): void {
    this.chunks.clear();
    this.loadedChunks.clear();
    this.loadingQueue = [];
    this.activeLoads = 0;
  }
}

// Singleton instance
export const moduleBundler = new ModuleBundler();

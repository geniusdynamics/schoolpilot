/**
 * CapabilityDetector - Centralized runtime environment and storage capability detection
 *
 * Replaces scattered detection logic across providers with a single source of truth.
 * Detects runtime environment (Electron, Tauri, browser), storage APIs (OPFS, IndexedDB, WASM),
 * network capabilities, and generates comprehensive capability reports.
 *
 * Requirements: 1.1-1.7, 2.1-2.10
 */

// Runtime environment types
export type RuntimeEnvironmentType =
  | 'electron'
  | 'tauri'
  | 'browser-client'
  | 'browser-server';

export type PlatformType = 'windows' | 'macos' | 'linux' | 'web' | 'unknown';

export interface RuntimeEnvironment {
  type: RuntimeEnvironmentType;
  version?: string;
  platform: PlatformType;
  isProduction: boolean;
  userAgent: string;
}

// Storage capabilities
export interface StorageCapabilities {
  hasFileSystem: boolean;
  hasOPFS: boolean;
  hasIndexedDB: boolean;
  hasLocalStorage: boolean;
  hasWebSQL: boolean;
  hasWASM: boolean;
  hasServiceWorker: boolean;
  hasWebWorker: boolean;
  hasSharedArrayBuffer: boolean;
  hasWebRTC: boolean;
  quota: StorageQuota | null;
}

export interface StorageQuota {
  available: number; // bytes
  used: number; // bytes
  total: number; // bytes
}

// Network capabilities
export interface NetworkCapabilities {
  isOnline: boolean;
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
}

// Comprehensive capability report
export interface CapabilityReport {
  runtime: RuntimeEnvironment;
  storage: StorageCapabilities;
  network: NetworkCapabilities;
  warnings: string[];
  timestamp: Date;
}

// Provider type for recommendations
export type ProviderType =
  | 'sqlite-file'
  | 'sqlite-wasm'
  | 'pouchdb'
  | 'backend-api'
  | 'hybrid'
  | 'livestore'
  | 'rxdb';

export interface ProviderRecommendation {
  recommended: ProviderType;
  alternatives: ProviderType[];
  reasoning: string;
}

/**
 * CapabilityDetector - Singleton service for detecting runtime capabilities
 */
export class CapabilityDetector {
  private static instance: CapabilityDetector;
  private cachedReport: CapabilityReport | null = null;
  private detectionTimestamp: number = 0;
  private readonly CACHE_TTL = 60_000; // Cache for 60 seconds
  private readonly REDETECT_INTERVAL = 300_000; // Re-detect every 5 minutes
  private reDetectTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(report: CapabilityReport) => void> = new Set();

  private constructor() {}

  static getInstance(): CapabilityDetector {
    if (!CapabilityDetector.instance) {
      CapabilityDetector.instance = new CapabilityDetector();
      CapabilityDetector.instance.startPeriodicReDetection();
    }
    return CapabilityDetector.instance;
  }

  /**
   * Clear cached detection results (useful for testing or after environment changes)
   */
  clearCache(): void {
    this.cachedReport = null;
    this.detectionTimestamp = 0;
  }

  /**
   * Subscribe to capability changes
   * Returns an unsubscribe function
   */
  onCapabilityChange(listener: (report: CapabilityReport) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of capability changes
   */
  private notifyListeners(report: CapabilityReport): void {
    for (const listener of this.listeners) {
      try {
        listener(report);
      } catch (error) {
        console.warn('[CapabilityDetector] Error in capability change listener:', error);
      }
    }
  }

  /**
   * Start periodic re-detection to catch environment changes (e.g., browser extensions, PWA install)
   */
  private startPeriodicReDetection(): void {
    if (this.reDetectTimer) return;

    this.reDetectTimer = setInterval(async () => {
      try {
        const oldReport = this.cachedReport;
        const newReport = await this.detectCapabilities(true);

        // Check if capabilities actually changed
        if (oldReport && this.hasCapabilitiesChanged(oldReport, newReport)) {
          this.notifyListeners(newReport);
        }
      } catch (error) {
        console.warn('[CapabilityDetector] Error during periodic re-detection:', error);
      }
    }, this.REDETECT_INTERVAL);

    // Unref timer to prevent it from keeping the process alive (Node.js environments)
    if (typeof this.reDetectTimer.unref === 'function') {
      this.reDetectTimer.unref();
    }
  }

  /**
   * Stop periodic re-detection
   */
  stopPeriodicReDetection(): void {
    if (this.reDetectTimer) {
      clearInterval(this.reDetectTimer);
      this.reDetectTimer = null;
    }
  }

  /**
   * Check if significant capabilities have changed between two reports
   */
  private hasCapabilitiesChanged(old: CapabilityReport, current: CapabilityReport): boolean {
    // Check storage capabilities
    const storageKeys: (keyof StorageCapabilities)[] = [
      'hasFileSystem', 'hasOPFS', 'hasIndexedDB', 'hasLocalStorage',
      'hasWebSQL', 'hasWASM', 'hasServiceWorker', 'hasWebWorker',
      'hasSharedArrayBuffer', 'hasWebRTC',
    ];
    for (const key of storageKeys) {
      if (old.storage[key] !== current.storage[key]) return true;
    }

    // Check runtime type
    if (old.runtime.type !== current.runtime.type) return true;

    // Check network status
    if (old.network.isOnline !== current.network.isOnline) return true;

    return false;
  }

  /**
   * Get comprehensive capability report (cached for performance)
   */
  async detectCapabilities(forceRefresh = false): Promise<CapabilityReport> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.cachedReport &&
      now - this.detectionTimestamp < this.CACHE_TTL
    ) {
      return this.cachedReport;
    }

    const warnings: string[] = [];

    const runtime = this.detectRuntime();
    const storage = await this.detectStorageCapabilities(warnings);
    const network = this.detectNetworkCapabilities();

    const report: CapabilityReport = {
      runtime,
      storage,
      network,
      warnings,
      timestamp: new Date(),
    };

    this.cachedReport = report;
    this.detectionTimestamp = now;

    return report;
  }

  /**
   * Get recommended provider based on detected capabilities
   */
  async getProviderRecommendation(): Promise<ProviderRecommendation> {
    const report = await this.detectCapabilities();
    return this.computeProviderRecommendation(report);
  }

  /**
   * Quick check if a specific capability is available
   */
  async hasCapability(capability: keyof StorageCapabilities): Promise<boolean> {
    const report = await this.detectCapabilities();
    if (capability === 'quota') return report.storage.quota !== null;
    return report.storage[capability] as boolean;
  }

  /**
   * Diagnostic API - get detection results as a readable string
   */
  async getDiagnosticReport(): Promise<string> {
    const report = await this.detectCapabilities();
    const lines = [
      '=== Capability Diagnostic Report ===',
      `Timestamp: ${report.timestamp.toISOString()}`,
      '',
      '--- Runtime Environment ---',
      `Type: ${report.runtime.type}`,
      `Platform: ${report.runtime.platform}`,
      `Version: ${report.runtime.version || 'unknown'}`,
      `Production: ${report.runtime.isProduction}`,
      '',
      '--- Storage Capabilities ---',
      `OPFS: ${report.storage.hasOPFS ? 'Available' : 'Not available'}`,
      `IndexedDB: ${report.storage.hasIndexedDB ? 'Available' : 'Not available'}`,
      `WASM: ${report.storage.hasWASM ? 'Available' : 'Not available'}`,
      `FileSystem: ${report.storage.hasFileSystem ? 'Available' : 'Not available'}`,
      `LocalStorage: ${report.storage.hasLocalStorage ? 'Available' : 'Not available'}`,
      `ServiceWorker: ${report.storage.hasServiceWorker ? 'Available' : 'Not available'}`,
      `SharedArrayBuffer: ${report.storage.hasSharedArrayBuffer ? 'Available' : 'Not available'}`,
      `WebRTC: ${report.storage.hasWebRTC ? 'Available' : 'Not available'}`,
      report.storage.quota
        ? `Storage Quota: ${this.formatBytes(report.storage.quota.available)} available of ${this.formatBytes(report.storage.quota.total)}`
        : 'Storage Quota: Unable to determine',
      '',
      '--- Network ---',
      `Online: ${report.network.isOnline}`,
      `Type: ${report.network.type}`,
      `Effective: ${report.network.effectiveType}`,
      `Downlink: ${report.network.downlink} Mbps`,
      `RTT: ${report.network.rtt} ms`,
      '',
    ];

    if (report.warnings.length > 0) {
      lines.push('--- Warnings ---');
      report.warnings.forEach((w) => lines.push(`  - ${w}`));
      lines.push('');
    }

    const recommendation = this.computeProviderRecommendation(report);
    lines.push('--- Provider Recommendation ---');
    lines.push(`Recommended: ${recommendation.recommended}`);
    lines.push(`Alternatives: ${recommendation.alternatives.join(', ')}`);
    lines.push(`Reasoning: ${recommendation.reasoning}`);
    lines.push('');
    lines.push('=== End Report ===');

    return lines.join('\n');
  }

  // ==================== Internal Detection Methods ====================

  private detectRuntime(): RuntimeEnvironment {
    // Detect Electron
    if (this.isElectron()) {
      return {
        type: 'electron',
        version: this.getElectronVersion(),
        platform: this.detectPlatform(),
        isProduction: !import.meta.env.DEV,
        userAgent: navigator.userAgent,
      };
    }

    // Detect Tauri
    if (this.isTauri()) {
      return {
        type: 'tauri',
        platform: this.detectPlatform(),
        isProduction: !import.meta.env.DEV,
        userAgent: navigator.userAgent,
      };
    }

    // Browser client vs server-side rendering detection
    const isSSR = typeof window === 'undefined' || typeof navigator === 'undefined';
    if (isSSR) {
      return {
        type: 'browser-server',
        platform: 'web',
        isProduction: !import.meta.env.DEV,
        userAgent: '',
      };
    }

    return {
      type: 'browser-client',
      platform: this.detectPlatform(),
      isProduction: !import.meta.env.DEV,
      userAgent: navigator.userAgent,
    };
  }

  private async detectStorageCapabilities(warnings: string[]): Promise<StorageCapabilities> {
    const hasOPFS = this.checkOPFS();
    const hasIndexedDB = this.checkIndexedDB();
    const hasWASM = this.checkWASM();
    const hasFileSystem = this.checkFileSystem();
    const hasLocalStorage = this.checkLocalStorage();
    const hasServiceWorker = this.checkServiceWorker();
    const hasWebWorker = this.checkWebWorker();
    const hasSharedArrayBuffer = this.checkSharedArrayBuffer();
    const hasWebSQL = this.checkWebSQL();
    const hasWebRTC = this.checkWebRTC();

    if (!hasOPFS && !hasIndexedDB) {
      warnings.push(
        'Neither OPFS nor IndexedDB is available. Persistent storage may not work.',
      );
    }
    if (!hasWASM) {
      warnings.push(
        'WebAssembly is not available. SQLite WASM provider will not work.',
      );
    }

    // Query storage quota asynchronously
    let quota: StorageQuota | null = null;
    try {
      quota = await this.queryStorageQuota();
    } catch {
      warnings.push('Unable to query storage quota.');
    }

    // Validate capabilities with test operations
    if (hasIndexedDB) {
      try {
        await this.testIndexedDB();
      } catch {
        warnings.push('IndexedDB is available but failed test operation.');
      }
    }

    return {
      hasFileSystem,
      hasOPFS,
      hasIndexedDB,
      hasLocalStorage,
      hasWebSQL,
      hasWASM,
      hasServiceWorker,
      hasWebWorker,
      hasSharedArrayBuffer,
      hasWebRTC,
      quota,
    };
  }

  private detectNetworkCapabilities(): NetworkCapabilities {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
        type: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false,
      };
    }

    const conn = (navigator as any).connection ||
                 (navigator as any).mozConnection ||
                 (navigator as any).webkitConnection;

    if (!conn) {
      return {
        isOnline: navigator.onLine,
        type: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false,
      };
    }

    return {
      isOnline: navigator.onLine,
      type: conn.type || 'unknown',
      effectiveType: conn.effectiveType || 'unknown',
      downlink: conn.downlink || 0,
      rtt: conn.rtt || 0,
      saveData: conn.saveData || false,
    };
  }

  // ==================== Capability Checks ====================

  private checkOPFS(): boolean {
    try {
      return (
        typeof navigator !== 'undefined' &&
        'storage' in navigator &&
        'getDirectory' in navigator.storage &&
        typeof navigator.storage.getDirectory === 'function'
      );
    } catch {
      return false;
    }
  }

  private checkIndexedDB(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        'indexedDB' in window &&
        window.indexedDB !== null
      );
    } catch {
      return false;
    }
  }

  private checkWASM(): boolean {
    try {
      return (
        typeof WebAssembly !== 'undefined' &&
        typeof WebAssembly.instantiate === 'function'
      );
    } catch {
      return false;
    }
  }

  private checkFileSystem(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        'showOpenFilePicker' in window
      );
    } catch {
      return false;
    }
  }

  private checkLocalStorage(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        'localStorage' in window &&
        window.localStorage !== null
      );
    } catch {
      return false;
    }
  }

  private checkServiceWorker(): boolean {
    try {
      return (
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator
      );
    } catch {
      return false;
    }
  }

  private checkWebWorker(): boolean {
    try {
      return typeof Worker !== 'undefined';
    } catch {
      return false;
    }
  }

  private checkSharedArrayBuffer(): boolean {
    try {
      return typeof SharedArrayBuffer !== 'undefined';
    } catch {
      return false;
    }
  }

  private checkWebSQL(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        'openDatabase' in window
      );
    } catch {
      return false;
    }
  }

  private checkWebRTC(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        ('RTCPeerConnection' in window ||
         'webkitRTCPeerConnection' in window ||
         'mozRTCPeerConnection' in window)
      );
    } catch {
      return false;
    }
  }

  // ==================== Async Validation ====================

  private async testIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('__capability_test__', 1);
        request.onsuccess = () => {
          const db = request.result;
          db.close();
          indexedDB.deleteDatabase('__capability_test__');
          resolve();
        };
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = () => {
          // Database created, will be deleted on success
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private async queryStorageQuota(): Promise<StorageQuota | null> {
    if (
      typeof navigator === 'undefined' ||
      !('storage' in navigator) ||
      !navigator.storage?.estimate
    ) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        available: Math.max(0, (estimate.quota ?? 0) - (estimate.usage ?? 0)),
        used: estimate.usage ?? 0,
        total: estimate.quota ?? 0,
      };
    } catch {
      return null;
    }
  }

  // ==================== Runtime Detection Helpers ====================

  private isElectron(): boolean {
    if (typeof process !== 'undefined' && process.versions) {
      return 'electron' in process.versions;
    }
    if (typeof navigator !== 'undefined') {
      return (
        navigator.userAgent.toLowerCase().includes('electron') ||
        (window as any).process?.type !== undefined
      );
    }
    return false;
  }

  private getElectronVersion(): string | undefined {
    if (typeof process !== 'undefined' && process.versions?.electron) {
      return process.versions.electron;
    }
    return undefined;
  }

  private isTauri(): boolean {
    if (typeof window !== 'undefined') {
      return (
        '__TAURI__' in window ||
        (window as any).__TAURI_INTERNALS__ !== undefined ||
        (window as any).__TAURI__ !== undefined
      );
    }
    return false;
  }

  private detectPlatform(): PlatformType {
    if (typeof navigator === 'undefined') return 'unknown';

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('linux')) return 'linux';
    return 'web';
  }

  // ==================== Provider Recommendation ====================

  private computeProviderRecommendation(report: CapabilityReport): ProviderRecommendation {
    const { runtime, storage } = report;

    // Desktop frameworks with file system access
    if (runtime.type === 'electron' || runtime.type === 'tauri') {
      return {
        recommended: 'sqlite-file',
        alternatives: ['pouchdb', 'sqlite-wasm'],
        reasoning: `Desktop environment (${runtime.type}) with native file system access. SQLite File provides best performance.`,
      };
    }

    // Browser with OPFS and WASM
    if (storage.hasOPFS && storage.hasWASM) {
      return {
        recommended: 'sqlite-wasm',
        alternatives: ['pouchdb', 'livestore'],
        reasoning: 'Browser with OPFS and WASM support. SQLite WASM provides persistent storage with SQL capabilities.',
      };
    }

    // Browser with IndexedDB but no OPFS
    if (storage.hasIndexedDB) {
      return {
        recommended: 'pouchdb',
        alternatives: ['livestore', 'rxdb'],
        reasoning: 'Browser with IndexedDB. PouchDB provides offline-first with CouchDB sync capability.',
      };
    }

    // Backend API scenario (browser-server or limited storage)
    if (runtime.type === 'browser-server') {
      return {
        recommended: 'backend-api',
        alternatives: [],
        reasoning: 'Server-side rendering or browser-server environment. Backend API provider required.',
      };
    }

    // Fallback
    return {
      recommended: 'backend-api',
      alternatives: ['pouchdb'],
      reasoning: 'Limited storage capabilities. Backend API with local fallback recommended.',
      warnings: ['No suitable local storage provider found. Data persistence may be limited.'],
    } as any;
  }

  // ==================== Utility ====================

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

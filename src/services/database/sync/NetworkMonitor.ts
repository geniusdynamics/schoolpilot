/**
 * NetworkMonitor - Monitors network connectivity and emits status changes
 *
 * Provides real-time network status detection with online/offline events,
 * connection quality metrics, and reconnection notifications.
 *
 * Requirements: 3.2, 8.3-8.4
 */

import { EventEmitter } from 'events';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkInfo {
  isOnline: boolean;
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
}

export interface NetworkMonitorEvents {
  online: void;
  offline: void;
  change: NetworkInfo;
}

export class NetworkMonitor extends EventEmitter {
  private static instance: NetworkMonitor | null = null;
  private currentStatus: NetworkStatus = 'unknown';
  private currentInfo: NetworkInfo;
  private eventListeners: { event: string; handler: () => void }[] = [];
  private isConnected = true;

  constructor() {
    super();
    this.currentInfo = this.detectNetworkInfo();
    this.currentStatus = this.currentInfo.isOnline ? 'online' : 'offline';
    this.isConnected = this.currentInfo.isOnline;
  }

  /**
   * Get singleton instance (creates and starts on first call)
   */
  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
      NetworkMonitor.instance.start();
    }
    return NetworkMonitor.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    if (NetworkMonitor.instance) {
      NetworkMonitor.instance.destroy();
      NetworkMonitor.instance = null;
    }
  }

  /**
   * Start monitoring network changes
   */
  start(): void {
    this.stop(); // Clean up any existing listeners first

    if (typeof window !== 'undefined') {
      const onlineHandler = () => this.handleOnline();
      const offlineHandler = () => this.handleOffline();

      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);

      this.eventListeners.push(
        { event: 'online', handler: onlineHandler },
        { event: 'offline', handler: offlineHandler },
      );
    }
  }

  /**
   * Stop monitoring network changes
   */
  stop(): void {
    if (typeof window !== 'undefined') {
      for (const { event, handler } of this.eventListeners) {
        window.removeEventListener(event, handler);
      }
    }
    this.eventListeners = [];
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return this.currentStatus;
  }

  /**
   * Get detailed network information
   */
  getInfo(): NetworkInfo {
    return this.currentInfo;
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return this.isConnected;
  }

  /**
   * Check if currently offline
   */
  isOffline(): boolean {
    return !this.isOnline();
  }

  /**
   * Manually trigger status check (useful for testing)
   */
  checkStatus(): NetworkStatus {
    const wasOnline = this.isConnected;
    this.isConnected = this.isOnline();
    this.currentInfo = this.detectNetworkInfo();

    if (!wasOnline && this.isConnected) {
      this.handleOnline();
    } else if (wasOnline && !this.isConnected) {
      this.handleOffline();
    } else {
      this.currentStatus = this.isConnected ? 'online' : 'offline';
      this.emit('change', this.currentInfo);
    }

    return this.currentStatus;
  }

  // ==================== Internal Handlers ====================

  private handleOnline(): void {
    const wasOffline = !this.isConnected;
    this.isConnected = true;
    this.currentStatus = 'online';
    this.currentInfo = this.detectNetworkInfo();

    if (wasOffline) {
      this.emit('online');
    }
    this.emit('change', this.currentInfo);
  }

  private handleOffline(): void {
    const wasOnline = this.isConnected;
    this.isConnected = false;
    this.currentStatus = 'offline';

    if (wasOnline) {
      this.emit('offline');
    }
    this.emit('change', this.currentInfo);
  }

  private detectNetworkInfo(): NetworkInfo {
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

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}

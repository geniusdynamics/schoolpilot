/**
 * Storage Adapters
 * 
 * Platform-specific storage implementations.
 */

import type { StorageAdapter } from '../types';

// Web Storage Adapter
export class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async getAllKeys(): Promise<string[]> {
    return Object.keys(localStorage);
  }

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    return keys.map(key => [key, localStorage.getItem(key)]);
  }

  async multiSet(keyValues: [string, string][]): Promise<void> {
    for (const [key, value] of keyValues) {
      localStorage.setItem(key, value);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }
}

// Native Storage Adapter (AsyncStorage)
export class AsyncStorageAdapter implements StorageAdapter {
  private storage: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    // Implementation: return AsyncStorage.getItem(key);
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    return keys.map(key => [key, this.storage.get(key) || null]);
  }

  async multiSet(keyValues: [string, string][]): Promise<void> {
    for (const [key, value] of keyValues) {
      this.storage.set(key, value);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.storage.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

export function createStorageAdapter(platform: 'web' | 'native'): StorageAdapter {
  if (platform === 'web') {
    return new LocalStorageAdapter();
  }
  return new AsyncStorageAdapter();
}

export const storage = createStorageAdapter('web');

export default storage;

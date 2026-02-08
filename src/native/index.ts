/**
 * React Native Foundation
 * 
 * Foundation for building a React Native mobile app that shares code with the web app.
 * 
 * @example
 * ```tsx
 * // Use platform-agnostic storage
 * import { storage } from '@/native';
 * 
 * await storage.setItem('key', 'value');
 * const value = await storage.getItem('key');
 * 
 * // Use platform detection
 * import { useShared } from '@/native';
 * 
 * const { isNative, isWeb } = useShared();
 * ```
 */

// Types
export type {
  StorageAdapter,
  FileSystemAdapter,
  NetworkAdapter,
  NetworkState,
  NotificationAdapter,
  NotificationPermissions,
  NotificationOptions,
  MobileRoute,
  MobileTabRoute,
  MobileStackRoute,
  MobileTheme,
  DeviceInfo,
  SharedComponentProps,
  ButtonProps,
  InputProps,
  CardProps,
  ListProps,
} from './types';

// Adapters
export {
  LocalStorageAdapter,
  AsyncStorageAdapter,
  createStorageAdapter,
  storage,
} from './adapters/storage';

// Hooks
export { useShared } from './hooks/useShared';

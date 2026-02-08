/**
 * React Native Types
 * 
 * Type definitions for React Native foundation.
 */

import type { ComponentType } from 'react';

// ============================================================================
// Platform Abstractions
// ============================================================================

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  multiGet(keys: string[]): Promise<[string, string | null][]>;
  multiSet(keyValues: [string, string][]): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
  clear(): Promise<void>;
}

export interface FileSystemAdapter {
  documentDirectory: string;
  cacheDirectory: string;
  
  readAsStringAsync(uri: string): Promise<string>;
  writeAsStringAsync(uri: string, content: string): Promise<void>;
  deleteAsync(uri: string): Promise<void>;
  moveAsync(options: { from: string; to: string }): Promise<void>;
  copyAsync(options: { from: string; to: string }): Promise<void>;
  makeDirectoryAsync(uri: string): Promise<void>;
  readDirectoryAsync(uri: string): Promise<string[]>;
  getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number; isDirectory?: boolean }>;
  downloadAsync(url: string, uri: string): Promise<{ uri: string; status: number }>;
}

export interface NetworkAdapter {
  getState(): NetworkState;
  addEventListener(listener: (state: NetworkState) => void): () => void;
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: 'none' | 'wifi' | 'cellular' | 'unknown';
}

export interface NotificationAdapter {
  requestPermissions(): Promise<boolean>;
  getPermissions(): Promise<NotificationPermissions>;
  scheduleNotification(options: NotificationOptions): Promise<string>;
  cancelNotification(identifier: string): Promise<void>;
  cancelAllNotifications(): Promise<void>;
  setBadgeCount(count: number): Promise<void>;
  getBadgeCount(): Promise<number>;
}

export interface NotificationPermissions {
  status: 'granted' | 'denied' | 'undetermined';
}

export interface NotificationOptions {
  title: string;
  body?: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: boolean;
  trigger?: { seconds: number } | { date: Date };
}

// ============================================================================
// Mobile Navigation
// ============================================================================

export interface MobileRoute {
  name: string;
  component: ComponentType<any>;
  title?: string;
  icon?: string;
  params?: Record<string, any>;
}

export interface MobileTabRoute extends MobileRoute {
  tabBarLabel?: string;
  tabBarIcon?: string;
}

export interface MobileStackRoute extends MobileRoute {
  headerShown?: boolean;
  headerTitle?: string;
}

// ============================================================================
// Mobile UI
// ============================================================================

export interface MobileTheme {
  colors: {
    primary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  fonts: {
    regular: string;
    medium: string;
    bold: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
}

// ============================================================================
// Device Info
// ============================================================================

export interface DeviceInfo {
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  modelId: string | null;
  designName: string | null;
  productName: string | null;
  deviceYearClass: number | null;
  totalMemory: number | null;
  supportedCpuArchitectures: string[] | null;
  osName: string | null;
  osVersion: string | null;
  osBuildId: string | null;
  osInternalBuildId: string | null;
  osBuildFingerprint: string | null;
  platformApiLevel: number | null;
  deviceName: string | null;
}

// ============================================================================
// Shared Component Props
// ============================================================================

export interface SharedComponentProps {
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessible?: boolean;
}

export interface ButtonProps extends SharedComponentProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
}

export interface InputProps extends SharedComponentProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
}

export interface CardProps extends SharedComponentProps {
  children: React.ReactNode;
  onPress?: () => void;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface ListProps<T> extends SharedComponentProps {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  onEndReached?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  emptyMessage?: string;
  ItemSeparatorComponent?: ComponentType<any>;
  ListHeaderComponent?: ComponentType<any>;
  ListFooterComponent?: ComponentType<any>;
}

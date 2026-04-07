/**
 * Plugin Event System
 *
 * Manages plugin lifecycle events, subscriptions, and event history.
 * Extracted from PluginManager.ts to follow single-responsibility principle.
 */

import type { PluginLifecycleEvents } from './types';
import { logger } from '@/utils/logging';

type EventCallback<T = any> = (data: T) => void;
type Unsubscribe = () => void;

export type PluginEventType = keyof PluginLifecycleEvents;

export interface PluginEvent {
  type: PluginEventType;
  pluginId?: string;
  timestamp: number;
  payload: any;
}

export class PluginEventSystem {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private eventHistory: PluginEvent[] = [];
  private readonly MAX_HISTORY_SIZE = 1000;

  /**
   * Subscribe to a plugin event
   */
  on<T extends PluginEventType>(
    event: T,
    callback: EventCallback<PluginLifecycleEvents[T]>
  ): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Subscribe to a plugin event (alias for 'on')
   */
  subscribe<T extends PluginEventType>(
    event: T,
    callback: EventCallback<PluginLifecycleEvents[T]>
  ): Unsubscribe {
    return this.on(event, callback);
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T extends PluginEventType>(event: T, data: PluginLifecycleEvents[T]): void {
    // Add to history
    this.addToHistory({
      type: event,
      pluginId: (data as any)?.pluginId,
      timestamp: Date.now(),
      payload: data,
    });

    // Notify subscribers
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Emit an event (alias for 'emit')
   */
  dispatch<T extends PluginEventType>(event: T, data: PluginLifecycleEvents[T]): void {
    this.emit(event, data);
  }

  /**
   * Get event history, optionally filtered by plugin ID
   */
  getEventHistory(pluginId?: string): PluginEvent[] {
    if (pluginId) {
      return this.eventHistory.filter((e) => e.pluginId === pluginId);
    }
    return [...this.eventHistory];
  }

  /**
   * Get the last event of a specific type
   */
  getLastEvent<T extends PluginEventType>(event: T): PluginEvent | undefined {
    return this.eventHistory
      .filter((e) => e.type === event)
      .pop();
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Clear history for a specific plugin
   */
  clearPluginHistory(pluginId: string): void {
    this.eventHistory = this.eventHistory.filter((e) => e.pluginId !== pluginId);
  }

  /**
   * Get count of events, optionally filtered by type
   */
  getEventCount(eventType?: PluginEventType): number {
    if (eventType) {
      return this.eventHistory.filter((e) => e.type === eventType).length;
    }
    return this.eventHistory.length;
  }

  /**
   * Check if there are any subscribers for an event
   */
  hasSubscribers(event: string): boolean {
    const listeners = this.listeners.get(event);
    return listeners !== undefined && listeners.size > 0;
  }

  /**
   * Get count of subscribers for an event
   */
  getSubscriberCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }

  /**
   * Add event to history with size limit
   */
  private addToHistory(event: PluginEvent): void {
    this.eventHistory.push(event);

    // Trim history if it exceeds max size
    if (this.eventHistory.length > this.MAX_HISTORY_SIZE) {
      this.eventHistory = this.eventHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  /**
   * Get events within a time range
   */
  getEventsInRange(startTime: number, endTime: number): PluginEvent[] {
    return this.eventHistory.filter((e) => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  /**
   * Get recent events, optionally limited by count
   */
  getRecentEvents(count: number = 10): PluginEvent[] {
    return this.eventHistory.slice(-count);
  }

  /**
   * Export event history as JSON
   */
  exportHistory(): string {
    return JSON.stringify(this.eventHistory, null, 2);
  }

  /**
   * Import event history from JSON
   */
  importHistory(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        this.eventHistory = parsed;
      }
    } catch (error) {
      logger.error('[PluginEventSystem] Failed to import history:', error);
    }
  }
}

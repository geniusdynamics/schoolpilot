import { logger } from '@/utils/logging';

// ABOUTME: Performance event manager for coordinating performance data updates across components
// ABOUTME: Provides event-driven performance monitoring without aggressive auto-refresh

type PerformanceEventType = 
  | 'navigation'
  | 'data_operation'
  | 'user_interaction'
  | 'manual_refresh'
  | 'tab_switch'
  | 'form_submit'
  | 'diagnostic';

interface PerformanceEvent {
  type: PerformanceEventType;
  timestamp: number;
  source?: string;
  metadata?: Record<string, any>;
}

type PerformanceEventListener = (event: PerformanceEvent) => void;

class PerformanceEventManager {
  private listeners: Set<PerformanceEventListener> = new Set();
  private lastEvent: PerformanceEvent | null = null;
  private eventHistory: PerformanceEvent[] = [];
  private readonly MAX_HISTORY = 50;

  constructor() {
    this.setupGlobalListeners();
  }

  private setupGlobalListeners(): void {
    // Navigation events
    window.addEventListener('popstate', () => {
      this.emit('navigation', 'browser_navigation');
    });

    window.addEventListener('hashchange', () => {
      this.emit('navigation', 'hash_change');
    });

    // Page visibility changes (tab switching)
    document.addEventListener('visibilitychange', () => {
      this.emit('diagnostic', 'visibility_change', {
        visibilityState: document.visibilityState
      });
      if (document.visibilityState === 'visible') {
        this.emit('tab_switch', 'tab_focus');
      }
    });

    window.addEventListener('beforeunload', () => {
      this.emit('diagnostic', 'beforeunload', {
        href: window.location.href
      });
    });

    window.addEventListener('pagehide', () => {
      this.emit('diagnostic', 'pagehide', {
        href: window.location.href
      });
    });

    // Form submissions
    document.addEventListener('submit', (event) => {
      this.emit('form_submit', 'form_submission', {
        formId: (event.target as HTMLFormElement)?.id || 'unknown'
      });
    });

    // Data operation indicators (button clicks that might trigger data operations)
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // Check if it's a button that might trigger data operations
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.tagName === 'BUTTON' ? target : target.closest('button');
        const buttonText = button?.textContent?.toLowerCase() || '';
        
        // Only emit for buttons that likely trigger data operations
        if (buttonText.includes('save') || 
            buttonText.includes('submit') || 
            buttonText.includes('create') || 
            buttonText.includes('update') || 
            buttonText.includes('delete') ||
            buttonText.includes('refresh')) {
          
          this.emit('data_operation', 'button_click', {
            buttonText: buttonText,
            buttonId: button?.id || 'unknown'
          });
        }
      }
    });
  }

  public emit(type: PerformanceEventType, source?: string, metadata?: Record<string, any>): void {
    const event: PerformanceEvent = {
      type,
      timestamp: Date.now(),
      source,
      metadata
    };

    this.lastEvent = event;
    this.eventHistory.push(event);

    // Limit history size
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory = this.eventHistory.slice(-this.MAX_HISTORY);
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.warn('Error in performance event listener:', error);
      }
    });
  }

  public subscribe(listener: PerformanceEventListener): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getLastEvent(): PerformanceEvent | null {
    return this.lastEvent;
  }

  public getEventHistory(): PerformanceEvent[] {
    return [...this.eventHistory];
  }

  public shouldRefresh(lastRefresh: number, minInterval: number = 1000): boolean {
    if (!this.lastEvent) return false;
    
    const timeSinceLastRefresh = Date.now() - lastRefresh;
    const timeSinceLastEvent = Date.now() - this.lastEvent.timestamp;
    
    // Only refresh if:
    // 1. Enough time has passed since last refresh (prevent spam)
    // 2. There was a recent event (within 5 seconds)
    return timeSinceLastRefresh >= minInterval && timeSinceLastEvent <= 5000;
  }

  public getRecentEvents(timeWindow: number = 10000): PerformanceEvent[] {
    const cutoff = Date.now() - timeWindow;
    return this.eventHistory.filter(event => event.timestamp >= cutoff);
  }

  public markDiagnostic(source: string, metadata?: Record<string, any>): void {
    this.emit('diagnostic', source, metadata);
  }

  public getDiagnosticsSnapshot(limit: number = 100): PerformanceEvent[] {
    return this.eventHistory
      .filter(event => event.type === 'diagnostic' || event.type === 'navigation')
      .slice(-limit);
  }
}

// Singleton instance
export const performanceEventManager = new PerformanceEventManager();

// Hook for components to use the event system
export const usePerformanceEvents = (
  onEvent?: (event: PerformanceEvent) => void,
  eventTypes?: PerformanceEventType[]
) => {
  const [lastEvent, setLastEvent] = React.useState<PerformanceEvent | null>(null);

  React.useEffect(() => {
    const unsubscribe = performanceEventManager.subscribe((event) => {
      // Filter by event types if specified
      if (eventTypes && !eventTypes.includes(event.type)) {
        return;
      }

      setLastEvent(event);
      onEvent?.(event);
    });

    return unsubscribe;
  }, [onEvent, eventTypes]);

  const emitEvent = React.useCallback((
    type: PerformanceEventType, 
    source?: string, 
    metadata?: Record<string, any>
  ) => {
    performanceEventManager.emit(type, source, metadata);
  }, []);

  return {
    lastEvent,
    emitEvent,
    shouldRefresh: (lastRefresh: number, minInterval?: number) => 
      performanceEventManager.shouldRefresh(lastRefresh, minInterval),
    getRecentEvents: (timeWindow?: number) => 
      performanceEventManager.getRecentEvents(timeWindow)
  };
};

// React import for the hook
import React from 'react';

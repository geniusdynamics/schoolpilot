/**
 * PWA Hook
 * 
 * React hook for PWA functionality.
 * Handles install prompt, service worker updates, and online status.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { performanceEventManager } from '../services/performance/performanceEventManager';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  serviceWorkerRegistered: boolean;
  syncSupported: boolean;
  pushSupported: boolean;
}

interface PWAActions {
  promptInstall: () => Promise<boolean>;
  updateApp: () => Promise<void>;
  registerSync: (tag?: string) => Promise<boolean>;
  requestNotificationPermission: () => Promise<boolean>;
  subscribeToPush: () => Promise<boolean>;
}

/**
 * Hook for PWA functionality
 */
export function usePWA(): [PWAState, PWAActions] {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serviceWorkerRegistered, setServiceWorkerRegistered] = useState(false);
  
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const registration = useRef<ServiceWorkerRegistration | null>(null);

  // Check install status
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  // Listen for beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Listen for appinstalled
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      deferredPrompt.current = null;
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Listen for online/offline
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      return;
    }

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        registration.current = reg;
        setServiceWorkerRegistered(true);

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              performanceEventManager.markDiagnostic('sw_update_available', {
                source: 'updatefound'
              });
            }
          });
        });

        // Check for existing updates
        if (reg.waiting) {
          setUpdateAvailable(true);
          performanceEventManager.markDiagnostic('sw_update_available', {
            source: 'waiting_registration'
          });
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerSW();

    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'update-available') {
        setUpdateAvailable(true);
        performanceEventManager.markDiagnostic('sw_update_available', {
          source: 'sw_message'
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  /**
   * Prompt the user to install the PWA
   */
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt.current) return false;

    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    
    deferredPrompt.current = null;
    setIsInstallable(false);

    return outcome === 'accepted';
  }, []);

  /**
   * Update the app to the new version
   */
  const updateApp = useCallback(async (): Promise<void> => {
    if (!registration.current?.waiting) return;

    performanceEventManager.markDiagnostic('sw_update_apply_requested', {
      href: window.location.href
    });
    registration.current.waiting.postMessage({ type: 'skip-waiting' });
    setUpdateAvailable(false);

    await new Promise<void>((resolve) => {
      let settled = false;
      const handleControllerChange = () => {
        if (settled) return;
        settled = true;
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        resolve();
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      setTimeout(() => {
        if (settled) return;
        settled = true;
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        resolve();
      }, 5000);
    });

    performanceEventManager.markDiagnostic('sw_update_reload', {
      href: window.location.href
    });
    window.location.reload();
  }, []);

  /**
   * Register background sync
   */
  const registerSync = useCallback(async (tag = 'background-sync'): Promise<boolean> => {
    if (!('sync' in registration.current)) return false;

    try {
      await (registration.current as any).sync.register(tag);
      return true;
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  }, []);

  /**
   * Request notification permission
   */
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  /**
   * Subscribe to push notifications
   */
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!registration.current) return false;

    try {
      const subscription = await registration.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.VITE_VAPID_PUBLIC_KEY || ''
        ),
      });

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    }
  }, []);

  const state: PWAState = {
    isInstallable,
    isInstalled,
    isOffline,
    updateAvailable,
    serviceWorkerRegistered,
    syncSupported: 'sync' in (registration.current || {}),
    pushSupported: 'pushManager' in (registration.current || {}),
  };

  const actions: PWAActions = {
    promptInstall,
    updateApp,
    registerSync,
    requestNotificationPermission,
    subscribeToPush,
  };

  return [state, actions];
}

/**
 * Helper to convert base64 to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default usePWA;

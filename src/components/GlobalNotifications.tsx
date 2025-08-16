// Global notification system for enhanced features
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNetwork } from '../contexts/NetworkContext';
import { useSync } from '../contexts/SyncContext';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  persistent?: boolean;
}

const GlobalNotifications: React.FC = () => {
  const { t } = useTranslation('common');
  const { isOnline, backendAvailable } = useNetwork();
  const { syncStatus, pendingSyncCount } = useSync();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Manage notifications based on app state
  useEffect(() => {
    const newNotifications: Notification[] = [];
    
    // Offline notification
    if (!isOnline) {
      newNotifications.push({
        id: 'offline',
        type: 'warning',
        message: t('notifications.offline'),
        persistent: true
      });
    }
    
    // Backend unavailable notification
    if (isOnline && !backendAvailable) {
      newNotifications.push({
        id: 'backend-unavailable',
        type: 'info',
        message: t('notifications.backendUnavailable'),
        persistent: true
      });
    }
    
    // Sync error notification
    if (syncStatus.state === 'error') {
      newNotifications.push({
        id: 'sync-error',
        type: 'error',
        message: t('notifications.syncError', { error: syncStatus.lastError?.message || t('notifications.unknownError') }),
        persistent: false
      });
    }
    
    // Pending sync notification
    if (pendingSyncCount > 5) {
      newNotifications.push({
        id: 'pending-sync',
        type: 'info',
        message: t('notifications.pendingSync', { count: pendingSyncCount }),
        persistent: false
      });
    }
    
    setNotifications(newNotifications);
  }, [isOnline, backendAvailable, syncStatus, pendingSyncCount, t]);
  
  // Auto-dismiss non-persistent notifications
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.persistent));
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [notifications]);
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {notifications.map(({ id, type, message, persistent }) => (
        <div
          key={id}
          className={`max-w-sm p-4 rounded-lg shadow-lg ${
            type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            type === 'warning' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium">{message}</p>
            {!persistent && (
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== id))}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GlobalNotifications;
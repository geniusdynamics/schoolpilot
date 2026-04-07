import { useState, useEffect, useCallback } from 'react';
import type { ReorderAlert } from '@/components/ReorderAlertsPanel';

interface UseReorderMonitoringReturn {
  alerts: ReorderAlert[];
  loading: boolean;
  error: string | null;
  dismissAlert: (alertId: string) => void;
  restockItem: (alertId: string) => void;
  ignoreAlert: (alertId: string) => void;
  refresh: () => void;
}

const mockAlerts: ReorderAlert[] = [
  {
    id: '1',
    itemName: 'Printer Paper',
    currentStock: 5,
    reorderLevel: 20,
    category: 'Stationery',
    supplier: 'Office Supplies Ltd',
    status: 'critical',
    lastRestockDate: '2024-03-15',
    daysUntilReorder: 2,
  },
  {
    id: '2',
    itemName: 'Whiteboard Markers',
    currentStock: 12,
    reorderLevel: 15,
    category: 'Stationery',
    supplier: 'Office Supplies Ltd',
    status: 'warning',
    lastRestockDate: '2024-03-20',
    daysUntilReorder: 5,
  },
  {
    id: '3',
    itemName: 'USB Flash Drives',
    currentStock: 8,
    reorderLevel: 10,
    category: 'Electronics',
    supplier: 'Tech Supplies Inc',
    status: 'warning',
    lastRestockDate: '2024-03-18',
    daysUntilReorder: 4,
  },
  {
    id: '4',
    itemName: 'Laptop Batteries',
    currentStock: 3,
    reorderLevel: 5,
    category: 'Electronics',
    supplier: 'Tech Supplies Inc',
    status: 'critical',
    lastRestockDate: '2024-02-28',
    daysUntilReorder: 1,
  },
  {
    id: '5',
    itemName: 'Office Chairs',
    currentStock: 2,
    reorderLevel: 5,
    category: 'Furniture',
    supplier: 'Office Furniture Co',
    status: 'out_of_stock',
    lastRestockDate: '2024-01-15',
    daysUntilReorder: 0,
  },
  {
    id: '6',
    itemName: 'Desk Lamps',
    currentStock: 15,
    reorderLevel: 10,
    category: 'Furniture',
    supplier: 'Office Furniture Co',
    status: 'normal',
    lastRestockDate: '2024-03-10',
    daysUntilReorder: 8,
  },
];

export function useReorderMonitoring(): UseReorderMonitoringReturn {
  const [alerts, setAlerts] = useState<ReorderAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setAlerts(mockAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const restockItem = useCallback(async (alertId: string) => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? {
              ...alert,
              currentStock: alert.currentStock + 20,
              status: alert.currentStock + 20 <= alert.reorderLevel ? 'critical' : alert.currentStock + 20 < alert.reorderLevel * 2 ? 'warning' : 'normal',
            }
          : alert
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restock item');
    } finally {
      setLoading(false);
    }
  }, []);

  const ignoreAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const refresh = useCallback(() => {
    loadAlerts();
  }, [loadAlerts]);

  return {
    alerts,
    loading,
    error,
    dismissAlert,
    restockItem,
    ignoreAlert,
    refresh,
  };
}

// Alias for backward compatibility
export const usePeriodicReorderMonitoring = useReorderMonitoring;

export default useReorderMonitoring;
// ABOUTME: Data hook for managing stock alert entities in the inventory module.
// ABOUTME: Provides CRUD operations and reactive queries for inventory alert management.

import { useDataHook } from '../../../hooks/useDataHook';
import { InvStockAlertType } from './types';

export const useStockAlertData = () => {
  const {
    data: alerts,
    loading,
    error,
    create,
    update,
    remove,
    findById,
    findByQuery,
    count,
    refresh
  } = useDataHook<InvStockAlertType>('stock_alerts');

  // Specialized query methods
  const findUnacknowledgedAlerts = () => {
    return findByQuery({
      selector: {
        acknowledged_at: null
      },
      sort: [{ created_at: 'desc' }]
    });
  };

  const findAlertsByType = (alertType: 'LOW_STOCK' | 'OVERSTOCK' | 'EXPIRY_WARNING' | 'EXPIRED') => {
    return findByQuery({
      selector: {
        alert_type: alertType
      },
      sort: [{ created_at: 'desc' }]
    });
  };

  const findAlertsByItem = (itemId: string) => {
    return findByQuery({
      selector: {
        item_id: itemId
      },
      sort: [{ created_at: 'desc' }]
    });
  };

  const findAlertsByWarehouse = (warehouseId: number) => {
    return findByQuery({
      selector: {
        warehouse_id: warehouseId
      },
      sort: [{ created_at: 'desc' }]
    });
  };

  const findCriticalAlerts = () => {
    return findByQuery({
      selector: {
        $or: [
          { alert_type: 'EXPIRED' },
          { alert_type: 'LOW_STOCK' }
        ],
        acknowledged_at: null
      },
      sort: [{ created_at: 'desc' }]
    });
  };

  const findExpiryAlerts = (daysAhead: number = 7) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return findByQuery({
      selector: {
        alert_type: { $in: ['EXPIRY_WARNING', 'EXPIRED'] },
        expiry_date: {
          $lte: futureDate.toISOString().split('T')[0]
        }
      },
      sort: [{ expiry_date: 'asc' }]
    });
  };

  const acknowledgeAlert = async (alertId: string, acknowledgedBy: string) => {
    const alert = await findById(alertId);
    if (alert) {
      return update(alertId, {
        ...alert,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledgedBy
      });
    }
    throw new Error('Alert not found');
  };

  const acknowledgeMultipleAlerts = async (alertIds: string[], acknowledgedBy: string) => {
    const promises = alertIds.map(id => acknowledgeAlert(id, acknowledgedBy));
    return Promise.all(promises);
  };

  const getAlertCounts = async () => {
    const [total, unacknowledged, critical, lowStock, overstock, expiring, expired] = await Promise.all([
      count(),
      count({ acknowledged_at: null }),
      count({ 
        $or: [
          { alert_type: 'EXPIRED' },
          { alert_type: 'LOW_STOCK' }
        ],
        acknowledged_at: null 
      }),
      count({ alert_type: 'LOW_STOCK', acknowledged_at: null }),
      count({ alert_type: 'OVERSTOCK', acknowledged_at: null }),
      count({ alert_type: 'EXPIRY_WARNING', acknowledged_at: null }),
      count({ alert_type: 'EXPIRED', acknowledged_at: null })
    ]);

    return {
      total,
      unacknowledged,
      critical,
      lowStock,
      overstock,
      expiring,
      expired
    };
  };

  return {
    alerts,
    loading,
    error,
    create,
    update,
    remove,
    findById,
    findByQuery,
    count,
    refresh,
    // Specialized methods
    findUnacknowledgedAlerts,
    findAlertsByType,
    findAlertsByItem,
    findAlertsByWarehouse,
    findCriticalAlerts,
    findExpiryAlerts,
    acknowledgeAlert,
    acknowledgeMultipleAlerts,
    getAlertCounts
  };
};
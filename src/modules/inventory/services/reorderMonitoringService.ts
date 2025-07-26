import { InvItemType, InvStockLevelType, InvStockAlertType } from '../data/types';
import { useStockLevelData } from '../data/useStockLevelData';
import { useStockAlertData } from '../data/useStockAlertData';
import { useItemData } from '../data/useItemData';

export interface ReorderAlert {
  item_id: string;
  item_name: string;
  current_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  suggested_order_quantity: number;
  alert_type: 'LOW_STOCK' | 'REORDER_REQUIRED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ReorderMonitoringResult {
  alerts: ReorderAlert[];
  items_below_reorder_point: number;
  total_items_monitored: number;
  last_check: Date;
}

/**
 * Service for monitoring stock levels and generating automated reorder alerts
 */
export class ReorderMonitoringService {
  private stockLevelHook: ReturnType<typeof useStockLevelData>;
  private stockAlertHook: ReturnType<typeof useStockAlertData>;
  private itemHook: ReturnType<typeof useItemData>;

  constructor() {
    this.stockLevelHook = useStockLevelData();
    this.stockAlertHook = useStockAlertData();
    this.itemHook = useItemData();
  }

  /**
   * Check all items for reorder requirements and generate alerts
   */
  async checkReorderRequirements(): Promise<ReorderMonitoringResult> {
    try {
      // Get all items with reorder points configured
      const items = await this.itemHook.getItems();
      const itemsWithReorderPoints = items.filter(
        (item: InvItemType) => item.reorder_point !== null && item.reorder_point !== undefined
      );

      // Get current stock levels for these items
      const stockLevels = await this.stockLevelHook.getStockLevels();
      const stockLevelMap = new Map<string, InvStockLevelType>();
      stockLevels.forEach((level: InvStockLevelType) => {
        stockLevelMap.set(level.item_id, level);
      });

      const alerts: ReorderAlert[] = [];
      let itemsBelowReorderPoint = 0;

      // Check each item against its reorder point
      for (const item of itemsWithReorderPoints) {
        const stockLevel = stockLevelMap.get(item.id);
        if (!stockLevel) continue;

        const currentStock = stockLevel.quantity_on_hand || 0;
        const reorderPoint = item.reorder_point || 0;
        const reorderQuantity = item.reorder_quantity || 0;

        if (currentStock <= reorderPoint) {
          itemsBelowReorderPoint++;

          // Calculate suggested order quantity
          const suggestedQuantity = this.calculateSuggestedOrderQuantity(
            item,
            stockLevel,
            currentStock
          );

          // Determine alert priority
          const priority = this.determineAlertPriority(currentStock, reorderPoint);

          const alert: ReorderAlert = {
            item_id: item.id,
            item_name: item.name,
            current_stock: currentStock,
            reorder_point: reorderPoint,
            reorder_quantity: reorderQuantity,
            suggested_order_quantity: suggestedQuantity,
            alert_type: currentStock === 0 ? 'REORDER_REQUIRED' : 'LOW_STOCK',
            priority
          };

          alerts.push(alert);

          // Create or update stock alert in the database
          await this.createStockAlert(alert);
        }
      }

      return {
        alerts,
        items_below_reorder_point: itemsBelowReorderPoint,
        total_items_monitored: itemsWithReorderPoints.length,
        last_check: new Date()
      };
    } catch (error) {
      console.error('Error checking reorder requirements:', error);
      throw error;
    }
  }

  /**
   * Calculate suggested order quantity based on reorder quantity and stock levels
   */
  private calculateSuggestedOrderQuantity(
    item: InvItemType,
    stockLevel: InvStockLevelType,
    currentStock: number
  ): number {
    const reorderQuantity = item.reorder_quantity || 0;
    const maxStockLevel = item.max_stock_level || 0;

    if (reorderQuantity > 0) {
      return reorderQuantity;
    }

    // If no reorder quantity is set, calculate based on max stock level
    if (maxStockLevel > 0) {
      return Math.max(maxStockLevel - currentStock, 1);
    }

    // Default to a reasonable quantity if no parameters are set
    const reorderPoint = item.reorder_point || 0;
    return Math.max(reorderPoint * 2, 10);
  }

  /**
   * Determine alert priority based on how far below reorder point the stock is
   */
  private determineAlertPriority(
    currentStock: number,
    reorderPoint: number
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (currentStock === 0) {
      return 'HIGH';
    }

    const percentageBelow = ((reorderPoint - currentStock) / reorderPoint) * 100;

    if (percentageBelow >= 50) {
      return 'HIGH';
    } else if (percentageBelow >= 25) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Create a stock alert in the database
   */
  private async createStockAlert(alert: ReorderAlert): Promise<void> {
    try {
      // Check if an alert already exists for this item
      const existingAlerts = await this.stockAlertHook.getStockAlerts();
      const existingAlert = existingAlerts.find(
        (existing: InvStockAlertType) => 
          existing.item_id === alert.item_id && 
          existing.alert_type === alert.alert_type &&
          existing.status === 'ACTIVE'
      );

      if (existingAlert) {
        // Update existing alert
        await this.stockAlertHook.updateStockAlert(existingAlert.id, {
          ...existingAlert,
          message: `Stock level (${alert.current_stock}) is below reorder point (${alert.reorder_point}). Suggested order: ${alert.suggested_order_quantity} units.`,
          priority: alert.priority,
          updated_at: new Date().toISOString()
        });
      } else {
        // Create new alert
        const newAlert: Partial<InvStockAlertType> = {
          item_id: alert.item_id,
          alert_type: alert.alert_type,
          message: `Stock level (${alert.current_stock}) is below reorder point (${alert.reorder_point}). Suggested order: ${alert.suggested_order_quantity} units.`,
          priority: alert.priority,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await this.stockAlertHook.createStockAlert(newAlert);
      }
    } catch (error) {
      console.error('Error creating stock alert:', error);
      throw error;
    }
  }

  /**
   * Get all active reorder alerts
   */
  async getActiveReorderAlerts(): Promise<ReorderAlert[]> {
    try {
      const stockAlerts = await this.stockAlertHook.getStockAlerts();
      const reorderAlerts = stockAlerts.filter(
        (alert: InvStockAlertType) => 
          (alert.alert_type === 'LOW_STOCK' || alert.alert_type === 'REORDER_REQUIRED') &&
          alert.status === 'ACTIVE'
      );

      const alerts: ReorderAlert[] = [];
      const items = await this.itemHook.getItems();
      const itemMap = new Map<string, InvItemType>();
      items.forEach((item: InvItemType) => {
        itemMap.set(item.id, item);
      });

      const stockLevels = await this.stockLevelHook.getStockLevels();
      const stockLevelMap = new Map<string, InvStockLevelType>();
      stockLevels.forEach((level: InvStockLevelType) => {
        stockLevelMap.set(level.item_id, level);
      });

      for (const alert of reorderAlerts) {
        const item = itemMap.get(alert.item_id);
        const stockLevel = stockLevelMap.get(alert.item_id);
        
        if (item && stockLevel) {
          alerts.push({
            item_id: item.id,
            item_name: item.name,
            current_stock: stockLevel.quantity_on_hand || 0,
            reorder_point: item.reorder_point || 0,
            reorder_quantity: item.reorder_quantity || 0,
            suggested_order_quantity: item.reorder_quantity || 0,
            alert_type: alert.alert_type as 'LOW_STOCK' | 'REORDER_REQUIRED',
            priority: alert.priority as 'HIGH' | 'MEDIUM' | 'LOW'
          });
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error getting active reorder alerts:', error);
      throw error;
    }
  }

  /**
   * Dismiss a reorder alert
   */
  async dismissReorderAlert(itemId: string): Promise<void> {
    try {
      const stockAlerts = await this.stockAlertHook.getStockAlerts();
      const alertToUpdate = stockAlerts.find(
        (alert: InvStockAlertType) => 
          alert.item_id === itemId && 
          (alert.alert_type === 'LOW_STOCK' || alert.alert_type === 'REORDER_REQUIRED') &&
          alert.status === 'ACTIVE'
      );

      if (alertToUpdate) {
        await this.stockAlertHook.updateStockAlert(alertToUpdate.id, {
          ...alertToUpdate,
          status: 'DISMISSED',
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error dismissing reorder alert:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const reorderMonitoringService = new ReorderMonitoringService();
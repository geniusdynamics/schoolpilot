import { InvItemType, InvStockLevelType, InvStockAlertType } from '../data/types';

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
 * Calculate suggested order quantity based on reorder quantity and stock levels
 */
function calculateSuggestedOrderQuantity(
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
function determineAlertPriority(
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
 * Check items for reorder requirements
 */
export function checkReorderRequirements(
  items: InvItemType[],
  stockLevels: InvStockLevelType[]
): ReorderMonitoringResult {
  try {
    // Get all items with reorder points configured
    const itemsWithReorderPoints = items.filter(
      (item: InvItemType) => item.reorder_point !== null && item.reorder_point !== undefined
    );

    // Get current stock levels for these items
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
        const suggestedQuantity = calculateSuggestedOrderQuantity(
          item,
          stockLevel,
          currentStock
        );

        // Determine alert priority
        const priority = determineAlertPriority(currentStock, reorderPoint);

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


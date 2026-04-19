// ABOUTME: Register inventory module services with the service registry

import { serviceRegistry } from '@/core/ServiceRegistry';
import { StockLevelService } from './StockLevelService';

export const registerInventoryServices = () => {
  // StockLevelService - replaces trg_inv_updateStockLevel trigger
  // Note: StockLevelService requires dependency injection at runtime,
  // so we register a factory that creates a new instance each time
  // (the actual dependencies are provided via hooks/useStockLevelService)
  serviceRegistry.register({
    name: 'StockLevelService',
    moduleId: 'inventory',
    factory: () => StockLevelService,
    singleton: true
  });
};

import { logger } from '@/utils/logging';

// ABOUTME: Finance module lifecycle implementation for service registration

import { registerFinanceServices } from './services/registerServices';

/**
 * Finance module registration hook
 * Called when the finance module is registered with the module registry
 */
export async function onFinanceModuleRegister() {
  logger.info('[Finance] Module registered');
}

/**
 * Finance module enable hook
 * Called when the finance module is enabled
 * Registers finance services with the service registry
 */
export async function onFinanceModuleEnable() {
  logger.info('[Finance] Module enabled - registering services');
  registerFinanceServices();
}

/**
 * Finance module disable hook
 * Called when the finance module is disabled
 * Unregisters finance services from the service registry
 */
export async function onFinanceModuleDisable() {
  logger.info('[Finance] Module disabled - unregistering services');
  // Note: ServiceRegistry doesn't have unregister method yet
  // This is a placeholder for future implementation
}

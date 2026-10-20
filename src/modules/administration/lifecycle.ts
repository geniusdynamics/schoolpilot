import { logger } from '@/utils/logging';

// ABOUTME: Administration module lifecycle implementation for service registration

import { registerAdministrationServices } from './services/registerServices';

/**
 * Administration module registration hook
 * Called when the administration module is registered with the module registry
 */
export async function onAdministrationModuleRegister() {
  logger.info('[Administration] Module registered');
}

/**
 * Administration module enable hook
 * Called when the administration module is enabled
 * Registers administration services with the service registry
 */
export async function onAdministrationModuleEnable() {
  logger.info('[Administration] Module enabled - registering services');
  registerAdministrationServices();
}

/**
 * Administration module disable hook
 * Called when the administration module is disabled
 * Unregisters administration services from the service registry
 */
export async function onAdministrationModuleDisable() {
  logger.info('[Administration] Module disabled - unregistering services');
  // Note: ServiceRegistry doesn't have unregister method yet
  // This is a placeholder for future implementation
}

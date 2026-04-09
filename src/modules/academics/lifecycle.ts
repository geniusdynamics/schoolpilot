// ABOUTME: Academics module lifecycle implementation for service registration

import { registerAcademicsServices } from './services/registerServices';

/**
 * Academics module registration hook
 * Called when the academics module is registered with the module registry
 */
export async function onAcademicsModuleRegister() {
  console.log('[Academics] Module registered');
}

/**
 * Academics module enable hook
 * Called when the academics module is enabled
 * Registers academics services with the service registry
 */
export async function onAcademicsModuleEnable() {
  console.log('[Academics] Module enabled - registering services');
  // Get education system config from module config or app settings
  const educationSystemConfig = {}; // TODO: Load from appropriate source
  registerAcademicsServices(educationSystemConfig);
}

/**
 * Academics module disable hook
 * Called when the academics module is disabled
 * Unregisters academics services from the service registry
 */
export async function onAcademicsModuleDisable() {
  console.log('[Academics] Module disabled - unregistering services');
  // Note: ServiceRegistry doesn't have unregister method yet
  // This is a placeholder for future implementation
}

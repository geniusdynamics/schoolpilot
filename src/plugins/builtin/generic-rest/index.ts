import { logger } from '@/utils/logging';

/**
 * Generic REST API Integration Plugin
 * 
 * Highly configurable plugin for connecting to any REST API
 * with custom endpoints, authentication, and field mappings.
 */

import type { PluginManifest, PluginModule, PluginContext } from '@/plugins/types';
import { GenericRESTProvider } from './GenericRESTProvider';
import { BackendProviderRegistry } from '@/services/backend/BackendProviderRegistry';
import manifest from './plugin.json';

const module: PluginModule = {
  async activate(context: PluginContext) {
    logger.info('[Generic REST Plugin] Activating...');
    
    try {
      const settings = context.settings || {};
      
      // Check if configured
      if (!settings.baseUrl || !settings.entityEndpoints) {
        logger.info('[Generic REST Plugin] No configuration found - plugin enabled but not configured');
        
        context.api.showNotification(
          'Generic REST plugin enabled. Please configure your API settings.',
          'info'
        );
        
        return;
      }
      
      const registry = BackendProviderRegistry.getInstance();
      const provider = new GenericRESTProvider();
      
      const config = {
        id: 'generic-rest',
        name: 'Generic REST API',
        type: 'generic-json-api' as const,
        baseUrl: settings.baseUrl,
        timeout: settings.timeout || 30000,
        auth: {
          type: settings.authType || 'apikey',
          apiKey: settings.apiKey,
          token: settings.bearerToken,
          username: settings.username,
          password: settings.password,
        },
        sync: {
          enabled: false,
          interval: 0,
          conflictResolution: 'remote-wins' as const,
          bidirectional: false,
        },
        generic: {
          apiKeyHeader: settings.apiKeyHeader || 'X-API-Key',
          customHeaders: settings.customHeaders,
          entityEndpoints: settings.entityEndpoints,
          fieldMappings: settings.fieldMappings,
          responseDataPath: settings.responseDataPath || 'data',
          paginationStyle: settings.paginationStyle || 'offset',
          paginationParams: settings.paginationParams,
          filterStyle: settings.filterStyle || 'query',
          retryAttempts: settings.retryAttempts || 3,
          enableCache: settings.enableCache ?? true,
          cacheTimeout: settings.cacheTimeout || 300,
        },
      };
      
      await provider.initialize(config);
      
      registry.register(provider, {
        id: 'generic-rest',
        name: 'Generic REST API',
        type: 'generic-json-api',
        description: 'Configurable REST API integration with custom endpoints and mappings',
        version: '1.0.0',
        factory: () => provider,
        configSchema: manifest.settings,
      });
      
      logger.info('[Generic REST Plugin] Activated successfully');
      
      context.api.showNotification(
        'Generic REST API integration activated',
        'success'
      );
    } catch (error) {
      logger.error('[Generic REST Plugin] Activation failed:', error);
      context.api.showNotification(
        `Generic REST activation failed: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      throw error;
    }
  },
  
  async deactivate(context: PluginContext) {
    logger.info('[Generic REST Plugin] Deactivating...');
    
    try {
      const registry = BackendProviderRegistry.getInstance();
      await registry.unregister('generic-rest');
      
      context.api.showNotification(
        'Generic REST API integration deactivated',
        'info'
      );
    } catch (error) {
      logger.error('[Generic REST Plugin] Deactivation failed:', error);
    }
  },
};

export { manifest, module };
export default { manifest, module };

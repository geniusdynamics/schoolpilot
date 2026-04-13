/**
 * SaaS Backend Integration Plugin
 * 
 * Provides integration with SchoolPilot's custom Go SaaS backend
 * with support for REST, GraphQL, and WebSocket APIs.
 */

import type { PluginManifest, PluginModule, PluginContext } from '@/plugins/types';
import { SaaSBackendProvider } from './SaaSBackendProvider';
import { BackendProviderRegistry } from '@/services/backend/BackendProviderRegistry';
import manifest from './plugin.json';

const module: PluginModule = {
  async activate(context: PluginContext) {
    console.log('[SaaS Backend Plugin] Activating...');
    
    try {
      const settings = context.settings || {};
      
      // Check if configured
      if (!settings.apiUrl || !settings.clientId || !settings.clientSecret || !settings.tenantId) {
        console.log('[SaaS Backend Plugin] No configuration found - plugin enabled but not configured');
        
        context.api.showNotification(
          'SaaS Backend plugin enabled. Please configure your API settings.',
          'info'
        );
        
        return;
      }
      
      const registry = BackendProviderRegistry.getInstance();
      const provider = new SaaSBackendProvider();
      
      const config = {
        id: 'saas-backend',
        name: 'SchoolPilot SaaS Backend',
        type: 'saas-api' as const,
        baseUrl: settings.apiUrl,
        timeout: settings.timeout || 30000,
        auth: {
          type: settings.authType || 'jwt',
          clientId: settings.clientId,
          clientSecret: settings.clientSecret,
        },
        sync: {
          enabled: true,
          interval: settings.syncInterval || 300,
          conflictResolution: settings.conflictResolution || 'remote-wins',
          bidirectional: true,
        },
        saas: {
          graphqlUrl: settings.graphqlUrl,
          tenantId: settings.tenantId,
          apiVersion: settings.apiVersion || 'v1',
          useGraphQL: settings.useGraphQL ?? true,
          enableWebSocket: settings.enableWebSocket ?? true,
          wsUrl: settings.wsUrl,
          enableCache: settings.enableCache ?? true,
          cacheTimeout: settings.cacheTimeout || 300,
          enableCompression: settings.enableCompression ?? true,
          retryAttempts: settings.retryAttempts || 3,
        },
      };
      
      await provider.initialize(config);
      
      registry.register(provider, {
        id: 'saas-backend',
        name: 'SchoolPilot SaaS Backend',
        type: 'saas-api',
        description: 'Custom Go SaaS backend with REST, GraphQL, and WebSocket support',
        version: '1.0.0',
        factory: () => provider,
        configSchema: manifest.settings,
      });
      
      console.log('[SaaS Backend Plugin] Activated successfully');
      
      context.api.showNotification(
        'SaaS Backend integration activated',
        'success'
      );
    } catch (error) {
      console.error('[SaaS Backend Plugin] Activation failed:', error);
      context.api.showNotification(
        `SaaS Backend activation failed: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      throw error;
    }
  },
  
  async deactivate(context: PluginContext) {
    console.log('[SaaS Backend Plugin] Deactivating...');
    
    try {
      const registry = BackendProviderRegistry.getInstance();
      await registry.unregister('saas-backend');
      
      context.api.showNotification(
        'SaaS Backend integration deactivated',
        'info'
      );
    } catch (error) {
      console.error('[SaaS Backend Plugin] Deactivation failed:', error);
    }
  },
};

export { manifest, module };
export default { manifest, module };

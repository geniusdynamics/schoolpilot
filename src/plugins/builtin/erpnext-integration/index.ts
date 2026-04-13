/**
 * ERPNext Integration Plugin
 * 
 * Provides backend integration with ERPNext for education management.
 */

import type { PluginManifest, PluginModule, PluginContext } from '@/plugins/types';
import { ERPNextProvider } from './ERPNextProvider';
import { BackendProviderRegistry } from '@/services/backend/BackendProviderRegistry';
import manifest from './plugin.json';

const module: PluginModule = {
  async activate(context: PluginContext) {
    console.log('[ERPNext Plugin] Activating...');
    
    try {
      // Get settings with defaults
      const settings = context.settings || {};
      
      // Check if this is first activation (no settings configured)
      if (!settings.baseUrl || !settings.apiKey || !settings.apiSecret) {
        console.log('[ERPNext Plugin] No configuration found - plugin enabled but not configured');
        
        // Show notification to configure
        context.api.showNotification(
          'ERPNext plugin enabled. Please configure your ERPNext server settings.',
          'info'
        );
        
        // Plugin is active but not functional until configured
        return;
      }
      
      // Get backend provider registry
      const registry = BackendProviderRegistry.getInstance();
      
      // Create ERPNext provider instance
      const provider = new ERPNextProvider();
      
      // Initialize with plugin settings
      const config = {
        id: 'erpnext',
        name: 'ERPNext',
        type: 'erpnext' as const,
        baseUrl: settings.baseUrl,
        version: '14',
        timeout: settings.timeout || 30000,
        auth: {
          type: 'apikey' as const,
          apiKey: settings.apiKey,
          apiSecret: settings.apiSecret,
        },
        sync: {
          enabled: true,
          interval: settings.syncInterval || 300,
          conflictResolution: settings.conflictResolution || 'timestamp-wins',
          bidirectional: settings.syncDirection === 'bidirectional',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      await provider.initialize(config);
      
      // Register provider with metadata
      registry.register(provider, {
        id: 'erpnext',
        name: 'ERPNext',
        type: 'erpnext',
        description: 'ERPNext Education Management System',
        version: '1.0.0',
        factory: () => provider,
        configSchema: manifest.settings,
      });
      
      console.log('[ERPNext Plugin] Provider registered successfully');
      
      // Register hooks
      context.api.addHook('backend.provider.register', () => {
        return { providerId: 'erpnext', provider };
      });
      
      // Sync hooks
      context.api.addHook('sync.before', async (entity: string) => {
        console.log(`[ERPNext Plugin] Starting sync for ${entity}`);
      });
      
      context.api.addHook('sync.after', async (entity: string, result: any) => {
        console.log(`[ERPNext Plugin] Sync completed for ${entity}:`, result);
      });
      
      console.log('[ERPNext Plugin] Activated successfully');
      
      // Show success notification
      context.api.showNotification(
        'ERPNext integration activated successfully',
        'success'
      );
    } catch (error) {
      console.error('[ERPNext Plugin] Activation failed:', error);
      context.api.showNotification(
        `ERPNext activation failed: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      throw error;
    }
  },
  
  async deactivate(context: PluginContext) {
    console.log('[ERPNext Plugin] Deactivating...');
    
    try {
      const registry = BackendProviderRegistry.getInstance();
      
      // Unregister provider
      await registry.unregister('erpnext');
      
      console.log('[ERPNext Plugin] Deactivated successfully');
      
      context.api.showNotification(
        'ERPNext integration deactivated',
        'info'
      );
    } catch (error) {
      console.error('[ERPNext Plugin] Deactivation failed:', error);
    }
  },
};

export { manifest, module };
export default { manifest, module };

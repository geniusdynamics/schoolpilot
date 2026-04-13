/**
 * Frappe Integration Plugin
 * 
 * Provides backend integration with Frappe Framework using the official
 * Frappe React SDK for optimized React hooks and real-time updates.
 */

import type { PluginManifest, PluginModule, PluginContext } from '@/plugins/types';
import { FrappeProvider } from './FrappeProvider';
import { BackendProviderRegistry } from '@/services/backend/BackendProviderRegistry';
import manifest from './plugin.json';

const module: PluginModule = {
  async activate(context: PluginContext) {
    console.log('[Frappe Plugin] Activating...');
    
    try {
      // Get settings with defaults
      const settings = context.settings || {};
      
      // Check if this is first activation (no settings configured)
      if (!settings.siteUrl || !settings.apiKey || !settings.apiSecret) {
        console.log('[Frappe Plugin] No configuration found - plugin enabled but not configured');
        
        // Show notification to configure
        context.api.showNotification(
          'Frappe plugin enabled. Please configure your Frappe site settings.',
          'info'
        );
        
        // Plugin is active but not functional until configured
        return;
      }
      
      // Get backend provider registry
      const registry = BackendProviderRegistry.getInstance();
      
      // Create Frappe provider instance
      const provider = new FrappeProvider();
      
      // Initialize with plugin settings
      const config = {
        id: 'frappe',
        name: 'Frappe',
        type: 'frappe' as const,
        baseUrl: settings.siteUrl,
        version: '14',
        timeout: settings.timeout || 30000,
        auth: {
          type: settings.authType || 'token',
          apiKey: settings.apiKey,
          apiSecret: settings.apiSecret,
        },
        sync: {
          enabled: true,
          interval: settings.syncInterval || 300,
          conflictResolution: settings.conflictResolution || 'timestamp-wins',
          bidirectional: true,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        // Frappe-specific config
        frappe: {
          enableSocketIO: settings.enableSocketIO ?? true,
          socketPort: settings.socketPort || 9000,
          enableCache: settings.enableCache ?? true,
          cacheTimeout: settings.cacheTimeout || 300,
          batchSize: settings.batchSize || 100,
        },
      };
      
      await provider.initialize(config);
      
      // Register provider with metadata
      registry.register(provider, {
        id: 'frappe',
        name: 'Frappe Framework',
        type: 'frappe',
        description: 'Official Frappe React SDK integration with real-time updates',
        version: '1.0.0',
        factory: () => provider,
        configSchema: manifest.settings,
      });
      
      console.log('[Frappe Plugin] Provider registered successfully');
      
      // Register hooks
      context.api.addHook('backend.provider.register', () => {
        return { providerId: 'frappe', provider };
      });
      
      // Real-time update hook
      if (config.frappe.enableSocketIO) {
        context.api.addHook('realtime.document.update', async (doctype: string, docname: string) => {
          console.log(`[Frappe Plugin] Real-time update: ${doctype} ${docname}`);
          // Trigger re-fetch in components using the SDK hooks
        });
      }
      
      // Sync hooks
      context.api.addHook('sync.before', async (entity: string) => {
        console.log(`[Frappe Plugin] Starting sync for ${entity}`);
      });
      
      context.api.addHook('sync.after', async (entity: string, result: any) => {
        console.log(`[Frappe Plugin] Sync completed for ${entity}:`, result);
      });
      
      console.log('[Frappe Plugin] Activated successfully');
      
      // Show success notification
      context.api.showNotification(
        'Frappe integration activated with real-time updates',
        'success'
      );
    } catch (error) {
      console.error('[Frappe Plugin] Activation failed:', error);
      context.api.showNotification(
        `Frappe activation failed: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      throw error;
    }
  },
  
  async deactivate(context: PluginContext) {
    console.log('[Frappe Plugin] Deactivating...');
    
    try {
      const registry = BackendProviderRegistry.getInstance();
      
      // Unregister provider
      await registry.unregister('frappe');
      
      console.log('[Frappe Plugin] Deactivated successfully');
      
      context.api.showNotification(
        'Frappe integration deactivated',
        'info'
      );
    } catch (error) {
      console.error('[Frappe Plugin] Deactivation failed:', error);
    }
  },
};

export { manifest, module };
export default { manifest, module };

// Export hooks for use in components
export * from './hooks';

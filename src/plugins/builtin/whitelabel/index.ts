import { logger } from '@/utils/logging';

/**
 * White-Label Plugin
 * 
 * Built-in plugin for branding customization and UI label overrides.
 * Allows schools to customize application name, logo, colors, and labels.
 */

import type { PluginManifest, PluginModule, PluginContext } from '../../types';
import { getEntitlements } from '../../../services/plugin/FeatureEntitlements';

// ============================================================================
// Types
// ============================================================================

export interface WhiteLabelSettings {
  enabled: boolean;
  appName?: string;
  tagline?: string;
  logoLight?: string;
  logoDark?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  labelOverrides?: Record<string, string>;
  hidePoweredBy?: boolean;
  customFooter?: string;
  hideModules?: string[];
  hideMenuItems?: string[];
}

export interface BrandingState {
  appName: string;
  tagline: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  hidePoweredBy: boolean;
  customFooter: string | null;
}

// ============================================================================
// Manifest
// ============================================================================

export const manifest: PluginManifest = {
  id: 'builtin-whitelabel',
  name: 'White-Label Branding',
  version: '1.0.0',
  type: 'whitelabel',
  category: 'builtin',
  entry: './index.ts',
  description: 'Customize application branding including name, logo, colors, and UI labels',
  author: 'SchoolPilot3 Team',
  license: 'MIT',
  
  hooks: [
    'ui.branding.header',
    'ui.branding.title',
    'ui.branding.logo',
    'ui.branding.colors',
    'ui.label.resolve',
    'ui.menu.beforeRender',
    'ui.footer.render',
  ],
  
  settings: [
    {
      key: 'enabled',
      label: 'Enable White-Labeling',
      type: 'boolean',
      defaultValue: false,
      description: 'Enable custom branding for this instance',
    },
    {
      key: 'appName',
      label: 'Application Name',
      type: 'string',
      description: 'Custom name displayed in header and browser title',
      validation: { max: 50 },
    },
    {
      key: 'tagline',
      label: 'Tagline',
      type: 'string',
      description: 'Optional tagline displayed below app name',
      validation: { max: 100 },
    },
    {
      key: 'logoLight',
      label: 'Logo (Light Theme)',
      type: 'file',
      description: 'Logo for light theme (PNG, SVG, max 500KB)',
    },
    {
      key: 'logoDark',
      label: 'Logo (Dark Theme)',
      type: 'file',
      description: 'Logo for dark theme (PNG, SVG, max 500KB)',
    },
    {
      key: 'favicon',
      label: 'Custom Favicon',
      type: 'file',
      description: 'Custom favicon (ICO, PNG, 32x32 or 64x64)',
    },
    {
      key: 'primaryColor',
      label: 'Primary Brand Color',
      type: 'color',
      defaultValue: '#6366f1',
      description: 'Primary color for buttons and accents',
    },
    {
      key: 'secondaryColor',
      label: 'Secondary Brand Color',
      type: 'color',
      defaultValue: '#10B981',
      description: 'Secondary color for highlights',
    },
    {
      key: 'accentColor',
      label: 'Accent Color',
      type: 'color',
      defaultValue: '#8B5CF6',
      description: 'Accent color for special elements',
    },
    {
      key: 'hidePoweredBy',
      label: 'Hide "Powered By" Footer',
      type: 'boolean',
      defaultValue: false,
      description: 'Remove SchoolPilot3 branding from footer',
    },
    {
      key: 'customFooter',
      label: 'Custom Footer Text',
      type: 'string',
      description: 'Custom text to display in footer',
      validation: { max: 200 },
    },
    {
      key: 'hideModules',
      label: 'Hidden Modules',
      type: 'multiselect',
      description: 'Modules to hide from navigation',
      options: [
        { label: 'Academics', value: 'academics' },
        { label: 'Administration', value: 'administration' },
        { label: 'Finance', value: 'finance' },
        { label: 'HR', value: 'hr' },
        { label: 'Inventory', value: 'inventory' },
        { label: 'Library', value: 'library' },
        { label: 'Nutrition', value: 'nutrition' },
        { label: 'Reports', value: 'reports' },
      ],
    },
    {
      key: 'labelOverrides',
      label: 'UI Label Overrides',
      type: 'json',
      description: 'JSON object mapping original labels to custom labels',
      defaultValue: {},
    },
  ],
};

// ============================================================================
// Plugin Module
// ============================================================================

const module: PluginModule = {
  async activate(context: PluginContext) {
    logger.info('[WhiteLabel Plugin] Activating...');

    // Check entitlements
    const entitlements = getEntitlements();
    const whiteLabelCheck = entitlements.canUseWhiteLabel();

    if (!whiteLabelCheck.available) {
      logger.warn('[WhiteLabel Plugin] Feature not entitled:', whiteLabelCheck.reason);
      
      // Register a hook that shows upgrade prompt when settings are accessed
      context.api.addHook('ui.branding.header', (defaultBranding: any) => {
        // Return default branding + upgrade hint
        return {
          ...defaultBranding,
          _upgradeRequired: true,
          _upgradeReason: whiteLabelCheck.reason,
          _upgradeTier: whiteLabelCheck.upgradeRequired,
        };
      }, 10);

      // Emit activation failed event
      context.api.showNotification(
        'White-labeling requires a paid plan. Upgrade to enable branding customization.',
        'warning'
      );
      
      return; // Don't register other hooks
    }

    logger.info('[WhiteLabel Plugin] Entitlement verified, tier:', whiteLabelCheck.tier);

    // Check if full features are available (enterprise/reseller)
    const hasFullFeatures = entitlements.hasFeature('whitelabel-full');

    // Register branding hooks
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context.api.addHook('ui.branding.header', (_defaultBranding: any) => {
      return getBrandingState(context);
    }, 10);

    context.api.addHook('ui.branding.title', (defaultTitle: string) => {
      const enabled = context.api.getSetting('enabled');
      if (!enabled) return defaultTitle;
      return context.api.getSetting('appName') || defaultTitle;
    }, 10);

    context.api.addHook('ui.branding.logo', (theme: 'light' | 'dark') => {
      const enabled = context.api.getSetting('enabled');
      if (!enabled) return null;
      return theme === 'dark' 
        ? context.api.getSetting('logoDark') 
        : context.api.getSetting('logoLight');
    }, 10);

    context.api.addHook('ui.branding.colors', () => {
      const enabled = context.api.getSetting('enabled');
      if (!enabled) return null;
      
      // Basic tier: only primary color
      // Full tier: all colors
      return {
        primary: context.api.getSetting('primaryColor'),
        secondary: hasFullFeatures ? context.api.getSetting('secondaryColor') : undefined,
        accent: hasFullFeatures ? context.api.getSetting('accentColor') : undefined,
      };
    }, 10);

    // Label overrides - Full tier only
    if (hasFullFeatures) {
      context.api.addHook('ui.label.resolve', (key: string, defaultLabel: string) => {
        const enabled = context.api.getSetting('enabled');
        if (!enabled) return defaultLabel;
        const overrides = context.api.getSetting('labelOverrides') || {};
        return overrides[key] || defaultLabel;
      }, 10);

      context.api.addHook('ui.menu.beforeRender', (menuItems: any[]) => {
        const enabled = context.api.getSetting('enabled');
        if (!enabled) return menuItems;
        
        const hideMenuItems = context.api.getSetting('hideMenuItems') || [];
        return menuItems.filter(item => !hideMenuItems.includes(item.id));
      }, 10);
    }

    // Hide "Powered By" - Full tier only
    context.api.addHook('ui.footer.render', () => {
      const enabled = context.api.getSetting('enabled');
      if (!enabled) return null;
      
      const customFooter = hasFullFeatures ? context.api.getSetting('customFooter') : undefined;
      const hidePoweredBy = hasFullFeatures ? context.api.getSetting('hidePoweredBy') : false;
      
      return {
        customText: customFooter,
        hidePoweredBy,
      };
    }, 10);

    logger.info('[WhiteLabel Plugin] Activated successfully');
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deactivate(_context: PluginContext) {
    logger.info('[WhiteLabel Plugin] Deactivated');
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function getBrandingState(context: PluginContext): BrandingState {
  const enabled = context.api.getSetting('enabled');
  
  return {
    appName: enabled ? (context.api.getSetting('appName') || 'SchoolPilot3') : 'SchoolPilot3',
    tagline: enabled ? (context.api.getSetting('tagline') || '') : '',
    logo: enabled ? context.api.getSetting('logoLight') : null,
    primaryColor: enabled ? (context.api.getSetting('primaryColor') || '#6366f1') : '#6366f1',
    secondaryColor: enabled ? (context.api.getSetting('secondaryColor') || '#10B981') : '#10B981',
    accentColor: enabled ? (context.api.getSetting('accentColor') || '#8B5CF6') : '#8B5CF6',
    hidePoweredBy: enabled ? (context.api.getSetting('hidePoweredBy') || false) : false,
    customFooter: enabled ? context.api.getSetting('customFooter') : null,
  };
}

// ============================================================================
// React Hooks (for use in components)
// ============================================================================

/**
 * Hook to get current branding state
 * This would be imported by components that need branding info
 */
export function createWhiteLabelHook(getPlugin: (id: string) => any, doHook: (name: string, ...args: any[]) => any[]) {
  return function useWhiteLabel(defaultAppName: string = 'SchoolPilot3'): BrandingState {
    const plugin = getPlugin('builtin-whitelabel');
    
    if (!plugin || plugin.status !== 'active') {
      return {
        appName: defaultAppName,
        tagline: '',
        logo: null,
        primaryColor: '#6366f1',
        secondaryColor: '#10B981',
        accentColor: '#8B5CF6',
        hidePoweredBy: false,
        customFooter: null,
      };
    }

    const results = doHook('ui.branding.header', {});
    return results[0] || getBrandingStateFromDefaults(defaultAppName);
  };
}

function getBrandingStateFromDefaults(defaultAppName: string): BrandingState {
  return {
    appName: defaultAppName,
    tagline: '',
    logo: null,
    primaryColor: '#6366f1',
    secondaryColor: '#10B981',
    accentColor: '#8B5CF6',
    hidePoweredBy: false,
    customFooter: null,
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  manifest,
  module,
};

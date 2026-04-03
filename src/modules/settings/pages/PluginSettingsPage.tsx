/**
 * Plugin Management Page
 * 
 * Settings page for managing plugins, viewing marketplace, and configuring
 * admin settings for plugin loading and marketplace access.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PuzzlePieceIcon,
  CloudArrowDownIcon,
  CogIcon,
  ShieldCheckIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { usePlugins } from '../../../plugins/usePlugins';
import type {
  LoadedPlugin,
  AdminPluginConfig,
  MarketplacePlugin,
} from '../../../plugins/types';

// ============================================================================
// Types
// ============================================================================

type TabType = 'installed' | 'marketplace' | 'settings';

interface PluginSettingsPageProps {
  onNavigate?: (path: string) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const PluginSettingsPage: React.FC<PluginSettingsPageProps> = () => {
  const { t } = useTranslation('settings');
  const { plugins, activePlugins, activatePlugin, deactivatePlugin, unloadPlugin } = usePlugins();
  
  const [activeTab, setActiveTab] = useState<TabType>('installed');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<LoadedPlugin | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [adminConfig, setAdminConfig] = useState<AdminPluginConfig | null>(null);
  const [marketplaceConnected, setMarketplaceConnected] = useState(false);

  // Load admin config
  useEffect(() => {
    const savedConfig = localStorage.getItem('plugin_admin_config');
    if (savedConfig) {
      setAdminConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Filter plugins
  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.manifest.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || plugin.manifest.type === filterType;
    return matchesSearch && matchesType;
  });

  // Handlers
  const handleActivate = useCallback(async (pluginId: string) => {
    setIsLoading(true);
    try {
      await activatePlugin(pluginId);
    } catch (error) {
      console.error('Failed to activate plugin:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activatePlugin]);

  const handleDeactivate = useCallback(async (pluginId: string) => {
    setIsLoading(true);
    try {
      await deactivatePlugin(pluginId);
    } catch (error) {
      console.error('Failed to deactivate plugin:', error);
    } finally {
      setIsLoading(false);
    }
  }, [deactivatePlugin]);

  const handleUninstall = useCallback(async (pluginId: string) => {
    if (!window.confirm(t('plugins.confirmUninstall'))) return;
    
    setIsLoading(true);
    try {
      await unloadPlugin(pluginId);
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    } finally {
      setIsLoading(false);
    }
  }, [unloadPlugin, t]);

  const handleAdminConfigChange = useCallback((key: string, value: any) => {
    setAdminConfig(prev => {
      const newConfig = {
        ...prev,
        pluginsEnabled: prev?.pluginsEnabled ?? true,
        marketplace: prev?.marketplace ?? { enabled: false, allowFreePlugins: true, allowPaidPlugins: false, requireApprovalForInstall: true },
        loading: prev?.loading ?? { allowLocalPlugins: true, allowUnsignedPlugins: false, allowedTypes: [], maxInstalledPlugins: 25 },
        security: prev?.security ?? { sandboxEnabled: true, networkWhitelist: [], permissionsPreset: 'balanced' },
        pluginOverrides: prev?.pluginOverrides ?? {},
        [key]: value,
      };
      localStorage.setItem('plugin_admin_config', JSON.stringify(newConfig));
      return newConfig;
    });
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <PuzzlePieceIcon className="h-8 w-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('plugins.title', 'Plugin Management')}
            </h1>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('plugins.description', 'Manage, install, and configure plugins to extend SchoolPilot3 functionality')}
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label={t('plugins.stats.total', 'Total Plugins')}
            value={plugins.length}
            icon={<PuzzlePieceIcon className="h-5 w-5" />}
          />
          <StatCard
            label={t('plugins.stats.active', 'Active')}
            value={activePlugins.length}
            icon={<CheckCircleIcon className="h-5 w-5 text-green-500" />}
          />
          <StatCard
            label={t('plugins.stats.inactive', 'Inactive')}
            value={plugins.length - activePlugins.length}
            icon={<StopIcon className="h-5 w-5 text-gray-400" />}
          />
          <StatCard
            label={t('plugins.stats.marketplace', 'Marketplace')}
            value={marketplaceConnected ? t('common.connected', 'Connected') : t('common.disconnected', 'Disconnected')}
            icon={<CloudArrowDownIcon className={marketplaceConnected ? 'text-green-500' : 'text-gray-400'} />}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <TabButton
                active={activeTab === 'installed'}
                onClick={() => setActiveTab('installed')}
                icon={<PuzzlePieceIcon className="h-5 w-5" />}
                label={t('plugins.tabs.installed', 'Installed')}
              />
              <TabButton
                active={activeTab === 'marketplace'}
                onClick={() => setActiveTab('marketplace')}
                icon={<CloudArrowDownIcon className="h-5 w-5" />}
                label={t('plugins.tabs.marketplace', 'Marketplace')}
              />
              <TabButton
                active={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
                icon={<CogIcon className="h-5 w-5" />}
                label={t('plugins.tabs.settings', 'Settings')}
              />
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'installed' && (
              <InstalledPluginsTab
                plugins={filteredPlugins}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterType={filterType}
                setFilterType={setFilterType}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                onUninstall={handleUninstall}
                onSelect={setSelectedPlugin}
                selectedPlugin={selectedPlugin}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'marketplace' && (
              <MarketplaceTab
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                connected={marketplaceConnected}
                onConnect={() => setMarketplaceConnected(true)}
                installedPlugins={plugins}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                config={adminConfig}
                onChange={handleAdminConfigChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
      <div className="text-gray-400 dark:text-gray-500">{icon}</div>
    </div>
  </div>
);

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
      ${active 
        ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}
    `}
  >
    {icon}
    {label}
  </button>
);

const InstalledPluginsTab: React.FC<{
  plugins: LoadedPlugin[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: string;
  setFilterType: (t: string) => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onUninstall: (id: string) => void;
  onSelect: (p: LoadedPlugin | null) => void;
  selectedPlugin: LoadedPlugin | null;
  isLoading: boolean;
}> = ({
  plugins,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  onActivate,
  onDeactivate,
  onUninstall,
  onSelect,
  selectedPlugin,
  isLoading,
}) => {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-6">
      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('plugins.searchPlaceholder', 'Search plugins by name or description...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">{t('plugins.filterAll', 'All Types')}</option>
          <option value="module">Modules</option>
          <option value="theme">Themes</option>
          <option value="integration">Integrations</option>
          <option value="whitelabel">White-Label</option>
          <option value="engine">Engines</option>
        </select>
      </div>

      {/* Plugin List */}
      <div className="space-y-3">
        {plugins.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <PuzzlePieceIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('plugins.noPlugins', 'No plugins installed')}</p>
          </div>
        ) : (
          plugins.map(plugin => (
            <PluginRow
              key={plugin.manifest.id}
              plugin={plugin}
              onActivate={() => onActivate(plugin.manifest.id)}
              onDeactivate={() => onDeactivate(plugin.manifest.id)}
              onUninstall={() => onUninstall(plugin.manifest.id)}
              onSelect={() => onSelect(plugin)}
              isLoading={isLoading}
            />
          ))
        )}
      </div>
    </div>
  );
};

const PluginRow: React.FC<{
  plugin: LoadedPlugin;
  onSelect: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onUninstall: () => void;
  isLoading: boolean;
}> = ({
  plugin,
  onSelect,
  onActivate,
  onDeactivate,
  onUninstall,
  isLoading,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0">
            {plugin.manifest.icon ? (
              <img src={plugin.manifest.icon} alt="" className="w-6 h-6" />
            ) : (
              <PuzzlePieceIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {plugin.manifest.name}
                  </h3>
                  {plugin.manifest.type && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize">
                      {plugin.manifest.type}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                  {plugin.manifest.id}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Config button */}
                {plugin.status === 'active' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelect(); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <CogIcon className="h-3.5 w-3.5" />
                    Config
                  </button>
                )}

                {/* Info button with dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Info"
                  >
                    <InformationCircleIcon className="h-4 w-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(); setShowDropdown(false); }}
                        className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <InformationCircleIcon className="h-4 w-4" />
                        Details
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDropdown(false); }}
                        className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        README
                      </button>
                      {plugin.source !== 'builtin' && (
                        <>
                          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                          <button
                            onClick={(e) => { e.stopPropagation(); onUninstall(); setShowDropdown(false); }}
                            className="w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <TrashIcon className="h-4 w-4" />
                            Uninstall
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* More options (three dots) */}
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>

                {/* Toggle Switch */}
                <select
                  value={plugin.status === 'active' ? 'on' : 'off'}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (e.target.value === 'on') {
                      onActivate();
                    } else {
                      onDeactivate();
                    }
                  }}
                  disabled={isLoading || plugin.status === 'error'}
                  className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md px-3 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="on">ON</option>
                  <option value="off">OFF</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {plugin.manifest.description || 'No description available'}
            </p>

            {/* Error message */}
            {plugin.error && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-xs text-red-600 dark:text-red-400">
                  <span className="font-semibold">Error:</span> {plugin.error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MarketplaceTab: React.FC<{
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  connected: boolean;
  onConnect: () => void;
  installedPlugins: LoadedPlugin[];
}> = ({ searchQuery, setSearchQuery, connected, onConnect }) => {
  const { t } = useTranslation('settings');

  if (!connected) {
    return (
      <div className="text-center py-12">
        <CloudArrowDownIcon className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('plugins.marketplace.connectTitle', 'Connect to Marketplace')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
          {t('plugins.marketplace.connectDescription', 'Enter your marketplace key to browse and install plugins from the SchoolPilot3 marketplace')}
        </p>
        <button
          onClick={onConnect}
          className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          {t('plugins.marketplace.connectButton', 'Connect Marketplace')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('plugins.marketplace.searchPlaceholder', 'Search marketplace...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {t('plugins.marketplace.comingSoon', 'Marketplace integration coming soon...')}
      </div>
    </div>
  );
};

const SettingsTab: React.FC<{
  config: AdminPluginConfig | null;
  onChange: (key: string, value: any) => void;
}> = ({ config, onChange }) => {
  const { t } = useTranslation('settings');

  if (!config) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {t('plugins.settings.noConfig', 'No admin configuration loaded')}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Master Switch */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">
            {t('plugins.settings.enablePlugins', 'Enable Plugin System')}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('plugins.settings.enablePluginsDesc', 'Master switch for the entire plugin system')}
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.pluginsEnabled}
            onChange={(e) => onChange('pluginsEnabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
        </label>
      </div>

      {/* Marketplace Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <CloudArrowDownIcon className="h-5 w-5" />
          {t('plugins.settings.marketplace', 'Marketplace Settings')}
        </h4>
        
        <div className="grid gap-4">
          <ToggleSetting
            label={t('plugins.settings.marketplaceEnabled', 'Enable Marketplace Access')}
            value={config.marketplace.enabled}
            onChange={(v) => onChange('marketplace', { ...config.marketplace, enabled: v })}
          />
          <ToggleSetting
            label={t('plugins.settings.allowFreePlugins', 'Allow Free Plugins')}
            value={config.marketplace.allowFreePlugins}
            onChange={(v) => onChange('marketplace', { ...config.marketplace, allowFreePlugins: v })}
          />
          <ToggleSetting
            label={t('plugins.settings.allowPaidPlugins', 'Allow Paid Plugins')}
            value={config.marketplace.allowPaidPlugins}
            onChange={(v) => onChange('marketplace', { ...config.marketplace, allowPaidPlugins: v })}
          />
        </div>
      </div>

      {/* Security Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheckIcon className="h-5 w-5" />
          {t('plugins.settings.security', 'Security Settings')}
        </h4>
        
        <div className="grid gap-4">
          <ToggleSetting
            label={t('plugins.settings.sandboxEnabled', 'Enable Plugin Sandbox')}
            value={config.security.sandboxEnabled}
            onChange={(v) => onChange('security', { ...config.security, sandboxEnabled: v })}
          />
          <ToggleSetting
            label={t('plugins.settings.allowLocalPlugins', 'Allow Local Plugins')}
            value={config.loading.allowLocalPlugins}
            onChange={(v) => onChange('loading', { ...config.loading, allowLocalPlugins: v })}
          />
          <ToggleSetting
            label={t('plugins.settings.allowUnsignedPlugins', 'Allow Unsigned Plugins (Dev Mode)')}
            value={config.loading.allowUnsignedPlugins}
            onChange={(v) => onChange('loading', { ...config.loading, allowUnsignedPlugins: v })}
          />
        </div>
      </div>
    </div>
  );
};

const ToggleSetting: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
    </label>
  </div>
);

export default PluginSettingsPage;

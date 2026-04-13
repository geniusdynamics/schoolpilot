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
import { usePlugins } from '@/plugins/usePlugins';
import { PluginsContext } from '@/plugins/PluginsProvider';
import type {
  LoadedPlugin,
  AdminPluginConfig,
  MarketplacePlugin,
} from '@/plugins/types';

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
                onSelectPlugin={setSelectedPlugin}
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

      {/* Plugin Details Modal */}
      {selectedPlugin && (
        <PluginDetailsPanel
          plugin={selectedPlugin}
          onClose={() => setSelectedPlugin(null)}
          onActivate={() => handleActivate(selectedPlugin.manifest.id)}
          onDeactivate={() => handleDeactivate(selectedPlugin.manifest.id)}
          onUninstall={() => handleUninstall(selectedPlugin.manifest.id)}
          isLoading={isLoading}
        />
      )}
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
      <div 
        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
        onClick={onSelect}
      >
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
  onSelectPlugin: (plugin: LoadedPlugin | null) => void;
}> = ({ searchQuery, setSearchQuery, connected, onConnect, installedPlugins }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('stars');

  // Mock marketplace plugins
  const marketplacePlugins = [
    { id: 'docker-terminal', name: 'Docker Terminal', author: '3clyp50', stars: 18, category: 'tools', description: 'Embedded multi-session terminal panel with tabbed PTY sessions', icon: '🐳' },
    { id: 'bmad-method', name: 'BMAD Method', author: 'vanja-emichi', stars: 16, category: 'agents', description: 'Full software development lifecycle framework with 20 specialist agents', icon: '📊' },
    { id: 'chat-rename', name: 'Chat Rename', author: '3clyp50', stars: 13, category: 'ui', description: 'Rename chats from the sidebar and keep manual titles locked', icon: '✏️' },
    { id: 'telegram-integration', name: 'Telegram Integration', author: 'spinnakergit', stars: 8, category: 'integration', description: 'Send, receive, and manage messages via Telegram Bot API', icon: '📨' },
    { id: 'memory-manager', name: 'Memory Manager', author: 'community', stars: 25, category: 'memory', description: 'Advanced memory management with vector storage and retrieval', icon: '🧠' },
  ];

  const filters = [
    { key: 'all', label: 'All', count: marketplacePlugins.length },
    { key: 'tools', label: 'Tools', count: 1 },
    { key: 'agents', label: 'Agents', count: 1 },
    { key: 'ui', label: 'UI', count: 1 },
    { key: 'memory', label: 'Memory', count: 1 },
    { key: 'integration', label: 'Integration', count: 1 },
  ];

  const filteredPlugins = marketplacePlugins.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || plugin.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  if (!connected) {
    return (
      <div className="text-center py-16">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 mb-4">
            <CloudArrowDownIcon className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Discover Community Plugins
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            Browse and install plugins from the SchoolPilot3 community marketplace. 
            Extend your system with powerful integrations and features.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">58</span> plugins available
          </div>
        </div>
        <button
          onClick={onConnect}
          className="mt-6 px-8 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
        >
          Connect to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-1">
            Community Plugin Hub
          </p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Discover community plugins for SchoolPilot3
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            These plugins are provided by the community. Contribute by publishing in the index repository.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">{marketplacePlugins.length}</span> plugins available
          </span>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search plugins, authors, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">SORT</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium"
          >
            <option value="stars">Stars</option>
            <option value="name">Name</option>
            <option value="recent">Recent</option>
          </select>
          <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(filter => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === filter.key
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {filter.label} {filter.count}
          </button>
        ))}
      </div>

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlugins.map(plugin => (
          <MarketplacePluginCard
            key={plugin.id}
            plugin={plugin}
            isInstalled={installedPlugins.some(p => p.manifest.id === plugin.id)}
            onSelect={() => onSelectPlugin({
              manifest: {
                id: plugin.id,
                name: plugin.name,
                version: '1.0.0',
                description: plugin.description,
                type: plugin.category as any,
                author: plugin.author,
              },
              module: {} as any,
              status: 'inactive',
              loadedAt: new Date(),
              source: 'marketplace',
            } as any)}
          />
        ))}
      </div>
    </div>
  );
};

const MarketplacePluginCard: React.FC<{
  plugin: any;
  isInstalled: boolean;
  onSelect: () => void;
}> = ({ plugin, isInstalled, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-2xl flex-shrink-0">
          {plugin.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">
                {plugin.name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {plugin.author}
              </p>
            </div>
            <div className="flex items-center gap-1 text-yellow-500 flex-shrink-0">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{plugin.stars}</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
            {plugin.description}
          </p>

          {isInstalled && (
            <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Installed
            </div>
          )}
        </div>
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

// ============================================================================
// Plugin Settings Form
// ============================================================================

const PluginSettingsForm: React.FC<{
  plugin: LoadedPlugin;
}> = ({ plugin }) => {
  const context = React.useContext(PluginsContext);
  
  if (!context) {
    return <div className="p-8 text-center text-red-500">Plugin context not available</div>;
  }
  
  const { manager: pluginManager } = context;
  
  const [settings, setSettings] = useState<Record<string, any>>(() => {
    return pluginManager.getPluginSettings(plugin.manifest.id);
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Save each setting
      for (const [key, value] of Object.entries(settings)) {
        await pluginManager.setPluginSetting(plugin.manifest.id, key, value);
      }
      
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Reset all settings to default values?')) return;
    
    const defaultSettings: Record<string, any> = {};
    plugin.manifest.settings?.forEach(setting => {
      if (setting.defaultValue !== undefined) {
        defaultSettings[setting.key] = setting.defaultValue;
      }
    });
    
    setSettings(defaultSettings);
  };

  if (!plugin.manifest.settings || plugin.manifest.settings.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <CogIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No configurable settings for this plugin</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Plugin Settings</h3>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded-lg ${
          saveMessage.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          <p className="text-sm font-medium">{saveMessage.text}</p>
        </div>
      )}

      <div className="space-y-4">
        {plugin.manifest.settings.map(setting => (
          <div key={setting.key} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {setting.label}
              {setting.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {setting.type === 'boolean' ? (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings[setting.key] ?? setting.defaultValue ?? false}
                  onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            ) : setting.type === 'select' ? (
              <select
                value={settings[setting.key] ?? setting.defaultValue ?? ''}
                onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {setting.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : setting.type === 'json' ? (
              <textarea
                value={typeof settings[setting.key] === 'object' 
                  ? JSON.stringify(settings[setting.key], null, 2) 
                  : settings[setting.key] ?? JSON.stringify(setting.defaultValue ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleSettingChange(setting.key, parsed);
                  } catch {
                    // Invalid JSON, store as string temporarily
                    handleSettingChange(setting.key, e.target.value);
                  }
                }}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="{}"
              />
            ) : (
              <input
                type={setting.type === 'number' ? 'number' : setting.type === 'password' ? 'password' : 'text'}
                value={settings[setting.key] ?? setting.defaultValue ?? ''}
                onChange={(e) => handleSettingChange(
                  setting.key, 
                  setting.type === 'number' ? Number(e.target.value) : e.target.value
                )}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={setting.description}
                min={setting.validation?.min}
                max={setting.validation?.max}
                pattern={setting.validation?.pattern}
              />
            )}
            
            {setting.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{setting.description}</p>
            )}
            
            {setting.validation && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {setting.validation.min !== undefined && setting.validation.max !== undefined && (
                  <span>Range: {setting.validation.min} - {setting.validation.max}</span>
                )}
                {setting.validation.pattern && (
                  <span>Pattern: {setting.validation.pattern}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Plugin Details Panel
// ============================================================================

const PluginDetailsPanel: React.FC<{
  plugin: LoadedPlugin;
  onClose: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onUninstall: () => void;
  isLoading: boolean;
}> = ({ plugin, onClose, onActivate, onDeactivate, onUninstall, isLoading }) => {
  const { t } = useTranslation('settings');
  const [activeSection, setActiveSection] = useState<'overview' | 'readme' | 'settings'>('overview');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                {plugin.manifest.icon ? (
                  <img src={plugin.manifest.icon} alt="" className="w-7 h-7" />
                ) : (
                  <PuzzlePieceIcon className="h-6 w-6 text-white" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {plugin.manifest.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="truncate">{plugin.manifest.author || 'Unknown'}</span>
                  {plugin.manifest.version && (
                    <>
                      <span>•</span>
                      <span>v{plugin.manifest.version}</span>
                    </>
                  )}
                  {plugin.manifest.type && (
                    <>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                        {plugin.manifest.type}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            {plugin.status === 'active' ? (
              <button
                onClick={onDeactivate}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Disable
              </button>
            ) : (
              <button
                onClick={onActivate}
                disabled={isLoading || plugin.status === 'error'}
                className="px-4 py-2 text-sm bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                Enable
              </button>
            )}
            
            {plugin.source !== 'builtin' && (
              <button
                onClick={onUninstall}
                disabled={isLoading}
                className="px-4 py-2 text-sm border border-red-500 text-red-500 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
              >
                Uninstall
              </button>
            )}
            
            <div className="flex-1"></div>
            
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className={`w-2 h-2 rounded-full ${
                plugin.status === 'active' ? 'bg-green-500' :
                plugin.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">{plugin.status}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 flex-shrink-0">
          <div className="flex gap-6">
            {(['overview', 'readme', 'settings'] as const).map(section => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeSection === section
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {section}
              </button>
            ))}
          </div>
        </div>

        {/* Content - Now takes up most of the space */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {plugin.manifest.description || 'No description available'}
                </p>
              </div>

              {/* Plugin Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Plugin ID</h3>
                  <p className="text-sm text-gray-900 dark:text-white font-mono">{plugin.manifest.id}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Source</h3>
                  <p className="text-sm text-gray-900 dark:text-white capitalize">{plugin.source}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Version</h3>
                  <p className="text-sm text-gray-900 dark:text-white">{plugin.manifest.version || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">License</h3>
                  <p className="text-sm text-gray-900 dark:text-white">{plugin.manifest.license || 'N/A'}</p>
                </div>
              </div>

              {/* Provides */}
              {plugin.manifest.provides && plugin.manifest.provides.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Provides</h3>
                  <div className="flex flex-wrap gap-2">
                    {plugin.manifest.provides.map(feature => (
                      <span key={feature} className="px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Permissions</h3>
                <div className="flex flex-wrap gap-2">
                  {(plugin.manifest.privileges?.permissions || []).map(perm => (
                    <span key={perm} className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium">
                      {perm}
                    </span>
                  ))}
                  {(!plugin.manifest.privileges?.permissions || plugin.manifest.privileges.permissions.length === 0) && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">No special permissions required</span>
                  )}
                </div>
              </div>

              {/* Error */}
              {plugin.error && (
                <div>
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Error Details</h3>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400 font-mono break-all">{plugin.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'readme' && (
            <div className="prose dark:prose-invert max-w-none">
              <h3>README</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Documentation for {plugin.manifest.name} will be displayed here.
              </p>
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No README available for this plugin.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <PluginSettingsForm plugin={plugin} />
          )}
        </div>

        {/* Footer - Compact */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PluginSettingsPage;

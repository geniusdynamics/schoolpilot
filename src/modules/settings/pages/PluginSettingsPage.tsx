import { logger } from '@/utils/logging';

/**
 * Plugin Management Page
 * 
 * Settings page for managing plugins, viewing marketplace, and configuring
 * admin settings for plugin loading and marketplace access.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { PuzzlePieceIcon, CloudArrowDownIcon, CogIcon, ShieldCheckIcon, StopIcon, TrashIcon, InformationCircleIcon, CheckCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { usePlugins } from '../../../plugins/usePlugins';
import { PageContainer } from '../../../components/layout/PageContainer';
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
  const confirm = useConfirm();
  
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
    const matchesSearch = (plugin.manifest.name?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
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
      logger.error('Failed to activate plugin:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activatePlugin]);

  const handleDeactivate = useCallback(async (pluginId: string) => {
    setIsLoading(true);
    try {
      await deactivatePlugin(pluginId);
    } catch (error) {
      logger.error('Failed to deactivate plugin:', error);
    } finally {
      setIsLoading(false);
    }
  }, [deactivatePlugin]);

  const handleUninstall = useCallback(async (pluginId: string) => {
    if (!(await confirm({ title: 'Uninstall plugin', message: t('plugins.confirmUninstall'), variant: 'danger' }))) return;
    
    setIsLoading(true);
    try {
      await unloadPlugin(pluginId);
    } catch (error) {
      logger.error('Failed to uninstall plugin:', error);
    } finally {
      setIsLoading(false);
    }
  }, [unloadPlugin, t, confirm]);

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
    <div className="min-h-screen bg-surface-muted dark:bg-gray-900">
      <PageContainer>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <PuzzlePieceIcon className="h-8 w-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-surface-foreground dark:text-white">
              {t('plugins.title', 'Plugin Management')}
            </h1>
          </div>
          <p className="mt-2 text-surface-muted-fg dark:text-gray-400">
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
            icon={<StopIcon className="h-5 w-5 text-surface-muted-fg" />}
          />
          <StatCard
            label={t('plugins.stats.marketplace', 'Marketplace')}
            value={marketplaceConnected ? t('common.connected', 'Connected') : t('common.disconnected', 'Disconnected')}
            icon={<CloudArrowDownIcon className={marketplaceConnected ? 'text-green-500' : 'text-surface-muted-fg'} />}
          />
        </div>

        {/* Tabs */}
        <div className="bg-surface-card dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-surface-border dark:border-gray-700">
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
      </PageContainer>

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
  <div className="bg-surface-card dark:bg-gray-800 rounded-lg p-4 shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-surface-muted-fg dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-surface-foreground dark:text-white">{value}</p>
      </div>
      <div className="text-surface-muted-fg dark:text-gray-500">{icon}</div>
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
        : 'border-transparent text-surface-muted-fg hover:text-surface-foreground dark:text-gray-400 dark:hover:text-gray-300'}
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
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-muted-fg" />
          <input
            type="text"
            placeholder={t('plugins.searchPlaceholder', 'Search plugins by name or description...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-surface-border dark:border-gray-600 rounded-lg bg-surface-card dark:bg-gray-700 text-surface-foreground dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-surface-border dark:border-gray-600 rounded-lg bg-surface-card dark:bg-gray-700 text-surface-foreground dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
          <div className="text-center py-12 text-surface-muted-fg dark:text-gray-400">
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
    <div className="border-b border-surface-border dark:border-gray-700 last:border-b-0">
      <div className="p-4 hover:bg-surface-muted dark:hover:bg-gray-800/30 transition-colors">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0">
            {plugin.manifest.icon ? (
              <img src={plugin.manifest.icon} alt="" className="w-6 h-6" />
            ) : (
              <PuzzlePieceIcon className="h-5 w-5 text-surface-muted-fg dark:text-gray-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-surface-foreground dark:text-white">
                    {plugin.manifest.name}
                  </h3>
                  {plugin.manifest.type && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-accent dark:bg-gray-700 text-surface-muted-fg dark:text-gray-400 capitalize">
                      {plugin.manifest.type}
                    </span>
                  )}
                </div>
                <p className="text-xs text-surface-muted-fg dark:text-gray-400 mt-0.5 font-mono">
                  {plugin.manifest.id}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Config button */}
                {plugin.status === 'active' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelect(); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-surface-accent dark:bg-gray-700 text-surface-foreground dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <CogIcon className="h-3.5 w-3.5" />
                    Config
                  </button>
                )}

                {/* Info button with dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
                    className="p-1.5 text-surface-muted-fg hover:text-surface-muted-fg dark:hover:text-gray-300 rounded-md hover:bg-surface-accent dark:hover:bg-gray-700 transition-colors"
                    title="Info"
                  >
                    <InformationCircleIcon className="h-4 w-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-surface-card dark:bg-gray-800 rounded-lg shadow-lg border border-surface-border dark:border-gray-700 py-1 z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(); setShowDropdown(false); }}
                        className="w-full px-4 py-2 text-sm text-left text-surface-foreground dark:text-gray-300 hover:bg-surface-muted dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <InformationCircleIcon className="h-4 w-4" />
                        Details
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDropdown(false); }}
                        className="w-full px-4 py-2 text-sm text-left text-surface-foreground dark:text-gray-300 hover:bg-surface-muted dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        README
                      </button>
                      {plugin.source !== 'builtin' && (
                        <>
                          <div className="border-t border-surface-border dark:border-gray-700 my-1" />
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
                  className="p-1.5 text-surface-muted-fg hover:text-surface-muted-fg dark:hover:text-gray-300 rounded-md hover:bg-surface-accent dark:hover:bg-gray-700 transition-colors"
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
                  className="text-xs font-medium bg-surface-accent dark:bg-gray-700 text-surface-foreground dark:text-gray-300 rounded-md px-3 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="on">ON</option>
                  <option value="off">OFF</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-surface-muted-fg dark:text-gray-400 mt-2">
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
    { id: 'docker-terminal', name: 'Docker Terminal', author: '3clyp50', stars: 18, category: 'tools', description: 'Embedded multi-session terminal panel with tabbed PTY sessions', icon: 'ðŸ³' },
    { id: 'bmad-method', name: 'BMAD Method', author: 'vanja-emichi', stars: 16, category: 'agents', description: 'Full software development lifecycle framework with 20 specialist agents', icon: 'ðŸ“Š' },
    { id: 'chat-rename', name: 'Chat Rename', author: '3clyp50', stars: 13, category: 'ui', description: 'Rename chats from the sidebar and keep manual titles locked', icon: 'âœï¸' },
    { id: 'telegram-integration', name: 'Telegram Integration', author: 'spinnakergit', stars: 8, category: 'integration', description: 'Send, receive, and manage messages via Telegram Bot API', icon: 'ðŸ“¨' },
    { id: 'memory-manager', name: 'Memory Manager', author: 'community', stars: 25, category: 'memory', description: 'Advanced memory management with vector storage and retrieval', icon: 'ðŸ§ ' },
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
    const matchesSearch = (plugin.name?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
      (plugin.description?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
      (plugin.author?.toLowerCase() ?? '').includes(searchQuery.toLowerCase());
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
          <h3 className="text-xl font-bold text-surface-foreground dark:text-white mb-2">
            Discover Community Plugins
          </h3>
          <p className="text-surface-muted-fg dark:text-gray-400 max-w-lg mx-auto">
            Browse and install plugins from the SchoolPilot3 community marketplace. 
            Extend your system with powerful integrations and features.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <div className="text-sm text-surface-muted-fg dark:text-gray-400">
            <span className="font-semibold text-surface-foreground dark:text-white">58</span> plugins available
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
          <h3 className="text-2xl font-bold text-surface-foreground dark:text-white">
            Discover community plugins for SchoolPilot3
          </h3>
          <p className="text-sm text-surface-muted-fg dark:text-gray-400 mt-2">
            These plugins are provided by the community. Contribute by publishing in the index repository.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-surface-muted-fg dark:text-gray-400">
            <span className="font-semibold text-surface-foreground dark:text-white">{marketplacePlugins.length}</span> plugins available
          </span>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-muted-fg" />
          <input
            type="text"
            placeholder="Search plugins, authors, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-surface-border dark:border-gray-600 rounded-lg bg-surface-card dark:bg-gray-700 text-surface-foreground dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-surface-muted-fg dark:text-gray-400">SORT</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-surface-border dark:border-gray-600 rounded-lg bg-surface-card dark:bg-gray-700 text-surface-foreground dark:text-white text-sm font-medium"
          >
            <option value="stars">Stars</option>
            <option value="name">Name</option>
            <option value="recent">Recent</option>
          </select>
          <button className="p-2 border border-surface-border dark:border-gray-600 rounded-lg hover:bg-surface-muted dark:hover:bg-gray-700">
            <svg className="h-5 w-5 text-surface-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                : 'bg-surface-accent dark:bg-gray-700 text-surface-foreground dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
      className="border border-surface-border dark:border-gray-700 rounded-lg p-5 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all cursor-pointer group"
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
              <h4 className="text-base font-semibold text-surface-foreground dark:text-white group-hover:text-primary-500 transition-colors">
                {plugin.name}
              </h4>
              <p className="text-xs text-surface-muted-fg dark:text-gray-400 mt-0.5">
                {plugin.author}
              </p>
            </div>
            <div className="flex items-center gap-1 text-yellow-500 flex-shrink-0">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-medium text-surface-foreground dark:text-gray-300">{plugin.stars}</span>
            </div>
          </div>

          <p className="text-sm text-surface-muted-fg dark:text-gray-400 mt-2 line-clamp-2">
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
      <div className="text-center py-12 text-surface-muted-fg dark:text-gray-400">
        {t('plugins.settings.noConfig', 'No admin configuration loaded')}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Master Switch */}
      <div className="flex items-center justify-between p-4 bg-surface-muted dark:bg-gray-700/50 rounded-lg">
        <div>
          <h4 className="font-medium text-surface-foreground dark:text-white">
            {t('plugins.settings.enablePlugins', 'Enable Plugin System')}
          </h4>
          <p className="text-sm text-surface-muted-fg dark:text-gray-400">
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
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-card after:border-surface-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
        </label>
      </div>

      {/* Marketplace Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-surface-foreground dark:text-white flex items-center gap-2">
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
        <h4 className="font-medium text-surface-foreground dark:text-white flex items-center gap-2">
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
  <div className="flex items-center justify-between p-3 bg-surface-muted dark:bg-gray-700/50 rounded-lg">
    <span className="text-sm text-surface-foreground dark:text-gray-300">{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
    </label>
  </div>
);

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
        className="bg-surface-card dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-surface-border dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-4xl flex-shrink-0">
                {plugin.manifest.icon ? (
                  <img src={plugin.manifest.icon} alt="" className="w-12 h-12" />
                ) : (
                  <PuzzlePieceIcon className="h-10 w-10 text-white" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-surface-foreground dark:text-white">
                  {plugin.manifest.name}
                </h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-surface-muted-fg dark:text-gray-400">
                  <span>Author: <span className="font-medium text-surface-foreground dark:text-gray-300">{plugin.manifest.author || 'Unknown'}</span></span>
                  {plugin.manifest.version && (
                    <>
                      <span>â€¢</span>
                      <span>v{plugin.manifest.version}</span>
                    </>
                  )}
                </div>
                
                {/* Tags */}
                {plugin.manifest.type && (
                  <div className="flex gap-2 mt-3">
                    <span className="px-3 py-1 rounded-full bg-surface-accent dark:bg-gray-700 text-surface-foreground dark:text-gray-300 text-xs font-medium capitalize">
                      {plugin.manifest.type}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-surface-accent dark:bg-gray-700 text-surface-foreground dark:text-gray-300 text-xs font-medium">
                      {plugin.source}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-surface-muted-fg hover:text-surface-muted-fg dark:hover:text-gray-300 rounded-lg hover:bg-surface-accent dark:hover:bg-gray-700"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p className="mt-4 text-surface-muted-fg dark:text-gray-400">
            {plugin.manifest.description || 'No description available'}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            {plugin.status === 'active' ? (
              <button
                onClick={onDeactivate}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-surface-accent dark:bg-gray-700 text-surface-foreground dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Disable
              </button>
            ) : (
              <button
                onClick={onActivate}
                disabled={isLoading || plugin.status === 'error'}
                className="flex-1 px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                Install
              </button>
            )}
            
            <button className="flex-1 px-6 py-3 border border-surface-border dark:border-gray-600 text-surface-foreground dark:text-gray-300 font-medium rounded-lg hover:bg-surface-muted dark:hover:bg-gray-700 transition-colors">
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Discussion
              </span>
            </button>

            {plugin.source !== 'builtin' && (
              <button
                onClick={onUninstall}
                disabled={isLoading}
                className="px-6 py-3 border-2 border-red-500 text-red-500 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
              >
                Uninstall
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-surface-border dark:border-gray-700 px-6">
          <div className="flex gap-6">
            {(['overview', 'readme', 'settings'] as const).map(section => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeSection === section
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-surface-muted-fg hover:text-surface-foreground dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {section}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-400px)]">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-surface-foreground dark:text-white mb-3">Status</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    plugin.status === 'active' ? 'bg-green-500' :
                    plugin.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm text-surface-foreground dark:text-gray-300 capitalize">{plugin.status}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-surface-foreground dark:text-white mb-3">Permissions</h3>
                <div className="flex flex-wrap gap-2">
                  {(plugin.manifest.privileges?.permissions || []).map(perm => (
                    <span key={perm} className="px-3 py-1 rounded-md bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs font-medium">
                      {perm}
                    </span>
                  ))}
                  {(!plugin.manifest.privileges?.permissions || plugin.manifest.privileges.permissions.length === 0) && (
                    <span className="text-sm text-surface-muted-fg dark:text-gray-400">No special permissions required</span>
                  )}
                </div>
              </div>

              {plugin.error && (
                <div>
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">Error Details</h3>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400 font-mono">{plugin.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'readme' && (
            <div className="prose dark:prose-invert max-w-none">
              <h3>README</h3>
              <p className="text-surface-muted-fg dark:text-gray-400">
                Documentation for {plugin.manifest.name} will be displayed here.
              </p>
              <div className="mt-4 p-4 bg-surface-muted dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-surface-muted-fg dark:text-gray-400 italic">
                  No README available for this plugin.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-surface-foreground dark:text-white mb-4">Plugin Settings</h3>
              {plugin.manifest.settings && plugin.manifest.settings.length > 0 ? (
                plugin.manifest.settings.map(setting => (
                  <div key={setting.key} className="p-4 bg-surface-muted dark:bg-gray-700/50 rounded-lg">
                    <label className="block text-sm font-medium text-surface-foreground dark:text-gray-300 mb-2">
                      {setting.label}
                    </label>
                    {setting.type === 'boolean' ? (
                      <input type="checkbox" className="rounded" defaultChecked={setting.default as boolean} />
                    ) : (
                      <input
                        type={setting.type === 'number' ? 'number' : 'text'}
                        className="w-full px-3 py-2 border border-surface-border dark:border-gray-600 rounded-lg bg-surface-card dark:bg-gray-800 text-surface-foreground dark:text-white"
                        defaultValue={String(setting.default)}
                      />
                    )}
                    {setting.description && (
                      <p className="text-xs text-surface-muted-fg dark:text-gray-400 mt-2">{setting.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-surface-muted-fg dark:text-gray-400">
                  <CogIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No configurable settings for this plugin</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border dark:border-gray-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border-2 border-red-500 text-red-500 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const PluginSettingsContent = PluginSettingsPage;

export default PluginSettingsPage;

import { logger } from '@/utils/logging';

/**
 * Marketplace Discovery Component
 * 
 * Full marketplace UI with plugin discovery, key management,
 * installation, and tracking.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CloudArrowDownIcon,
  MagnifyingGlassIcon,
  StarIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  LockClosedIcon,
  KeyIcon,
  XMarkIcon,
  SparklesIcon,
  FireIcon,
  ClockIcon,
  InformationCircleIcon,
  ShoppingCartIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { getMarketplace } from '@/services/plugin/PluginMarketplace';
import type {
  MarketplacePlugin,
  MarketplaceKeyConfig,
} from '@/plugins/types';
import type {
  MarketplaceCategory,
  MarketplaceFeatured,
  KeyValidationResult,
} from '@/services/plugin/PluginMarketplace';
import type { LoadedPlugin, AdminPluginConfig } from '@/plugins/types';

// ============================================================================
// Types
// ============================================================================

interface MarketplaceDiscoveryProps {
  installedPlugins: LoadedPlugin[];
  adminConfig: AdminPluginConfig | null;
  onInstall: (pluginId: string) => Promise<void>;
  onConfigChange: (config: AdminPluginConfig) => void;
}

type ViewMode = 'browse' | 'featured' | 'categories' | 'installed-updates';

// ============================================================================
// Main Component
// ============================================================================

export const MarketplaceDiscovery: React.FC<MarketplaceDiscoveryProps> = ({
  installedPlugins,
  adminConfig,
  onInstall,
  onConfigChange,
}) => {
  const { t } = useTranslation('settings');
  const marketplace = getMarketplace();

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [marketplaceKey, setMarketplaceKey] = useState('');
  const [keyConfig, setKeyConfig] = useState<MarketplaceKeyConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('featured');
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [featured, setFeatured] = useState<MarketplaceFeatured>({
    featured: [],
    trending: [],
    newReleases: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [installingPlugin, setInstallingPlugin] = useState<string | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<MarketplacePlugin | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const connectivity = await marketplace.checkConnectivity();
      if (connectivity) {
        const [categoriesData, featuredData] = await Promise.all([
          marketplace.getCategories(),
          marketplace.getFeatured(),
        ]);
        setCategories(categoriesData);
        setFeatured(featuredData);
        setIsConnected(true);

        // Check for stored key
        const storedKey = localStorage.getItem('marketplace_key');
        if (storedKey) {
          setMarketplaceKey(storedKey);
          await validateAndSetKey(storedKey);
        }
      }
    } catch (err) {
      logger.error('Failed to load marketplace data:', err);
      setError('Failed to connect to marketplace');
    } finally {
      setIsLoading(false);
    }
  };

  const validateAndSetKey = async (key: string) => {
    setIsConnecting(true);
    try {
      const result: KeyValidationResult = await marketplace.validateKey(key);

      if (result.valid) {
        const config: MarketplaceKeyConfig = {
          key,
          instanceId: marketplace.getInstanceId(),
          activatedAt: new Date().toISOString(),
          plan: result.plan,
          permissions: result.permissions,
          tracking: {
            reportingEnabled: true,
            analyticsEnabled: true,
          },
        };

        marketplace.setMarketplaceKey(config);
        setKeyConfig(config);
        localStorage.setItem('marketplace_key', key);

        // Update admin config
        if (adminConfig) {
          onConfigChange({
            ...adminConfig,
            marketplace: {
              ...adminConfig.marketplace,
              marketplaceKey: key,
            },
          });
        }
      } else {
        setError(result.error || 'Invalid marketplace key');
      }
    } catch {
      setError('Failed to validate key');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (!marketplaceKey.trim()) {
      setError('Please enter a marketplace key');
      return;
    }
    await validateAndSetKey(marketplaceKey);
  };

  const handleDisconnect = () => {
    setKeyConfig(null);
    setMarketplaceKey('');
    localStorage.removeItem('marketplace_key');
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setPlugins([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await marketplace.searchPlugins(query);
      setPlugins(results.plugins);
    } catch (err) {
      logger.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInstall = async (pluginId: string) => {
    if (!adminConfig) return;

    setInstallingPlugin(pluginId);
    try {
      await onInstall(pluginId);
    } catch (err) {
      logger.error('Install failed:', err);
      setError('Failed to install plugin');
    } finally {
      setInstallingPlugin(null);
    }
  };

  const isPluginInstalled = (pluginId: string): boolean => {
    return installedPlugins.some(p => p.manifest.id === pluginId);
  };

  const canInstallPlugin = (plugin: MarketplacePlugin): boolean => {
    const price = plugin.manifest.marketplace?.price ?? 0;
    const isPaid = price > 0;

    if (!adminConfig?.marketplace.enabled) return false;
    if (!keyConfig) return !isPaid;
    if (isPaid) return keyConfig.permissions.installPaidPlugins;
    return keyConfig.permissions.installFreePlugins;
  };

  // Key input view
  if (!isConnected || (!keyConfig && adminConfig?.marketplace.enabled)) {
    return (
      <KeyInputView
        marketplaceKey={marketplaceKey}
        setMarketplaceKey={setMarketplaceKey}
        onConnect={handleConnect}
        onSkip={() => setIsConnected(true)}
        isConnecting={isConnecting}
        error={error}
        isConnected={isConnected}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with key status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CloudArrowDownIcon className="h-6 w-6 text-primary-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('marketplace.title', 'Plugin Marketplace')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {keyConfig ? (
                <span className="flex items-center gap-1">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  {keyConfig.plan.charAt(0).toUpperCase() + keyConfig.plan.slice(1)} Plan
                  {' â€¢ '}
                  {keyConfig.permissions.maxPlugins} plugins max
                </span>
              ) : (
                'Free tier - Browse free plugins'
              )}
            </p>
          </div>
        </div>

        {keyConfig && (
          <button
            onClick={handleDisconnect}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            {t('marketplace.disconnect', 'Disconnect')}
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('marketplace.searchPlaceholder', 'Search plugins...')}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <ViewTab
          active={viewMode === 'featured'}
          onClick={() => setViewMode('featured')}
          icon={<SparklesIcon className="h-4 w-4" />}
          label={t('marketplace.tabs.featured', 'Featured')}
        />
        <ViewTab
          active={viewMode === 'browse'}
          onClick={() => setViewMode('browse')}
          icon={<CloudArrowDownIcon className="h-4 w-4" />}
          label={t('marketplace.tabs.browse', 'Browse')}
        />
        <ViewTab
          active={viewMode === 'categories'}
          onClick={() => setViewMode('categories')}
          icon={<TagIcon className="h-4 w-4" />}
          label={t('marketplace.tabs.categories', 'Categories')}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : (
        <>
          {viewMode === 'featured' && (
            <FeaturedView
              featured={featured}
              onInstall={handleInstall}
              onSelect={setSelectedPlugin}
              installingPlugin={installingPlugin}
              isInstalled={isPluginInstalled}
              canInstall={canInstallPlugin}
            />
          )}

          {viewMode === 'browse' && (
            <BrowseView
              plugins={plugins.length > 0 ? plugins : [...featured.featured, ...featured.trending]}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onInstall={handleInstall}
              onSelect={setSelectedPlugin}
              installingPlugin={installingPlugin}
              isInstalled={isPluginInstalled}
              canInstall={canInstallPlugin}
            />
          )}

          {viewMode === 'categories' && (
            <CategoriesView
              categories={categories}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setViewMode('browse');
              }}
            />
          )}
        </>
      )}

      {/* Plugin Detail Modal */}
      {selectedPlugin && (
        <PluginDetailModal
          plugin={selectedPlugin}
          onClose={() => setSelectedPlugin(null)}
          onInstall={() => {
            handleInstall(selectedPlugin.manifest.id);
            setSelectedPlugin(null);
          }}
          isInstalled={isPluginInstalled(selectedPlugin.manifest.id)}
          canInstall={canInstallPlugin(selectedPlugin)}
          isInstalling={installingPlugin === selectedPlugin.manifest.id}
        />
      )}
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

const KeyInputView: React.FC<{
  marketplaceKey: string;
  setMarketplaceKey: (key: string) => void;
  onConnect: () => void;
  onSkip: () => void;
  isConnecting: boolean;
  error: string | null;
  isConnected: boolean;
}> = ({ marketplaceKey, setMarketplaceKey, onConnect, onSkip, isConnecting, error }) => {
  const { t } = useTranslation('settings');

  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto">
        <KeyIcon className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('marketplace.connectTitle', 'Connect to Marketplace')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {t('marketplace.connectDescription', 
            'Enter your marketplace key to access all plugins, or continue with free tier access.'
          )}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="password"
              placeholder={t('marketplace.keyPlaceholder', 'Enter your marketplace key')}
              value={marketplaceKey}
              onChange={(e) => setMarketplaceKey(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onConnect}
              disabled={isConnecting || !marketplaceKey.trim()}
              className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : t('marketplace.connectButton', 'Connect')}
            </button>
            <button
              onClick={onSkip}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('marketplace.browseFree', 'Browse Free')}
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Don't have a key?{' '}
          <a href="#" className="text-primary-600 hover:text-primary-700">
            Get one here
          </a>
        </p>
      </div>
    </div>
  );
};

const ViewTab: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
    }`}
  >
    {icon}
    {label}
  </button>
);

const FeaturedView: React.FC<{
  featured: MarketplaceFeatured;
  onInstall: (id: string) => void;
  onSelect: (plugin: MarketplacePlugin) => void;
  installingPlugin: string | null;
  isInstalled: (id: string) => boolean;
  canInstall: (plugin: MarketplacePlugin) => boolean;
}> = ({ featured, onInstall, onSelect, installingPlugin, isInstalled, canInstall }) => (
  <div className="space-y-8">
    {featured.featured.length > 0 && (
      <PluginSection
        title="Featured Plugins"
        icon={<SparklesIcon className="h-5 w-5 text-yellow-500" />}
        plugins={featured.featured}
        onInstall={onInstall}
        onSelect={onSelect}
        installingPlugin={installingPlugin}
        isInstalled={isInstalled}
        canInstall={canInstall}
      />
    )}

    {featured.trending.length > 0 && (
      <PluginSection
        title="Trending"
        icon={<FireIcon className="h-5 w-5 text-orange-500" />}
        plugins={featured.trending}
        onInstall={onInstall}
        onSelect={onSelect}
        installingPlugin={installingPlugin}
        isInstalled={isInstalled}
        canInstall={canInstall}
      />
    )}

    {featured.newReleases.length > 0 && (
      <PluginSection
        title="New Releases"
        icon={<ClockIcon className="h-5 w-5 text-blue-500" />}
        plugins={featured.newReleases}
        onInstall={onInstall}
        onSelect={onSelect}
        installingPlugin={installingPlugin}
        isInstalled={isInstalled}
        canInstall={canInstall}
      />
    )}
  </div>
);

const PluginSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  plugins: MarketplacePlugin[];
  onInstall: (id: string) => void;
  onSelect: (plugin: MarketplacePlugin) => void;
  installingPlugin: string | null;
  isInstalled: (id: string) => boolean;
  canInstall: (plugin: MarketplacePlugin) => boolean;
}> = ({ title, icon, plugins, onInstall, onSelect, installingPlugin, isInstalled, canInstall }) => (
  <div>
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {plugins.map(plugin => (
        <MarketplacePluginCard
          key={plugin.manifest.id}
          plugin={plugin}
          onInstall={() => onInstall(plugin.manifest.id)}
          onSelect={() => onSelect(plugin)}
          isInstalling={installingPlugin === plugin.manifest.id}
          isInstalled={isInstalled(plugin.manifest.id)}
          canInstall={canInstall(plugin)}
        />
      ))}
    </div>
  </div>
);

const BrowseView: React.FC<{
  plugins: MarketplacePlugin[];
  categories: MarketplaceCategory[];
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  onInstall: (id: string) => void;
  onSelect: (plugin: MarketplacePlugin) => void;
  installingPlugin: string | null;
  isInstalled: (id: string) => boolean;
  canInstall: (plugin: MarketplacePlugin) => boolean;
}> = ({
  plugins,
  categories,
  selectedCategory,
  onSelectCategory,
  onInstall,
  onSelect,
  installingPlugin,
  isInstalled,
  canInstall,
}) => (
  <div className="flex gap-6">
    {/* Category sidebar */}
    <div className="w-48 shrink-0">
      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Categories</h4>
      <div className="space-y-1">
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
            !selectedCategory
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          All Plugins
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              selectedCategory === cat.id
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {cat.name}
            <span className="ml-2 text-xs text-gray-400">({cat.pluginCount})</span>
          </button>
        ))}
      </div>
    </div>

    {/* Plugin grid */}
    <div className="flex-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plugins.map(plugin => (
          <MarketplacePluginCard
            key={plugin.manifest.id}
            plugin={plugin}
            onInstall={() => onInstall(plugin.manifest.id)}
            onSelect={() => onSelect(plugin)}
            isInstalling={installingPlugin === plugin.manifest.id}
            isInstalled={isInstalled(plugin.manifest.id)}
            canInstall={canInstall(plugin)}
          />
        ))}
      </div>
    </div>
  </div>
);

const CategoriesView: React.FC<{
  categories: MarketplaceCategory[];
  onSelectCategory: (cat: string) => void;
}> = ({ categories, onSelectCategory }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {categories.map(cat => (
      <button
        key={cat.id}
        onClick={() => onSelectCategory(cat.id)}
        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center mb-3">
          <TagIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </div>
        <h4 className="font-medium text-gray-900 dark:text-white">{cat.name}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cat.pluginCount} plugins</p>
      </button>
    ))}
  </div>
);

const MarketplacePluginCard: React.FC<{
  plugin: MarketplacePlugin;
  onInstall: () => void;
  onSelect: () => void;
  isInstalling: boolean;
  isInstalled: boolean;
  canInstall: boolean;
}> = ({ plugin, onInstall, onSelect, isInstalling, isInstalled, canInstall }) => {
  const price = plugin.manifest.marketplace?.price ?? 0;
  const isPaid = price > 0;

  return (
    <div
      onClick={onSelect}
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
          {plugin.manifest.icon ? (
            <img src={plugin.manifest.icon} alt="" className="w-8 h-8" />
          ) : (
            <CloudArrowDownIcon className="h-6 w-6 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {plugin.manifest.name}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {plugin.manifest.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {plugin.rating > 0 && (
            <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <StarIcon className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              {plugin.rating.toFixed(1)}
            </span>
          )}
          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
            {plugin.manifest.type}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPaid && (
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              ${price.toFixed(2)}
            </span>
          )}
          {isInstalled ? (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <CheckCircleIcon className="h-4 w-4" />
              Installed
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInstall();
              }}
              disabled={isInstalling || !canInstall}
              className={`px-3 py-1 text-sm rounded ${
                canInstall
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isInstalling ? (
                <span className="flex items-center gap-1">
                  <ArrowDownIcon className="h-4 w-4 animate-bounce" />
                  Installing...
                </span>
              ) : isPaid ? (
                <span className="flex items-center gap-1">
                  <ShoppingCartIcon className="h-4 w-4" />
                  Buy
                </span>
              ) : (
                'Install'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const PluginDetailModal: React.FC<{
  plugin: MarketplacePlugin;
  onClose: () => void;
  onInstall: () => void;
  isInstalled: boolean;
  canInstall: boolean;
  isInstalling: boolean;
}> = ({ plugin, onClose, onInstall, isInstalled, canInstall, isInstalling }) => {
  const price = plugin.manifest.marketplace?.price ?? 0;
  const isPaid = price > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                {plugin.manifest.icon ? (
                  <img src={plugin.manifest.icon} alt="" className="w-10 h-10" />
                ) : (
                  <CloudArrowDownIcon className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {plugin.manifest.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  v{plugin.manifest.version} by {plugin.manifest.author || 'Unknown'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mb-6">
            {plugin.rating > 0 && (
              <div className="flex items-center gap-1">
                <StarIcon className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="font-medium">{plugin.rating.toFixed(1)}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  ({plugin.reviews?.length || 0} reviews)
                </span>
              </div>
            )}
            <div className="text-gray-500 dark:text-gray-400">
              {plugin.downloads?.toLocaleString() || 0} downloads
            </div>
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-300">
              {plugin.manifest.type}
            </span>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Description</h3>
            <p className="text-gray-600 dark:text-gray-300">{plugin.manifest.description}</p>
          </div>

          {/* Features */}
          {plugin.manifest.hooks && plugin.manifest.hooks.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Features</h3>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                {plugin.manifest.hooks.map(hook => (
                  <li key={hook}>{hook}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Price & Install */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              {isPaid ? (
                <div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${price.toFixed(2)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">one-time purchase</span>
                </div>
              ) : (
                <span className="text-xl font-bold text-green-600 dark:text-green-400">Free</span>
              )}
            </div>

            {isInstalled ? (
              <span className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <CheckCircleIcon className="h-5 w-5" />
                Already Installed
              </span>
            ) : (
              <button
                onClick={onInstall}
                disabled={isInstalling || !canInstall}
                className={`px-6 py-2 rounded-lg font-medium ${
                  canInstall
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isInstalling
                  ? 'Installing...'
                  : isPaid
                    ? 'Purchase & Install'
                    : 'Install Free'}
              </button>
            )}
          </div>

          {!canInstall && !isInstalled && (
            <p className="mt-4 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <InformationCircleIcon className="h-5 w-5" />
              {isPaid
                ? 'Upgrade your marketplace plan to install paid plugins'
                : 'Connect your marketplace key to install this plugin'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceDiscovery;

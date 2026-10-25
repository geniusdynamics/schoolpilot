import { logger } from '@/utils/logging';

/**
 * The Plugins tab of Settings
 *
 * The plugins that are installed, with the actions the plugin manager really carries out:
 * activate, deactivate and uninstall. The hub it sits in supplies the title.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { PuzzlePieceIcon, CogIcon, StopIcon, TrashIcon, InformationCircleIcon, CheckCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { usePlugins } from '@/plugins/usePlugins';
import type { LoadedPlugin } from '@/plugins/types';

import { PluginSettingsForm } from '../components/PluginSettingsForm';
import { describePrivileges } from '../data/pluginPrivileges';
import { useSettingsAccess } from '../hooks/useSettingsAccess';

// ============================================================================
// Types
// ============================================================================

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
  const { canAny } = useSettingsAccess();
  // Turning a plugin on or off, uninstalling it and changing its settings change the installation.
  const mayManage = canAny(['settings.manage', 'plugins.manage']);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<LoadedPlugin | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter plugins
  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = (plugin.manifest.name?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
      plugin.manifest.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || plugin.manifest.type === filterType;
    return matchesSearch && matchesType;
  });

  // Handlers
  // Each guards itself as well as being disabled in the page, so a control that is not shown cannot be reached.
  const handleActivate = useCallback(async (pluginId: string) => {
    if (!mayManage) return;
    setIsLoading(true);
    try {
      await activatePlugin(pluginId);
    } catch (error) {
      logger.error('Failed to activate plugin:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activatePlugin, mayManage]);

  const handleDeactivate = useCallback(async (pluginId: string) => {
    if (!mayManage) return;
    setIsLoading(true);
    try {
      await deactivatePlugin(pluginId);
    } catch (error) {
      logger.error('Failed to deactivate plugin:', error);
    } finally {
      setIsLoading(false);
    }
  }, [deactivatePlugin, mayManage]);

  const handleUninstall = useCallback(async (pluginId: string) => {
    if (!mayManage) return;
    if (!(await confirm({ title: 'Uninstall plugin', message: t('plugins.confirmUninstall'), variant: 'danger' }))) return;
    
    setIsLoading(true);
    try {
      await unloadPlugin(pluginId);
    } catch (error) {
      logger.error('Failed to uninstall plugin:', error);
    } finally {
      setIsLoading(false);
    }
  }, [unloadPlugin, t, confirm, mayManage]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4">
      {!mayManage && (
        <p role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {t('plugins.readOnly', 'You can see the plugins but not change them. Ask an administrator.')}
        </p>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      <div className="bg-surface-card dark:bg-gray-800 rounded-lg shadow p-6">
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
          readOnly={!mayManage}
        />
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
          readOnly={!mayManage}
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
  isLoading: boolean;
  readOnly: boolean;
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
  isLoading,
  readOnly,
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
              readOnly={readOnly}
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
  readOnly: boolean;
}> = ({
  plugin,
  onSelect,
  onActivate,
  onDeactivate,
  onUninstall,
  isLoading,
  readOnly,
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
    <div data-testid={`plugin-${plugin.manifest.id}`} className="border-b border-surface-border dark:border-gray-700 last:border-b-0">
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
                      {plugin.source !== 'builtin' && !readOnly && (
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

                {/* Toggle Switch */}
                <select
                  aria-label={`${plugin.manifest.name} status`}
                  value={plugin.status === 'active' ? 'on' : 'off'}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (e.target.value === 'on') {
                      onActivate();
                    } else {
                      onDeactivate();
                    }
                  }}
                  disabled={readOnly || isLoading || plugin.status === 'error'}
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
  readOnly: boolean;
}> = ({ plugin, onClose, onActivate, onDeactivate, onUninstall, isLoading, readOnly }) => {
  const access = describePrivileges(plugin.manifest.privileges);

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
                      <span>•</span>
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
              aria-label="Close"
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
                disabled={readOnly || isLoading}
                className="flex-1 px-6 py-3 bg-surface-accent dark:bg-gray-700 text-surface-foreground dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Disable
              </button>
            ) : (
              <button
                onClick={onActivate}
                disabled={readOnly || isLoading || plugin.status === 'error'}
                className="flex-1 px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                Enable
              </button>
            )}
            
            {plugin.source !== 'builtin' && !readOnly && (
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-340px)] space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-surface-foreground dark:text-white mb-3">Status</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                plugin.status === 'active' ? 'bg-green-500' :
                plugin.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-surface-foreground dark:text-gray-300 capitalize">{plugin.status}</span>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-surface-foreground dark:text-white mb-3">Access</h3>
            {access.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {access.map(line => (
                  <span key={line} className="px-3 py-1 rounded-md bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs font-medium">
                    {line}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-surface-muted-fg dark:text-gray-400">This plugin declares no special access.</span>
            )}
          </section>

          {plugin.error && (
            <section>
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">Error Details</h3>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400 font-mono">{plugin.error}</p>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold text-surface-foreground dark:text-white mb-3">Settings</h3>
            <PluginSettingsForm plugin={plugin} readOnly={readOnly} />
          </section>
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

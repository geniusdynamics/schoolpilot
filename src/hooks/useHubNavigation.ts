// ABOUTME: Hook for standardized hub page tab navigation
// ABOUTME: Handles URL sync, tab validation, default tab cleanup, and optional localStorage persistence

import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HubConfig } from '@/core/types/hub';

export function useHubNavigation<T extends string>(config: HubConfig<T>) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const urlTab = searchParams.get('tab') as T | null;

    // 1. URL ?tab= takes highest priority — only if present and valid
    if (urlTab && config.tabs.some(t => t.id === urlTab)) {
      return urlTab;
    }

    // 2. No ?tab= in URL at all → check localStorage if persistKey is provided
    if (!searchParams.has('tab') && config.persistKey) {
      const stored = localStorage.getItem(config.persistKey);
      if (stored && config.tabs.some(t => t.id === stored)) {
        return stored as T;
      }
    }

    // 3. Fall back to defaultTab
    return config.defaultTab;
  }, [searchParams, config.persistKey, config.defaultTab, config.tabs]);

  const handleTabChange = useCallback((tabId: string) => {
    // Persist to localStorage if persistKey is configured
    if (config.persistKey) {
      localStorage.setItem(config.persistKey, tabId);
    }

    // Preserve existing search params (e.g., tab system URL state) to avoid
    // clobbering them when updating only the hub page's ?tab= param
    const currentParams = new URLSearchParams(searchParams.toString());
    
    if (tabId === config.defaultTab) {
      currentParams.delete('tab');
      const query = currentParams.toString();
      navigate(query ? `${config.basePath}?${query}` : config.basePath, { replace: true });
    } else {
      currentParams.set('tab', tabId);
      setSearchParams(currentParams, { replace: true });
    }
  }, [navigate, setSearchParams, config.basePath, config.defaultTab, config.persistKey, searchParams]);

  const activeTabData = config.tabs.find(t => t.id === activeTab) || config.tabs[0];
  const ActiveComponent = activeTabData.component;

  return {
    activeTab,
    activeTabData,
    ActiveComponent,
    handleTabChange,
    tabs: config.tabs.map(t => ({ id: t.id, label: t.label, icon: t.icon })),
  };
}

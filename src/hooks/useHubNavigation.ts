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

    if (tabId === config.defaultTab) {
      navigate(config.basePath, { replace: true });
    } else {
      setSearchParams({ tab: tabId }, { replace: true });
    }
  }, [navigate, setSearchParams, config.basePath, config.defaultTab, config.persistKey]);

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

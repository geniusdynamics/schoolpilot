// ABOUTME: Reusable hook for hub page tab navigation with URL synchronization
// ABOUTME: Eliminates duplicate tab management boilerplate across all hub pages

import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HubConfig, HubTab } from '@/core/types/hub';

interface UseHubNavigationResult<T extends string> {
  activeTab: T;
  activeTabData: HubTab<T>;
  handleTabChange: (tabId: T) => void;
  tabs: HubTab<T>[];
}

export function useHubNavigation<T extends string>(config: HubConfig<T>): UseHubNavigationResult<T> {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as T | null;
  const validTabIds = config.tabs.map((t) => t.id);
  const initialTab = tabParam && validTabIds.includes(tabParam) ? tabParam : config.defaultTab;

  const [activeTab, setActiveTab] = useState<T>(initialTab);

  const handleTabChange = useCallback(
    (tabId: T) => {
      setActiveTab(tabId);
      if (tabId === config.defaultTab) {
        navigate(config.basePath, { replace: true });
      } else {
        setSearchParams({ tab: tabId as string }, { replace: true });
      }
    },
    [navigate, setSearchParams, config.basePath, config.defaultTab]
  );

  const activeTabData = config.tabs.find((t) => t.id === activeTab) || config.tabs[0];

  return {
    activeTab,
    activeTabData,
    handleTabChange,
    tabs: config.tabs,
  };
}

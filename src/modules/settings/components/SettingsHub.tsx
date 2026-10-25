// ABOUTME: One hub page of Settings: a title, one row of tabs, and the body of the tab the address names.
// ABOUTME: The address decides the tab, so a link to another tab of the hub works in place; an old tab name redirects.

import React, { useCallback } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';

export interface SettingsHubTab {
  readonly id: string;
  readonly label: string;
  readonly icon: React.ReactNode;
  /** The tab's body. It has no header of its own: the hub supplies the title. */
  readonly render: () => React.ReactNode;
}

export interface SettingsHubProps {
  readonly title: string;
  /** The hub's explanatory line, shown on demand beside the title. */
  readonly info?: string;
  readonly tabs: readonly SettingsHubTab[];
  /** The tab shown when the address names none, or names one the hub does not have. */
  readonly defaultTab: string;
  /** Old `?tab=` values whose page now lives elsewhere: each maps to the full address to go to. */
  readonly movedTabs?: Readonly<Record<string, string>>;
  /** Shown above the body of whichever tab is open. */
  readonly banner?: React.ReactNode;
  readonly colorScheme?: React.ComponentProps<typeof PageHeaderWithTabs>['colorScheme'];
}

/**
 * A Settings hub.
 *
 * The active tab is read from the address on every render, not copied into state once. The hubs
 * used to copy it, so a link to another tab of the hub you were already on changed the address and
 * left the old tab open. Choosing a tab writes it to the address, replacing the entry so the back
 * button does not step through tabs; the default tab leaves the address bare.
 */
export const SettingsHub: React.FC<SettingsHubProps> = ({
  title,
  info,
  tabs,
  defaultTab,
  movedTabs,
  banner,
  colorScheme = 'slate',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');

  const select = useCallback(
    (tabId: string) => {
      const next = new URLSearchParams(searchParams);
      if (tabId === defaultTab) next.delete('tab');
      else next.set('tab', tabId);
      setSearchParams(next, { replace: true });
    },
    [defaultTab, searchParams, setSearchParams]
  );

  const moved = requested ? movedTabs?.[requested] : undefined;
  if (moved) return <Navigate to={moved} replace />;

  const active = tabs.find((tab) => tab.id === requested) ?? tabs.find((tab) => tab.id === defaultTab) ?? tabs[0];

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={title}
        info={info}
        tabs={tabs.map(({ id, label, icon }) => ({ id, label, icon }))}
        activeTab={active?.id}
        onTabChange={select}
        variant="compact"
        colorScheme={colorScheme}
      >
        {banner}
        {active?.render()}
      </PageHeaderWithTabs>
    </div>
  );
};

export default SettingsHub;

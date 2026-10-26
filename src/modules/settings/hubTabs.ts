// ABOUTME: The hubs of Settings, by address: each hub's title, what it is for, and its tabs with their labels. The hubs build
// ABOUTME: themselves from it, the overview lists them from it, and the tests check every old-address redirect against it.

/** A line of text and the key it is translated under. The English here is what shows until a translation exists. */
export interface HubText {
  readonly key: string;
  readonly text: string;
}

export interface HubTab {
  readonly id: string;
  readonly label: HubText;
}

export interface HubSpec {
  readonly title: HubText;
  /** What the hub is for, in a line. */
  readonly info: HubText;
  readonly defaultTab: string;
  readonly tabs: readonly HubTab[];
}

const text = (key: string, value: string): HubText => ({ key, text: value });

export const SETTINGS_HUBS = {
  '/settings/school': {
    title: text('schoolPeople.title', 'School & People'),
    info: text(
      'schoolPeople.subtitle',
      'The school profile, the people who sign in and what they may do, the approval workflows, and who changed what'
    ),
    defaultTab: 'school-profile',
    tabs: [
      { id: 'school-profile', label: text('schoolPeople.tabs.profile', 'School Profile') },
      { id: 'users', label: text('schoolPeople.tabs.users', 'Users & Roles') },
      { id: 'workflows', label: text('schoolPeople.tabs.workflows', 'Workflows') },
      { id: 'audit', label: text('schoolPeople.tabs.audit', 'Audit Log') },
    ],
  },
  '/settings/modules': {
    title: text('modulesFeatures.title', 'Modules & Features'),
    info: text(
      'modulesFeatures.subtitle',
      'What this installation runs and shows: the modules, the features that can be switched, and the plugins'
    ),
    defaultTab: 'modules',
    tabs: [
      { id: 'modules', label: text('modulesFeatures.tabs.modules', 'Modules') },
      { id: 'features', label: text('modulesFeatures.tabs.features', 'Features') },
      { id: 'plugins', label: text('modulesFeatures.tabs.plugins', 'Plugins') },
    ],
  },
  '/settings/system': {
    title: text('dataSystem.title', 'Data & System'),
    info: text(
      'dataSystem.subtitle',
      "Where the school's data lives and how it is kept safe: the data layer, sync, backups, integrity checks and system health"
    ),
    defaultTab: 'data-layer',
    tabs: [
      { id: 'data-layer', label: text('dataSystem.tabs.dataLayer', 'Data Layer') },
      { id: 'sync', label: text('dataSystem.tabs.sync', 'Sync') },
      { id: 'backup', label: text('dataSystem.tabs.backup', 'Backup & Restore') },
      { id: 'integrity', label: text('dataSystem.tabs.integrity', 'Data Integrity') },
      { id: 'health', label: text('dataSystem.tabs.health', 'System Health') },
    ],
  },
} as const satisfies Record<string, HubSpec>;

export type SettingsHubPath = keyof typeof SETTINGS_HUBS;

/** The ids of the tabs one hub offers. */
export type SettingsTabId<Path extends SettingsHubPath> = (typeof SETTINGS_HUBS)[Path]['tabs'][number]['id'];

/** The ids of the tabs one hub offers, in order. */
export const tabIdsOf = (path: SettingsHubPath): string[] => SETTINGS_HUBS[path].tabs.map((tab) => tab.id);

/** The address of a tab: the hub's own address for its default tab, which leaves the address bare. */
export function tabAddress(path: SettingsHubPath, tabId: string): string {
  return tabId === SETTINGS_HUBS[path].defaultTab ? path : `${path}?tab=${tabId}`;
}

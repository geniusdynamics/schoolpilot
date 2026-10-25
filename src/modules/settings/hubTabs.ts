// ABOUTME: The tabs of each Settings hub, by the hub's address. A hub builds its row of tabs from its list, and the
// ABOUTME: tests check every old-address redirect against it, so a tab cannot be renamed without its redirects.

export const SETTINGS_HUBS = {
  '/settings/school': {
    defaultTab: 'school-profile',
    tabs: ['school-profile', 'users', 'workflows', 'audit'],
  },
  '/settings/modules': {
    defaultTab: 'modules',
    tabs: ['modules', 'features', 'plugins'],
  },
  '/settings/system': {
    defaultTab: 'data-layer',
    tabs: ['data-layer', 'sync', 'backup', 'integrity', 'health'],
  },
} as const;

export type SettingsHubPath = keyof typeof SETTINGS_HUBS;

/** The ids of the tabs one hub offers. */
export type SettingsTabId<Path extends SettingsHubPath> = (typeof SETTINGS_HUBS)[Path]['tabs'][number];

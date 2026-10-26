// ABOUTME: The Settings overview says what this installation is set up as - who can sign in, what runs, whether the school profile is
// ABOUTME: set, whether the browser keeps the data - from the real thing, and points at the hubs. It invents nothing and links nowhere dead.

import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // The default text with its {{placeholders}} filled in, as i18next does.
    t: (key: string, fallback?: string, options?: Record<string, unknown>) =>
      (typeof fallback === 'string' ? fallback : key).replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(options?.[name] ?? '')),
  }),
}));

const state = vi.hoisted(() => ({
  loading: { all: false, users: false } as Record<string, boolean>,
  users: [] as unknown[],
  schoolProfile: null as unknown,
  profileLoading: false,
  auditLogs: [] as unknown[],
  storage: { mode: 'opfs-sahpool', persisted: true } as { mode: string; persisted: boolean | null },
  modules: [] as unknown[],
  enabled: [] as string[],
}));

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({
    loading: state.loading,
    users: state.users,
    auditLogs: state.auditLogs,
  }),
}));

// The school profile is the school_details document the setup wizard writes. App data does not carry it.
vi.mock('@/hooks/useDatabaseDocument', () => ({
  useDatabaseDocument: (collection: string) => ({
    data: collection === 'school_details' ? state.schoolProfile : null,
    loading: state.profileLoading,
  }),
}));

vi.mock('@/services/database/SQLiteWASMProvider', () => ({
  getSQLiteStorageStatus: () => state.storage,
  subscribeSQLiteStorageStatus: () => () => undefined,
}));

vi.mock('@/core/moduleRegistry', () => ({
  moduleRegistry: {
    getAllMetadata: () => state.modules,
    getEnabledModules: () => state.enabled,
    getMetadata: (id: string) => (state.modules as Array<{ id: string }>).find((module) => module.id === id),
  },
}));

import { SETTINGS_HUBS, tabAddress, tabIdsOf, type SettingsHubPath } from '../../hubTabs';
import SettingsDashboardPage from '../SettingsDashboardPage';

const HUB_PATHS = Object.keys(SETTINGS_HUBS) as SettingsHubPath[];

const ADMIN = { id: 'u1', role_id: 'super_admin', is_active: 1 };
const TEACHER = { id: 'u2', role_id: 'teacher', is_active: 1 };
const LEFT = { id: 'u3', role_id: 'teacher', is_active: 0 };

const renderPage = () =>
  render(
    <MemoryRouter>
      <SettingsDashboardPage />
    </MemoryRouter>
  );

/** A metric tile: each of the four links somewhere, so it is the anchor around its label. */
const tile = (label: string) => screen.getByText(label).closest('a') as HTMLElement;

beforeEach(() => {
  state.loading = { all: false, users: false };
  state.users = [ADMIN, TEACHER, LEFT];
  state.schoolProfile = { name: 'Hillside Academy' };
  state.profileLoading = false;
  state.auditLogs = [];
  state.storage = { mode: 'opfs-sahpool', persisted: true };
  state.modules = [
    { id: 'administration', name: 'navigation:administration.title', version: '1.0.0' },
    {
      id: 'academics',
      name: 'navigation:academics.title',
      version: '1.0.0',
      dependencies: [{ moduleId: 'administration', version: '^1.0.0', required: true }],
    },
  ];
  state.enabled = ['administration', 'academics'];
});

describe('the Settings overview', () => {
  it('says how many logins can sign in, out of how many there are', () => {
    renderPage();

    expect(within(tile('Users')).getByText('2')).toBeTruthy();
    expect(within(tile('Users')).getByText(/3 accounts/i)).toBeTruthy();
  });

  it('says how many modules are running, and that none has a problem', () => {
    renderPage();

    expect(within(tile('Modules running')).getByText('2 of 2')).toBeTruthy();
    expect(within(tile('Modules running')).getByText(/no problems/i)).toBeTruthy();
  });

  it('says whether the school profile is set', () => {
    renderPage();
    expect(within(tile('School profile')).getByText('Set')).toBeTruthy();
  });

  it('says whether the browser keeps the data durably', () => {
    renderPage();
    expect(within(tile('Browser storage')).getByText('Durable')).toBeTruthy();
  });

  it('shows a school whose profile is not set, and says so', () => {
    state.schoolProfile = null;
    renderPage();

    expect(within(tile('School profile')).getByText('Not set')).toBeTruthy();
  });

  it('counts one login as one account, and several as accounts', () => {
    state.users = [ADMIN];
    const { unmount } = renderPage();
    expect(within(tile('Users')).getByText('1 account')).toBeTruthy();
    unmount();

    state.users = [ADMIN, TEACHER, LEFT];
    renderPage();
    expect(within(tile('Users')).getByText('3 accounts')).toBeTruthy();
  });

  it('counts one module with a problem as one, and several as problems', () => {
    state.enabled = ['academics'];
    const { unmount } = renderPage();
    expect(within(tile('Modules running')).getByText('1 with a problem')).toBeTruthy();
    unmount();

    state.modules = [
      ...state.modules,
      {
        id: 'library',
        name: 'navigation:library.title',
        version: '1.0.0',
        dependencies: [{ moduleId: 'administration', version: '^1.0.0', required: true }],
      },
    ];
    state.enabled = ['academics', 'library'];
    renderPage();
    expect(within(tile('Modules running')).getByText('2 with problems')).toBeTruthy();
  });
});

describe('what needs attention', () => {
  it('says nothing needs attention when the installation is in order', () => {
    renderPage();

    expect(screen.getByText(/nothing needs attention/i)).toBeTruthy();
  });

  it('says no administrator can sign in, with a link to the users', () => {
    state.users = [TEACHER, LEFT];
    renderPage();

    const item = screen.getByRole('link', { name: /no administrator can sign in/i });
    expect(item.getAttribute('href')).toBe('/settings/school?tab=users');
  });

  it('says the browser is not keeping the data safely, with a link to System Health', () => {
    state.storage = { mode: 'memory', persisted: null };
    renderPage();

    const item = screen.getByRole('link', { name: /browser storage is not safe/i });
    expect(item.getAttribute('href')).toBe('/settings/system?tab=health');
  });

  it('says the school profile is not set, with a link to it', () => {
    state.schoolProfile = null;
    renderPage();

    expect(screen.getByRole('link', { name: /school profile is not set/i }).getAttribute('href')).toBe('/settings/school');
  });

  it('says modules have problems, with a link to the modules', () => {
    state.enabled = ['academics'];
    renderPage();

    expect(screen.getByRole('link', { name: /modules with problems/i }).getAttribute('href')).toBe('/settings/modules');
  });
});

describe('the hubs', () => {
  it.each(HUB_PATHS)('offers %s, with a link to each of its tabs', (path) => {
    renderPage();

    const hub = screen.getByTestId(`hub-${path}`);
    expect(within(hub).getByRole('link', { name: SETTINGS_HUBS[path].title.text }).getAttribute('href')).toBe(path);
    for (const tab of SETTINGS_HUBS[path].tabs) {
      expect(within(hub).getByRole('link', { name: tab.label.text }).getAttribute('href')).toBe(tabAddress(path, tab.id));
    }
  });

  it('links only to places that exist: a Settings hub, or a tab that hub has', () => {
    renderPage();

    const valid = new Set<string>(['/settings']);
    for (const path of HUB_PATHS) {
      valid.add(path);
      for (const id of tabIdsOf(path)) valid.add(tabAddress(path, id));
    }

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href') ?? '');
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(valid.has(href), `a link to ${href}`).toBe(true);
  });
});

describe('recent activity', () => {
  it('shows what the audit log recorded, the newest first, and no more than five', () => {
    state.auditLogs = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
      id: `log-${n}`,
      action: 'UPDATE',
      table_name: `table_${n}`,
      changed_at: `2026-10-0${n}T10:00:00.000Z`,
    }));
    renderPage();

    const entries = screen.getAllByTestId('recent-activity-entry').map((entry) => entry.textContent ?? '');
    expect(entries).toHaveLength(5);
    expect(entries[0]).toContain('table_7');
    expect(entries[4]).toContain('table_3');
  });

  it('says so when nothing has been recorded, rather than showing made-up entries', () => {
    renderPage();

    expect(screen.getByText(/no activity recorded yet/i)).toBeTruthy();
    expect(screen.queryByText(/minutes ago|hours ago|days ago/i)).toBeNull();
  });
});

describe('what it does not claim', () => {
  it('has no status that is the same whatever the installation', () => {
    renderPage();

    expect(screen.queryByText(/all systems active/i)).toBeNull();
    expect(screen.queryByText('Operational')).toBeNull();
  });

  it('shows a spinner while the logins load, and no figures', () => {
    state.loading = { all: false, users: true };
    renderPage();

    expect(screen.queryByText('Users')).toBeNull();
  });

  it('waits for the school profile before saying whether it is set, instead of saying it is not', () => {
    state.schoolProfile = null;
    state.profileLoading = true;
    renderPage();

    expect(screen.queryByText('Not set')).toBeNull();
    expect(screen.queryByText('School profile')).toBeNull();
  });
});


import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import { getStoredRouteFromSession, useRoutePersistence } from '../useRoutePersistence';

const KEY_ROUTE = 'currentRoute';
const KEY_VISIT = 'lastVisitTimestamp';

const HookHarness = ({ enabled }: { enabled?: boolean }) => {
  useRoutePersistence(enabled);
  return null;
};

describe('useRoutePersistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns valid stored route when timestamp is fresh', () => {
    sessionStorage.setItem(KEY_ROUTE, '/academics/students');
    sessionStorage.setItem(KEY_VISIT, Date.now().toString());

    expect(getStoredRouteFromSession()).toBe('/academics/students');
  });

  it('clears and rejects expired stored route', () => {
    sessionStorage.setItem(KEY_ROUTE, '/finance/reports');
    sessionStorage.setItem(KEY_VISIT, (Date.now() - 31 * 60 * 1000).toString());

    expect(getStoredRouteFromSession()).toBeNull();
    expect(sessionStorage.getItem(KEY_ROUTE)).toBeNull();
    expect(sessionStorage.getItem(KEY_VISIT)).toBeNull();
  });

  it('does not persist route when disabled', async () => {
    render(
      <MemoryRouter initialEntries={['/settings/database']}>
        <HookHarness enabled={false} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(sessionStorage.getItem(KEY_ROUTE)).toBeNull();
    });
  });
});

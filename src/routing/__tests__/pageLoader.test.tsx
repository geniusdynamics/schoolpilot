// ABOUTME: The route table resolves a page's component every time it renders. The component must be the same one each time:
// ABOUTME: a new one is a new component type, so React unmounts the page on screen and mounts it again whenever the routes render.

import { Suspense, lazy, useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { getPageComponent, lazyPage } from '../pageLoader';

describe('lazyPage', () => {
  const pageOf = () => ({ default: () => <p>a page</p> });

  it('gives the same component for the same loader, however often it is asked', () => {
    const load = async () => pageOf();

    expect(lazyPage(load)).toBe(lazyPage(load));
  });

  it('gives each loader its own component', () => {
    expect(lazyPage(async () => pageOf())).not.toBe(lazyPage(async () => pageOf()));
  });
});

describe('getPageComponent', () => {
  it('returns the same component for the same page each time the routes ask', () => {
    const navigationItem = { page: 'SettingsDashboardPage', path: '/settings' };

    const first = getPageComponent(navigationItem);
    const second = getPageComponent({ ...navigationItem });

    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  it('still returns nothing for a page that does not exist', () => {
    expect(getPageComponent({ page: 'NoSuchPageAnywhere', path: '/settings/nothing' })).toBeNull();
  });
});

describe('a route table that resolves its pages while it renders', () => {
  const Counting = vi.fn();
  const Page: React.FC = () => {
    useEffect(() => {
      Counting();
    }, []);
    return <p>the page</p>;
  };
  const load = async () => ({ default: Page });

  it('keeps the page mounted when it renders again, with the cached component', async () => {
    Counting.mockClear();
    const Routes: React.FC = () => {
      const Resolved = lazyPage(load);
      return (
        <Suspense fallback={<p>loading</p>}>
          <Resolved />
        </Suspense>
      );
    };

    const { rerender } = render(<Routes />);
    await screen.findByText('the page');
    // React runs a mounted effect twice in development (strict mode), so what is counted is the mounts
    // that rendering again adds.
    const afterMounting = Counting.mock.calls.length;
    rerender(<Routes />);
    rerender(<Routes />);

    expect(screen.getByText('the page')).toBeTruthy();
    expect(Counting).toHaveBeenCalledTimes(afterMounting);
  });

  it('remounts the page each time when the component is made anew on every render - the fault the cache removes', async () => {
    Counting.mockClear();
    const Routes: React.FC = () => {
      const Resolved = lazy(load);
      return (
        <Suspense fallback={<p>loading</p>}>
          <Resolved />
        </Suspense>
      );
    };

    const { rerender } = render(<Routes />);
    await screen.findByText('the page');
    const afterMounting = Counting.mock.calls.length;
    rerender(<Routes />);

    // The old page stays in the document, hidden, while the new one loads, so the proof is the new mount.
    await waitFor(() => expect(Counting.mock.calls.length).toBeGreaterThan(afterMounting));
  });
});

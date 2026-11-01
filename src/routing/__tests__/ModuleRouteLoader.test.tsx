// ABOUTME: A route into a module that is not loaded yet is loading, not broken: the loader shows the
// ABOUTME: spinner from its first paint instead of "Module Not Available" while the import runs.

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loader = vi.hoisted(() => ({
  isLoaded: vi.fn(() => false),
  load: vi.fn(),
}));

vi.mock('@/core/moduleLoader', () => ({ moduleLoader: loader }));

import { ModuleRouteLoader } from '../ModuleRouteLoader';

describe('ModuleRouteLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loader.isLoaded.mockReturnValue(false);
  });

  it('never tells the reader the module is unavailable while it is being loaded', async () => {
    let finish: (value: { success: boolean }) => void = () => undefined;
    loader.load.mockImplementation(
      () =>
        new Promise<{ success: boolean }>((resolve) => {
          finish = resolve;
        })
    );

    render(
      <ModuleRouteLoader moduleId="finance">
        <p>Finance page</p>
      </ModuleRouteLoader>
    );

    expect(screen.queryByText(/module is not loaded/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Loading finance module/i)).toBeInTheDocument();

    finish({ success: true });

    await waitFor(() => expect(screen.getByText('Finance page')).toBeInTheDocument());
  });

  it('renders the page at once when the module is already loaded', () => {
    loader.isLoaded.mockReturnValue(true);

    render(
      <ModuleRouteLoader moduleId="finance">
        <p>Finance page</p>
      </ModuleRouteLoader>
    );

    expect(screen.getByText('Finance page')).toBeInTheDocument();
    expect(loader.load).not.toHaveBeenCalled();
  });
});

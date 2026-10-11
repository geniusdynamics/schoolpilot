// ABOUTME: Tests the application entry point start-up order.
// ABOUTME: The unified configuration must be initialised from storage before the React tree renders.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: string[] = [];
let resolveConfigInit: () => void = () => undefined;

const render = vi.fn(() => {
  calls.push('render');
});

vi.mock('react-dom/client', () => ({
  default: { createRoot: () => ({ render }) },
  createRoot: () => ({ render }),
}));

vi.mock('../App', () => ({ default: () => null }));
vi.mock('../config/errorTracking', () => ({ initializeErrorTracking: () => undefined }));
vi.mock('../hooks/useTheme', () => ({ initializeTheme: () => undefined }));
vi.mock('../utils/devTools', () => ({ initializeDevTools: () => undefined }));
vi.mock('../i18n/i18n', () => ({
  initializeI18n: async () => {
    calls.push('i18n');
  },
}));

vi.mock('../config/unifiedConfig', () => ({
  initUnifiedConfig: () => {
    calls.push('initUnifiedConfig:start');
    return new Promise<void>((resolve) => {
      resolveConfigInit = () => {
        calls.push('initUnifiedConfig:done');
        resolve();
      };
    });
  },
  initializeUnifiedConfig: () => {
    calls.push('initializeUnifiedConfig');
  },
}));

describe('application bootstrap', () => {
  beforeEach(() => {
    calls.length = 0;
    render.mockClear();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('awaits initUnifiedConfig() before rendering the app', async () => {
    const { initializeApp } = await import('../index');

    const started = initializeApp();
    await new Promise((r) => setTimeout(r, 10));

    expect(calls).toContain('initUnifiedConfig:start');
    expect(render).not.toHaveBeenCalled();

    resolveConfigInit();
    await started;

    expect(render).toHaveBeenCalledTimes(1);
    expect(calls.indexOf('initUnifiedConfig:done')).toBeLessThan(calls.indexOf('render'));
    expect(calls.indexOf('initUnifiedConfig:done')).toBeLessThan(calls.indexOf('initializeUnifiedConfig'));
  });
});

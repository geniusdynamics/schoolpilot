// ABOUTME: Tests the restore's single-tab guard against a lock manager with Web Locks semantics:
// ABOUTME: alone the work runs, with another tab open it is refused, and the tab's own lock comes back.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Mode = 'shared' | 'exclusive';
interface Holder {
  mode: Mode;
}

/** A single-name lock manager with the shared/exclusive and ifAvailable rules of the Web Locks API. */
function createLockManager() {
  const holders: Holder[] = [];
  const waiting: (() => void)[] = [];
  const conflicts = (mode: Mode) =>
    holders.length > 0 && (mode === 'exclusive' || holders.some((holder) => holder.mode === 'exclusive'));
  const wake = () => waiting.splice(0).forEach((retry) => retry());

  const request = (
    _name: string,
    options: { mode: Mode; ifAvailable?: boolean },
    callback: (lock: { mode: Mode } | null) => Promise<unknown>
  ): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const attempt = () => {
        if (conflicts(options.mode)) {
          if (options.ifAvailable) {
            callback(null).then(resolve, reject);
          } else {
            waiting.push(attempt);
          }
          return;
        }
        const holder = { mode: options.mode };
        holders.push(holder);
        callback({ mode: options.mode })
          .finally(() => {
            holders.splice(holders.indexOf(holder), 1);
            wake();
          })
          .then(resolve, reject);
      };
      attempt();
    });

  return { request, holders };
}

describe('runAsOnlyTab', () => {
  let locks: ReturnType<typeof createLockManager>;

  beforeEach(() => {
    vi.resetModules();
    locks = createLockManager();
    vi.stubGlobal('navigator', { locks });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('runs the work when this is the only tab', async () => {
    const { holdAppTabLock, runAsOnlyTab } = await import('../tabLock');
    holdAppTabLock();

    await expect(runAsOnlyTab(async () => 'restored')).resolves.toBe('restored');
    // The tab holds its shared lock again afterwards.
    expect(locks.holders).toEqual([{ mode: 'shared' }]);
  });

  it('lets its own lock go even when it was not granted yet (another tab held it exclusively)', async () => {
    const { holdAppTabLock, runAsOnlyTab } = await import('../tabLock');
    let finishOther: () => void = () => undefined;
    void locks.request(
      'schoolpilot-app-tab',
      { mode: 'exclusive' },
      () => new Promise<void>((resolve) => (finishOther = resolve))
    );
    holdAppTabLock();

    const running = runAsOnlyTab(async () => 'recovered');
    finishOther();

    await expect(
      Promise.race([running, new Promise((_, reject) => setTimeout(() => reject(new Error('hung')), 1000))])
    ).resolves.toBe('recovered');
  });

  it('refuses while another tab holds the shared lock, and keeps this tab registered', async () => {
    const { holdAppTabLock, OtherTabsOpenError, runAsOnlyTab } = await import('../tabLock');
    // The other tab: a shared holder this module does not own.
    void locks.request('schoolpilot-app-tab', { mode: 'shared' }, () => new Promise(() => undefined));
    holdAppTabLock();
    const work = vi.fn(async () => 'restored');

    await expect(runAsOnlyTab(work)).rejects.toBeInstanceOf(OtherTabsOpenError);
    expect(work).not.toHaveBeenCalled();
    expect(locks.holders).toEqual([{ mode: 'shared' }, { mode: 'shared' }]);
  });
});

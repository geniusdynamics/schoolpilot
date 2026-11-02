// ABOUTME: The single-tab guard for a restore: every app tab holds a shared Web Lock for its lifetime,
// ABOUTME: and a restore runs only when it can take that lock exclusively, i.e. no other tab is open.

/** The lock every open SchoolPilot tab holds in shared mode. */
export const APP_TAB_LOCK = 'schoolpilot-app-tab';

/** Another tab of the app is open, so the databases cannot be replaced safely. */
export class OtherTabsOpenError extends Error {
  constructor() {
    super('SchoolPilot is open in another tab or window. Close every other SchoolPilot tab, then restore again.');
    this.name = 'OtherTabsOpenError';
  }
}

interface HeldLock {
  release: () => void;
  /** Settles once the lock manager has let the lock go. */
  released: Promise<unknown>;
}

let held: HeldLock | null = null;

function lockManager(): LockManager | null {
  return typeof navigator !== 'undefined' && navigator.locks ? navigator.locks : null;
}

/**
 * Hold the shared tab lock until the page goes away. Called once at start-up; it never blocks
 * the app - the request waits in the background while a restore in another tab holds the lock.
 */
export function holdAppTabLock(): void {
  const locks = lockManager();
  if (!locks || held) return;
  let release: () => void = () => undefined;
  const released = locks.request(
    APP_TAB_LOCK,
    { mode: 'shared' },
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      })
  );
  held = { release: () => release(), released };
  // A rejected request (the page unloading) must not surface as an unhandled rejection.
  released.catch(() => undefined);
}

/**
 * Run `work` as the only open tab of the app.
 *
 * The OPFS file pools are exclusive per origin, and another tab would keep writing its stale
 * copy of the data over a restore. This tab lets its own shared lock go, then asks for the lock
 * exclusively without waiting: granted only when no other tab holds it. On failure, or when
 * `work` throws, the shared lock is taken again; on success the caller reloads the page.
 */
export async function runAsOnlyTab<T>(work: () => Promise<T>): Promise<T> {
  const locks = lockManager();
  if (!locks) {
    throw new Error('This browser cannot tell whether SchoolPilot is open in another tab (Web Locks are unavailable), so it cannot restore here.');
  }

  if (held) {
    const previous = held;
    held = null;
    previous.release();
    await previous.released;
  }

  try {
    return await locks.request(APP_TAB_LOCK, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
      if (!lock) throw new OtherTabsOpenError();
      return work();
    });
  } finally {
    // After a successful restore the page reloads; until then, and after any failure, this tab
    // holds its shared lock again like every other tab.
    holdAppTabLock();
  }
}

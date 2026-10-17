// ABOUTME: Whether school setup is complete: school_details.setup_completed_at in the database is preferred,
// ABOUTME: with the browser's legacy onboarding flag as the fallback for databases set up before the column existed.

import { databaseService } from '@/services/database/databaseService';
import { logger } from '@/utils/logging';

/** How long the gate waits for the database before falling back to the legacy flag. */
const READ_TIMEOUT_MS = 4000;

/** The completion time recorded by the setup wizard, or null when it is unset or cannot be read. */
export async function readSetupCompletedAt(timeoutMs: number = READ_TIMEOUT_MS): Promise<string | null> {
  const read = (async () => {
    const db = await databaseService.getDatabase();
    const rows = ((await db.getCollection('school_details')?.find({})) ?? []) as Array<{ setup_completed_at?: unknown }>;
    const value = rows.find((row) => row.setup_completed_at)?.setup_completed_at;
    return typeof value === 'string' && value ? value : null;
  })();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    return await Promise.race([read, timeout]);
  } catch (error) {
    logger.warn('[setupStatus] could not read setup completion from the database:', error);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Setup is complete when the database says so; otherwise the legacy browser flag decides. */
export function isSetupComplete(completedAt: string | null | undefined, legacyFlag: boolean): boolean {
  return Boolean(completedAt) || legacyFlag;
}

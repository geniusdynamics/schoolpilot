// ABOUTME: The message a restore leaves for the reloaded app: kept in this tab's sessionStorage
// ABOUTME: across the reload, and taken (read once, then removed) by the app when it starts.

const NOTICE_KEY = 'schoolpilot.backup.notice';

export type RestoreNotice =
  /** The backup replaced the data; `school` is the name its manifest records. */
  | { readonly kind: 'restored'; readonly school: string | null }
  /** The restore failed and the previous data was put back. */
  | { readonly kind: 'rolledBack'; readonly message: string }
  /** The start found an interrupted restore and put the previous data back. */
  | { readonly kind: 'recovered'; readonly startedAt: string };

/** Leave a notice for the app the next reload starts. */
export function rememberRestoreNotice(notice: RestoreNotice): void {
  try {
    sessionStorage.setItem(NOTICE_KEY, JSON.stringify(notice));
  } catch {
    // Without sessionStorage the reloaded app simply shows no message; the data is unaffected.
  }
}

/** The notice left for this start, removed so it is shown once. */
export function takeRestoreNotice(): RestoreNotice | null {
  try {
    const stored = sessionStorage.getItem(NOTICE_KEY);
    sessionStorage.removeItem(NOTICE_KEY);
    return stored ? (JSON.parse(stored) as RestoreNotice) : null;
  } catch {
    return null;
  }
}

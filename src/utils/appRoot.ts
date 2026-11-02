// ABOUTME: Holds the React root the app is rendered into, so a fatal state (a restore that could not
// ABOUTME: be undone) can replace the whole app - its routes, menus and pages - with one screen.

import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';

let appRoot: Root | null = null;

/** Called once by the entry point after it creates the root. */
export function setAppRoot(root: Root): void {
  appRoot = root;
}

/**
 * Render `node` in place of the whole app. Everything the app had mounted is unmounted, so no
 * page, menu or route remains to act on data that may be incomplete.
 */
export function replaceAppWith(node: ReactNode): void {
  if (!appRoot) throw new Error('The app root is not set; the entry point must call setAppRoot');
  appRoot.render(node);
}

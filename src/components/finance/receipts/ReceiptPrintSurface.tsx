// ABOUTME: Mounts a receipt on `document.body` through a portal, so the print entry point can remove
// ABOUTME: the app shell from pagination while the receipt itself stays in the layout.

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * The portal is the whole point: the print entry point sets `data-printing` on `<html>` and the
 * print stylesheet hides `#root`, so a receipt rendered inside `#root` would be hidden with it.
 * Anything mounted here prints on its own.
 */
export function ReceiptPrintSurface({ children }: { children: ReactNode }): ReactNode {
  if (typeof document === 'undefined') return null;
  return createPortal(<div className="receipt-print-surface">{children}</div>, document.body);
}

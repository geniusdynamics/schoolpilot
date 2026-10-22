// ABOUTME: Mounts a report document on `document.body` through a portal, so printing can remove the app
// ABOUTME: shell from pagination while the document itself stays in the layout.

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * The portal is the whole point: `html[data-printing] #root { display: none }` hides the app, and a
 * document rendered *inside* `#root` would be hidden with it. Anything mounted here prints on its own.
 */
export function ReportPrintSurface({ children }: { children: ReactNode }): ReactNode {
  if (typeof document === 'undefined') return null;
  return createPortal(<div className="report-print-surface">{children}</div>, document.body);
}

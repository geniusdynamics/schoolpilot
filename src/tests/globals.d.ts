// ABOUTME: Ambient global declarations for testing-library helpers exposed in src/tests/setup.ts
// ABOUTME: Lets the suite use render/screen/fireEvent/waitFor/within globally under vitest globals:true

import type { render as _render, fireEvent as _fireEvent, waitFor as _waitFor, within as _within, act as _domAct } from '@testing-library/react';
import type { act as _reactAct } from 'react';

declare global {
  // eslint-disable-next-line no-var
  var render: typeof _render;
  // NOTE: `screen` is intentionally NOT declared here — it collides with the DOM lib's
  // built-in `var screen: Screen`. It is assigned at runtime in setup.ts.
  // eslint-disable-next-line no-var
  var fireEvent: typeof _fireEvent;
  // eslint-disable-next-line no-var
  var waitFor: typeof _waitFor;
  // eslint-disable-next-line no-var
  var within: typeof _within;
  // eslint-disable-next-line no-var
  var domAct: typeof _domAct;
  // eslint-disable-next-line no-var
  var act: typeof _reactAct;
}

export {};

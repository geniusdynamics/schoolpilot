// ABOUTME: Main entry point of the React application.
// ABOUTME: Initializes React DOM and renders the root App component with providers.

// Initialize error tracking first, before any other imports
import { initializeErrorTracking } from './config/errorTracking';
initializeErrorTracking();

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeI18n } from './i18n/i18n'; // Import your i18n configuration
import { initUnifiedConfig, initializeUnifiedConfig } from './config/unifiedConfig';
import { initializeTheme } from './hooks/useTheme';
import { performanceEventManager } from './services/performance/performanceEventManager';
import { logger } from './utils/logging';
import { initializeDevTools } from './utils/devTools';
import { holdAppTabLock } from './data/backup/tabLock';
import { recoverOnStartup } from './data/backup/startupRecovery';
import { setAppRoot } from './utils/appRoot';
import { showRestoreRecoveryScreen } from './components/RestoreRecoveryScreen';

// Every open tab registers itself, so a backup restore can tell whether it is the only one.
holdAppTabLock();

// Apply the theme before first paint. While dark mode is disabled
// (DARK_MODE_ENABLED=false in hooks/useTheme) this forces light mode, drops any
// stray 'dark' class and clears a previously stored dark/system preference.
initializeTheme();

// Load the persisted configuration and wait for i18n before rendering
export const initializeApp = async () => {
  performanceEventManager.markDiagnostic('app_initialize_start', {
    href: window.location.href
  });

  // The unified configuration manager is the single source of truth for dataMode;
  // it must be hydrated from storage before any provider reads it.
  try {
    await initUnifiedConfig();
  } catch (error) {
    logger.warn('⚠️ Unified configuration initialization failed, continuing with defaults:', error);
  }
  initializeUnifiedConfig();

  try {
    // Wait for i18n to be ready
    await initializeI18n();
    logger.info('✅ i18n initialized successfully');
  } catch (error) {
    performanceEventManager.markDiagnostic('app_initialize_i18n_failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    logger.warn('⚠️ i18n initialization failed, continuing with fallback:', error);
  }
  
  // Render the app after i18n is ready, unless a restore was interrupted: that is decided before
  // anything opens a database, and a failed recovery shows one screen instead of the app.
  await startAfterRestoreRecovery();
};

/**
 * Undo an interrupted restore, then render. The check runs before `renderApp`, so no provider has
 * opened either database and no page has read anything; a failure renders one blocking screen and
 * stops, because the app would otherwise present half-restored data as the school.
 */
const startAfterRestoreRecovery = async () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Could not find root element to mount to');
  }
  const root = ReactDOM.createRoot(rootElement);
  setAppRoot(root);

  let outcome: Awaited<ReturnType<typeof recoverOnStartup>>;
  try {
    outcome = await recoverOnStartup();
  } catch (error) {
    logger.error('The interrupted-restore check failed:', error);
    outcome = {
      status: 'failed',
      safetyCopy: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  if (outcome.status === 'failed') {
    showRestoreRecoveryScreen({
      reason: 'interruptedRestore',
      safetyCopy: outcome.safetyCopy,
      error: outcome.error,
    });
    return;
  }
  renderApp(root);
};

const renderApp = (root: ReactDOM.Root) => {
  performanceEventManager.markDiagnostic('app_render_start', {
    href: window.location.href
  });
  // Add global debug helpers
  initializeDevTools();

  root.render(
    <React.StrictMode>
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] w-12 h-12 border-4 text-indigo-600" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                Loading...
              </span>
            </div>
            <p className="mt-4 text-surface-muted-fg">Loading translations...</p>
          </div>
        </div>
      }>
        <App />
      </Suspense>
    </React.StrictMode>
  );
};

// Initialize the app only if not in test environment
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  initializeApp();
}

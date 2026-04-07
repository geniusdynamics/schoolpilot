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
import { initializeUnifiedConfig } from './config/unifiedConfig';
import { performanceEventManager } from './services/performance/performanceEventManager';
import { logger } from './utils/logging';
import { initializeDevTools } from './utils/devTools';

// Initialize unified configuration
initializeUnifiedConfig();

// Wait for i18n to be ready before rendering
const initializeApp = async () => {
  performanceEventManager.markDiagnostic('app_initialize_start', {
    href: window.location.href
  });
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
  
  // Render the app after i18n is ready
  renderApp();
};

const renderApp = () => {
  performanceEventManager.markDiagnostic('app_render_start', {
    href: window.location.href
  });
  // Add global debug helpers
  initializeDevTools();

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
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
            <p className="mt-4 text-gray-600">Loading translations...</p>
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

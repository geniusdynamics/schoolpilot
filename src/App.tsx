// ABOUTME: Main application entry point — provider hierarchy only
// ABOUTME: All routing logic lives in src/routing/; this file wires providers around AppInner

import React, { Suspense } from 'react';
import { UnifiedConfigProvider } from './contexts/UnifiedConfigContext';
import { ToastProvider } from './hooks/useToast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { OnboardingGate } from './components/OnboardingGate';
import Spinner from './components/ui/Spinner';
import { AppInner } from './routing';

// ─────────────────────────────────────────────
// App
// ─────────────────────────────────────────────

/**
 * Root App component.
 *
 * Provider hierarchy (outermost → innermost):
 *   UnifiedConfigProvider  — unified app config (theme, features, environment)
 *   ToastProvider          — global toast notifications
 *   ConfirmProvider        — imperative confirmation dialogs (replaces window.confirm)
 *   Suspense               — i18n translation loading boundary
 *   OnboardingGate         — blocks render until onboarding is complete
 *   AppInner               — module init, AppProviders, AppContent, routing
 */
const App: React.FC = () => {
  return (
    <UnifiedConfigProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                  <Spinner size="lg" />
                  <p className="mt-4 text-surface-muted-fg">Loading translations...</p>
                </div>
              </div>
            }
          >
            <OnboardingGate>
              <AppInner />
            </OnboardingGate>
          </Suspense>
        </ConfirmProvider>
      </ToastProvider>
    </UnifiedConfigProvider>
  );
};

export default App;

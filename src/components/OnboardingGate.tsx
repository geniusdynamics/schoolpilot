// ABOUTME: Application entry gate: shows first-run onboarding until setup is complete, preferring
// ABOUTME: school_details.setup_completed_at from an existing production database over the legacy browser flag.

import { logger } from '@/utils/logging';

/**
 * OnboardingGate - Application entry point that shows onboarding for first-time users
 *
 * Wraps the entire application and intercepts first-time users to guide them
 * through the demo vs production setup flow.
 */

import React, { useState, useEffect } from 'react';
import { FirstRunOnboarding, shouldShowOnboarding } from '@/components/FirstRunOnboarding';
import { isSetupComplete, readSetupCompletedAt } from '@/components/setup/steps/setupStatus';
import { getStoredDataMode } from '@/config/dataModePolicies';

interface OnboardingGateProps {
  children: React.ReactNode;
}

export const OnboardingGate: React.FC<OnboardingGateProps> = ({ children }) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        // If user already has a valid auth session, don't block with onboarding
        const hasSession = (() => {
          try { return !!localStorage.getItem('schoolpilot_auth_session'); } catch { return false; }
        })();
        if (hasSession) {
          setShowOnboarding(false);
          return;
        }
        // Allow URL bypass: ?skipOnboarding=1 or #skipOnboarding
        const bypass = window.location.search.includes('skipOnboarding') || window.location.hash.includes('skipOnboarding');
        if (bypass) {
          setShowOnboarding(false);
          return;
        }
        const legacyComplete = !shouldShowOnboarding();
        // A production database already exists: its school_details.setup_completed_at is preferred. A fresh
        // install (no stored data mode) never opens a database here, so onboarding can still choose the provider.
        const completedAt = !legacyComplete && getStoredDataMode() === 'production'
          ? await readSetupCompletedAt()
          : null;
        setShowOnboarding(!isSetupComplete(completedAt, legacyComplete));
      } catch {
        setShowOnboarding(false);
      } finally {
        setIsChecking(false);
      }
    };

    check();
  }, []);

  const handleOnboardingComplete = (path: 'demo' | 'production') => {
    logger.info(`[OnboardingGate] User completed onboarding via ${path} pathway`);
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    logger.info('[OnboardingGate] User skipped onboarding');
    setShowOnboarding(false);
  };

  // While checking, show minimal loading
  if (isChecking) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          <p className="text-surface-muted-fg">Loading SchoolPilot...</p>
        </div>
      </div>
    );
  }

  // Show onboarding for first-time users
  if (showOnboarding) {
    return (
      <FirstRunOnboarding
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  // Show the actual application
  return <>{children}</>;
};

export default OnboardingGate;

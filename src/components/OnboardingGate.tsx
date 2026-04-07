/**
 * OnboardingGate - Application entry point that shows onboarding for first-time users
 *
 * Wraps the entire application and intercepts first-time users to guide them
 * through the demo vs production setup flow.
 */

import React, { useState, useEffect } from 'react';
import { FirstRunOnboarding, shouldShowOnboarding } from '@/components/FirstRunOnboarding';

interface OnboardingGateProps {
  children: React.ReactNode;
}

export const OnboardingGate: React.FC<OnboardingGateProps> = ({ children }) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check onboarding status on mount
    const check = async () => {
      try {
        const needsOnboarding = shouldShowOnboarding();
        setShowOnboarding(needsOnboarding);
      } catch {
        // If check fails, don't show onboarding to avoid blocking the app
        setShowOnboarding(false);
      } finally {
        setIsChecking(false);
      }
    };

    check();
  }, []);

  const handleOnboardingComplete = (path: 'demo' | 'production') => {
    console.log(`[OnboardingGate] User completed onboarding via ${path} pathway`);
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    console.log('[OnboardingGate] User skipped onboarding');
    setShowOnboarding(false);
  };

  // While checking, show minimal loading
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-600">Loading SchoolPilot...</p>
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

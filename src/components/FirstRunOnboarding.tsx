import { logger } from '@/utils/logging';

/**
 * FirstRunOnboarding - Guides first-time users through initial setup
 *
 * Two clear pathways:
 * 1. Production mode - Go directly to production with environment-appropriate defaults
 * 2. Demo mode - Load demo data to explore, then transition to production
 *
 * After demo data is cleared for production transition, re-seeding is disabled
 * to maintain data integrity.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Database, PlayCircle, ArrowRight, CheckCircle, AlertTriangle, Shield, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';
import { UnifiedDatabaseManager } from '@/services/database/UnifiedDatabaseManager';
import { CapabilityDetector } from '@/services/database/detection/CapabilityDetector';
import type { CapabilityReport } from '@/services/database/detection/CapabilityDetector';

// Onboarding state stored in localStorage
const ONBOARDING_KEY = 'schoolpilot_onboarding';
const DEMO_CLEARED_KEY = 'schoolpilot_demo_cleared_for_production';

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  completedAt: string | null;
  initialPath: 'demo' | 'production' | null;
}

export interface OnboardingCallbacks {
  onComplete?: (path: 'demo' | 'production') => void;
  onSkip?: () => void;
}

function loadOnboardingState(): OnboardingState {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore parse errors
  }
  return {
    hasCompletedOnboarding: false,
    completedAt: null,
    initialPath: null,
  };
}

function saveOnboardingState(state: OnboardingState): void {
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
}

function hasDemoBeenCleared(): boolean {
  return localStorage.getItem(DEMO_CLEARED_KEY) === 'true';
}

function markDemoAsCleared(): void {
  localStorage.setItem(DEMO_CLEARED_KEY, 'true');
}

/**
 * Environment defaults derived from CapabilityDetector
 */
interface EnvironmentDefaults {
  isElectron: boolean;
  isTauri: boolean;
  hasOPFS: boolean;
  hasWASM: boolean;
  recommendedPath: 'demo' | 'production';
  recommendedProvider: string;
}

function defaultsFromReport(report: CapabilityReport): EnvironmentDefaults {
  const isElectron = report.runtime.type === 'electron';
  const isTauri = report.runtime.type === 'tauri';
  const hasOPFS = report.storage.hasOPFS;
  const hasWASM = report.storage.hasWASM;
  const recommendedPath = (isElectron || isTauri || (hasOPFS && hasWASM)) ? 'production' : 'demo';
  // Map provider types to onboarding provider string
  const providerMap: Record<string, string> = {
    'sqlite-file': 'sqlite-file',
    'sqlite-wasm': 'sqlite-wasm',
    'pouchdb': 'pouchdb',
    'backend-api': 'backend-api',
    'hybrid': 'hybrid',
    'livestore': 'livestore',
    'rxdb': 'rxdb',
  };
  const recommendedProvider = isElectron ? 'sqlite-file' : hasOPFS ? 'sqlite-wasm' : 'pouchdb';

  return { isElectron, isTauri, hasOPFS, hasWASM, recommendedPath, recommendedProvider };
}

/**
 * FirstRunOnboarding component
 */
export const FirstRunOnboarding: React.FC<OnboardingCallbacks> = ({ onComplete, onSkip }) => {
  const { config, updateConfig } = useUnifiedConfig();
  const [step, setStep] = useState<'welcome' | 'choose' | 'confirm'>('welcome');
  const [selectedPath, setSelectedPath] = useState<'demo' | 'production' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [envDefaults, setEnvDefaults] = useState<EnvironmentDefaults | null>(null);

  // Detect environment on mount using centralized CapabilityDetector
  useEffect(() => {
    CapabilityDetector.getInstance().detectCapabilities().then((report) => {
      setEnvDefaults(defaultsFromReport(report));
    });
  }, []);

  // Auto-select recommended path
  useEffect(() => {
    if (step === 'choose' && !selectedPath && envDefaults) {
      setSelectedPath(envDefaults.recommendedPath);
    }
  }, [step, envDefaults?.recommendedPath, selectedPath]);

  const handleSelectPath = useCallback((path: 'demo' | 'production') => {
    setSelectedPath(path);
    setError(null);
  }, []);

  const handleProceed = useCallback(async () => {
    if (!selectedPath || !envDefaults) return;

    setIsProcessing(true);
    setError(null);

    try {
      const dbManager = UnifiedDatabaseManager.getInstance();

      if (selectedPath === 'production') {
        // Production pathway: set mode, apply defaults, initialize
        updateConfig({
          ...config,
          dataMode: 'production',
          demo: { ...config.demo, active: false },
          database: {
            ...config.database,
            provider: envDefaults.recommendedProvider as any,
            options: {
              ...config.database.options,
              storageType: envDefaults.isElectron ? 'file' : 'opfs',
            },
          },
        });

        // Mark onboarding complete
        saveOnboardingState({
          hasCompletedOnboarding: true,
          completedAt: new Date().toISOString(),
          initialPath: 'production',
        });

        // Reload to apply production configuration
        onComplete?.('production');
        setTimeout(() => window.location.reload(), 500);
      } else {
        // Demo pathway: seed demo data
        updateConfig({
          ...config,
          dataMode: 'demo',
          demo: { ...config.demo, active: true },
        });

        // Seed demo data – volume 'medium' now yields full 150+ students matching UI copy
        // VOLUME_FACTORS medium=1 (large=1) ensures "150+ sample students" claim is honoured
        try {
          await dbManager.seedDatabase({ volume: 'medium', dataMode: 'demo' });
        } catch (seedError) {
          logger.warn('[FirstRunOnboarding] Demo seeding failed, continuing anyway:', seedError);
          // Don't block onboarding on seeding failure
        }

        saveOnboardingState({
          hasCompletedOnboarding: true,
          completedAt: new Date().toISOString(),
          initialPath: 'demo',
        });

        onComplete?.('demo');
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
      setIsProcessing(false);
    }
  }, [selectedPath, config, updateConfig, envDefaults, onComplete]);

  const handleSkip = useCallback(() => {
    saveOnboardingState({
      hasCompletedOnboarding: true,
      completedAt: new Date().toISOString(),
      initialPath: null,
    });
    onSkip?.();
  }, [onSkip]);

  // Show loading state while environment detection is in progress
  if (!envDefaults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 space-y-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
            <Database className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to SchoolPilot 3</h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Detecting your environment...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  // Welcome step
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {/* Logo / Brand */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome to SchoolPilot 3</h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Let's set up your database. Choose how you'd like to get started.
            </p>
          </div>

          {/* Environment capabilities */}
          {showTechnical && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              <div className="font-medium text-gray-700">Detected Environment</div>
              <div className="grid grid-cols-2 gap-2 text-gray-600">
                <div>OPFS Storage: {envDefaults.hasOPFS ? 'Available' : 'Not available'}</div>
                <div>WebAssembly: {envDefaults.hasWASM ? 'Available' : 'Not available'}</div>
                <div>Electron: {envDefaults.isElectron ? 'Yes' : 'No'}</div>
                <div>Recommended: {envDefaults.recommendedProvider}</div>
              </div>
            </div>
          )}

          {/* Continue button */}
          <div className="flex justify-center">
            <Button
              onClick={() => setStep('choose')}
              className="px-8 py-3 text-lg"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          {/* Technical details toggle */}
          <div className="text-center">
            <button
              onClick={() => setShowTechnical(!showTechnical)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {showTechnical ? 'Hide' : 'Show'} technical details
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Choose pathway step
  if (step === 'choose') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Choose Your Setup Path</h2>
            <p className="text-gray-600">
              {envDefaults.recommendedPath === 'production'
                ? 'Your environment supports full production mode. You can also explore with demo data first.'
                : 'We recommend starting with demo data to explore the system.'}
            </p>
          </div>

          {/* Pathway cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Demo pathway */}
            <button
              onClick={() => handleSelectPath('demo')}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                selectedPath === 'demo'
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                  <PlayCircle className="w-5 h-5 text-green-600" />
                </div>
                {selectedPath === 'demo' && <CheckCircle className="w-5 h-5 text-green-600" />}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Explore with Demo Data</h3>
              <p className="text-sm text-gray-600 mb-4">
                Load realistic school data across all modules. Perfect for evaluating features and understanding workflows.
              </p>
              <ul className="space-y-1 text-sm text-gray-500">
                <li className="flex items-center"><CheckCircle className="w-3.5 h-3.5 mr-2 text-green-500" />150+ sample students</li>
                <li className="flex items-center"><CheckCircle className="w-3.5 h-3.5 mr-2 text-green-500" />Complete academic & finance data</li>
                <li className="flex items-center"><CheckCircle className="w-3.5 h-3.5 mr-2 text-green-500" />Library, HR, inventory modules</li>
                <li className="flex items-center"><CheckCircle className="w-3.5 h-3.5 mr-2 text-green-500" />Clear anytime to go production</li>
              </ul>
            </button>

            {/* Production pathway */}
            <button
              onClick={() => handleSelectPath('production')}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                selectedPath === 'production'
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                {selectedPath === 'production' && <CheckCircle className="w-5 h-5 text-blue-600" />}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Go Direct to Production</h3>
              <p className="text-sm text-gray-600 mb-4">
                Start with a clean database optimized for your environment. All data you enter will be persistent.
              </p>
              <ul className="space-y-1 text-sm text-gray-500">
                <li className="flex items-center"><Zap className="w-3.5 h-3.5 mr-2 text-blue-500" />{envDefaults.recommendedProvider} database</li>
                <li className="flex items-center"><Zap className="w-3.5 h-3.5 mr-2 text-blue-500" />Persistent local storage</li>
                <li className="flex items-center"><Zap className="w-3.5 h-3.5 mr-2 text-blue-500" />Offline-first architecture</li>
                <li className="flex items-center"><Zap className="w-3.5 h-3.5 mr-2 text-blue-500" />Ready for real data entry</li>
              </ul>
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleSkip}>
              Skip for now
            </Button>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => setStep('welcome')}>
                Back
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!selectedPath || isProcessing}
              >
                Continue
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation step
  if (step === 'confirm') {
    const isDemo = selectedPath === 'demo';

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full ${isDemo ? 'bg-green-100' : 'bg-blue-100'}`}>
            {isDemo ? (
              <PlayCircle className="w-7 h-7 text-green-600" />
            ) : (
              <Shield className="w-7 h-7 text-blue-600" />
            )}
          </div>

          {/* Confirmation message */}
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {isDemo ? 'Ready to Explore?' : 'Ready for Production?'}
            </h3>
            <p className="mt-2 text-gray-600">
              {isDemo
                ? 'We\'ll load demo data with 150+ students, classes, finance records, and more. You can clear this data anytime to start fresh with production mode.'
                : 'We\'ll initialize a clean database with your environment\'s optimal settings. All data you enter will be persistently stored.'}
            </p>
          </div>

          {/* Important note for demo */}
          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Important</p>
                  <p className="mt-1">
                    Once you clear demo data to transition to production, you won't be able to reload demo data. This prevents accidental data loss in production.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => setStep('choose')}>
              Back
            </Button>
            <Button
              onClick={handleProceed}
              disabled={isProcessing}
              className={isDemo ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Setting up...
                </>
              ) : (
                <>
                  {isDemo ? 'Load Demo Data' : 'Initialize Production'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Check if onboarding should be shown
 */
export function shouldShowOnboarding(): boolean {
  const state = loadOnboardingState();
  return !state.hasCompletedOnboarding;
}

/**
 * Get current onboarding state
 */
export function getOnboardingState(): OnboardingState {
  return loadOnboardingState();
}

/**
 * Check if demo data has been cleared (user transitioned to production)
 */
export function hasDemoBeenClearedForProduction(): boolean {
  return hasDemoBeenCleared();
}

/**
 * Mark that demo data was cleared for production transition
 */
export function markDemoClearedForProduction(): void {
  markDemoAsCleared();
}

/**
 * Get whether demo data re-seeding should be disabled
 */
export function isDemoReseedingDisabled(): boolean {
  return hasDemoBeenCleared();
}

export default FirstRunOnboarding;

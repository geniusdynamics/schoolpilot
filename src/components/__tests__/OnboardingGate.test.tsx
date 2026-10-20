// ABOUTME: Tests that the onboarding gate treats setup as complete when school_details.setup_completed_at is set,
// ABOUTME: and falls back to the browser's legacy onboarding flag when the database has no completion time.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// The onboarding flow itself is tested on its own; here it is a marker.
vi.mock('@/components/FirstRunOnboarding', () => ({
  FirstRunOnboarding: () => <div data-testid="onboarding">onboarding</div>,
  shouldShowOnboarding: () => {
    try {
      return !JSON.parse(localStorage.getItem('schoolpilot_onboarding') || '{}').hasCompletedOnboarding;
    } catch {
      return true;
    }
  },
}));

const status = vi.hoisted(() => ({ completedAt: null as string | null, reads: 0 }));
vi.mock('@/components/setup/steps/setupStatus', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    readSetupCompletedAt: async () => {
      status.reads++;
      return status.completedAt;
    },
  };
});

import { OnboardingGate } from '../OnboardingGate';

const renderGate = () => render(<OnboardingGate><div data-testid="app">app</div></OnboardingGate>);

describe('OnboardingGate', () => {
  beforeEach(() => {
    localStorage.clear();
    status.completedAt = null;
    status.reads = 0;
  });

  it('opens the app when the database records that setup was completed, even without the legacy flag', async () => {
    localStorage.setItem('unified_app_config', JSON.stringify({ dataMode: 'production' }));
    status.completedAt = '2026-10-17T08:00:00.000Z';
    renderGate();
    expect(await screen.findByTestId('app')).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding')).not.toBeInTheDocument();
  });

  it('shows onboarding when neither the database nor the legacy flag says setup is complete', async () => {
    localStorage.setItem('unified_app_config', JSON.stringify({ dataMode: 'production' }));
    renderGate();
    expect(await screen.findByTestId('onboarding')).toBeInTheDocument();
    expect(status.reads).toBeGreaterThan(0);
  });

  it('falls back to the legacy flag and does not open a database on a fresh install', async () => {
    renderGate();
    expect(await screen.findByTestId('onboarding')).toBeInTheDocument();
    expect(status.reads).toBe(0);
  });

  it('keeps honouring the legacy flag when the database has no completion time', async () => {
    localStorage.setItem('schoolpilot_onboarding', JSON.stringify({ hasCompletedOnboarding: true }));
    renderGate();
    expect(await screen.findByTestId('app')).toBeInTheDocument();
  });
});

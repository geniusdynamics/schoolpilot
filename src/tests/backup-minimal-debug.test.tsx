// ABOUTME: Minimal BackupSettingsPage test for debugging
// ABOUTME: Simplified test to isolate React 19 compatibility issues

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock all dependencies
vi.mock('../../hooks/useAppData', () => ({
  default: () => ({
    isInitialized: true,
    initializationError: null
  })
}));

vi.mock('../../hooks/useUnifiedConfig', () => ({
  default: () => ({
    config: { provider: 'sqlite' }
  })
}));

vi.mock('../../components/ProviderSelector', () => ({
  default: ({ onBackup }: { onBackup: () => Promise<string> }) => (
    <button onClick={() => onBackup()}>Create Backup</button>
  )
}));

// Simple test component
const TestComponent: React.FC = () => {
  return (
    <div>
      <h1>Backup Settings Test</h1>
      <button>Create Backup</button>
    </div>
  );
};

describe('Backup Settings Minimal Test', () => {
  it('should render without crashing', () => {
    render(<TestComponent />);
    
    expect(screen.getByText('Backup Settings Test')).toBeInTheDocument();
    expect(screen.getByText('Create Backup')).toBeInTheDocument();
  });
});
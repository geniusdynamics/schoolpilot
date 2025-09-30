import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock all dependencies first
vi.mock('../services/DatabaseProviderFactory', () => ({
  DatabaseProviderFactory: vi.fn()
}));

vi.mock('../services/dataModeManager', () => ({
  dataModeManager: {
    getCurrentMode: vi.fn(() => 'unified'),
    setMode: vi.fn(),
    subscribe: vi.fn()
  }
}));

vi.mock('../services/SQLiteProvider', () => ({
  SQLiteProvider: vi.fn()
}));

vi.mock('../services/RxDBProvider', () => ({
  RxDBProvider: vi.fn()
}));

vi.mock('../components/ProviderSelector', () => ({
  ProviderSelector: () => <div>Provider Selector</div>
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
  Trans: ({ children }: any) => children,
}));

vi.mock('../hooks/useAppData', () => ({
  useAppData: () => ({
    getDatabaseManager: () => ({
      backup: vi.fn().mockResolvedValue({ success: true }),
      restore: vi.fn().mockResolvedValue({ success: true }),
      exportData: vi.fn().mockResolvedValue({ success: true }),
      importData: vi.fn().mockResolvedValue({ success: true })
    })
  })
}));

vi.mock('../hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: () => ({
    config: { provider: 'sqlite' },
    updateConfig: vi.fn()
  })
}));

// Import component after mocks
import BackupSettingsPage from '../modules/settings/pages/BackupSettingsPage';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BackupSettingsPage Debug Test', () => {
  it('should render without DOM element error', () => {
    console.log('Document body exists:', !!document.body);
    console.log('Document body innerHTML:', document.body.innerHTML);
    
    const result = render(
      <TestWrapper>
        <BackupSettingsPage />
      </TestWrapper>
    );
    
    console.log('Render result container:', result.container);
    expect(screen.getByText('Database Backup')).toBeInTheDocument();
    console.log('Test passed - component rendered successfully!');
  });
});
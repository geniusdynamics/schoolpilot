import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataManagementSettingsPage from '@/modules/settings/pages/DataManagementSettingsPage';

// Mock all external dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({
    isDatabaseModeActive: true,
    isUsingRxDBDummyData: false,
    triggerSeedRxDB: vi.fn(),
    triggerClearRxDB: vi.fn(),
    initializationError: null,
  }),
}));

vi.mock('../contexts/UnifiedConfigContext', () => ({
  useUnifiedConfig: () => ({
    config: {
      dataLayer: { provider: 'sqlite' },
      dataMode: 'production',
    },
  }),
  useEnvironment: () => ({
    current: 'production',
  }),
}));

// Mock the database manager to prevent initialization
vi.mock('../services/database/ProviderSelector', () => ({
  getDatabaseManager: () => ({
    backup: vi.fn().mockResolvedValue('{}'),
  }),
}));

// Mock UI components
vi.mock('@/components/ui/Card', () => ({
  default: ({ title, children }: any) => (
    <div data-testid="card">
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/Spinner', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}));

vi.mock('@/components/ui/Select', () => ({
  default: ({ value, onChange, options }: any) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));

// Mock icons
const MockIcon = () => <span data-testid="icon">Icon</span>;
vi.mock('../../../components/ui/icons', () => ({
  CogIcon: MockIcon,
  ArchiveIcon: MockIcon,
  DeleteIcon: MockIcon,
  AlertTriangleIcon: MockIcon,
  CheckCircleIcon: MockIcon,
  InformationCircleIcon: MockIcon,
  CircleStackIcon: MockIcon,
  DatabaseIcon: MockIcon,
  DownloadIcon: MockIcon,
  ExclamationTriangleIcon: MockIcon,
}));

// Mock data layer config
vi.mock('../../../config/dataLayerConfig', () => ({
  DATA_LAYER_CONFIG: {
    development: { provider: 'mock' },
    demo: { provider: 'mock' },
    production: {
      default: { provider: 'sqlite' },
      alternatives: [],
    },
    backendIntegrations: {},
  },
}));

// Mock DataServiceFactory
vi.mock('../../../services/DataServiceFactory', () => ({
  DataServiceFactory: {
    getInstance: vi.fn(),
  },
}));

describe('DataManagementSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DataManagementSettingsPage />);
    expect(screen.getByText('Data Management')).toBeInTheDocument();
  });

  it('displays the main title and description', () => {
    render(<DataManagementSettingsPage />);
    expect(screen.getByText('Data Management')).toBeInTheDocument();
    expect(screen.getByText('Manage database operations, backup functionality, and provider settings')).toBeInTheDocument();
  });

  it('renders tab navigation', () => {
    render(<DataManagementSettingsPage />);
    expect(screen.getByText('Database Management')).toBeInTheDocument();
    expect(screen.getByText('Backup & Restore')).toBeInTheDocument();
    expect(screen.getByText('Database Provider')).toBeInTheDocument();
  });

  it('displays database management content by default', () => {
    render(<DataManagementSettingsPage />);
    expect(screen.getByText('Local Database Management')).toBeInTheDocument();
    expect(screen.getByText('Import Dummy Data to Database')).toBeInTheDocument();
    expect(screen.getByText('Clear All Database Data')).toBeInTheDocument();
  });

  it('shows current database status', () => {
    render(<DataManagementSettingsPage />);
    expect(screen.getByText(/Current Status:/)).toBeInTheDocument();
  });
});
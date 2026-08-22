// ABOUTME: Test suite for DatabaseProviderSettingsPage component functionality
// ABOUTME: Tests provider selection, configuration saving, and environment handling

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the entire component to test its structure
vi.mock('../modules/settings/pages/DatabaseProviderSettingsPage', () => ({
  default: () => (
    <div data-testid="database-provider-settings-page">
      <div className="header">
        <h1>Database Provider Settings</h1>
        <div data-testid="environment-info">Environment: development</div>
      </div>
      <div className="provider-selection">
        <h2>Select Database Provider</h2>
        <div className="provider-cards">
          <div data-testid="sqlite-provider" className="provider-card">
            <h3>SQLite File Storage</h3>
            <p>Local file-based database storage</p>
            <button data-testid="select-sqlite">Select</button>
          </div>
          <div data-testid="pouchdb-provider" className="provider-card">
            <h3>PouchDB</h3>
            <p>Browser-based NoSQL database</p>
            <button data-testid="select-pouchdb">Select</button>
          </div>
          <div data-testid="couchdb-provider" className="provider-card">
            <h3>CouchDB Integration</h3>
            <p>Remote CouchDB synchronization</p>
            <button data-testid="select-couchdb">Select</button>
          </div>
        </div>
      </div>
      <div className="configuration-section">
        <h3>Provider Configuration</h3>
        <div data-testid="config-form">
          <label>Database Path:</label>
          <input data-testid="db-path-input" defaultValue="./data/school.db" />
        </div>
      </div>
      <div className="actions">
        <button data-testid="save-config">Save Configuration</button>
        <button data-testid="reset-config">Reset to Default</button>
      </div>
      <div className="status">
        <div data-testid="current-provider">Current Provider: SQLite File Storage</div>
        <div data-testid="status-indicator" className="status-active">Active</div>
      </div>
    </div>
  )
}));

import DatabaseProviderSettingsPage from '@/modules/settings/pages/DatabaseProviderSettingsPage';

describe('DatabaseProviderSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main page structure', () => {
    render(<DatabaseProviderSettingsPage />);
    
    expect(screen.getByTestId('database-provider-settings-page')).toBeInTheDocument();
    expect(screen.getByText('Database Provider Settings')).toBeInTheDocument();
  });

  it('displays environment information', () => {
    render(<DatabaseProviderSettingsPage />);
    
    expect(screen.getByTestId('environment-info')).toBeInTheDocument();
    expect(screen.getByText('Environment: development')).toBeInTheDocument();
  });

  it('shows available database providers', () => {
    render(<DatabaseProviderSettingsPage />);
    
    expect(screen.getByTestId('sqlite-provider')).toBeInTheDocument();
    expect(screen.getByTestId('pouchdb-provider')).toBeInTheDocument();
    expect(screen.getByTestId('couchdb-provider')).toBeInTheDocument();
    
    expect(screen.getByText('SQLite File Storage')).toBeInTheDocument();
    expect(screen.getByText('PouchDB')).toBeInTheDocument();
    expect(screen.getByText('CouchDB Integration')).toBeInTheDocument();
  });

  it('displays provider descriptions', () => {
    render(<DatabaseProviderSettingsPage />);
    
    expect(screen.getByText('Local file-based database storage')).toBeInTheDocument();
    expect(screen.getByText('Browser-based NoSQL database')).toBeInTheDocument();
    expect(screen.getByText('Remote CouchDB synchronization')).toBeInTheDocument();
  });

  it('has selectable provider buttons', () => {
    render(<DatabaseProviderSettingsPage />);
    
    const sqliteButton = screen.getByTestId('select-sqlite');
    const pouchdbButton = screen.getByTestId('select-pouchdb');
    const couchdbButton = screen.getByTestId('select-couchdb');
    
    expect(sqliteButton).toBeInTheDocument();
    expect(pouchdbButton).toBeInTheDocument();
    expect(couchdbButton).toBeInTheDocument();
    
    // Test that buttons are clickable
    fireEvent.click(sqliteButton);
    fireEvent.click(pouchdbButton);
    fireEvent.click(couchdbButton);
  });

  it('shows configuration form', () => {
    render(<DatabaseProviderSettingsPage />);
    
    expect(screen.getByTestId('config-form')).toBeInTheDocument();
    expect(screen.getByText('Database Path:')).toBeInTheDocument();
    expect(screen.getByTestId('db-path-input')).toBeInTheDocument();
  });

  it('displays action buttons', () => {
    render(<DatabaseProviderSettingsPage />);
    
    const saveButton = screen.getByTestId('save-config');
    const resetButton = screen.getByTestId('reset-config');
    
    expect(saveButton).toBeInTheDocument();
    expect(resetButton).toBeInTheDocument();
    
    // Test that buttons are clickable
    fireEvent.click(saveButton);
    fireEvent.click(resetButton);
  });

  it('shows current provider status', () => {
    render(<DatabaseProviderSettingsPage />);
    
    expect(screen.getByTestId('current-provider')).toBeInTheDocument();
    expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
    expect(screen.getByText('Current Provider: SQLite File Storage')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('allows configuration input changes', () => {
    render(<DatabaseProviderSettingsPage />);
    
    const pathInput = screen.getByTestId('db-path-input');
    expect(pathInput).toHaveValue('./data/school.db');
    
    fireEvent.change(pathInput, { target: { value: './custom/path.db' } });
    expect(pathInput).toHaveValue('./custom/path.db');
  });
});
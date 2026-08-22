// ABOUTME: Tests for DataModeSwitch component (DEPRECATED - use UnifiedModeSwitch instead)
// ABOUTME: Tests UI interactions, mode switching, and error handling in the deprecated component

/*
 * DEPRECATION NOTICE:
 * This test suite is for the deprecated DataModeSwitch component.
 * The component has been replaced by UnifiedModeSwitch.
 * These tests are maintained for legacy compatibility only.
 * New tests should be written for UnifiedModeSwitch instead.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useDataMode } from '@/hooks/useDataMode';
import { DataModeSwitch } from '@/components/DataModeSwitch';

// Mock the useDataMode hook
vi.mock('../hooks/useDataMode');

const mockUseDataMode = vi.mocked(useDataMode);

describe('DataModeSwitch', () => {
  const mockSwitchMode = vi.fn();
  const mockClearData = vi.fn();
  const mockSeedData = vi.fn();
  const mockRefreshStatus = vi.fn();

  const defaultMockReturn = {
    status: {
      currentMode: 'development' as const,
      activeProvider: 'SQLiteFile',
      isReady: true,
      dataCount: 0,
      lastSwitched: new Date('2024-01-01')
    },
    isLoading: false,
    error: null,
    switchMode: mockSwitchMode,
    clearData: mockClearData,
    seedData: mockSeedData,
    refreshStatus: mockRefreshStatus
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDataMode.mockReturnValue(defaultMockReturn);
  });

  describe('Rendering', () => {
    it('should render the component with default props', () => {
      render(<DataModeSwitch />);
      
      expect(screen.getByText('Data Layer Mode')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Demo')).toBeInTheDocument();
      expect(screen.getByText('Production')).toBeInTheDocument();
    });

    it('should show current mode as selected', () => {
      render(<DataModeSwitch />);
      
      const developmentButton = screen.getByRole('button', { name: /development/i });
      expect(developmentButton).toHaveClass('bg-blue-600');
    });

    it('should display current status information', () => {
      render(<DataModeSwitch />);
      
      expect(screen.getByText('SQLiteFile')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.getByText('0 records')).toBeInTheDocument();
    });

    it('should show advanced options when enabled', () => {
      render(<DataModeSwitch showAdvancedOptions={true} />);
      
      expect(screen.getByText('Data Transition Options')).toBeInTheDocument();
      expect(screen.getByLabelText('Preserve existing data')).toBeInTheDocument();
      expect(screen.getByLabelText('Load sample data (demo mode)')).toBeInTheDocument();
    });

    it('should hide advanced options by default', () => {
      render(<DataModeSwitch />);
      
      expect(screen.queryByText('Data Transition Options')).not.toBeInTheDocument();
    });
  });

  describe('Mode Switching', () => {
    it('should call switchMode when clicking a different mode', async () => {
      mockSwitchMode.mockResolvedValue({ success: true, mode: 'demo' });
      
      render(<DataModeSwitch />);
      
      const demoButton = screen.getByRole('button', { name: /demo/i });
      fireEvent.click(demoButton);
      
      await waitFor(() => {
        expect(mockSwitchMode).toHaveBeenCalledWith('demo', {
          preserveData: false,
          seedData: true
        });
      });
    });

    it('should not call switchMode when clicking current mode', () => {
      render(<DataModeSwitch />);
      
      const developmentButton = screen.getByRole('button', { name: /development/i });
      fireEvent.click(developmentButton);
      
      expect(mockSwitchMode).not.toHaveBeenCalled();
    });

    it('should show loading state during mode switch', () => {
      mockUseDataMode.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true
      });
      
      render(<DataModeSwitch />);
      
      expect(screen.getByText('Switching...')).toBeInTheDocument();
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        if (button.textContent?.includes('Development') || 
            button.textContent?.includes('Demo') || 
            button.textContent?.includes('Production')) {
          expect(button).toBeDisabled();
        }
      });
    });

    it('should use advanced options when provided', async () => {
      mockSwitchMode.mockResolvedValue({ success: true, mode: 'demo' });
      
      render(<DataModeSwitch showAdvancedOptions={true} />);
      
      // Enable preserve data option
      const preserveDataCheckbox = screen.getByLabelText('Preserve existing data');
      fireEvent.click(preserveDataCheckbox);
      
      // Disable seed data option
      const seedDataCheckbox = screen.getByLabelText('Load sample data (demo mode)');
      fireEvent.click(seedDataCheckbox);
      
      const demoButton = screen.getByRole('button', { name: /demo/i });
      fireEvent.click(demoButton);
      
      await waitFor(() => {
        expect(mockSwitchMode).toHaveBeenCalledWith('demo', {
          preserveData: true,
          seedData: false
        });
      });
    });
  });

  describe('Data Management', () => {
    it('should show data management actions when advanced options are enabled', () => {
      render(<DataModeSwitch showAdvancedOptions={true} />);
      
      expect(screen.getByRole('button', { name: /clear all data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /load sample data/i })).toBeInTheDocument();
    });

    it('should call clearData when clear button is clicked', async () => {
      mockClearData.mockResolvedValue({ success: true });
      
      render(<DataModeSwitch showAdvancedOptions={true} />);
      
      const clearButton = screen.getByRole('button', { name: /clear all data/i });
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(mockClearData).toHaveBeenCalled();
      });
    });

    it('should call seedData when seed button is clicked', async () => {
      mockSeedData.mockResolvedValue({ success: true });
      
      render(<DataModeSwitch showAdvancedOptions={true} />);
      
      const seedButton = screen.getByRole('button', { name: /load sample data/i });
      fireEvent.click(seedButton);
      
      await waitFor(() => {
        expect(mockSeedData).toHaveBeenCalled();
      });
    });

    it('should disable data management buttons when loading', () => {
      mockUseDataMode.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true
      });
      
      render(<DataModeSwitch showAdvancedOptions={true} />);
      
      expect(screen.getByRole('button', { name: /clear all data/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /load sample data/i })).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error messages', () => {
      mockUseDataMode.mockReturnValue({
        ...defaultMockReturn,
        error: 'Failed to switch mode'
      });
      
      render(<DataModeSwitch />);
      
      expect(screen.getByText('Failed to switch mode')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call refreshStatus when retry button is clicked', () => {
      mockUseDataMode.mockReturnValue({
        ...defaultMockReturn,
        error: 'Failed to switch mode'
      });
      
      render(<DataModeSwitch />);
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);
      
      expect(mockRefreshStatus).toHaveBeenCalled();
    });

    it('should show not ready status', () => {
      mockUseDataMode.mockReturnValue({
        ...defaultMockReturn,
        status: {
          ...defaultMockReturn.status,
          isReady: false
        }
      });
      
      render(<DataModeSwitch />);
      
      expect(screen.getByText('Not Ready')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should show different provider names correctly', () => {
      mockUseDataMode.mockReturnValue({
        ...defaultMockReturn,
        status: {
          ...defaultMockReturn.status,
          currentMode: 'demo',
          activeProvider: 'SQLiteOPFS'
        }
      });
      
      render(<DataModeSwitch />);
      
      expect(screen.getByText('SQLiteOPFS')).toBeInTheDocument();
      
      const demoButton = screen.getByRole('button', { name: /demo/i });
      expect(demoButton).toHaveClass('bg-blue-600');
    });

    it('should format data count correctly', () => {
      mockUseDataMode.mockReturnValue({
        ...defaultMockReturn,
        status: {
          ...defaultMockReturn.status,
          dataCount: 1500
        }
      });
      
      render(<DataModeSwitch />);
      
      expect(screen.getByText('1500 records')).toBeInTheDocument();
    });

    it('should format last switched date correctly', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      mockUseDataMode.mockReturnValue({
        ...defaultMockReturn,
        status: {
          ...defaultMockReturn.status,
          lastSwitched: testDate
        }
      });
      
      render(<DataModeSwitch />);
      
      expect(screen.getByText(testDate.toLocaleString())).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<DataModeSwitch />);
      
      const developmentButton = screen.getByRole('button', { name: /development/i });
      expect(developmentButton).toHaveAttribute('aria-pressed', 'true');
      
      const demoButton = screen.getByRole('button', { name: /demo/i });
      expect(demoButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have proper form labels when advanced options are shown', () => {
      render(<DataModeSwitch showAdvancedOptions={true} />);
      
      expect(screen.getByLabelText('Preserve existing data')).toBeInTheDocument();
      expect(screen.getByLabelText('Load sample data (demo mode)')).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<DataModeSwitch />);
      
      const demoButton = screen.getByRole('button', { name: /demo/i });
      demoButton.focus();
      
      expect(demoButton).toHaveFocus();
      
      fireEvent.keyDown(demoButton, { key: 'Enter' });
      
      expect(mockSwitchMode).toHaveBeenCalledWith('demo', {
        preserveData: false,
        seedData: true
      });
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(<DataModeSwitch className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(<DataModeSwitch className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
      expect(container.firstChild).toHaveClass('bg-white');
    });
  });

  describe('Integration', () => {
    it('should handle successful mode switch with status update', async () => {
      const mockSwitchResult = { success: true, mode: 'demo' as const };
      mockSwitchMode.mockResolvedValue(mockSwitchResult);
      
      render(<DataModeSwitch />);
      
      const demoButton = screen.getByRole('button', { name: /demo/i });
      fireEvent.click(demoButton);
      
      await waitFor(() => {
        expect(mockSwitchMode).toHaveBeenCalled();
        expect(mockRefreshStatus).toHaveBeenCalled();
      });
    });

    it('should handle failed mode switch', async () => {
      const mockSwitchResult = { success: false, error: 'Switch failed' };
      mockSwitchMode.mockResolvedValue(mockSwitchResult);
      
      render(<DataModeSwitch />);
      
      const demoButton = screen.getByRole('button', { name: /demo/i });
      fireEvent.click(demoButton);
      
      await waitFor(() => {
        expect(mockSwitchMode).toHaveBeenCalled();
      });
    });
  });
});
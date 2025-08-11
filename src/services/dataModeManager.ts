/**
 * Data Mode Manager Service
 * Handles switching between demo and production modes with data seeding capabilities
 */

import { unifiedConfigManager, DataMode } from '../config/unifiedConfig';

// Import types for database operations
interface DatabaseService {
  seedDatabaseWithMockData: () => Promise<void>;
  clearDatabase: () => Promise<void>;
  getUsingDummyDataFlag: () => Promise<boolean>;
}

interface ModularMockData {
  [key: string]: any[];
}

export interface DataModeManagerOptions {
  confirmationRequired?: boolean;
  preserveUserSettings?: boolean;
  notifyOnChange?: boolean;
}

const DEFAULT_OPTIONS: Required<DataModeManagerOptions> = {
  confirmationRequired: true,
  preserveUserSettings: true,
  notifyOnChange: true,
};

/**
 * Data Mode Manager Class
 */
export class DataModeManager {
  private static instance: DataModeManager;
  private listeners: Set<(mode: DataMode, isDemo: boolean) => void> = new Set();
  private databaseService: DatabaseService | null = null;
  private mockData: ModularMockData | null = null;

  private constructor() {
    this.initializeServices();
  }

  public static getInstance(): DataModeManager {
    if (!DataModeManager.instance) {
      DataModeManager.instance = new DataModeManager();
    }
    return DataModeManager.instance;
  }

  /**
   * Initialize required services
   */
  private async initializeServices(): Promise<void> {
    try {
      // Dynamically import database service
      const databaseModule = await import('../services/databaseService');
      this.databaseService = databaseModule.rxdbService || databaseModule.default || databaseModule;

      // Dynamically import mock data
      const mockDataModule = await import('../hooks/useModularMockData');
      this.mockData = mockDataModule.rawInitialData;
    } catch (error) {
      console.warn('Failed to initialize data mode manager services:', error);
    }
  }

  /**
   * Switch to demo mode
   */
  public async switchToDemo(
    options: DataModeManagerOptions = {}
  ): Promise<{ success: boolean; message: string }> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const config = unifiedConfigManager.getConfig();

    try {
      // Check if demo mode is available
      if (!config.demo.available) {
        return {
          success: false,
          message: 'Demo mode is not available. Backend must be in development mode or explicitly enable demo mode.',
        };
      }

      // Check if already in demo mode
      if (config.demo.active && config.dataMode === 'demo') {
        return {
          success: true,
          message: 'Already in demo mode.',
        };
      }

      // Confirmation check
      if (opts.confirmationRequired) {
        const confirmed = await this.requestConfirmation(
          'Switch to Demo Mode',
          'This will replace your current data with demo data. Any unsaved changes will be lost. Continue?'
        );
        if (!confirmed) {
          return {
            success: false,
            message: 'Demo mode switch cancelled by user.',
          };
        }
      }

      // Ensure services are initialized
      if (!this.databaseService || !this.mockData) {
        await this.initializeServices();
      }

      if (!this.databaseService) {
        return {
          success: false,
          message: 'Database service not available. Cannot switch to demo mode.',
        };
      }

      // Clear existing data and seed with mock data
      await this.databaseService.clearDatabase();
      await this.databaseService.seedDatabaseWithMockData();

      // Update configuration
      await unifiedConfigManager.switchToDemo();

      // Notify listeners
      if (opts.notifyOnChange) {
        this.notifyListeners('demo', true);
      }

      return {
        success: true,
        message: 'Successfully switched to demo mode with sample data.',
      };

    } catch (error) {
      console.error('Failed to switch to demo mode:', error);
      return {
        success: false,
        message: `Failed to switch to demo mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Switch to production mode
   */
  public async switchToProduction(
    options: DataModeManagerOptions = {}
  ): Promise<{ success: boolean; message: string }> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const config = unifiedConfigManager.getConfig();

    try {
      // Check if already in production mode
      if (!config.demo.active && config.dataMode === 'production') {
        return {
          success: true,
          message: 'Already in production mode.',
        };
      }

      // Confirmation check if switching from demo
      if (config.demo.active && opts.confirmationRequired) {
        const confirmed = await this.requestConfirmation(
          'Switch to Production Mode',
          'This will remove all demo data and switch to live production data. Continue?'
        );
        if (!confirmed) {
          return {
            success: false,
            message: 'Production mode switch cancelled by user.',
          };
        }
      }

      // Ensure services are initialized
      if (!this.databaseService) {
        await this.initializeServices();
      }

      // Clear demo data if active
      if (config.demo.active && this.databaseService) {
        await this.databaseService.clearDatabase();
      }

      // Update configuration
      await unifiedConfigManager.switchToProduction();

      // Notify listeners
      if (opts.notifyOnChange) {
        this.notifyListeners('production', false);
      }

      return {
        success: true,
        message: 'Successfully switched to production mode.',
      };

    } catch (error) {
      console.error('Failed to switch to production mode:', error);
      return {
        success: false,
        message: `Failed to switch to production mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Clear demo data without switching modes
   */
  public async clearDemoData(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.databaseService) {
        await this.initializeServices();
      }

      if (!this.databaseService) {
        return {
          success: false,
          message: 'Database service not available.',
        };
      }

      const isDemoActive = await this.databaseService.getUsingDummyDataFlag();
      
      if (!isDemoActive) {
        return {
          success: true,
          message: 'No demo data to clear.',
        };
      }

      await this.databaseService.clearDatabase();

      return {
        success: true,
        message: 'Demo data cleared successfully.',
      };

    } catch (error) {
      console.error('Failed to clear demo data:', error);
      return {
        success: false,
        message: `Failed to clear demo data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if demo data is currently active
   */
  public async isDemoDataActive(): Promise<boolean> {
    try {
      if (!this.databaseService) {
        await this.initializeServices();
      }

      if (!this.databaseService) {
        return false;
      }

      return await this.databaseService.getUsingDummyDataFlag();
    } catch (error) {
      console.error('Failed to check demo data status:', error);
      return false;
    }
  }

  /**
   * Get current data mode status
   */
  public getDataModeStatus(): {
    mode: DataMode;
    isDemo: boolean;
    canSwitchToDemo: boolean;
    canSwitchToProduction: boolean;
  } {
    const config = unifiedConfigManager.getConfig();
    
    return {
      mode: config.dataMode,
      isDemo: config.demo.active,
      canSwitchToDemo: config.demo.available && !config.demo.active,
      canSwitchToProduction: config.demo.active || config.dataMode !== 'production',
    };
  }

  /**
   * Refresh demo mode availability based on backend status
   */
  public async refreshDemoAvailability(): Promise<void> {
    try {
      // This will be called by the backend detection service
      // when backend status changes
      const config = unifiedConfigManager.getConfig();
      
      // If demo mode becomes unavailable while active, switch to production
      if (config.demo.active && !config.demo.available) {
        await this.switchToProduction({ confirmationRequired: false });
      }
    } catch (error) {
      console.error('Failed to refresh demo availability:', error);
    }
  }

  /**
   * Subscribe to data mode changes
   */
  public subscribe(listener: (mode: DataMode, isDemo: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of mode changes
   */
  private notifyListeners(mode: DataMode, isDemo: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(mode, isDemo);
      } catch (error) {
        console.error('Error in data mode listener:', error);
      }
    });
  }

  /**
   * Request user confirmation for mode switches
   */
  private async requestConfirmation(title: string, message: string): Promise<boolean> {
    // In a real implementation, this would show a proper modal/dialog
    // For now, using browser confirm
    return new Promise((resolve) => {
      const result = window.confirm(`${title}\n\n${message}`);
      resolve(result);
    });
  }

  /**
   * Validate that required services are available
   */
  public async validateServices(): Promise<{
    databaseAvailable: boolean;
    mockDataAvailable: boolean;
    allServicesReady: boolean;
  }> {
    await this.initializeServices();
    
    const databaseAvailable = this.databaseService !== null;
    const mockDataAvailable = this.mockData !== null;
    
    return {
      databaseAvailable,
      mockDataAvailable,
      allServicesReady: databaseAvailable && mockDataAvailable,
    };
  }

  /**
   * Get service status for debugging
   */
  public getServiceStatus(): {
    databaseService: boolean;
    mockData: boolean;
    listeners: number;
  } {
    return {
      databaseService: this.databaseService !== null,
      mockData: this.mockData !== null,
      listeners: this.listeners.size,
    };
  }
}

// Export singleton instance
export const dataModeManager = DataModeManager.getInstance();

// Utility functions
export const switchToDemo = (options?: DataModeManagerOptions) => 
  dataModeManager.switchToDemo(options);

export const switchToProduction = (options?: DataModeManagerOptions) => 
  dataModeManager.switchToProduction(options);

export const clearDemoData = () => 
  dataModeManager.clearDemoData();

export const isDemoDataActive = () => 
  dataModeManager.isDemoDataActive();

export const getDataModeStatus = () => 
  dataModeManager.getDataModeStatus();
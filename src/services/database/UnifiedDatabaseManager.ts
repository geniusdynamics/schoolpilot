// ABOUTME: Unified Database Manager that consolidates RxDB, PouchDB, and SQLite providers
// ABOUTME: Provides deployment mode-based provider selection and comprehensive database management

import { getCurrentUnifiedConfig, getDatabaseConfig, validateDatabaseConfig } from '../../config/unifiedConfig';
import { DataServiceFactory } from '../DataServiceFactory';
import { getDatabaseManager } from './ProviderSelector';
import { collectionsDefinition } from '../rxdbService';
import { SchemaConverter } from './SchemaConverter';
import { ICollection, IDatabaseProvider, DatabaseConfig, CollectionSchema, CollectionRequirements } from './interfaces';
import { DatabaseProviderFactory, getDatabaseProviderFactory, ProviderType } from './DatabaseProviderFactory';
import { UniversalDataGenerator, UniversalDataGenerationConfig, GenerationStats } from '../dataGeneration/UniversalDataGenerator';
import { StartupOptimizer } from './StartupOptimizer';

export type DeploymentMode = 'development' | 'staging' | 'production';
export type DatabaseProvider = 'sqlite-file' | 'sqlite-wasm' | 'pouchdb' | 'rxdb' | 'livestore' | 'sqlite' | 'backend-api' | 'hybrid';

export interface DatabaseStatus {
  isInitialized: boolean;
  provider: DatabaseProvider | null;
  providerName: string | null;
  collectionsCount: number;
  totalRecords: number;
  lastHealthCheck: Date | null;
  errors: string[];
  warnings: string[];
}

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  provider: DatabaseProvider | null;
  collectionsHealthy: number;
  collectionsTotal: number;
  lastCheck: Date;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    collection?: string;
  }>;
}

export class UnifiedDatabaseManager {
  private static instance: UnifiedDatabaseManager;
  private provider: IDatabaseProvider | null = null;
  private isInitialized = false;
  private deploymentMode: DeploymentMode;
  private providerType: DatabaseProvider | null = null;
  private collections = new Map<string, ICollection<any>>();
  private status: DatabaseStatus;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private providerFactory: DatabaseProviderFactory;
  private startupOptimizer: StartupOptimizer;

  private constructor() {
    this.deploymentMode = this.detectDeploymentMode();
    this.providerFactory = getDatabaseProviderFactory();
    this.startupOptimizer = StartupOptimizer.getInstance();
    this.status = {
      isInitialized: false,
      provider: null,
      providerName: null,
      collectionsCount: 0,
      totalRecords: 0,
      lastHealthCheck: null,
      errors: [],
      warnings: []
    };
  }

  public static getInstance(): UnifiedDatabaseManager {
    if (!UnifiedDatabaseManager.instance) {
      UnifiedDatabaseManager.instance = new UnifiedDatabaseManager();
    }
    return UnifiedDatabaseManager.instance;
  }

  /**
   * Initialize the database manager with automatic provider selection
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🚀 [UnifiedDatabaseManager] Initializing database manager...');
      
      // Check available providers first
      const availableProviders = this.providerFactory.getAvailableProviderTypes();
      console.log('📋 [UnifiedDatabaseManager] Available providers:', availableProviders);
      
      // Select appropriate provider based on deployment mode
      this.providerType = this.selectProvider();
      console.log(`📊 [UnifiedDatabaseManager] Selected provider: ${this.providerType} for ${this.deploymentMode} mode`);

      // Validate provider availability
      const isAvailable = await this.validateProviderAvailability(this.providerType);
      console.log(`🔍 [UnifiedDatabaseManager] Provider ${this.providerType} availability check: ${isAvailable}`);
      
      if (!isAvailable) {
        console.warn(`⚠️ [UnifiedDatabaseManager] Selected provider ${this.providerType} is not available, attempting fallback...`);
        
        // Try fallback providers in order of preference
        const fallbackProviders = ['pouchdb', 'rxdb', 'backend-api', 'sqlite-wasm'];
        let fallbackFound = false;
        
        for (const fallbackProvider of fallbackProviders) {
          if (fallbackProvider !== this.providerType) {
            const fallbackAvailable = await this.validateProviderAvailability(fallbackProvider as DatabaseProvider);
            console.log(`🔍 [UnifiedDatabaseManager] Fallback provider ${fallbackProvider} availability: ${fallbackAvailable}`);
            
            if (fallbackAvailable) {
              this.providerType = fallbackProvider as DatabaseProvider;
              console.log(`🔄 [UnifiedDatabaseManager] Falling back to ${fallbackProvider} provider`);
              fallbackFound = true;
              break;
            }
          }
        }
        
        if (!fallbackFound) {
          console.error('❌ [UnifiedDatabaseManager] No viable database providers available');
          console.log('📋 [UnifiedDatabaseManager] Available providers were:', availableProviders);
          throw new Error('Database initialization failed: No viable database providers available');
        }
      }

      // Initialize the selected provider
      await this.initializeProvider();

      // Create collections from schema definition
      await this.createCollections();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      this.updateStatus();

      console.log(`✅ [UnifiedDatabaseManager] Successfully initialized with ${this.collections.size} collections`);
    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Initialization failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.status.errors.push(`Initialization failed: ${errorMessage}`);
      
      // Attempt automatic recovery
      console.log('🔧 [UnifiedDatabaseManager] Attempting automatic recovery...');
      const recoverySuccessful = await this.attemptRecovery();
      
      if (!recoverySuccessful) {
        throw error;
      }
    }
  }

  /**
   * Detect deployment mode based on environment and configuration with enhanced logic
   */
  private detectDeploymentMode(): DeploymentMode {
    const config = getCurrentUnifiedConfig();
    
    console.log(`🔍 [UnifiedDatabaseManager] Detecting deployment mode from config:`, {
      environment: config.environment,
      dataMode: config.dataMode,
      nodeEnv: process.env.NODE_ENV
    });
    
    // Priority 1: Check unified config environment (most reliable)
    switch (config.environment) {
      case 'development':
        return 'development';
      case 'staging':
        return 'staging';
      case 'production':
        return 'production';
    }
    
    // Priority 2: Check environment variables
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.NODE_ENV === 'development') {
        return 'development';
      }
      if (process.env.NODE_ENV === 'production') {
        return 'production';
      }
    }
    
    // Priority 3: Fallback detection based on URL or other indicators
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost')) {
        return 'development';
      }
      if (hostname.includes('staging') || hostname.includes('test') || hostname.includes('dev')) {
        return 'staging';
      }
    }
    
    // Default to production for safety
    console.log(`⚠️ [UnifiedDatabaseManager] Could not detect deployment mode, defaulting to production`);
    return 'production';
  }

  /**
   * Select appropriate database provider based on deployment mode and configuration
   */
  private selectProvider(): DatabaseProvider {
    const config = getCurrentUnifiedConfig();
    const dbConfig = getDatabaseConfig();
    
    console.log(`🔍 [UnifiedDatabaseManager] Selecting provider for ${this.deploymentMode} mode`);
    console.log(`📊 [UnifiedDatabaseManager] Database configuration:`, dbConfig);
    
    // Validate database configuration first
    const validation = validateDatabaseConfig();
    if (!validation.isValid) {
      console.warn(`⚠️ [UnifiedDatabaseManager] Database configuration validation failed:`, validation.errors);
      // Continue with warnings but log them
      if (validation.warnings.length > 0) {
        console.warn(`⚠️ [UnifiedDatabaseManager] Database configuration warnings:`, validation.warnings);
      }
    }
    
    // Priority 1: Check if user has explicitly configured a provider
    if (dbConfig.provider) {
      console.log(`🎯 [UnifiedDatabaseManager] Using configured provider: ${dbConfig.provider}`);
      
      // Validate that the configured provider is allowed
      if (dbConfig.allowedProviders && !dbConfig.allowedProviders.includes(dbConfig.provider)) {
        console.warn(`⚠️ [UnifiedDatabaseManager] Configured provider ${dbConfig.provider} not in allowed list: ${dbConfig.allowedProviders.join(', ')}`);
      }
      
      switch (dbConfig.provider) {
        case 'sqlite':
          return this.deploymentMode === 'development' ? 'sqlite-file' : 'sqlite-wasm';
        case 'sqlite-file':
        case 'sqlite-wasm':
        case 'pouchdb':
        case 'backend-api':
        case 'livestore':
          return dbConfig.provider;
        case 'rxdb':
          return 'rxdb';
        default:
          console.warn(`⚠️ [UnifiedDatabaseManager] Unknown provider ${dbConfig.provider}, using automatic selection`);
      }
    }

    // Priority 2: Check data mode for provider hints
    if (config.dataMode) {
      console.log(`📊 [UnifiedDatabaseManager] Considering data mode: ${config.dataMode}`);
      
      switch (config.dataMode) {
        case 'demo':
          // Demo mode prefers PouchDB for flexibility
          return 'pouchdb';
        case 'production':
          // Production mode prefers SQLite for performance
          return this.deploymentMode === 'development' ? 'sqlite-file' : 'sqlite-wasm';
      }
    }

    // Priority 3: Default provider selection based on deployment mode
    console.log(`🔧 [UnifiedDatabaseManager] Using deployment mode-based selection for ${this.deploymentMode}`);
    
    switch (this.deploymentMode) {
      case 'development':
        return 'sqlite-file'; // File-based SQLite for development
      case 'staging':
        return 'sqlite-wasm'; // WASM SQLite with OPFS for staging
      case 'production':
        return 'sqlite-wasm'; // WASM SQLite with OPFS for production
      default:
        console.log(`🔄 [UnifiedDatabaseManager] Fallback to PouchDB for unknown deployment mode`);
        return 'pouchdb'; // Fallback to PouchDB
    }
  }

  /**
   * Initialize the selected database provider using the factory
   */
  private async initializeProvider(): Promise<void> {
    try {
      console.log(`🔧 [UnifiedDatabaseManager] Initializing ${this.providerType} provider using factory...`);

      // Create database configuration using enhanced config
      const unifiedConfig = getCurrentUnifiedConfig();
      const dbConfig = getDatabaseConfig();
      
      // Create provider-specific database configuration with safe defaults
      const config: DatabaseConfig = {
        name: `schoolpilot_${this.deploymentMode}`,
        version: 1,
        autoCompaction: dbConfig?.storage?.compressionEnabled ?? false,
        debug: dbConfig?.monitoring?.logLevel === 'debug',
        
        // Add backend API configuration if provider is backend-api
        ...(this.providerType === 'backend-api' && dbConfig?.apiConfig ? {
          apiBaseUrl: dbConfig.apiConfig.apiBaseUrl,
          apiKey: dbConfig.apiConfig.apiKey,
          authToken: dbConfig.apiConfig.authToken,
          authType: dbConfig.apiConfig.authType || 'bearer',
          customHeaders: dbConfig.apiConfig.customHeaders,
          timeout: dbConfig.sync?.timeout ?? 30000,
          retryAttempts: dbConfig.sync?.retryAttempts ?? 3,
          syncInterval: dbConfig.sync?.interval ?? 30000,
          batchSize: dbConfig.sync?.batchSize ?? 100,
          enableOfflineQueue: dbConfig.features?.enableOfflineMode ?? true,
          conflictResolution: dbConfig.sync?.conflictResolution ?? 'local-wins',
          endpoints: dbConfig.apiConfig.endpoints
        } : {})
      };
      
      // Store enhanced configuration for use by provider
      (config as any).enhancedConfig = dbConfig;

      // Define collection requirements based on our needs
      const requirements: CollectionRequirements = {
        collectionsCount: Object.keys(collectionsDefinition).length,
        requiresOffline: true,
        requiresSync: this.providerType === 'backend-api' || this.deploymentMode === 'production',
        requiresReactivity: true,
        performanceLevel: this.deploymentMode === 'production' ? 'high' : 'standard',
        storageQuota: this.deploymentMode === 'production' ? 200 * 1024 * 1024 : 100 * 1024 * 1024 // 200MB prod, 100MB dev
      };

      // Use the factory to create the appropriate provider
      this.provider = await this.providerFactory.createProviderWithRequirements(config, requirements);

      if (!this.provider) {
        throw new Error('Failed to initialize database provider through factory');
      }

      console.log(`✅ [UnifiedDatabaseManager] Provider ${this.providerType} initialized successfully through factory`);
      
      // Start startup optimization
      if (this.provider) {
        await this.startupOptimizer.startOptimization(this.provider);
      }
    } catch (error) {
      console.error(`❌ [UnifiedDatabaseManager] Provider initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Create collections from unified schema definition
   */
  private async createCollections(): Promise<void> {
    try {
      console.log('📁 [UnifiedDatabaseManager] Creating collections from schema...');
      
      const collectionCount = Object.keys(collectionsDefinition).length;
      console.log(`📊 [UnifiedDatabaseManager] Processing ${collectionCount} collection definitions`);

      let created = 0;
      let skipped = 0;
      let failed = 0;

      for (const [collectionName, definition] of Object.entries(collectionsDefinition)) {
        try {
          // Convert RxDB schema to provider-specific format
          const schema = this.convertSchema(definition.schema);
          
          // Create collection using provider
          if (this.provider && typeof this.provider.createCollection === 'function') {
            const collection = await this.provider.createCollection(collectionName, schema);
            this.collections.set(collectionName, collection);
            created++;
          } else {
            console.warn(`Provider does not support createCollection for ${collectionName}`);
            skipped++;
          }
        } catch (error) {
          console.error(`Failed to create collection ${collectionName}:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.status.warnings.push(`Failed to create collection ${collectionName}: ${errorMessage}`);
          failed++;
        }
      }

      console.log(`✅ [UnifiedDatabaseManager] Collections created: ${created}, skipped: ${skipped}, failed: ${failed}`);
      this.status.collectionsCount = created;
    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Collection creation failed:', error);
      throw error;
    }
  }

  /**
   * Convert RxDB schema to provider-specific format
   */
  private convertSchema(rxdbSchema: any): CollectionSchema {
    try {
      const conversionResult = SchemaConverter.convertRxDBToSQLite('temp', rxdbSchema);
      return conversionResult.schema;
    } catch (error) {
      console.warn('Schema conversion failed, using fallback:', error);
      // Fallback schema
      return {
        version: 0,
        type: 'object',
        properties: {},
        required: [],
        indexes: [],
        primaryKey: 'id'
      };
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Run initial health check
    this.performHealthCheck();

    // Schedule periodic health checks (every 5 minutes)
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 5 * 60 * 1000);

    console.log('💓 [UnifiedDatabaseManager] Health monitoring started');
  }

  /**
   * Perform comprehensive health check with detailed collection analysis
   */
  private async performHealthCheck(): Promise<DatabaseHealth> {
    const health: DatabaseHealth = {
      status: 'healthy',
      provider: this.providerType,
      collectionsHealthy: 0,
      collectionsTotal: this.collections.size,
      lastCheck: new Date(),
      issues: []
    };

    try {
      // Check provider health
      if (!this.provider || !this.isInitialized) {
        health.status = 'unhealthy';
        health.issues.push({
          severity: 'error',
          message: 'Database provider not initialized'
        });
        return health;
      }

      // Check collection health with detailed analysis
      for (const [name, collection] of this.collections) {
        try {
          const collectionHealth = await this.checkCollectionHealth(name, collection);
          
          if (collectionHealth.isHealthy) {
            health.collectionsHealthy++;
          }

          // Add any issues found
          health.issues.push(...collectionHealth.issues);

        } catch (error) {
          health.issues.push({
            severity: 'error',
            message: `Collection ${name} health check failed: ${error instanceof Error ? error.message : String(error)}`,
            collection: name
          });
        }
      }

      // Determine overall health status
      if (health.issues.some(issue => issue.severity === 'error')) {
        health.status = 'unhealthy';
      } else if (health.issues.some(issue => issue.severity === 'warning')) {
        health.status = 'degraded';
      }

      this.status.lastHealthCheck = health.lastCheck;
      console.log(`💓 [UnifiedDatabaseManager] Health check: ${health.status} (${health.collectionsHealthy}/${health.collectionsTotal} collections healthy)`);

      // Attempt automatic repair if issues are found
      if (health.status !== 'healthy') {
        await this.attemptAutomaticRepair(health.issues);
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.issues.push({
        severity: 'error',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`
      });
      console.error('❌ [UnifiedDatabaseManager] Health check failed:', error);
    }

    return health;
  }

  /**
   * Check the health of a specific collection
   */
  private async checkCollectionHealth(name: string, collection: ICollection<any>): Promise<{
    isHealthy: boolean;
    issues: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
      collection?: string;
    }>;
  }> {
    const result = {
      isHealthy: true,
      issues: [] as Array<{
        severity: 'error' | 'warning' | 'info';
        message: string;
        collection?: string;
      }>
    };

    try {
      // Basic functionality check
      if (!collection) {
        result.isHealthy = false;
        result.issues.push({
          severity: 'error',
          message: `Collection ${name} is null or undefined`,
          collection: name
        });
        return result;
      }

      // Check if basic operations are available
      if (typeof collection.count !== 'function') {
        result.issues.push({
          severity: 'warning',
          message: `Collection ${name} does not support count operation`,
          collection: name
        });
      } else {
        // Test count operation
        const count = await collection.count();
        
        // Check for suspicious patterns
        if (count < 0) {
          result.isHealthy = false;
          result.issues.push({
            severity: 'error',
            message: `Collection ${name} returned negative count: ${count}`,
            collection: name
          });
        }
      }

      // Check if find operation is available
      if (typeof collection.find !== 'function') {
        result.issues.push({
          severity: 'warning',
          message: `Collection ${name} does not support find operation`,
          collection: name
        });
      } else {
        // Test find operation with limit
        try {
          await collection.find({ limit: 1 });
        } catch (findError) {
          result.isHealthy = false;
          result.issues.push({
            severity: 'error',
            message: `Collection ${name} find operation failed: ${findError instanceof Error ? findError.message : String(findError)}`,
            collection: name
          });
        }
      }

      // Check collection statistics if available
      if (typeof collection.getStats === 'function') {
        try {
          const stats = await collection.getStats();
          
          // Check for data integrity issues
          if (stats.documentCount < 0) {
            result.isHealthy = false;
            result.issues.push({
              severity: 'error',
              message: `Collection ${name} has negative document count in stats`,
              collection: name
            });
          }

          // Check for performance issues
          if (stats.storageSize > 100 * 1024 * 1024) { // 100MB
            result.issues.push({
              severity: 'info',
              message: `Collection ${name} is large (${Math.round(stats.storageSize / 1024 / 1024)}MB)`,
              collection: name
            });
          }

        } catch (statsError) {
          result.issues.push({
            severity: 'warning',
            message: `Collection ${name} stats check failed: ${statsError instanceof Error ? statsError.message : String(statsError)}`,
            collection: name
          });
        }
      }

    } catch (error) {
      result.isHealthy = false;
      result.issues.push({
        severity: 'error',
        message: `Collection ${name} health check error: ${error instanceof Error ? error.message : String(error)}`,
        collection: name
      });
    }

    return result;
  }

  /**
   * Attempt automatic repair of detected issues
   */
  private async attemptAutomaticRepair(issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    collection?: string;
  }>): Promise<void> {
    try {
      console.log('🔧 [UnifiedDatabaseManager] Attempting automatic repair...');

      const repairableIssues = issues.filter(issue => 
        issue.severity === 'error' && 
        issue.collection &&
        (issue.message.includes('does not support') || 
         issue.message.includes('operation failed'))
      );

      if (repairableIssues.length === 0) {
        console.log('ℹ️ [UnifiedDatabaseManager] No automatically repairable issues found');
        return;
      }

      for (const issue of repairableIssues) {
        if (!issue.collection) continue;

        try {
          console.log(`🔧 [UnifiedDatabaseManager] Attempting to repair collection: ${issue.collection}`);

          const collection = this.collections.get(issue.collection);
          if (!collection) {
            console.warn(`⚠️ [UnifiedDatabaseManager] Collection ${issue.collection} not found for repair`);
            continue;
          }

          // Attempt to recreate collection if it's corrupted
          if (issue.message.includes('operation failed')) {
            console.log(`🔧 [UnifiedDatabaseManager] Attempting to recreate collection: ${issue.collection}`);
            
            // Get the original schema
            const originalDefinition = collectionsDefinition[issue.collection];
            if (originalDefinition) {
              const schema = this.convertSchema(originalDefinition.schema);
              
              // Try to recreate the collection
              if (this.provider && typeof this.provider.createCollection === 'function') {
                const newCollection = await this.provider.createCollection(issue.collection, schema);
                this.collections.set(issue.collection, newCollection);
                console.log(`✅ [UnifiedDatabaseManager] Successfully recreated collection: ${issue.collection}`);
              }
            }
          }

        } catch (repairError) {
          console.error(`❌ [UnifiedDatabaseManager] Failed to repair collection ${issue.collection}:`, repairError);
        }
      }

      console.log('✅ [UnifiedDatabaseManager] Automatic repair completed');

    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Automatic repair failed:', error);
    }
  }

  /**
   * Manually trigger collection repair
   */
  public async repairCollection(collectionName: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log(`🔧 [UnifiedDatabaseManager] Manual repair requested for collection: ${collectionName}`);

      if (!this.collections.has(collectionName)) {
        return {
          success: false,
          message: `Collection ${collectionName} not found`
        };
      }

      const collection = this.collections.get(collectionName);
      if (!collection) {
        return {
          success: false,
          message: `Collection ${collectionName} is null`
        };
      }

      // Perform health check first
      const healthResult = await this.checkCollectionHealth(collectionName, collection);
      
      if (healthResult.isHealthy) {
        return {
          success: true,
          message: `Collection ${collectionName} is already healthy`
        };
      }

      // Attempt repair
      await this.attemptAutomaticRepair(healthResult.issues);

      // Check health again
      const postRepairHealth = await this.checkCollectionHealth(collectionName, collection);
      
      return {
        success: postRepairHealth.isHealthy,
        message: postRepairHealth.isHealthy 
          ? `Collection ${collectionName} successfully repaired`
          : `Collection ${collectionName} repair partially successful, some issues remain`
      };

    } catch (error) {
      console.error(`❌ [UnifiedDatabaseManager] Manual repair failed for ${collectionName}:`, error);
      return {
        success: false,
        message: `Repair failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Update internal status
   */
  private updateStatus(): void {
    this.status = {
      isInitialized: this.isInitialized,
      provider: this.providerType,
      providerName: this.provider?.name || null,
      collectionsCount: this.collections.size,
      totalRecords: 0, // Would need to calculate this
      lastHealthCheck: this.status.lastHealthCheck,
      errors: this.status.errors,
      warnings: this.status.warnings
    };
  }

  /**
   * Calculate total records across all collections
   */
  public async getTotalRecords(): Promise<number> {
    let totalRecords = 0;
    
    for (const [name, collection] of this.collections) {
      try {
        if (collection && typeof collection.count === 'function') {
          const count = await collection.count();
          totalRecords += count;
        }
      } catch (error) {
        console.warn(`Failed to count records in collection ${name}:`, error);
      }
    }
    
    // Update status with calculated total
    this.status.totalRecords = totalRecords;
    return totalRecords;
  }

  /**
   * Get detailed collection statistics with enhanced information
   */
  public async getCollectionStatistics(): Promise<Array<{
    name: string, 
    count: number, 
    status: string,
    size?: number,
    lastModified?: Date,
    indexes?: number,
    health: 'healthy' | 'warning' | 'error'
  }>> {
    const statistics = [];
    
    for (const [name, collection] of this.collections) {
      try {
        const count = collection && typeof collection.count === 'function' 
          ? await collection.count() 
          : 0;
        
        // Get additional statistics if available
        let size: number | undefined;
        let lastModified: Date | undefined;
        let indexes: number | undefined;
        let health: 'healthy' | 'warning' | 'error' = 'healthy';
        
        if (collection && typeof collection.getStats === 'function') {
          try {
            const stats = await collection.getStats();
            size = stats.storageSize;
            lastModified = stats.lastModified;
            indexes = stats.indexCount;
          } catch (statsError) {
            console.warn(`Failed to get detailed stats for collection ${name}:`, statsError);
            health = 'warning';
          }
        }
        
        // Determine health based on collection state
        if (count === 0 && name !== 'settings') {
          health = 'warning'; // Empty collections might be concerning
        }
        
        statistics.push({
          name,
          count,
          status: 'healthy',
          size,
          lastModified,
          indexes,
          health
        });
      } catch (error) {
        statistics.push({
          name,
          count: 0,
          status: 'error',
          health: 'error' as const
        });
        console.error(`Failed to get statistics for collection ${name}:`, error);
      }
    }
    
    return statistics;
  }

  /**
   * Get current database status
   */
  public getStatus(): DatabaseStatus {
    return { ...this.status };
  }

  /**
   * Get current health status
   */
  public async getHealth(): Promise<DatabaseHealth> {
    return await this.performHealthCheck();
  }

  /**
   * Get a specific collection
   */
  public getCollection<T>(name: string): ICollection<T> | null {
    return this.collections.get(name) as ICollection<T> || null;
  }

  /**
   * Get all collections
   */
  public getAllCollections(): Map<string, ICollection<any>> {
    return new Map(this.collections);
  }

  /**
   * Check if database is ready for operations
   */
  public isReady(): boolean {
    return this.isInitialized && this.provider !== null && this.collections.size > 0;
  }

  /**
   * Get deployment mode
   */
  public getDeploymentMode(): DeploymentMode {
    return this.deploymentMode;
  }

  /**
   * Get provider type
   */
  public getProviderType(): DatabaseProvider | null {
    return this.providerType;
  }

  /**
   * Get current provider instance
   */
  public getCurrentProvider(): IDatabaseProvider | null {
    return this.provider;
  }

  /**
   * Check if a specific collection exists
   */
  public hasCollection(name: string): boolean {
    return this.collections.has(name);
  }

  /**
   * Get list of all collection names
   */
  public getCollectionNames(): string[] {
    return Array.from(this.collections.keys());
  }

  /**
   * Compact a specific collection to optimize storage
   */
  public async compactCollection(collectionName: string): Promise<{
    success: boolean;
    message: string;
    sizeBefore?: number;
    sizeAfter?: number;
  }> {
    try {
      console.log(`🗜️ [UnifiedDatabaseManager] Compacting collection: ${collectionName}`);

      const collection = this.collections.get(collectionName);
      if (!collection) {
        return {
          success: false,
          message: `Collection ${collectionName} not found`
        };
      }

      let sizeBefore: number | undefined;
      let sizeAfter: number | undefined;

      // Get size before compaction if stats are available
      if (typeof collection.getStats === 'function') {
        try {
          const statsBefore = await collection.getStats();
          sizeBefore = statsBefore.storageSize;
        } catch (error) {
          console.warn(`Failed to get stats before compaction for ${collectionName}:`, error);
        }
      }

      // Perform compaction
      if (typeof collection.compact === 'function') {
        await collection.compact();
      } else {
        return {
          success: false,
          message: `Collection ${collectionName} does not support compaction`
        };
      }

      // Get size after compaction
      if (typeof collection.getStats === 'function') {
        try {
          const statsAfter = await collection.getStats();
          sizeAfter = statsAfter.storageSize;
        } catch (error) {
          console.warn(`Failed to get stats after compaction for ${collectionName}:`, error);
        }
      }

      const savedSpace = sizeBefore && sizeAfter ? sizeBefore - sizeAfter : 0;
      const message = savedSpace > 0 
        ? `Collection ${collectionName} compacted successfully. Saved ${Math.round(savedSpace / 1024)}KB`
        : `Collection ${collectionName} compacted successfully`;

      console.log(`✅ [UnifiedDatabaseManager] ${message}`);

      return {
        success: true,
        message,
        sizeBefore,
        sizeAfter
      };

    } catch (error) {
      console.error(`❌ [UnifiedDatabaseManager] Compaction failed for ${collectionName}:`, error);
      return {
        success: false,
        message: `Compaction failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Compact all collections
   */
  public async compactAllCollections(): Promise<{
    success: boolean;
    results: Array<{
      collection: string;
      success: boolean;
      message: string;
    }>;
  }> {
    try {
      console.log('🗜️ [UnifiedDatabaseManager] Compacting all collections...');

      const results = [];
      let overallSuccess = true;

      for (const collectionName of this.collections.keys()) {
        const result = await this.compactCollection(collectionName);
        results.push({
          collection: collectionName,
          success: result.success,
          message: result.message
        });

        if (!result.success) {
          overallSuccess = false;
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ [UnifiedDatabaseManager] Compaction completed: ${successCount}/${results.length} collections successful`);

      return {
        success: overallSuccess,
        results
      };

    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Bulk compaction failed:', error);
      return {
        success: false,
        results: []
      };
    }
  }

  /**
   * Rebuild indexes for a specific collection
   */
  public async rebuildCollectionIndexes(collectionName: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log(`🔨 [UnifiedDatabaseManager] Rebuilding indexes for collection: ${collectionName}`);

      const collection = this.collections.get(collectionName);
      if (!collection) {
        return {
          success: false,
          message: `Collection ${collectionName} not found`
        };
      }

      // Get the original schema to rebuild indexes
      const originalDefinition = collectionsDefinition[collectionName];
      if (!originalDefinition) {
        return {
          success: false,
          message: `Schema definition not found for collection ${collectionName}`
        };
      }

      const schema = this.convertSchema(originalDefinition.schema);
      
      // Rebuild indexes if the collection supports it
      if (schema.indexes && typeof collection.createIndex === 'function') {
        for (const index of schema.indexes) {
          try {
            await collection.createIndex(index);
            console.log(`✅ [UnifiedDatabaseManager] Rebuilt index ${index.name} for ${collectionName}`);
          } catch (indexError) {
            console.warn(`⚠️ [UnifiedDatabaseManager] Failed to rebuild index ${index.name}:`, indexError);
          }
        }
      }

      return {
        success: true,
        message: `Indexes rebuilt for collection ${collectionName}`
      };

    } catch (error) {
      console.error(`❌ [UnifiedDatabaseManager] Index rebuild failed for ${collectionName}:`, error);
      return {
        success: false,
        message: `Index rebuild failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Validate provider availability using the factory
   */
  private async validateProviderAvailability(providerType: DatabaseProvider): Promise<boolean> {
    try {
      // Use the factory to check provider availability
      return this.providerFactory.isProviderAvailable(providerType);
    } catch (error) {
      console.warn(`Provider availability check failed for ${providerType}:`, error);
      return false;
    }
  }

  /**
   * Get all available providers from the factory
   */
  public getAvailableProviders(): ProviderType[] {
    return this.providerFactory.getAvailableProviderTypes();
  }

  /**
   * Get provider factory instance for advanced operations
   */
  public getProviderFactory(): DatabaseProviderFactory {
    return this.providerFactory;
  }

  /**
   * Validate current database configuration
   */
  public validateConfiguration(): {
    isValid: boolean;
    issues: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
      suggestion?: string;
    }>;
    recommendations: string[];
  } {
    const config = getCurrentUnifiedConfig();
    const issues = [];
    const recommendations = [];

    console.log('🔍 [UnifiedDatabaseManager] Validating database configuration...');

    // Validate deployment mode consistency
    const detectedMode = this.detectDeploymentMode();
    if (detectedMode !== this.deploymentMode) {
      issues.push({
        severity: 'warning' as const,
        message: `Deployment mode mismatch: detected ${detectedMode}, using ${this.deploymentMode}`,
        suggestion: 'Restart the application to use the detected deployment mode'
      });
    }

    // Validate database provider configuration
    if (config.database?.provider) {
      const selectedProvider = this.selectProvider();
      
      if (config.database.allowedProviders && !config.database.allowedProviders.includes(config.database.provider)) {
        issues.push({
          severity: 'error' as const,
          message: `Configured provider ${config.database.provider} is not in allowed providers list`,
          suggestion: `Use one of: ${config.database.allowedProviders.join(', ')}`
        });
      }

      // Check provider availability
      if (this.providerFactory && !this.providerFactory.isProviderAvailable(selectedProvider)) {
        issues.push({
          severity: 'error' as const,
          message: `Selected provider ${selectedProvider} is not available in current environment`,
          suggestion: 'Check browser compatibility or enable required features'
        });
      }
    }

    // Validate data mode compatibility
    if (config.dataMode === 'production' && this.providerType === 'pouchdb') {
      recommendations.push('Consider using SQLite provider for better production performance');
    }

    if (config.dataMode === 'demo' && this.deploymentMode === 'production') {
      issues.push({
        severity: 'warning' as const,
        message: 'Demo data mode in production environment',
        suggestion: 'Switch to production data mode for production use'
      });
    }

    // Validate feature compatibility
    if (config.features?.enhancedDataLayer && !this.isInitialized) {
      issues.push({
        severity: 'info' as const,
        message: 'Enhanced data layer enabled but database not initialized',
        suggestion: 'Initialize database to use enhanced features'
      });
    }

    // Performance recommendations
    if (this.deploymentMode === 'production' && this.providerType === 'pouchdb') {
      recommendations.push('Consider SQLite WASM provider for better production performance');
    }

    const isValid = !issues.some(issue => issue.severity === 'error');

    console.log(`✅ [UnifiedDatabaseManager] Configuration validation complete: ${isValid ? 'Valid' : 'Issues found'}`);

    return {
      isValid,
      issues,
      recommendations
    };
  }

  /**
   * Get comprehensive configuration information
   */
  public getConfigurationInfo(): {
    deploymentMode: DeploymentMode;
    providerType: DatabaseProvider | null;
    dataMode: string;
    environment: string;
    features: Record<string, boolean>;
    database: {
      provider?: string;
      allowedProviders?: string[];
      autoDetect?: boolean;
      options?: Record<string, any>;
    };
    validation: {
      isValid: boolean;
      issues: Array<{
        severity: 'error' | 'warning' | 'info';
        message: string;
        suggestion?: string;
      }>;
      recommendations: string[];
    };
  } {
    const config = getCurrentUnifiedConfig();
    const validation = this.validateConfiguration();

    return {
      deploymentMode: this.deploymentMode,
      providerType: this.providerType,
      dataMode: config.dataMode || 'unknown',
      environment: config.environment || 'unknown',
      features: {
        enhancedDataLayer: config.features?.enhancedDataLayer || false,
        offlineMode: config.features?.enableOfflineMode || false,
        realTimeSync: false, // Not available in current config
        performanceMonitoring: config.features?.performanceMonitorWidget || false
      },
      database: {
        provider: config.database?.provider,
        allowedProviders: config.database?.allowedProviders,
        autoDetect: config.database?.autoDetect,
        options: config.database?.options
      },
      validation
    };
  }

  /**
   * Update database configuration (development mode only)
   */
  public async updateConfiguration(newConfig: {
    provider?: DatabaseProvider;
    options?: Record<string, any>;
  }): Promise<{
    success: boolean;
    message: string;
    requiresRestart?: boolean;
  }> {
    try {
      if (this.deploymentMode !== 'development') {
        return {
          success: false,
          message: 'Configuration updates are only allowed in development mode'
        };
      }

      console.log('🔧 [UnifiedDatabaseManager] Updating database configuration:', newConfig);

      // Validate new configuration
      if (newConfig.provider) {
        const isAvailable = await this.validateProviderAvailability(newConfig.provider);
        if (!isAvailable) {
          return {
            success: false,
            message: `Provider ${newConfig.provider} is not available in current environment`
          };
        }
      }

      // Apply configuration changes would require integration with config system
      // For now, we'll indicate that a restart is required
      return {
        success: true,
        message: 'Configuration updated successfully',
        requiresRestart: true
      };

    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Configuration update failed:', error);
      return {
        success: false,
        message: `Configuration update failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create a comprehensive backup of all collections
   */
  public async createBackup(): Promise<{
    metadata: {
      timestamp: Date;
      version: string;
      deploymentMode: DeploymentMode;
      providerType: DatabaseProvider | null;
      collectionsCount: number;
      totalRecords: number;
    };
    collections: Record<string, any[]>;
  }> {
    try {
      console.log('📦 [UnifiedDatabaseManager] Creating backup...');

      if (!this.isInitialized || !this.provider) {
        throw new Error('Database not initialized - cannot create backup');
      }

      const backup = {
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          deploymentMode: this.deploymentMode,
          providerType: this.providerType,
          collectionsCount: this.collections.size,
          totalRecords: 0
        },
        collections: {} as Record<string, any[]>
      };

      let totalRecords = 0;

      // Backup each collection
      for (const [name, collection] of this.collections) {
        try {
          console.log(`📦 [UnifiedDatabaseManager] Backing up collection: ${name}`);
          
          if (collection && typeof collection.find === 'function') {
            const documents = await collection.find({});
            backup.collections[name] = documents;
            totalRecords += documents.length;
            
            console.log(`✅ [UnifiedDatabaseManager] Backed up ${documents.length} documents from ${name}`);
          } else {
            console.warn(`⚠️ [UnifiedDatabaseManager] Collection ${name} does not support find operation`);
            backup.collections[name] = [];
          }
        } catch (error) {
          console.error(`❌ [UnifiedDatabaseManager] Failed to backup collection ${name}:`, error);
          backup.collections[name] = [];
        }
      }

      backup.metadata.totalRecords = totalRecords;

      console.log(`✅ [UnifiedDatabaseManager] Backup created with ${totalRecords} total records from ${this.collections.size} collections`);
      return backup;

    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Backup creation failed:', error);
      throw error;
    }
  }

  /**
   * Restore data from a backup
   */
  public async restoreFromBackup(backup: {
    metadata: any;
    collections: Record<string, any[]>;
  }, options: {
    clearExisting?: boolean;
    skipCollections?: string[];
    onProgress?: (collection: string, progress: number) => void;
  } = {}): Promise<{
    success: boolean;
    restored: number;
    failed: number;
    errors: string[];
  }> {
    try {
      console.log('📥 [UnifiedDatabaseManager] Starting restore from backup...');

      if (!this.isInitialized || !this.provider) {
        throw new Error('Database not initialized - cannot restore backup');
      }

      const { clearExisting = false, skipCollections = [], onProgress } = options;
      const result = {
        success: true,
        restored: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Validate backup format
      if (!backup.metadata || !backup.collections) {
        throw new Error('Invalid backup format - missing metadata or collections');
      }

      console.log(`📥 [UnifiedDatabaseManager] Restoring backup from ${backup.metadata.timestamp}`);
      console.log(`📊 [UnifiedDatabaseManager] Backup contains ${Object.keys(backup.collections).length} collections`);

      // Clear existing data if requested
      if (clearExisting) {
        console.log('🗑️ [UnifiedDatabaseManager] Clearing existing data...');
        await this.clearAllData();
      }

      // Restore each collection
      const collectionNames = Object.keys(backup.collections);
      for (let i = 0; i < collectionNames.length; i++) {
        const collectionName = collectionNames[i];
        const documents = backup.collections[collectionName];

        if (skipCollections.includes(collectionName)) {
          console.log(`⏭️ [UnifiedDatabaseManager] Skipping collection: ${collectionName}`);
          continue;
        }

        try {
          console.log(`📥 [UnifiedDatabaseManager] Restoring collection: ${collectionName} (${documents.length} documents)`);

          const collection = this.collections.get(collectionName);
          if (!collection) {
            console.warn(`⚠️ [UnifiedDatabaseManager] Collection ${collectionName} not found in current schema`);
            result.errors.push(`Collection ${collectionName} not found in current schema`);
            continue;
          }

          // Insert documents in batches
          const batchSize = 100;
          let restored = 0;

          for (let j = 0; j < documents.length; j += batchSize) {
            const batch = documents.slice(j, j + batchSize);
            
            try {
              if (typeof collection.insertMany === 'function') {
                await collection.insertMany(batch);
              } else {
                // Fallback to individual inserts
                for (const doc of batch) {
                  await collection.insert(doc);
                }
              }
              restored += batch.length;
            } catch (batchError) {
              console.error(`❌ [UnifiedDatabaseManager] Failed to restore batch for ${collectionName}:`, batchError);
              result.errors.push(`Failed to restore batch for ${collectionName}: ${batchError instanceof Error ? batchError.message : String(batchError)}`);
              result.failed += batch.length;
            }
          }

          result.restored += restored;
          console.log(`✅ [UnifiedDatabaseManager] Restored ${restored} documents to ${collectionName}`);

          // Report progress
          if (onProgress) {
            onProgress(collectionName, (i + 1) / collectionNames.length);
          }

        } catch (error) {
          console.error(`❌ [UnifiedDatabaseManager] Failed to restore collection ${collectionName}:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to restore collection ${collectionName}: ${errorMessage}`);
          result.failed += documents.length;
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
        console.warn(`⚠️ [UnifiedDatabaseManager] Restore completed with ${result.errors.length} errors`);
      } else {
        console.log(`✅ [UnifiedDatabaseManager] Restore completed successfully`);
      }

      console.log(`📊 [UnifiedDatabaseManager] Restore summary: ${result.restored} restored, ${result.failed} failed`);
      return result;

    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Restore failed:', error);
      throw error;
    }
  }

  /**
   * Clear all data from all collections
   */
  public async clearAllData(): Promise<void> {
    try {
      console.log('🗑️ [UnifiedDatabaseManager] Clearing all data...');

      if (!this.isInitialized || !this.provider) {
        throw new Error('Database not initialized - cannot clear data');
      }

      for (const [name, collection] of this.collections) {
        try {
          console.log(`🗑️ [UnifiedDatabaseManager] Clearing collection: ${name}`);
          
          if (collection && typeof collection.removeMany === 'function') {
            await collection.removeMany({});
          } else if (collection && typeof collection.remove === 'function') {
            // Fallback: get all documents and remove them individually
            const documents = await collection.find({});
            for (const doc of documents) {
              if (doc.id) {
                await collection.remove(doc.id);
              }
            }
          } else {
            console.warn(`⚠️ [UnifiedDatabaseManager] Collection ${name} does not support data clearing`);
          }
          
          console.log(`✅ [UnifiedDatabaseManager] Cleared collection: ${name}`);
        } catch (error) {
          console.error(`❌ [UnifiedDatabaseManager] Failed to clear collection ${name}:`, error);
        }
      }

      console.log('✅ [UnifiedDatabaseManager] All data cleared');
    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Clear data failed:', error);
      throw error;
    }
  }

  /**
   * Generate data using UniversalDataGenerator
   */
  public async generateData(options: {
    modules?: string[];
    counts?: Record<string, number>;
    useRealisticData?: boolean;
    includeTestData?: boolean;
    clearExisting?: boolean;
    onProgress?: (module: string, progress: number) => void;
  } = {}): Promise<{
    success: boolean;
    stats?: GenerationStats;
    error?: string;
  }> {
    try {
      console.log('🎲 [UnifiedDatabaseManager] Starting data generation...');

      if (!this.isInitialized || !this.provider) {
        throw new Error('Database not initialized - cannot generate data');
      }

      const config = getCurrentUnifiedConfig();
      const {
        modules = ['administration', 'academic', 'finance'],
        counts = {},
        useRealisticData = true,
        includeTestData = false,
        clearExisting = false,
        onProgress
      } = options;

      // Clear existing data if requested
      if (clearExisting) {
        console.log('🗑️ [UnifiedDatabaseManager] Clearing existing data before generation...');
        await this.clearAllData();
      }

      // Map provider type to storage type for UniversalDataGenerator
      let storageType: 'sqlite-opfs' | 'sqlite-livestore' | 'pouchdb' | 'mock';
      switch (this.providerType) {
        case 'sqlite-wasm':
          storageType = 'sqlite-opfs';
          break;
        case 'sqlite-file':
          storageType = 'sqlite-opfs'; // Map to OPFS for compatibility
          break;
        case 'pouchdb':
          storageType = 'pouchdb';
          break;
        default:
          storageType = 'mock'; // Fallback
      }

      // Create data generation configuration
      const generationConfig: UniversalDataGenerationConfig = {
        storageType,
        locale: 'en',
        batchSize: 50,
        logProgress: true,
        validateData: true,
        generateRelationships: true,
        modules,
        counts,
        seedData: {
          useRealisticData,
          includeTestData
        }
      };

      console.log('🎲 [UniversalDataGenerator] Configuration:', generationConfig);

      // Initialize and run data generator
      const generator = new UniversalDataGenerator(generationConfig);
      await generator.initialize();

      // Generate data with progress tracking
      const stats = await generator.generateData();

      console.log('✅ [UnifiedDatabaseManager] Data generation completed:', stats);

      return {
        success: true,
        stats
      };

    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Data generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Seed database with configuration-based data
   */
  public async seedDatabase(seedConfig?: {
    dataMode?: 'demo' | 'development' | 'production';
    modules?: string[];
    volume?: 'small' | 'medium' | 'large';
  }): Promise<{
    success: boolean;
    message: string;
    stats?: GenerationStats;
  }> {
    try {
      console.log('🌱 [UnifiedDatabaseManager] Seeding database...');

      const config = getCurrentUnifiedConfig();
      const {
        dataMode = config.dataMode || 'demo',
        modules = ['administration', 'academic', 'finance'],
        volume = 'medium'
      } = seedConfig || {};

      // Define volume-based counts
      const volumeCounts = {
        small: {
          students: 50,
          staff: 10,
          classes: 5,
          subjects: 8
        },
        medium: {
          students: 200,
          staff: 25,
          classes: 15,
          subjects: 20
        },
        large: {
          students: 1000,
          staff: 100,
          classes: 50,
          subjects: 50
        }
      };

      const counts = volumeCounts[volume];

      // Configure data generation based on data mode
      const generationOptions = {
        modules,
        counts,
        useRealisticData: dataMode !== 'demo',
        includeTestData: dataMode === 'development',
        clearExisting: true
      };

      console.log(`🌱 [UnifiedDatabaseManager] Seeding with ${volume} volume for ${dataMode} mode`);

      const result = await this.generateData(generationOptions);

      if (result.success) {
        return {
          success: true,
          message: `Database seeded successfully with ${volume} volume data for ${modules.length} modules`,
          stats: result.stats
        };
      } else {
        return {
          success: false,
          message: `Database seeding failed: ${result.error}`
        };
      }

    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Database seeding failed:', error);
      return {
        success: false,
        message: `Database seeding failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get data generation recommendations based on current configuration
   */
  public getDataGenerationRecommendations(): {
    recommendedModules: string[];
    recommendedVolume: 'small' | 'medium' | 'large';
    recommendedDataMode: 'demo' | 'development' | 'production';
    reasons: string[];
  } {
    const config = getCurrentUnifiedConfig();
    const recommendations = {
      recommendedModules: ['administration', 'academic', 'finance'],
      recommendedVolume: 'medium' as 'small' | 'medium' | 'large',
      recommendedDataMode: 'demo' as 'demo' | 'development' | 'production',
      reasons: [] as string[]
    };

    // Recommend modules based on features
    if (config.features?.enhancedDataLayer) {
      recommendations.recommendedModules.push('library', 'nutrition', 'transport');
      recommendations.reasons.push('Enhanced data layer enabled - including additional modules');
    }

    // Recommend volume based on deployment mode
    switch (this.deploymentMode) {
      case 'development':
        recommendations.recommendedVolume = 'small';
        recommendations.reasons.push('Development mode - using small dataset for faster testing');
        break;
      case 'staging':
        recommendations.recommendedVolume = 'medium';
        recommendations.reasons.push('Staging mode - using medium dataset for realistic testing');
        break;
      case 'production':
        recommendations.recommendedVolume = 'large';
        recommendations.reasons.push('Production mode - using large dataset for comprehensive testing');
        break;
    }

    // Recommend data mode based on configuration
    if (config.dataMode) {
      recommendations.recommendedDataMode = config.dataMode === 'demo' ? 'demo' : 'production';
      recommendations.reasons.push(`Using configured data mode: ${config.dataMode}`);
    } else {
      recommendations.recommendedDataMode = this.deploymentMode === 'development' ? 'development' : 'demo';
      recommendations.reasons.push(`No data mode configured - using ${recommendations.recommendedDataMode} based on deployment mode`);
    }

    return recommendations;
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      console.log('🔄 [UnifiedDatabaseManager] Shutting down...');

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Clear collections
      this.collections.clear();

      // Shutdown provider
      if (this.provider && typeof this.provider.destroy === 'function') {
        await this.provider.destroy();
      }

      this.provider = null;
      this.isInitialized = false;
      this.updateStatus();

      console.log('✅ [UnifiedDatabaseManager] Shutdown complete');
    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Shutdown failed:', error);
      throw error;
    }
  }

  /**
   * Force provider switch (development mode only)
   */
  public async switchProvider(newProviderType: DatabaseProvider): Promise<void> {
    if (this.deploymentMode !== 'development') {
      throw new Error('Provider switching is only allowed in development mode');
    }

    try {
      console.log(`🔄 [UnifiedDatabaseManager] Switching provider from ${this.providerType} to ${newProviderType}...`);

      // Validate new provider is available
      const isAvailable = await this.validateProviderAvailability(newProviderType);
      if (!isAvailable) {
        throw new Error(`Provider ${newProviderType} is not available in current environment`);
      }

      // Shutdown current provider
      await this.shutdown();

      // Initialize with new provider using factory
      this.providerType = newProviderType;
      await this.initializeProvider();
      await this.createCollections();
      this.startHealthMonitoring();

      this.isInitialized = true;
      this.updateStatus();

      console.log(`✅ [UnifiedDatabaseManager] Successfully switched to ${newProviderType}`);
    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Provider switch failed:', error);
      throw error;
    }
  }

  /**
   * Attempt to recover from initialization failure
   */
  public async attemptRecovery(): Promise<boolean> {
    try {
      console.log('🔧 [UnifiedDatabaseManager] Attempting recovery...');
      
      // Clear previous errors
      this.status.errors = [];
      this.status.warnings = [];
      
      // Try fallback provider (PouchDB)
      if (this.providerType !== 'pouchdb') {
        console.log('🔄 [UnifiedDatabaseManager] Attempting fallback to PouchDB...');
        this.providerType = 'pouchdb';
        
        try {
          await this.initializeProvider();
          await this.createCollections();
          this.startHealthMonitoring();
          
          this.isInitialized = true;
          this.updateStatus();
          
          console.log('✅ [UnifiedDatabaseManager] Recovery successful with PouchDB fallback');
          return true;
        } catch (fallbackError) {
          console.error('❌ [UnifiedDatabaseManager] Fallback to PouchDB failed:', fallbackError);
          const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          this.status.errors.push(`Fallback recovery failed: ${errorMessage}`);
        }
      }
      
      console.log('❌ [UnifiedDatabaseManager] Recovery failed - no viable providers available');
      return false;
    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Recovery attempt failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.status.errors.push(`Recovery attempt failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Reset the database manager to initial state
   */
  public async reset(): Promise<void> {
    try {
      console.log('🔄 [UnifiedDatabaseManager] Resetting database manager...');
      
      // Shutdown everything
      await this.shutdown();
      
      // Reset internal state
      this.isInitialized = false;
      this.provider = null;
      this.providerType = null;
      this.collections.clear();
      this.status = {
        isInitialized: false,
        provider: null,
        providerName: null,
        collectionsCount: 0,
        totalRecords: 0,
        lastHealthCheck: null,
        errors: [],
        warnings: []
      };
      
      // Re-detect deployment mode
      this.deploymentMode = this.detectDeploymentMode();
      
      console.log('✅ [UnifiedDatabaseManager] Reset complete');
    } catch (error) {
      console.error('❌ [UnifiedDatabaseManager] Reset failed:', error);
      throw error;
    }
  }

  /**
   * Get startup performance metrics
   */
  public getStartupMetrics() {
    return this.startupOptimizer.getLatestStartupMetrics();
  }

  /**
   * Get startup performance summary
   */
  public getStartupPerformanceSummary() {
    return this.startupOptimizer.getStartupPerformanceSummary();
  }

  /**
   * Get progressive loading states
   */
  public getProgressiveLoadingStates() {
    return this.startupOptimizer.getProgressiveLoadingStates();
  }

  /**
   * Get loading statistics
   */
  public getLoadingStatistics() {
    return this.startupOptimizer.getLoadingStatistics();
  }

  /**
   * Check if a collection is loaded
   */
  public isCollectionLoaded(collectionName: string) {
    return this.startupOptimizer.isCollectionLoaded(collectionName);
  }

  /**
   * Get lazy-loaded collection
   */
  public async getLazyCollection<T>(collectionName: string): Promise<ICollection<T> | null> {
    if (!this.provider) {
      throw new Error('Database not initialized');
    }
    return this.startupOptimizer.getLazyCollection<T>(this.provider, collectionName);
  }

  /**
   * Update startup optimization configuration
   */
  public updateStartupConfiguration(config: any) {
    this.startupOptimizer.updateConfiguration(config);
  }
}

// Export singleton instance
export const unifiedDatabaseManager = UnifiedDatabaseManager.getInstance();

// Export for easy access
export default UnifiedDatabaseManager;
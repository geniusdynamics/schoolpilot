import { moduleRegistry } from '../core/moduleRegistry';

interface ModuleConfig {
  id: string;
  enabled: boolean;
  settings?: Record<string, any>;
  lastModified: Date;
}

// Add missing ModuleInfo interface
export interface ModuleInfo {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  required: boolean;
  dependencies: string[];
  dependencySatisfied: boolean;
  missingDependencies: string[];
}

class ModuleConfigService {
  private readonly STORAGE_KEY = 'module_configurations';
  private configs: Map<string, ModuleConfig> = new Map();
  private isLoading = false;

  constructor() {
    console.log('[ModuleConfigService] Initializing...');
    this.loadConfigurations();
    console.log('[ModuleConfigService] Initialization complete');
    console.log('[ModuleConfigService] DEBUG: Enabled modules after init:', this.getEnabledModules());
  }

  private loadConfigurations(): void {
    if (this.isLoading) {
      console.warn('[ModuleConfigService] Already loading configurations, skipping...');
      return;
    }
    
    this.isLoading = true;
    console.log('[ModuleConfigService] Loading configurations from localStorage...');
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        console.log('[ModuleConfigService] Found stored configurations:', stored.length, 'characters');
        const configs = JSON.parse(stored);
        this.configs = new Map(Object.entries(configs).map(([id, config]: [string, any]) => [
          id,
          {
            ...config,
            lastModified: new Date(config.lastModified)
          }
        ]));
        console.log('[ModuleConfigService] Loaded', this.configs.size, 'module configurations');
      } else {
        console.log('[ModuleConfigService] No stored configurations found');
      }
    } catch (error) {
      console.error('[ModuleConfigService] Failed to load module configurations:', error);
      this.configs = new Map();
    } finally {
      this.isLoading = false;
    }
  }

  private saveConfigurations(): void {
    try {
      const configsObj = Object.fromEntries(
        Array.from(this.configs.entries()).map(([id, config]) => [
          id,
          {
            ...config,
            lastModified: config.lastModified.toISOString()
          }
        ])
      );
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configsObj));
    } catch (error) {
      console.error('Failed to save module configurations:', error);
    }
  }

  enableModule(moduleId: string): boolean {
    try {
      const config: ModuleConfig = this.configs.get(moduleId) || {
        id: moduleId,
        enabled: false,
        lastModified: new Date()
      };

      config.enabled = true;
      config.lastModified = new Date();
      this.configs.set(moduleId, config);
      this.saveConfigurations();
      return true;
    } catch (error) {
      console.error('Failed to enable module:', error);
      return false;
    }
  }

  disableModule(moduleId: string): boolean {
    try {
      const config: ModuleConfig = this.configs.get(moduleId) || {
        id: moduleId,
        enabled: true,
        lastModified: new Date()
      };

      config.enabled = false;
      config.lastModified = new Date();
      this.configs.set(moduleId, config);
      this.saveConfigurations();
      return true;
    } catch (error) {
      console.error('Failed to disable module:', error);
      return false;
    }
  }

  isModuleEnabled(moduleId: string): boolean {
    // Core modules are always enabled
    const coreModules = ['dashboard', 'settings', 'reports'];
    if (coreModules.includes(moduleId)) {
      console.log(`[ModuleConfigService] DEBUG: isModuleEnabled(${moduleId}) = true (core module)`);
      return true;
    }
    
    const config = this.configs.get(moduleId);
    // Default to enabled if no configuration exists (auto-enable discovered modules)
    const enabled = config?.enabled ?? true;
    console.log(`[ModuleConfigService] DEBUG: isModuleEnabled(${moduleId}) = ${enabled}, config:`, config);
    return enabled;
  }

  getEnabledModules(): string[] {
    // Always include core modules
    const coreModules = ['dashboard', 'settings', 'reports'];
    
    // Get explicitly configured modules that are enabled
    const configuredEnabled = Array.from(this.configs.entries())
      .filter(([_, config]) => config.enabled)
      .map(([id, _]) => id);
    
    // Use a default list of available modules since registry might not be populated yet
    const allAvailableModules = [
      'dashboard', 'administration', 'academics', 'finance', 
      'hr', 'inventory', 'library', 'nutrition', 'reports', 'settings'
    ];
    
    // Auto-enable modules that don't have explicit configuration (default behavior)
    const autoEnabled = allAvailableModules.filter(moduleId => 
      !this.configs.has(moduleId) && !coreModules.includes(moduleId)
    );
    
    // Combine all enabled modules and remove duplicates
    const allEnabled = [...new Set([...coreModules, ...configuredEnabled, ...autoEnabled])];
    
    console.log('[ModuleConfigService] DEBUG: getEnabledModules() returning:', allEnabled);
    console.log('[ModuleConfigService] DEBUG: Core modules:', coreModules);
    console.log('[ModuleConfigService] DEBUG: Configured enabled:', configuredEnabled);
    console.log('[ModuleConfigService] DEBUG: Auto-enabled:', autoEnabled);
    
    return allEnabled;
  }

  getModuleConfig(moduleId: string): ModuleConfig | null {
    return this.configs.get(moduleId) || null;
  }

  updateModuleSettings(moduleId: string, settings: Record<string, any>): void {
    const config = this.configs.get(moduleId);
    if (config) {
      config.settings = { ...config.settings, ...settings };
      config.lastModified = new Date();
      this.configs.set(moduleId, config);
      this.saveConfigurations();
    }
  }

  getModuleSettings(moduleId: string): Record<string, any> {
    const config = this.configs.get(moduleId);
    return config?.settings || {};
  }

  getAllConfigurations(): ModuleConfig[] {
    return Array.from(this.configs.values());
  }

  resetModuleConfig(moduleId: string): void {
    this.configs.delete(moduleId);
    this.saveConfigurations();
  }

  exportConfigurations(): string {
    return JSON.stringify(Object.fromEntries(this.configs), null, 2);
  }

  importConfigurations(configJson: string): void {
    try {
      const configs = JSON.parse(configJson);
      this.configs = new Map(Object.entries(configs).map(([id, config]: [string, any]) => [
        id,
        {
          ...config,
          lastModified: new Date(config.lastModified)
        }
      ]));
      this.saveConfigurations();
    } catch (error) {
      console.error('Failed to import module configurations:', error);
      throw new Error('Invalid configuration format');
    }
  }

  // Add missing methods that are called by moduleManagementService
  getAllModuleInfo(): ModuleInfo[] {
    console.log('[ModuleConfigService] Getting all module info...');
    const allModules = moduleRegistry.getAllModules();
    const coreModules = ['dashboard', 'settings', 'reports'];
    
    return allModules.map(module => {
      const config = this.configs.get(module.id);
      const dependencies = module.dependencies || [];
      const missingDeps = dependencies.filter(dep => !this.isModuleEnabled(dep));
      
      return {
        id: module.id,
        name: module.name,
        description: module.description || `${module.name} module`,
        enabled: coreModules.includes(module.id) || (config?.enabled ?? false),
        required: coreModules.includes(module.id),
        dependencies,
        dependencySatisfied: missingDeps.length === 0,
        missingDependencies: missingDeps
      };
    });
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    console.log('[ModuleConfigService] Validating configuration...');
    const errors: string[] = [];
    
    try {
      // Check for circular dependencies
      const allModules = moduleRegistry.getAllModules();
      for (const module of allModules) {
        if (module.dependencies) {
          const visited = new Set<string>();
          const stack = new Set<string>();
          
          if (this.hasCircularDependency(module.id, module.dependencies, visited, stack, allModules)) {
            errors.push(`Circular dependency detected for module: ${module.id}`);
          }
        }
      }
      
      return { valid: errors.length === 0, errors };
    } catch (error) {
      console.error('[ModuleConfigService] Error validating config:', error);
      return { valid: false, errors: ['Configuration validation failed'] };
    }
  }

  private hasCircularDependency(
    moduleId: string,
    dependencies: string[],
    visited: Set<string>,
    stack: Set<string>,
    allModules: any[]
  ): boolean {
    if (stack.has(moduleId)) return true;
    if (visited.has(moduleId)) return false;
    
    visited.add(moduleId);
    stack.add(moduleId);
    
    for (const dep of dependencies) {
      const depModule = allModules.find(m => m.id === dep);
      if (depModule && depModule.dependencies) {
        if (this.hasCircularDependency(dep, depModule.dependencies, visited, stack, allModules)) {
          return true;
        }
      }
    }
    
    stack.delete(moduleId);
    return false;
  }

  checkDependencies(moduleId: string): { satisfied: boolean; missing: string[] } {
    console.log('[ModuleConfigService] Checking dependencies for:', moduleId);
    const module = moduleRegistry.getModule(moduleId);
    if (!module || !module.dependencies) {
      return { satisfied: true, missing: [] };
    }
    
    const missing = module.dependencies.filter(dep => !this.isModuleEnabled(dep));
    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  getModuleDependencies(moduleId: string): string[] {
    console.log('[ModuleConfigService] Getting dependencies for:', moduleId);
    const module = moduleRegistry.getModule(moduleId);
    return module?.dependencies || [];
  }

  getConfig(): { moduleDependencies: Record<string, string[]> } {
    console.log('[ModuleConfigService] Getting full config...');
    const allModules = moduleRegistry.getAllModules();
    const moduleDependencies: Record<string, string[]> = {};
    
    allModules.forEach(module => {
      moduleDependencies[module.id] = module.dependencies || [];
    });
    
    return { moduleDependencies };
  }
}

export const moduleConfigService = new ModuleConfigService();
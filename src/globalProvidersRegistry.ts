// ABOUTME: Dynamically aggregates all global data providers/types from each module's data/index.ts for true modularity.
// ABOUTME: Allows the system to discover and use global providers/types without hardcoded imports or core changes.
// ABOUTME: Enhanced with metadata for better integration with AppDataContext and data hook factory.

import { DataHookConfig } from './hooks/useDataHookFactory';

// Interface for provider metadata
export interface ProviderMetadata {
  name: string;
  type: 'data' | 'service' | 'utility' | 'context';
  module: string;
  entityName?: string;
  requiresBackend?: boolean;
  allowOffline?: boolean;
  syncPriority?: 'low' | 'medium' | 'high' | 'critical';
}

// Enhanced registry type with metadata
export interface GlobalProviderRegistry {
  [key: string]: {
    provider: any;
    metadata: ProviderMetadata;
  };
}

// Registry for all global providers/types with metadata
const globalProviders: GlobalProviderRegistry = {};
let isInitialized = false;

// Extract module name from path
function extractModuleName(path: string): string {
  const match = path.match(/\.\/modules\/([^/]+)/);
  return match ? match[1] : 'unknown';
}

// Initialize providers asynchronously to avoid circular dependencies
async function initializeProviders(): Promise<void> {
  if (isInitialized) return;
  
  try {
    // Get all module data index files
    const moduleDataIndexes = import.meta.glob('./modules/*/data/index.ts');
    
    // Load each module's data exports
    for (const path in moduleDataIndexes) {
      try {
        const mod = await moduleDataIndexes[path]() as Record<string, any>;
        const moduleName = extractModuleName(path);
        
        for (const exportName in mod) {
          // Convention: global providers are exported as isXGlobalProvider or useXData
          if (
            (exportName.startsWith('is') && exportName.endsWith('GlobalProvider')) ||
            (exportName.startsWith('use') && exportName.endsWith('Data'))
          ) {
            // Extract entity name from hook name (e.g., useStudentData -> students)
            let entityName = '';
            if (exportName.startsWith('use') && exportName.endsWith('Data')) {
              entityName = exportName
                .replace('use', '')
                .replace('Data', '')
                // Convert camel case to plural lowercase (e.g., AcademicYear -> academicYears)
                .replace(/([A-Z])/g, (match, letter, offset) => {
                  return offset === 0 ? letter.toLowerCase() : letter.toLowerCase();
                }) + 's';
            }
            
            // Get hook configuration if available
            const hookConfig = mod[`${exportName}Config`] as DataHookConfig<any> | undefined;
            
            // Create metadata
            const metadata: ProviderMetadata = {
              name: exportName,
              type: exportName.endsWith('Data') ? 'data' : 'service',
              module: moduleName,
              entityName: hookConfig?.entityName || entityName,
              requiresBackend: hookConfig?.requiresBackend || false,
              allowOffline: hookConfig?.allowOffline !== false,
              syncPriority: hookConfig?.syncPriority || 'medium'
            };
            
            // Add to registry
            globalProviders[exportName] = {
              provider: mod[exportName],
              metadata
            };
          }
          
          // Optionally, also aggregate types if needed (e.g., XType)
          if (exportName.endsWith('Type')) {
            globalProviders[exportName] = {
              provider: mod[exportName],
              metadata: {
                name: exportName,
                type: 'utility',
                module: moduleName
              }
            };
          }
        }
      } catch (error) {
        console.warn(`Failed to load module data from ${path}:`, error);
      }
    }
    
    isInitialized = true;
    console.log('✅ [GlobalProvidersRegistry] Initialized with', Object.keys(globalProviders).length, 'providers');
  } catch (error) {
    console.error('❌ [GlobalProvidersRegistry] Failed to initialize:', error);
  }
}

// Export the registry and helpers
export { globalProviders, initializeProviders };

// Get all global providers (async to ensure initialization)
export async function getAllGlobalProviders() {
  await initializeProviders();
  return Object.values(globalProviders).map(item => item.provider);
}

// Get all data hooks (async to ensure initialization)
export async function getAllDataHooks() {
  await initializeProviders();
  return Object.values(globalProviders)
    .filter(item => item.metadata.type === 'data')
    .map(item => item.provider);
}

// Get provider metadata by name (async to ensure initialization)
export async function getProviderMetadata(name: string): Promise<ProviderMetadata | undefined> {
  await initializeProviders();
  return globalProviders[name]?.metadata;
}

// Get all providers for a specific module (async to ensure initialization)
export async function getModuleProviders(moduleName: string) {
  await initializeProviders();
  return Object.values(globalProviders)
    .filter(item => item.metadata.module === moduleName)
    .map(item => item.provider);
}

// Register a provider dynamically
export function registerProvider(
  name: string, 
  provider: any, 
  metadata: ProviderMetadata
) {
  globalProviders[name] = { provider, metadata };
}

// Initialize providers immediately (but don't block)
initializeProviders().catch(error => {
  console.error('Failed to initialize global providers:', error);
});
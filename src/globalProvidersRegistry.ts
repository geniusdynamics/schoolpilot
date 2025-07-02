// ABOUTME: Dynamically aggregates all global data providers/types from each module's data/index.ts for true modularity.
// ABOUTME: Allows the system to discover and use global providers/types without hardcoded imports or core changes.

// Dynamically import all module data/index.ts files
const moduleDataIndexes = import.meta.glob('./modules/*/data/index.ts', { eager: true });

// Registry for all global providers/types
const globalProviders: Record<string, any> = {};

for (const path in moduleDataIndexes) {
  const mod = moduleDataIndexes[path] as Record<string, any>;
  for (const exportName in mod) {
    // Convention: global providers are exported as isXGlobalProvider or useXData
    if (
      (exportName.startsWith('is') && exportName.endsWith('GlobalProvider')) ||
      (exportName.startsWith('use') && exportName.endsWith('Data'))
    ) {
      globalProviders[exportName] = mod[exportName];
    }
    // Optionally, also aggregate types if needed (e.g., XType)
    if (exportName.endsWith('Type')) {
      globalProviders[exportName] = mod[exportName];
    }
  }
}

// Export the registry and a helper to get all global providers
export { globalProviders };
export function getAllGlobalProviders() {
  return Object.values(globalProviders);
} 
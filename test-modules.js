// ABOUTME: Simple test script to verify module registration and loading
// ABOUTME: This script checks if modules are properly registered and accessible

import { moduleRegistry } from './src/core/moduleRegistry.ts';
import { initializeModules } from './src/core/moduleLoader.ts';

async function testModules() {
  try {
    console.log('🧪 [Test] Starting module verification test...');
    
    // Initialize modules
    await initializeModules();
    console.log('✅ [Test] Modules initialized successfully');
    
    // Get registered modules
    const registeredModules = moduleRegistry.getAllModules();
    console.log(`📦 [Test] Found ${registeredModules.length} registered modules:`);
    registeredModules.forEach(module => {
      console.log(`  - ${module.id}: ${module.name} (v${module.version})`);
    });
    
    // Get enabled modules
    const enabledModules = moduleRegistry.getEnabledModules();
    console.log(`🟢 [Test] Found ${enabledModules.length} enabled modules:`);
    enabledModules.forEach(module => {
      console.log(`  - ${module.id}: ${module.name}`);
    });
    
    // Get navigation items
    const navigationItems = moduleRegistry.getNavigationItems();
    console.log(`🧭 [Test] Found ${navigationItems.length} navigation items:`);
    navigationItems.forEach(item => {
      console.log(`  - ${item.name}: ${item.path} (active: ${item.isActive})`);
    });
    
    console.log('✅ [Test] Module verification completed successfully!');
    
  } catch (error) {
    console.error('❌ [Test] Module verification failed:', error);
    process.exit(1);
  }
}

testModules();
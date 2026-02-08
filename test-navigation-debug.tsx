// TEMPORARY DEBUG COMPONENT - Add this to App.tsx temporarily to debug navigation
// Place this inside the AppContent component, before the Layout

import React, { useEffect } from 'react';
import { useDynamicNavigation } from './hooks/useDynamicNavigation';

const NavigationDebugger: React.FC = () => {
  const { navigationItems } = useDynamicNavigation(true);
  
  useEffect(() => {
    console.log('🐛 [DEBUG] Full navigation structure:');
    navigationItems.forEach(module => {
      console.log(`\n📦 Module: ${module.name} (${module.path})`);
      if (module.children) {
        module.children.forEach(child => {
          console.log(`  ├─ ${child.name}`);
          console.log(`  │  path: ${child.path}`);
          console.log(`  │  page: ${child.page}`);
          console.log(`  │  deprecated: ${child.deprecated || false}`);
        });
      }
    });
    
    // Check specifically for settings module
    const settingsModule = navigationItems.find(m => m.path === '/settings');
    if (settingsModule) {
      console.log('\n🔧 Settings Module Details:', {
        name: settingsModule.name,
        path: settingsModule.path,
        childrenCount: settingsModule.children?.length || 0,
        children: settingsModule.children?.map(c => ({
          name: c.name,
          path: c.path,
          page: c.page
        }))
      });
    }
  }, [navigationItems]);
  
  return null;
};

export default NavigationDebugger;

// USAGE: Add this line in AppContent component:
// <NavigationDebugger />

/**
 * Fix script for Performance Monitor Widget issues
 * 
 * This script addresses:
 * 1. Widget showing despite feature flag being disabled
 * 2. Auto-refresh causing flickering
 * 3. Cached configuration issues
 * 
 * Instructions:
 * 1. Open browser DevTools (F12)
 * 2. Paste this script in the Console
 * 3. Run: fixPerformanceWidgetIssues()
 */

function fixPerformanceWidgetIssues() {
  console.log('🔧 Fixing Performance Monitor Widget Issues...');
  console.log('='.repeat(50));

  // Step 1: Clear cached configuration
  console.log('1. Clearing cached configuration...');
  localStorage.removeItem('app-config');
  localStorage.removeItem('app-config-version');
  console.log('   ✅ Configuration cache cleared');

  // Step 2: Create fresh configuration with widget disabled
  console.log('2. Creating fresh configuration...');
  const freshConfig = {
    features: {
      performanceMonitorWidget: false, // Explicitly disable
      enablePerformanceMonitoring: false, // Disable legacy flag
      // Ensure other flags are present
      advancedDashboard: true,
 enhancedNavigation: true,
      modulePreloading: true,
      offlineCapability: true,
      realTimeUpdates: true,
      enhancedDataHandling: true,
      performanceOptimization: true
    },
    environment: 'development',
    dataMode: 'mock',
    useEnhancedFeatures: false // Disable enhanced features that might trigger widget
  };
  
  localStorage.setItem('app-config', JSON.stringify(freshConfig));
  console.log('   ✅ Fresh configuration created with widget disabled');

  // Step 3: Hide any visible widgets
  console.log('3. Hiding any visible widgets...');
  const widgets = [
    '[class*="PerformanceMonitorWidget"]',
    '[class*="performance-monitor"]',
    '.fixed.bottom-4.right-4',
    '.fixed.bottom-4.left-4',
    '.fixed.top-4.right-4',
    '.fixed.top-4.left-4'
  ];
  
  let hiddenCount = 0;
  widgets.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (el.style.display !== 'none') {
        el.style.display = 'none';
        hiddenCount++;
      }
    });
  });
  console.log(`   ✅ Hidden ${hiddenCount} widget instances`);

  // Step 4: Disable auto-refresh globally
  console.log('4. Disabling auto-refresh globally...');
  
  // Override setInterval for performance monitoring
  const originalSetInterval = window.setInterval;
  window.setInterval = function(callback, delay) {
    if (typeof callback === 'function' && callback.toString().includes('performance')) {
      console.log('🚫 Blocked performance auto-refresh interval');
      return null; // Block the interval
    }
    return originalSetInterval.call(this, callback, delay);
  };
  
  // Clear any existing intervals
  const maxIntervalId = 1000;
  for (let i = 1; i <= maxIntervalId; i++) {
    try {
      clearInterval(i);
    } catch (e) {
      // Ignore errors for non-existent intervals
    }
  }
  console.log('   ✅ Auto-refresh intervals cleared');

  // Step 5: Update URL to remove performance parameters
  console.log('5. Cleaning URL parameters...');
  const url = new URL(window.location.href);
  url.searchParams.delete('performanceMonitor');
  url.searchParams.delete('enablePerformance');
  url.searchParams.delete('perf');
  
  if (url.href !== window.location.href) {
    window.history.replaceState({}, document.title, url.href);
    console.log('   ✅ URL parameters cleaned');
  } else {
    console.log('   ✅ No performance-related URL parameters found');
  }

  // Step 6: Provide summary and reload instructions
  console.log('\n✅ All fixes applied successfully!');
  console.log('\n📋 Summary of changes:');
  console.log('   • Configuration cache cleared');
  console.log('   • Widget feature flag disabled');
  console.log('   • Auto-refresh intervals blocked');
  console.log('   • URL parameters cleaned');
  console.log('   • Visible widgets hidden');
  
  console.log('\n🔄 To complete the fix, reload the page:');
  console.log('   Run: window.location.reload()');
  
  // Auto-reload option
  const shouldReload = confirm('Fixes applied! Reload page to see changes?');
  if (shouldReload) {
    window.location.reload();
  }
}

// Quick verification function
function verifyFix() {
  console.log('🔍 Verifying Performance Widget Fix...');
  
  const config = JSON.parse(localStorage.getItem('app-config') || '{}');
  const widgetVisible = document.querySelector('[class*="PerformanceMonitorWidget"]') !== null;
  
  console.log('Configuration:', {
    performanceMonitorWidget: config.features?.performanceMonitorWidget,
    widgetVisible: widgetVisible
  });
  
  if (!config.features?.performanceMonitorWidget && !widgetVisible) {
    console.log('✅ Fix verified: Widget is properly disabled');
  } else {
    console.log('⚠️ Widget may still be active');
  }
}

// Export for global access
window.fixPerformanceWidgetIssues = fixPerformanceWidgetIssues;
window.verifyFix = verifyFix;

console.log('🔧 Performance Widget Fix script loaded!');
console.log('Run: fixPerformanceWidgetIssues() to apply all fixes');
console.log('Run: verifyFix() to check current status');
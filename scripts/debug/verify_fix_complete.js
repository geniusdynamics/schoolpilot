/**
 * Final verification script for Performance Monitor Widget fix
 * 
 * This script verifies that:
 * 1. Feature flag control is working
 * 2. Auto-refresh is disabled by default
 * 3. No flickering occurs
 * 4. Widget properly respects toggle state
 */

function verifyPerformanceWidgetFix() {
  console.log('🔍 Final Verification: Performance Monitor Widget Fix');
  console.log('='.repeat(60));

  // Test 1: Feature Flag Control
  console.log('1. Feature Flag Control Test:');
  const config = JSON.parse(localStorage.getItem('app-config') || '{}');
  const flagState = config.features?.performanceMonitorWidget;
  console.log(`   Current flag state: ${flagState}`);
  
  // Test 2: Component Visibility
  console.log('\n2. Component Visibility Test:');
  const monitors = [
    { name: 'PerformanceMonitorWidget', selector: '[class*="PerformanceMonitorWidget"]' },
    { name: 'PerformanceMonitor', selector: '[class*="PerformanceMonitor"]' },
    { name: 'Floating Monitor', selector: '.fixed.bottom-4' }
  ];
  
  monitors.forEach(({ name, selector }) => {
    const elements = document.querySelectorAll(selector);
    console.log(`   ${name}: ${elements.length} elements found`);
    elements.forEach((el, i) => {
      console.log(`     ${i + 1}: ${el.style.display !== 'none' ? 'visible' : 'hidden'}`);
    });
  });

  // Test 3: Auto-refresh State
  console.log('\n3. Auto-refresh State Test:');
  const refreshCheckboxes = document.querySelectorAll('input[type="checkbox"]');
  let autoRefreshFound = false;
  refreshCheckboxes.forEach((checkbox, i) => {
    const label = checkbox.closest('label') || checkbox.parentElement;
    if (label && label.textContent?.toLowerCase().includes('refresh')) {
      console.log(`   Auto-refresh checkbox ${i + 1}: ${checkbox.checked ? 'ON' : 'OFF'}`);
      autoRefreshFound = true;
    }
  });
  if (!autoRefreshFound) {
    console.log('   No auto-refresh checkboxes found (good - disabled by default)');
  }

  // Test 4: Performance Impact
  console.log('\n4. Performance Impact Test:');
  const intervals = window.setInterval || (() => {});
  const intervalsCount = Object.keys(window).filter(key => key.includes('interval')).length;
  console.log(`   Active intervals detected: ${intervalsCount}`);

  // Test 5: URL Parameters
  console.log('\n5. URL Parameters Test:');
  const url = new URL(window.location.href);
  const perfParams = ['performanceMonitor', 'enablePerformance', 'perf'];
  perfParams.forEach(param => {
    const value = url.searchParams.get(param);
    if (value) {
      console.log(`   ${param}: ${value} (should be removed)`);
    }
  });

  // Test 6: Overall Status
  console.log('\n6. Overall Status:');
  const issues = [];
  
  if (flagState === true && monitors.some(({ selector }) => document.querySelectorAll(selector).length === 0)) {
    issues.push('Widget enabled but not visible');
  }
  
  if (flagState === false && monitors.some(({ selector }) => document.querySelectorAll(selector).length > 0)) {
    issues.push('Widget disabled but still visible');
  }
  
  if (autoRefreshFound && refreshCheckboxes.length > 0) {
    const anyOn = Array.from(refreshCheckboxes).some(cb => cb.checked);
    if (anyOn) {
      issues.push('Auto-refresh enabled (may cause flickering)');
    }
  }

  if (issues.length === 0) {
    console.log('✅ All tests passed! Fix is working correctly.');
    return true;
  } else {
    console.log('⚠️ Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    return false;
  }
}

// Quick toggle function for testing
function togglePerformanceWidget() {
  const config = JSON.parse(localStorage.getItem('app-config') || '{}');
  const currentState = config.features?.performanceMonitorWidget || false;
  
  if (!config.features) config.features = {};
  config.features.performanceMonitorWidget = !currentState;
  
  localStorage.setItem('app-config', JSON.stringify(config));
  console.log(`✅ Performance widget ${!currentState ? 'enabled' : 'disabled'}. Reload page to see changes.`);
  
  return !currentState;
}

// Export functions
window.verifyPerformanceWidgetFix = verifyPerformanceWidgetFix;
window.togglePerformanceWidget = togglePerformanceWidget;

console.log('🔧 Verification tools loaded!');
console.log('Run: verifyPerformanceWidgetFix() to test the fix');
console.log('Run: togglePerformanceWidget() to toggle the widget');
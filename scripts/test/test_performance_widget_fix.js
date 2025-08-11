/**
 * Test script to verify Performance Monitor Widget feature flag fix
 * 
 * Instructions:
 * 1. Open browser DevTools (F12)
 * 2. Paste this script in the Console
 * 3. Run the test
 * 
 * This will verify that the widget respects the performanceMonitorWidget feature flag
 */

console.log('🔍 Testing Performance Monitor Widget feature flag fix...');

// Test 1: Check current feature flag state
function testFeatureFlagState() {
  console.log('📊 Current feature flags:');
  
  // Check localStorage config
  const storedConfig = localStorage.getItem('app-config');
  if (storedConfig) {
    const config = JSON.parse(storedConfig);
    console.log('performanceMonitorWidget:', config.features?.performanceMonitorWidget);
    console.log('All flags:', Object.keys(config.features || {}));
  } else {
    console.log('No stored config found, using defaults');
  }
  
  // Check if widget is visible
  const widget = document.querySelector('[class*="PerformanceMonitorWidget"]') || 
                document.querySelector('[class*="performance-monitor"]');
  console.log('Widget visible:', !!widget);
  
  return {
    flagEnabled: config?.features?.performanceMonitorWidget || false,
    widgetVisible: !!widget
  };
}

// Test 2: Toggle feature flag and verify widget behavior
function testToggleBehavior() {
  console.log('🔄 Testing toggle behavior...');
  
  // Get current config
  const storedConfig = localStorage.getItem('app-config');
  const config = storedConfig ? JSON.parse(storedConfig) : { features: {} };
  
  // Toggle the flag
  const newValue = !config.features.performanceMonitorWidget;
  config.features.performanceMonitorWidget = newValue;
  
  localStorage.setItem('app-config', JSON.stringify(config));
  console.log('Set performanceMonitorWidget to:', newValue);
  
  // Reload to see changes
  console.log('🔄 Reloading page to verify changes...');
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// Test 3: Verify feature flag name consistency
function testFlagNameConsistency() {
  console.log('🔍 Checking feature flag name consistency...');
  
  // This would be checked in the source code, but we can verify via console
  const expectedFlag = 'performanceMonitorWidget';
  
  // Check if the flag exists in config
  const storedConfig = localStorage.getItem('app-config');
  if (storedConfig) {
    const config = JSON.parse(storedConfig);
    const hasCorrectFlag = Object.keys(config.features || {}).includes(expectedFlag);
    console.log('Has correct flag name:', hasCorrectFlag);
    
    if (!hasCorrectFlag) {
      console.warn('❌ Flag name mismatch detected');
    } else {
      console.log('✅ Flag name is correct');
    }
  }
}

// Run tests
console.log('=== Performance Widget Feature Flag Test ===');
const initialState = testFeatureFlagState();
testFlagNameConsistency();

console.log('\n=== Test Results ===');
console.log('Initial state:', initialState);

// Provide instructions for manual testing
console.log('\n=== Manual Test Instructions ===');
console.log('1. Go to Settings → Features');
console.log('2. Toggle "Performance Monitor Widget" switch');
console.log('3. Widget should appear/disappear based on toggle state');

// Quick toggle function for manual testing
window.togglePerformanceWidget = testToggleBehavior;

console.log('\n✅ Test script loaded. Use togglePerformanceWidget() to test toggling.');
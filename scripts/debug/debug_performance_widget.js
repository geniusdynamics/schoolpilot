/**
 * Debug script to check Performance Monitor Widget status
 * 
 * Instructions:
 * 1. Open browser DevTools (F12)
 * 2. Paste this script in the Console
 * 3. Run the debug checks
 */

console.log('🔍 Performance Monitor Widget Debug Script');
console.log('='.repeat(50));

// Check 1: Feature flag state
console.log('1. Feature Flag Status:');
const storedConfig = localStorage.getItem('app-config');
if (storedConfig) {
  const config = JSON.parse(storedConfig);
  console.log('   performanceMonitorWidget:', config.features?.performanceMonitorWidget);
  console.log('   All features:', Object.keys(config.features || {}));
} else {
  console.log('   ❌ No config found in localStorage');
}

// Check 2: Widget visibility
console.log('\n2. Widget Visibility:');
const widget = document.querySelector('[class*="PerformanceMonitorWidget"]') || 
               document.querySelector('[class*="performance-monitor"]') ||
               document.querySelector('.fixed.bottom-4.right-4');
console.log('   Widget found:', !!widget);
if (widget) {
  console.log('   Widget classes:', widget.className);
  console.log('   Widget visible:', widget.style.display !== 'none');
}

// Check 3: URL parameters
console.log('\n3. URL Parameters:');
const urlParams = new URLSearchParams(window.location.search);
console.log('   performanceMonitor:', urlParams.get('performanceMonitor'));

// Check 4: Force disable widget
window.disablePerformanceWidget = () => {
  console.log('🔄 Disabling performance widget...');
  
  // Update localStorage config
  let config = { features: {} };
  const storedConfig = localStorage.getItem('app-config');
  if (storedConfig) {
    config = JSON.parse(storedConfig);
  }
  
  config.features.performanceMonitorWidget = false;
  localStorage.setItem('app-config', JSON.stringify(config));
  
  // Hide widget if visible
  const widget = document.querySelector('[class*="PerformanceMonitorWidget"]') || 
               document.querySelector('[class*="performance-monitor"]') ||
               document.querySelector('.fixed.bottom-4.right-4');
  
  if (widget) {
    widget.style.display = 'none';
    console.log('   ✅ Widget hidden');
  }
  
  console.log('   ✅ Config updated. Reload page to apply changes.');
  console.log('   📌 Run: window.location.reload()');
};

// Check 5: Force refresh config
window.refreshConfig = () => {
  console.log('🔄 Refreshing configuration...');
  localStorage.removeItem('app-config');
  console.log('   ✅ Config cleared. Reload page to apply defaults.');
  console.log('   📌 Run: window.location.reload()');
};

// Check 6: Show current auto-refresh state
window.checkAutoRefresh = () => {
  console.log('🔍 Checking auto-refresh state...');
  
  // Look for auto-refresh checkboxes
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox, index) => {
    const label = checkbox.closest('label');
    if (label && label.textContent?.toLowerCase().includes('refresh')) {
      console.log(`   Checkbox ${index + 1}:`, {
        checked: checkbox.checked,
        label: label.textContent.trim(),
        id: checkbox.id
      });
    }
  });
};

console.log('\n=== Available Debug Commands ===');
console.log('window.disablePerformanceWidget() - Force disable widget');
console.log('window.refreshConfig() - Clear config and reload');
console.log('window.checkAutoRefresh() - Check auto-refresh states');
console.log('window.location.reload() - Reload page');

console.log('\n✅ Debug script loaded successfully!');
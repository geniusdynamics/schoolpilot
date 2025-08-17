// Test script to check for Recharts defaultProps warnings
console.log('=== Testing Recharts Warnings ===');

// Function to capture console warnings
const originalWarn = console.warn;
const warnings = [];

console.warn = function(...args) {
  const message = args.join(' ');
  warnings.push(message);
  originalWarn.apply(console, args);
};

// Wait for the app to load and check for warnings
setTimeout(() => {
  console.log('\n=== Recharts Warning Check Results ===');
  
  const rechartsWarnings = warnings.filter(warning => 
    warning.includes('defaultProps') && 
    (warning.includes('YAxis') || warning.includes('XAxis') || warning.includes('recharts'))
  );
  
  if (rechartsWarnings.length === 0) {
    console.log('✅ SUCCESS: No Recharts defaultProps warnings found!');
  } else {
    console.log('❌ WARNINGS FOUND:');
    rechartsWarnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
  }
  
  // Test chart functionality
  console.log('\n=== Testing Chart Functionality ===');
  
  // Look for chart elements
  const chartElements = document.querySelectorAll('svg');
  console.log(`Found ${chartElements.length} SVG elements (charts)`);
  
  const rechartsElements = document.querySelectorAll('[class*="recharts"]');
  console.log(`Found ${rechartsElements.length} Recharts elements`);
  
  if (chartElements.length > 0) {
    console.log('✅ Charts are rendering successfully');
  } else {
    console.log('❌ No charts found on the page');
  }
  
  console.log('\n=== All Console Warnings ===');
  if (warnings.length === 0) {
    console.log('✅ No console warnings detected');
  } else {
    warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
  }
  
  // Restore original console.warn
  console.warn = originalWarn;
  
}, 5000); // Wait 5 seconds for the app to fully load

console.log('Test script loaded. Monitoring for warnings...');
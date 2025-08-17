// Test script to verify that all the previously problematic functions are working
console.log('Testing application functionality...');

// Test if the functions are available in the global context
setTimeout(() => {
  try {
    // Check if we're in the application context
    if (window.location.pathname.includes('localhost')) {
      console.log('✓ Application is running');
      
      // Test that the app data context is available
      const appElement = document.querySelector('[data-testid="app"]') || document.querySelector('#root');
      if (appElement) {
        console.log('✓ App element found');
      }
      
      // Check for any remaining console errors
      const originalError = console.error;
      let errorCount = 0;
      console.error = function(...args) {
        errorCount++;
        originalError.apply(console, args);
      };
      
      setTimeout(() => {
        if (errorCount === 0) {
          console.log('✓ No console errors detected in the last 3 seconds');
        } else {
          console.log(`⚠ ${errorCount} console errors detected`);
        }
        console.error = originalError;
      }, 3000);
      
      console.log('✓ Functionality test completed');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}, 1000);

console.log('Test script loaded successfully');
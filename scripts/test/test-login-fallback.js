// ABOUTME: Test script to verify the login fallback mechanism
// ABOUTME: This script tests if the system properly falls back to demo mode when production database is empty

console.log('🧪 Testing login fallback mechanism...');

// Wait for the page to load completely
setTimeout(async () => {
  try {
    // Check if authService is available
    if (typeof window.authService === 'undefined') {
      console.log('⚠️ authService not available on window, trying to access from modules...');
      
      // Try to get authService from the application
      const authServiceModule = await import('../../src/services/authService.js');
      window.authService = authServiceModule.authService;
    }
    
    if (!window.authService) {
      console.error('❌ authService not available');
      return;
    }
    
    console.log('✅ authService available');
    
    // Wait for authService to initialize
    let attempts = 0;
    while (!window.authService.isInitialized() && attempts < 10) {
      console.log(`⏳ Waiting for authService initialization... (attempt ${attempts + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (!window.authService.isInitialized()) {
      console.error('❌ authService failed to initialize');
      return;
    }
    
    console.log('✅ authService initialized');
    
    // Test login with admin credentials
    console.log('🔐 Testing login with admin credentials...');
    const result = await window.authService.login({
      username: 'admin',
      password: 'test123'
    });
    
    if (result.success) {
      console.log('✅ Login successful!');
      console.log('👤 User:', result.user);
      console.log('🎭 Demo mode:', result.session?.isDemo);
      
      // Check if we're in demo mode
      if (result.session?.isDemo) {
        console.log('🎯 SUCCESS: System automatically fell back to demo mode!');
      } else {
        console.log('📊 Production mode login successful');
      }
    } else {
      console.error('❌ Login failed:', result.message);
      console.error('🔍 Errors:', result.errors);
    }
    
  } catch (error) {
    console.error('💥 Test script error:', error);
  }
}, 3000); // Wait 3 seconds for the page to load

console.log('🚀 Test script loaded, will run in 3 seconds...');
// Debug script to test login functionality

// Test 1: Check if authService is available
console.log('=== LOGIN DEBUG TEST ===');

// Test authService import
try {
  const authServiceModule = await import('./src/services/authService.js');
  console.log('✅ authService imported successfully');
  
  // Test login with admin credentials
  const result = await authServiceModule.authService.login({
    username: 'admin',
    password: 'admin123'
  });
  
  console.log('Login result:', result);
  
  if (result.success) {
    console.log('✅ Login successful!');
    console.log('User:', result.user);
  } else {
    console.log('❌ Login failed:', result.message);
  }
} catch (error) {
  console.error('❌ Error testing login:', error);
}

// Test 2: Check AuthContext
try {
  const authContextModule = await import('./src/contexts/AuthContext.tsx');
  console.log('✅ AuthContext imported successfully');
} catch (error) {
  console.error('❌ Error importing AuthContext:', error);
}

console.log('=== END DEBUG TEST ===');
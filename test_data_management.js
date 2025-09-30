// Test script to check data management page accessibility
const fs = require('fs');
const path = require('path');

// Check if DataManagementSettingsPage exists
const dataManagementPath = path.join(__dirname, 'src', 'modules', 'settings', 'pages', 'DataManagementSettingsPage.tsx');
const moduleDefPath = path.join(__dirname, 'src', 'modules', 'settings', 'moduleDefinition.tsx');

console.log('Checking data management page accessibility...');

if (fs.existsSync(dataManagementPath)) {
  console.log('✅ DataManagementSettingsPage.tsx exists');
} else {
  console.log('❌ DataManagementSettingsPage.tsx not found');
}

if (fs.existsSync(moduleDefPath)) {
  console.log('✅ moduleDefinition.tsx exists');
  
  // Read module definition to check routing
  const moduleContent = fs.readFileSync(moduleDefPath, 'utf8');
  if (moduleContent.includes('DataManagementSettingsPage')) {
    console.log('✅ DataManagementSettingsPage is registered in module definition');
  } else {
    console.log('❌ DataManagementSettingsPage not found in module definition');
  }
  
  if (moduleContent.includes('/settings/data-management')) {
    console.log('✅ Data management route is defined');
  } else {
    console.log('❌ Data management route not found');
  }
} else {
  console.log('❌ moduleDefinition.tsx not found');
}

console.log('\nTest completed.');
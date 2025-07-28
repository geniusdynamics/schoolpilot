#!/usr/bin/env node

/**
 * Script to enable the performanceMonitorWidget feature flag
 * This addresses the warning: "⚠️ performanceMonitorWidget is missing - click 'Fix Missing Flags'"
 */

const fs = require('fs');
const path = require('path');

// Configuration paths
const CONFIG_PATH = path.join(__dirname, '..', 'src', 'config', 'appConfig.ts');

function enablePerformanceWidget() {
  console.log('🔧 Enabling performanceMonitorWidget feature flag...');
  
  try {
    // Read the current config file
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    
    // Check if the feature flag already exists and is enabled
    if (configContent.includes('performanceMonitorWidget: true')) {
      console.log('✅ performanceMonitorWidget is already enabled in the config file');
      return;
    }
    
    // Update the default config to enable the widget
    const updatedContent = configContent.replace(
      /performanceMonitorWidget: false,?/g,
      'performanceMonitorWidget: true,'
    );
    
    // Write the updated config back
    fs.writeFileSync(CONFIG_PATH, updatedContent, 'utf8');
    
    console.log('✅ performanceMonitorWidget feature flag has been enabled in appConfig.ts');
    console.log('📌 Note: You may need to clear localStorage and refresh the application to see the widget');
    console.log('');
    console.log('To clear localStorage, you can:');
    console.log('1. Open browser DevTools (F12)');
    console.log('2. Go to Application/Storage → Local Storage');
    console.log('3. Clear all entries for your app');
    console.log('4. Refresh the page');
    console.log('');
    console.log('Or use the "Reset Config" button in the Feature Settings tab');
    
  } catch (error) {
    console.error('❌ Error updating config file:', error.message);
    console.log('');
    console.log('Manual fix:');
    console.log('1. Open src/config/appConfig.ts');
    console.log('2. Find "performanceMonitorWidget: false"');
    console.log('3. Change it to "performanceMonitorWidget: true"');
  }
}

function showInstructions() {
  console.log('📊 Performance Monitor Widget Setup');
  console.log('=====================================');
  console.log('');
  console.log('The Performance Monitor Widget is a floating widget that shows:');
  console.log('• Application startup time');
  console.log('• Memory usage');
  console.log('• Performance metrics');
  console.log('• Real-time status indicators');
  console.log('');
  console.log('Widget Features:');
  console.log('• Collapsible design (small indicator when collapsed)');
  console.log('• Expandable details view');
  console.log('• Color-coded performance status (green/yellow/red)');
  console.log('• Configurable position and refresh interval');
  console.log('• Manual refresh capability');
  console.log('');
  console.log('To use the widget after enabling:');
  console.log('1. Look for a small colored indicator in the bottom-right corner');
  console.log('2. Click it to expand and see detailed metrics');
  console.log('3. Use the controls to refresh data or hide the widget');
  console.log('');
}

// Main execution
if (require.main === module) {
  showInstructions();
  enablePerformanceWidget();
}

module.exports = { enablePerformanceWidget };

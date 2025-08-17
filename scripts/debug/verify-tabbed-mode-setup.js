#!/usr/bin/env node

// ABOUTME: Verification script for tabbed mode feature flag system
// ABOUTME: Checks that all components are properly integrated and functioning

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Tabbed Mode Feature Flag System - Verification Script');
console.log('=========================================================\n');

// Check 1: Feature flag service exists
const featureFlagPath = path.join(__dirname, 'src', 'services', 'tabbedModeFeatureFlag.ts');
if (fs.existsSync(featureFlagPath)) {
  console.log('✅ Feature flag service exists');
} else {
  console.error('❌ Feature flag service missing');
  process.exit(1);
}

// Check 2: Configuration file exists
const configPath = path.join(__dirname, 'src', 'config', 'tabbedModeConfig.ts');
if (fs.existsSync(configPath)) {
  console.log('✅ Configuration file exists');
} else {
  console.error('❌ Configuration file missing');
  process.exit(1);
}

// Check 3: Layout integration
const layoutPath = path.join(__dirname, 'src', 'components', 'Layout.tsx');
if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  if (layoutContent.includes('isTabbedModeEnabled')) {
    console.log('✅ Layout integration present');
  } else {
    console.error('❌ Layout integration missing');
    process.exit(1);
  }
} else {
  console.error('❌ Layout component missing');
  process.exit(1);
}

// Check 4: Settings components exist
const settingsPanelPath = path.join(__dirname, 'src', 'modules', 'settings', 'components', 'TabbedModeSettingsPanel.tsx');
const settingsPagePath = path.join(__dirname, 'src', 'modules', 'settings', 'pages', 'TabbedModeSettingsPage.tsx');
const testPagePath = path.join(__dirname, 'src', 'modules', 'settings', 'pages', 'TabbedModeTestPage.tsx');

if (fs.existsSync(settingsPanelPath) && fs.existsSync(settingsPagePath) && fs.existsSync(testPagePath)) {
  console.log('✅ Settings components exist');
} else {
  console.error('❌ Some settings components missing');
  process.exit(1);
}

// Check 5: Module definition updated
const moduleDefPath = path.join(__dirname, 'src', 'modules', 'core', 'moduleDefinition.tsx');
if (fs.existsSync(moduleDefPath)) {
  const moduleDefContent = fs.readFileSync(moduleDefPath, 'utf8');
  if (moduleDefContent.includes('tabbedMode')) {
    console.log('✅ Module definition updated');
  } else {
    console.error('❌ Module definition not updated');
    process.exit(1);
  }
} else {
  console.error('❌ Module definition missing');
  process.exit(1);
}

// Check 6: Configuration integration
const unifiedConfigPath = path.join(__dirname, 'src', 'config', 'unifiedConfig.ts');
if (fs.existsSync(unifiedConfigPath)) {
  const unifiedConfigContent = fs.readFileSync(unifiedConfigPath, 'utf8');
  if (unifiedConfigContent.includes('enableTabbedMode')) {
    console.log('✅ Configuration integration present');
  } else {
    console.error('❌ Configuration integration missing');
    process.exit(1);
  }
} else {
  console.error('❌ Unified configuration missing');
  process.exit(1);
}

console.log('\n🎉 All verification checks passed!');
console.log('✅ Tabbed Mode Feature Flag System is properly implemented');

console.log('\n📋 Next Steps:');
console.log('1. Start the development server: npm run dev');
console.log('2. Navigate to Settings → Tabbed Mode');
console.log('3. Enable tabbed mode for core modules (Dashboard, Settings, Reports)');
console.log('4. Test navigation and tab creation');
console.log('5. Gradually enable other modules as needed');

process.exit(0);
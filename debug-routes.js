// Debug script to check available page modules
const pageModules = {
  ...import.meta.glob('./src/modules/*/pages/*.tsx'),
  ...import.meta.glob('./src/modules/*/pages/**/*.tsx'),
};

console.log('Available page modules:');
Object.keys(pageModules).sort().forEach(key => {
  console.log(key);
});

console.log('\n\nChecking settings pages:');
const settingsPages = [
  'SettingsPage',
  'UnifiedSettingsPage',
  'FeatureSettingsPage',
  'DatabaseSettingsPage',
  'BackupSettingsPage',
  'TabbedModeSettingsPage',
  'DataManagementSettingsPage',
  'TabSettingsPage',
  'ModuleManagementPage',
  'ModuleDependencyReportPage',
  'AuditLogPage'
];

settingsPages.forEach(page => {
  const key = `./src/modules/settings/pages/${page}.tsx`;
  const exists = key in pageModules;
  console.log(`${exists ? '✓' : '✗'} ${page}: ${key}`);
});

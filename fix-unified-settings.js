import fs from 'fs';
import path from 'path';

const filePath = 'd:\\DevCenter\\abuilds\\EduGen\\old_system\\schoolpilot3\\src\\modules\\settings\\pages\\UnifiedSettingsPage.tsx';
const backupPath = filePath + '.backup';

// Read the file
const content = fs.readFileSync(filePath, 'utf8');

// Create backup
fs.writeFileSync(backupPath, content);

// Remove duplicate imports and component definitions
let fixedContent = content;

// Remove duplicate UnifiedModeSwitch import
fixedContent = fixedContent.replace(/import\s+UnifiedModeSwitch\s+from\s+['"]\.\.\/\.\.\/\.\.\/components\/UnifiedModeSwitch['"]\s*;?\s*\n/g, '');

// Remove duplicate SyncManagementPanel import
fixedContent = fixedContent.replace(/import\s+SyncManagementPanel\s+from\s+['"]\.\.\/\.\.\/\.\.\/components\/SyncManagementPanel['"]\s*;?\s*\n/g, '');

// Remove duplicate useUnifiedConfig import
fixedContent = fixedContent.replace(/import\s+{\s*useUnifiedConfig\s*}\s+from\s+['"]\.\.\/\.\.\/\.\.\/contexts\/UnifiedConfigContext['"]\s*;?\s*\n/g, '');

// Remove the duplicate component definition that appears after the first export
const exportIndex = fixedContent.indexOf('export default UnifiedSettingsPage;');
if (exportIndex !== -1) {
  const afterExport = fixedContent.substring(exportIndex + 'export default UnifiedSettingsPage;'.length);
  
  // Find the next duplicate component definition
  const duplicateComponentIndex = afterExport.indexOf('const UnifiedSettingsPage: React.FC = () => {');
  if (duplicateComponentIndex !== -1) {
    fixedContent = fixedContent.substring(0, exportIndex + 'export default UnifiedSettingsPage;'.length) + 
                   afterExport.substring(duplicateComponentIndex);
  }
}

// Clean up any remaining duplicate export statements
fixedContent = fixedContent.replace(/export default UnifiedSettingsPage;/g, (match, offset, string) => {
  // Only keep the first occurrence
  const firstIndex = string.indexOf('export default UnifiedSettingsPage;');
  return offset === firstIndex ? match : '';
});

// Ensure the Modal components are properly placed within the component
const modalStartIndex = fixedContent.indexOf('{/* User Modal */}');
const lastExportIndex = fixedContent.lastIndexOf('export default UnifiedSettingsPage;');

if (modalStartIndex !== -1 && lastExportIndex !== -1 && modalStartIndex > lastExportIndex) {
  // Move modals before the export statement
  const beforeExport = fixedContent.substring(0, lastExportIndex);
  const afterExport = fixedContent.substring(lastExportIndex);
  const modalSection = fixedContent.substring(modalStartIndex, lastExportIndex);
  
  fixedContent = beforeExport.replace(modalSection, '') + modalSection + afterExport;
}

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('Fixed UnifiedSettingsPage.tsx');
console.log('Backup created at:', backupPath);
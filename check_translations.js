const fs = require('fs');
const path = require('path');

// Check if translation files exist and what keys they have
const translationFiles = [
  'src/i18n/locales/en/navigation.json',
  'src/i18n/locales/fr/navigation.json',
  'src/modules/core/i18n/en/navigation.json',
  'src/modules/core/i18n/fr/navigation.json',
  'src/modules/core/i18n/sw/navigation.json',
  'src/modules/core/i18n/rw/navigation.json'
];

console.log('Checking translation files...');

translationFiles.forEach(filePath => {
  console.log(`\n--- ${filePath} ---`);
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const translations = JSON.parse(content);
      
      console.log('✅ File exists');
      console.log('Keys found:', Object.keys(translations));
      
      // Check for settings section
      if (translations.settings) {
        console.log('Settings keys:', Object.keys(translations.settings));
        
        // Check for data management related keys
        const dataKeys = ['dataManagement', 'databaseSettings', 'backupSettings', 'dataLayerSettings', 'databaseProvider'];
        const missingKeys = dataKeys.filter(key => !translations.settings[key]);
        
        if (missingKeys.length > 0) {
          console.log('❌ Missing data management keys:', missingKeys);
        } else {
          console.log('✅ All data management keys present');
        }
      } else {
        console.log('❌ No settings section found');
      }
      
    } catch (error) {
      console.log('❌ Error reading file:', error.message);
    }
  } else {
    console.log('❌ File does not exist');
  }
});

console.log('\n🔍 Translation check completed!');
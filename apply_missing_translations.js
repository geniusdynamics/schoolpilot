// Script to apply missing translations for data management settings
const fs = require('fs');
const path = require('path');

// Load the missing translations
const missingTranslations = JSON.parse(fs.readFileSync('missing_translations_fix.json', 'utf8'));

// Define translation file paths
const translationPaths = {
  en: 'src/i18n/locales/en/navigation.json',
  fr: 'src/modules/core/i18n/fr/navigation.json',
  rw: 'src/modules/core/i18n/rw/navigation.json',
  sw: 'src/modules/core/i18n/sw/navigation.json'
};

// Function to safely merge translations
function mergeTranslations(existing, newTranslations) {
  const merged = { ...existing };
  
  // Ensure settings object exists
  if (!merged.settings) {
    merged.settings = {};
  }
  
  // Merge new settings translations
  Object.assign(merged.settings, newTranslations.settings);
  
  return merged;
}

// Apply translations for each language
Object.keys(translationPaths).forEach(lang => {
  const filePath = translationPaths[lang];
  
  console.log(`Processing ${lang} translations...`);
  
  if (fs.existsSync(filePath)) {
    try {
      // Read existing translations
      const existingContent = fs.readFileSync(filePath, 'utf8');
      const existingTranslations = JSON.parse(existingContent);
      
      // Get new translations for this language
      const newTranslations = missingTranslations.dataManagementTranslations[lang];
      
      if (newTranslations) {
        // Merge translations
        const mergedTranslations = mergeTranslations(existingTranslations, newTranslations);
        
        // Write back to file
        fs.writeFileSync(filePath, JSON.stringify(mergedTranslations, null, 2), 'utf8');
        console.log(`✅ Updated ${lang} translations in ${filePath}`);
      } else {
        console.log(`⚠️  No new translations found for ${lang}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${lang} translations:`, error.message);
    }
  } else {
    console.log(`⚠️  Translation file not found: ${filePath}`);
    
    // Create the file if it doesn't exist
    const newTranslations = missingTranslations.dataManagementTranslations[lang];
    if (newTranslations) {
      try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Create new translation file
        fs.writeFileSync(filePath, JSON.stringify(newTranslations, null, 2), 'utf8');
        console.log(`✅ Created new ${lang} translation file: ${filePath}`);
      } catch (error) {
        console.error(`❌ Error creating ${lang} translation file:`, error.message);
      }
    }
  }
});

console.log('\n🎉 Translation update completed!');
console.log('\nAdded translations for:');
console.log('- Data Management');
console.log('- Database Settings');
console.log('- Backup Settings');
console.log('- Data Layer Settings');
console.log('- Database Provider');
// ABOUTME: This script tests if the French navigation translations are loaded correctly
// ABOUTME: It checks specific translation keys that were causing issues in the secondary sidebar

import i18next from '../../src/i18n/i18n.js';

// Wait for i18n to be initialized
setTimeout(() => {
  console.log('=== Translation Test Results ===');
  
  // Test English translations
  console.log('\n--- English Translations ---');
  i18next.changeLanguage('en');
  console.log('navigation:administration.title:', i18next.t('navigation:administration.title'));
  console.log('navigation:administration.students.title:', i18next.t('navigation:administration.students.title'));
  console.log('navigation:academics.title:', i18next.t('navigation:academics.title'));
  console.log('navigation:finance.title:', i18next.t('navigation:finance.title'));
  
  // Test French translations
  console.log('\n--- French Translations ---');
  i18next.changeLanguage('fr');
  console.log('navigation:administration.title:', i18next.t('navigation:administration.title'));
  console.log('navigation:administration.students.title:', i18next.t('navigation:administration.students.title'));
  console.log('navigation:academics.title:', i18next.t('navigation:academics.title'));
  console.log('navigation:finance.title:', i18next.t('navigation:finance.title'));
}, 1000);
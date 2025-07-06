// ABOUTME: This file is responsible for loading modular translation resources.
// ABOUTME: It dynamically loads translations from each module's i18n directory.

import i18next from 'i18next';

// Import modular translations
// English resources
import academicsEn from '../modules/academics/i18n/en.json';
import administrationEn from '../modules/administration/i18n/en.json';
import financeEn from '../modules/finance/i18n/en.json';
import hrEn from '../modules/hr/i18n/en.json';
import inventoryEn from '../modules/inventory/i18n/en.json';
import libraryEn from '../modules/library/i18n/en.json';
import nutritionEn from '../modules/nutrition/i18n/en.json';
import reportsEn from '../modules/reports/i18n/en.json';
import settingsEn from '../modules/settings/i18n/en.json';
import dashboardEn from '../modules/dashboard/i18n/en.json';

// French resources
import academicsFr from '../modules/academics/i18n/fr.json';
import administrationFr from '../modules/administration/i18n/fr.json';
import financeFr from '../modules/finance/i18n/fr.json';
import hrFr from '../modules/hr/i18n/fr.json';
import inventoryFr from '../modules/inventory/i18n/fr.json';
import libraryFr from '../modules/library/i18n/fr.json';
import nutritionFr from '../modules/nutrition/i18n/fr.json';
import reportsFr from '../modules/reports/i18n/fr.json';
import settingsFr from '../modules/settings/i18n/fr.json';
import dashboardFr from '../modules/dashboard/i18n/fr.json';

// Core module translations (common and navigation)
import commonEn from '../modules/core/i18n/en/common.json';
import navigationEn from '../modules/core/i18n/en/navigation.json';
import commonFr from '../modules/core/i18n/fr/common.json';
import navigationFr from '../modules/core/i18n/fr/navigation.json';

export const loadModularTranslations = (i18nInstance: typeof i18next) => {
  // English modular resources
  i18nInstance.addResourceBundle('en', 'academics', academicsEn, true, true);
  i18nInstance.addResourceBundle('en', 'administration', administrationEn, true, true);
  i18nInstance.addResourceBundle('en', 'finance', financeEn, true, true);
  i18nInstance.addResourceBundle('en', 'hr', hrEn, true, true);
  i18nInstance.addResourceBundle('en', 'inventory', inventoryEn, true, true);
  i18nInstance.addResourceBundle('en', 'library', libraryEn, true, true);
  i18nInstance.addResourceBundle('en', 'nutrition', nutritionEn, true, true);
  i18nInstance.addResourceBundle('en', 'reports', reportsEn, true, true);
  i18nInstance.addResourceBundle('en', 'settings', settingsEn, true, true);
  i18nInstance.addResourceBundle('en', 'dashboard', dashboardEn, true, true);

  // French modular resources
  i18nInstance.addResourceBundle('fr', 'academics', academicsFr, true, true);
  i18nInstance.addResourceBundle('fr', 'administration', administrationFr, true, true);
  i18nInstance.addResourceBundle('fr', 'finance', financeFr, true, true);
  i18nInstance.addResourceBundle('fr', 'hr', hrFr, true, true);
  i18nInstance.addResourceBundle('fr', 'inventory', inventoryFr, true, true);
  i18nInstance.addResourceBundle('fr', 'library', libraryFr, true, true);
  i18nInstance.addResourceBundle('fr', 'nutrition', nutritionFr, true, true);
  i18nInstance.addResourceBundle('fr', 'reports', reportsFr, true, true);
  i18nInstance.addResourceBundle('fr', 'settings', settingsFr, true, true);
  i18nInstance.addResourceBundle('fr', 'dashboard', dashboardFr, true, true);

  // Common and navigation resources (kept in main i18n directory)
  i18nInstance.addResourceBundle('en', 'common', commonEn, true, true);
  i18nInstance.addResourceBundle('en', 'navigation', navigationEn, true, true);
  i18nInstance.addResourceBundle('fr', 'common', commonFr, true, true);
  i18nInstance.addResourceBundle('fr', 'navigation', navigationFr, true, true);

  console.log("i18n: Modular English resources loaded for namespaces:", Object.keys(i18nInstance.services.resourceStore.data.en || {}));
  console.log("i18n: Modular French resources loaded for namespaces:", Object.keys(i18nInstance.services.resourceStore.data.fr || {}));
}; 
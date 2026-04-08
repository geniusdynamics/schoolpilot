// ABOUTME: This file is responsible for loading and registering translation resources.
// ABOUTME: It centralizes how namespaces and languages are added to i18next.

import i18next from 'i18next';

// English resources
import commonEn from './locales/en/common.json';
import navigationEn from './locales/en/navigation.json';
import dashboardEn from './locales/en/dashboard.json';
import reportsEn from './locales/en/reports.json';
import settingsEn from './locales/en/settings.json';
import academicsEn from './locales/en/academics.json'; 
import administrationEn from './locales/en/administration.json';
import financeEn from './locales/en/finance.json';
import hrEn from './locales/en/hr.json';
import inventoryEn from './locales/en/inventory.json';
import libraryEn from './locales/en/library.json';
import nutritionEn from './locales/en/nutrition.json'; 
import portalEn from './locales/en/portal.json';

// French resources
import commonFr from './locales/fr/common.json';
import navigationFr from './locales/fr/navigation.json';
import dashboardFr from './locales/fr/dashboard.json';
import reportsFr from './locales/fr/reports.json';
import settingsFr from './locales/fr/settings.json';
import academicsFr from './locales/fr/academics.json'; 
import administrationFr from './locales/fr/administration.json';
import financeFr from './locales/fr/finance.json';
import hrFr from './locales/fr/hr.json';
import inventoryFr from './locales/fr/inventory.json';
import libraryFr from './locales/fr/library.json';
import nutritionFr from './locales/fr/nutrition.json'; 
import portalFr from './locales/fr/portal.json';

export const loadTranslations = (i18nInstance: typeof i18next) => {
  // English
  i18nInstance.addResourceBundle('en', 'common', commonEn, true, true);
  i18nInstance.addResourceBundle('en', 'navigation', navigationEn, true, true);
  i18nInstance.addResourceBundle('en', 'dashboard', dashboardEn, true, true);
  i18nInstance.addResourceBundle('en', 'reports', reportsEn, true, true);
  i18nInstance.addResourceBundle('en', 'settings', settingsEn, true, true);
  i18nInstance.addResourceBundle('en', 'academics', academicsEn, true, true);
  i18nInstance.addResourceBundle('en', 'administration', administrationEn, true, true);
  i18nInstance.addResourceBundle('en', 'finance', financeEn, true, true);
  i18nInstance.addResourceBundle('en', 'hr', hrEn, true, true);
  i18nInstance.addResourceBundle('en', 'inventory', inventoryEn, true, true);
  i18nInstance.addResourceBundle('en', 'library', libraryEn, true, true);
  i18nInstance.addResourceBundle('en', 'nutrition', nutritionEn, true, true); 
  i18nInstance.addResourceBundle('en', 'portal', portalEn, true, true);

  // French
  i18nInstance.addResourceBundle('fr', 'common', commonFr, true, true);
  i18nInstance.addResourceBundle('fr', 'navigation', navigationFr, true, true);
  i18nInstance.addResourceBundle('fr', 'dashboard', dashboardFr, true, true);
  i18nInstance.addResourceBundle('fr', 'reports', reportsFr, true, true);
  i18nInstance.addResourceBundle('fr', 'settings', settingsFr, true, true);
  i18nInstance.addResourceBundle('fr', 'academics', academicsFr, true, true);
  i18nInstance.addResourceBundle('fr', 'administration', administrationFr, true, true);
  i18nInstance.addResourceBundle('fr', 'finance', financeFr, true, true);
  i18nInstance.addResourceBundle('fr', 'hr', hrFr, true, true);
  i18nInstance.addResourceBundle('fr', 'inventory', inventoryFr, true, true);
  i18nInstance.addResourceBundle('fr', 'library', libraryFr, true, true);
  i18nInstance.addResourceBundle('fr', 'nutrition', nutritionFr, true, true); 
  i18nInstance.addResourceBundle('fr', 'portal', portalFr, true, true);

  console.log("i18n: English resources loaded for namespaces:", Object.keys(i18nInstance.services.resourceStore.data.en || {}));
  console.log("i18n: French resources loaded for namespaces:", Object.keys(i18nInstance.services.resourceStore.data.fr || {}));
};
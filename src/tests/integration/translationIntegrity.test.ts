// ABOUTME: This file contains tests to ensure that all navigation items have corresponding translations.
// ABOUTME: It helps prevent untranslated keys from appearing in the UI.

import i18n from '../../i18n/i18n';
import { moduleRegistry } from '@/core/moduleRegistry';

describe('Translation Integrity', () => {
  it('should have a translation for every navigation item', async () => {
    // Ensure i18next is initialized
    await i18n.init();

    const enabledModules = moduleRegistry.getEnabledModules();
    const missingTranslations: string[] = [];

    for (const module of enabledModules) {
      if (module.navItems) {
        for (const navItem of module.navItems) {
          if (!i18n.exists(navItem.name)) {
            missingTranslations.push(navItem.name);
          }
        }
      }
    }

    expect(missingTranslations).toEqual([]);
  });
});
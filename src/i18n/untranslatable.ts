// ABOUTME: Strings that are legitimately identical to English, each with the reason, shared or per locale.
// ABOUTME: The completeness check accepts an English-identical value only when it is listed here as `namespace:key`.

import type { Allowlist } from './completeness';

/** Identical in every locale. */
export const UNTRANSLATABLE: Allowlist = {
  'common:appName': 'Product name: SchoolPilot is a brand and is never translated.',
};

const FRENCH_COGNATE = 'French uses the same word as English, with the same meaning in a school setting.';

/** Identical in one locale only, so another locale cannot hide an untranslated string behind it. */
export const UNTRANSLATABLE_BY_LOCALE: Readonly<Record<string, Allowlist>> = {
  sw: {
    'navigation:portal.title': 'Portal is the loanword used as-is in Kiswahili software for a self-service web area.',
    'navigation:title': 'Portal is the loanword used as-is in Kiswahili software for a self-service web area.',
  },
  pt: {
    'navigation:portal.title': 'Portal is the ordinary Portuguese word for a self-service web area, spelled as in English.',
    'navigation:title': 'Portal is the ordinary Portuguese word for a self-service web area, spelled as in English.',
  },
  fr: {
    'common:actions': FRENCH_COGNATE,
    'common:common.actions': FRENCH_COGNATE,
    'common:entities.classes': FRENCH_COGNATE,
    'common:inventory.contracts.description': FRENCH_COGNATE,
    'navigation:academics.observations': FRENCH_COGNATE,
    'navigation:administration.communication': FRENCH_COGNATE,
    'navigation:administration.title': FRENCH_COGNATE,
    'navigation:admissions.title': FRENCH_COGNATE,
    'navigation:finance.budgets': FRENCH_COGNATE,
    'navigation:finance.transactions': FRENCH_COGNATE,
    'navigation:finance.transport': FRENCH_COGNATE,
    'navigation:navigation': FRENCH_COGNATE,
    'navigation:nutrition.menus': FRENCH_COGNATE,
    'navigation:settings.configuration': FRENCH_COGNATE,
  },
};

export function allowlistFor(locale: string): Allowlist {
  return { ...UNTRANSLATABLE, ...UNTRANSLATABLE_BY_LOCALE[locale] };
}

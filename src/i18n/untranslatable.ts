// ABOUTME: Strings that are legitimately identical to English in every checked locale, each with the reason.
// ABOUTME: The completeness check accepts an English-identical value only when it is listed here as `namespace:key`.

import type { Allowlist } from './completeness';

export const UNTRANSLATABLE: Allowlist = {
  'common:appName': 'Product name: SchoolPilot is a brand and is never translated.',
  'navigation:portal.title':
    'Portal is the loanword used as-is in Kiswahili and French software for a self-service web area.',
  'navigation:title':
    'Portal is the loanword used as-is in Kiswahili and French software for a self-service web area.',
};

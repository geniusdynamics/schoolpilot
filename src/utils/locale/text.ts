// ABOUTME: Bidi helpers for UI text: whether a run reads right to left and the isolation that stops
// ABOUTME: an RTL sentence from reordering a Latin name, a date or a phone number inside it.

import { hasRtlText, isolateLtr, isolateRuns } from '@/domain/reports/bidi';

import type { Direction } from './locales';

/** Wraps a Latin/digit-only run in a first-strong isolate; anything else is returned unchanged. */
export const isolateLtrText = isolateLtr;

/** Isolates every Latin/digit run inside a mixed string, leaving the RTL runs alone. */
export const isolateMixedText = isolateRuns;

/** The direction a piece of content reads in, from its own characters rather than the locale. */
export function textDirection(text: string): Direction {
  return hasRtlText(text) ? 'rtl' : 'ltr';
}

/** True when a piece of content contains right-to-left script. */
export { hasRtlText };

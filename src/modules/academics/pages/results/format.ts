// ABOUTME: Display formatting for exact numbers: the engine keeps fractions exact, while a result a
// ABOUTME: teacher reads is rounded for the page only, never for the arithmetic behind it.

import { formatExact, parseExact, roundExact } from '@/domain/assessment/engine';

/** The number of decimal places a percentage is shown with when it is not a finite decimal. */
const DISPLAY_PRECISION = 2;

/**
 * An exact value as a reader sees it.
 *
 * A finite decimal is left exactly as the engine produced it; a repeating one (`250/3`) is rounded
 * to two places for display only. The trace keeps the exact text, so the drill-down's numbers and
 * the arithmetic never diverge.
 */
export function displayNumber(text: string, precision = DISPLAY_PRECISION): string {
  const exact = parseExact(text);
  if (exact === null) return text;
  if (!text.includes('/')) return text;
  return formatExact(roundExact(exact, precision, 'half_up'));
}

/** An exact percentage as the table shows it. */
export function displayPercent(text: string): string {
  return `${displayNumber(text, DISPLAY_PRECISION)}%`;
}

// ABOUTME: Pure helpers for the canonical school calendar: how a stored day is shown, how a
// ABOUTME: calendar-event kind reads, and whether an event is past, running or still to come.

/** Where a calendar event sits relative to a given day. */
export type EventPhase = 'upcoming' | 'current' | 'past';

/** The kind as the page writes it: `mid_term_break` reads as `mid term break`. */
export function eventKindLabel(kind: string): string {
  return kind.replace(/_/g, ' ');
}

/** Today as the calendar stores days: `YYYY-MM-DD`, in the browser's own time zone. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Where an event sits relative to `today`.
 *
 * An event that ends today is still in progress, not past; one that starts today has started.
 */
export function eventPhase(startDate: string, endDate: string, today: string): EventPhase {
  if (endDate < today) return 'past';
  if (startDate > today) return 'upcoming';
  return 'current';
}

/** A stored `YYYY-MM-DD` as a local date, so the shown day never shifts with the time zone. */
export function formatCalendarDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString();
}

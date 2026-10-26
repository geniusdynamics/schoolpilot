// ABOUTME: Calendar-date checks for the payroll module: a YYYY-MM-DD text that names a real day.
// ABOUTME: Dates compare as text, because a date of that shape sorts the way it reads.

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/** True when the text is a real calendar day written as YYYY-MM-DD. */
export function isIsoDate(text: string): boolean {
  if (!DATE_SHAPE.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text;
}

/** True when `date` falls within `from` to `to` inclusive; a null `to` is open. */
export function isWithin(date: string, from: string, to: string | null): boolean {
  return date >= from && (to === null || date <= to);
}

// ABOUTME: Shared formatting utilities — Kenyan currency (KES) and dates.
// ABOUTME: Adopt these instead of ad-hoc toLocaleString/toLocaleDateString in pages.

const kesFormatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const kesCompactFormatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Format a number as Kenyan Shillings, e.g. formatKES(1500) → "KSh 1,500.00". */
export function formatKES(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return kesFormatter.format(amount);
}

/** Compact KES for tight columns/charts, e.g. formatKESCompact(1250000) → "KSh 1.3M". */
export function formatKESCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return kesCompactFormatter.format(amount);
}

const defaultDateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

/** "15 Mar 2026" — the app's standard display date. */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-KE', defaultDateOptions);
}

/** "15 Mar 2026, 14:30" for timestamps (payments, audit rows). */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-KE', {
    ...defaultDateOptions,
    hour: '2-digit',
    minute: '2-digit',
  });
}

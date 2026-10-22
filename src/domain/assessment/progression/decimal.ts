// ABOUTME: The shortest decimal a JSON number round-trips through, expanded from an exponent by
// ABOUTME: string surgery so a pack's threshold or weight never passes through float arithmetic.

/**
 * The shortest decimal a finite JSON number round-trips through (`89.5`, `0.1`, `1e-7` -> `0.0000001`).
 *
 * JavaScript prints a number as the shortest text that parses back to the same value, which is the
 * decimal the pack author wrote. Expanding an exponent as text keeps the conversion exact: no
 * arithmetic happens on the number itself.
 */
export function decimalOfNumber(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(value));
  if (!match) return null;
  const sign = match[1];
  const whole = match[2];
  const fraction = match[3] ?? '';
  const exponent = match[4] === undefined ? 0 : Number(match[4]);
  const digits = `${whole}${fraction}`;
  const point = whole.length + exponent;
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length) return `${sign}${digits}${'0'.repeat(point - digits.length)}`;
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

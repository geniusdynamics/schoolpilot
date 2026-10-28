// ABOUTME: The one place a validated amount text becomes a JSON number, for the payload formats that take
// ABOUTME: numbers rather than exact decimal text. The text never carries more decimals than the currency
// ABOUTME: holds, so the number is the amount the target stores at its own currency scale.

/** `'1250.50'` → `1250.5`, the form QuickBooks, Xero, Odoo and ERPNext payloads take. */
export function amountNumber(amountText: string): number {
  return Number(amountText);
}

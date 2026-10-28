// ABOUTME: Small helpers every messaging adapter shares: case-insensitive headers, turning a payload
// ABOUTME: value into text, parsing a JSON object, and refusing a missing setting by name.

import { MessagingError } from '../types';

import type { HttpResponse } from './transport';

/** A header by name, whatever case the sender used. */
export function header(
  headers: Readonly<Record<string, string>>,
  name: string
): string | null {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return null;
}

/** A payload value as text, or null when it is absent or empty. */
export function text(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

/** A payload value as an object, or null. */
export function object(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/** A payload value as an array, or an empty array. */
export function array(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/** The parsed JSON body of a response, or a `transport` refusal naming what could not be read. */
export function parseJsonObject(
  response: HttpResponse,
  what: string
): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(response.body);
    const asObject = object(parsed);
    if (asObject) return asObject;
    throw new Error('the body is not a JSON object');
  } catch (error) {
    throw new MessagingError(
      'transport',
      `the answer to ${what} is not a JSON object (HTTP ${response.status})`,
      { cause: error, detail: { status: response.status, body: response.body.slice(0, 500) } }
    );
  }
}

/** A setting the adapter cannot work without, or a `config_missing` refusal naming it. */
export function requireSetting(value: string | undefined, setting: string): string {
  if (value !== undefined && value.trim() !== '') return value;
  throw new MessagingError(
    'config_missing',
    `the messaging provider needs the "${setting}" setting, and it is not configured`
  );
}

/** A form body as a plain record, for the raw payload a report carries. */
export function parameterRecord(params: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (record[key] === undefined) record[key] = value;
  }
  return record;
}

/** The first source address a delivery carries, from the proxy headers a hub sits behind. */
export function sourceAddress(headers: Readonly<Record<string, string>>): string | null {
  const forwarded = header(headers, 'x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return header(headers, 'x-real-ip')?.trim() ?? null;
}

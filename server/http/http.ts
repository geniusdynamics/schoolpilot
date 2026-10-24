// ABOUTME: The HTTP primitives the hub routes share: reading a bounded JSON body, writing a JSON
// ABOUTME: response, query-string parsing and the typed refusal a malformed request raises.

import type { IncomingMessage, ServerResponse } from 'node:http';

/** The body limit of a request; the same order of magnitude as the LAN server always accepted. */
export const MAX_BODY_BYTES = 10 * 1024 * 1024;

/** A request the hub refused before it reached a repository or a service. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

/** Reads the request body as JSON; an empty body reads as `undefined`. */
export async function readJsonBody(
  req: IncomingMessage,
  limit: number = MAX_BODY_BYTES
): Promise<unknown> {
  const decoder = new TextDecoder('utf-8');
  let text = '';
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buffer.length;
    if (size > limit) {
      throw new HttpError(413, 'payload_too_large', `the request body exceeds ${limit} bytes`);
    }
    // Streaming decode, so a character split across two chunks survives.
    text += decoder.decode(buffer, { stream: true });
  }

  if (size === 0) return undefined;

  text += decoder.decode();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, 'invalid_json', 'the request body is not valid JSON');
  }
}

/** Requires a JSON object, the shape every write of the hub takes. */
export function requireObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'invalid_body', 'the request body must be a JSON object');
  }
  return value as Record<string, unknown>;
}

/** Writes a JSON response, with any headers the caller adds on top of the JSON ones. */
export function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Readonly<Record<string, string>> = {}
): void {
  if (res.writableEnded) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

/** Adds the headers a browser client on the LAN needs to read the response. */
export function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, x-actor');
  res.setHeader('access-control-expose-headers', 'content-type');
}

/** The value of a request header, when it is set. */
export function headerValue(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * The actor a write is stamped with.
 *
 * `x-actor` is a placeholder for the identity P4-C01 introduces: the hub trusts it, so it
 * must not be exposed beyond a trusted network until authentication lands.
 */
export function actorOf(req: IncomingMessage, fallback: string | undefined): string | undefined {
  return headerValue(req, 'x-actor') ?? fallback;
}

/** Parses a JSON query parameter, refusing one that is not JSON. */
export function jsonQuery<T>(url: URL, name: string): T | undefined {
  const raw = url.searchParams.get(name);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(400, 'invalid_query', `the ${name} query parameter is not valid JSON`);
  }
}

/** Parses a non-negative integer query parameter. */
export function integerQuery(url: URL, name: string): number | undefined {
  const raw = url.searchParams.get(name);
  if (raw === null) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new HttpError(400, 'invalid_query', `the ${name} query parameter must be a non-negative integer`);
  }
  return value;
}

/** Parses a boolean query parameter; only `true` is true. */
export function booleanQuery(url: URL, name: string): boolean | undefined {
  const raw = url.searchParams.get(name);
  if (raw === null) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new HttpError(400, 'invalid_query', `the ${name} query parameter must be true or false`);
}

/** Requires an integer field of a JSON body. */
export function requireInteger(
  body: Readonly<Record<string, unknown>>,
  name: string
): number {
  const value = body[name];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new HttpError(400, 'invalid_body', `${name} must be an integer`);
  }
  return value;
}

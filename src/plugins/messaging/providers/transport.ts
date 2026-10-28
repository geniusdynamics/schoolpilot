// ABOUTME: The HTTP seam every messaging adapter sends through: a request, a response, and a transport
// ABOUTME: over the platform's fetch, so a test injects a recorder and no test reaches the network.

import { MessagingError } from '../types';

/** One outbound HTTP call. */
export interface HttpRequest {
  readonly method: 'GET' | 'POST';
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  /** The body, already serialised. Absent on a GET. */
  readonly body?: string;
}

/** One HTTP response, with its body as text. */
export interface HttpResponse {
  readonly status: number;
  readonly body: string;
}

/** How an HTTP call is made. The seam the tests inject. */
export interface HttpTransport {
  send(request: HttpRequest): Promise<HttpResponse>;
}

/** The part of `fetch` this module needs, so a caller can pass one without the DOM's whole type. */
export type FetchLike = (
  url: string,
  init: { readonly method: string; readonly headers: Record<string, string>; readonly body?: string }
) => Promise<{ readonly status: number; text(): Promise<string> }>;

/** A transport over `fetch`. The production path; never used by a test. */
export function createFetchTransport(
  fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike
): HttpTransport {
  return {
    async send(request: HttpRequest): Promise<HttpResponse> {
      const response = await fetchImpl(request.url, {
        method: request.method,
        headers: { ...request.headers },
        ...(request.body === undefined ? {} : { body: request.body }),
      });
      return { status: response.status, body: await response.text() };
    },
  };
}

/** Sends through the transport, turning a thrown call into a `transport` refusal. */
export async function sendThrough(
  transport: HttpTransport,
  request: HttpRequest
): Promise<HttpResponse> {
  try {
    return await transport.send(request);
  } catch (error) {
    throw new MessagingError('transport', `the call to ${request.url} failed`, {
      cause: error,
      detail: { url: request.url, method: request.method },
    });
  }
}

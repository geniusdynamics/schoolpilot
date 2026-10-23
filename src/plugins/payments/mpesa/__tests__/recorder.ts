// ABOUTME: The transport the M-Pesa tests inject: it answers with queued recorded responses and
// ABOUTME: records every request it was handed, so a test asserts against the recorded payloads and
// ABOUTME: nothing ever reaches the network.

import type { HttpRequest, HttpResponse, HttpTransport } from '../daraja';

/** A queued answer. */
export interface QueuedResponse {
  readonly status?: number;
  readonly body: string;
}

/** A transport that answers from a queue and remembers what it was asked. */
export interface RecorderTransport extends HttpTransport {
  /** Every request, in the order it was made. */
  readonly calls: readonly HttpRequest[];
  /** The requests whose URL ends with `suffix`. */
  callsTo(suffix: string): readonly HttpRequest[];
  /** Queues one answer. */
  queue(response: QueuedResponse): void;
}

/**
 * Builds a recording transport.
 *
 * It answers each request from the queue, in order, and records the request. A call with an empty
 * queue throws rather than returning something invented: a test that did not queue an answer has a
 * bug, and a made-up response would hide it.
 */
export function createRecorderTransport(initial: readonly QueuedResponse[] = []): RecorderTransport {
  const queue = [...initial];
  const calls: HttpRequest[] = [];
  return {
    calls,
    callsTo(suffix: string): readonly HttpRequest[] {
      return calls.filter((call) => call.url.endsWith(suffix));
    },
    queue(response: QueuedResponse): void {
      queue.push(response);
    },
    async send(request: HttpRequest): Promise<HttpResponse> {
      calls.push(request);
      const next = queue.shift();
      if (!next) {
        throw new Error(
          `the recorder has no answer queued for ${request.method} ${request.url}; a test must queue every call it makes`
        );
      }
      return { status: next.status ?? 200, body: next.body };
    },
  };
}

/** The parsed JSON body of a recorded request. */
export function requestBody(request: HttpRequest | undefined): Record<string, unknown> {
  if (!request?.body) throw new Error('the request carries no body');
  return JSON.parse(request.body) as Record<string, unknown>;
}

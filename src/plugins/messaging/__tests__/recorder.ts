// ABOUTME: The transports the messaging tests inject: a queue of recorded HTTP answers that records
// ABOUTME: every request, and an SMTP submission recorder, so no test reaches the network.

import type { SmtpSubmission, SmtpTransport } from '../providers/smtp';
import type { HttpRequest, HttpResponse, HttpTransport } from '../providers/transport';

/** A queued HTTP answer. */
export interface QueuedResponse {
  readonly status?: number;
  readonly body: string;
}

/** A transport that answers from a queue and remembers what it was asked. */
export interface RecorderTransport extends HttpTransport {
  /** Every request, in the order it was made. */
  readonly calls: readonly HttpRequest[];
  /** The requests whose URL contains `fragment`. */
  callsTo(fragment: string): readonly HttpRequest[];
  /** Queues one answer. */
  queue(response: QueuedResponse): void;
}

/**
 * Builds a recording HTTP transport.
 *
 * A call with an empty queue throws rather than returning something invented: a test that did not
 * queue an answer has a bug, and a made-up response would hide it.
 */
export function createRecorderTransport(initial: readonly QueuedResponse[] = []): RecorderTransport {
  const queue = [...initial];
  const calls: HttpRequest[] = [];
  return {
    calls,
    callsTo(fragment: string): readonly HttpRequest[] {
      return calls.filter((call) => call.url.includes(fragment));
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

/** The parsed form body of a recorded request. */
export function requestForm(request: HttpRequest | undefined): URLSearchParams {
  if (!request?.body) throw new Error('the request carries no body');
  return new URLSearchParams(request.body);
}

/** What an SMTP transport answers. */
export interface SmtpAnswer {
  readonly accepted?: boolean;
  readonly response?: string;
  readonly messageId?: string;
}

/** An SMTP transport that records submissions and answers from a queue. */
export interface SmtpRecorder extends SmtpTransport {
  readonly submissions: readonly SmtpSubmission[];
}

/** Builds a recording SMTP transport. An empty queue throws, as the HTTP recorder does. */
export function createSmtpRecorder(initial: readonly SmtpAnswer[] = []): SmtpRecorder {
  const queue = [...initial];
  const submissions: SmtpSubmission[] = [];
  return {
    submissions,
    async deliver(submission: SmtpSubmission) {
      submissions.push(submission);
      const next = queue.shift();
      if (!next) {
        throw new Error('the SMTP recorder has no answer queued; a test must queue every delivery');
      }
      return {
        accepted: next.accepted ?? true,
        response: next.response ?? '250 2.0.0 Ok: queued',
        messageId: next.messageId,
      };
    },
  };
}

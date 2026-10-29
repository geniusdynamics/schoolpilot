// ABOUTME: The SMTP email adapter: the RFC 5322 message and SMTP envelope it builds, a submission port
// ABOUTME: that performs the SMTP conversation, and the honest answer that SMTP has no delivery webhook.

import {
  MessagingError,
  type DeliveryReport,
  type MessagingProvider,
  type OutboundMessage,
  type SendResult,
  type WebhookVerification,
} from '../types';

import { requireSetting } from './shared';

/** The id this adapter is known by in the outbox. */
export const SMTP_PROVIDER_ID = 'smtp';

/** The envelope an SMTP server is told to deliver: RFC 5321 §4.1.1. */
export interface SmtpEnvelope {
  readonly from: string;
  readonly to: readonly string[];
}

/** What a transport is asked to submit. */
export interface SmtpSubmission {
  readonly envelope: SmtpEnvelope;
  /** The RFC 5322 message, with CRLF line endings and a terminating CRLF. */
  readonly message: string;
  readonly idempotencyKey: string;
}

/** What the SMTP conversation answered. */
export interface SmtpResponse {
  /** True when the server accepted responsibility for the message (a 2xx reply). */
  readonly accepted: boolean;
  /** The server's reply line, kept for the dead-letter view. */
  readonly response: string;
  /** A message id the server assigned, when it assigned one. */
  readonly messageId?: string;
}

/**
 * The SMTP conversation, as a port.
 *
 * A socket client is not shipped here: this repo has no SMTP dependency, and the brief forbids
 * adding one. The host supplies a transport that speaks SMTP - `nodemailer`, a local relay, a
 * provider's submission endpoint - and this adapter builds exactly what it must send.
 */
export interface SmtpTransport {
  deliver(submission: SmtpSubmission): Promise<SmtpResponse>;
}

/** What the adapter is configured with. A relay password, if any, belongs to the transport. */
export interface SmtpConfig {
  /** The envelope sender and the From address, `smtpFromAddress` in the manifest. */
  readonly fromAddress: string;
  /** The display name on the From header, `smtpFromName` in the manifest. */
  readonly fromName?: string;
  /** The domain the generated Message-ID is anchored to; defaults to the sender's domain. */
  readonly messageIdDomain?: string;
}

/** What the adapter is built with. */
export interface SmtpOptions {
  readonly config: SmtpConfig;
  readonly transport: SmtpTransport;
  readonly now?: () => Date;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** An RFC 5322 date-time in UTC, `Mon, 05 Jan 2026 08:00:00 +0000`. */
export function rfc5322Date(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return (
    `${DAYS[date.getUTCDay()]}, ${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} +0000`
  );
}

/** A header value with any line break flattened, so a value cannot inject a header. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ');
}

/** A display name quoted for the From header. */
function quotedName(name: string): string {
  return `"${singleLine(name).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** The Message-ID this adapter generates when the relay assigns none. (draft: the id is this repo's
 * construction - SMTP itself assigns no message id - in the syntax RFC 5322 §3.6.4 requires.) */
function generateMessageId(idempotencyKey: string, domain: string): string {
  const local = idempotencyKey.replace(/[^A-Za-z0-9._-]/g, '-');
  return `<sp.${local}@${domain}>`;
}

/**
 * Builds the SMTP adapter.
 *
 * SMTP has no delivery webhook: a bounce is a DSN message delivered to a mailbox, which this
 * adapter does not read. Delivery status therefore comes from the submission itself (accepted by
 * the server, or refused), and `verifyWebhook` refuses rather than pretending otherwise.
 */
export function createSmtpProvider(options: SmtpOptions): MessagingProvider {
  const fromAddress = requireSetting(options.config.fromAddress, 'smtpFromAddress');
  const fromName = options.config.fromName;
  const domain =
    options.config.messageIdDomain ?? fromAddress.split('@')[1] ?? 'localhost';
  const clock = options.now ?? (() => new Date());
  const transport = options.transport;

  /** The last submission this adapter made, which is all it can know. */
  const reports = new Map<string, DeliveryReport>();

  return {
    id: SMTP_PROVIDER_ID,
    channel: 'email',

    async send(message: OutboundMessage): Promise<SendResult> {
      if (/[\r\n]/.test(message.to)) {
        throw new MessagingError(
          'payload_invalid',
          'an email recipient address cannot contain a line break'
        );
      }

      const messageId = generateMessageId(message.idempotencyKey, domain);
      const body = message.body.replace(/\r?\n/g, '\r\n');
      const headers = [
        `From: ${fromName ? `${quotedName(fromName)} ` : ''}<${fromAddress}>`,
        `To: ${message.to}`,
        `Subject: ${singleLine(message.subject ?? '')}`,
        `Date: ${rfc5322Date(clock())}`,
        `Message-ID: ${messageId}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: 8bit',
      ];
      const raw = `${headers.join('\r\n')}\r\n\r\n${body}${body.endsWith('\r\n') ? '' : '\r\n'}`;

      let response: SmtpResponse;
      try {
        response = await transport.deliver({
          envelope: { from: fromAddress, to: [message.to] },
          message: raw,
          idempotencyKey: message.idempotencyKey,
        });
      } catch (error) {
        throw new MessagingError('transport', `the SMTP submission for "${message.to}" failed`, {
          cause: error,
          detail: { to: message.to },
        });
      }

      if (!response.accepted) {
        throw new MessagingError(
          'rejected',
          `the SMTP server refused the message: ${response.response}`,
          { detail: { response: response.response } }
        );
      }

      const acceptedId = response.messageId ?? messageId;
      reports.set(acceptedId, {
        providerMessageId: acceptedId,
        status: 'sent',
        reason: null,
        occurredAt: clock().toISOString(),
        raw: { response: response.response },
      });

      return {
        providerMessageId: acceptedId,
        status: 'sent',
        raw: { response: response.response },
      };
    },

    async status(providerMessageId: string): Promise<DeliveryReport> {
      const known = reports.get(providerMessageId);
      if (known) return known;
      throw new MessagingError(
        'status_unavailable',
        `SMTP reports delivery only in the submission reply (and bounces as DSN mail), and has not reported "${providerMessageId}"`
      );
    },

    verifyWebhook(): WebhookVerification {
      return {
        valid: false,
        reason:
          'SMTP has no delivery webhook: the submission reply is the delivery evidence, and a bounce arrives as a DSN message this adapter does not read',
      };
    },

    parseWebhook(): readonly DeliveryReport[] {
      return [];
    },
  };
}

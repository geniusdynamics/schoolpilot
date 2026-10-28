// ABOUTME: The Africa's Talking SMS adapter: the documented bulk-send request and response, the
// ABOUTME: form-encoded delivery report, and the allowlist that stands in for a signature the provider
// ABOUTME: does not document.

import {
  MessagingError,
  type DeliveryReport,
  type DeliveryStatus,
  type MessagingProvider,
  type OutboundMessage,
  type SendResult,
  type WebhookVerification,
} from '../types';

import {
  array,
  object,
  parameterRecord,
  parseJsonObject,
  requireSetting,
  sourceAddress,
  text,
} from './shared';
import { createFetchTransport, sendThrough, type HttpTransport } from './transport';

/** The id this adapter is known by in the outbox. */
export const AFRICASTALKING_PROVIDER_ID = 'africas-talking';

/** The live API; the bulk endpoint has no sandbox yet, per the documentation. */
export const AFRICASTALKING_BASE_URL = 'https://api.africastalking.com';

/** What the adapter is configured with. The api key is a credential, not a setting. */
export interface AfricasTalkingConfig {
  /** The application username, `atUsername` in the manifest. */
  readonly username: string;
  /** The API key, read from the deployment configuration rather than a setting. */
  readonly apiKey: string;
  /** The registered short code or alphanumeric sender, when the message carries none. */
  readonly senderId?: string;
  readonly baseUrl?: string;
  /**
   * The source addresses a delivery report may come from.
   *
   * Africa's Talking documents **no signature** on a delivery report, so there is nothing in the
   * headers or the body that proves authenticity. This allowlist is this repo's protection, not a
   * provider feature (draft: the arrangement is ours); with no allowlist configured the adapter
   * refuses every report rather than trusting it.
   */
  readonly deliveryReportIpAllowlist?: readonly string[];
}

/** What the adapter is built with. */
export interface AfricasTalkingOptions {
  readonly config: AfricasTalkingConfig;
  /** How HTTP calls are made. Tests inject a recorder. */
  readonly transport?: HttpTransport;
}

/**
 * The documented `statusCode` values, mapped to what the outbox tracks.
 *
 * 100 Processed and 102 Queued mean the provider has not sent it yet; 101 Sent means it has. The
 * 4xx and 5xx codes are refusals, and `send` raises them rather than returning a failed send: the
 * outbox must not claim a message was accepted when it was not.
 */
const STATUS_CODES: Readonly<Record<number, DeliveryStatus>> = {
  100: 'queued',
  101: 'sent',
  102: 'queued',
};

/**
 * The documented delivery-report `status` values, mapped to what the outbox tracks.
 *
 * `Sent` and `Submitted` mean the network has it; `Buffered` is still queued. `Rejected`, `Failed`,
 * `AbsentSubscriber` and `Expired` are final failures.
 */
const REPORT_STATUSES: Readonly<Record<string, DeliveryStatus>> = {
  Success: 'delivered',
  Sent: 'sent',
  Submitted: 'sent',
  Buffered: 'queued',
  Rejected: 'failed',
  Failed: 'failed',
  AbsentSubscriber: 'failed',
  Expired: 'failed',
};

/**
 * Builds the Africa's Talking adapter.
 *
 * Delivery is reported by callback only: the documentation publishes no status query, so `status`
 * answers from the last report this adapter was handed and refuses otherwise.
 */
export function createAfricasTalkingProvider(
  options: AfricasTalkingOptions
): MessagingProvider {
  const username = requireSetting(options.config.username, 'atUsername');
  const apiKey = requireSetting(options.config.apiKey, 'AFRICASTALKING_API_KEY');
  const baseUrl = (options.config.baseUrl ?? AFRICASTALKING_BASE_URL).replace(/\/+$/, '');
  const senderId = options.config.senderId;
  const allowlist = options.config.deliveryReportIpAllowlist ?? [];
  const transport = options.transport ?? createFetchTransport();

  /** The last report the provider sent, which is all this adapter can know. */
  const reports = new Map<string, DeliveryReport>();

  return {
    id: AFRICASTALKING_PROVIDER_ID,
    channel: 'sms',

    async send(message: OutboundMessage): Promise<SendResult> {
      const from = message.senderId ?? senderId;
      if (!from) {
        throw new MessagingError(
          'config_missing',
          'the messaging provider needs the "senderId" setting (or a sender on the message), and it is not configured'
        );
      }

      const response = await sendThrough(transport, {
        method: 'POST',
        url: `${baseUrl}/version1/messaging/bulk`,
        headers: {
          apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          message: message.body,
          senderId: from,
          phoneNumbers: [message.to],
          enqueue: 1,
        }),
      });

      if (response.status >= 400) {
        throw new MessagingError(
          'rejected',
          `Africa's Talking answered the send with HTTP ${response.status}: ${response.body.slice(0, 500)}`,
          { detail: { status: response.status } }
        );
      }

      const payload = parseJsonObject(response, 'the bulk SMS send');
      const data = object(payload.SMSMessageData);
      const [recipient] = array(data?.Recipients).map(object);
      if (!recipient) {
        throw new MessagingError(
          'rejected',
          'Africa\'s Talking accepted the request but named no recipient in its response',
          { detail: { response: payload } }
        );
      }

      const messageId = text(recipient.messageId);
      const statusCode = Number(recipient.statusCode);
      const status = STATUS_CODES[statusCode];
      if (!messageId || messageId === 'None' || !status) {
        throw new MessagingError(
          'rejected',
          `Africa's Talking refused the message to ${message.to}: ${statusCode} ${text(recipient.status) ?? 'no described reason'}`,
          { detail: { statusCode, status: text(recipient.status) } }
        );
      }

      return { providerMessageId: messageId, status, raw: payload };
    },

    async status(providerMessageId: string): Promise<DeliveryReport> {
      const known = reports.get(providerMessageId);
      if (known) return known;
      throw new MessagingError(
        'status_unavailable',
        `Africa's Talking reports delivery by callback only and has not reported "${providerMessageId}" yet`
      );
    },

    verifyWebhook(
      headers: Readonly<Record<string, string>>
    ): WebhookVerification {
      if (allowlist.length === 0) {
        return {
          valid: false,
          reason:
            "Africa's Talking documents no signature on a delivery report, and no source allowlist is configured: the delivery cannot be proved authentic, so it is refused. Configure atDeliveryReportIpAllowlist with the provider's source addresses.",
        };
      }
      const source = sourceAddress(headers);
      if (source === null || !allowlist.includes(source)) {
        return {
          valid: false,
          reason: `the delivery came from ${source ?? 'an unknown address'}, which is not in the configured allowlist`,
        };
      }
      return {
        valid: true,
        reason:
          "the delivery came from an address in the configured allowlist; Africa's Talking does not sign the body",
      };
    },

    parseWebhook(
      _headers: Readonly<Record<string, string>>,
      rawBody: string
    ): readonly DeliveryReport[] {
      const params = new URLSearchParams(rawBody);
      const messageId = text(params.get('id'));
      const status = REPORT_STATUSES[text(params.get('status')) ?? ''];
      if (!messageId || !status) return [];

      const report: DeliveryReport = {
        providerMessageId: messageId,
        status,
        reason: text(params.get('failureReason')),
        occurredAt: null,
        raw: parameterRecord(params),
      };
      reports.set(messageId, report);
      return [report];
    },
  };
}

// ABOUTME: The Twilio SMS adapter: the documented Messages API create request, the Message resource
// ABOUTME: status query, the form-encoded status callback, and the HMAC-SHA-1 signature check Twilio
// ABOUTME: documents for a webhook.

import { base64Encode, hmacSha1Base64, timingSafeEqual } from '../signature';
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
  header,
  object,
  parameterRecord,
  requireSetting,
  text,
} from './shared';
import { createFetchTransport, sendThrough, type HttpTransport } from './transport';

/** The id this adapter is known by in the outbox. */
export const TWILIO_PROVIDER_ID = 'twilio';

/** The REST API host. */
export const TWILIO_BASE_URL = 'https://api.twilio.com';

/** What the adapter is configured with. The auth token is a credential, not a setting. */
export interface TwilioConfig {
  /** The account SID, `twilioAccountSid` in the manifest. */
  readonly accountSid: string;
  /** The account auth token, read from the deployment configuration rather than a setting. */
  readonly authToken: string;
  /** The number or channel address the school sends from, `twilioFrom` in the manifest. */
  readonly from?: string;
  /** A Messaging Service to send through instead of a single number. */
  readonly messagingServiceSid?: string;
  /** The public URL Twilio posts status callbacks to; the signature covers it. */
  readonly statusCallbackUrl?: string;
  readonly baseUrl?: string;
}

/** What the adapter is built with. */
export interface TwilioOptions {
  readonly config: TwilioConfig;
  readonly transport?: HttpTransport;
}

/**
 * The documented Message `status` values, mapped to what the outbox tracks.
 *
 * `read` maps to delivered: a read receipt cannot arrive before delivery, and the outbox has no
 * separate read state. The values Twilio lists that this adapter does not recognise are ignored
 * rather than guessed at.
 */
const STATUSES: Readonly<Record<string, DeliveryStatus>> = {
  accepted: 'queued',
  scheduled: 'queued',
  queued: 'queued',
  sending: 'sent',
  sent: 'sent',
  delivered: 'delivered',
  read: 'delivered',
  failed: 'failed',
  undelivered: 'failed',
  canceled: 'failed',
};

/** The adapter's own id for a message, from the Message resource. */
export function twilioStatus(status: string | null): DeliveryStatus | null {
  if (status === null) return null;
  return STATUSES[status.toLowerCase()] ?? null;
}

/** The provider's words for a failure: its error code and message, when it gives them. */
function failureReason(payload: Record<string, unknown>): string | null {
  // A status callback names them ErrorCode/ErrorMessage; the Message resource names them
  // error_code/error_message.
  const code = text(payload.ErrorCode) ?? text(payload.error_code);
  const message = text(payload.ErrorMessage) ?? text(payload.error_message);
  if (code && message) return `${code} ${message}`;
  if (message) return message;
  if (code) return `error ${code}`;
  return null;
}

/**
 * Builds the Twilio adapter.
 *
 * Twilio documents a status query, so `status` asks the provider rather than trusting the last
 * callback it saw.
 */
export function createTwilioProvider(options: TwilioOptions): MessagingProvider {
  const accountSid = requireSetting(options.config.accountSid, 'twilioAccountSid');
  const authToken = requireSetting(options.config.authToken, 'TWILIO_AUTH_TOKEN');
  const baseUrl = (options.config.baseUrl ?? TWILIO_BASE_URL).replace(/\/+$/, '');
  const { from, messagingServiceSid, statusCallbackUrl } = options.config;
  if (!from && !messagingServiceSid) {
    throw new MessagingError(
      'config_missing',
      'the Twilio provider needs either the "twilioFrom" or the "twilioMessagingServiceSid" setting, and neither is configured'
    );
  }
  const transport = options.transport ?? createFetchTransport();

  const authorization = `Basic ${base64Encode(`${accountSid}:${authToken}`)}`;
  const messagesUrl = `${baseUrl}/2010-04-01/Accounts/${accountSid}/Messages.json`;

  return {
    id: TWILIO_PROVIDER_ID,
    channel: 'sms',

    async send(message: OutboundMessage): Promise<SendResult> {
      const form = new URLSearchParams();
      form.set('To', message.to);
      form.set('Body', message.body);
      const sender = message.senderId ?? from;
      if (sender) form.set('From', sender);
      else form.set('MessagingServiceSid', messagingServiceSid!);
      if (statusCallbackUrl) form.set('StatusCallback', statusCallbackUrl);

      const response = await sendThrough(transport, {
        method: 'POST',
        url: messagesUrl,
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: form.toString(),
      });

      const payload = safeJson(response.body);
      if (response.status >= 400) {
        throw new MessagingError(
          'rejected',
          `Twilio refused the message: HTTP ${response.status}${describe(payload)}`,
          { detail: { status: response.status } }
        );
      }
      if (!payload) {
        throw new MessagingError('transport', 'Twilio answered the send with a body that is not JSON');
      }

      const providerMessageId = text(payload.sid);
      const status = twilioStatus(text(payload.status));
      if (!providerMessageId || !status) {
        throw new MessagingError(
          'rejected',
          `Twilio accepted the request but named no message id and status it recognises: ${response.body.slice(0, 300)}`,
          { detail: { status: text(payload.status) } }
        );
      }

      return { providerMessageId, status, raw: payload };
    },

    async status(providerMessageId: string): Promise<DeliveryReport> {
      const response = await sendThrough(transport, {
        method: 'GET',
        url: `${baseUrl}/2010-04-01/Accounts/${accountSid}/Messages/${providerMessageId}.json`,
        headers: { Authorization: authorization, Accept: 'application/json' },
      });
      const payload = safeJson(response.body);
      if (response.status >= 400 || !payload) {
        throw new MessagingError(
          'status_unavailable',
          `Twilio answered the status query for "${providerMessageId}" with HTTP ${response.status}`,
          { detail: { status: response.status } }
        );
      }

      const status = twilioStatus(text(payload.status));
      if (!status) {
        throw new MessagingError(
          'status_unavailable',
          `Twilio answered the status query for "${providerMessageId}" with a status this adapter does not recognise: ${text(payload.status) ?? 'none'}`
        );
      }

      return {
        providerMessageId: text(payload.sid) ?? providerMessageId,
        status,
        reason: status === 'failed' ? failureReason(payload) : null,
        occurredAt: null,
        raw: payload,
      };
    },

    /**
     * Checks the `X-Twilio-Signature` header.
     *
     * Twilio documents the signature as HMAC-SHA-1, with the account auth token as the key, over
     * the webhook URL followed by every POST parameter sorted by name. The URL is the one
     * registered with Twilio, so it comes from configuration: without it the signature cannot be
     * reproduced, and the delivery is refused rather than accepted unproven.
     */
    verifyWebhook(
      headers: Readonly<Record<string, string>>,
      rawBody: string
    ): WebhookVerification {
      if (!statusCallbackUrl) {
        return {
          valid: false,
          reason:
            'the "twilioStatusCallbackUrl" setting is not configured, and the X-Twilio-Signature covers that URL, so the delivery cannot be verified',
        };
      }

      const provided = header(headers, 'x-twilio-signature');
      if (!provided) {
        return {
          valid: false,
          reason: 'the delivery carries no X-Twilio-Signature header',
        };
      }

      const params = [...new URLSearchParams(rawBody).entries()].sort(([left], [right]) =>
        left < right ? -1 : left > right ? 1 : 0
      );
      const signed = statusCallbackUrl + params.map(([name, value]) => `${name}${value}`).join('');
      const expected = hmacSha1Base64(authToken, signed);

      if (!timingSafeEqual(provided, expected)) {
        return {
          valid: false,
          reason:
            'the X-Twilio-Signature header does not match the callback URL and parameters; refusing the delivery',
        };
      }
      return {
        valid: true,
        reason: 'the X-Twilio-Signature header matches the callback URL and parameters',
      };
    },

    parseWebhook(
      _headers: Readonly<Record<string, string>>,
      rawBody: string
    ): readonly DeliveryReport[] {
      const params = new URLSearchParams(rawBody);
      const providerMessageId =
        text(params.get('MessageSid')) ??
        text(params.get('SmsSid')) ??
        text(params.get('SmsMessageSid'));
      const status = twilioStatus(text(params.get('MessageStatus')) ?? text(params.get('SmsStatus')));
      if (!providerMessageId || !status) return [];

      const payload = parameterRecord(params);
      return [
        {
          providerMessageId,
          status,
          reason: status === 'failed' ? failureReason(payload) : null,
          occurredAt: null,
          raw: payload,
        },
      ];
    },
  };
}

/** The parsed body, or null when it is not a JSON object. */
function safeJson(body: string): Record<string, unknown> | null {
  try {
    return object(JSON.parse(body));
  } catch {
    return null;
  }
}

/** The provider's own words from an error body, or nothing when it gave none. */
function describe(payload: Record<string, unknown> | null): string {
  if (!payload) return '';
  const message = text(payload.message) ?? text(payload.error_message) ?? text(payload.more_info);
  const code = text(payload.code) ?? text(payload.error_code);
  if (message && code) return `: ${code} ${message}`;
  if (message) return `: ${message}`;
  return '';
}

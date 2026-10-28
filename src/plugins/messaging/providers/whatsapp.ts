// ABOUTME: The WhatsApp Business (Meta Cloud API) adapter: the documented template and text message
// ABOUTME: request, the accepted-message response, the status webhook, and the X-Hub-Signature-256
// ABOUTME: check Meta documents for a webhook.

import { hmacSha256Hex, timingSafeEqual } from '../signature';
import {
  MessagingError,
  type DeliveryReport,
  type DeliveryStatus,
  type MessagingProvider,
  type OutboundMessage,
  type SendResult,
  type WebhookVerification,
} from '../types';

import { array, header, object, requireSetting, text } from './shared';
import { createFetchTransport, sendThrough, type HttpTransport } from './transport';

/** The id this adapter is known by in the outbox. */
export const WHATSAPP_PROVIDER_ID = 'whatsapp';

/** The Graph API host. */
export const WHATSAPP_BASE_URL = 'https://graph.facebook.com';

/** What the adapter is configured with. The tokens are credentials, not settings. */
export interface WhatsAppConfig {
  /** The business phone number id, `whatsappPhoneNumberId` in the manifest. */
  readonly phoneNumberId: string;
  /** The access token, read from the deployment configuration rather than a setting. */
  readonly accessToken: string;
  /** The app secret that signs webhooks, read from the deployment configuration. */
  readonly appSecret?: string;
  /** The Graph API version, `whatsappApiVersion` in the manifest. */
  readonly apiVersion?: string;
  /** The language a template is sent in when the message names none. */
  readonly defaultLanguage?: string;
}

/** What the adapter is built with. */
export interface WhatsAppOptions {
  readonly config: WhatsAppConfig;
  readonly transport?: HttpTransport;
}

/** The documented status values of an outgoing-message webhook, mapped to the outbox's statuses. */
const STATUSES: Readonly<Record<string, DeliveryStatus>> = {
  sent: 'sent',
  delivered: 'delivered',
  // A read receipt presupposes delivery; the outbox has no separate read state.
  read: 'delivered',
  failed: 'failed',
};

/** A Graph API error's message, for a refusal that says what Meta said. */
function graphError(payload: Record<string, unknown> | null): string {
  const error = object(payload?.error);
  const message = text(error?.message) ?? text(payload?.message);
  const code = text(error?.code);
  if (code && message) return `${code} ${message}`;
  return message ?? 'no described reason';
}

/**
 * Builds the WhatsApp adapter.
 *
 * Meta reports delivery by webhook, so `status` answers from the last status this adapter was
 * handed and refuses otherwise. The send response only proves the message was accepted.
 */
export function createWhatsAppProvider(options: WhatsAppOptions): MessagingProvider {
  const phoneNumberId = requireSetting(options.config.phoneNumberId, 'whatsappPhoneNumberId');
  const accessToken = requireSetting(options.config.accessToken, 'WHATSAPP_ACCESS_TOKEN');
  const appSecret = options.config.appSecret;
  const apiVersion = options.config.apiVersion ?? 'v23.0';
  const defaultLanguage = options.config.defaultLanguage ?? 'en';
  const transport = options.transport ?? createFetchTransport();

  const messagesUrl = `${WHATSAPP_BASE_URL}/${apiVersion}/${phoneNumberId}/messages`;
  /** The last status the provider sent, which is all this adapter can know. */
  const reports = new Map<string, DeliveryReport>();

  return {
    id: WHATSAPP_PROVIDER_ID,
    channel: 'whatsapp',

    async send(message: OutboundMessage): Promise<SendResult> {
      const body: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to,
      };

      if (message.template) {
        const parameters = message.template.parameters ?? Object.values(message.mergeValues ?? {});
        body.type = 'template';
        body.template = {
          name: message.template.id,
          language: { code: message.template.language ?? defaultLanguage },
          ...(parameters.length > 0
            ? {
                components: [
                  {
                    type: 'body',
                    parameters: parameters.map((value) => ({ type: 'text', text: value })),
                  },
                ],
              }
            : {}),
        };
      } else {
        body.type = 'text';
        body.text = { preview_url: false, body: message.body };
      }

      const response = await sendThrough(transport, {
        method: 'POST',
        url: messagesUrl,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = safeJson(response.body);
      if (response.status >= 400) {
        throw new MessagingError(
          'rejected',
          `WhatsApp refused the message: HTTP ${response.status}, ${graphError(payload)}`,
          { detail: { status: response.status } }
        );
      }
      const [sent] = array(payload?.messages).map(object);
      const providerMessageId = text(sent?.id);
      if (!providerMessageId) {
        throw new MessagingError(
          'rejected',
          'WhatsApp accepted the request but named no message id in its response',
          { detail: { response: payload } }
        );
      }

      // The documented response proves acceptance only; delivery arrives by webhook.
      return { providerMessageId, status: 'queued', raw: payload };
    },

    async status(providerMessageId: string): Promise<DeliveryReport> {
      const known = reports.get(providerMessageId);
      if (known) return known;
      throw new MessagingError(
        'status_unavailable',
        `Meta reports delivery by webhook only and has not reported "${providerMessageId}" yet`
      );
    },

    /**
     * Checks the `X-Hub-Signature-256` header.
     *
     * Meta documents the signature as SHA-256 over the raw payload with the app secret, prefixed
     * with `sha256=`. The raw body is used, not a re-serialised payload: any whitespace change would
     * change the signature.
     */
    verifyWebhook(
      headers: Readonly<Record<string, string>>,
      rawBody: string
    ): WebhookVerification {
      if (!appSecret) {
        return {
          valid: false,
          reason:
            'the "appSecret" credential is not configured, so X-Hub-Signature-256 cannot be checked; refusing the delivery',
        };
      }

      const provided = header(headers, 'x-hub-signature-256');
      if (!provided) {
        return {
          valid: false,
          reason: 'the delivery carries no X-Hub-Signature-256 header',
        };
      }

      const expected = `sha256=${hmacSha256Hex(appSecret, rawBody)}`;
      if (!timingSafeEqual(provided.toLowerCase(), expected)) {
        return {
          valid: false,
          reason:
            'the X-Hub-Signature-256 header does not match the payload and app secret; refusing the delivery',
        };
      }
      return {
        valid: true,
        reason: 'the X-Hub-Signature-256 header matches the app secret',
      };
    },

    parseWebhook(
      _headers: Readonly<Record<string, string>>,
      rawBody: string
    ): readonly DeliveryReport[] {
      const payload = safeJson(rawBody);
      if (!payload) return [];

      const collected: DeliveryReport[] = [];
      for (const entry of array(payload.entry).map(object)) {
        for (const change of array(entry?.changes).map(object)) {
          const value = object(change?.value);
          for (const status of array(value?.statuses).map(object)) {
            const report = readStatus(status);
            if (!report) continue;
            reports.set(report.providerMessageId, report);
            collected.push(report);
          }
        }
      }
      return collected;
    },
  };
}

/** One entry of the statuses array, or null when it is not a status this adapter can map. */
function readStatus(status: Record<string, unknown> | null): DeliveryReport | null {
  if (!status) return null;
  const providerMessageId = text(status.id);
  const mapped = STATUSES[(text(status.status) ?? '').toLowerCase()];
  if (!providerMessageId || !mapped) return null;

  // Meta's timestamp is seconds since the epoch, as a string. A missing one stays null.
  const timestamp = text(status.timestamp);
  const seconds = timestamp === null ? Number.NaN : Number(timestamp);
  const occurredAt = Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : null;

  return {
    providerMessageId,
    status: mapped,
    reason: mapped === 'failed' ? failureReason(status) : null,
    occurredAt,
    raw: status,
  };
}

/** Meta's own account of a failed delivery: the error code, its title and its detail. */
function failureReason(status: Record<string, unknown>): string {
  const [error] = array(status.errors).map(object);
  if (!error) return 'Meta reported the message failed, without an error';
  const head = [text(error.code), text(error.title) ?? text(error.message)]
    .filter((part) => part !== null)
    .join(' ');
  const detail = text(object(error.error_data)?.details);
  if (detail) return `${head}: ${detail}`;
  return head || 'Meta reported the message failed, without an error';
}

/** The parsed body, or null when it is not a JSON object. */
function safeJson(body: string): Record<string, unknown> | null {
  try {
    return object(JSON.parse(body));
  } catch {
    return null;
  }
}

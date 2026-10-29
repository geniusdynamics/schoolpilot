// ABOUTME: The messaging seam: the provider port every channel adapter implements, the message it
// ABOUTME: sends, the delivery report a webhook produces, and the error every refusal is raised as.

/** The channel a message travels on. */
export type MessagingChannel = 'sms' | 'whatsapp' | 'email';

/** Where a message is, as the provider reports it. */
export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed';

/** The approved template a message is sent with, when it is sent with one. */
export interface MessageTemplateRef {
  /** The provider's template name or id. */
  readonly id: string;
  /** The template's language code, where the provider needs one. */
  readonly language?: string;
  /**
   * The values for the template's placeholders, in the order the template declares them.
   *
   * WhatsApp requires that order; a caller that renders a local template with `templates.ts` gets it
   * from `renderTemplate`.
   */
  readonly parameters?: readonly string[];
}

/** One message to send, before the outbox stores it. */
export interface OutboundMessage {
  readonly channel: MessagingChannel;
  /** The recipient: a phone number in E.164 form, or an email address. */
  readonly to: string;
  /** The sender id, short code or from-address the school sends from, when the provider needs one. */
  readonly senderId?: string;
  /** The subject, for email. */
  readonly subject?: string;
  /** The rendered body, and the body a text message sends. */
  readonly body: string;
  /** The approved template, for a provider that sends templates (WhatsApp). */
  readonly template?: MessageTemplateRef;
  /** The values a local template was rendered with, used where a provider wants ordered parameters. */
  readonly mergeValues?: Readonly<Record<string, string>>;
  /** The key that makes enqueueing this message twice one message. */
  readonly idempotencyKey: string;
  /** Anything the caller wants carried with the message, such as an invoice id. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** What a provider answers when it accepts a message. */
export interface SendResult {
  /** The provider's own id for the message, which a later report names. */
  readonly providerMessageId: string;
  /** The status the acceptance itself proves - never `delivered`. */
  readonly status: DeliveryStatus;
  /** The provider's response, kept for the dead-letter view and for support. */
  readonly raw?: unknown;
}

/** One status a provider reports for a message it accepted. */
export interface DeliveryReport {
  readonly providerMessageId: string;
  readonly status: DeliveryStatus;
  /** Why it failed, in the provider's words, or null. */
  readonly reason: string | null;
  /** When the provider says it happened, as an ISO timestamp, or null when it does not say. */
  readonly occurredAt: string | null;
  readonly raw?: unknown;
}

/** Whether a delivery is genuinely from the provider. */
export interface WebhookVerification {
  readonly valid: boolean;
  readonly reason: string;
}

/**
 * A messaging provider.
 *
 * `status` asks the provider itself, which only Twilio documents a query for. Africa's Talking,
 * WhatsApp and SMTP report delivery by callback (or, for SMTP, by the submission itself), so their
 * `status` answers from the last report they were handed and throws `status_unavailable` otherwise.
 * Answering `queued` there would be a guess dressed as a fact.
 *
 * `verifyWebhook` proves authenticity; `parseWebhook` reads the reports out of a body it does not
 * itself verify, so a caller must verify first. The two are separate because a delivery is verified
 * once and may carry several reports.
 */
export interface MessagingProvider {
  /** The id this provider is known by in the outbox. */
  readonly id: string;
  readonly channel: MessagingChannel;
  send(message: OutboundMessage): Promise<SendResult>;
  status(providerMessageId: string): Promise<DeliveryReport>;
  verifyWebhook(
    headers: Readonly<Record<string, string>>,
    rawBody: string
  ): WebhookVerification;
  parseWebhook(
    headers: Readonly<Record<string, string>>,
    rawBody: string
  ): readonly DeliveryReport[];
}

/** Why a messaging operation was refused. */
export type MessagingErrorCode =
  /** A setting, a credential or an injected transport the provider needs is absent. */
  | 'config_missing'
  /** The call could not be made, or its answer could not be read. */
  | 'transport'
  /** The provider refused the message, and says why. */
  | 'rejected'
  /** The message is not one this adapter can send. */
  | 'payload_invalid'
  /** The provider does not answer status queries, and has not reported this message yet. */
  | 'status_unavailable'
  /** A webhook could not be proved genuine. */
  | 'webhook_invalid';

/** Every refusal a messaging adapter raises. */
export class MessagingError extends Error {
  readonly code: MessagingErrorCode;
  readonly detail: Readonly<Record<string, unknown>>;

  constructor(
    code: MessagingErrorCode,
    message: string,
    options: { readonly cause?: unknown; readonly detail?: Readonly<Record<string, unknown>> } = {}
  ) {
    super(message);
    this.name = 'MessagingError';
    this.code = code;
    this.detail = options.detail ?? {};
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

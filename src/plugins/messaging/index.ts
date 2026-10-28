// ABOUTME: The messaging plug-in: one manifest whose provider setting selects the SMS, WhatsApp or SMTP
// ABOUTME: adapter, and the lifecycle module that records which provider the school chose.

import type { PluginContext, PluginManifest, PluginModule } from '@/plugins/types';

import { readMessagingSettings } from './settings';

export * from './types';
export * from './outbox';
export * from './templates';
export * from './signature';
export * from './settings';

export * from './providers/transport';
export {
  AFRICASTALKING_PROVIDER_ID,
  createAfricasTalkingProvider,
} from './providers/africas-talking';
export { TWILIO_PROVIDER_ID, createTwilioProvider } from './providers/twilio';
export { WHATSAPP_PROVIDER_ID, createWhatsAppProvider } from './providers/whatsapp';
export {
  SMTP_PROVIDER_ID,
  createSmtpProvider,
  rfc5322Date,
  type SmtpEnvelope,
  type SmtpResponse,
  type SmtpSubmission,
  type SmtpTransport,
} from './providers/smtp';

/**
 * The plug-in manifest.
 *
 * One plug-in, not one per adapter: the outbox, the templates and the dead-letter view are written
 * once, and the `provider` setting is what changes. The settings are the **non-secret** values
 * only; the API key, the auth token, the access token and the app secret are read from the
 * deployment configuration, because a setting lives in the institution's database row and is
 * readable through the app.
 */
export const messagingManifest: PluginManifest = {
  id: 'builtin-messaging',
  name: 'Messaging',
  version: '1.0.0',
  sdkVersion: '^1.0.0',
  type: 'integration',
  category: 'builtin',
  entry: './index.ts',
  description:
    'Sends SMS, WhatsApp and email through Africa\u2019s Talking, Twilio, the WhatsApp Business Cloud API or SMTP, behind an outbox with retries, idempotency keys and a dead-letter view.',
  author: 'SchoolPilot3 Team',
  license: 'MIT',

  provides: [
    'messaging.outbox',
    'messaging.templates',
    'messaging.provider.africas-talking',
    'messaging.provider.twilio',
    'messaging.provider.whatsapp',
    'messaging.provider.smtp',
  ],

  permissions: ['settings:access', 'network:access'],

  settings: [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      defaultValue: 'africas-talking',
      description:
        'Which provider the school sends through. The credentials for the selected provider come from the deployment configuration.',
      options: [
        { label: 'Africa\u2019s Talking (SMS)', value: 'africas-talking' },
        { label: 'Twilio (SMS)', value: 'twilio' },
        { label: 'WhatsApp Business (Cloud API)', value: 'whatsapp' },
        { label: 'SMTP (email)', value: 'smtp' },
      ],
    },
    {
      key: 'senderId',
      label: 'Sender id',
      type: 'string',
      description:
        'The registered short code or alphanumeric sender id for SMS. A message may carry its own sender instead.',
    },
    {
      key: 'atUsername',
      label: 'Africa\u2019s Talking username',
      type: 'string',
      description: 'The Africa\u2019s Talking application username.',
    },
    {
      key: 'atBaseUrl',
      label: 'Africa\u2019s Talking base URL',
      type: 'string',
      defaultValue: 'https://api.africastalking.com',
      description: 'The Africa\u2019s Talking API base URL.',
    },
    {
      key: 'atDeliveryReportIpAllowlist',
      label: 'Delivery-report source allowlist',
      type: 'string',
      description:
        'Comma-separated source addresses a delivery report may come from. Africa\u2019s Talking signs no delivery report; with no allowlist configured, every report is refused.',
    },
    {
      key: 'twilioAccountSid',
      label: 'Twilio account SID',
      type: 'string',
      description: 'The Twilio account SID, which identifies the account the message is sent from.',
    },
    {
      key: 'twilioFrom',
      label: 'Twilio sender',
      type: 'string',
      description: 'The Twilio number or channel address the school sends from.',
    },
    {
      key: 'twilioMessagingServiceSid',
      label: 'Twilio Messaging Service',
      type: 'string',
      description:
        'A Twilio Messaging Service to send through instead of a single number. Set this or the sender, not both.',
    },
    {
      key: 'twilioStatusCallbackUrl',
      label: 'Twilio status callback URL',
      type: 'string',
      description:
        'The public URL Twilio posts status callbacks to. The X-Twilio-Signature covers this URL, so it must match exactly.',
    },
    {
      key: 'whatsappPhoneNumberId',
      label: 'WhatsApp phone number id',
      type: 'string',
      description: 'The WhatsApp Business phone number id the messages are sent from.',
    },
    {
      key: 'whatsappApiVersion',
      label: 'WhatsApp Graph API version',
      type: 'string',
      defaultValue: 'v23.0',
      description: 'The Graph API version the Cloud API calls use.',
    },
    {
      key: 'whatsappDefaultLanguage',
      label: 'WhatsApp default language',
      type: 'string',
      defaultValue: 'en',
      description:
        'The language code a WhatsApp template is sent in when the message names none.',
    },
    {
      key: 'smtpFromAddress',
      label: 'Email sender address',
      type: 'string',
      description: 'The envelope sender and From address for email.',
    },
    {
      key: 'smtpFromName',
      label: 'Email sender name',
      type: 'string',
      description: 'The display name on the From header.',
    },
    {
      key: 'smtpMessageIdDomain',
      label: 'Message-ID domain',
      type: 'string',
      description:
        'The domain the generated Message-ID is anchored to. Defaults to the sender address\u2019s domain.',
    },
  ],

  privileges: {
    dataRead: [],
    dataWrite: [],
    uiInject: false,
    menuModify: false,
    settingsAccess: true,
    networkAccess: true,
    fileSystemAccess: false,
    executeCode: false,
  },
};

/**
 * The plug-in module.
 *
 * Activation records the selected provider in the plug-in's own settings, so the host can show
 * which adapter is live. It builds no provider: that needs the deployment credentials, which the
 * host reads at the point it wires the outbox.
 */
const messagingModule: PluginModule = {
  async activate(context: PluginContext): Promise<void> {
    const settings = readMessagingSettings(context.settings);
    await context.api.setSetting('activeProvider', settings.provider);
  },
};

/** The plug-in, in the shape the builtin loader expects. */
export default {
  manifest: messagingManifest,
  module: messagingModule,
};
